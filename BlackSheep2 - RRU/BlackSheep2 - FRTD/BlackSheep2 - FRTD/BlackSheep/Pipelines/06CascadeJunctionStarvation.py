"""
06_cascade_junction_starvation.py
Module 2: Junction & Platform Starvation (Outer Signal Detention)

Simulates platform occupancy conflicts at busy railway junctions and terminals.
When delayed trains occupy platforms beyond their scheduled departures, incoming trains
are held at outer home signals until a platform/reception line is cleared.
"""

import sys
import argparse
import pandas as pd
import numpy as np
import heapq

def parse_time_to_mins(day, time_str):
    if pd.isna(time_str) or str(time_str).strip() in ['SRC', 'DSTN', '', 'nan']:
        return np.nan
    try:
        parts = str(time_str).strip().split(':')
        return (int(day) - 1) * 1440 + int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return np.nan

def parse_halt_to_mins(halt_str):
    if pd.isna(halt_str) or str(halt_str).strip() in ['SRC', 'DSTN', '', 'nan']:
        return 5.0 # default dwell
    s = str(halt_str).strip()
    if 'Hr' in s:
        try:
            parts = s.split(':')
            return int(parts[0]) * 60 + int(parts[1].replace('Hr', '').strip())
        except:
            return 10.0
    elif 'Min' in s:
        try:
            return float(s.replace('Min', '').strip())
        except:
            return 5.0
    return 5.0

