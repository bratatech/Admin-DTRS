"""
10_cascade_pipeline_simulation.py
Master Simulation Orchestrator & API Endpoint Adapter

Chains both Primary and Secondary Cascading delay modules into an integrated end-to-end simulation:
  Primary Layer:
    - Initial Environmental & Dispatch Shocks (Weather, TSR Crawl, Priority Overtakes)
    - Slow Down and Acceleration Dynamics (Kinetic Deceleration & Acceleration Losses)
  Secondary Cascading Layer:
    - Stage 1 (M05): Block Section Headway Queuing & Signal Aspect Deceleration
    - Stage 2 (M06): Junction & Platform Starvation (Outer Signal Detention)
    - Stage 3 (M07): Rake & Locomotive Turnaround Linkage
    - Stage 4 (M08): Single-Track / Crossing Loop Precedence Conflicts
    - Stage 5 (M09): Crew & Loco Pilot Statutory Duty Expiry

Derives:
  grossDelay = PrimaryDelay + CascadeDelay
  Absorbed by EA allotted (EA = Net Slack Buffer)
  NetDelay = max(0, grossDelay - EA)
  ETA = ScheduledArrival + NetDelay
"""

import os
import sys
import argparse
import pandas as pd
import numpy as np
import time
from importlib import import_module

# Ensure Pipelines directory is in sys.path
PIPELINES_DIR = os.path.dirname(os.path.abspath(__file__))
if PIPELINES_DIR not in sys.path:
    sys.path.insert(0, PIPELINES_DIR)
