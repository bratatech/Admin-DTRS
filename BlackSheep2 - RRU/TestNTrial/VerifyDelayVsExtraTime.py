import os
import pandas as pd
import numpy as np

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKSHEEP_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) if os.path.exists(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) else os.getcwd()

def get_path(rel_path):
    if os.path.exists(rel_path):
        return rel_path
    candidate = os.path.join(BLACKSHEEP_DIR, rel_path)
    if os.path.exists(candidate):
        return candidate
    return rel_path

# Load datasets
base = pd.read_csv(get_path('Train-Data/EACalculation.csv'))
pred = pd.read_csv(get_path('Train-Data/PnCOutput.csv'))

# Merge
merged = pd.merge(
    pred,
    base[['train_no', 'duration_mins', 'total_halt_duration', 'total_distance_km', 'ideal_running_mins', 'extra_time_mins', 'net_slack_mins']],
    on='train_no',
    how='inner'
)

print("=" * 85)
print("TRAIN DELAY VS. ALLOTTED EXTRA TIME & ON-TIME / LATE VERIFICATION REPORT")
print("=" * 85)

total_records = len(merged)
print(f"Total evaluated train-scenario permutations: {total_records:,} (from {len(base):,} unique trains)")

# 1. Verification from Train-Data/PnCOutput.csv (5% timetable slack already applied)
strict_on_time = (merged['predicted_delay_mins'] == 0).sum()
ir_punctual = (merged['predicted_delay_mins'] <= 15).sum()
late_strict = (merged['predicted_delay_mins'] > 0).sum()
late_ir = (merged['predicted_delay_mins'] > 15).sum()

print("\n--- 1. DIRECT ARRIVAL STATUS (based on predicted_delay_mins with 5% timetable buffer) ---")
print(f"  Strictly ON TIME (Delay = 0 min)       : {strict_on_time:,} ({strict_on_time / total_records * 100:.2f}%)")
print(f"  Punctual by IR standard (Delay <= 15 min): {ir_punctual:,} ({ir_punctual / total_records * 100:.2f}%)")
print(f"  LATE (> 0 min delay)                   : {late_strict:,} ({late_strict / total_records * 100:.2f}%)")
print(f"  LATE (> 15 min delay, IR unpunctual)   : {late_ir:,} ({late_ir / total_records * 100:.2f}%)")
print(f"  Average predicted arrival delay        : {merged['predicted_delay_mins'].mean():.2f} mins")
print(f"  Max predicted arrival delay            : {merged['predicted_delay_mins'].max()} mins")

# 2. Verification against Allotted Extra Time (Slack) in Schedule
# In Train-Data/EACalculation.csv:
# extra_time_mins = duration_mins - ideal_running_mins
# net_slack_mins  = duration_mins - (ideal_running_mins + total_halt_duration)
# Let's compare the predicted delay against the train's actual allotted net slack:
# If predicted_delay <= net_slack, the train's operational cushion can absorb the delay.
# If predicted_delay > net_slack, the train will arrive late by (predicted_delay - net_slack).

can_absorb_delay = merged['predicted_delay_mins'] <= merged['net_slack_mins']
slack_on_time = can_absorb_delay.sum()
slack_late = (~can_absorb_delay).sum()

print("\n--- 2. BUFFER ABSORPTION VERIFICATION (Delay vs Allotted Net Slack) ---")
print("Allotted Net Slack = duration_mins - (ideal_running_time @ 90% speed + scheduled_halts)")
print(f"  Average Allotted Net Slack across fleet : {merged['net_slack_mins'].mean():.2f} mins")
print(f"  Average Gross Extra Time across fleet   : {merged['extra_time_mins'].mean():.2f} mins")
print(f"  Permutations where Allotted Net Slack >= Predicted Delay: {slack_on_time:,} ({slack_on_time / total_records * 100:.2f}%) -> Can make up delay and reach ON TIME")
print(f"  Permutations where Predicted Delay > Allotted Net Slack : {slack_late:,} ({slack_late / total_records * 100:.2f}%) -> Schedule cannot absorb delay, reaches LATE")

