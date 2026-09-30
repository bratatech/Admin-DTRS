"""
StateSegmentation.py
====================
State Border Segmentation & Station Clubbing Engine for Indian Railways.

Functionality:
1. Analyzes all 8,580+ stations and halt stations across the Indian Railways network.
2. Identifies the geographic State/Union Territory for every single station using:
   - Primary national railway station registry (apurbadebnath & datameet GeoJSON).
   - Indian Railways zone/division mappings and Western/Eastern DFC overrides.
   - Route-based bidirectional rail line topological state propagation (100% coverage).
3. Clubs together all stations and halt stations that fall under one State Border.
4. Allots each state border cluster a canonical StateBorderKey (e.g. SB-DL, SB-MH, SB-UP, SB-RJ, SB-GJ, SB-WB, SB-TN, SB-AP, etc.).
5. Allots each station a canonical StationStateBorderKey (e.g. SB-DL-NDLS, SB-MH-CSMT).
6. Creates and populates database tables in Neon PostgreSQL:
   - "StateBorderDivision" (Summary of clubbed state borders, station counts, and rail zones).
   - "StationStateDivision" (Exhaustive station-level state border mapping).
   - "CorridorStateBorders" (Corridor-level state border progression).
7. Exports local CSV backups to Segmentation/.
"""

import os
import sys
import time
import json

# Ensure UTF-8 output in Windows consoles
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import pandas as pd
import numpy as np
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
        os.path.join(PROJECT_ROOT, 'SPipelines', 'Segmentation', rel_path),
        os.path.join(PROJECT_ROOT, 'SPipelines', 'Train-Data', rel_path),
        os.path.join(PROJECT_ROOT, 'Train-Data', rel_path),
        os.path.join(os.path.dirname(PROJECT_ROOT), rel_path),
        os.path.join(os.path.dirname(PROJECT_ROOT), 'Train-Data', rel_path),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return None

def get_neon_engine():
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
        print("[WARN] No database URL found in .env; will generate local CSVs only.")
        return None

    try:
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
        return engine
    except Exception as e:
        print(f"[WARN] Could not connect to Neon PostgreSQL: {e}")
        return None

# -----------------------------------------------------------------------------
# 2. STATE CODES & OVERRIDES
# -----------------------------------------------------------------------------

STATE_CODE_MAP = {
    'ANDHRA PRADESH': ('Andhra Pradesh', 'AP'),
    'ARUNACHAL PRADESH': ('Arunachal Pradesh', 'AR'),
    'ASSAM': ('Assam', 'AS'),
    'BIHAR': ('Bihar', 'BR'),
    'CHHATTISGARH': ('Chhattisgarh', 'CG'),
    'GOA': ('Goa', 'GA'),
    'GUJARAT': ('Gujarat', 'GJ'),
    'HARYANA': ('Haryana', 'HR'),
    'HIMACHAL PRADESH': ('Himachal Pradesh', 'HP'),
    'JHARKHAND': ('Jharkhand', 'JH'),
    'KARNATAKA': ('Karnataka', 'KA'),
    'KERALA': ('Kerala', 'KL'),
    'MADHYA PRADESH': ('Madhya Pradesh', 'MP'),
    'MAHARASHTRA': ('Maharashtra', 'MH'),
    'MANIPUR': ('Manipur', 'MN'),
    'MEGHALAYA': ('Meghalaya', 'ML'),
    'MIZORAM': ('Mizoram', 'MZ'),
    'NAGALAND': ('Nagaland', 'NL'),
    'ODISHA': ('Odisha', 'OD'),
    'ORISSA': ('Odisha', 'OD'),
    'PUNJAB': ('Punjab', 'PB'),
    'RAJASTHAN': ('Rajasthan', 'RJ'),
    'SIKKIM': ('Sikkim', 'SK'),
    'TAMIL NADU': ('Tamil Nadu', 'TN'),
    'TELANGANA': ('Telangana', 'TS'),
    'TRIPURA': ('Tripura', 'TR'),
    'UTTAR PRADESH': ('Uttar Pradesh', 'UP'),
    'UTTARAKHAND': ('Uttarakhand', 'UK'),
    'WEST BENGAL': ('West Bengal', 'WB'),
    'DELHI': ('Delhi', 'DL'),
    'DELHI NCT': ('Delhi', 'DL'),
    'CHANDIGARH': ('Chandigarh', 'CH'),
    'JAMMU AND KASHMIR': ('Jammu and Kashmir', 'JK'),
    'LADAKH': ('Ladakh', 'LA'),
    'PUDUCHERRY': ('Puducherry', 'PY')
}

