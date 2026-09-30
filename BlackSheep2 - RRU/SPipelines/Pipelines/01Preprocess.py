import pandas as pd
import numpy as np
import re

# Load raw NTES CSVs
metadata_df = pd.read_csv('Train-Data/TrainsMetadata_DND.csv')
schedules_df = pd.read_csv('Train-Data/TrainSchedules_DND.csv')

# 1. Helper to parse travel_time ("40:45 Hrs." -> 2445 mins)
def parse_travel_time(time_str):
    if pd.isna(time_str): return 0
    match = re.search(r'(\d+):(\d+)', str(time_str))
    if match:
        hours, mins = map(int, match.groups())
        return hours * 60 + mins
    return 0

# 2. Helper to parse halt_time ("10 Min" or "01:10 Hr" -> mins)
def parse_halt_time(halt_str):
    if pd.isna(halt_str) or halt_str in ['SRC', 'DSTN']: return 0
    halt_str = str(halt_str).strip()
    if 'Hr' in halt_str:
        match = re.search(r'(\d+):(\d+)', halt_str)
        if match: return int(match.group(1)) * 60 + int(match.group(2))
    elif 'Min' in halt_str:
        match = re.search(r'(\d+)', halt_str)
        if match: return int(match.group(1))
    return 0

# Apply parsing
metadata_df['duration_mins'] = metadata_df['travel_time'].apply(parse_travel_time)
schedules_df['halt_mins'] = schedules_df['halt_time'].apply(parse_halt_time)

schedules_df['dist_km'] = pd.to_numeric(schedules_df['dist_km'], errors='coerce').fillna(0)

# 3. Aggregate Halt and Distance Metrics from schedules
schedule_summary = schedules_df.groupby('train_no').agg(
    total_halt_count=('sr_no', 'count'),
    total_halt_duration=('halt_mins', 'sum'),
    halt_stations=('station_code', lambda x: list(x)),
    total_distance_km=('dist_km', 'max')
).reset_index()

# 4. Merge metadata with schedule summaries
trains_base = pd.merge(metadata_df, schedule_summary, on='train_no', how='inner')

# 5. Map train_type to Tier for Priority Logic
def assign_tier(type_str):
    type_str = str(type_str).upper()
    if any(k in type_str for k in ['VANDE', 'RAJDHANI', 'SHATABDI', 'DURONTO']):
        return 'T1_PREMIUM'
    elif 'SUPERFAST' in type_str or 'SF' in type_str:
        return 'T2_SUPERFAST'
    else:
        return 'T3_EXPRESS' # Default for Tourist, Parcel, Ordinary

trains_base['train_tier'] = trains_base['train_type'].apply(assign_tier)

# 6. Calculate Extra Time Allotted (EA) with Kinetic Deceleration & Acceleration Subtraction
# Operational Speed Specs (Realistic commercial running speeds across Indian Railways):
# - T1_PREMIUM: 90.0 km/h (Rajdhani, Shatabdi, Vande Bharat commercial cruising)
# - T2_SUPERFAST: 68.0 km/h (Superfast statutory minimum commercial speed is 55 km/h)
# - T3_EXPRESS: 55.0 km/h (Mail/Express/Passenger booked commercial speed)
TIER_SPEED_MAP = {
    'T1_PREMIUM': 90.0,
    'T2_SUPERFAST': 68.0,
    'T3_EXPRESS': 55.0
}

# Stopping & starting kinetic loss per halt cycle: (v1 / 2) * (1/d + 1/a)
# - T1_PREMIUM: ~1.85 mins per stop (disc brakes + high power-to-weight WAP-7/5)
# - T2_SUPERFAST: ~2.15 mins per stop (twin pipe air brakes, 22-coach rake)
# - T3_EXPRESS: ~2.35 mins per stop (conventional clasp brakes, heavy load)
HALT_KINETIC_MAP = {
    'T1_PREMIUM': 1.85,
    'T2_SUPERFAST': 2.15,
    'T3_EXPRESS': 2.35
}

trains_base['effective_speed_kmph'] = trains_base['train_tier'].map(TIER_SPEED_MAP)
trains_base['halt_kinetic_rate'] = trains_base['train_tier'].map(HALT_KINETIC_MAP)

# Ideal physical cruising time at booked speed (excluding halts and stopping kinetics)
trains_base['ideal_running_mins'] = (
    trains_base['total_distance_km'] / trains_base['effective_speed_kmph']
) * 60.0
# Guardrail: Cruising time alone cannot physically exceed 88% of total scheduled duration
trains_base['ideal_running_mins'] = np.minimum(
    trains_base['ideal_running_mins'],
    trains_base['duration_mins'] * 0.88
).round(2)

# Physical kinetic delay caused by braking and re-acceleration across all scheduled halts:
# (N_halts - 1) intermediate cycles + origin acceleration and destination stop
trains_base['accel_decel_delay_mins'] = (
    np.maximum(1, trains_base['total_halt_count'] - 1) * trains_base['halt_kinetic_rate'] + trains_base['halt_kinetic_rate']
).round(2)

# Mandatory Gross Physical Travel Time:
# Physical Cruising + Scheduled Station Dwells + Mandatory Kinetic Braking & Acceleration Loss
trains_base['gross_physical_mins'] = (
    trains_base['ideal_running_mins'] + 
    trains_base['total_halt_duration'] + 
    trains_base['accel_decel_delay_mins']
).round(2)

# Gross Extra Time allotted in timetable over pure cruising motion
trains_base['extra_time_mins'] = np.maximum(
    0.0,
    trains_base['duration_mins'] - trains_base['ideal_running_mins']
).round(2)

# Calibrated Net Slack / Cushion (EA):
# Timetable margin beyond physical run time, scheduled station halts, AND kinetic accel/decel delay
trains_base['net_slack_mins'] = np.maximum(
    0.0,
    trains_base['duration_mins'] - trains_base['gross_physical_mins']
).round(2)

trains_base.to_csv('Train-Data/EACalculation.csv', index=False)
print(f"Preprocessed {len(trains_base)} trains with kinetic accel/decel delay subtracted from EA saved to Train-Data/EACalculation.csv")