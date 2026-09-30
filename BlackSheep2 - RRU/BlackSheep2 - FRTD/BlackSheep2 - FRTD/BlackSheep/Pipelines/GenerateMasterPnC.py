import itertools
import time
import os
import pandas as pd
from sqlalchemy import create_engine, text

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Define all Attributes and their exact Subattributes
ATTRIBUTES = {
    'train_tier': [
        'T1_PREMIUM', 
        'T2_SUPERFAST', 
        'T3_EXPRESS_PASSENGER'
    ],
    'weather': [
        'Clear', 
        'Fog', 
        'Heavy_Rain', 
        'Thunderstorm', 
        'Snow'
    ],
    'tsr_level': [
        'None', 
        'Minor', 
        'Major'
    ],
    'priority_congestion': [
        'None', 
        'Low', 
        'High'
    ],
    'treta_block_occupancy': [
        'Track_Clear', 
        'Preceding_Delayed_Minor', 
        'Preceding_Delayed_Moderate', 
        'Preceding_Delayed_Severe'
    ],
    'crossing_conflict': [
        'Double_Quad_Track', 
        'Minor_Crossing_Wait', 
        'Major_Crossing_Wait'
    ],
    'alarm_chain_pulling': [
        '0_Events', 
        '1_Event', 
        '2_Events'
    ],
    'engine_failure': [
        'Nominal', 
        'Failure'
    ],
    'terminal_platform_hold': [
        'Platform_Available', 
        'Outer_Holding'
    ],
    'crew_duty_status': [
        'Duty_Valid', 
        'Duty_Exceeded'
    ]
}

def compute_row_delays(comb):
    tier = comb['train_tier']
    weather = comb['weather']
    tsr = comb['tsr_level']
    congestion = comb['priority_congestion']
    occupancy = comb['treta_block_occupancy']
    crossing = comb['crossing_conflict']
    acp = comb['alarm_chain_pulling']
    engine = comb['engine_failure']
    plat = comb['terminal_platform_hold']
    crew = comb['crew_duty_status']

    # 1. Primary Component Delays
    # Weather
    w_map = {'Clear': 0.0, 'Heavy_Rain': 12.0, 'Thunderstorm': 18.0, 'Snow': 22.0, 'Fog': 35.0}
    d_weather = w_map.get(weather, 0.0)

    # TSR
    tsr_map = {'None': 0.0, 'Minor': 8.0, 'Major': 24.0}
    d_tsr = tsr_map.get(tsr, 0.0)

    # Alarm Chain Pulling (15 mins per event)
    acp_map = {'0_Events': 0.0, '1_Event': 15.0, '2_Events': 30.0}
    d_acp = acp_map.get(acp, 0.0)

    # Engine Failure (15 mins direct)
    d_engine = 15.0 if engine == 'Failure' else 0.0

    primary_delay = round(d_weather + d_tsr + d_acp + d_engine, 1)

    # 2. Cascading Component Delays
    # Headway & TRETA Zone Occupancy
    # Base headway from congestion
    c_mult = 0.5 if congestion == 'None' else (1.0 if congestion == 'Low' else 1.8)
    base_hw = round(3.0 * c_mult, 1)

    # Inherited blocking delay from TRETA zone ahead
    occ_map = {
        'Track_Clear': 0.0,
        'Preceding_Delayed_Minor': 5.0,
        'Preceding_Delayed_Moderate': 10.0,
        'Preceding_Delayed_Severe': 20.0
    }
    inherited_delay = occ_map.get(occupancy, 0.0)
    engine_ripple = 12.5 if engine == 'Failure' else 0.0

    # Universal block delay matching: max of nominal headway, inherited zone blocking, or engine ripple
    d_headway_treta = round(max(base_hw, inherited_delay, engine_ripple), 1)

    # Crossing delay on single-track section
    tier_yield = 0.4 if tier == 'T1_PREMIUM' else (1.0 if tier == 'T2_SUPERFAST' else 1.5)
    cross_map = {'Double_Quad_Track': 0.0, 'Minor_Crossing_Wait': 8.0, 'Major_Crossing_Wait': 25.0}
    d_crossing = round(cross_map.get(crossing, 0.0) * tier_yield, 1)

    # Terminal Platform holding
    d_platform = 15.0 if plat == 'Outer_Holding' else 0.0

    # Crew duty exceeded callout
    d_crew = 45.0 if crew == 'Duty_Exceeded' else 0.0

    cascade_delay = round(d_headway_treta + d_crossing + d_platform + d_crew, 1)

    # 3. Gross Disturbance
    gross_delay = round(primary_delay + cascade_delay, 1)

    # 4. Recovery via Timetable Buffer (EA)
    # Tier recovery rates and nominal buffer allotments
    if tier == 'T1_PREMIUM':
        recovery_rate = 0.35
        nominal_ea = 45.0
    elif tier == 'T2_SUPERFAST':
        recovery_rate = 0.22
        nominal_ea = 90.0
    else:
        recovery_rate = 0.12
        nominal_ea = 135.0

    max_usable_ea = nominal_ea * 0.20
    absorbed_by_ea = round(min(gross_delay * recovery_rate, max_usable_ea), 1)

    # 5. Net Delay & Arrival Status (5.0 min threshold)
    net_delay = round(max(0.0, gross_delay - absorbed_by_ea), 1)
    arrival_status = 'LATE' if net_delay > 5.0 else 'ON_TIME'

    return {
        'd_weather': d_weather,
        'd_tsr': d_tsr,
        'd_acp': d_acp,
        'd_engine_failure': d_engine,
        'primary_delay_mins': primary_delay,
        'd_headway_treta': d_headway_treta,
        'd_crossing': d_crossing,
        'd_platform_hold': d_platform,
        'd_crew_delay': d_crew,
        'cascade_delay_mins': cascade_delay,
        'gross_delay_mins': gross_delay,
        'nominal_ea_buffer_mins': nominal_ea,
        'absorbed_by_ea_mins': absorbed_by_ea,
        'net_delay_mins': net_delay,
        'arrival_status': arrival_status
    }