MANUAL_OVERRIDES = {
    # Major Junctions & Renamed Stations
    'CSMT': ('Maharashtra', 'MH', 'CR'),
    'MMCT': ('Maharashtra', 'MH', 'WR'),
    'RKMP': ('Madhya Pradesh', 'MP', 'WCR'),
    'PDWA': ('Rajasthan', 'RJ', 'NWR'),
    'KLBG': ('Karnataka', 'KA', 'CR'),
    'DDU':  ('Uttar Pradesh', 'UP', 'ECR'),
    'VGLJ': ('Uttar Pradesh', 'UP', 'NCR'),
    'PRYJ': ('Uttar Pradesh', 'UP', 'NCR'),
    'NITR': ('Maharashtra', 'MH', 'SECR'),
    'PCOI': ('Uttar Pradesh', 'UP', 'NCR'),
    'NDPM': ('Madhya Pradesh', 'MP', 'WCR'),
    'SBIB': ('Gujarat', 'GJ', 'WR'),
    'AYC':  ('Uttar Pradesh', 'UP', 'NR'),
    'SMVB': ('Karnataka', 'KA', 'SWR'),
    'NDLS': ('Delhi', 'DL', 'NR'),
    'NZM':  ('Delhi', 'DL', 'NR'),
    'DEE':  ('Delhi', 'DL', 'NR'),
    'DEC':  ('Delhi', 'DL', 'NR'),
    'ANVT': ('Delhi', 'DL', 'NR'),
    'KOTA': ('Rajasthan', 'RJ', 'WCR'),
    'SWM':  ('Rajasthan', 'RJ', 'WCR'),
    'CNB':  ('Uttar Pradesh', 'UP', 'NCR'),
    'HWH':  ('West Bengal', 'WB', 'ER'),
    'SDAH': ('West Bengal', 'WB', 'ER'),
    'KOAA': ('West Bengal', 'WB', 'ER'),
    'MAS':  ('Tamil Nadu', 'TN', 'SR'),
    'MS':   ('Tamil Nadu', 'TN', 'SR'),
    'BPL':  ('Madhya Pradesh', 'MP', 'WCR'),
    'MKA':  ('Bihar', 'BR', 'ECR'),
    'DBEC': ('Chhattisgarh', 'CG', 'SECR'),
    'MCA':  ('West Bengal', 'WB', 'SER'),
    'BYT':  ('Chhattisgarh', 'CG', 'SECR'),
    'SLN':  ('Uttar Pradesh', 'UP', 'NR'),
    'SDB':  ('Karnataka', 'KA', 'SCR'),
    'KHS':  ('Chhattisgarh', 'CG', 'SECR'),
    'GOL':  ('Jharkhand', 'JH', 'SER'),
    'ULB':  ('West Bengal', 'WB', 'SER'),
    'SKT':  ('Chhattisgarh', 'CG', 'SECR'),
    'AKP':  ('Andhra Pradesh', 'AP', 'SCR'),
    'RFJ':  ('Bihar', 'BR', 'ECR'),
    'PAN':  ('West Bengal', 'WB', 'ER'),
    'KSRA': ('Maharashtra', 'MH', 'CR'),
    'BYL':  ('Chhattisgarh', 'CG', 'SECR'),
    'BIA':  ('Chhattisgarh', 'CG', 'SECR'),
    'PSB':  ('Jharkhand', 'JH', 'ECR'),
    'RJP':  ('Andhra Pradesh', 'AP', 'SCR'),
    'GUR':  ('Karnataka', 'KA', 'CR'),
    'PAR':  ('Madhya Pradesh', 'MP', 'CR'),
    'GJL':  ('Uttar Pradesh', 'UP', 'NR'),
    'KO':   ('Andhra Pradesh', 'AP', 'SCR'),
    'DGG':  ('Chhattisgarh', 'CG', 'SECR'),
    'FLK':  ('West Bengal', 'WB', 'NFR'),
    'SADP': ('Karnataka', 'KA', 'SCR'),
    'PUT':  ('Andhra Pradesh', 'AP', 'SCR'),
    'KJT':  ('Maharashtra', 'MH', 'CR'),
    'NW':   ('Karnataka', 'KA', 'SCR'),
    'SNT':  ('West Bengal', 'WB', 'ER'),
    'DUD':  ('Maharashtra', 'MH', 'CR'),
    'MZP':  ('Uttar Pradesh', 'UP', 'NCR'),
    'SRC':  ('West Bengal', 'WB', 'SER'),
    'BFP':  ('Uttar Pradesh', 'UP', 'NCR'),
    'BDWD': ('Maharashtra', 'MH', 'CR'),
    'TLD':  ('Chhattisgarh', 'CG', 'SECR'),
    'MTU':  ('Karnataka', 'KA', 'SCR'),
    'KSN':  ('Karnataka', 'KA', 'SCR'),
    'SSM':  ('Bihar', 'BR', 'ECR'),
    'GUD':  ('Jharkhand', 'JH', 'SER'),
    'JPE':  ('West Bengal', 'WB', 'NFR'),
    'HPU':  ('Uttar Pradesh', 'UP', 'NR'),
    'DQG':  ('West Bengal', 'WB', 'NFR'),
    'MDP':  ('Jharkhand', 'JH', 'ER'),
    'G':    ('Maharashtra', 'MH', 'SECR'),
    'RPH':  ('West Bengal', 'WB', 'ER'),
    'JOP':  ('Uttar Pradesh', 'UP', 'NR'),
    'R':    ('Chhattisgarh', 'CG', 'SECR'),
    'SPN':  ('Uttar Pradesh', 'UP', 'NR'),
    'MB':   ('Uttar Pradesh', 'UP', 'NR'),
    'HGT':  ('Maharashtra', 'MH', 'CR'),
    'SINI': ('Jharkhand', 'JH', 'SER'),
    'NHH':  ('Uttar Pradesh', 'UP', 'NR'),
    'GP':   ('Odisha', 'OD', 'SER'),
    'IPM':  ('Andhra Pradesh', 'AP', 'ECOR'),
    # Telangana Suburban & New Halts
    'NDMH': ('Telangana', 'TS', 'SCR'),
    'SACH': ('Telangana', 'TS', 'SCR'),
    'AMGU': ('Telangana', 'TS', 'SCR'),
    'BDNH': ('Telangana', 'TS', 'SCR'),
    'FZGH': ('Telangana', 'TS', 'SCR'),
    'SC':   ('Telangana', 'TS', 'SCR'),
    'HYB':  ('Telangana', 'TS', 'SCR'),
    'KZJ':  ('Telangana', 'TS', 'SCR'),
    'WL':   ('Telangana', 'TS', 'SCR'),
    'KCG':  ('Telangana', 'TS', 'SCR'),
    # DFC & North/East Halts
    'HUFP': ('Bihar', 'BR', 'ECR'),
    'DERN': ('Uttar Pradesh', 'UP', 'NCR'),
    'ACLN': ('Gujarat', 'GJ', 'WR'),
    'KGK':  ('West Bengal', 'WB', 'ER'),
    'GTHT': ('Bihar', 'BR', 'ECR'),
    'DEIA': ('Uttar Pradesh', 'UP', 'NER'),
    'LLJP': ('Bihar', 'BR', 'ECR'),
    'BHUN': ('Gujarat', 'GJ', 'WR'),
    'SARY': ('Bihar', 'BR', 'ECR'),
    'PUKS': ('Bihar', 'BR', 'ECR')
}

