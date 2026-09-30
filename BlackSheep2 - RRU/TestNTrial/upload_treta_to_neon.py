import os
import time
import pandas as pd
from sqlalchemy import create_engine, text

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKSHEEP_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) if os.path.exists(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) else os.getcwd()

def get_path(rel_path):
    if os.path.exists(rel_path): return rel_path
    candidate = os.path.join(BLACKSHEEP_DIR, rel_path)
    return candidate if os.path.exists(candidate) else rel_path

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def upload_treta():
    print("=" * 70)
    print("MIGRATING AND UPLOADING TRETA ROUTES & ZONES TO NEON POSTGRESQL")
    print("=" * 70)
    
    engine = create_engine(NEON_DATABASE_URL, pool_pre_ping=True)
    
    # 1. Create treta_routes table
    print("\n1. Creating 'treta_routes' table...")
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS treta_routes (
                train_no VARCHAR(10) PRIMARY KEY REFERENCES trains_metadata(train_no) ON DELETE CASCADE,
                train_name VARCHAR(255),
                source_station VARCHAR(50),
                destination_station VARCHAR(50),
                train_type VARCHAR(50),
                treta_route_number VARCHAR(100),
                total_treta_zones INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_treta_routes_route_num ON treta_routes(treta_route_number);
        """))
    
    # Load TRETARoutes.csv
    with engine.connect() as conn:
        r_cnt = conn.execute(text("SELECT count(*) FROM treta_routes;")).scalar()
    
    if r_cnt == 0:
        df_routes = pd.read_csv(get_path("Train-Data/TRETARoutes.csv"), keep_default_na=False)
        df_routes['train_no'] = df_routes['train_no'].astype(str).str.zfill(5)
        
        with engine.connect() as conn:
            valid_trains = set(r[0] for r in conn.execute(text("SELECT train_no FROM trains_metadata;")).fetchall())
        
        df_routes = df_routes[df_routes['train_no'].isin(valid_trains)]
        
        print(f"Uploading {len(df_routes):,} rows to 'treta_routes'...")
        df_routes.to_sql('treta_routes', con=engine, if_exists='append', index=False, chunksize=2000, method='multi')
        print("[OK] treta_routes uploaded successfully.")
    else:
        print(f"[OK] treta_routes already contains {r_cnt:,} rows.")

    # 2. Add treta_route_number column to trains_metadata, ea_calculation, final_orchestra_output
    print("\n2. Linking treta_route_number across core relational tables...")
    with engine.begin() as conn:
        for tbl in ['trains_metadata', 'ea_calculation', 'final_orchestra_output']:
            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS treta_route_number VARCHAR(100);"))
            conn.execute(text(f"""
                UPDATE {tbl} t
                SET treta_route_number = r.treta_route_number
                FROM treta_routes r
                WHERE t.train_no = r.train_no;
            """))
            print(f"[OK] Updated treta_route_number in '{tbl}'.")

    # 3. Create treta_zone_elements table
    print("\n3. Creating 'treta_zone_elements' table...")
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS treta_zone_elements (
                id SERIAL PRIMARY KEY,
                train_no VARCHAR(10) REFERENCES trains_metadata(train_no) ON DELETE CASCADE,
                sr_no INTEGER,
                station_code VARCHAR(20),
                next_stn VARCHAR(20),
                treta_zone_element VARCHAR(50),
                hop_index INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_treta_zones_element ON treta_zone_elements(treta_zone_element);
            CREATE INDEX IF NOT EXISTS idx_treta_zones_train ON treta_zone_elements(train_no);
        """))

    with engine.connect() as conn:
        z_cnt = conn.execute(text("SELECT count(*) FROM treta_zone_elements;")).scalar()

    if z_cnt == 0:
        with engine.connect() as conn:
            valid_trains = set(r[0] for r in conn.execute(text("SELECT train_no FROM trains_metadata;")).fetchall())

        df_zones = pd.read_csv(get_path("Train-Data/TRETAZoneElements.csv"), keep_default_na=False)
        df_zones['train_no'] = df_zones['train_no'].astype(str).str.zfill(5)
        df_zones = df_zones[df_zones['train_no'].isin(valid_trains)]
        
        print(f"Uploading {len(df_zones):,} rows to 'treta_zone_elements'...")
        t0 = time.time()
        df_zones.to_sql('treta_zone_elements', con=engine, if_exists='append', index=False, chunksize=5000, method='multi')
        print(f"[OK] treta_zone_elements uploaded in {time.time() - t0:.2f}s.")
    else:
        print(f"[OK] treta_zone_elements already contains {z_cnt:,} rows.")

    # 4. Integrity check
    with engine.connect() as conn:
        c_routes = conn.execute(text("SELECT count(*) FROM treta_routes;")).scalar()
        c_zones = conn.execute(text("SELECT count(*) FROM treta_zone_elements;")).scalar()
        sample = conn.execute(text("SELECT train_no, train_name, treta_route_number FROM trains_metadata WHERE treta_route_number IS NOT NULL LIMIT 3;")).fetchall()
        print(f"\nFinal Counts in Neon DB:")
        print(f"  treta_routes: {c_routes:,} rows")
        print(f"  treta_zone_elements: {c_zones:,} rows")
        print(f"  Sample linked trains_metadata: {sample}")

if __name__ == '__main__':
    upload_treta()
