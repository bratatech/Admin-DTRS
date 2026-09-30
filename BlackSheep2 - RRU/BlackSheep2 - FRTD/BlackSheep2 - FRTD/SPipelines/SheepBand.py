"""
SheepBand.py
============
Orchestrator extraction & calibrated EA injection engine.

Takes scenario attributes submitted from the frontend/API, extracts the corresponding 
exact disturbance row from the Neon PostgreSQL 'master_pnc' table (with local CSV fallback), 
and injects the estimated delays into the calibrated EA formula to produce the final 
Net Delay, Predicted ETA, and Arrival Status across Indian Railways trains.
"""

import os
import pandas as pd
from sqlalchemy import create_engine, text

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Lazy-loaded database engine
_engine = None
def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(NEON_DATABASE_URL, pool_pre_ping=True)
    return _engine

# Preload train metadata and calibrated EA from EACalculation
print("SheepBand: Preloading train calibrated EA and schedules...")
_ea_path = "Train-Data/EACalculation.csv"
_ea_df = pd.read_csv(_ea_path, keep_default_na=False)
_ea_df['train_no'] = _ea_df['train_no'].astype(str).str.zfill(5)
TRAIN_MAP = {row['train_no']: row.to_dict() for _, row in _ea_df.iterrows()}

# Preload destination timetable arrival times
_sched_path = "Train-Data/TrainSchedules_DND.csv"
_sched_df = pd.read_csv(_sched_path, keep_default_na=False)
_sched_df['train_no'] = _sched_df['train_no'].astype(str).str.zfill(5)
_dest_stops = _sched_df.sort_values(['train_no', 'sr_no']).groupby('train_no').last().reset_index()
DEST_MAP = {}
for _, row in _dest_stops.iterrows():
    DEST_MAP[row['train_no']] = {
        'dest_station_code': row['station_code'],
        'dest_station_name': row['station_name'],
        'arr_time': str(row['arr_time']).strip(),
        'day': int(row['day']) if str(row['day']).isdigit() else 1
    }

# Local masterPnC fallback cache for lightning-fast sub-millisecond lookups
_pnc_path = "Train-Data/masterPnC.csv"
if os.path.exists(_pnc_path):
    _master_pnc_df = pd.read_csv(_pnc_path, keep_default_na=False)
else:
    _master_pnc_df = None

# Preload TRETA zone elements for live cascading impact mapping
_zones_path = "Train-Data/TRETAZoneElements.csv"
if os.path.exists(_zones_path):
    print("SheepBand: Indexing TRETA route zones for live cascade impact mapping...")
    _zones_df = pd.read_csv(_zones_path, keep_default_na=False)
    _zones_df['train_no'] = _zones_df['train_no'].astype(str).str.zfill(5)
    ZONE_TO_TRAINS = _zones_df.groupby('treta_zone_element')['train_no'].apply(list).to_dict()
    TRAIN_TO_ZONES = _zones_df.groupby('train_no')['treta_zone_element'].apply(list).to_dict()
else:
    ZONE_TO_TRAINS = {}
    TRAIN_TO_ZONES = {}


def get_affected_trains(source_train_no, gross_delay, limit=7):
    """
    Finds trains sharing block zone elements with source_train_no,
    and computes inherited domino delays based on spatial proximity and precedence.
    """
    source_train_no = str(source_train_no).zfill(5)
    source_zones = TRAIN_TO_ZONES.get(source_train_no, [])
    if not source_zones:
        return []

    # Count how many zones each other train shares with the source train
    shared_counts = {}
    train_shared_zone = {}
    for z in source_zones:
        for t in ZONE_TO_TRAINS.get(z, []):
            if t != source_train_no:
                shared_counts[t] = shared_counts.get(t, 0) + 1
                if t not in train_shared_zone:
                    train_shared_zone[t] = z

    # Sort trains by number of shared zone hops descending
    sorted_trains = sorted(shared_counts.keys(), key=lambda x: shared_counts[x], reverse=True)

    affected = []
    for rank, t_id in enumerate(sorted_trains[:limit]):
        info = TRAIN_MAP.get(t_id, {})
        t_name = info.get('train_name', f'TRAIN {t_id}')
        t_tier = info.get('train_tier', 'T3_EXPRESS')
        z_elem = train_shared_zone.get(t_id, 'Shared Corridor')
        
        # Universal block delay matching:
        # Direct trailing train inherits exact/near-full blocking delay
        if rank == 0:
            ripple_factor = 1.0  # Exact inheritance: Δt_behind = Δt_ahead
            cause = "Direct Headway Block Delay (Leading Train Occupancy)"
        elif rank in [1, 2]:
            ripple_factor = 0.85
            cause = "Secondary Headway Queue Compression"
        elif rank in [3, 4]:
            ripple_factor = 0.65
            cause = "Single-Track Crossing Loop Detention"
        else:
            ripple_factor = 0.50
            cause = "Downstream Corridor Approach Holding"

        inherited_delay = round(max(0.0, gross_delay * ripple_factor), 1) if gross_delay > 2.0 else round(max(1.0, 3.5 - rank * 0.4), 1)
        impact_status = "LATE (HOLD)" if inherited_delay > 5.0 else "CAUTION (ON TIME)"

        affected.append({
            "train_no": t_id,
            "train_name": t_name,
            "train_tier": t_tier,
            "shared_zone": z_elem,
            "hops_shared": shared_counts[t_id],
            "ripple_factor": ripple_factor,
            "inherited_delay_mins": inherited_delay,
            "cascade_cause": cause,
            "destination": info.get('destination_station', 'N/A'),
            "impact_status": impact_status
        })

    return affected