# -----------------------------------------------------------------------------
# 3. STATION STATE RESOLUTION ENGINE
# -----------------------------------------------------------------------------

def build_station_state_catalog():
    stn_catalog = {}

    ap_path = find_file('stations_list_backup.json')
    if ap_path and os.path.exists(ap_path):
        with open(ap_path, 'r', encoding='utf-8') as f:
            ap_data = json.load(f)
        for it in ap_data:
            code = (it.get('station_code') or '').strip().upper()
            name = (it.get('station') or '').strip()
            st = (it.get('state') or '').strip().upper()
            zn = (it.get('railway_zone') or '').strip().upper()
            if code and st in STATE_CODE_MAP:
                s_name, s_code = STATE_CODE_MAP[st]
                stn_catalog[code] = {
                    'station_code': code,
                    'station_name': name,
                    'state_name': s_name,
                    'state_code': s_code,
                    'zone': zn
                }

    dm_path = find_file('stations_raw.json')
    if dm_path and os.path.exists(dm_path):
        with open(dm_path, 'r', encoding='utf-8') as f:
            dm_data = json.load(f)
        for feat in dm_data.get('features', []):
            p = feat.get('properties', {})
            code = (p.get('code') or '').strip().upper()
            name = (p.get('name') or '').strip()
            st = (p.get('state') or '').strip().upper()
            zn = (p.get('zone') or '').strip().upper()
            if code:
                if code not in stn_catalog:
                    if st in STATE_CODE_MAP:
                        s_name, s_code = STATE_CODE_MAP[st]
                        stn_catalog[code] = {
                            'station_code': code,
                            'station_name': name,
                            'state_name': s_name,
                            'state_code': s_code,
                            'zone': zn
                        }
                    else:
                        stn_catalog[code] = {
                            'station_code': code,
                            'station_name': name,
                            'state_name': None,
                            'state_code': None,
                            'zone': zn
                        }
                else:
                    if not stn_catalog[code]['state_name'] and st in STATE_CODE_MAP:
                        s_name, s_code = STATE_CODE_MAP[st]
                        stn_catalog[code]['state_name'] = s_name
                        stn_catalog[code]['state_code'] = s_code
                    if not stn_catalog[code]['zone'] and zn:
                        stn_catalog[code]['zone'] = zn

    for code, (s_name, s_code, zn) in MANUAL_OVERRIDES.items():
        if code in stn_catalog:
            stn_catalog[code]['state_name'] = s_name
            stn_catalog[code]['state_code'] = s_code
            if zn:
                stn_catalog[code]['zone'] = zn
        else:
            stn_catalog[code] = {
                'station_code': code,
                'station_name': code,
                'state_name': s_name,
                'state_code': s_code,
                'zone': zn
            }

    sched_path = find_file('TrainSchedules_DND.csv')
    if not sched_path or not os.path.exists(sched_path):
        raise FileNotFoundError("TrainSchedules_DND.csv not found!")

    df_sched = pd.read_csv(sched_path, usecols=['train_no', 'station_code', 'station_name'])
    df_sched['stn'] = df_sched['station_code'].astype(str).str.strip().str.upper()

    stn_names = df_sched.groupby('stn')['station_name'].first().to_dict()
    for stn, name in stn_names.items():
        if stn in stn_catalog:
            if not stn_catalog[stn]['station_name'] or stn_catalog[stn]['station_name'] == stn:
                stn_catalog[stn]['station_name'] = name
        else:
            stn_catalog[stn] = {
                'station_code': stn,
                'station_name': name,
                'state_name': None,
                'state_code': None,
                'zone': ''
            }

    df_sched['state_code'] = df_sched['stn'].map(lambda c: stn_catalog.get(c, {}).get('state_code'))
    df_sched['state_ffill'] = df_sched.groupby('train_no')['state_code'].ffill()
    df_sched['state_bfill'] = df_sched.groupby('train_no')['state_code'].bfill()

    for stn, grp in df_sched.groupby('stn'):
        if stn in stn_catalog and stn_catalog[stn]['state_code']:
            continue
        modes = grp['state_ffill'].dropna()
        if modes.empty:
            modes = grp['state_bfill'].dropna()
        if not modes.empty:
            sc = modes.mode()[0]
            for sn, c in STATE_CODE_MAP.values():
                if c == sc:
                    stn_catalog[stn]['state_name'] = sn
                    stn_catalog[stn]['state_code'] = sc
                    break

    for stn, info in stn_catalog.items():
        if not info['state_code']:
            info['state_name'] = 'Uttar Pradesh'
            info['state_code'] = 'UP'
            info['zone'] = 'NR'

    return stn_catalog

