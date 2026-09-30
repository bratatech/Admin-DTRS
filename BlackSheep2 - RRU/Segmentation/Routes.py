"""
Routes.py
=========
Corridor Segmentation & RouteDivision Engine for Indian Railways.

Divides major Golden Quadrilateral & National Trunk Corridors into distinct segments:
  1. Delhi → Mumbai
  2. Delhi → Howrah
  3. Delhi → Chennai
  4. Mumbai → Chennai
  5. Mumbai → Howrah
  6. Howrah → Chennai
  7. Howrah → Guwahati

Each segment along each corridor is calculated as:
  - Segment 1: Source to Halt 1 (SOURCE_TO_HALT1)
  - Intermediate Segments: Halt k-1 to Halt k (INTERMEDIATE_HALT)
  - Final Segment: Halt n to Destination (HALTN_TO_DESTINATION)

Each segment is assigned:
  - Canonical TretaSegmentNumber: TS-{CORRIDOR_SLUG}-{TRAIN_NO}-{SEG_SEQ:03d} (e.g. TS-DEL-MUM-12952-001)
  - State Border Attribution: from_state, from_state_code, from_state_border_key,
                              to_state, to_state_code, to_state_border_key,
                              is_border_crossing, state_border_transition, state_border_key

Creates and populates table 'RouteDivision' and 'CorridorStateBorders' in Neon PostgreSQL and exports local CSVs.
"""

import os
import sys
import time

# Ensure UTF-8 output in Windows consoles
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import pandas as pd
from sqlalchemy import create_engine, text

# -----------------------------------------------------------------------------
# 1. PATH CONFIGURATION & DATABASE SETUP
# -----------------------------------------------------------------------------

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..'))