ROOT_DIR = os.path.dirname(PIPELINES_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

def run_cascade_simulation(
    weather='Clear',
    priority_congestion='Low',
    tsr_level='Minor',
    headway_mins=8.0,
    clearance_margin_mins=5.0,
    crossing_clearance_mins=5.0,
    duty_limit_mins=600.0,
    output_master_csv='Train-Data/FinalOrchestraOutput.csv'
):
    start_time = time.time()
    print("=" * 85)
    print("MASTER RAILWAY DELAY PIPELINE & FINAL ETA DERIVATION SIMULATION")
    print(f"Operational Parameters:")
    print(f"  Weather              : {weather}")
    print(f"  Priority Congestion  : {priority_congestion}")
    print(f"  TSR Restriction Level: {tsr_level}")
    print(f"  Safety Headway       : {headway_mins} mins")
    print(f"  Platform Margin      : {clearance_margin_mins} mins")
    print(f"  Crossing Margin      : {crossing_clearance_mins} mins")
    print(f"  Crew Duty Limit      : {duty_limit_mins} mins ({duty_limit_mins/60:.1f} hrs)")
    print("=" * 85)

    # -------------------------------------------------------------
    # PRIMARY LAYER: Slow Down and Acceleration Dynamics (Kinetic Loss)
    # -------------------------------------------------------------
    print("\n[PRIMARY MODULE] Simulating Slow Down and Acceleration Dynamics...")
    m01b = import_module('01bKineticAccelDecelDelay')
    df_kinetic = m01b.compute_accel_decel_delays(
        tsr_level=tsr_level,
        output_csv='Train-Data/SlowAccDelay.csv'
    )
    kinetic_delay_map = dict(zip(df_kinetic['train_no'], df_kinetic['total_accel_decel_delay_mins']))

    # -------------------------------------------------------------
    # STAGE 1: Block Section Headway Queuing
    # -------------------------------------------------------------
    print("\n[CASCADING STAGE 1/5] Executing Block Section Headway Queuing...")
    m05 = import_module('05CascadeBlockHeadway')
    df_s1 = m05.compute_block_headway_delays(
        weather=weather,
        priority_congestion=priority_congestion,
        tsr_level=tsr_level,
        headway_mins=headway_mins
    )

    # -------------------------------------------------------------
    # STAGE 2: Junction & Platform Starvation
    # -------------------------------------------------------------
    print("\n[CASCADING STAGE 2/5] Executing Junction & Platform Starvation...")
    m06 = import_module('06CascadeJunctionStarvation')
    df_s2 = m06.compute_junction_starvation_delays(
        input_csv='Train-Data/HeadwayDelay.csv',
        clearance_margin_mins=clearance_margin_mins
    )

    # -------------------------------------------------------------
    # STAGE 3: Rake & Locomotive Turnaround Linkage
    # -------------------------------------------------------------
    print("\n[CASCADING STAGE 3/5] Executing Rake & Locomotive Turnaround Linkage...")
    m07 = import_module('07CascadeTurnaroundLinkage')
    df_s3 = m07.compute_turnaround_delays(
        input_csv='Train-Data/PlatformAllocDelay.csv'
    )

    # -------------------------------------------------------------
    # STAGE 4: Single-Track / Crossing Conflicts
    # -------------------------------------------------------------
    print("\n[CASCADING STAGE 4/5] Executing Single-Track Crossing Conflicts...")
    m08 = import_module('08CascadeCrossingConflicts')
    df_s4 = m08.compute_crossing_conflicts(
        input_csv='Train-Data/ServicingDelay.csv',
        clearance_mins=crossing_clearance_mins
    )

    # -------------------------------------------------------------
    # STAGE 5: Crew & Loco Pilot Duty Expiry
    # -------------------------------------------------------------
    print("\n[CASCADING STAGE 5/5] Executing Crew Duty Expiry Simulation...")
    m09 = import_module('09CascadeCrewDutyExpiry')
    df_s5 = m09.compute_crew_duty_expiry(
        input_csv='Train-Data/SingleTrackDelay.csv',
        duty_limit_mins=duty_limit_mins
    )

    # -------------------------------------------------------------
    # CONSOLIDATION & FINAL ETA DERIVATION
    # -------------------------------------------------------------
    print("\n[CONSOLIDATION] Calculating Final grossDelay, EA Buffer Absorption, NetDelay, and ETA...")

    master_df = df_s5.copy()
    
    # Map Kinetic Slow Down & Accelerate Delay
    master_df['d_accel_decel'] = master_df['train_no'].map(kinetic_delay_map).fillna(0.0).round(1)

    # Clean rename cascading components
    rename_cols = {
        'total_headway_delay_mins': 'd_headway',
        'total_junction_delay_mins': 'd_junction',
        'turnaround_delay_mins': 'd_turnaround',
        'total_crossing_delay_mins': 'd_crossing',
        'crew_relief_delay_mins': 'd_crew',
        'primary_delay_mins': 'd_weather_tsr_priority'
    }
    master_df = master_df.rename(columns=rename_cols)

    # Total Primary Delay = Environmental/Overtake + Kinetic Slowdown/Acceleration Delay
    master_df['PrimaryDelay'] = (master_df['d_weather_tsr_priority'] + master_df['d_accel_decel']).round(1)

    # Total Cascade Delay
    master_df['CascadeDelay'] = (
        master_df['d_headway'] +
        master_df['d_junction'] +
        master_df['d_turnaround'] +
        master_df['d_crossing'] +
        master_df['d_crew']
    ).round(1)

    # 1. Total Gross Delay = PrimaryDelay + CascadeDelay
    master_df['grossDelay'] = (master_df['PrimaryDelay'] + master_df['CascadeDelay']).round(1)

    # 2. Extra Time Allotted (EA) = Calibrated Net Slack Buffer (after kinetic loss subtraction)
    master_df['EA_allotted_mins'] = master_df['net_slack_mins'].round(1)

    # 3. Realistic Timetable Buffer Recovery:
    # On congested, interlinked railway tracks, trains can only recover a fraction of theoretical slack.
    # T1 Premium gets dispatch precedence (40% recovery); Superfast gets 25%; Express gets 15%.
    recovery_rates = master_df['train_tier'].map({
        'T1_PREMIUM': 0.40,
        'T2_SUPERFAST': 0.25,
        'T3_EXPRESS': 0.15
    }).fillna(0.20)

    usable_ea = np.maximum(0.0, master_df['EA_allotted_mins']) * 0.50
    master_df['Absorbed_by_EA_mins'] = np.minimum(
        master_df['grossDelay'] * recovery_rates,
        usable_ea
    ).round(1)

    # 4. Net Destination Delay: NetDelay = max(0, grossDelay - Absorbed_by_EA)
    master_df['NetDelay'] = np.maximum(
        0.0,
        master_df['grossDelay'] - master_df['Absorbed_by_EA_mins']
    ).round(1)

    # 5. Final ETA (in cumulative absolute timetable minutes from Day 1 00:00)
    master_df['ScheduledArrival_mins'] = master_df['duration_mins']
    master_df['Final_ETA_mins'] = master_df['ScheduledArrival_mins'] + master_df['NetDelay']

    # User Rule: Lateness threshold strictly 5.0 minutes (ON_TIME if <= 5.0 mins, LATE if > 5.0 mins)
    master_df['Arrival_Status'] = np.where(
        master_df['NetDelay'] <= 5.0,
        'ON_TIME',
        'LATE'
    )


    # Scenario metadata tags
    master_df['sim_weather'] = weather
    master_df['sim_congestion'] = priority_congestion
    master_df['sim_tsr'] = tsr_level

    # Final tidy column ordering
    key_cols = [
        'train_no', 'train_name', 'source_station', 'destination_station', 'train_tier',
        'duration_mins', 'total_distance_km', 'EA_allotted_mins',
        'sim_weather', 'sim_congestion', 'sim_tsr',
        'd_weather_tsr_priority', 'd_accel_decel', 'PrimaryDelay',
        'd_headway', 'd_junction', 'd_turnaround', 'd_crossing', 'd_crew', 'CascadeDelay',
        'grossDelay', 'Absorbed_by_EA_mins', 'NetDelay',
        'ScheduledArrival_mins', 'Final_ETA_mins', 'Arrival_Status'
    ]
    master_df = master_df[key_cols]

    # Save master dataset
    master_df.to_csv(output_master_csv, index=False)
    elapsed = round(time.time() - start_time, 2)
    print(f"\nMaster simulation results successfully written to '{output_master_csv}' ({len(master_df):,} trains) in {elapsed}s")

    # -------------------------------------------------------------
    # NETWORK AUDIT & METRICS REPORT
    # -------------------------------------------------------------
    total_n = len(master_df)
    on_time_n = (master_df['Arrival_Status'] == 'ON_TIME').sum()
    late_n = (master_df['Arrival_Status'] == 'LATE').sum()

    print("\n" + "=" * 85)
    print("FINAL NETWORK ETA AUDIT METRICS")
    print("=" * 85)
    print(f"Total Trains Evaluated               : {total_n:,}")
    print(f"Final Punctual Arrival (ON_TIME)     : {on_time_n:,} ({on_time_n/total_n*100:.2f}%)")
    print(f"Final Late Arrival (LATE > 15m)      : {late_n:,} ({late_n/total_n*100:.2f}%)")
    print(f"Average PrimaryDelay                 : {master_df['PrimaryDelay'].mean():.2f} mins")
    print(f"  |-- Weather/TSR/Overtakes          : {master_df['d_weather_tsr_priority'].mean():.2f} mins")
    print(f"  \\-- Slow Down & Accelerate Loss     : {master_df['d_accel_decel'].mean():.2f} mins")
    print(f"Average CascadeDelay                 : {master_df['CascadeDelay'].mean():.2f} mins")
    print(f"Average grossDelay (Primary+Cascade) : {master_df['grossDelay'].mean():.2f} mins")
    print(f"Average Absorbed by EA Buffer        : {master_df['Absorbed_by_EA_mins'].mean():.2f} mins")
    print(f"Average NetDelay at Destination      : {master_df['NetDelay'].mean():.2f} mins")

    print("\n--- BY TRAIN TIER STATUS ---")
    tier_summary = master_df.groupby('train_tier').agg(
        train_count=('train_no', 'count'),
        avg_primary=('PrimaryDelay', 'mean'),
        avg_cascade=('CascadeDelay', 'mean'),
        avg_gross=('grossDelay', 'mean'),
        avg_EA=('EA_allotted_mins', 'mean'),
        avg_net=('NetDelay', 'mean'),
        on_time_pct=('Arrival_Status', lambda x: (x == 'ON_TIME').mean() * 100)
    ).reset_index()
    print(tier_summary.to_string(index=False))

    print("\n--- SAMPLE FLAGSHIP TRAINS SNAPSHOT ---")
    sample_ids = [12001, 12002, 12951, 12952, 12626, 12625]
    samples = master_df[master_df['train_no'].astype(int).isin(sample_ids)][[
        'train_no', 'train_name', 'train_tier', 'PrimaryDelay', 'd_accel_decel',
        'CascadeDelay', 'grossDelay', 'EA_allotted_mins', 'NetDelay', 'Arrival_Status'
    ]]
    print(samples.to_string(index=False))
    print("=" * 85 + "\n")

    return master_df

def get_train_cascade_prediction(train_no, master_csv='Train-Data/FinalOrchestraOutput.csv'):
    """
    Query endpoint helper: Returns detailed delay breakdown and final ETA for a specific train.
    """
    df = pd.read_csv(master_csv)
    sub = df[df['train_no'].astype(str) == str(train_no).zfill(5)]
    if len(sub) == 0:
        sub = df[df['train_no'].astype(int) == int(train_no)]
    if len(sub) == 0:
        return None
    return sub.iloc[0].to_dict()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Master Cascading Delay Pipeline Simulation")
    parser.add_argument('--weather', default='Clear', choices=['Clear', 'Fog', 'Heavy_Rain', 'Thunderstorm', 'Snow'])
    parser.add_argument('--congestion', default='Low', choices=['None', 'Low', 'High'])
    parser.add_argument('--tsr', default='Minor', choices=['None', 'Minor', 'Major'])
    parser.add_argument('--headway', type=float, default=8.0)
    parser.add_argument('--platform_margin', type=float, default=5.0)
    parser.add_argument('--crossing_margin', type=float, default=5.0)
    parser.add_argument('--duty_limit', type=float, default=600.0)
    parser.add_argument('--output', default='Train-Data/FinalOrchestraOutput.csv')
    args = parser.parse_args()

    run_cascade_simulation(
        weather=args.weather,
        priority_congestion=args.congestion,
        tsr_level=args.tsr,
        headway_mins=args.headway,
        clearance_margin_mins=args.platform_margin,
        crossing_clearance_mins=args.crossing_margin,
        duty_limit_mins=args.duty_limit,
        output_master_csv=args.output
    )
