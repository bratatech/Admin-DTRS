"""
05_cascade_block_headway.py
Module 1: Block Section Headway Queuing & Signaling Constraints

Simulates secondary knock-on delays when a leading train experiences primary delays,
forcing trailing trains sharing the same corridor block to decelerate or halt to
maintain safe headway (separation).
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

def compute_block_headway_delays(weather='Clear', priority_congestion='Low', tsr_level='Minor', headway_mins=8.0):
    print("=" * 80)
    print("MODULE 05: BLOCK SECTION HEADWAY QUEUING SIMULATION")
    print(f"Condition: Weather={weather}, Congestion={priority_congestion}, TSR={tsr_level}, Safety Headway={headway_mins} mins")
    print("=" * 80)

    # 1. Load data
    print("Loading schedules and base delay predictions...")
    sched_df = pd.read_csv('Train-Data/TrainSchedules_DND.csv')
    base_df = pd.read_csv('Train-Data/EACalculation.csv')
    pred_df = pd.read_csv('Train-Data/PnCOutput.csv', keep_default_na=False)

    # Filter initial primary delay for the specified condition
    init_delays = pred_df[
        (pred_df['weather'] == weather) &
        (pred_df['priority_congestion'] == priority_congestion) &
        (pred_df['tsr_level'] == tsr_level)
    ][['train_no', 'predicted_delay_mins']].rename(columns={'predicted_delay_mins': 'primary_delay_mins'})

    # Load TRETA route numbers mapping
    treta_df = pd.read_csv('Train-Data/TRETARoutes.csv')
    treta_map = dict(zip(treta_df['train_no'], treta_df['treta_route_number']))

    # Merge primary delays with schedule
    sched_df = sched_df.sort_values(['train_no', 'sr_no']).reset_index(drop=True)
    sched_df['dep_mins'] = [parse_time_to_mins(d, t) for d, t in zip(sched_df['day'], sched_df['dep_time'])]
    sched_df['arr_mins'] = [parse_time_to_mins(d, t) for d, t in zip(sched_df['day'], sched_df['arr_time'])]
    sched_df['treta_route_number'] = sched_df['train_no'].map(treta_map)

    # For origin station, departure is dep_mins; for destination station, dep_mins is NaN
    # Construct TRETAroutenumber route zone elements: from current station to next station
    sched_df['next_station'] = sched_df.groupby('train_no')['station_code'].shift(-1)
    sched_df['next_train_no'] = sched_df.groupby('train_no')['train_no'].shift(-1)

    # Valid block zone departures (where next_station belongs to the same train)
    blocks = sched_df[sched_df['next_station'].notna() & sched_df['dep_mins'].notna()].copy()
    blocks = blocks.merge(init_delays, on='train_no', how='left')
    blocks['primary_delay_mins'] = blocks['primary_delay_mins'].fillna(0)

    # Actual departure time including primary delay
    blocks['actual_dep_mins'] = blocks['dep_mins'] + blocks['primary_delay_mins']
    blocks['treta_zone_id'] = blocks['station_code'] + "->" + blocks['next_station']

    # 2. Sort by TRETA zone element and scheduled departure time to identify trailing trains
    blocks = blocks.sort_values(['treta_zone_id', 'dep_mins']).reset_index(drop=True)

    # 3. Vectorized identification of consecutive trains on the same TRETAroutenumber zone element
    blocks['prev_zone_id'] = blocks['treta_zone_id'].shift(1)
    blocks['prev_train_no'] = blocks['train_no'].shift(1)
    blocks['prev_actual_dep'] = blocks['actual_dep_mins'].shift(1)
    blocks['prev_primary_delay'] = blocks['primary_delay_mins'].shift(1)
    blocks['prev_dep_mins'] = blocks['dep_mins'].shift(1)

    same_zone = (blocks['treta_zone_id'] == blocks['prev_zone_id']) & (blocks['train_no'] != blocks['prev_train_no'])

    # Track Occupancy Rule:
    # When ANY train in front is delayed and holds the zone (prev_actual_dep + headway > scheduled dep):
    # The trailing train directly inherits the blocking train's delay (delay_behind = delay_ahead)
    is_blocked = same_zone & (blocks['prev_actual_dep'] + headway_mins > blocks['dep_mins'])
    
    # If the train blocking the route is delayed by X mins, the train behind gets late by X mins
    blocks['headway_delay_mins'] = np.where(
        is_blocked,
        np.maximum(blocks['prev_primary_delay'], blocks['prev_actual_dep'] + headway_mins - blocks['dep_mins']),
        0.0
    ).round(1)

    # Signal aspect caution drag when queuing behind occupied zone
    blocks['signal_aspect_delay_mins'] = np.where(blocks['headway_delay_mins'] > 0, 3.0, 0.0)
    blocks['total_section_headway_delay'] = blocks['headway_delay_mins'] + blocks['signal_aspect_delay_mins']

    # 4. Aggregate per train
    train_headway_summary = blocks.groupby('train_no').agg(
        sections_with_headway_conflict=('headway_delay_mins', lambda x: (x > 0).sum()),
        max_single_headway_delay=('headway_delay_mins', 'max'),
        total_headway_delay_mins=('total_section_headway_delay', 'sum')
    ).reset_index()

    train_headway_summary['total_headway_delay_mins'] = train_headway_summary['total_headway_delay_mins'].clip(upper=120.0).round(1)

    # Merge with base train info
    result_df = base_df[['train_no', 'train_name', 'source_station', 'destination_station', 'train_tier']].merge(

        init_delays, on='train_no', how='left'
    ).merge(
        train_headway_summary, on='train_no', how='left'
    )
    result_df['sections_with_headway_conflict'] = result_df['sections_with_headway_conflict'].fillna(0).astype(int)
    result_df['max_single_headway_delay'] = result_df['max_single_headway_delay'].fillna(0).round(1)
    result_df['total_headway_delay_mins'] = result_df['total_headway_delay_mins'].fillna(0).round(1)
    result_df['cumulative_delay_after_m05'] = result_df['primary_delay_mins'] + result_df['total_headway_delay_mins']

    # 5. Save Output
    output_filename = 'Train-Data/HeadwayDelay.csv'
    result_df.to_csv(output_filename, index=False)
    print(f"Successfully generated {output_filename} ({len(result_df):,} trains)")

    # Print summary statistics
    affected = result_df[result_df['total_headway_delay_mins'] > 0]
    print(f"\n--- MODULE 05 AUDIT SUMMARY ---")
    print(f"Total Trains Evaluated               : {len(result_df):,}")
    print(f"Trains Incurring Headway Delay        : {len(affected):,} ({len(affected)/len(result_df)*100:.2f}%)")
    print(f"Average Headway Delay (Across Fleet) : {result_df['total_headway_delay_mins'].mean():.2f} mins")
    print(f"Average Headway Delay (Affected Only): {affected['total_headway_delay_mins'].mean():.2f} mins")
    print(f"Max Headway Delay Incurred           : {result_df['total_headway_delay_mins'].max()} mins")
    print("=" * 80 + "\n")
    return result_df

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Simulate Block Section Headway Queuing Delays")
    parser.add_argument('--weather', default='Clear', choices=['Clear', 'Fog', 'Heavy_Rain', 'Thunderstorm', 'Snow'])
    parser.add_argument('--congestion', default='Low', choices=['None', 'Low', 'High'])
    parser.add_argument('--tsr', default='Minor', choices=['None', 'Minor', 'Major'])
    parser.add_argument('--headway', type=float, default=8.0, help="Safety headway in minutes (default: 8)")
    args = parser.parse_args()

    compute_block_headway_delays(
        weather=args.weather,
        priority_congestion=args.congestion,
        tsr_level=args.tsr,
        headway_mins=args.headway
    )