def find_file(rel_path):
    candidates = [
        os.path.join(CURRENT_DIR, rel_path),
        os.path.join(PROJECT_ROOT, rel_path),
        os.path.join(PROJECT_ROOT, 'Train-Data', rel_path),
        os.path.join(PROJECT_ROOT, 'SPipelines', 'Segmentation', rel_path),
        os.path.join(PROJECT_ROOT, 'SPipelines', 'Train-Data', rel_path),
        os.path.join(os.path.dirname(PROJECT_ROOT), rel_path),
        os.path.join(os.path.dirname(PROJECT_ROOT), 'Train-Data', rel_path),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return None

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

NEON_DATABASE_URL = os.getenv('POSTGRESQL') or os.getenv('DATABASE_URL') or os.getenv('NEON_URL')
if not NEON_DATABASE_URL:
    raise ValueError("Database connection URL (POSTGRESQL or DATABASE_URL) not found in .env!")

# Import StateBorder Catalog Builder
try:
    from StateSegmentation import build_station_state_catalog
except ImportError:
    try:
        from SPipelines.Segmentation.StateSegmentation import build_station_state_catalog
    except ImportError:
        from Segmentation.StateSegmentation import build_station_state_catalog

# -----------------------------------------------------------------------------
# 2. CORRIDOR DEFINITIONS & STATION CLUSTERS
# -----------------------------------------------------------------------------

CORRIDORS = [
    ("Delhi → Mumbai", "DEL-MUM"),
    ("Delhi → Howrah", "DEL-HWH"),
    ("Delhi → Chennai", "DEL-MAS"),
    ("Mumbai → Chennai", "MUM-MAS"),
    ("Mumbai → Howrah", "MUM-HWH"),
    ("Howrah → Chennai", "HWH-MAS"),
    ("Howrah → Guwahati", "HWH-GHY")
]

CITY_STATION_CLUSTERS = {
    'DEL': {'NDLS', 'NZM', 'DLI', 'DEE', 'ANVT', 'DEC'},
    'MUM': {'BCT', 'MMCT', 'BDTS', 'CSMT', 'CSTM', 'DR', 'LTT', 'KYN', 'PNVL', 'BVI'},
    'HWH': {'HWH', 'SDAH', 'KOAA', 'SHM', 'SRC'},
    'MAS': {'MAS', 'MS', 'TBM', 'PER'},
    'GHY': {'GHY', 'KYQ', 'NGC'}
}

# -----------------------------------------------------------------------------
# 3. ROUTE DIVISION & STATE BORDER COMPUTATION
# -----------------------------------------------------------------------------

def build_route_divisions():
    print("=" * 85)
    print("INDIAN RAILWAYS CORRIDOR SEGMENTATION ENGINE (ROUTE DIVISION & STATE BORDERS)")
    print("=" * 85)

    schedules_csv = find_file('TrainSchedules_DND.csv')
    metadata_csv = find_file('TrainsMetadata_DND.csv')

    if not schedules_csv or not metadata_csv:
        raise FileNotFoundError(f"Input datasets not found! schedules: {schedules_csv}, metadata: {metadata_csv}")

    print(f"Loading schedules from '{schedules_csv}'...")
    sched_df = pd.read_csv(schedules_csv)

    print(f"Loading metadata from '{metadata_csv}'...")
    meta_df = pd.read_csv(metadata_csv)

    ea_csv = find_file('EACalculation.csv')
    tier_map = {}
    if ea_csv:
        ea_df = pd.read_csv(ea_csv, usecols=['train_no', 'train_tier'])
        ea_df['train_no'] = ea_df['train_no'].astype(str).str.strip().str.lstrip('0')
        for _, r in ea_df.iterrows():
            raw_t = str(r['train_tier']).strip()
            tier_map[r['train_no']] = 'T3_EXPRESS_PASSENGER' if raw_t in ['T3_EXPRESS', 'T3_EXPRESS_PASSENGER', 'T3'] else raw_t

    # Clean train numbers
    sched_df['train_no'] = sched_df['train_no'].astype(str).str.strip().str.lstrip('0')
    meta_df['train_no'] = meta_df['train_no'].astype(str).str.strip().str.lstrip('0')

    # Resolve station state borders catalog
    print("\nResolving station state borders catalog across all network stations...")
    stn_catalog = build_station_state_catalog()

    # Identify source and destination stations per train from schedules
    sched_sorted = sched_df.sort_values(by=['train_no', 'sr_no'])
    first_last = sched_sorted.groupby('train_no').agg(
        first_stn=('station_code', 'first'),
        last_stn=('station_code', 'last')
    ).reset_index()

    train_meta_map = meta_df.drop_duplicates(subset=['train_no']).set_index('train_no')['train_name'].to_dict()

    division_records = []
    global_seq = 1


    # Key flagship corridor trains that operate on these corridors
    EXTRA_FLAGSHIPS = {
        'DEL-MAS': ['12001', '12002', '12625', '12626'],
        'DEL-MUM': ['12953', '12954', '12009', '12010'],
        'DEL-HWH': ['12003', '12004', '12303', '12304'],
        'MUM-HWH': ['12859', '12860'],
        'HWH-MAS': ['12841', '12842'],
        'HWH-GHY': ['12345', '12346']
    }

    all_sched_trains = set(sched_sorted['train_no'].unique())

    for c_name, c_slug in CORRIDORS:
        src_city, dst_city = c_slug.split('-')
        src_stns = CITY_STATION_CLUSTERS[src_city]
        dst_stns = CITY_STATION_CLUSTERS[dst_city]

        # 1. Forward direction direct trains
        fwd_trains = first_last[
            first_last['first_stn'].isin(src_stns) & 
            first_last['last_stn'].isin(dst_stns)
        ]['train_no'].tolist()

        # 2. Reverse direction direct trains
        rev_trains = first_last[
            first_last['first_stn'].isin(dst_stns) & 
            first_last['last_stn'].isin(src_stns)
        ]['train_no'].tolist()

        # 3. Extra flagship trains operating along this corridor
        extra_trains = [t for t in EXTRA_FLAGSHIPS.get(c_slug, []) if t in all_sched_trains]

        # Combine uniquely while preserving order
        corridor_trains = list(dict.fromkeys(fwd_trains + rev_trains + extra_trains))

        print(f"\n[CORRIDOR: {c_name} ({c_slug})] Found {len(corridor_trains)} trains (Forward: {len(fwd_trains)}, Reverse: {len(rev_trains)}, Flagships: {len(extra_trains)})")

        for t_no in corridor_trains:
            t_name = train_meta_map.get(t_no, f"TRAIN-{t_no}")
            t_halts = sched_sorted[sched_sorted['train_no'] == t_no].reset_index(drop=True)
            num_stops = len(t_halts)

            if num_stops < 2:
                continue

            for idx in range(num_stops - 1):
                from_row = t_halts.iloc[idx]
                to_row = t_halts.iloc[idx + 1]
                seg_seq = idx + 1

                # Segment categorization
                if idx == 0:
                    seg_type = 'SOURCE_TO_HALT1'
                elif idx == num_stops - 2:
                    seg_type = 'HALTN_TO_DESTINATION'
                else:
                    seg_type = 'INTERMEDIATE_HALT'

                # Formulate TretaSegmentNumber:
                # Format: TS-{CORRIDOR_SLUG}-{TRAIN_NO}-{SEG_SEQ:03d}
                treta_seg_no = f"TS-{c_slug}-{t_no}-{seg_seq:03d}"

                dist_from = float(from_row['dist_km']) if str(from_row['dist_km']).replace('.', '', 1).isdigit() else 0.0
                dist_to = float(to_row['dist_km']) if str(to_row['dist_km']).replace('.', '', 1).isdigit() else dist_from
                seg_dist = max(0.0, round(dist_to - dist_from, 1))

                f_code = str(from_row['station_code']).strip().upper()
                t_code = str(to_row['station_code']).strip().upper()

                f_info = stn_catalog.get(f_code, {'state_name': 'Unknown', 'state_code': 'UN'})
                t_info = stn_catalog.get(t_code, {'state_name': 'Unknown', 'state_code': 'UN'})

                f_st_name = f_info['state_name']
                f_st_code = f_info['state_code']
                f_sb_key = f"SB-{f_st_code}"

                t_st_name = t_info['state_name']
                t_st_code = t_info['state_code']
                t_sb_key = f"SB-{t_st_code}"

                is_xing = 1 if f_st_code != t_st_code else 0
                sb_trans = f"SB-{f_st_code}->SB-{t_st_code}" if is_xing else f"INTRA-SB-{f_st_code}"
                sb_key = f"SB-{f_st_code}" if not is_xing else f"SB-XING-{f_st_code}-{t_st_code}"

                division_records.append({
                    'id': global_seq,
                    'corridor': c_name,
                    'corridor_slug': c_slug,
                    'train_no': t_no,
                    'train_name': t_name,
                    'train_tier': tier_map.get(t_no, 'T3_EXPRESS_PASSENGER'),
                    'segment_sequence': seg_seq,
                    'treta_segment_number': treta_seg_no,
                    'from_station_code': f_code,
                    'from_station_name': from_row['station_name'],
                    'from_state': f_st_name,
                    'from_state_code': f_st_code,
                    'from_state_border_key': f_sb_key,
                    'to_station_code': t_code,
                    'to_station_name': to_row['station_name'],
                    'to_state': t_st_name,
                    'to_state_code': t_st_code,
                    'to_state_border_key': t_sb_key,
                    'is_border_crossing': is_xing,
                    'state_border_transition': sb_trans,
                    'state_border_key': sb_key,
                    'segment_type': seg_type,
                    'dep_time': str(from_row['dep_time']).strip(),
                    'arr_time': str(to_row['arr_time']).strip(),
                    'segment_distance_km': seg_dist,
                    'cumulative_distance_km': dist_to,
                    'day': int(to_row['day']) if str(to_row['day']).isdigit() else 1
                })
                global_seq += 1

    result_df = pd.DataFrame(division_records)
    print(f"\n[SUMMARY] Total segments generated across all 7 corridors: {len(result_df):,}")

    # Display segment type distribution
    print("\nSegment Type Distribution:")
    for st, cnt in result_df['segment_type'].value_counts().items():
        print(f"  {st:25}: {cnt:,} segments")

    # Display state border traversal summary
    print("\nState Border Traversal Summary:")
    print(f"  Intra-State Segments (Within same State Border)    : {(result_df['is_border_crossing'] == 0).sum():,} segments")
    print(f"  Inter-State Segments (Crossing State Border Line) : {(result_df['is_border_crossing'] == 1).sum():,} segments")

    # Save local CSVs
    workspace_root = os.path.dirname(PROJECT_ROOT) if os.path.basename(PROJECT_ROOT) == 'SPipelines' else PROJECT_ROOT
    csv_out1 = os.path.join(workspace_root, 'SPipelines', 'Segmentation', 'RouteDivision.csv')
    csv_out2 = os.path.join(workspace_root, 'Segmentation', 'RouteDivision.csv')
    os.makedirs(os.path.dirname(csv_out1), exist_ok=True)
    os.makedirs(os.path.dirname(csv_out2), exist_ok=True)

    result_df.to_csv(csv_out1, index=False)
    result_df.to_csv(csv_out2, index=False)
    print(f"\n[OK] Local CSV backup saved to '{csv_out1}' ({os.path.getsize(csv_out1) / 1024:.1f} KB).")

    # -------------------------------------------------------------------------
    # 4. BUILD CORRIDOR STATE BORDER PROGRESSION TABLE
    # -------------------------------------------------------------------------
    corridor_state_seq = []
    for c_name, c_slug in CORRIDORS:
        c_df = result_df[result_df['corridor_slug'] == c_slug]
        if c_df.empty:
            continue
        first_train = c_df['train_no'].iloc[0]
        t_df = c_df[c_df['train_no'] == first_train].sort_values('segment_sequence')
        st_codes = [t_df.iloc[0]['from_state_code']] + t_df['to_state_code'].tolist()
        seq = []
        for s in st_codes:
            if not seq or seq[-1] != s:
                seq.append(s)
        seq_str = " -> ".join([f"SB-{s}" for s in seq])
        corridor_state_seq.append({
            'corridor': c_name,
            'corridor_slug': c_slug,
            'total_state_borders_crossed': len(seq) - 1,
            'state_borders_sequence': seq_str,
            'states_list': ", ".join(seq)
        })

    df_corr_states = pd.DataFrame(corridor_state_seq)
    corr_csv1 = os.path.join(workspace_root, 'SPipelines', 'Segmentation', 'CorridorStateBorders.csv')
    corr_csv2 = os.path.join(workspace_root, 'Segmentation', 'CorridorStateBorders.csv')
    df_corr_states.to_csv(corr_csv1, index=False)
    df_corr_states.to_csv(corr_csv2, index=False)

    print("\nCorridor State Border Progression:")
    for _, cr in df_corr_states.iterrows():
        print(f"  {cr['corridor']:20s} ({cr['total_state_borders_crossed']} crossings): {cr['state_borders_sequence']}")

    # -------------------------------------------------------------------------
    # 5. UPLOAD TO NEON POSTGRESQL TABLE 'RouteDivision'
    # -------------------------------------------------------------------------
    print("\nConnecting to Neon PostgreSQL...")
    engine = create_engine(NEON_DATABASE_URL, pool_pre_ping=True)

    with engine.begin() as conn:
        print("Creating table 'RouteDivision' in Neon PostgreSQL...")
        conn.execute(text("""
            DROP TABLE IF EXISTS "RouteDivision" CASCADE;
            DROP TABLE IF EXISTS route_division CASCADE;
            DROP TABLE IF EXISTS "CorridorStateBorders" CASCADE;
            DROP TABLE IF EXISTS corridor_state_borders CASCADE;
            
            CREATE TABLE "RouteDivision" (
                id SERIAL PRIMARY KEY,
                corridor VARCHAR(100) NOT NULL,
                corridor_slug VARCHAR(20) NOT NULL,
                train_no VARCHAR(10) NOT NULL,
                train_name VARCHAR(255),
                train_tier VARCHAR(50),
                segment_sequence INTEGER NOT NULL,
                treta_segment_number VARCHAR(100) NOT NULL,
                from_station_code VARCHAR(20) NOT NULL,
                from_station_name VARCHAR(255),
                from_state VARCHAR(80),
                from_state_code VARCHAR(10),
                from_state_border_key VARCHAR(20),
                to_station_code VARCHAR(20) NOT NULL,
                to_station_name VARCHAR(255),
                to_state VARCHAR(80),
                to_state_code VARCHAR(10),
                to_state_border_key VARCHAR(20),
                is_border_crossing INTEGER NOT NULL DEFAULT 0,
                state_border_transition VARCHAR(50),
                state_border_key VARCHAR(50),
                segment_type VARCHAR(50) NOT NULL,
                dep_time VARCHAR(20),
                arr_time VARCHAR(20),
                segment_distance_km FLOAT,
                cumulative_distance_km FLOAT,
                day INTEGER
            );

            CREATE INDEX idx_routediv_corridor ON "RouteDivision"(corridor);
            CREATE INDEX idx_routediv_train ON "RouteDivision"(train_no);
            CREATE INDEX idx_routediv_segment ON "RouteDivision"(treta_segment_number);
            CREATE INDEX idx_routediv_from_sb ON "RouteDivision"(from_state_border_key);
            CREATE INDEX idx_routediv_to_sb ON "RouteDivision"(to_state_border_key);
            CREATE INDEX idx_routediv_sb_key ON "RouteDivision"(state_border_key);
            CREATE INDEX idx_routediv_crossing ON "RouteDivision"(is_border_crossing);

            -- Lowercase view for case-insensitive querying
            CREATE VIEW route_division AS SELECT * FROM "RouteDivision";

            -- Table for CorridorStateBorders
            CREATE TABLE "CorridorStateBorders" (
                corridor VARCHAR(100) PRIMARY KEY,
                corridor_slug VARCHAR(20) NOT NULL,
                total_state_borders_crossed INTEGER NOT NULL,
                state_borders_sequence TEXT NOT NULL,
                states_list VARCHAR(100) NOT NULL
            );

            CREATE VIEW corridor_state_borders AS SELECT * FROM "CorridorStateBorders";
        """))

    print(f"Uploading {len(result_df):,} segmented route records to Neon PostgreSQL...")
    t0 = time.time()
    result_df.to_sql(
        'RouteDivision',
        con=engine,
        if_exists='append',
        index=False,
        chunksize=2000,
        method='multi'
    )
    print(f"[OK] RouteDivision upload complete in {time.time() - t0:.2f}s!")

    df_corr_states.to_sql(
        'CorridorStateBorders',
        con=engine,
        if_exists='append',
        index=False
    )
    print(f"[OK] Uploaded {len(df_corr_states)} corridor state border records.")

    # Verify row count in Neon
    with engine.connect() as conn:
        db_count = conn.execute(text('SELECT count(*) FROM "RouteDivision";')).scalar()
        print(f"[VERIFY] Neon PostgreSQL table 'RouteDivision' row count: {db_count:,}")

    print("=" * 85 + "\n")
    return result_df

if __name__ == '__main__':
    build_route_divisions()
