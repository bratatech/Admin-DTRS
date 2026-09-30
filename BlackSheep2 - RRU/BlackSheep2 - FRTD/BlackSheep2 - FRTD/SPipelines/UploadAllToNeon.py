import os
import time
import re
import pandas as pd
from sqlalchemy import create_engine, text

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# List all tables to upload in strict relational dependency order:
# 1. trains_metadata (Master Parent - MUST exist before any child table)
# 2. Child tables (foreign key reference to trains_metadata.train_no)
TABLE_FILES = [
    ("Train-Data/TrainsMetadata_DND.csv", "trains_metadata", True),
    ("Train-Data/TRETARoutes.csv", "treta_routes", False),
    ("Train-Data/EACalculation.csv", "ea_calculation", False),
    ("Train-Data/SlowAccDelay.csv", "slow_acc_delay", False),
    ("Train-Data/HeadwayDelay.csv", "headway_delay", False),
    ("Train-Data/PlatformAllocDelay.csv", "platform_alloc_delay", False),
    ("Train-Data/ServicingDelay.csv", "servicing_delay", False),
    ("Train-Data/SingleTrackDelay.csv", "single_track_delay", False),
    ("Train-Data/TiredCrewDelay.csv", "tired_crew_delay", False),
    ("Train-Data/FinalOrchestraOutput.csv", "final_orchestra_output", False),
    ("Train-Data/TrainSchedules_DND.csv", "train_halts", False),
    ("Train-Data/TRETAZoneElements.csv", "treta_zone_elements", False),
    ("Train-Data/MLCompoundPermutations.csv", "ml_compound_permutations", False),
    ("Train-Data/PnCOutput.csv", "delay_predictions", False),
    ("Train-Data/masterPnC.csv", "master_pnc", False),
]

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

def upload_all():
    print("=" * 85)
    print("POPULATING ALL NEON POSTGRESQL TABLES (PRESERVING RELATIONAL INTEGRITY)")
    print("=" * 85)

    engine = create_engine(NEON_DATABASE_URL, pool_pre_ping=True)

    for file_path, table_name, is_master in TABLE_FILES:
        if not os.path.exists(file_path):
            print(f"[SKIP] {file_path} not found.")
            continue

        print(f"\nProcessing '{file_path}' -> table '{table_name}'...")
        t0 = time.time()

        # Check if table already has full rows
        with engine.connect() as conn:
            existing_count = conn.execute(text(f"SELECT count(*) FROM {table_name};")).scalar()
        
        # If table is already fully loaded, keep it
        if existing_count > 0 and (
            (table_name == 'train_halts' and existing_count >= 210000) or
            (table_name == 'treta_zone_elements' and existing_count >= 200000) or
            (table_name == 'trains_metadata' and existing_count >= 10620) or
            (table_name in ['treta_routes', 'ea_calculation', 'slow_acc_delay', 'headway_delay', 'platform_alloc_delay', 'servicing_delay', 'single_track_delay', 'tired_crew_delay', 'final_orchestra_output'] and existing_count >= 10620) or
            (table_name == 'master_pnc' and existing_count >= 38880) or
            (table_name == 'ml_compound_permutations' and existing_count >= 19200) or
            (table_name == 'delay_predictions' and existing_count >= 477900)
        ):
            print(f"  [KEEP] Table '{table_name}' already populated with {existing_count:,} rows. Skipping.")
            continue


        df = pd.read_csv(file_path, keep_default_na=False)

        # Standardize train_no to string with 5 digits
        if 'train_no' in df.columns:
            df['train_no'] = df['train_no'].astype(str).str.zfill(5)

        # Standardize column names
        clean_cols = {c: c.strip().lower().replace(' ', '_').replace('-', '_') for c in df.columns}
        df.rename(columns=clean_cols, inplace=True)

        # Specific field cleans
        if table_name == 'train_halts' and 'halt_mins' not in df.columns:
            if 'halt_time' in df.columns:
                df['halt_mins'] = df['halt_time'].apply(parse_halt_time)

        if table_name == 'delay_predictions':
            df['priority_congestion'] = df['priority_congestion'].replace({'': 'None', None: 'None'})
            df['tsr_level'] = df['tsr_level'].replace({'': 'None', None: 'None'})
            df['weather'] = df['weather'].replace({'': 'Clear', None: 'Clear'})

        # Filter out any train_no not in trains_metadata to prevent FK violation
        if not is_master:
            with engine.connect() as conn:
                valid_trains = set(r[0] for r in conn.execute(text("SELECT train_no FROM trains_metadata;")).fetchall())
            if 'train_no' in df.columns:
                initial_len = len(df)
                df = df[df['train_no'].isin(valid_trains)]
                if len(df) < initial_len:
                    print(f"  Filtered {initial_len - len(df)} orphan rows not in trains_metadata.")

        row_count = len(df)
        print(f"  Uploading {row_count:,} rows into '{table_name}'...")

        with engine.connect() as conn:
            # Sync missing columns
            res = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}';")).fetchall()
            existing_cols = {r[0].lower() for r in res}
            for col in df.columns:
                if col.lower() not in existing_cols:
                    col_type = "DOUBLE PRECISION" if df[col].dtype in ['float64', 'float32'] else ("BIGINT" if df[col].dtype in ['int64', 'int32'] else "TEXT")
                    print(f"    Adding column '{col}' ({col_type}) to '{table_name}'...")
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col} {col_type};"))

            # Truncate child table without CASCADE (leaves master and siblings intact!)
            conn.execute(text(f"TRUNCATE TABLE {table_name};"))
            conn.commit()

        # Batch upload
        chunk_size = 2000 if row_count > 50000 else 1000
        df.to_sql(
            table_name,
            engine,
            if_exists='append',
            index=False,
            chunksize=chunk_size,
            method='multi'
        )

        elapsed = time.time() - t0
        print(f"  [OK] Successfully populated '{table_name}' ({row_count:,} rows) in {elapsed:.2f}s!")

    print("\n" + "=" * 85)
    print("ALL TABLES ACROSS NEON POSTGRESQL ARE NOW FULLY POPULATED!")
    print("=" * 85)

if __name__ == '__main__':
    upload_all()
