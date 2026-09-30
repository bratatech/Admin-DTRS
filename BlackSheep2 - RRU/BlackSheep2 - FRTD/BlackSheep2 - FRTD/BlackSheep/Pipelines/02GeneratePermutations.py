import itertools
import pandas as pd
import numpy as np

base_df = pd.read_csv('Train-Data/EACalculation.csv')

# Route-specific sensitivity multipliers
ROUTE_COEFFS = {
    "Delhi - Howrah":    {"fog": 3.0, "rain": 1.0, "snow": 1.5, "sat": 2.5},
    "Delhi - Mumbai":    {"fog": 1.2, "rain": 1.8, "snow": 0.5, "sat": 1.2},
    "Delhi - Chennai":   {"fog": 1.5, "rain": 1.5, "snow": 0.5, "sat": 1.8},
    "Mumbai - Chennai":  {"fog": 0.0, "rain": 2.0, "snow": 0.0, "sat": 1.5},
    "Mumbai - Howrah":   {"fog": 1.0, "rain": 1.8, "snow": 0.0, "sat": 2.8},
    "Howrah - Chennai":  {"fog": 0.5, "rain": 3.0, "snow": 0.0, "sat": 1.6},
    "Howrah - Guwahati": {"fog": 2.2, "rain": 3.0, "snow": 1.0, "sat": 2.0},
}

# Permutation Discrete States (45 combinations per train)
weather_states = ['Clear', 'Fog', 'Heavy_Rain', 'Thunderstorm', 'Snow']
overtake_states = ['None', 'Low', 'High']
tsr_states = ['None', 'Minor', 'Major']

combinations = list(itertools.product(weather_states, overtake_states, tsr_states))

def compute_delay(row, weather, overtake, tsr):
    # Construct route string matching dictionary
    route_key = f"{row['source_station']} - {row['destination_station']}"
    coeffs = ROUTE_COEFFS.get(route_key, {"fog": 1.0, "rain": 1.0, "snow": 0.5, "sat": 1.0})
    
    # 1. Weather Penalty
    d_weather = 0
    if weather == 'Fog':
        d_weather = np.random.uniform(50, 75) * coeffs.get('fog', 1.0)
    elif weather == 'Heavy_Rain':
        d_weather = np.random.uniform(25, 45) * coeffs.get('rain', 1.0)
    elif weather == 'Thunderstorm':
        d_weather = np.random.uniform(40, 70) * coeffs.get('rain', 1.0)
    elif weather == 'Snow':
        d_weather = np.random.uniform(45, 85) * coeffs.get('snow', 0.5)
        
    # 2. Priority Delay
    d_priority = 0
    if row['train_tier'] == 'T2_SUPERFAST':
        d_priority = (15 if overtake == 'Low' else (35 if overtake == 'High' else 0)) * coeffs.get('sat', 1.0)
    elif row['train_tier'] == 'T3_EXPRESS':
        d_priority = (30 if overtake == 'Low' else (75 if overtake == 'High' else 0)) * coeffs.get('sat', 1.0)

    # 3. TSR Traversal & Kinetic Accel/Decel Overhead
    d_tsr_accel = 0
    if tsr == 'Minor': d_tsr_accel = 2 * 7.5  # 2 zones
    elif tsr == 'Major': d_tsr_accel = 4 * 7.5  # 4 zones
    
    # 4. Total Gross Delay minus 5% Timetable Buffer
    gross = d_weather + d_priority + d_tsr_accel
    slack = row['duration_mins'] * 0.05
    net_delay = max(0.0, gross - slack)
    
    if net_delay > 0:
        net_delay += np.random.normal(0, 4)
        
    return int(round(max(0, net_delay)))

# Generate matrix records
records = []
for _, train in base_df.iterrows():
    for w, o, t in combinations:
        predicted_delay = compute_delay(train, w, o, t)
        records.append({
            'train_no': train['train_no'],
            'train_name': train['train_name'],
            'source_station': train['source_station'],
            'destination_station': train['destination_station'],
            'train_tier': train['train_tier'],
            'days_of_run': train['days_of_run'],
            'weather': w,
            'priority_congestion': o,
            'tsr_level': t,
            'predicted_delay_mins': predicted_delay
        })

permutations_df = pd.DataFrame(records)
permutations_df.to_csv('Train-Data/PnCOutput.csv', index=False)