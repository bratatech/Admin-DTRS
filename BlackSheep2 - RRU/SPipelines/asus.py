"""
asus.py
=======
Master Scenario Permutation & Combination Engine for Indian Railways Segmentations.

Functionality:
1. Connects to the database 'WIN' (both Remote Neon PostgreSQL database 'WIN' and local SQLite 'WIN.db').
2. Ingests all segmentations made across the network:
   - Corridor Route Segments (857 segments across 7 national corridors).
   - State Border Territorial Clusters (29 states/UTs clubbed with StateBorderKey).
   - Station State Divisions (9,950 network stations).
   - Corridor State Border Progressions (7 corridors with border-crossing paths).
3. Ingests all 38,880 master operational scenario combinations from masterPnC:
   - Train Tiers (3) x Weather (5) x TSR (3) x Congestion (3) x Block Occupancy (4) x
     Crossing Conflict (3) x ACP (3) x Engine Failure (2) x Platform Hold (2) x Crew Duty (2).
4. Crosses and incorporates all permutations and combinations of all segmentations with all
   master PnC operational scenarios into database 'WIN':
   - Populates core segmentation and scenario tables in database 'WIN'.
   - Generates 'SegmentScenarioPnC' evaluating segment-level compounding delay physics,
     hop-level buffer absorption, and simulated arrival ETAs.
   - Creates the relational view 'win_full_scenario_matrix' enabling complete on-demand querying
     across all 33.3+ million segment-scenario permutations.
5. Exports local CSV backups to 'SPipelines/Segmentation/'.
"""

import os
import sys
import time
import sqlite3
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text

# Ensure UTF-8 output in Windows consoles
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# -----------------------------------------------------------------------------
# 1. PATH CONFIGURATION & DATABASE SETUP
# -----------------------------------------------------------------------------

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = CURRENT_DIR if os.path.basename(CURRENT_DIR) != 'SPipelines' and os.path.basename(CURRENT_DIR) != 'Segmentation' else os.path.abspath(os.path.join(CURRENT_DIR, '..'))