# 3. Breakdown by Train Tier
print("\n--- 3. DETAILED PERFORMANCE BY TRAIN TIER ---")
tiers = ['T1_PREMIUM', 'T2_SUPERFAST', 'T3_EXPRESS']
tier_stats = []
for tier in tiers:
    t_df = merged[merged['train_tier'] == tier]
    n = len(t_df)
    t_on_time = (t_df['predicted_delay_mins'] <= 15).sum()
    t_late = (t_df['predicted_delay_mins'] > 15).sum()
    t_absorbed = (t_df['predicted_delay_mins'] <= t_df['net_slack_mins']).sum()
    tier_stats.append({
        'Tier': tier,
        'Trains': len(t_df['train_no'].unique()),
        'Permutations': n,
        'Avg Net Slack (m)': f"{t_df['net_slack_mins'].mean():.1f}",
        'Avg Delay (m)': f"{t_df['predicted_delay_mins'].mean():.1f}",
        'IR On-Time % (<=15m)': f"{t_on_time / n * 100:.1f}%",
        'Late % (>15m)': f"{t_late / n * 100:.1f}%",
        'Slack Absorbed %': f"{t_absorbed / n * 100:.1f}%"
    })
print(pd.DataFrame(tier_stats).to_string(index=False))

# 4. Breakdown by Operating Conditions (Weather, Congestion, TSR)
print("\n--- 4. ON-TIME VS LATE RATE BY SCENARIO / CONDITIONS ---")
print("\n[By Weather]:")
weather_grp = merged.groupby('weather').agg(
    avg_delay=('predicted_delay_mins', 'mean'),
    pct_on_time=('predicted_delay_mins', lambda x: (x <= 15).mean() * 100),
    pct_late=('predicted_delay_mins', lambda x: (x > 15).mean() * 100)
).reset_index()
print(weather_grp.to_string(index=False))

print("\n[By Priority / Congestion Level]:")
cong_grp = merged.groupby('priority_congestion').agg(
    avg_delay=('predicted_delay_mins', 'mean'),
    pct_on_time=('predicted_delay_mins', lambda x: (x <= 15).mean() * 100),
    pct_late=('predicted_delay_mins', lambda x: (x > 15).mean() * 100)
).reset_index()
print(cong_grp.to_string(index=False))

print("\n[By TSR Speed Restriction Level]:")
tsr_grp = merged.groupby('tsr_level').agg(
    avg_delay=('predicted_delay_mins', 'mean'),
    pct_on_time=('predicted_delay_mins', lambda x: (x <= 15).mean() * 100),
    pct_late=('predicted_delay_mins', lambda x: (x > 15).mean() * 100)
).reset_index()
print(tsr_grp.to_string(index=False))

# 5. Representative Benchmark Trains
print("\n--- 5. SAMPLE FAMOUS TRAINS COMPARISON ---")
sample_ids = [12001, 12002, 12951, 12952, 12626, 12625]
samples = merged[merged['train_no'].astype(int).isin(sample_ids)]

for tno in sample_ids:
    t_sub = samples[samples['train_no'].astype(int) == tno]
    if len(t_sub) == 0: continue
    row = t_sub.iloc[0]
    slack = row['net_slack_mins']
    delays = t_sub['predicted_delay_mins']
    worst_case = t_sub.loc[t_sub['predicted_delay_mins'].idxmax()]
    best_case = t_sub.loc[t_sub['predicted_delay_mins'].idxmin()]
    
    print(f"\nTrain {row['train_no']} - {row['train_name']} ({row['train_tier']}):")
    print(f"  Duration: {row['duration_mins']} mins | Distance: {row['total_distance_km']} km | Halts: {row['total_halt_duration']} mins")
    print(f"  Allotted Extra Time (Gross): {row['extra_time_mins']} mins | Allotted Net Slack: {row['net_slack_mins']} mins")
    print(f"  Delay Range: {delays.min()} - {delays.max()} mins (Avg: {delays.mean():.1f} mins)")
    print(f"  Can Net Slack absorb ALL scenarios? {'YES' if slack >= delays.max() else 'NO'}")
    print(f"  Best Case ({best_case['weather']}, Congestion: {best_case['priority_congestion']}, TSR: {best_case['tsr_level']}): "
          f"Delay = {best_case['predicted_delay_mins']}m -> {'ON TIME' if best_case['predicted_delay_mins'] <= 15 else 'LATE'}")
    print(f"  Worst Case ({worst_case['weather']}, Congestion: {worst_case['priority_congestion']}, TSR: {worst_case['tsr_level']}): "
          f"Delay = {worst_case['predicted_delay_mins']}m -> {'ON TIME' if worst_case['predicted_delay_mins'] <= 15 else 'LATE by ' + str(worst_case['predicted_delay_mins']) + 'm'}")
print("=" * 85)