def format_predicted_eta(time_str, day, net_delay):
    """Adds net delay (mins) to scheduled destination arrival."""
    if not time_str or time_str in ['SRC', 'DSTN', '', 'nan']:
        return "N/A"
    try:
        parts = time_str.split(':')
        h, m = int(parts[0]), int(parts[1])
        total_mins = h * 60 + m + int(round(net_delay))
        day_add = total_mins // 1440
        rem_mins = total_mins % 1440
        new_h = rem_mins // 60
        new_m = rem_mins % 60
        final_day = int(day) + day_add
        day_tag = f" (Day {final_day})" if final_day > 1 else ""
        return f"{new_h:02d}:{new_m:02d} IST{day_tag}"
    except Exception:
        return f"{time_str} (+{net_delay:.1f}m)"


def query_master_pnc_db(params):
    """
    Extracts the matching permutation row directly from Neon PostgreSQL 'master_pnc' table.
    Falls back to in-memory/local CSV if offline.
    """
    try:
        engine = get_engine()
        query = text("""
            SELECT 
                combination_id,
                train_tier,
                weather,
                tsr_level,
                priority_congestion,
                treta_block_occupancy,
                crossing_conflict,
                alarm_chain_pulling,
                engine_failure,
                terminal_platform_hold,
                crew_duty_status,
                d_weather,
                d_tsr,
                d_acp,
                d_engine_failure,
                primary_delay_mins,
                d_headway_treta,
                d_crossing,
                d_platform_hold,
                d_crew_delay,
                cascade_delay_mins,
                gross_delay_mins,
                nominal_ea_buffer_mins,
                absorbed_by_ea_mins,
                net_delay_mins,
                arrival_status
            FROM master_pnc
            WHERE train_tier = :train_tier
              AND weather = :weather
              AND tsr_level = :tsr_level
              AND priority_congestion = :priority_congestion
              AND treta_block_occupancy = :treta_block_occupancy
              AND crossing_conflict = :crossing_conflict
              AND alarm_chain_pulling = :alarm_chain_pulling
              AND engine_failure = :engine_failure
              AND terminal_platform_hold = :terminal_platform_hold
              AND crew_duty_status = :crew_duty_status
            LIMIT 1;
        """)
        with engine.connect() as conn:
            result = conn.execute(query, params).fetchone()
            if result:
                return dict(result._mapping)
    except Exception as e:
        print(f"SheepBand: Database query fallback ({e}) -> using local masterPnC.csv")

    # Local CSV Fallback
    if _master_pnc_df is not None:
        cond = (
            (_master_pnc_df['train_tier'] == params['train_tier']) &
            (_master_pnc_df['weather'] == params['weather']) &
            (_master_pnc_df['tsr_level'] == params['tsr_level']) &
            (_master_pnc_df['priority_congestion'] == params['priority_congestion']) &
            (_master_pnc_df['treta_block_occupancy'] == params['treta_block_occupancy']) &
            (_master_pnc_df['crossing_conflict'] == params['crossing_conflict']) &
            (_master_pnc_df['alarm_chain_pulling'] == params['alarm_chain_pulling']) &
            (_master_pnc_df['engine_failure'] == params['engine_failure']) &
            (_master_pnc_df['terminal_platform_hold'] == params['terminal_platform_hold']) &
            (_master_pnc_df['crew_duty_status'] == params['crew_duty_status'])
        )
        match = _master_pnc_df[cond]
        if len(match) > 0:
            return match.iloc[0].to_dict()

    return None