def generate_master_pnc():
    print("=" * 80)
    print("GENERATING masterPnC: ALL PERMUTATIONS & COMBINATIONS (NO DUPLICATES)")
    print("=" * 80)

    # Calculate expected Cartesian product size
    keys = list(ATTRIBUTES.keys())
    value_lists = [ATTRIBUTES[k] for k in keys]
    total_combinations = 1
    for k in keys:
        print(f"  Attribute '{k:24}': {len(ATTRIBUTES[k])} subattributes -> {ATTRIBUTES[k]}")
        total_combinations *= len(ATTRIBUTES[k])
    
    print(f"\nTotal Unique Permutations & Combinations: {total_combinations:,}")

    # Generate all unique combinations via itertools.product
    print("\nGenerating Cartesian product...")
    t0 = time.time()
    all_combs = list(itertools.product(*value_lists))
    print(f"Generated {len(all_combs):,} combinations in {time.time() - t0:.2f}s.")

    # Convert to list of dictionaries and compute delays
    print("Computing compounding primary, cascade, EA absorption, and net delays...")
    records = []
    for idx, tup in enumerate(all_combs, 1):
        comb = dict(zip(keys, tup))
        delays = compute_row_delays(comb)
        row = {'combination_id': idx, **comb, **delays}
        records.append(row)

    df = pd.DataFrame(records)

    # Verify uniqueness
    dup_count = df.duplicated(subset=keys).sum()
    print(f"Duplicates verification across attribute subset: {dup_count} duplicates found.")
    assert dup_count == 0, "Error: duplicate combinations found!"

    # Save to local CSV
    out_csv = "Train-Data/masterPnC.csv"
    print(f"Saving to '{out_csv}'...")
    df.to_csv(out_csv, index=False)
    print(f"[OK] Saved {len(df):,} rows to '{out_csv}' ({os.path.getsize(out_csv) / (1024*1024):.2f} MB).")

    # Status distribution
    status_counts = df['arrival_status'].value_counts()
    print("\nArrival Status Distribution across all combinations:")
    for stat, cnt in status_counts.items():
        print(f"  {stat:10}: {cnt:,} ({cnt/len(df)*100:.1f}%)")

    # Upload to Neon PostgreSQL as table 'master_pnc'
    print("\nUploading to Neon PostgreSQL as table 'master_pnc'...")
    engine = create_engine(NEON_DATABASE_URL, pool_pre_ping=True)
    
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS master_pnc CASCADE;"))
        conn.execute(text("""
            CREATE TABLE master_pnc (
                combination_id INTEGER PRIMARY KEY,
                train_tier VARCHAR(30) NOT NULL,
                weather VARCHAR(30) NOT NULL,
                tsr_level VARCHAR(20) NOT NULL,
                priority_congestion VARCHAR(20) NOT NULL,
                treta_block_occupancy VARCHAR(40) NOT NULL,
                crossing_conflict VARCHAR(40) NOT NULL,
                alarm_chain_pulling VARCHAR(20) NOT NULL,
                engine_failure VARCHAR(20) NOT NULL,
                terminal_platform_hold VARCHAR(30) NOT NULL,
                crew_duty_status VARCHAR(20) NOT NULL,
                d_weather NUMERIC(5,1),
                d_tsr NUMERIC(5,1),
                d_acp NUMERIC(5,1),
                d_engine_failure NUMERIC(5,1),
                primary_delay_mins NUMERIC(5,1),
                d_headway_treta NUMERIC(5,1),
                d_crossing NUMERIC(5,1),
                d_platform_hold NUMERIC(5,1),
                d_crew_delay NUMERIC(5,1),
                cascade_delay_mins NUMERIC(5,1),
                gross_delay_mins NUMERIC(5,1),
                nominal_ea_buffer_mins NUMERIC(5,1),
                absorbed_by_ea_mins NUMERIC(5,1),
                net_delay_mins NUMERIC(5,1),
                arrival_status VARCHAR(15) NOT NULL
            );
            CREATE INDEX idx_master_pnc_lookup ON master_pnc(train_tier, weather, tsr_level, priority_congestion);
            CREATE INDEX idx_master_pnc_status ON master_pnc(arrival_status);
        """))

    t0_up = time.time()
    df.to_sql('master_pnc', con=engine, if_exists='append', index=False, chunksize=5000, method='multi')
    print(f"[OK] Uploaded {len(df):,} rows to Neon PostgreSQL in {time.time() - t0_up:.2f}s.")

    # Final Neon DB Count verification
    with engine.connect() as conn:
        db_cnt = conn.execute(text("SELECT count(*) FROM master_pnc;")).scalar()
        sample = conn.execute(text("SELECT combination_id, train_tier, weather, treta_block_occupancy, net_delay_mins, arrival_status FROM master_pnc LIMIT 3;")).fetchall()
        print(f"\nNeon DB Verification:")
        print(f"  master_pnc count: {db_cnt:,} rows")
        print(f"  Sample rows: {sample}")

if __name__ == '__main__':
    generate_master_pnc()