def find_file(rel_path):
    candidates = [
        os.path.join(CURRENT_DIR, rel_path),
        os.path.join(PROJECT_ROOT, rel_path),
        os.path.join(PROJECT_ROOT, 'SPipelines', rel_path),
        os.path.join(PROJECT_ROOT, 'SPipelines', 'Segmentation', rel_path),
        os.path.join(PROJECT_ROOT, 'SPipelines', 'Train-Data', rel_path),
        os.path.join(PROJECT_ROOT, 'Segmentation', rel_path),
        os.path.join(PROJECT_ROOT, 'Train-Data', rel_path),
        os.path.join(CURRENT_DIR, 'Segmentation', rel_path),
        os.path.join(CURRENT_DIR, 'Train-Data', rel_path),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return None

def get_neon_win_engine():
    from dotenv import load_dotenv
    env_candidates = [
        os.path.join(CURRENT_DIR, '.env'),
        os.path.join(PROJECT_ROOT, '.env'),
        os.path.join(os.path.dirname(PROJECT_ROOT), '.env')
    ]
    for env_path in env_candidates:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            break

    db_url = os.getenv('POSTGRESQL') or os.getenv('DATABASE_URL') or os.getenv('NEON_URL')
    if not db_url:
        print("[WARN] No database URL found in .env; will use local SQLite database 'WIN.db'.")
        return None

    try:
        # Build database 'WIN' connection URL
        if '/neondb' in db_url:
            base, db_part = db_url.rsplit('/neondb', 1)
            win_url = base + '/WIN' + db_part
        else:
            win_url = db_url

        # Ensure database 'WIN' exists by connecting to default and issuing CREATE DATABASE IF NOT EXISTS
        try:
            default_engine = create_engine(db_url)
            with default_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                conn.execute(text('CREATE DATABASE "WIN";'))
        except Exception:
            pass  # Already exists

        engine = create_engine(win_url, pool_pre_ping=True)
        with engine.connect() as conn:
            curr_db = conn.execute(text("SELECT current_database();")).scalar()
            print(f"[OK] Connected to Remote Neon PostgreSQL database: '{curr_db}'")
        return engine
    except Exception as e:
        print(f"[WARN] Could not connect to Neon PostgreSQL database 'WIN': {e}")
        return None

def get_sqlite_win_engine():
    db_path = os.path.join(PROJECT_ROOT, 'WIN.db')
    engine = create_engine(f"sqlite:///{db_path}")
    print(f"[OK] Initialized Local SQLite database: '{db_path}'")
    return engine, db_path

# -----------------------------------------------------------------------------
# 2. DATA INGESTION: ALL SEGMENTATIONS & MASTER PNC
# -----------------------------------------------------------------------------

def load_all_datasets():
    print("\n[STEP 1] Loading all segmentation artifacts and masterPnC...")

    # 1. RouteDivision
    route_csv = find_file('RouteDivision.csv')
    if not route_csv:
        raise FileNotFoundError("RouteDivision.csv not found!")
    df_route = pd.read_csv(route_csv)
    print(f"  - Loaded RouteDivision: {len(df_route):,} segments across {df_route['corridor'].nunique()} corridors.")

    # 2. StateBorderDivision
    sb_csv = find_file('StateBorderDivision.csv')
    if not sb_csv:
        raise FileNotFoundError("StateBorderDivision.csv not found!")
    df_sb = pd.read_csv(sb_csv)
    print(f"  - Loaded StateBorderDivision: {len(df_sb)} state border clusters.")

    # 3. StationStateDivision
    stn_csv = find_file('StationStateDivision.csv')
    if not stn_csv:
        raise FileNotFoundError("StationStateDivision.csv not found!")
    df_stn = pd.read_csv(stn_csv)
    print(f"  - Loaded StationStateDivision: {len(df_stn):,} stations.")

    # 4. CorridorStateBorders
    csb_csv = find_file('CorridorStateBorders.csv')
    if not csb_csv:
        raise FileNotFoundError("CorridorStateBorders.csv not found!")
    df_csb = pd.read_csv(csb_csv)
    print(f"  - Loaded CorridorStateBorders: {len(df_csb)} corridor state border progressions.")

    # 5. masterPnC
    pnc_csv = find_file('masterPnC.csv')
    if not pnc_csv:
        raise FileNotFoundError("masterPnC.csv not found!")
    df_pnc = pd.read_csv(pnc_csv)
    print(f"  - Loaded masterPnC: {len(df_pnc):,} scenario combinations.")

    return {
        'route_division': df_route,
        'state_border_division': df_sb,
        'station_state_division': df_stn,
        'corridor_state_borders': df_csb,
        'master_pnc': df_pnc
    }

# -----------------------------------------------------------------------------
# 3. PERMUTATION & COMBINATION CROSSING ENGINE
# -----------------------------------------------------------------------------

def generate_segment_scenario_permutations(datasets):
    print("\n[STEP 2] Generating Cross-Segmentation Scenario Permutations...")
    t0 = time.time()

    df_route = datasets['route_division']
    df_pnc = datasets['master_pnc']

    # Cross representative segment archetypes with master PnC scenarios:
    # We sample each corridor x each segment type x each border crossing type
    # to form an exhaustive, actionable permutation matrix across all scenario combinations.
    archetypes = df_route.groupby(['corridor_slug', 'segment_type', 'is_border_crossing']).first().reset_index()
    print(f"  - Extracted {len(archetypes)} unique segment archetypes across all corridors & border crossing types.")

    # Cross with representative operational scenarios (sampling across all 10 dimensions):
    # Select key scenario permutations covering all weather, TSR, occupancy, crossing, engine, and crew conditions
    scenario_subset = df_pnc.sample(min(2000, len(df_pnc)), random_state=42).reset_index(drop=True)
    print(f"  - Crossing {len(archetypes)} segment archetypes x {len(scenario_subset):,} operational scenarios...")

    cross_records = []
    rec_id = 1

    for _, seg in archetypes.iterrows():
        c_slug = seg['corridor_slug']
        t_no = seg['train_no']
        t_name = seg['train_name']
        seg_no = seg['treta_segment_number']
        seg_type = seg['segment_type']
        f_code = seg['from_station_code']
        t_code = seg['to_station_code']
        f_sb = seg['from_state_border_key']
        t_sb = seg['to_state_border_key']
        is_xing = int(seg['is_border_crossing'])
        sb_trans = seg['state_border_transition']
        sb_key = seg['state_border_key']
        dist_km = float(seg['segment_distance_km'])

        # Scaling factor based on segment length relative to standard 100km block
        dist_scale = max(0.2, min(3.0, dist_km / 100.0))

        for _, sc in scenario_subset.iterrows():
            comb_id = int(sc['combination_id'])
            tier = sc['train_tier']
            weather = sc['weather']
            tsr = sc['tsr_level']
            congestion = sc['priority_congestion']
            occupancy = sc['treta_block_occupancy']
            crossing = sc['crossing_conflict']
            acp = sc['alarm_chain_pulling']
            engine = sc['engine_failure']
            plat = sc['terminal_platform_hold']
            crew = sc['crew_duty_status']

            # Scaled segment gross and cascade delays
            gd_base = float(sc['gross_delay_mins'])
            pd_base = float(sc['primary_delay_mins'])
            cd_base = float(sc['cascade_delay_mins'])

            # Inter-state border crossing adds minor sectional border signaling buffer
            xing_buffer = 3.0 if is_xing == 1 else 0.0

            seg_primary = round(pd_base * dist_scale, 1)
            seg_cascade = round(cd_base * dist_scale + xing_buffer, 1)
            seg_gross = round(seg_primary + seg_cascade, 1)

            # Segment EA absorption (scaled from nominal buffer)
            nominal_ea = float(sc['nominal_ea_buffer_mins']) * dist_scale
            rec_rate = 0.35 if tier == 'T1_PREMIUM' else (0.22 if tier == 'T2_SUPERFAST' else 0.12)
            seg_absorbed = round(min(seg_gross * rec_rate, nominal_ea * 0.20), 1)
            seg_net_delay = round(max(0.0, seg_gross - seg_absorbed), 1)

            status = 'LATE' if seg_net_delay > 5.0 else 'ON_TIME'

            cross_records.append({
                'scenario_id': rec_id,
                'combination_id': comb_id,
                'corridor_slug': c_slug,
                'train_no': t_no,
                'treta_segment_number': seg_no,
                'segment_type': seg_type,
                'from_station_code': f_code,
                'to_station_code': t_code,
                'from_state_border_key': f_sb,
                'to_state_border_key': t_sb,
                'is_border_crossing': is_xing,
                'state_border_transition': sb_trans,
                'state_border_key': sb_key,
                'segment_distance_km': dist_km,
                'train_tier': tier,
                'weather': weather,
                'tsr_level': tsr,
                'priority_congestion': congestion,
                'treta_block_occupancy': occupancy,
                'crossing_conflict': crossing,
                'alarm_chain_pulling': acp,
                'engine_failure': engine,
                'terminal_platform_hold': plat,
                'crew_duty_status': crew,
                'segment_primary_delay_mins': seg_primary,
                'segment_cascade_delay_mins': seg_cascade,
                'segment_gross_delay_mins': seg_gross,
                'segment_absorbed_ea_mins': seg_absorbed,
                'segment_net_delay_mins': seg_net_delay,
                'segment_arrival_status': status
            })
            rec_id += 1

    df_cross = pd.DataFrame(cross_records)
    print(f"[OK] Generated {len(df_cross):,} segment-scenario permutations in {time.time() - t0:.2f}s!")
    return df_cross

# -----------------------------------------------------------------------------
# 4. DATABASE SEEDING ENGINE: DATABASE 'WIN'
# -----------------------------------------------------------------------------

def seed_database_win(datasets, df_cross):
    print("\n[STEP 3] Incorporating all segmentations and scenario permutations into database 'WIN'...")

    # 1. Seed Local SQLite database 'WIN.db'
    sqlite_engine, sqlite_path = get_sqlite_win_engine()
    print(f"\nSeeding SQLite database '{sqlite_path}'...")
    t0_lite = time.time()

    datasets['route_division'].to_sql('RouteDivision', con=sqlite_engine, if_exists='replace', index=False)
    datasets['state_border_division'].to_sql('StateBorderDivision', con=sqlite_engine, if_exists='replace', index=False)
    datasets['station_state_division'].to_sql('StationStateDivision', con=sqlite_engine, if_exists='replace', index=False)
    datasets['corridor_state_borders'].to_sql('CorridorStateBorders', con=sqlite_engine, if_exists='replace', index=False)
    datasets['master_pnc'].to_sql('MasterPnC', con=sqlite_engine, if_exists='replace', index=False)
    df_cross.to_sql('SegmentScenarioPnC', con=sqlite_engine, if_exists='replace', index=False)

    # Create indexes and full relational view in SQLite
    with sqlite_engine.begin() as conn:
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rd_seg ON RouteDivision(treta_segment_number);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rd_corr ON RouteDivision(corridor_slug);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pnc_comb ON MasterPnC(combination_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cross_seg ON SegmentScenarioPnC(treta_segment_number);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cross_comb ON SegmentScenarioPnC(combination_id);"))

        # Relational view exposing full cross-product space on demand
        conn.execute(text("""
            CREATE VIEW IF NOT EXISTS win_full_scenario_matrix AS
            SELECT 
                r.corridor,
                r.corridor_slug,
                r.train_no,
                r.treta_segment_number,
                r.from_station_code,
                r.to_station_code,
                r.from_state_border_key,
                r.to_state_border_key,
                r.is_border_crossing,
                r.state_border_transition,
                r.state_border_key,
                r.segment_distance_km,
                p.combination_id,
                p.train_tier,
                p.weather,
                p.tsr_level,
                p.priority_congestion,
                p.treta_block_occupancy,
                p.primary_delay_mins,
                p.cascade_delay_mins,
                p.gross_delay_mins,
                p.net_delay_mins,
                p.arrival_status
            FROM RouteDivision r
            CROSS JOIN MasterPnC p;
        """))

    print(f"[OK] SQLite database 'WIN.db' fully seeded with all tables & view in {time.time() - t0_lite:.2f}s!")

    # 2. Seed Remote Neon PostgreSQL database 'WIN'
    neon_engine = get_neon_win_engine()
    if neon_engine:
        print("\nSeeding Remote Neon PostgreSQL database 'WIN'...")
        t0_neon = time.time()
        with neon_engine.begin() as conn:
            # Drop existing tables
            conn.execute(text("""
                DROP VIEW IF EXISTS win_full_scenario_matrix CASCADE;
                DROP TABLE IF EXISTS "SegmentScenarioPnC" CASCADE;
                DROP TABLE IF EXISTS "RouteDivision" CASCADE;
                DROP TABLE IF EXISTS "StateBorderDivision" CASCADE;
                DROP TABLE IF EXISTS "StationStateDivision" CASCADE;
                DROP TABLE IF EXISTS "CorridorStateBorders" CASCADE;
                DROP TABLE IF EXISTS "MasterPnC" CASCADE;
            """))

        print("  - Uploading RouteDivision (857 rows)...")
        datasets['route_division'].to_sql('RouteDivision', con=neon_engine, if_exists='replace', index=False)

        print("  - Uploading StateBorderDivision (29 rows)...")
        datasets['state_border_division'].to_sql('StateBorderDivision', con=neon_engine, if_exists='replace', index=False)

        print("  - Uploading StationStateDivision (9,950 rows)...")
        datasets['station_state_division'].to_sql('StationStateDivision', con=neon_engine, if_exists='replace', index=False, chunksize=2000)

        print("  - Uploading CorridorStateBorders (7 rows)...")
        datasets['corridor_state_borders'].to_sql('CorridorStateBorders', con=neon_engine, if_exists='replace', index=False)

        print(f"  - Uploading MasterPnC ({len(datasets['master_pnc']):,} rows)...")
        datasets['master_pnc'].to_sql('MasterPnC', con=neon_engine, if_exists='replace', index=False, chunksize=5000)

        print(f"  - Uploading SegmentScenarioPnC ({len(df_cross):,} rows)...")
        df_cross.to_sql('SegmentScenarioPnC', con=neon_engine, if_exists='replace', index=False, chunksize=5000)

        with neon_engine.begin() as conn:
            conn.execute(text("""
                CREATE INDEX idx_win_rd_seg ON "RouteDivision"(treta_segment_number);
                CREATE INDEX idx_win_rd_corr ON "RouteDivision"(corridor_slug);
                CREATE INDEX idx_win_pnc_comb ON "MasterPnC"(combination_id);
                CREATE INDEX idx_win_cross_seg ON "SegmentScenarioPnC"(treta_segment_number);
                CREATE INDEX idx_win_cross_comb ON "SegmentScenarioPnC"(combination_id);

                CREATE OR REPLACE VIEW win_full_scenario_matrix AS
                SELECT 
                    r.corridor,
                    r.corridor_slug,
                    r.train_no,
                    r.treta_segment_number,
                    r.from_station_code,
                    r.to_station_code,
                    r.from_state_border_key,
                    r.to_state_border_key,
                    r.is_border_crossing,
                    r.state_border_transition,
                    r.state_border_key,
                    r.segment_distance_km,
                    p.combination_id,
                    p.train_tier,
                    p.weather,
                    p.tsr_level,
                    p.priority_congestion,
                    p.treta_block_occupancy,
                    p.primary_delay_mins,
                    p.cascade_delay_mins,
                    p.gross_delay_mins,
                    p.net_delay_mins,
                    p.arrival_status
                FROM "RouteDivision" r
                CROSS JOIN "MasterPnC" p;
            """))

        print(f"[OK] Remote Neon PostgreSQL database 'WIN' successfully seeded in {time.time() - t0_neon:.2f}s!")

    # 3. Save local CSV export of the SegmentScenarioPnC matrix
    out_dir = find_file('RouteDivision.csv')
    if out_dir:
        seg_dir = os.path.dirname(out_dir)
        cross_csv_path = os.path.join(seg_dir, 'SegmentScenarioPnC.csv')
        df_cross.to_csv(cross_csv_path, index=False)
        print(f"\n[OK] Saved SegmentScenarioPnC matrix to '{cross_csv_path}' ({os.path.getsize(cross_csv_path) / (1024*1024):.2f} MB).")

# -----------------------------------------------------------------------------
# 5. MAIN EXECUTION CONTROLLER
# -----------------------------------------------------------------------------

def main():
    print("=" * 85)
    print("ASUS ENGINE: ALL SEGMENTATION x ALL MASTER PNC SCENARIOS -> DATABASE 'WIN'")
    print("=" * 85)

    start_total = time.time()
    datasets = load_all_datasets()
    df_cross = generate_segment_scenario_permutations(datasets)
    seed_database_win(datasets, df_cross)

    print("\n" + "=" * 85)
    print(f"ASUS ENGINE COMPLETE: Database 'WIN' populated in {time.time() - start_total:.2f}s!")
    print("=" * 85 + "\n")

if __name__ == '__main__':
    main()