def execute_sheepband_orchestration(
    train_no: str,
    weather: str = "Clear",
    tsr: str = "None",
    congestion: str = "None",
    blocking_delay: float = 0.0,
    crossing_conflict: str = "Double_Quad_Track",
    chain_pulling: int = 0,
    engine_failure: bool = False,
    terminal_platform_hold: str = "Platform_Available",
    crew_duty_status: str = "Duty_Valid"
):
    """
    Core function:
    1. Normalizes scenario inputs to exact master_pnc subattribute keys.
    2. Extracts the matching row from 'master_pnc'.
    3. Retrieves train's calibrated EA from EACalculation / ea_calculation.
    4. Executes the Calibrated EA delay subtraction formula.
    5. Returns the complete step-by-step compound ETA breakdown.
    """
    # 1. Resolve train
    train_id = str(train_no).strip().zfill(5)
    t_info = TRAIN_MAP.get(train_id)
    if not t_info:
        # Fallback to Shatabdi 12001
        train_id = "12001"
        t_info = TRAIN_MAP.get("12001", {})

    tier = t_info.get('train_tier', 'T3_EXPRESS_PASSENGER')
    if tier == 'T3_EXPRESS':
        tier = 'T3_EXPRESS_PASSENGER'

    # 2. Normalize scenario inputs to exact subattribute domain keys
    weather_key = weather if weather in ['Clear', 'Fog', 'Heavy_Rain', 'Thunderstorm', 'Snow'] else 'Clear'
    tsr_key = tsr if tsr in ['None', 'Minor', 'Major'] else 'None'
    congestion_key = congestion if congestion in ['None', 'Low', 'High'] else 'None'

    # Map blocking delay to treta_block_occupancy
    b_val = float(blocking_delay) if blocking_delay else 0.0
    if b_val >= 15.0:
        occupancy_key = 'Preceding_Delayed_Severe'
    elif b_val >= 8.0:
        occupancy_key = 'Preceding_Delayed_Moderate'
    elif b_val >= 2.0:
        occupancy_key = 'Preceding_Delayed_Minor'
    else:
        occupancy_key = 'Track_Clear'

    crossing_key = crossing_conflict if crossing_conflict in ['Double_Quad_Track', 'Minor_Crossing_Wait', 'Major_Crossing_Wait'] else 'Double_Quad_Track'

    acp_val = int(chain_pulling) if chain_pulling else 0
    if acp_val >= 2:
        acp_key = '2_Events'
    elif acp_val == 1:
        acp_key = '1_Event'
    else:
        acp_key = '0_Events'

    engine_key = 'Failure' if engine_failure in [True, 'true', 'True', 1] else 'Nominal'
    plat_key = 'Outer_Holding' if terminal_platform_hold in ['Outer_Holding', True] else 'Platform_Available'
    crew_key = 'Duty_Exceeded' if crew_duty_status in ['Duty_Exceeded', True] else 'Duty_Valid'

    scenario_params = {
        'train_tier': tier,
        'weather': weather_key,
        'tsr_level': tsr_key,
        'priority_congestion': congestion_key,
        'treta_block_occupancy': occupancy_key,
        'crossing_conflict': crossing_key,
        'alarm_chain_pulling': acp_key,
        'engine_failure': engine_key,
        'terminal_platform_hold': plat_key,
        'crew_duty_status': crew_key
    }

    # 3. Extract matching row from master_pnc table
    pnc_row = query_master_pnc_db(scenario_params)
    if not pnc_row:
        raise ValueError(f"No matching permutation row in master_pnc for parameters: {scenario_params}")

    primary_delay = float(pnc_row['primary_delay_mins'])
    cascade_delay = float(pnc_row['cascade_delay_mins'])
    gross_delay = float(pnc_row['gross_delay_mins'])

    # 4. FORMULA-BASED INJECTION: Calibrated EA subtraction
    # Fetch specific train's calibrated slack buffer EA_calibrated
    # (previously net_slack_mins in EACalculation.csv)
    ea_calibrated = float(t_info.get('net_slack_mins', t_info.get('EA_allotted_mins', 18.05)))

    # Tier-specific recovery capability (considering line saturation)
    if tier == 'T1_PREMIUM':
        recovery_rate = 0.35
    elif tier == 'T2_SUPERFAST':
        recovery_rate = 0.22
    else:
        recovery_rate = 0.12

    max_usable_ea = round(ea_calibrated * 0.20, 2)
    absorbed_by_ea = round(min(gross_delay * recovery_rate, max_usable_ea), 1)

    # Net Delay & Strict 5-minute threshold
    net_delay = round(max(0.0, gross_delay - absorbed_by_ea), 1)
    arrival_status = "ON_TIME" if net_delay <= 5.0 else "LATE"

    # 5. Scheduled Arrival & Predicted ETA
    d_info = DEST_MAP.get(train_id, {})
    sched_arr_str = d_info.get('arr_time', '22:30')
    arr_day = d_info.get('day', 1)
    dest_stn_name = d_info.get('dest_station_name', t_info.get('destination_station', ''))

    predicted_eta_str = format_predicted_eta(sched_arr_str, arr_day, net_delay)

    return {
        "train_no": train_id,
        "train_name": t_info.get('train_name', ''),
        "train_tier": tier,
        "treta_route_number": t_info.get('treta_route_number', f"TRETA-RT-{train_id}"),
        "source_station": t_info.get('source_station', ''),
        "destination_station": dest_stn_name,
        "total_distance_km": t_info.get('total_distance_km', 700),
        "duration_mins": float(t_info.get('duration_mins', 500)),
        "total_halts": t_info.get('total_halts', 8),
        "combination_id": int(pnc_row.get('combination_id', 0)),
        "master_pnc_scenario": scenario_params,
        "calibrated_ea_buffer_mins": ea_calibrated,
        "EA_allotted_mins": ea_calibrated,
        "primary_breakdown": {
            "d_weather": float(pnc_row['d_weather']),
            "d_tsr": float(pnc_row['d_tsr']),
            "d_weather_tsr_priority": round(float(pnc_row['d_weather']) + float(pnc_row['d_tsr']), 1),
            "d_acp": float(pnc_row['d_acp']),
            "d_chain_pulling": float(pnc_row['d_acp']),
            "d_engine_failure": float(pnc_row['d_engine_failure']),
            "PrimaryDelay": primary_delay
        },
        "cascade_breakdown": {
            "d_headway_treta": float(pnc_row['d_headway_treta']),
            "d_headway": float(pnc_row['d_headway_treta']),
            "d_crossing": float(pnc_row['d_crossing']),
            "d_platform_hold": float(pnc_row['d_platform_hold']),
            "d_junction": float(pnc_row['d_platform_hold']),
            "d_turnaround": 0.0,
            "d_crew": float(pnc_row['d_crew_delay']),
            "d_crew_delay": float(pnc_row['d_crew_delay']),
            "CascadeDelay": cascade_delay
        },
        "math_resolution": {
            "grossDelay": gross_delay,
            "calibrated_ea_allotted": ea_calibrated,
            "max_usable_ea": max_usable_ea,
            "Absorbed_by_EA": absorbed_by_ea,
            "NetDelay": net_delay,
            "ScheduledDestinationArrival": f"{sched_arr_str} IST" + (f" (Day {arr_day})" if arr_day > 1 else ""),
            "Predicted_ETA": predicted_eta_str,
            "Arrival_Status": arrival_status
        },
        "affected_trains": get_affected_trains(train_id, gross_delay, limit=6)
    }


