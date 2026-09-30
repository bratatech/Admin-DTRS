"""
07_cascade_turnaround_linkage.py
Module 3: Rake & Locomotive Turnaround Linkage

Simulates secondary delays caused by shared rolling stock (rakes).
When an inbound train arrives late at its terminal, its paired outbound service
cannot depart on time if the remaining layover is shorter than the mandatory
pit-line maintenance, rake cleaning, and inspection buffer.
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

def compute_turnaround_delays(input_csv='Train-Data/PlatformAllocDelay.csv'):
    print("=" * 80)
    print("MODULE 07: RAKE & LOCOMOTIVE TURNAROUND LINKAGE SIMULATION")
    print(f"Input: {input_csv}")
    print("=" * 80)

    # 1. Load data
    print("Loading schedules and previous stage delays...")
    prev_stage = pd.read_csv(input_csv)
    base_df = pd.read_csv('Train-Data/EACalculation.csv')
    sched_df = pd.read_csv('Train-Data/TrainSchedules_DND.csv')

    # Get origin departure and destination arrival for all trains
    sched_sorted = sched_df.sort_values(['train_no', 'sr_no'])
    
    # Origin departure
    origins = sched_sorted.groupby('train_no').first().reset_index()
    origins['origin_dep_mins'] = [parse_time_to_mins(d, t) for d, t in zip(origins['day'], origins['dep_time'])]

    # Destination arrival
    destinations = sched_sorted.groupby('train_no').last().reset_index()
    destinations['dest_arr_mins'] = [parse_time_to_mins(d, t) for d, t in zip(destinations['day'], destinations['arr_time'])]

    train_timings = base_df[['train_no', 'source_station', 'destination_station', 'train_tier']].merge(
        origins[['train_no', 'origin_dep_mins']], on='train_no', how='left'
    ).merge(
        destinations[['train_no', 'dest_arr_mins']], on='train_no', how='left'
    ).merge(
        prev_stage[['train_no', 'cumulative_delay_after_m06']], on='train_no', how='left'
    )
    train_timings['cumulative_delay_after_m06'] = train_timings['cumulative_delay_after_m06'].fillna(0)

    # Inbound actual arrival time at destination
    train_timings['actual_dest_arr_mins'] = train_timings['dest_arr_mins'] + train_timings['cumulative_delay_after_m06']

    # 2. Pair matching (paired reverse service: e.g., t+1 or t-1 with inverted endpoints)
    train_dict = {row['train_no']: row for _, row in train_timings.iterrows()}
    
    # Mandatory turnaround buffer by tier
    TURNAROUND_BUFFER = {
        'T1_PREMIUM': 60.0,   # Shatabdi / Vande Bharat / Rajdhani rapid platform turnaround
        'T2_SUPERFAST': 90.0, # Secondary examination, water filling, brake inspection
        'T3_EXPRESS': 120.0   # Full pit-line cleaning, linen loading, loco attachment
    }

    turnaround_records = []

    for t_no, t_row in train_timings.iterrows():
        t1 = int(t_row['train_no'])
        # Target candidate
        cand = t1 + 1 if t1 % 2 != 0 else t1 - 1
        
        turnaround_delay = 0.0
        paired_t = np.nan

        if cand in train_dict:
            r2 = train_dict[cand]
            # Check route symmetry (A->B and B->A)
            if t_row['source_station'] == r2['destination_station'] and t_row['destination_station'] == r2['source_station']:
                paired_t = cand
                # r2 is the inbound train arriving at the station where t1 originates
                inbound_actual_arr = r2['actual_dest_arr_mins']
                outbound_sched_dep = t_row['origin_dep_mins']
                
                req_buffer = TURNAROUND_BUFFER.get(t_row['train_tier'], 90.0)
                
                # If outbound departs within reasonable turnaround window (same day or next day cycle)
                # Normalize time delta within cyclical weekly schedule
                if pd.notna(inbound_actual_arr) and pd.notna(outbound_sched_dep):
                    time_diff = outbound_sched_dep - inbound_actual_arr
                    # If outbound was scheduled after inbound, or adjusted for 24h daily schedule
                    if time_diff < -720: # next day wrap
                        time_diff += 1440
                    
                    # If remaining layover is less than required maintenance buffer:
                    if time_diff < req_buffer and time_diff > -360:
                        turnaround_delay = max(0.0, req_buffer - time_diff)

        turnaround_records.append({
            'train_no': t1,
            'paired_train_no': paired_t,
            'turnaround_delay_mins': min(turnaround_delay, 120.0) # realistic cap 2 hours
        })

    turn_df = pd.DataFrame(turnaround_records)
    
    # 3. Merge with previous stage
    result_df = prev_stage.merge(turn_df, on='train_no', how='left')
    result_df['turnaround_delay_mins'] = result_df['turnaround_delay_mins'].fillna(0).round(1)
    result_df['cumulative_delay_after_m07'] = (
        result_df['cumulative_delay_after_m06'] + result_df['turnaround_delay_mins']
    ).round(1)

    # 4. Save Output
    output_filename = 'Train-Data/ServicingDelay.csv'
    result_df.to_csv(output_filename, index=False)
    print(f"Successfully generated {output_filename} ({len(result_df):,} trains)")

    affected = result_df[result_df['turnaround_delay_mins'] > 0]
    print(f"\n--- MODULE 07 AUDIT SUMMARY ---")
    print(f"Total Trains Evaluated               : {len(result_df):,}")
    print(f"Outbound Trains Delayed by Turnaround: {len(affected):,} ({len(affected)/len(result_df)*100:.2f}%)")
    print(f"Average Turnaround Delay (Fleet)     : {result_df['turnaround_delay_mins'].mean():.2f} mins")
    print(f"Average Turnaround Delay (Affected)  : {affected['turnaround_delay_mins'].mean():.2f} mins")
    print(f"Max Turnaround Delay Incurred        : {result_df['turnaround_delay_mins'].max()} mins")
    print("=" * 80 + "\n")
    return result_df

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Simulate Rake Turnaround Linkage Delays")
    parser.add_argument('--input', default='Train-Data/PlatformAllocDelay.csv', help="Input CSV from previous stage")
    args = parser.parse_args()

    compute_turnaround_delays(input_csv=args.input)
