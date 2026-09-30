"""
08_cascade_crossing_conflicts.py
Module 4: Single-Track / Crossing Conflicts (Opposing Movement Detention)

Simulates bidirectional track conflicts on single-line sections.
When opposing trains (Up vs Down) converge on a single-track block between two stations,
the subordinate train (lower tier priority) must be looped at a crossing station
until the opposing higher-priority train clears the single line.
"""

import sys
import argparse
import pandas as pd
import numpy as np

def parse_time_to_mins(day, time_str):
    if pd.isna(time_str) or str(time_str).strip() in ['SRC', 'DSTN', '', 'nan']:
        return np.nan
    try:
        parts = str(time_str).strip().split(':')
        return (int(day) - 1) * 1440 + int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return np.nan

def compute_crossing_conflicts(input_csv='Train-Data/ServicingDelay.csv', clearance_mins=5.0):
    print("=" * 80)
    print("MODULE 08: SINGLE-TRACK / CROSSING CONFLICTS SIMULATION (VECTORIZED)")
    print(f"Input: {input_csv} | Block Clearance & Points Setting Buffer: {clearance_mins} mins")
    print("=" * 80)

    # 1. Load data
    print("Loading schedules and previous stage delays...")
    prev_stage = pd.read_csv(input_csv)
    sched_df = pd.read_csv('Train-Data/TrainSchedules_DND.csv')
    base_df = pd.read_csv('Train-Data/EACalculation.csv')

    delay_map = dict(zip(prev_stage['train_no'], prev_stage['cumulative_delay_after_m07']))
    tier_map = dict(zip(base_df['train_no'], base_df['train_tier']))

    sched_sorted = sched_df.sort_values(['train_no', 'sr_no']).reset_index(drop=True)
    sched_sorted['cum_delay'] = sched_sorted['train_no'].map(delay_map).fillna(0)
    sched_sorted['train_tier'] = sched_sorted['train_no'].map(tier_map).fillna('T3_EXPRESS')

    # Timings
    sched_sorted['dep_mins'] = [parse_time_to_mins(d, t) for d, t in zip(sched_sorted['day'], sched_sorted['dep_time'])]
    sched_sorted['arr_mins'] = [parse_time_to_mins(d, t) for d, t in zip(sched_sorted['day'], sched_sorted['arr_time'])]

    sched_sorted['next_stn'] = sched_sorted.groupby('train_no')['station_code'].shift(-1)
    sched_sorted['next_arr_mins'] = sched_sorted.groupby('train_no')['arr_mins'].shift(-1)

    # Segments between consecutive stations
    segments = sched_sorted[sched_sorted['next_stn'].notna() & sched_sorted['dep_mins'].notna()].copy()
    segments['actual_dep'] = segments['dep_mins'] + segments['cum_delay']
    segments['actual_arr'] = segments['next_arr_mins'].fillna(segments['actual_dep'] + 20.0) + segments['cum_delay']

    # Undirected corridor key (A-B is same as B-A)
    segments['corridor'] = np.where(
        segments['station_code'] < segments['next_stn'],
        segments['station_code'] + "<->" + segments['next_stn'],
        segments['next_stn'] + "<->" + segments['station_code']
    )
    segments['direction'] = np.where(segments['station_code'] < segments['next_stn'], 'UP', 'DOWN')

    # Priority rank for crossing precedence
    TIER_RANK = {'T1_PREMIUM': 3, 'T2_SUPERFAST': 2, 'T3_EXPRESS': 1}
    segments['rank'] = segments['train_tier'].map(TIER_RANK).fillna(1)

    up = segments[segments['direction'] == 'UP'][['corridor', 'train_no', 'rank', 'actual_dep', 'actual_arr']]
    down = segments[segments['direction'] == 'DOWN'][['corridor', 'train_no', 'rank', 'actual_dep', 'actual_arr']]

    print("Merging bidirectional corridor movements...")
    pairs = pd.merge(up, down, on='corridor', suffixes=('_u', '_d'))

    # Overlapping section occupancy
    conflicts = pairs[
        (pairs['actual_arr_d'] >= pairs['actual_dep_u']) &
        (pairs['actual_dep_d'] <= pairs['actual_arr_u'])
    ].copy()

    print(f"Detected {len(conflicts):,} simultaneous opposing occupancy conflicts.")

    # Vectorized priority precedence resolution:
    # If rank_u > rank_d: down waits for up
    # If rank_d > rank_u: up waits for down
    # If equal: earlier entrant gets precedence
    cond_down_waits = (conflicts['rank_u'] > conflicts['rank_d']) | (
        (conflicts['rank_u'] == conflicts['rank_d']) & (conflicts['actual_dep_u'] <= conflicts['actual_dep_d'])
    )

    # Zone traversal time across the specified single-track section
    conflicts['zone_traversal_u'] = np.maximum(5.0, conflicts['actual_arr_u'] - conflicts['actual_dep_u'])
    conflicts['zone_traversal_d'] = np.maximum(5.0, conflicts['actual_arr_d'] - conflicts['actual_dep_d'])

    # Single-Track Opposing Conflict Delay Rule:
    # Delay caused to the train that was supposed to cross but couldn't =
    # (Opposing train's accumulated delay) + (Time taken by opposing train to cross the specified zone) + clearance
    conflicts['down_detention'] = np.where(
        cond_down_waits,
        np.maximum(0, conflicts['actual_arr_u'] + clearance_mins - conflicts['actual_dep_d']).clip(upper=60.0),
        0.0
    )
    conflicts['up_detention'] = np.where(
        ~cond_down_waits,
        np.maximum(0, conflicts['actual_arr_d'] + clearance_mins - conflicts['actual_dep_u']).clip(upper=60.0),
        0.0
    )


    # Collect records
    down_delayed = conflicts[conflicts['down_detention'] > 0][['train_no_d', 'down_detention']].rename(
        columns={'train_no_d': 'train_no', 'down_detention': 'detention'}
    )
    up_delayed = conflicts[conflicts['up_detention'] > 0][['train_no_u', 'up_detention']].rename(
        columns={'train_no_u': 'train_no', 'up_detention': 'detention'}
    )

    all_delayed = pd.concat([down_delayed, up_delayed], ignore_index=True)

    if len(all_delayed) > 0:
        c_summary = all_delayed.groupby('train_no').agg(
            crossing_conflicts_count=('detention', 'count'),
            max_single_crossing_delay=('detention', 'max'),
            total_crossing_delay_mins=('detention', 'sum')
        ).reset_index()
        # Cap realistic crossing delay (max 45 mins per train)
        c_summary['total_crossing_delay_mins'] = c_summary['total_crossing_delay_mins'].clip(upper=45.0).round(1)
        c_summary['max_single_crossing_delay'] = c_summary['max_single_crossing_delay'].round(1)
    else:
        c_summary = pd.DataFrame(columns=['train_no', 'crossing_conflicts_count', 'max_single_crossing_delay', 'total_crossing_delay_mins'])

    # 2. Merge with previous stage
    result_df = prev_stage.merge(c_summary, on='train_no', how='left')
    result_df['crossing_conflicts_count'] = result_df['crossing_conflicts_count'].fillna(0).astype(int)
    result_df['max_single_crossing_delay'] = result_df['max_single_crossing_delay'].fillna(0).round(1)
    result_df['total_crossing_delay_mins'] = result_df['total_crossing_delay_mins'].fillna(0).round(1)
    result_df['cumulative_delay_after_m08'] = (
        result_df['cumulative_delay_after_m07'] + result_df['total_crossing_delay_mins']
    ).round(1)

    # 3. Save Output
    output_filename = 'Train-Data/SingleTrackDelay.csv'
    result_df.to_csv(output_filename, index=False)
    print(f"Successfully generated {output_filename} ({len(result_df):,} trains)")

    affected = result_df[result_df['total_crossing_delay_mins'] > 0]
    print(f"\n--- MODULE 08 AUDIT SUMMARY ---")
    print(f"Total Trains Evaluated               : {len(result_df):,}")
    print(f"Trains Detained at Crossing Loops    : {len(affected):,} ({len(affected)/len(result_df)*100:.2f}%)")
    print(f"Average Crossing Delay (Fleet)       : {result_df['total_crossing_delay_mins'].mean():.2f} mins")
    print(f"Average Crossing Delay (Detained)    : {affected['total_crossing_delay_mins'].mean():.2f} mins")
    print(f"Max Crossing Delay Incurred          : {result_df['total_crossing_delay_mins'].max()} mins")
    print("=" * 80 + "\n")
    return result_df

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Simulate Single-Track Crossing Conflicts")
    parser.add_argument('--input', default='Train-Data/ServicingDelay.csv', help="Input CSV from previous stage")
    parser.add_argument('--clearance', type=float, default=5.0, help="Block clearance buffer in minutes")
    args = parser.parse_args()

    compute_crossing_conflicts(input_csv=args.input, clearance_mins=args.clearance)
