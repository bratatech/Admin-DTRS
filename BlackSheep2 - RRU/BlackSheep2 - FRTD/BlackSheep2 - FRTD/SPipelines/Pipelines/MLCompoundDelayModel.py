"""
MLCompoundDelayModel.py
High-End Multi-Domain Machine Learning & Cascading Simulation Engine for Indian Railways

Models realistic physical delays, network ripple propagation, and timetable slack (EA) absorption
across all operational domains:
  1. Environmental & Weather Shocks (Fog, Rain, Monsoon Flood, Storm, Heatwave)
  2. Infrastructure & Track Speed Restrictions (TSR, Engineering Mega-Blocks, Signal Failure)
  3. Rolling Stock, Traction & Kinetic Stopping Losses (Davis Drag, Power Derating)
  4. Dispatch & Priority Ripple (Rajdhani delayed -> Trailing trains trapped, Loop Overtakes)
  5. Terminal & Platform Bottlenecks (Platform Starvation, Turnaround Linkage Deficit)
  6. Human Factors & Safety Regulations (HOER 10-12 Hour Crew Duty Expiry)

Derives:
  grossDelay = PrimaryDelay + CascadeDelay
  Absorbed_by_EA = min(grossDelay, EA)
  NetDelay = max(0, grossDelay - EA)
  Compound_ETA = ScheduledArrival + NetDelay
  Arrival_Status = ON_TIME if NetDelay <= 15m else LATE
"""

import os
import sys
import time
import itertools
import argparse
import pandas as pd
import numpy as np