def compute_junction_starvation_delays(input_csv='Train-Data/HeadwayDelay.csv', clearance_margin_mins=5.0):
    print("=" * 80)
    print("MODULE 06: JUNCTION & PLATFORM STARVATION SIMULATION")
    print(f"Input: {input_csv} | Platform Route Clearance Margin: {clearance_margin_mins} mins")
    print("=" * 80)

    # 1. Load data
    print("Loading schedules and previous stage delays...")
    prev_stage = pd.read_csv(input_csv)
    sched_df = pd.read_csv('Train-Data/TrainSchedules_DND.csv')

    # Map current accumulated delay (primary + headway)
    delay_map = dict(zip(prev_stage['train_no'], prev_stage['cumulative_delay_after_m05']))

    sched_df['cum_delay'] = sched_df['train_no'].map(delay_map).fillna(0)
    sched_df['arr_mins'] = [parse_time_to_mins(d, t) for d, t in zip(sched_df['day'], sched_df['arr_time'])]
    sched_df['dep_mins'] = [parse_time_to_mins(d, t) for d, t in zip(sched_df['day'], sched_df['dep_time'])]
    sched_df['dwell_mins'] = [parse_halt_to_mins(h) for h in sched_df['halt_time']]

    # Filter valid arrivals (intermediate halts and destination stations)
    halts = sched_df[sched_df['arr_mins'].notna()].copy()
    halts['actual_arr_mins'] = halts['arr_mins'] + halts['cum_delay']
    halts['platform_release_mins'] = halts['actual_arr_mins'] + halts['dwell_mins'] + clearance_margin_mins

    # 2. Determine platform capacity per station based on traffic density
    station_counts = halts['station_code'].value_counts()
    def get_platform_capacity(n_calls):
        if n_calls >= 400: return 12
        elif n_calls >= 200: return 8
        elif n_calls >= 100: return 5
        elif n_calls >= 40: return 3
        else: return 2

    capacity_map = {stn: get_platform_capacity(cnt) for stn, cnt in station_counts.items()}

    # 3. Simulate queueing at major junctions (filter to active stations with >= 40 calls for efficiency)
    busy_stations = {stn for stn, cnt in station_counts.items() if cnt >= 40}
    busy_halts = halts[halts['station_code'].isin(busy_stations)].sort_values(['station_code', 'actual_arr_mins'])

    print(f"Simulating platform occupancy queues across {len(busy_stations):,} active railway junctions...")

    # Fast event-driven queue per station using min-heap of release times
    junction_delays = []
    
    for stn, grp in busy_halts.groupby('station_code'):
        cap = capacity_map[stn]
        # Heap stores platform departure/release times
        active_platforms = []
        
        for _, row in grp.iterrows():
            arr_t = row['actual_arr_mins']
            dwell = row['dwell_mins'] + clearance_margin_mins
            
            # Remove all platforms that freed up before this train arrives
            while active_platforms and active_platforms[0] <= arr_t:
                heapq.heappop(active_platforms)
            
            starvation_delay = 0.0
            if len(active_platforms) >= cap:
                # All platforms are occupied! Train must wait at outer home signal
                earliest_free_time = heapq.heappop(active_platforms)
                starvation_delay = max(0.0, earliest_free_time - arr_t)
                actual_berth_time = earliest_free_time
                release_t = actual_berth_time + dwell
                heapq.heappush(active_platforms, release_t)
            else:
                # Platform available immediately
                release_t = arr_t + dwell
                heapq.heappush(active_platforms, release_t)
            
            if starvation_delay > 0:
                junction_delays.append({
                    'train_no': row['train_no'],
                    'station_code': stn,
                    'outer_signal_delay_mins': round(starvation_delay, 1)
                })

    delays_df = pd.DataFrame(junction_delays)
    if len(delays_df) > 0:
        summary_delays = delays_df.groupby('train_no').agg(
            junctions_starved=('outer_signal_delay_mins', lambda x: (x > 0).sum()),
            max_junction_delay=('outer_signal_delay_mins', 'max'),
            total_junction_delay_mins=('outer_signal_delay_mins', 'sum')
        ).reset_index()
        # Cap realistic total junction delay per train (max 45 mins)
        summary_delays['total_junction_delay_mins'] = summary_delays['total_junction_delay_mins'].clip(upper=45.0).round(1)
    else:
        summary_delays = pd.DataFrame(columns=['train_no', 'junctions_starved', 'max_junction_delay', 'total_junction_delay_mins'])

    # 4. Merge with previous stage dataset
    result_df = prev_stage.merge(summary_delays, on='train_no', how='left')
    result_df['junctions_starved'] = result_df['junctions_starved'].fillna(0).astype(int)
    result_df['max_junction_delay'] = result_df['max_junction_delay'].fillna(0).round(1)
    result_df['total_junction_delay_mins'] = result_df['total_junction_delay_mins'].fillna(0).round(1)
    result_df['cumulative_delay_after_m06'] = (
        result_df['cumulative_delay_after_m05'] + result_df['total_junction_delay_mins']
    ).round(1)

    # 5. Save Output
    output_filename = 'Train-Data/PlatformAllocDelay.csv'
    result_df.to_csv(output_filename, index=False)
    print(f"Successfully generated {output_filename} ({len(result_df):,} trains)")

    affected = result_df[result_df['total_junction_delay_mins'] > 0]
    print(f"\n--- MODULE 06 AUDIT SUMMARY ---")
    print(f"Total Trains Evaluated               : {len(result_df):,}")
    print(f"Trains Detained at Outer Signals      : {len(affected):,} ({len(affected)/len(result_df)*100:.2f}%)")
    print(f"Average Junction Delay (Across Fleet): {result_df['total_junction_delay_mins'].mean():.2f} mins")
    print(f"Average Junction Delay (Detained)    : {affected['total_junction_delay_mins'].mean():.2f} mins")
    print(f"Max Junction Starvation Delay        : {result_df['total_junction_delay_mins'].max()} mins")
    print("=" * 80 + "\n")
    return result_df

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Simulate Junction & Platform Starvation Delays")
    parser.add_argument('--input', default='Train-Data/HeadwayDelay.csv', help="Input CSV from previous stage")
    parser.add_argument('--margin', type=float, default=5.0, help="Platform clearance margin in minutes")
    args = parser.parse_args()

    compute_junction_starvation_delays(input_csv=args.input, clearance_margin_mins=args.margin)
