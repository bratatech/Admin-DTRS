"""
TrainCorridorMapper.py
======================
Comprehensive Train-to-Corridor Mapping Engine for Indian Railways.

Maps all 10,620 trains across the network to their relevant corridors:
1. National Golden Quadrilateral & Trunk Corridors:
   - DEL-MUM: Delhi ↔ Mumbai & Western Corridor
   - DEL-HWH: Delhi ↔ Howrah & Eastern Trunk
   - DEL-MAS: Delhi ↔ Chennai & Grand Trunk
   - MUM-MAS: Mumbai ↔ Chennai & South-Western
   - MUM-HWH: Mumbai ↔ Howrah & Central-Eastern
   - HWH-MAS: Howrah ↔ Chennai & East Coast
   - HWH-GHY: Howrah ↔ Guwahati & Northeast
2. Regional Network Trunk Corridors:
   - DEL-JAT: Northern Trunk (Delhi ↔ Punjab ↔ Jammu & Kashmir)
   - MAS-BLR: Southern Trunk (Chennai ↔ Bengaluru ↔ Mysore ↔ Kerala)
   - MUM-ADI: Western Coastal Trunk (Mumbai ↔ Gujarat ↔ Saurashtra)
   - HWH-PURI: Odisha Coastal Trunk (Howrah ↔ Bhubaneswar ↔ Puri)
   - HYB-MAS: Deccan Trunk (Hyderabad ↔ Vijayawada ↔ Chennai)
   - DEL-ASR: Punjab Trunk (Delhi ↔ Ambala ↔ Amritsar)
   - ZONAL_FEEDER: Regional Intercity & Branch Networks

Exports to:
  - SPipelines/Train-Data/TrainCorridorMapping.csv
  - SPipelines/Segmentation/TrainCorridorMapping.csv
  - BlackSheep/Train-Data/TrainCorridorMapping.csv
Uploads to Neon PostgreSQL table 'train_corridor_mapping'.
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

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..'))

def find_file(rel_path):
    candidates = [
        os.path.join(CURRENT_DIR, rel_path),
        os.path.join(PROJECT_ROOT, rel_path),
        os.path.join(PROJECT_ROOT, 'Train-Data', rel_path),
        os.path.join(PROJECT_ROOT, 'Segmentation', rel_path),
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

# Station cluster sets for major metro terminals
CITY_CLUSTERS = {
    'DEL': {'NDLS', 'NZM', 'DLI', 'DEE', 'ANVT', 'DEC'},
    'MUM': {'BCT', 'MMCT', 'BDTS', 'CSMT', 'CSTM', 'DR', 'LTT', 'KYN', 'PNVL', 'BVI'},
    'HWH': {'HWH', 'SDAH', 'KOAA', 'SHM', 'SRC'},
    'MAS': {'MAS', 'MS', 'TBM', 'PER'},
    'GHY': {'GHY', 'KYQ', 'NGC'},
    'BLR': {'SBC', 'YPR', 'SMVB', 'BNC'},
    'HYB': {'SC', 'HYB', 'KCG'},
    'JAT': {'JAT', 'SVDK', 'UHP'},
    'ASR': {'ASR', 'JUC'},
    'ADI': {'ADI', 'SBIB', 'GIMB', 'BRC'},
    'PURI': {'PURI', 'BBS', 'CTC'}
}

# Corridor definitions with titles & waypoint sets
CORRIDOR_METADATA = {
    'DEL-MUM': {
        'name': 'Delhi ↔ Mumbai (Western Corridor)',
        'is_national': 1,
        'endpoints': ('DEL', 'MUM'),
        'waypoints': {'NDLS', 'NZM', 'DLI', 'DEE', 'DEC', 'ANVT', 'MTJ', 'BTE', 'SWM', 'KOTA', 'RTM', 'DHD', 'GDA', 'BRC', 'BH', 'ST', 'NVS', 'BL', 'VAPI', 'BVI', 'BDTS', 'MMCT', 'BCT', 'CSMT', 'DR', 'LTT', 'KYN', 'JP', 'AII', 'ABR', 'PNU', 'MSH', 'SBI', 'ADI'}
    },
    'DEL-HWH': {
        'name': 'Delhi ↔ Howrah (Eastern Trunk)',
        'is_national': 1,
        'endpoints': ('DEL', 'HWH'),
        'waypoints': {'NDLS', 'DLI', 'ANVT', 'GZB', 'ALJN', 'TDL', 'ETW', 'CNB', 'FTP', 'PRYJ', 'ALD', 'MZP', 'DDU', 'MGS', 'BXR', 'ARA', 'DNR', 'PNBE', 'BKP', 'MKA', 'KIUL', 'JAJ', 'JSME', 'MDP', 'CRJ', 'ASN', 'DGR', 'BWN', 'BDC', 'HWH', 'SDAH', 'KOAA', 'SHM', 'GAYA', 'KQR', 'PNME', 'GMO', 'DHN'}
    },
    'DEL-MAS': {
        'name': 'Delhi ↔ Chennai (Grand Trunk)',
        'is_national': 1,
        'endpoints': ('DEL', 'MAS'),
        'waypoints': {'NDLS', 'NZM', 'FDB', 'MTJ', 'AGC', 'DHO', 'MRA', 'GWL', 'DBA', 'JHS', 'VGLJ', 'LIT', 'BINA', 'BPL', 'HBJ', 'RKMP', 'ET', 'GDYA', 'BZU', 'AMLA', 'PAR', 'NRKR', 'KATL', 'NGP', 'SEGM', 'WR', 'HGT', 'CD', 'BPQ', 'SKZR', 'BPA', 'MCI', 'RDM', 'PDPL', 'JMKT', 'KZJ', 'WL', 'MABD', 'DKJ', 'KMT', 'BZA', 'TEL', 'CLX', 'OGL', 'SKM', 'KVZ', 'NLR', 'GDR', 'NYP', 'SPE', 'GPD', 'PON', 'PER', 'MAS', 'MS', 'TBM'}
    },
    'MUM-MAS': {
        'name': 'Mumbai ↔ Chennai (South-Western)',
        'is_national': 1,
        'endpoints': ('MUM', 'MAS'),
        'waypoints': {'CSMT', 'DR', 'LTT', 'TNA', 'KYN', 'KJT', 'LNL', 'PUNE', 'DD', 'KWV', 'SUR', 'AKOR', 'GUR', 'KLBG', 'GR', 'SDB', 'WADI', 'YG', 'SADP', 'RC', 'MALM', 'AD', 'GTL', 'GY', 'TU', 'YA', 'HX', 'NRE', 'RJP', 'KOU', 'RU', 'PUT', 'EKM', 'TRT', 'AJJ', 'TRL', 'PER', 'MAS', 'MS'}
    },
    'MUM-HWH': {
        'name': 'Mumbai ↔ Howrah (Central-Eastern)',
        'is_national': 1,
        'endpoints': ('MUM', 'HWH'),
        'waypoints': {'CSMT', 'DR', 'LTT', 'TNA', 'KYN', 'KSRA', 'IGP', 'NK', 'MMR', 'CSN', 'JL', 'BSL', 'MKU', 'NN', 'SEG', 'AK', 'MZR', 'BD', 'DMN', 'PLO', 'WR', 'SEGM', 'SNI', 'AJNI', 'NGP', 'KP', 'BRD', 'TMR', 'TRO', 'G', 'AGN', 'DGG', 'RJN', 'DURG', 'BPHB', 'R', 'TLD', 'BYT', 'BSP', 'CPH', 'AKT', 'NIA', 'JSG', 'GP', 'ROU', 'MOU', 'CKP', 'TATA', 'GTS', 'JGM', 'KGP', 'SRC', 'SHM', 'HWH'}
    },
    'HWH-MAS': {
        'name': 'Howrah ↔ Chennai (East Coast)',
        'is_national': 1,
        'endpoints': ('HWH', 'MAS'),
        'waypoints': {'HWH', 'SRC', 'ULB', 'MECHE', 'PKU', 'KGP', 'BLDA', 'JER', 'BLS', 'SORO', 'BHC', 'JJKR', 'DNM', 'CTC', 'BBS', 'KUR', 'NKP', 'BALU', 'CAP', 'BAM', 'IPM', 'SPT', 'PSA', 'NWP', 'CHE', 'PVP', 'VBL', 'VZM', 'SCMN', 'VSKP', 'DVD', 'AKP', 'YLM', 'TUNI', 'ANV', 'SLO', 'APT', 'RJY', 'NDD', 'TDD', 'EE', 'BZA', 'TEL', 'BPP', 'CLX', 'OGL', 'SKM', 'KVZ', 'NLR', 'GDR', 'NYP', 'SPE', 'GPD', 'PER', 'MAS', 'MS'}
    },
    'HWH-GHY': {
        'name': 'Howrah ↔ Guwahati (Northeast Frontier)',
        'is_national': 1,
        'endpoints': ('HWH', 'GHY'),
        'waypoints': {'HWH', 'SDAH', 'KOAA', 'BDC', 'ABKA', 'NDAE', 'KWAE', 'BHP', 'AMP', 'SNT', 'RPH', 'MRR', 'PKR', 'NFK', 'MLDT', 'SM', 'BKRD', 'HCR', 'BOE', 'DLK', 'KNE', 'AUB', 'TKG', 'NJP', 'JPE', 'DQG', 'FLK', 'NCB', 'NOQ', 'KAMG', 'FKM', 'KOJ', 'NBQ', 'BNGN', 'CPQ', 'BPRD', 'PTLD', 'TIHU', 'NLV', 'RNY', 'CGS', 'KYQ', 'GHY'}
    },
    # Regional Network Corridors
    'DEL-JAT': {
        'name': 'Delhi ↔ Jammu/Kashmir (Northern Trunk)',
        'is_national': 0,
        'endpoints': ('DEL', 'JAT'),
        'waypoints': {'NDLS', 'DLI', 'DEC', 'SNP', 'PNP', 'KUN', 'KKDE', 'UMB', 'LDH', 'JUC', 'PTKC', 'KTHU', 'JAT', 'UHP', 'SVDK'}
    },
    'MAS-BLR': {
        'name': 'Chennai ↔ Bengaluru (Southern Trunk)',
        'is_national': 0,
        'endpoints': ('MAS', 'BLR'),
        'waypoints': {'MAS', 'PER', 'AJJ', 'WJR', 'KPD', 'JTJ', 'TPT', 'KPN', 'BWT', 'WFD', 'KJM', 'BNCE', 'BNC', 'SBC', 'YPR', 'SMVB'}
    },
    'MUM-ADI': {
        'name': 'Mumbai ↔ Ahmedabad (Western Coastal)',
        'is_national': 0,
        'endpoints': ('MUM', 'ADI'),
        'waypoints': {'BCT', 'MMCT', 'BDTS', 'BVI', 'PLG', 'VAPI', 'BL', 'BIM', 'NVS', 'ST', 'AKV', 'BH', 'MYG', 'BRC', 'ANND', 'ND', 'MHD', 'MAN', 'ADI', 'SBIB'}
    },
    'HWH-PURI': {
        'name': 'Howrah ↔ Puri (Odisha Coast)',
        'is_national': 0,
        'endpoints': ('HWH', 'PURI'),
        'waypoints': {'HWH', 'SRC', 'KGP', 'BLS', 'BHC', 'JJKR', 'CTC', 'BBS', 'KUR', 'SIL', 'PURI'}
    },
    'DEL-ASR': {
        'name': 'Delhi ↔ Amritsar (Punjab Trunk)',
        'is_national': 0,
        'endpoints': ('DEL', 'ASR'),
        'waypoints': {'NDLS', 'DLI', 'SNP', 'PNP', 'KUN', 'KKDE', 'UMB', 'RPJ', 'SIR', 'KNN', 'LDH', 'PGW', 'JUC', 'BEAS', 'ASR'}
    }
}

def map_all_trains_to_corridors():
    print("=" * 80)
    print("MAPPING ALL 10,620 TRAINS TO THEIR RELEVANT CORRIDORS")
    print("=" * 80)

    sched_csv = find_file('TrainSchedules_DND.csv')
    meta_csv = find_file('TrainsMetadata_DND.csv')
    ea_csv = find_file('EACalculation.csv')

    print(f"Loading schedules from: {sched_csv}")
    sched_df = pd.read_csv(sched_csv, usecols=['train_no', 'station_code', 'station_name', 'sr_no', 'dist_km'])
    sched_df['train_no'] = sched_df['train_no'].astype(str).str.strip().str.lstrip('0')

    print(f"Loading metadata from: {meta_csv}")
    meta_df = pd.read_csv(meta_csv)
    meta_df['train_no'] = meta_df['train_no'].astype(str).str.strip().str.lstrip('0')
    meta_map = meta_df.drop_duplicates('train_no').set_index('train_no').to_dict('index')

    print(f"Loading EA calculation from: {ea_csv}")
    ea_df = pd.read_csv(ea_csv)
    ea_df['train_no'] = ea_df['train_no'].astype(str).str.strip().str.lstrip('0')
    ea_map = ea_df.drop_duplicates('train_no').set_index('train_no').to_dict('index')

    # Group station stops per train
    sched_sorted = sched_df.sort_values(['train_no', 'sr_no'])
    train_stn_sets = sched_sorted.groupby('train_no')['station_code'].apply(set).to_dict()
    first_last = sched_sorted.groupby('train_no').agg(
        first_stn=('station_code', 'first'),
        first_stn_name=('station_name', 'first'),
        last_stn=('station_code', 'last'),
        last_stn_name=('station_name', 'last'),
        total_halts=('station_code', 'count')
    ).reset_index().set_index('train_no')

    # Specific flagship manual overrides for precision
    EXPLICIT_CORRIDOR_OVERRIDES = {
        '12001': 'DEL-MAS',  # NDLS -> BPL (on Grand Trunk)
        '12002': 'DEL-MAS',  # BPL -> NDLS
        '12625': 'DEL-MAS',  # TVC -> NDLS
        '12626': 'DEL-MAS',  # NDLS -> TVC
        '12433': 'DEL-MAS',
        '12434': 'DEL-MAS',
        '12611': 'DEL-MAS',
        '12612': 'DEL-MAS',
        '12951': 'DEL-MUM',  # MMCT -> NDLS Tejas Raj
        '12952': 'DEL-MUM',  # NDLS -> MMCT Tejas Raj
        '12953': 'DEL-MUM',  # Aug Kranti
        '12954': 'DEL-MUM',
        '12215': 'DEL-MUM',  # Garib Rath
        '12216': 'DEL-MUM',
        '12009': 'DEL-MUM',  # MMCT -> ADI Shatabdi
        '12010': 'DEL-MUM',
        '12301': 'DEL-HWH',  # Howrah Rajdhani
        '12302': 'DEL-HWH',
        '12303': 'DEL-HWH',  # Poorva Exp
        '12304': 'DEL-HWH',
        '12273': 'DEL-HWH',  # Duronto
        '12274': 'DEL-HWH',
        '12003': 'DEL-HWH',  # LKO Shatabdi
        '12004': 'DEL-HWH',
        '12423': 'DEL-HWH',  # DBRG Rajdhani
        '12424': 'DEL-HWH',
        '12841': 'HWH-MAS',  # Coromandel Exp
        '12842': 'HWH-MAS',
        '12839': 'HWH-MAS',  # Howrah Mail
        '12840': 'HWH-MAS',
        '12859': 'MUM-HWH',  # Gitanjali Exp
        '12860': 'MUM-HWH',
        '12101': 'MUM-HWH',  # Jnaneswari Exp
        '12102': 'MUM-HWH',
        '12345': 'HWH-GHY',  # Saraighat Exp
        '12346': 'HWH-GHY',
        '12517': 'HWH-GHY',
        '12518': 'HWH-GHY',
        '12163': 'MUM-MAS',  # Chennai Exp
        '12164': 'MUM-MAS',
        '22157': 'MUM-MAS',
        '22158': 'MUM-MAS'
    }

    all_trains = list(first_last.index)
    mapping_records = []

    for t_no in all_trains:
        fl_row = first_last.loc[t_no]
        f_stn = str(fl_row['first_stn']).strip().upper()
        l_stn = str(fl_row['last_stn']).strip().upper()
        t_stns = train_stn_sets.get(t_no, set())
        halts_cnt = int(fl_row['total_halts'])

        meta = meta_map.get(t_no, {})
        ea_data = ea_map.get(t_no, {})

        t_name = meta.get('train_name', ea_data.get('train_name', f'TRAIN-{t_no}'))
        t_tier = ea_data.get('train_tier', meta.get('train_tier', 'T3_EXPRESS'))
        src_stn = ea_data.get('source_station', fl_row['first_stn_name'])
        dst_stn = ea_data.get('destination_station', fl_row['last_stn_name'])
        dist_km = float(ea_data.get('total_distance_km', 0.0))
        ea_allotted = float(ea_data.get('net_slack_mins', ea_data.get('extra_time_mins', 60.0)))

        # Check explicit override
        if t_no in EXPLICIT_CORRIDOR_OVERRIDES:
            best_slug = EXPLICIT_CORRIDOR_OVERRIDES[t_no]
            best_info = CORRIDOR_METADATA[best_slug]
            best_name = best_info['name']
            is_nat = best_info['is_national']
            match_confidence = 100
        else:
            # Algorithmic scoring
            best_slug = 'ZONAL_FEEDER'
            best_name = 'Regional Zonal Route & Branch Network'
            is_nat = 0
            best_score = 0

            for c_slug, c_info in CORRIDOR_METADATA.items():
                w_pts = c_info['waypoints']
                e1, e2 = c_info['endpoints']
                s1 = CITY_CLUSTERS.get(e1, set())
                s2 = CITY_CLUSTERS.get(e2, set())

                overlap = len(t_stns & w_pts)
                score = overlap * 2

                # End-to-end direct connection
                if (f_stn in s1 and l_stn in s2) or (f_stn in s2 and l_stn in s1):
                    score += 80
                # Intermediate passage through both terminal clusters
                elif (t_stns & s1) and (t_stns & s2):
                    score += 40
                # Origin or destination in either terminal cluster
                elif (f_stn in s1 or f_stn in s2 or l_stn in s1 or l_stn in s2):
                    score += 15

                # National corridors receive standard preference
                if c_info['is_national'] == 1 and overlap >= 3:
                    score += 5

                if score > best_score and overlap >= 2:
                    best_score = score
                    best_slug = c_slug
                    best_name = c_info['name']
                    is_nat = c_info['is_national']

            match_confidence = min(98, max(50, best_score * 2)) if best_slug != 'ZONAL_FEEDER' else 40

        mapping_records.append({
            'train_no': t_no.zfill(5),
            'train_no_int': int(t_no) if t_no.isdigit() else 0,
            'train_name': t_name,
            'train_tier': t_tier,
            'source_station': src_stn,
            'destination_station': dst_stn,
            'total_distance_km': dist_km,
            'total_halts': halts_cnt,
            'EA_allotted_mins': ea_allotted,
            'corridor_slug': best_slug,
            'corridor_name': best_name,
            'is_national_corridor': is_nat,
            'match_confidence_pct': match_confidence
        })

    map_df = pd.DataFrame(mapping_records)
    print(f"\n[SUCCESS] Successfully mapped {len(map_df):,} trains to corridors!")

    # Summary
    print("\nCorridor Train Distribution:")
    for c_slug, cnt in map_df['corridor_slug'].value_counts().items():
        c_name = CORRIDOR_METADATA.get(c_slug, {}).get('name', c_slug)
        print(f"  {c_slug:15s} ({c_name:40s}): {cnt:5,} trains")

    # Save to CSV files
    workspace_root = os.path.dirname(PROJECT_ROOT) if os.path.basename(PROJECT_ROOT) == 'SPipelines' else PROJECT_ROOT
    out_paths = [
        os.path.join(workspace_root, 'SPipelines', 'Train-Data', 'TrainCorridorMapping.csv'),
        os.path.join(workspace_root, 'SPipelines', 'Segmentation', 'TrainCorridorMapping.csv'),
        os.path.join(workspace_root, 'BlackSheep', 'Train-Data', 'TrainCorridorMapping.csv')
    ]
    for p in out_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        map_df.to_csv(p, index=False)
        print(f"[OK] Saved CSV to '{p}' ({os.path.getsize(p) / 1024:.1f} KB)")

    # Upload to Neon PostgreSQL
    if NEON_DATABASE_URL:
        try:
            print("\nUploading to Neon PostgreSQL table 'train_corridor_mapping'...")
            engine = create_engine(NEON_DATABASE_URL)
            with engine.connect() as conn:
                conn.execute(text("DROP TABLE IF EXISTS train_corridor_mapping CASCADE;"))
                conn.commit()

            map_df.to_sql('train_corridor_mapping', engine, if_exists='replace', index=False)
            with engine.connect() as conn:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tcm_train_no ON train_corridor_mapping(train_no);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tcm_corridor_slug ON train_corridor_mapping(corridor_slug);"))
                conn.commit()
            print("[OK] Neon PostgreSQL table 'train_corridor_mapping' created and indexed successfully!")
        except Exception as e:
            print(f"[WARN] Neon PostgreSQL upload encountered error: {e}")

    return map_df

if __name__ == '__main__':
    map_all_trains_to_corridors()
