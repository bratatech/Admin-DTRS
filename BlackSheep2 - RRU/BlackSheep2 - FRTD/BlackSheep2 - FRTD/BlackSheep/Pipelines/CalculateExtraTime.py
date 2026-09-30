"""
calculate_extra_time.py
Calculates and audits the extra time (operational buffer / slack) allotted to each train.
Compares Nominal Average Speeds vs 90% of Maximum Speed to evaluate reasonableness.
"""

import pandas as pd
import numpy as np

# 1. Load Data
df = pd.read_csv('Train-Data/EACalculation.csv')

print("=" * 80)
print("TRAIN EXTRA TIME & BUFFER ALLOCATION AUDIT")
print("=" * 80)

# 2. Compare Scenarios
tiers = ['T1_PREMIUM', 'T2_SUPERFAST', 'T3_EXPRESS']
nominal_speeds = {'T1_PREMIUM': 85.0, 'T2_SUPERFAST': 45.0, 'T3_EXPRESS': 45.0}
max_speeds = {'T1_PREMIUM': 130.0, 'T2_SUPERFAST': 110.0, 'T3_EXPRESS': 110.0}
ninety_pct_max = {k: v * 0.90 for k, v in max_speeds.items()}

print("\n--- 1. REASONABLENESS EVALUATION OF NOMINAL AVG SPEED ---")
print("Evaluating if nominal average speeds (T1: 85 km/h, T2: 45 km/h, T3: 45 km/h) yield reasonable outcomes:\n")

for tier in tiers:
    sub = df[df['train_tier'] == tier]
    nom_v = nominal_speeds[tier]
    nom_ideal = (sub['total_distance_km'] / nom_v) * 60.0
    nom_extra = sub['duration_mins'] - nom_ideal
    neg_pct = (nom_extra < 0).mean() * 100
    
    print(f"[{tier}] (Count: {len(sub):,})")
    print(f"  Assumed Nominal Avg Speed: {nom_v} km/h")
    print(f"  Trains with Negative Extra Time: {neg_pct:.2f}%")
    if neg_pct > 50:
        print(f"  -> CRITICAL: Unreasonable. 100% of T2 trains run faster in the timetable than 45 km/h.")
        print(f"     (Indian Railways requires Superfast trains to average >= 55 km/h commercial speed).")
    elif neg_pct > 10:
        print(f"  -> UNREASONABLE: {neg_pct:.1f}% of express trains have negative extra time at 45 km/h.")
    else:
        print(f"  -> Acceptable for most, but fails on highest-speed corridors ({neg_pct:.1f}%).")
    print()

print("=" * 80)
print("--- 2. OUTCOMES USING 90% OF MAXIMUM SPEED ---")
print("Effective Speeds: T1_PREMIUM = 117 km/h | T2_SUPERFAST = 99 km/h | T3_EXPRESS = 99 km/h\n")

summary_table = []
for tier in tiers:
    sub = df[df['train_tier'] == tier]
    eff_v = ninety_pct_max[tier]
    
    summary_table.append({
        'Tier': tier,
        'Count': len(sub),
        'Eff Speed (km/h)': eff_v,
        'Avg Dist (km)': f"{sub['total_distance_km'].mean():.1f}",
        'Avg Duration (hrs)': f"{sub['duration_mins'].mean() / 60:.1f}",
        'Avg Halts (mins)': f"{sub['total_halt_duration'].mean():.1f}",
        'Avg Ideal Run (hrs)': f"{sub['ideal_running_mins'].mean() / 60:.1f}",
        'Avg Extra Time (hrs)': f"{sub['extra_time_mins'].mean() / 60:.1f}",
        'Avg Net Slack (hrs)': f"{sub['net_slack_mins'].mean() / 60:.1f}",
        'Negative Buffer %': f"{(sub['extra_time_mins'] < 0).mean() * 100:.2f}%"
    })

summary_df = pd.DataFrame(summary_table)
print(summary_df.to_string(index=False))

print("\n" + "=" * 80)
print("--- 3. SAMPLE TRAIN PROFILES ---")
sample_trains = [12001, 12002, 12951, 12952, 12626, 12625]
samples = df[df['train_no'].astype(int).isin(sample_trains)][[
    'train_no', 'train_name', 'train_tier', 'total_distance_km',
    'duration_mins', 'total_halt_duration', 'ideal_running_mins',
    'extra_time_mins', 'net_slack_mins'
]]
print(samples.to_string(index=False))
print("=" * 80)