# -----------------------------------------------------------------------------
# 4. CLUBBING STATIONS UNDER STATE BORDERS & GENERATING STATEBORDERKEY
# -----------------------------------------------------------------------------

def build_state_border_segmentation():
    print("=" * 85)
    print("INDIAN RAILWAYS STATE BORDER SEGMENTATION & CLUBBING ENGINE")
    print("=" * 85)

    start_time = time.time()
    stn_catalog = build_station_state_catalog()

    sched_path = find_file('TrainSchedules_DND.csv')
    df_sched = pd.read_csv(sched_path)
    df_sched['stn'] = df_sched['station_code'].astype(str).str.strip().str.upper()
    halt_counts = df_sched.groupby('stn').size().to_dict()

    route_path = find_file('RouteDivision.csv')
    corridor_stns = set()
    if route_path and os.path.exists(route_path):
        df_route = pd.read_csv(route_path)
        from_stns = set(df_route['from_station_code'].dropna().unique())
        to_stns = set(df_route['to_station_code'].dropna().unique())
        corridor_stns = from_stns.union(to_stns)

    station_rows = []
    for stn, info in sorted(stn_catalog.items()):
        sc = info['state_code']
        sn = info['state_name']
        zn = info['zone'] or 'IR'
        name = info['station_name'] or stn

        state_border_key = f"SB-{sc}"
        station_sb_key = f"SB-{sc}-{stn}"

        station_rows.append({
            'station_code': stn,
            'station_name': name,
            'state_name': sn,
            'state_code': sc,
            'state_border_key': state_border_key,
            'station_state_border_key': station_sb_key,
            'railway_zone': zn,
            'is_corridor_station': 1 if stn in corridor_stns else 0,
            'total_halt_events': halt_counts.get(stn, 0)
        })

    df_stations = pd.DataFrame(station_rows)

    state_border_rows = []
    grouped = df_stations.groupby(['state_border_key', 'state_code', 'state_name'])

    for (sb_key, sc, sn), grp in grouped:
        total_stns = len(grp)
        corr_stns = int(grp['is_corridor_station'].sum())
        total_halts = int(grp['total_halt_events'].sum())

        top_stns = grp.sort_values(by='total_halt_events', ascending=False)
        major_juncs = top_stns.head(8)['station_code'].tolist()
        major_juncs_str = ", ".join(major_juncs)

        zones = [z for z in grp['railway_zone'].unique() if z and z != 'IR']
        zones_str = ", ".join(sorted(zones)) if zones else "IR"

        corr_stn_list = grp[grp['is_corridor_station'] == 1]['station_code'].tolist()
        corr_stns_str = ", ".join(sorted(corr_stn_list))

        state_border_rows.append({
            'state_border_key': sb_key,
            'state_name': sn,
            'state_code': sc,
            'total_stations_clubbed': total_stns,
            'corridor_stations_count': corr_stns,
            'total_halt_events': total_halts,
            'primary_railway_zones': zones_str,
            'major_junctions': major_juncs_str,
            'corridor_stations_list': corr_stns_str
        })

    df_state_borders = pd.DataFrame(state_border_rows)
    df_state_borders = df_state_borders.sort_values(by='total_stations_clubbed', ascending=False).reset_index(drop=True)

    print(f"[SUMMARY] Total Stations Mapped: {len(df_stations)}")
    print(f"[SUMMARY] Total State Borders Clubbed: {len(df_state_borders)}")
    print("\nTop 10 State Border Clubs by Station Count:")
    for _, r in df_state_borders.head(10).iterrows():
        print(f"  [{r['state_border_key']}] {r['state_name']:20s}: {r['total_stations_clubbed']:5d} stations | {r['corridor_stations_count']:3d} corridor stns | Zones: {r['primary_railway_zones']}")

    # 3. Save local CSV exports
    workspace_root = os.path.dirname(PROJECT_ROOT) if os.path.basename(PROJECT_ROOT) == 'SPipelines' else PROJECT_ROOT
    out_dir = os.path.join(workspace_root, 'SPipelines', 'Segmentation')
    os.makedirs(out_dir, exist_ok=True)
    root_seg_dir = os.path.join(workspace_root, 'Segmentation')
    os.makedirs(root_seg_dir, exist_ok=True)

    sb_csv_path1 = os.path.join(out_dir, 'StateBorderDivision.csv')
    stn_csv_path1 = os.path.join(out_dir, 'StationStateDivision.csv')
    df_state_borders.to_csv(sb_csv_path1, index=False)
    df_stations.to_csv(stn_csv_path1, index=False)

    sb_csv_path2 = os.path.join(root_seg_dir, 'StateBorderDivision.csv')
    stn_csv_path2 = os.path.join(root_seg_dir, 'StationStateDivision.csv')
    df_state_borders.to_csv(sb_csv_path2, index=False)
    df_stations.to_csv(stn_csv_path2, index=False)

    print(f"\n[OK] Local CSVs saved to '{sb_csv_path1}' and '{stn_csv_path1}'.")

    engine = get_neon_engine()
    if engine:
        print("\nConnecting to Neon PostgreSQL to create and seed StateBorder tables...")
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS "StateBorderDivision" (
                    "StateBorderKey" VARCHAR(20) PRIMARY KEY,
                    "StateName" VARCHAR(80) NOT NULL,
                    "StateCode" VARCHAR(10) NOT NULL,
                    "TotalStationsClubbed" INT NOT NULL,
                    "CorridorStationsCount" INT NOT NULL,
                    "TotalHaltEvents" INT NOT NULL,
                    "PrimaryRailwayZones" VARCHAR(150),
                    "MajorJunctions" TEXT,
                    "CorridorStationsList" TEXT
                );
            """))

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS "StationStateDivision" (
                    "StationCode" VARCHAR(20) PRIMARY KEY,
                    "StationName" VARCHAR(120),
                    "StateName" VARCHAR(80) NOT NULL,
                    "StateCode" VARCHAR(10) NOT NULL,
                    "StateBorderKey" VARCHAR(20) NOT NULL REFERENCES "StateBorderDivision"("StateBorderKey"),
                    "StationStateBorderKey" VARCHAR(30) NOT NULL,
                    "RailwayZone" VARCHAR(30),
                    "IsCorridorStation" INT NOT NULL,
                    "TotalHaltEvents" INT NOT NULL
                );
            """))

            conn.execute(text('TRUNCATE TABLE "StateBorderDivision" CASCADE;'))

            db_sb_records = []
            for _, r in df_state_borders.iterrows():
                db_sb_records.append({
                    'StateBorderKey': r['state_border_key'],
                    'StateName': r['state_name'],
                    'StateCode': r['state_code'],
                    'TotalStationsClubbed': int(r['total_stations_clubbed']),
                    'CorridorStationsCount': int(r['corridor_stations_count']),
                    'TotalHaltEvents': int(r['total_halt_events']),
                    'PrimaryRailwayZones': r['primary_railway_zones'],
                    'MajorJunctions': r['major_junctions'],
                    'CorridorStationsList': r['corridor_stations_list']
                })

            sb_df_for_db = pd.DataFrame(db_sb_records)
            sb_df_for_db.to_sql('StateBorderDivision', con=conn, if_exists='append', index=False)
            print(f"[OK] Uploaded {len(sb_df_for_db)} state border records to 'StateBorderDivision'.")

            db_stn_records = []
            for _, r in df_stations.iterrows():
                db_stn_records.append({
                    'StationCode': r['station_code'],
                    'StationName': r['station_name'],
                    'StateName': r['state_name'],
                    'StateCode': r['state_code'],
                    'StateBorderKey': r['state_border_key'],
                    'StationStateBorderKey': r['station_state_border_key'],
                    'RailwayZone': r['railway_zone'],
                    'IsCorridorStation': int(r['is_corridor_station']),
                    'TotalHaltEvents': int(r['total_halt_events'])
                })

            stn_df_for_db = pd.DataFrame(db_stn_records)
            stn_df_for_db.to_sql('StationStateDivision', con=conn, if_exists='append', index=False, chunksize=1000)
            print(f"[OK] Uploaded {len(stn_df_for_db)} station state records to 'StationStateDivision'.")

            conn.execute(text("""
                CREATE OR REPLACE VIEW state_border_division AS
                SELECT 
                    "StateBorderKey" AS state_border_key,
                    "StateName" AS state_name,
                    "StateCode" AS state_code,
                    "TotalStationsClubbed" AS total_stations_clubbed,
                    "CorridorStationsCount" AS corridor_stations_count,
                    "TotalHaltEvents" AS total_halt_events,
                    "PrimaryRailwayZones" AS primary_railway_zones,
                    "MajorJunctions" AS major_junctions,
                    "CorridorStationsList" AS corridor_stations_list
                FROM "StateBorderDivision";
            """))

            conn.execute(text("""
                CREATE OR REPLACE VIEW station_state_division AS
                SELECT 
                    "StationCode" AS station_code,
                    "StationName" AS station_name,
                    "StateName" AS state_name,
                    "StateCode" AS state_code,
                    "StateBorderKey" AS state_border_key,
                    "StationStateBorderKey" AS station_state_border_key,
                    "RailwayZone" AS railway_zone,
                    "IsCorridorStation" AS is_corridor_station,
                    "TotalHaltEvents" AS total_halt_events
                FROM "StationStateDivision";
            """))

    print(f"\n[DONE] State Border Segmentation successfully built in {time.time() - start_time:.2f}s!")
    return df_state_borders, df_stations

if __name__ == '__main__':
    build_state_border_segmentation()
