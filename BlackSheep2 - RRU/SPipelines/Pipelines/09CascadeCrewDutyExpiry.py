"""
09_cascade_crew_duty_expiry.py
Module 5: Crew & Loco Pilot Duty Expiry (HOER Relief Detention)

Simulates operational halts caused by running staff (Loco Pilots & Train Managers)
exceeding statutory continuous duty limits under Indian Railways Hours of Employment
and Regulation (HOER) rules (max 10 hours continuous duty).
When trip delays cause active duty to cross the threshold, the train is halted at the
nearest junction/lobby awaiting an emergency relief crew.
"""

import sys
import argparse
import pandas as pd
import numpy as np

def compute_crew_duty_expiry(input_csv='Train-Data/SingleTrackDelay.csv', duty_limit_mins=600.0):
    print("=" * 80)
    print("MODULE 09: CREW & LOCO PILOT DUTY EXPIRY SIMULATION")
    print(f"Input: {input_csv} | Statutory Duty Limit: {duty_limit_mins} mins ({duty_limit_mins/60:.1f} hrs)")
    print("=" * 80)

    # 1. Load data
    print("Loading previous stage cumulative delays and train durations...")
    prev_stage = pd.read_csv(input_csv)
    base_df = pd.read_csv('Train-Data/EACalculation.csv')

    merged = prev_stage.merge(
        base_df[['train_no', 'duration_mins', 'total_distance_km', 'extra_time_mins', 'net_slack_mins']],
        on='train_no',
        how='left'
    )

    # Active duty duration
    total_active_duty = merged['duration_mins'] + merged['cumulative_delay_after_m08']
    
    # In Indian Railways, long distance trains (>8 hours) have scheduled crew changes every 6-8 hours.
    # An emergency crew expiry occurs when:
    # A) Total active duty exceeds 10 hours and cumulative cascading delay >= 45 minutes (unplanned delay)
    # B) Or severe delay causes crew to time out between scheduled booking lobbies.
    is_delayed_significantly = merged['cumulative_delay_after_m08'] >= 45.0
    duty_exceeded = (total_active_duty > duty_limit_mins) & is_delayed_significantly

    # Simulating realistic lobby relief penalty:
    # Mobilizing a standby loco pilot and guard from running room / crew lobby takes 45 to 80 minutes.
    np.random.seed(42)
    relief_penalties = np.where(
        duty_exceeded,
        np.random.uniform(45.0, 75.0, size=len(merged)),
        0.0
    ).round(1)

    merged['duty_limit_exceeded'] = duty_exceeded
    merged['crew_relief_delay_mins'] = relief_penalties

    # Calculate total cascading delay components
    merged['total_cascading_delay_mins'] = (
        merged['total_headway_delay_mins'] +
        merged['total_junction_delay_mins'] +
        merged['turnaround_delay_mins'] +
        merged['total_crossing_delay_mins'] +
        merged['crew_relief_delay_mins']
    ).round(1)

    merged['gross_delay_mins'] = (
        merged['primary_delay_mins'] + merged['total_cascading_delay_mins']
    ).round(1)

    # Cumulative delay after all 5 cascading modules
    merged['cumulative_delay_after_m09'] = merged['gross_delay_mins']

    # 2. Save Output
    output_filename = 'Train-Data/TiredCrewDelay.csv'
    merged.to_csv(output_filename, index=False)
    print(f"Successfully generated {output_filename} ({len(merged):,} trains)")

    affected = merged[merged['duty_limit_exceeded']]
    print(f"\n--- MODULE 09 AUDIT SUMMARY ---")
    print(f"Total Trains Evaluated               : {len(merged):,}")
    print(f"Trains Incurring Crew Expiry Halts   : {len(affected):,} ({len(affected)/len(merged)*100:.2f}%)")
    print(f"Average Crew Relief Delay (Fleet)    : {merged['crew_relief_delay_mins'].mean():.2f} mins")
    print(f"Average Relief Wait Time (Affected)  : {affected['crew_relief_delay_mins'].mean():.2f} mins")
    print(f"Max Crew Relief Delay Incurred       : {merged['crew_relief_delay_mins'].max()} mins")
    print("=" * 80 + "\n")
    return merged

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Simulate Crew & Loco Pilot Duty Expiry")
    parser.add_argument('--input', default='Train-Data/SingleTrackDelay.csv', help="Input CSV from previous stage")
    parser.add_argument('--duty_limit', type=float, default=600.0, help="Statutory duty limit in minutes (default: 600)")
    args = parser.parse_args()

    compute_crew_duty_expiry(input_csv=args.input, duty_limit_mins=args.duty_limit)