if __name__ == '__main__':
    # Self-test script across diverse operating cases
    print("Testing SheepBand Orchestration Engine...\n")
    
    # 1. Ideal Shatabdi
    res1 = execute_sheepband_orchestration("12001", weather="Clear", tsr="None", congestion="None")
    print(f"1. 12001 Ideal -> Gross: {res1['math_resolution']['grossDelay']}m | Calibrated EA: {res1['calibrated_ea_buffer_mins']}m | Absorbed: {res1['math_resolution']['Absorbed_by_EA']}m | Net: {res1['math_resolution']['NetDelay']}m | Status: {res1['math_resolution']['Arrival_Status']} | ETA: {res1['math_resolution']['Predicted_ETA']}")

    # 2. Shatabdi with ACP (1 event)
    res2 = execute_sheepband_orchestration("12001", weather="Clear", chain_pulling=1)
    print(f"2. 12001 ACP 1  -> Gross: {res2['math_resolution']['grossDelay']}m | Primary: {res2['primary_breakdown']['PrimaryDelay']}m | Net: {res2['math_resolution']['NetDelay']}m | Status: {res2['math_resolution']['Arrival_Status']} | ETA: {res2['math_resolution']['Predicted_ETA']}")

    # 3. Shatabdi with Preceding Train Delayed 10m on TRETA zone
    res3 = execute_sheepband_orchestration("12001", weather="Clear", blocking_delay=10.0)
    print(f"3. 12001 Blk 10 -> Gross: {res3['math_resolution']['grossDelay']}m | Cascade: {res3['cascade_breakdown']['CascadeDelay']}m | Net: {res3['math_resolution']['NetDelay']}m | Status: {res3['math_resolution']['Arrival_Status']} | ETA: {res3['math_resolution']['Predicted_ETA']}")