# Ensure project paths
PIPELINES_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(PIPELINES_DIR)
if PIPELINES_DIR not in sys.path:
    sys.path.insert(0, PIPELINES_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# -----------------------------------------------------------------------------
# 1. MULTI-DOMAIN FEATURE DEFINITIONS
# -----------------------------------------------------------------------------

DOMAIN_WEATHER = [
    'CLEAR',            # Ideal conditions (0 extra delay)
    'FOG',              # Visibility < 50m (Speed restricted to 60 km/h, Northern corridors)
    'MONSOON_FLOOD',    # Waterlogging on tracks / slow crawling (15-20 km/h)
    'STORM',            # Overhead Electric wire (OHE) oscillations / caution signals
    'HEATWAVE'          # Rail expansion / track buckling caution orders
]

DOMAIN_TRACK = [
    'NORMAL',           # Section cleared for Max Permissible Speed (MPS up to 130 km/h)
    'MINOR_TSR',        # 1-2 localized track renewal cautions (30-45 km/h)
    'MAJOR_BLOCK',      # Heavy engineering mega-block / Single-line operation
    'SIGNAL_FAILURE'    # Automatic/point signaling failure (manual piloting at 15 km/h)
]

DOMAIN_DISPATCH = [
    'FREE_FLOW',                # Line capacity < 65%
    'NORMAL_TRAFFIC',           # Routine daily traffic density (70-85%)
    'PEAK_OVERTAKE_HOLD',       # Held on loop siding to allow premium overtake
    'TRETA_ZONE_OCCUPIED'       # Preceding train on same TRETAroutenumber zone is delayed, directly blocking track
]


DOMAIN_TRACTION = [
    'OPTIMAL',          # Full loco tractive effort and nominal train weight
    'LOCO_DERATING',    # Partial traction motor failure / Reduced acceleration curve
    'HEAVY_STOPPING_DRAG' # High gross trailing load with frequent halts (kinetic overhead)
]

DOMAIN_TERMINAL = [
    'NOMINAL_DWELL',            # Standard dwell times and clear platforms
    'PLATFORM_STARVATION',      # High-density junction platforms occupied (outer signal hold)
    'TURNAROUND_DEFICIT'        # Inbound pairing late, compressing pit-line maintenance layover
]

DOMAIN_CREW = [
    'NORMAL_SHIFT',             # Shift duration within 6-8 hours
    'HOER_DUTY_EXPIRED'         # Duty exceeds 10 hours, legally requiring lobby standby relief
]

# Sensitive Corridors Multipliers (Geography & Fog Sensitivity)
CORRIDOR_SENSITIVITY = {
    "DELHI - HOWRAH":    {"fog": 3.2, "rain": 1.2, "congestion": 2.2},
    "DELHI - MUMBAI":    {"fog": 1.4, "rain": 1.8, "congestion": 1.5},
    "DELHI - CHENNAI":   {"fog": 1.6, "rain": 1.5, "congestion": 1.8},
    "MUMBAI - HOWRAH":   {"fog": 1.1, "rain": 2.0, "congestion": 2.4},
    "HOWRAH - GUWAHATI": {"fog": 2.5, "rain": 3.0, "congestion": 2.0},
    "HOWRAH - CHENNAI":  {"fog": 0.8, "rain": 2.8, "congestion": 1.7},
}

class RailwayDelayMLSimulator:
    def __init__(self, data_path='Train-Data/EACalculation.csv'):
        # Resolve data path
        if not os.path.exists(data_path):
            alt_path = os.path.join(ROOT_DIR, data_path)
            if os.path.exists(alt_path):
                data_path = alt_path

        print(f"[INIT] Loading fleet metadata from '{data_path}'...")
        self.df = pd.read_csv(data_path, keep_default_na=False)
        self.df['train_no'] = self.df['train_no'].astype(str).str.zfill(5)
        
        # Precompute route keys
        self.df['route_key'] = (
            self.df['source_station'].str.upper().str.strip() + " - " + 
            self.df['destination_station'].str.upper().str.strip()
        )

        # Precompute dictionary lookup for ultra-fast vector evaluation
        self.train_map = {row['train_no']: row.to_dict() for _, row in self.df.iterrows()}
        print(f"[INIT] Loaded {len(self.train_map):,} trains into high-throughput simulation memory.")

    def compute_single_case(self, train_no, weather='CLEAR', track='NORMAL', dispatch='FREE_FLOW',
                            traction='OPTIMAL', terminal='NOMINAL_DWELL', crew='NORMAL_SHIFT',
                            chain_pulling_events=0, engine_failure=False, blocking_train_delay=0.0):
        """
        Calculates exact physical, cascading, and net delay vector for a specific train under a defined scenario,
        incorporating TRETAroutenumber block zone occupancy and abnormal failure scenarios.
        """
        train_id = str(train_no).zfill(5)
        t = self.train_map.get(train_id)
        if not t:
            t = self.train_map.get('12001')
            train_id = '12001'

        tier = t.get('train_tier', 'T3_EXPRESS')
        halts = float(t.get('total_halts', 10))
        duration = float(t.get('duration_mins', 500))
        distance = float(t.get('total_distance_km', 600))
        ea_buffer = float(t.get('net_slack_mins', t.get('EA_allotted_mins', 120.0)))
        treta_route = t.get('treta_route_number', f"TRETA-RT-{train_id}")
        route_key = t.get('route_key', '')

        coeffs = CORRIDOR_SENSITIVITY.get(route_key, {"fog": 1.0, "rain": 1.0, "congestion": 1.0})

        # =====================================================================
        # 1. PRIMARY SHOCKS (Weather + Track + Abnormal Failures: Chain Pulling / Engine Failure)
        # =====================================================================
        
        # Weather delay
        d_weather = 0.0
        if weather == 'FOG':
            tier_fog_mult = 0.7 if tier == 'T1_PREMIUM' else 1.0
            d_weather = 45.0 * coeffs['fog'] * tier_fog_mult
        elif weather == 'MONSOON_FLOOD':
            d_weather = 55.0 * coeffs['rain']
        elif weather == 'STORM':
            d_weather = 35.0 * coeffs['rain']
        elif weather == 'HEATWAVE':
            d_weather = 15.0

        # Track restriction delay (TSR & Blocks)
        d_track = 0.0
        if track == 'MINOR_TSR':
            d_track = 8.0
        elif track == 'MAJOR_BLOCK':
            d_track = 38.0
        elif track == 'SIGNAL_FAILURE':
            d_track = 65.0

        # Traction & Mechanical Failures
        d_traction = 0.0
        if traction == 'LOCO_DERATING':
            d_traction = 22.0

        # Abnormal Failure 1: Alarm Chain Pulling (ACP) - 15 mins per event
        d_chain_pulling = round(float(chain_pulling_events) * 15.0, 1)

        # Abnormal Failure 2: Engine Failure on this train - 15 mins
        d_engine_failure = 15.0 if engine_failure else 0.0

        d_primary = round(d_weather + d_track + d_traction + d_chain_pulling + d_engine_failure, 1)

        # =====================================================================
        # 2. CASCADING RIPPLE PROPAGATION (TRETAroutenumber Zone Occupancy, Crossing, Terminal, Crew)
        # =====================================================================

        # A) TRETAroutenumber Zone Block Occupancy Delay
        # If any train ahead on that route zone is delayed, trailing train inherits exact blocking delay
        d_headway = 0.0
        if dispatch == 'TRETA_ZONE_OCCUPIED':
            if blocking_train_delay > 0:
                # Direct delay inheritance: if blocking train is delayed by X mins, train behind gets late by X mins
                d_headway = round(float(blocking_train_delay), 1)
            elif engine_failure:
                # In case of delay due to engine failure, trains on same TRETAroutenumber delayed by 10-15 mins
                d_headway = 12.5
            else:
                # Standard zone occupancy hold (7 mins)
                d_headway = 7.0
        elif dispatch == 'PEAK_OVERTAKE_HOLD':
            if tier == 'T1_PREMIUM':
                d_headway = 0.0
            elif tier == 'T2_SUPERFAST':
                d_headway = 15.0
            else:
                d_headway = 35.0
        elif dispatch == 'NORMAL_TRAFFIC':
            d_headway = round(min(20.0, (halts * 0.25) * coeffs['congestion']), 1)

        # B) Terminal & Junction Platform Starvation
        d_junction = 0.0
        if terminal == 'PLATFORM_STARVATION':
            d_junction = round(min(45.0, 18.0 + (halts * 0.2)), 1)

        # C) Rake Turnaround & Pit-Line Linkage Deficit
        d_turnaround = 0.0
        if terminal == 'TURNAROUND_DEFICIT':
            d_turnaround = round(min(120.0, 45.0 + (d_primary * 0.3)), 1)

        # D) Single-Track Crossing Precedence with Zone Traversal Time
        # Delay caused to train that couldn't cross = opposing train delay + zone crossing time (nominal 15m)
        tier_precedence = {'T1_PREMIUM': 0.2, 'T2_SUPERFAST': 0.6, 'T3_EXPRESS': 1.2}
        d_crossing = 0.0
        zone_crossing_time = 15.0 # Average time taken by train to traverse single-track zone
        if dispatch in ['NORMAL_TRAFFIC', 'PEAK_OVERTAKE_HOLD', 'TRETA_ZONE_OCCUPIED']:
            opposing_delay = blocking_train_delay if blocking_train_delay > 0 else (d_primary * 0.2)
            d_crossing = round(min(50.0, (opposing_delay + zone_crossing_time) * tier_precedence.get(tier, 1.0)), 1)

        # E) Crew HOER 10-12 Hour Expiry Rule
        total_trip_time_so_far = duration + (d_primary + d_headway + d_junction + d_turnaround + d_crossing)
        d_crew = 0.0
        if crew == 'HOER_DUTY_EXPIRED' or (total_trip_time_so_far > 600.0 and (d_primary + d_headway) >= 45.0):
            d_crew = 58.5


        # Realistic Recovery Efficiency of Working Time Table (EA) Slack
        # In real Indian Railways operations, line traffic and caution orders prevent 100% drawdown of theoretical EA.
        recovery_rate = 0.35 if tier == 'T1_PREMIUM' else (0.22 if tier == 'T2_SUPERFAST' else 0.12)
        base_friction = 2.5 if tier == 'T1_PREMIUM' else (7.5 if tier == 'T2_SUPERFAST' else 17.5)

        d_cascade = round(d_headway + d_junction + d_turnaround + d_crossing + d_crew, 1)
        gross_delay = round(d_primary + d_cascade + base_friction, 1)

        max_usable_ea = ea_buffer * 0.20
        absorbed_by_ea = round(min(gross_delay * recovery_rate, max_usable_ea), 1)

        # Final Net Delay
        net_delay = round(max(0.0, gross_delay - absorbed_by_ea), 1)

        # User Rule: If late by more than 5 minutes, show as LATE
        arrival_status = "LATE" if net_delay > 5.0 else "ON_TIME"

        # Scheduled arrival minutes (from duration)
        sched_arr_mins = round(duration)
        final_eta_mins = round(sched_arr_mins + net_delay)

        # Feature Attribution (SHAP-like percentage decomposition of what caused the delay)
        gross_safe = max(1.0, gross_delay)
        attr = {
            'weather_pct': round((d_weather / gross_safe) * 100, 1),
            'track_pct': round((d_track / gross_safe) * 100, 1),
            'traction_pct': round(((d_traction + d_engine_failure) / gross_safe) * 100, 1),
            'chain_pulling_pct': round((d_chain_pulling / gross_safe) * 100, 1),
            'headway_ripple_pct': round((d_headway / gross_safe) * 100, 1),
            'junction_pct': round((d_junction / gross_safe) * 100, 1),
            'turnaround_pct': round((d_turnaround / gross_safe) * 100, 1),
            'crossing_pct': round((d_crossing / gross_safe) * 100, 1),
            'crew_pct': round((d_crew / gross_safe) * 100, 1),
            'buffer_absorption_efficiency': round((absorbed_by_ea / gross_safe) * 100, 1)
        }


        return {
            'train_no': train_id,
            'train_name': t.get('train_name', ''),
            'train_tier': tier,
            'source_station': t.get('source_station', ''),
            'destination_station': t.get('destination_station', ''),
            'treta_route_number': treta_route,
            'total_halts': int(halts),
            'duration_mins': sched_arr_mins,
            'distance_km': distance,
            'scenario': {
                'weather': weather,
                'track': track,
                'dispatch': dispatch,
                'traction': traction,
                'terminal': terminal,
                'crew': crew,
                'chain_pulling_events': chain_pulling_events,
                'engine_failure': engine_failure
            },
            'primary_breakdown': {
                'd_weather': d_weather,
                'd_track': d_track,
                'd_traction': d_traction,
                'd_chain_pulling': d_chain_pulling,
                'd_engine_failure': d_engine_failure,
                'PrimaryDelay': d_primary
            },

            'cascade_breakdown': {
                'd_headway': d_headway,
                'd_junction': d_junction,
                'd_turnaround': d_turnaround,
                'd_crossing': d_crossing,
                'd_crew': d_crew,
                'CascadeDelay': d_cascade
            },
            'math_resolution': {
                'grossDelay': gross_delay,
                'EA_allotted_mins': ea_buffer,
                'Absorbed_by_EA': absorbed_by_ea,
                'NetDelay': net_delay,
                'ScheduledArrival_mins': sched_arr_mins,
                'Final_ETA_mins': final_eta_mins,
                'Arrival_Status': arrival_status
            },
            'feature_attribution': attr
        }

    def generate_full_permutation_matrix(self, sample_train_count=50, export_csv=True, output_file='Train-Data/MLCompoundPermutations.csv'):
        """
        Executes a comprehensive combinatorial sweep across all domains for a sampled cohort of trains.
        """
        print("=" * 80)
        print("GENERATING COMPREHENSIVE MULTI-DOMAIN ML DELAY PERMUTATIONS")
        print("=" * 80)

        # Create combinations across all 6 operational domains
        # 5 Weather x 4 Track x 4 Dispatch x 3 Traction x 3 Terminal x 2 Crew = 1,440 test cases per train!
        # For high-throughput execution across multiple trains, we generate the full matrix:
        test_weather = ['CLEAR', 'FOG', 'MONSOON_FLOOD', 'STORM']
        test_track = ['NORMAL', 'MINOR_TSR', 'MAJOR_BLOCK', 'SIGNAL_FAILURE']
        test_dispatch = ['FREE_FLOW', 'NORMAL_TRAFFIC', 'PEAK_OVERTAKE_HOLD', 'LEADING_FLAGSHIP_DELAYED']
        test_traction = ['OPTIMAL', 'HEAVY_STOPPING_DRAG']
        test_terminal = ['NOMINAL_DWELL', 'PLATFORM_STARVATION', 'TURNAROUND_DEFICIT']
        test_crew = ['NORMAL_SHIFT', 'HOER_DUTY_EXPIRED']

        scenarios = list(itertools.product(
            test_weather, test_track, test_dispatch, test_traction, test_terminal, test_crew
        ))
        print(f"Total Discrete Cross-Domain Permutations: {len(scenarios):,} scenarios per train.")

        # Select flagship and representative train cohort
        all_train_ids = list(self.train_map.keys())
        flagship_priority = ['12001', '12002', '12951', '12952', '12625', '12626', '19019', '22436', '12301', '12302']
        sampled_ids = flagship_priority + [tid for tid in all_train_ids if tid not in flagship_priority][:max(0, sample_train_count - len(flagship_priority))]

        print(f"Evaluating across {len(sampled_ids)} trains (Total Vector Evaluations: {len(sampled_ids) * len(scenarios):,})...")
        t0 = time.time()

        rows = []
        for tid in sampled_ids:
            for sc in scenarios:
                w, trk, disp, trac, term, crw = sc
                res = self.compute_single_case(
                    train_no=tid, weather=w, track=trk, dispatch=disp,
                    traction=trac, terminal=term, crew=crw
                )
                m = res['math_resolution']
                p = res['primary_breakdown']
                c = res['cascade_breakdown']
                rows.append({
                    'train_no': tid,
                    'train_name': res['train_name'],
                    'train_tier': res['train_tier'],
                    'source': res['source_station'],
                    'destination': res['destination_station'],
                    'case_weather': w,
                    'case_track': trk,
                    'case_dispatch': disp,
                    'case_traction': trac,
                    'case_terminal': term,
                    'case_crew': crw,
                    'd_weather': p['d_weather'],
                    'd_track': p['d_track'],
                    'd_traction': p['d_traction'],
                    'd_kinetic': p['d_kinetic'],
                    'PrimaryDelay': p['PrimaryDelay'],
                    'd_headway': c['d_headway'],
                    'd_junction': c['d_junction'],
                    'd_turnaround': c['d_turnaround'],
                    'd_crossing': c['d_crossing'],
                    'd_crew': c['d_crew'],
                    'CascadeDelay': c['CascadeDelay'],
                    'grossDelay': m['grossDelay'],
                    'EA_buffer_mins': m['EA_allotted_mins'],
                    'Absorbed_by_EA': m['Absorbed_by_EA'],
                    'NetDelay': m['NetDelay'],
                    'Arrival_Status': m['Arrival_Status']
                })

        perm_df = pd.DataFrame(rows)
        elapsed = time.time() - t0
        print(f"[COMPLETE] Generated {len(perm_df):,} permutations in {elapsed:.2f}s ({len(perm_df)/elapsed:,.0f} eval/sec)!")

        # Summary Audit
        ontime_pct = (perm_df['Arrival_Status'] == 'ON_TIME').mean() * 100
        avg_gross = perm_df['grossDelay'].mean()
        avg_ea = perm_df['EA_buffer_mins'].mean()
        avg_net = perm_df['NetDelay'].mean()

        print("\n--- PERMUTATION MATRIX AUDIT ---")
        print(f"Total Scenario Evaluations : {len(perm_df):,}")
        print(f"Fleet On-Time Punctuality   : {ontime_pct:.2f}%")
        print(f"Average Gross Delay         : {avg_gross:.1f} mins")
        print(f"Average EA Buffer Available : {avg_ea:.1f} mins")
        print(f"Average Net Arrival Delay   : {avg_net:.1f} mins")

        if export_csv:
            out_path = output_file
            if not os.path.isabs(out_path):
                out_path = os.path.join(ROOT_DIR, out_path)
            perm_df.to_csv(out_path, index=False)
            print(f"Successfully saved full permutation dataset to '{out_path}' ({os.path.getsize(out_path)/1024/1024:.2f} MB)")

        return perm_df

def main():
    parser = argparse.ArgumentParser(description="Multi-Domain Machine Learning Permutation & Delay Simulation Engine")
    parser.add_argument('--train', default='12001', help='Specific train number to inspect')
    parser.add_argument('--weather', default='CLEAR', choices=DOMAIN_WEATHER)
    parser.add_argument('--track', default='NORMAL', choices=DOMAIN_TRACK)
    parser.add_argument('--dispatch', default='FREE_FLOW', choices=DOMAIN_DISPATCH)
    parser.add_argument('--traction', default='OPTIMAL', choices=DOMAIN_TRACTION)
    parser.add_argument('--terminal', default='NOMINAL_DWELL', choices=DOMAIN_TERMINAL)
    parser.add_argument('--crew', default='NORMAL_SHIFT', choices=DOMAIN_CREW)
    parser.add_argument('--generate_matrix', action='store_true', help='Generate full permutation matrix dataset')
    parser.add_argument('--train_count', type=int, default=25, help='Number of trains to sweep in matrix')
    args = parser.parse_args()

    model = RailwayDelayMLSimulator()

    if args.generate_matrix:
        model.generate_full_permutation_matrix(sample_train_count=args.train_count)
    else:
        # Run specific single case inspection
        res = model.compute_single_case(
            train_no=args.train,
            weather=args.weather,
            track=args.track,
            dispatch=args.dispatch,
            traction=args.traction,
            terminal=args.terminal,
            crew=args.crew
        )

        print("\n" + "=" * 80)
        print(f"SCENARIO DELAY PREDICTION: {res['train_no']} - {res['train_name']} ({res['train_tier']})")
        print(f"Route: {res['source_station']} -> {res['destination_station']} | Distance: {res['distance_km']} km | Halts: {res['total_halts']}")
        print("=" * 80)
        print("OPERATIONAL SCENARIO:")
        for k, v in res['scenario'].items():
            print(f"  {k.capitalize():<12}: {v}")
        
        print("\nDELAY BREAKDOWN:")
        p = res['primary_breakdown']
        c = res['cascade_breakdown']
        m = res['math_resolution']
        attr = res['feature_attribution']

        print(f"  Primary Shocks    : +{p['PrimaryDelay']:.1f} mins (Weather: {p['d_weather']}m, Track: {p['d_track']}m, Traction: {p['d_traction']}m, Kinetics: {p['d_kinetic']}m)")
        print(f"  Cascading Ripple  : +{c['CascadeDelay']:.1f} mins (Headway: {c['d_headway']}m, Junction: {c['d_junction']}m, Turnaround: {c['d_turnaround']}m, Crossing: {c['d_crossing']}m, Crew: {c['d_crew']}m)")
        print(f"  Gross Delay       : {m['grossDelay']:.1f} mins")
        print(f"  EA Buffer Slack   : {m['EA_allotted_mins']:.1f} mins (Absorbed: -{m['Absorbed_by_EA']:.1f} mins)")
        print(f"  Net Destination   : {m['NetDelay']:.1f} mins -> [{m['Arrival_Status']}]")

        print("\nFEATURE ATTRIBUTION & CAUSAL CONTRIBUTIONS:")
        print(f"  Weather Disturbance       : {attr['weather_pct']}%")
        print(f"  Track / Speed Restrictions : {attr['track_pct']}%")
        print(f"  Traction / Kinetic Drag    : {attr['traction_pct']}%")
        print(f"  Headway Queue Ripple       : {attr['headway_ripple_pct']}%")
        print(f"  Junction Starvation        : {attr['junction_pct']}%")
        print(f"  Turnaround Linkage Deficit : {attr['turnaround_pct']}%")
        print(f"  Single-Track Crossing Loops: {attr['crossing_pct']}%")
        print(f"  Crew Duty Expiry           : {attr['crew_pct']}%")
        print(f"  Timetable Slack Absorption : {attr['buffer_absorption_efficiency']}%")
        print("=" * 80 + "\n")

if __name__ == '__main__':
    main()
