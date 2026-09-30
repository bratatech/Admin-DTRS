import os
import sys
import time

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = CURRENT_DIR if os.path.basename(CURRENT_DIR) not in ['SPipelines', 'Segmentation', 'BlackSheep', 'Backend'] else os.path.abspath(os.path.join(CURRENT_DIR, '..'))

def find_file(rel_path):
    candidates = [
        os.path.join(CURRENT_DIR, rel_path),
        os.path.join(CURRENT_DIR, 'Train-Data', rel_path),
        os.path.join(CURRENT_DIR, 'Segmentation', rel_path),
        os.path.join(PROJECT_ROOT, rel_path),
        os.path.join(PROJECT_ROOT, 'Backend', rel_path),
        os.path.join(PROJECT_ROOT, 'Backend', 'Train-Data', rel_path),
        os.path.join(PROJECT_ROOT, 'Backend', 'Segmentation', rel_path),
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

import pandas as pd
import numpy as np
from fastapi import FastAPI, Query, Body, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text

app = FastAPI(title="TRETA SYSTEM Segmentation & Compound ETA Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from dotenv import load_dotenv
env_candidates = [
    os.path.join(CURRENT_DIR, '.env'),
    os.path.join(PROJECT_ROOT, '.env'),
    os.path.join(PROJECT_ROOT, 'Backend', '.env'),
]
for env_path in env_candidates:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

NEON_DATABASE_URL = os.getenv('POSTGRESQL') or os.getenv('DATABASE_URL') or os.getenv('NEON_URL')
RAILRADAR_API_KEY = os.getenv('RAILRADAR_API_KEY', '').strip()
RAILRADAR_API_URL = os.getenv('RAILRADAR_API_URL', 'https://api.railradar.in/v1').strip().rstrip('/')

# 7 National Rail Corridors (Golden Quadrilateral & National Trunks)
NATIONAL_CORRIDORS = {
    'DEL-MUM': 'Delhi ↔ Mumbai (Western Corridor)',
    'DEL-HWH': 'Delhi ↔ Howrah (Eastern Trunk)',
    'DEL-MAS': 'Delhi ↔ Chennai (Grand Trunk)',
    'MUM-MAS': 'Mumbai ↔ Chennai (South-Western)',
    'MUM-HWH': 'Mumbai ↔ Howrah (Central-Eastern)',
    'HWH-MAS': 'Howrah ↔ Chennai (East Coast)',
    'HWH-GHY': 'Howrah ↔ Guwahati (Northeast Frontier)',
}

CORRIDOR_MAP_NORMALIZER = {
    'DEL-MUM': 'DEL-MUM',
    'DEL-HWH': 'DEL-HWH',
    'DEL-MAS': 'DEL-MAS',
    'MUM-MAS': 'MUM-MAS',
    'MUM-HWH': 'MUM-HWH',
    'HWH-MAS': 'HWH-MAS',
    'HWH-GHY': 'HWH-GHY',
    'DEL-JAT': 'DEL-MUM',
    'DEL-ASR': 'DEL-MUM',
    'MUM-ADI': 'DEL-MUM',
    'MAS-BLR': 'MUM-MAS',
    'HWH-PURI': 'HWH-MAS',
    'ZONAL_FEEDER': 'DEL-MUM'
}

# In-memory fast cache of base datasets for sub-millisecond response
print("[AppServer] Loading in-memory caches...")

# 1. EACalculation
ea_csv = find_file('EACalculation.csv')
if ea_csv:
    ea_df = pd.read_csv(ea_csv)
    ea_df['train_no'] = ea_df['train_no'].astype(str).str.zfill(5)
    TRAIN_MAP = {row['train_no']: row.to_dict() for _, row in ea_df.iterrows()}
    print(f"  - Loaded EACalculation: {len(TRAIN_MAP):,} trains.")
else:
    TRAIN_MAP = {}

# 2. Timetable Stops & Full Schedules
sched_csv = find_file('TrainSchedules_DND.csv')
DEST_MAP = {}
SCHEDULES_MAP = {}
if sched_csv:
    sched_df_raw = pd.read_csv(sched_csv, usecols=['train_no', 'sr_no', 'station_code', 'station_name', 'arr_time', 'dep_time', 'dist_km', 'day'])
    sched_df_raw['train_no'] = sched_df_raw['train_no'].astype(str).str.zfill(5)
    dest_stops = sched_df_raw.sort_values(['train_no', 'sr_no']).groupby('train_no').last().reset_index()
    for _, row in dest_stops.iterrows():
        DEST_MAP[row['train_no']] = {
            'dest_station_code': row['station_code'],
            'dest_station_name': row['station_name'],
            'arr_time': str(row['arr_time']).strip(),
            'day': int(row['day']) if pd.notna(row['day']) else 1
        }
    for row in sched_df_raw.itertuples(index=False):
        t = row.train_no
        if t not in SCHEDULES_MAP:
            SCHEDULES_MAP[t] = []
        SCHEDULES_MAP[t].append({
            'sr_no': int(row.sr_no),
            'station_code': str(row.station_code).strip(),
            'station_name': str(row.station_name).strip(),
            'arr_time': str(row.arr_time).strip(),
            'dep_time': str(row.dep_time).strip(),
            'dist_km': float(row.dist_km) if pd.notna(row.dist_km) else 0.0,
            'day': int(row.day) if pd.notna(row.day) else 1
        })
    print(f"  - Loaded Destination Timetable & Complete Schedules: {len(DEST_MAP):,} trains.")

def to_abs_mins(t_str, day=1):
    """Converts HH:MM timetable string to cumulative minutes from Day 1 start."""
    if not t_str or str(t_str).strip() in ['SRC', 'DSTN', '', 'nan']:
        return None
    try:
        parts = str(t_str).strip().split(':')
        d = int(day) if day else 1
        return (d - 1) * 1440 + int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return None

# Fast in-memory spatial-temporal block section indexes
HOP_INDEX = {}
STATION_TIMETABLE_INDEX = {}
ALL_TRAIN_SEGMENTS = {}
SEGMENT_BY_ID = {}

if sched_csv:
    for t_no, stops in SCHEDULES_MAP.items():
        for i in range(len(stops) - 1):
            s1 = stops[i]
            s2 = stops[i + 1]
            c1 = s1['station_code']
            c2 = s2['station_code']
            d_m = to_abs_mins(s1['dep_time'], s1['day']) or to_abs_mins(s1['arr_time'], s1['day'])
            a_m = to_abs_mins(s2['arr_time'], s2['day']) or to_abs_mins(s2['dep_time'], s2['day'])
            if d_m is None or a_m is None:
                continue
            if a_m < d_m:
                a_m += 1440
            pair = (c1, c2)
            if pair not in HOP_INDEX:
                HOP_INDEX[pair] = []
            HOP_INDEX[pair].append({
                'train_no': t_no,
                'from_station_code': c1,
                'to_station_code': c2,
                'from_station_name': s1['station_name'],
                'to_station_name': s2['station_name'],
                'dep_time': s1['dep_time'],
                'arr_time': s2['arr_time'],
                'dep_mins': d_m,
                'arr_mins': a_m,
                'day': s1['day'],
                'seq': i + 1
            })

    for row in sched_df_raw.itertuples(index=False):
        t_no = str(row.train_no).zfill(5)
        stn = str(row.station_code).strip()
        if stn not in STATION_TIMETABLE_INDEX:
            STATION_TIMETABLE_INDEX[stn] = []
        STATION_TIMETABLE_INDEX[stn].append({
            'train_no': t_no,
            'sr_no': int(row.sr_no),
            'station_name': str(row.station_name).strip(),
            'arr_time': str(row.arr_time).strip(),
            'dep_time': str(row.dep_time).strip(),
            'day': int(row.day) if pd.notna(row.day) else 1,
            'arr_mins': to_abs_mins(row.arr_time, row.day),
            'dep_mins': to_abs_mins(row.dep_time, row.day)
        })
    print(f"  - Indexed {sum(len(v) for v in HOP_INDEX.values()):,} dynamic Treta section hops across {len(HOP_INDEX):,} station pairs.")

# 3. RouteDivision (segments across corridors)
route_csv = find_file('RouteDivision.csv')
ROUTE_SEGMENTS = []
if route_csv:
    df_route = pd.read_csv(route_csv).fillna('')
    ROUTE_SEGMENTS = df_route.to_dict(orient='records')
    for s in ROUTE_SEGMENTS:
        seg_id = s.get('treta_segment_number')
        if seg_id:
            SEGMENT_BY_ID[seg_id] = s
    print(f"  - Loaded RouteDivision: {len(ROUTE_SEGMENTS):,} corridor segments.")

# 4. StateBorderDivision & CorridorStateBorders & StationStateDivision
sb_csv = find_file('StateBorderDivision.csv')
STATE_BORDERS = []
if sb_csv:
    STATE_BORDERS = pd.read_csv(sb_csv).fillna('').to_dict(orient='records')

csb_csv = find_file('CorridorStateBorders.csv')
CORRIDOR_STATE_BORDERS = []
if csb_csv:
    CORRIDOR_STATE_BORDERS = pd.read_csv(csb_csv).fillna('').to_dict(orient='records')

ssd_csv = find_file('StationStateDivision.csv')
STATION_STATE_MAP = {}
if ssd_csv:
    df_ssd = pd.read_csv(ssd_csv, usecols=['station_code', 'state_code', 'state_border_key'])
    for _, row in df_ssd.iterrows():
        STATION_STATE_MAP[str(row['station_code']).strip()] = {
            'state_code': str(row['state_code']).strip(),
            'state_border_key': str(row['state_border_key']).strip()
        }
    print(f"  - Loaded StationStateDivision: {len(STATION_STATE_MAP):,} stations mapped to State Borders.")

# 5. TrainCorridorMapping (normalized to 7 National Corridors)
tcm_csv = find_file('TrainCorridorMapping.csv')
TRAIN_CORRIDOR_MAP = {}
if tcm_csv:
    df_tcm = pd.read_csv(tcm_csv).fillna('')
    df_tcm['train_no'] = df_tcm['train_no'].astype(str).str.zfill(5)
    for _, row in df_tcm.iterrows():
        t_num = row['train_no']
        raw_slug = str(row.get('corridor_slug', 'DEL-MUM')).strip()
        norm_slug = CORRIDOR_MAP_NORMALIZER.get(raw_slug, 'DEL-MUM')
        norm_name = NATIONAL_CORRIDORS.get(norm_slug, 'Delhi ↔ Mumbai (Western Corridor)')
        TRAIN_CORRIDOR_MAP[t_num] = {
            'train_no': t_num,
            'corridor_slug': norm_slug,
            'corridor_name': norm_name
        }
    print(f"  - Loaded TrainCorridorMapping: {len(TRAIN_CORRIDOR_MAP):,} trains mapped to National Corridors.")

# 6. masterPnC
pnc_csv = find_file('masterPnC.csv')
PNC_DF = None
if pnc_csv:
    PNC_DF = pd.read_csv(pnc_csv).fillna('')
    print(f"  - Loaded MasterPnC: {len(PNC_DF):,} scenarios.")


import shutil
import sqlite3
from datetime import datetime

MASTER_DB_PATH = os.path.join(CURRENT_DIR, 'WIN.db') if os.path.exists(os.path.join(CURRENT_DIR, 'WIN.db')) else os.path.join(PROJECT_ROOT, 'WIN.db')
SIM_DB_PATH = os.path.join(CURRENT_DIR, 'WIN_SIMULATION.db') if os.path.exists(os.path.join(CURRENT_DIR, 'WIN_SIMULATION.db')) else os.path.join(PROJECT_ROOT, 'WIN_SIMULATION.db')

# Ensure isolated simulation database sandbox exists
if os.path.exists(MASTER_DB_PATH) and not os.path.exists(SIM_DB_PATH):
    try:
        shutil.copyfile(MASTER_DB_PATH, SIM_DB_PATH)
        print(f"  - Initialized simulation sandbox: {SIM_DB_PATH}")
    except Exception as e:
        print(f"  - Warning initializing simulation sandbox: {e}")

SIMULATION_STATE = {
    'mode': 'PRISTINE',
    'modifications_count': 0,
    'last_updated': None,
    'pushed_records': []
}

def format_predicted_eta(time_str, day, net_delay):
    if not time_str or time_str in ['SRC', 'DSTN', '', 'nan']:
        return "N/A"
    try:
        parts = time_str.split(':')
        h, m = int(parts[0]), int(parts[1])
        total_mins = h * 60 + m + int(round(net_delay))
        day_add = total_mins // 1440
        rem_mins = total_mins % 1440
        new_h = rem_mins // 60
        new_m = rem_mins % 60
        final_day = int(day) + day_add
        day_tag = f" (Day {final_day})" if final_day > 1 else ""
        return f"{new_h:02d}:{new_m:02d} IST{day_tag}"
    except Exception:
        return f"{time_str} (+{net_delay:.1f}m)"

def generate_delay_explanation(applied_cases, primary_breakdown, cascade_breakdown, math_resolution, seg_info=None):
    tier = applied_cases.get('train_tier', 'T2_SUPERFAST')
    weather = applied_cases.get('weather', 'Clear')
    tsr = applied_cases.get('tsr_level', 'None')
    acp = applied_cases.get('alarm_chain_pulling', '0_Events')
    engine = applied_cases.get('engine_failure', 'Nominal')
    occ = applied_cases.get('treta_block_occupancy', 'Track_Clear')
    cross = applied_cases.get('crossing_conflict', 'Double_Quad_Track')
    plat = applied_cases.get('terminal_platform_hold', 'Platform_Available')
    crew = applied_cases.get('crew_duty_status', 'Duty_Valid')

    pd_val = primary_breakdown.get('PrimaryDelay', 0.0)
    cd_val = cascade_breakdown.get('CascadeDelay', 0.0)
    gd_val = math_resolution.get('grossDelay', 0.0)
    mea_val = math_resolution.get('Absorbed_by_EA', 0.0)
    nd_val = math_resolution.get('NetDelay', 0.0)
    status = math_resolution.get('Arrival_Status', 'ON_TIME')

    # Primary factors explanation
    primary_reasons = []
    if weather != 'Clear':
        primary_reasons.append(f"Adverse weather ({weather}) increased braking distance and reduced visibility, inflicting a {primary_breakdown.get('d_weather', 0.0):.1f} min kinetic speed restriction penalty.")
    if tsr != 'None':
        primary_reasons.append(f"Caution order zone ({tsr} TSR) forced tractive speed reduction across civil engineering track works (+{primary_breakdown.get('d_tsr', 0.0):.1f} min).")
    if acp != '0_Events':
        primary_reasons.append(f"Alarm Chain Pulling ({acp}) caused emergency pneumatic brake drop and loco pilot/guard air-continuity reset (+{primary_breakdown.get('d_chain_pulling', 0.0):.1f} min).")
    if engine != 'Nominal':
        primary_reasons.append(f"Locomotive traction fault required technical inspection and power-unit reset (+{primary_breakdown.get('d_engine_failure', 0.0):.1f} min).")
    if not primary_reasons:
        primary_reasons.append("Traction, kinetics, and atmospheric weather operate under ideal baseline conditions (0.0 min primary delay).")

    # Cascade factors explanation
    cascade_reasons = []
    if occ != 'Track_Clear':
        cascade_reasons.append(f"Trailing block occupancy ({occ}) forced train to run on restrictive cautionary signal aspects (+{cascade_breakdown.get('d_headway', 0.0):.1f} min).")
    if cross != 'Double_Quad_Track':
        cascade_reasons.append(f"Junction line conflict ({cross}) required crossing loop detention to yield mainline priority (+{cascade_breakdown.get('d_crossing', 0.0):.1f} min).")
    if plat == 'Outer_Holding':
        cascade_reasons.append("Destination station platform occupied; train held at the home signal outer perimeter (+15.0 min).")
    if crew == 'Duty_Exceeded':
        cascade_reasons.append("Running staff statutory duty hours exceeded en route; relief crew callout required from nearest lobby (+45.0 min).")
    if not cascade_reasons:
        cascade_reasons.append("Block sections, junctions, platforms, and crew rosters operate with zero network cascading disturbance.")

    # Buffer recovery explanation
    rr_pct = "35%" if tier == 'T1_PREMIUM' else ("22%" if tier == 'T2_SUPERFAST' else "12%")
    recovery_text = f"As a {tier} service, the train has a scheduled recovery rate of {rr_pct}. Out of {gd_val:.1f} minutes gross delay, {mea_val:.1f} minutes are absorbed by the timetable slack (EA), leaving a final net delay of {nd_val:.1f} minutes."

    # Segment specific context
    segment_text = ""
    if seg_info:
        from_stn = seg_info.get('from_station_name', seg_info.get('from_station_code', ''))
        to_stn = seg_info.get('to_station_name', seg_info.get('to_station_code', ''))
        dist = seg_info.get('segment_distance_km', 0)
        is_xing = int(seg_info.get('is_border_crossing', 0))
        xing_info = f"inter-state crossing ({seg_info.get('state_border_transition', '')})" if is_xing else "intra-state section"
        segment_text = f"Evaluated hop: [{seg_info.get('treta_segment_number')}] {from_stn} → {to_stn} ({dist} km, {xing_info}). Hop-level physics and border dispatching rules applied."

    # Dispatch recommendation
    if nd_val > 30.0:
        advice = "CRITICAL DISPATCH: Severe delay. Control room must afford green-corridor priority and hold lower-tier freight/passenger services on loop sidings."
    elif nd_val > 5.0:
        advice = "MODERATE DELAY: Section controllers should clear reception lines in advance and leverage headway spacing to prevent domino propagation."
    else:
        advice = "ON TIME: Train operates within strict punctuality threshold (≤ 5 min). Standard working timetable slots maintained."

    full_narrative = (
        f"**1. Primary Root Causes ({pd_val:.1f}m):** " + "; ".join(primary_reasons) + "\n\n" +
        f"**2. Cascading Domino Shocks ({cd_val:.1f}m):** " + "; ".join(cascade_reasons) + "\n\n" +
        f"**3. Timetable Slack Absorption:** {recovery_text}\n\n" +
        (f"**4. Segment Physics:** {segment_text}\n\n" if segment_text else "") +
        f"**5. Dispatch Action:** {advice}"
    )

    return {
        "status": status,
        "net_delay_mins": nd_val,
        "gross_delay_mins": gd_val,
        "primary_reasons": primary_reasons,
        "cascade_reasons": cascade_reasons,
        "recovery_summary": recovery_text,
        "segment_context": segment_text,
        "dispatch_directive": advice,
        "full_narrative": full_narrative
    }

def get_segment_for_train(train_id, seg_id=None):
    """Retrieves or dynamically creates segment metadata for any train."""
    train_id = str(train_id).strip().zfill(5)
    if seg_id and seg_id in SEGMENT_BY_ID:
        return SEGMENT_BY_ID[seg_id]

    if train_id not in ALL_TRAIN_SEGMENTS:
        get_train_info(train_id)

    segs = ALL_TRAIN_SEGMENTS.get(train_id, [])
    if seg_id:
        for s in segs:
            if s.get('treta_segment_number') == seg_id:
                return s
    if segs:
        return segs[0]
    return None

def compute_cascaded_overlays(seg_info, net_delay, train_no, train_tier):
    """
    Dynamically calculates knock-on network disruptions transmitted to trailing,
    opposing, and concurrent trains sharing this Treta segment window.
    Extracts real train overlaps from HOP_INDEX and STATION_TIMETABLE_INDEX.
    """
    if not seg_info or net_delay <= 0.0:
        return {
            "target_segment_number": seg_info.get('treta_segment_number') if seg_info else "ENTIRE_ROUTE",
            "total_affected_trains": 0,
            "cumulative_knock_on_mins": 0.0,
            "has_cascading_delay": False,
            "overlaid_trains": [],
            "cascading_chain": []
        }

    seg_num = seg_info.get('treta_segment_number', 'TS-SEG')
    corr_slug = seg_info.get('corridor_slug', 'DEL-MUM')
    f_code = str(seg_info.get('from_station_code', '')).strip()
    t_code = str(seg_info.get('to_station_code', '')).strip()
    f_name = seg_info.get('from_station_name') or seg_info.get('from_station_clean') or f_code
    t_name = seg_info.get('to_station_name') or seg_info.get('to_station_clean') or t_code
    dep_time_str = str(seg_info.get('dep_time', '08:00')).strip()
    arr_time_str = str(seg_info.get('arr_time', '12:00')).strip()
    day = int(seg_info.get('day', 1))

    seg_dep_mins = to_abs_mins(dep_time_str, day) or 480
    seg_arr_mins = to_abs_mins(arr_time_str, day) or 720
    if seg_arr_mins < seg_dep_mins:
        seg_arr_mins += 1440

    delayed_clear_mins = seg_arr_mins + int(round(net_delay))
    window_start = seg_dep_mins - 20
    window_end = delayed_clear_mins + 40

    clean_curr_train = str(train_no).strip().zfill(5)
    candidates = []

    # 1. Trailing Same-Direction Movements on this block section / zone (f_code -> t_code)
    same_dir_hops = HOP_INDEX.get((f_code, t_code), [])
    for h in same_dir_hops:
        o_t = h['train_no']
        if o_t == clean_curr_train:
            continue
        o_dep = h['dep_mins']
        o_arr = h['arr_mins']

        # Check if train is scheduled within or trailing closely in the delayed occupancy window
        if (window_start <= o_dep <= window_end) or (o_dep <= seg_dep_mins and o_arr >= seg_dep_mins):
            o_meta = TRAIN_MAP.get(o_t, {})
            o_tier = o_meta.get('train_tier', 'T2_SUPERFAST')
            o_name = o_meta.get('train_name', f"TRAIN {o_t}")

            raw_overlap = max(0.0, delayed_clear_mins + 8.0 - o_arr)
            signal_drag = 3.0

            # Tier & Headway precedence rules:
            if train_tier == 'T1_PREMIUM' and o_tier in ['T2_SUPERFAST', 'T3_EXPRESS', 'T3_EXPRESS_PASSENGER']:
                # Trailing lower-tier train cannot overtake Premium train
                conflict_type = 'BLOCK_HEADWAY_TRAILING_HOLD'
                transmitted = min(net_delay + 3.0, max(3.5, round(net_delay * 0.85 + 2.0, 1)))
            elif o_tier == 'T1_PREMIUM' and train_tier != 'T1_PREMIUM':
                # Higher tier train overtakes via loop siding
                conflict_type = 'LOOP_SIDING_OVERTAKE_HOLD'
                transmitted = min(7.0, max(2.5, round(net_delay * 0.25 + 1.5, 1)))
            else:
                conflict_type = 'BLOCK_HEADWAY_TRAILING_HOLD'
                transmitted = min(net_delay + 3.0, max(3.0, round(min(raw_overlap + signal_drag, net_delay * 0.70 + 2.0), 1)))

            seq = h.get('seq', 1)
            candidates.append({
                "train_no": o_t,
                "train_name": o_name,
                "train_tier": o_tier,
                "corridor_segment": f"TS-{corr_slug}-{o_t}-{seq:03d}",
                "station_section": f"{f_name} → {t_name}",
                "scheduled_window": f"{h['dep_time']} - {h['arr_time']}",
                "conflict_type": conflict_type,
                "transmitted_delay_mins": transmitted,
                "time_diff": abs(o_dep - seg_dep_mins)
            })

    # 2. Opposing Movements on Single/Constrained Track (t_code -> f_code)
    opp_dir_hops = HOP_INDEX.get((t_code, f_code), [])
    for h in opp_dir_hops:
        o_t = h['train_no']
        if o_t == clean_curr_train:
            continue
        o_dep = h['dep_mins']
        o_arr = h['arr_mins']

        # If opposing train departure from t_code converges with delayed arrival
        if o_dep <= delayed_clear_mins + 5.0 and o_arr >= seg_dep_mins - 15.0:
            o_meta = TRAIN_MAP.get(o_t, {})
            o_tier = o_meta.get('train_tier', 'T2_SUPERFAST')
            o_name = o_meta.get('train_name', f"TRAIN {o_t}")

            conflict_type = 'SINGLE_LINE_CROSSING_HOLD'
            if train_tier == 'T1_PREMIUM' or o_tier != 'T1_PREMIUM':
                transmitted = min(net_delay, max(4.0, round(delayed_clear_mins + 5.0 - o_dep, 1)))
                transmitted = min(transmitted, round(net_delay * 0.65 + 3.0, 1))
            else:
                transmitted = 4.0

            seq = h.get('seq', 1)
            candidates.append({
                "train_no": o_t,
                "train_name": o_name,
                "train_tier": o_tier,
                "corridor_segment": f"TS-{corr_slug}-{o_t}-{seq:03d}",
                "station_section": f"{t_name} → {f_name}",
                "scheduled_window": f"{h['dep_time']} - {h['arr_time']}",
                "conflict_type": conflict_type,
                "transmitted_delay_mins": transmitted,
                "time_diff": abs(o_dep - delayed_clear_mins)
            })

    # 3. Outer Platform / Reception Starvation at Junction (t_code)
    if len(candidates) < 4:
        junction_arrivals = STATION_TIMETABLE_INDEX.get(t_code, [])
        for st in junction_arrivals:
            o_t = st['train_no']
            if o_t == clean_curr_train:
                continue
            o_arr = st['arr_mins']
            if o_arr is not None and abs(o_arr - delayed_clear_mins) <= 20:
                o_meta = TRAIN_MAP.get(o_t, {})
                o_tier = o_meta.get('train_tier', 'T2_SUPERFAST')
                o_name = o_meta.get('train_name', f"TRAIN {o_t}")

                transmitted = min(15.0, max(4.0, round(15.0 - abs(o_arr - delayed_clear_mins), 1)))
                candidates.append({
                    "train_no": o_t,
                    "train_name": o_name,
                    "train_tier": o_tier,
                    "corridor_segment": f"TS-{corr_slug}-{o_t}-{st['sr_no']:03d}",
                    "station_section": f"APPROACH → {t_name}",
                    "scheduled_window": f"{st['arr_time']} - {st['dep_time'] if st['dep_time'] not in ['DSTN', ''] else st['arr_time']}",
                    "conflict_type": "OUTER_PLATFORM_STARVATION_HOLD",
                    "transmitted_delay_mins": transmitted,
                    "time_diff": abs(o_arr - delayed_clear_mins)
                })

    # Sort candidates by proximity to temporal conflict
    candidates.sort(key=lambda x: (x['transmitted_delay_mins'] < 3.0, x['time_diff']))

    overlaid_trains = []
    seen_trains = set()
    cum_delay = 0.0

    for c in candidates:
        o_train_no = c['train_no']
        if o_train_no in seen_trains:
            continue
        seen_trains.add(o_train_no)

        cum_delay += c['transmitted_delay_mins']
        c['impact_severity'] = 'HIGH' if c['transmitted_delay_mins'] >= 15.0 else ('MODERATE' if c['transmitted_delay_mins'] >= 8.0 else 'LOW')
        overlaid_trains.append(c)
        if len(overlaid_trains) >= 6:
            break

    has_cascading = (len(overlaid_trains) > 0 and net_delay > 0.0)
    cascading_chain = []
    if has_cascading:
        cascading_chain.append({
            "order": 1,
            "role": "Primary Incident Train",
            "train_no": str(train_no),
            "train_name": TRAIN_MAP.get(str(train_no), {}).get('train_name', f"TRAIN {train_no}"),
            "train_tier": train_tier,
            "delay_mins": round(net_delay, 1),
            "impact": "Originating Disturbance Shock",
            "propagated_eta_impact": f"+{net_delay:.1f}m direct delay"
        })
        for idx, ot in enumerate(overlaid_trains[:3]):
            t_trans = float(ot.get('transmitted_delay_mins', 0.0))
            cascading_chain.append({
                "order": idx + 2,
                "role": "Direct Trailing Follower" if idx == 0 else "Downstream Secondary Follower",
                "train_no": ot.get('train_no'),
                "train_name": ot.get('train_name'),
                "train_tier": ot.get('train_tier'),
                "delay_mins": round(t_trans, 1),
                "impact": ot.get('conflict_type'),
                "propagated_eta_impact": f"+{t_trans:.1f}m ripple propagation"
            })

    return {
        "target_segment_number": seg_num,
        "total_affected_trains": len(overlaid_trains),
        "cumulative_knock_on_mins": round(cum_delay, 1),
        "has_cascading_delay": has_cascading,
        "overlaid_trains": overlaid_trains,
        "cascading_chain": cascading_chain
    }

# -----------------------------------------------------------------------------
# API ENDPOINTS
# -----------------------------------------------------------------------------

def normalize_train_tier(raw_tier: str) -> str:
    if not raw_tier:
        return 'T2_SUPERFAST'
    t = str(raw_tier).strip().upper()
    if 'T1' in t or 'PREMIUM' in t or 'RAJDHANI' in t or 'SHATABDI' in t or 'TEJAS' in t or 'VANDE' in t:
        return 'T1_PREMIUM'
    if 'T2' in t or 'SUPERFAST' in t or 'SF' in t:
        return 'T2_SUPERFAST'
    return 'T3_EXPRESS_PASSENGER'

@app.get("/api/search")
def search_trains(q: str = Query("")):
    q = q.strip().upper()
    if not q:
        default_ids = ['12001', '12002', '12951', '12952', '12626', '12625', '19019', '22436', '12301', '12302', '12215', '12216']
        matches = []
        for tid in default_ids:
            if tid in TRAIN_MAP:
                corr_info = TRAIN_CORRIDOR_MAP.get(tid, {})
                matches.append({
                    "train_no": tid,
                    "train_name": TRAIN_MAP[tid].get('train_name', ''),
                    "train_tier": normalize_train_tier(TRAIN_MAP[tid].get('train_tier', '')),
                    "source": TRAIN_MAP[tid].get('source_station', ''),
                    "destination": TRAIN_MAP[tid].get('destination_station', ''),
                    "corridor_slug": corr_info.get('corridor_slug', 'DEL-MUM'),
                    "corridor_name": corr_info.get('corridor_name', 'National Rail Corridor')
                })
        return matches

    route_parts = None
    for sep in [" TO ", " - ", " -> ", "-->", ","]:
        if sep in q:
            parts = [p.strip() for p in q.split(sep) if p.strip()]
            if len(parts) >= 2:
                route_parts = (parts[0], parts[1])
                break

    matches = []
    for t_no, row in TRAIN_MAP.items():
        name = str(row.get('train_name', '')).upper()
        src = str(row.get('source_station', '')).upper()
        dst = str(row.get('destination_station', '')).upper()
        route_str = f"{src} TO {dst}"

        matched = False
        if route_parts:
            if (route_parts[0] in src and route_parts[1] in dst) or (route_parts[0] in name and route_parts[1] in name):
                matched = True
        else:
            if q in t_no or q in name or q in src or q in dst or q in route_str:
                matched = True

        if matched:
            corr_info = TRAIN_CORRIDOR_MAP.get(t_no, {})
            matches.append({
                "train_no": t_no,
                "train_name": row.get('train_name', ''),
                "train_tier": normalize_train_tier(row.get('train_tier', '')),
                "source": row.get('source_station', ''),
                "destination": row.get('destination_station', ''),
                "corridor_slug": corr_info.get('corridor_slug', 'DEL-MUM'),
                "corridor_name": corr_info.get('corridor_name', 'National Rail Corridor')
            })
            if len(matches) >= 25:
                break
    return matches

def get_train_db_comparison(train_no: str, treta_segment_number: str = None) -> dict:
    """
    Compares the row for this train / segment across:
    1. WIN.db (Read-Only Master Timetable): Baseline delay is 0.0 mins, status ON_TIME.
    2. WIN_SIMULATION.db (Working Sandbox Copy): Checks if this train was delayed due to
       cascaded knock-on effects (stored in SimulationCascadedEffects or RouteDivision.sim_proposed_delay).
    Returns comparison metrics to account for pre-existing primary delay.
    """
    raw_t = str(train_no).strip()
    clean_t = raw_t.lstrip('0')
    t_key = raw_t.zfill(5) if len(raw_t) <= 5 else raw_t
    clean_seg = treta_segment_number.strip() if (isinstance(treta_segment_number, str) and treta_segment_number.strip()) else None

    # 1. Query WIN.db (Master Baseline)
    master_row = None
    if os.path.exists(MASTER_DB_PATH):
        try:
            conn = sqlite3.connect(f"file:{MASTER_DB_PATH}?mode=ro", uri=True)
            cur = conn.cursor()
            if clean_seg:
                cur.execute("""
                    SELECT train_no, treta_segment_number, segment_distance_km, arr_time, dep_time
                    FROM RouteDivision
                    WHERE treta_segment_number = ?
                    LIMIT 1
                """, (clean_seg,))
                master_row = cur.fetchone()
            if not master_row:
                cur.execute("""
                    SELECT train_no, treta_segment_number, segment_distance_km, arr_time, dep_time
                    FROM RouteDivision
                    WHERE train_no = ? OR train_no = ?
                    LIMIT 1
                """, (t_key, clean_t))
                master_row = cur.fetchone()
            conn.close()
        except Exception as e:
            print(f"[get_train_db_comparison] Error reading WIN.db: {e}")

    # 2. Query WIN_SIMULATION.db (Sandbox Working Copy)
    sim_row = None
    sim_effects = []
    if not os.path.exists(SIM_DB_PATH) and os.path.exists(MASTER_DB_PATH):
        try:
            shutil.copyfile(MASTER_DB_PATH, SIM_DB_PATH)
        except Exception:
            pass

    if os.path.exists(SIM_DB_PATH):
        try:
            conn = sqlite3.connect(SIM_DB_PATH)
            cur = conn.cursor()

            # Check RouteDivision columns
            cols = [r[1] for r in cur.execute("PRAGMA table_info('RouteDivision')").fetchall()]
            has_sim_cols = 'sim_proposed_delay' in cols

            if clean_seg:
                if has_sim_cols:
                    cur.execute("""
                        SELECT train_no, treta_segment_number, segment_distance_km, arr_time, dep_time,
                               sim_proposed_delay, sim_new_eta, sim_status, sim_updated_at
                        FROM RouteDivision
                        WHERE treta_segment_number = ?
                        LIMIT 1
                    """, (clean_seg,))
                else:
                    cur.execute("""
                        SELECT train_no, treta_segment_number, segment_distance_km, arr_time, dep_time
                        FROM RouteDivision
                        WHERE treta_segment_number = ?
                        LIMIT 1
                    """, (clean_seg,))
                sim_row = cur.fetchone()

            if not sim_row:
                if has_sim_cols:
                    cur.execute("""
                        SELECT train_no, treta_segment_number, segment_distance_km, arr_time, dep_time,
                               sim_proposed_delay, sim_new_eta, sim_status, sim_updated_at
                        FROM RouteDivision
                        WHERE train_no = ? OR train_no = ?
                        LIMIT 1
                    """, (t_key, clean_t))
                else:
                    cur.execute("""
                        SELECT train_no, treta_segment_number, segment_distance_km, arr_time, dep_time
                        FROM RouteDivision
                        WHERE train_no = ? OR train_no = ?
                        LIMIT 1
                    """, (t_key, clean_t))
                sim_row = cur.fetchone()

            # Query SimulationCascadedEffects table
            tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
            if 'SimulationCascadedEffects' in tables:
                cur.execute("""
                    SELECT id, trigger_train_no, trigger_segment, affected_train_no, affected_train_name,
                           affected_tier, conflict_type, transmitted_delay_mins, pushed_at
                    FROM SimulationCascadedEffects
                    WHERE affected_train_no = ? OR affected_train_no = ?
                    ORDER BY id DESC
                    LIMIT 10
                """, (t_key, clean_t))
                for r in cur.fetchall():
                    sim_effects.append({
                        "id": r[0],
                        "trigger_train_no": str(r[1]),
                        "trigger_segment": str(r[2]),
                        "affected_train_no": str(r[3]),
                        "affected_train_name": str(r[4]),
                        "affected_tier": str(r[5]),
                        "conflict_type": str(r[6]),
                        "transmitted_delay_mins": float(r[7] or 0.0),
                        "pushed_at": str(r[8])
                    })
            conn.close()
        except Exception as e:
            print(f"[get_train_db_comparison] Error reading WIN_SIMULATION.db: {e}")

    # Calculate inherited cascade delay
    inherited_delay_mins = 0.0
    conflict_type = None
    trigger_train_no = None
    source_explanation = None

    if sim_effects:
        latest = sim_effects[0]
        inherited_delay_mins = float(latest.get('transmitted_delay_mins', 0.0))
        conflict_type = latest.get('conflict_type')
        trigger_train_no = latest.get('trigger_train_no')
        source_explanation = f"Inherited cascaded delay (+{inherited_delay_mins:.1f}m) from Train #{trigger_train_no} via conflict: {conflict_type}"
    elif sim_row and len(sim_row) > 5 and sim_row[5] is not None and float(sim_row[5]) > 0:
        inherited_delay_mins = float(sim_row[5])
        conflict_type = "PRIOR_SIMULATION_RECORD"
        trigger_train_no = "PRIOR_SIM"
        source_explanation = f"Inherited prior simulation delay (+{inherited_delay_mins:.1f}m) recorded in RouteDivision"

    master_delay = 0.0
    master_status = "ON_TIME"

    sim_delay = float(sim_row[5]) if (sim_row and len(sim_row) > 5 and sim_row[5] is not None) else inherited_delay_mins
    sim_status = str(sim_row[7]) if (sim_row and len(sim_row) > 7 and sim_row[7]) else ("DELAYED_CASCADED" if inherited_delay_mins > 0 else "ON_TIME")
    sim_updated = sim_row[8] if (sim_row and len(sim_row) > 8) else None

    return {
        "train_no": t_key,
        "clean_train_no": clean_t,
        "has_inherited_delay": (inherited_delay_mins > 0.0),
        "inherited_delay_mins": round(inherited_delay_mins, 1),
        "conflict_type": conflict_type or "NONE",
        "trigger_train_no": trigger_train_no or "NONE",
        "source_explanation": source_explanation or "No prior cascaded delay. Timetable baseline active.",
        "win_db_master": {
            "source": "TRETA Master Timetable Matrix",
            "train_no": master_row[0] if master_row else t_key,
            "segment": master_row[1] if master_row else (treta_segment_number or "N/A"),
            "baseline_delay_mins": master_delay,
            "arrival_status": master_status
        },
        "win_sim_db": {
            "source": "TRETA Simulation Sandbox",
            "train_no": sim_row[0] if sim_row else t_key,
            "segment": sim_row[1] if sim_row else (treta_segment_number or "N/A"),
            "sim_delay_mins": sim_delay,
            "arrival_status": sim_status,
            "updated_at": sim_updated
        },
        "cascaded_records": sim_effects
    }

@app.get("/api/train_info")
def get_train_info(train_no: str = Query("12001")):
    """
    Auto-pickup individual train parameters:
    - Actual Train Tier
    - Origin & Destination stations
    - Working timetable arrival time
    - Distance, Halt count, EA slack
    - Relevant corridor slug & title
    - Specific segmented corridor hops
    - Dual database comparison (WIN.db baseline vs WIN_SIMULATION.db inherited delay)
    """
    raw_str = str(train_no).strip()
    t_key = raw_str.lstrip('0').zfill(5)
    row = TRAIN_MAP.get(t_key) or TRAIN_MAP.get(raw_str)
    if not row:
        clean = raw_str.lstrip('0')
        for k, v in TRAIN_MAP.items():
            if k.lstrip('0') == clean:
                row = v
                t_key = k
                break

    if not row:
        return {"error": f"Train {train_no} not found in database"}

    dest = DEST_MAP.get(t_key, {})
    corr_info = TRAIN_CORRIDOR_MAP.get(t_key, {})
    raw_slug = corr_info.get('corridor_slug', 'DEL-MUM')
    corr_slug = CORRIDOR_MAP_NORMALIZER.get(raw_slug, 'DEL-MUM')
    corr_name = NATIONAL_CORRIDORS.get(corr_slug, 'Delhi ↔ Mumbai (Western Corridor)')

    # Get available segments for this specific train in RouteDivision
    clean_t = t_key.lstrip('0')
    train_segs = [s for s in ROUTE_SEGMENTS if str(s.get('train_no')).strip().lstrip('0') == clean_t]
    if train_segs:
        r_slug = train_segs[0].get('corridor_slug', corr_slug)
        corr_slug = CORRIDOR_MAP_NORMALIZER.get(r_slug, corr_slug)
        corr_name = NATIONAL_CORRIDORS.get(corr_slug, corr_name)

    enriched_segs = []
    has_crossing = 0

    if train_segs:
        for s in train_segs:
            f_name = s.get('from_station_name') or s.get('from_station_code', '')
            t_name = s.get('to_station_name') or s.get('to_station_code', '')
            dist = s.get('segment_distance_km', '')
            seg_no = s.get('treta_segment_number', '')
            is_xing = int(s.get('is_border_crossing', 0))
            if is_xing == 1:
                has_crossing = 1
            s_copy = dict(s)
            s_copy['label'] = f"{f_name} → {t_name}"
            s_copy['from_station_clean'] = f_name
            s_copy['to_station_clean'] = t_name
            enriched_segs.append(s_copy)
    else:
        # Build segments on the fly from schedules
        stops = SCHEDULES_MAP.get(t_key, [])
        for i in range(len(stops) - 1):
            s_from = stops[i]
            s_to = stops[i + 1]
            f_code = s_from['station_code']
            t_code = s_to['station_code']
            f_name = s_from['station_name']
            t_name = s_to['station_name']
            f_border = STATION_STATE_MAP.get(f_code, {}).get('state_border_key', 'SB-IR')
            t_border = STATION_STATE_MAP.get(t_code, {}).get('state_border_key', 'SB-IR')
            is_xing = 1 if f_border != t_border else 0
            if is_xing == 1:
                has_crossing = 1
            dist = max(1.0, round(s_to['dist_km'] - s_from['dist_km'], 1))
            seg_num = f"TS-{corr_slug}-{t_key}-{i+1:03d}"
            seg_dict = {
                'treta_segment_number': seg_num,
                'train_no': t_key,
                'segment_sequence': i + 1,
                'corridor_slug': corr_slug,
                'corridor': corr_name,
                'from_station_code': f_code,
                'from_station_name': f_name,
                'from_station_clean': f_name,
                'to_station_code': t_code,
                'to_station_name': t_name,
                'to_station_clean': t_name,
                'label': f"{f_name} → {t_name}",
                'segment_distance_km': dist,
                'cumulative_distance_km': s_to['dist_km'],
                'is_border_crossing': is_xing,
                'from_state_border_key': f_border,
                'to_state_border_key': t_border,
                'dep_time': s_from['dep_time'],
                'arr_time': s_to['arr_time'],
                'day': s_to['day']
            }
            enriched_segs.append(seg_dict)

    for s in enriched_segs:
        s_id = s.get('treta_segment_number')
        if s_id:
            SEGMENT_BY_ID[s_id] = s
    ALL_TRAIN_SEGMENTS[t_key] = enriched_segs

    stops_list = SCHEDULES_MAP.get(t_key, [])
    db_comparison = get_train_db_comparison(t_key)

    norm_tier = normalize_train_tier(row.get('train_tier', 'T1_PREMIUM'))
    default_speedup = 20.0 if norm_tier.startswith('T1') else (15.0 if norm_tier.startswith('T2') else 10.0)

    return {
        "train_no": t_key,
        "train_no_raw": clean_t,
        "train_name": row.get('train_name', ''),
        "train_tier": norm_tier,
        "source_station": row.get('source_station', ''),
        "destination_station": row.get('destination_station', dest.get('dest_station_name', '')),
        "total_distance_km": float(row.get('total_distance_km', 0.0)),
        "total_halts": int(row.get('total_halt_count', 0)),
        "EA_allotted_mins": float(row.get('net_slack_mins', row.get('extra_time_mins', 60.0))),
        "scheduled_arrival": dest.get('arr_time', '22:30'),
        "scheduled_arrival_day": dest.get('day', 1),
        "relevant_corridor_slug": corr_slug,
        "relevant_corridor_name": corr_name,
        "default_is_border_crossing": has_crossing,
        "default_speedup_recovery_mins": default_speedup,
        "available_segments_count": len(enriched_segs),
        "segments": enriched_segs,
        "stations": stops_list,
        "inherited_delay_info": db_comparison
    }

@app.get("/api/segments")
def get_segments(
    corridor_slug: str = Query(None),
    segment_type: str = Query(None),
    is_border_crossing: int = Query(None),
    train_no: str = Query(None),
    limit: int = Query(200)
):
    """Returns corridor segments with station-name-only labels."""
    res = ROUTE_SEGMENTS
    if corridor_slug and corridor_slug != 'ALL':
        norm_c = CORRIDOR_MAP_NORMALIZER.get(corridor_slug, corridor_slug)
        res = [s for s in res if s.get('corridor_slug') == norm_c]
    if segment_type and segment_type != 'ALL':
        res = [s for s in res if s.get('segment_type') == segment_type]
    if is_border_crossing is not None and is_border_crossing in [0, 1]:
        res = [s for s in res if int(s.get('is_border_crossing', 0)) == is_border_crossing]
    if train_no:
        clean_t = str(train_no).strip().lstrip('0')
        res = [s for s in res if str(s.get('train_no')).strip().lstrip('0') == clean_t]

    enriched = []
    for s in res[:limit]:
        f_name = s.get('from_station_name') or s.get('from_station_code', '')
        t_name = s.get('to_station_name') or s.get('to_station_code', '')
        s_copy = dict(s)
        s_copy['label'] = f"{f_name} → {t_name}"
        enriched.append(s_copy)
    return enriched

@app.get("/api/corridors")
def get_corridors():
    """Returns 7 national corridors with state border progressions."""
    return CORRIDOR_STATE_BORDERS

@app.get("/api/state_borders")
def get_state_borders():
    """Returns 29 territorial state border clubs with metrics."""
    return STATE_BORDERS

@app.get("/api/predict")
def predict_train(
    train_no: str = "12001",
    train_tier: str = Query(None),
    weather: str = "Clear",
    congestion: str = "None",
    tsr: str = "None",
    treta_block_occupancy: str = "Track_Clear",
    crossing_conflict: str = "Double_Quad_Track",
    chain_pulling: str = "0_Events",
    engine_failure: str = "Nominal",
    terminal_platform_hold: str = "Platform_Available",
    crew_duty_status: str = "Duty_Valid",
    treta_segment_number: str = Query(None),
    section_delay_mins: float = Query(0.0),
    section_delay_reason: str = Query(None),
    speedup_recovery_mins: float = Query(0.0),
    multi_station_injections: str = Query(None)
):
    """
    Computes compound delay across all individual operational cases:
    1. Primary Delay: DW + DTS + DCP + DE + D_section
    2. Cascading Domino Shocks: DH + DCR + DPL + DCW (where DCR = DOT + TZT)
    3. Gross Delay: PD + CD & Speed-Up Coverup (Time Recovery)
    4. EA & MEA: Absorbed by Extra Time Allotted
    5. Net Delay: max(0, GD - MEA) & Predicted ETA
    6. Multi-Station Zone Delay Progression & Cascaded Network Overlays
    """
    import json
    station_inj_map = {}
    if multi_station_injections:
        try:
            parsed = json.loads(multi_station_injections) if isinstance(multi_station_injections, str) else multi_station_injections
            if isinstance(parsed, list):
                for inj in parsed:
                    c = str(inj.get('station_code', '')).strip().upper()
                    if c:
                        station_inj_map[c] = inj
        except Exception as e:
            print(f"[predict_train] multi_station_injections parse error: {e}")

    if chain_pulling in ['0', '0_Events', 0]:
        acp_events = 0
        acp_str = '0_Events'
    elif chain_pulling in ['1', '1_Event', 1]:
        acp_events = 1
        acp_str = '1_Event'
    else:
        acp_events = 2
        acp_str = '2_Events'

    is_engine_fail = (engine_failure in ['Failure', 'true', 'True', True])
    engine_str = 'Failure' if is_engine_fail else 'Nominal'

    train_id = str(train_no).strip().zfill(5)
    seg_info = None
    if treta_segment_number:
        seg_info = get_segment_for_train(train_id, treta_segment_number)
        if seg_info and 'train_no' in seg_info:
            train_id = str(seg_info.get('train_no')).strip().zfill(5)

    t_info = TRAIN_MAP.get(train_id, {})
    if not t_info and train_id.lstrip('0') in TRAIN_MAP:
        t_info = TRAIN_MAP[train_id.lstrip('0')]

    train_name = t_info.get('train_name', f"TRAIN {train_no}")
    clean_tier = train_tier if isinstance(train_tier, str) and train_tier.strip() else None
    resolved_tier = normalize_train_tier(clean_tier or t_info.get('train_tier', 'T2_SUPERFAST'))
    source_stn = t_info.get('source_station', 'NEW DELHI')
    dest_stn = t_info.get('destination_station', 'BHOPAL JN')
    total_dist = float(t_info.get('total_distance_km', 700.0))
    total_halts = int(t_info.get('total_halt_count', t_info.get('total_halts', 8)))
    duration_mins = float(t_info.get('duration_mins', 500.0))
    nominal_ea = float(t_info.get('net_slack_mins', t_info.get('extra_time_mins', t_info.get('extra_allotted_time_mins', 90.0))))

    dest_info = DEST_MAP.get(train_id, {})
    sched_dest_arr = dest_info.get('arr_time', '22:30')
    sched_day = dest_info.get('day', 1)

    corr_meta = TRAIN_CORRIDOR_MAP.get(train_id, {})
    rel_corr_slug = corr_meta.get('corridor_slug', 'DEL-MUM')
    rel_corr_name = corr_meta.get('corridor_name', 'National Rail Corridor')

    # Dual Database check: Master baseline vs Simulation sandbox
    clean_seg = treta_segment_number.strip() if (isinstance(treta_segment_number, str) and treta_segment_number.strip()) else None
    db_comparison = get_train_db_comparison(train_id, clean_seg)
    d_inherited = float(db_comparison.get('inherited_delay_mins', 0.0))

    # 1. Primary Delay: PD = D_inherited + DW + DTS + DCP + DE + D_section
    w_map = {'Clear': 0.0, 'Heavy_Rain': 12.0, 'Thunderstorm': 18.0, 'Snow': 22.0, 'Fog': 35.0}
    d_weather = w_map.get(weather, 0.0)

    tsr_map = {'None': 0.0, 'Minor': 8.0, 'Major': 24.0}
    d_tsr = tsr_map.get(tsr, 0.0)

    d_section = max(0.0, float(section_delay_mins or 0.0))
    d_acp = acp_events * 15.0
    d_engine = 15.0 if is_engine_fail else 0.0
    primary_delay = round(d_inherited + d_weather + d_tsr + d_acp + d_engine + d_section, 1)

    # 2. Cascading Domino Shocks: CD = DH + DCR + DPL + DCW
    c_mult = 0.5 if congestion == 'None' else (1.0 if congestion == 'Low' else 1.8)
    base_hw = round(3.0 * c_mult, 1)

    occ_map = {
        'Track_Clear': 0.0,
        'Preceding_Delayed_Minor': 5.0,
        'Preceding_Delayed_Moderate': 10.0,
        'Preceding_Delayed_Severe': 20.0
    }
    inherited_delay = occ_map.get(treta_block_occupancy, 0.0)
    engine_ripple = 12.5 if is_engine_fail else 0.0
    d_headway = round(max(base_hw, inherited_delay, engine_ripple), 1)

    tier_yield = 0.4 if resolved_tier == 'T1_PREMIUM' else (1.0 if resolved_tier == 'T2_SUPERFAST' else 1.5)
    cross_map = {'Double_Quad_Track': 0.0, 'Minor_Crossing_Wait': 8.0, 'Major_Crossing_Wait': 25.0}
    d_crossing = round(cross_map.get(crossing_conflict, 0.0) * tier_yield, 1)

    d_platform = 15.0 if terminal_platform_hold == 'Outer_Holding' else 0.0
    d_crew = 45.0 if crew_duty_status == 'Duty_Exceeded' else 0.0

    cascade_delay = round(d_headway + d_crossing + d_platform + d_crew, 1)

    # 3. Gross Delay & Speed-Up Coverup (Time Recovery)
    gross_delay = round(primary_delay + cascade_delay, 1)

    tier_default_speedup = 20.0 if resolved_tier.startswith('T1') else (15.0 if resolved_tier.startswith('T2') else 10.0)
    effective_speedup_arg = tier_default_speedup if speedup_recovery_mins is None else float(speedup_recovery_mins)
    d_speedup_total = max(0.0, effective_speedup_arg)
    for inj in station_inj_map.values():
        d_speedup_total += max(0.0, float(inj.get('speedup_recovery_mins', 0.0)))
    d_speedup_total = round(d_speedup_total, 1)

    speedup_recovered = round(min(gross_delay, d_speedup_total), 1)
    effective_gross = round(max(0.0, gross_delay - speedup_recovered), 1)

    # 4. EA & MEA Calculation: Absorbed by Extra Time Allotted
    rec_rate = 0.35 if resolved_tier == 'T1_PREMIUM' else (0.25 if resolved_tier == 'T2_SUPERFAST' else 0.15)
    max_usable_ea = round(nominal_ea * rec_rate, 1)

    # 5. Net Delay: ND = max(0, effective_gross - MEA) & Predicted ETA
    absorbed_ea = round(min(effective_gross, max_usable_ea), 1)
    net_delay = round(max(0.0, effective_gross - absorbed_ea), 1)
    delay_absorbed_completely = (net_delay <= 0.0)
    arrival_status = 'ON_TIME' if (delay_absorbed_completely or net_delay <= 5.0) else 'LATE'
    predicted_eta = format_predicted_eta(sched_dest_arr, sched_day, (0.0 if delay_absorbed_completely else net_delay))

    # Calculate downstream stations progression (Ahead of Delay Origin & Multi-Station Injections)
    stops_list = SCHEDULES_MAP.get(train_id, [])
    ahead_stations = []
    delay_origin_station = source_stn
    delay_origin_seq = 1

    if seg_info:
        f_code = seg_info.get('from_station_code')
        delay_origin_station = seg_info.get('from_station_name') or f_code
        for idx, stn in enumerate(stops_list):
            if stn.get('station_code') == f_code:
                delay_origin_seq = idx + 1
                break

    origin_dist = 0.0
    for stn in stops_list:
        if stn.get('sr_no') == delay_origin_seq:
            origin_dist = stn.get('dist_km', 0.0)
            break

    total_dist_rem = max(1.0, total_dist - origin_dist)

    cum_zone_shock = 0.0
    cum_zone_speedup = 0.0

    for idx_stn, stn in enumerate(stops_list):
        s_seq = stn.get('sr_no', idx_stn + 1)
        s_code = str(stn.get('station_code', '')).strip().upper()
        s_name = stn.get('station_name', '')
        s_dist = float(stn.get('dist_km', 0.0))
        s_arr = stn.get('arr_time', '')
        s_dep = stn.get('dep_time', '')
        s_day = int(stn.get('day', 1))
        disp_sched = s_arr if s_arr != 'SRC' else s_dep

        # Check if station has specific circumstances or speedup coverup injected
        stn_inj = station_inj_map.get(s_code, {})
        loc_weather = stn_inj.get('weather')
        loc_tsr = stn_inj.get('tsr') or stn_inj.get('tsr_level')
        loc_acp = stn_inj.get('acp') or stn_inj.get('alarm_chain_pulling')
        loc_eng = stn_inj.get('engine') or stn_inj.get('engine_failure')
        loc_occ = stn_inj.get('treta_block_occupancy')
        loc_xing = stn_inj.get('crossing_conflict')
        loc_plat = stn_inj.get('terminal_platform_hold')
        loc_crew = stn_inj.get('crew_duty_status')
        loc_reason = stn_inj.get('reason')
        loc_sec_delay = float(stn_inj.get('section_delay_mins', 0.0))
        loc_speedup = float(stn_inj.get('speedup_recovery_mins', 0.0))

        local_shock = 0.0
        local_tags = []
        if loc_weather and loc_weather != 'Clear':
            w_val = w_map.get(loc_weather, 0.0)
            local_shock += w_val
            local_tags.append(f"{loc_weather} (+{w_val:.0f}m)")
        if loc_tsr and loc_tsr != 'None':
            tsr_val = tsr_map.get(loc_tsr, 0.0)
            local_shock += tsr_val
            local_tags.append(f"{loc_tsr} TSR (+{tsr_val:.0f}m)")
        if loc_acp and loc_acp not in ['0', '0_Events', 0]:
            acp_val = 15.0 if loc_acp in ['1', '1_Event', 1] else 30.0
            local_shock += acp_val
            local_tags.append(f"ACP (+{acp_val:.0f}m)")
        if loc_eng and loc_eng not in ['Nominal', 'false', False]:
            local_shock += 15.0
            local_tags.append("Loco Fault (+15m)")
        if loc_occ and loc_occ != 'Track_Clear':
            occ_val = 5.0 if 'Minor' in loc_occ else (10.0 if 'Moderate' in loc_occ else 20.0)
            local_shock += occ_val
            local_tags.append(f"Preceding Delayed (+{occ_val:.0f}m)")
        if loc_xing and loc_xing != 'Double_Quad_Track':
            xing_val = 8.0 if 'Minor' in loc_xing else 22.0
            local_shock += xing_val
            local_tags.append(f"Crossing Wait (+{xing_val:.0f}m)")
        if loc_plat and loc_plat != 'Platform_Available':
            plat_val = 15.0
            local_shock += plat_val
            local_tags.append(f"Platform Hold (+{plat_val:.0f}m)")
        if loc_crew and loc_crew != 'Duty_Valid':
            crew_val = 45.0
            local_shock += crew_val
            local_tags.append(f"Crew Relief (+{crew_val:.0f}m)")
        if loc_sec_delay > 0:
            local_shock += loc_sec_delay
            local_tags.append(f"Injected Delay (+{loc_sec_delay:.0f}m)")
        if loc_speedup > 0:
            cum_zone_speedup += loc_speedup
            local_tags.append(f"Max Speed Coverup (-{loc_speedup:.0f}m)")
        if loc_reason and loc_reason not in [t.split(' (')[0] for t in local_tags]:
            local_tags.append(loc_reason)

        if s_seq == delay_origin_seq:
            cum_zone_shock += gross_delay
            if float(speedup_recovery_mins or 0.0) > 0:
                cum_zone_speedup += float(speedup_recovery_mins or 0.0)
        elif not seg_info and s_seq == 1:
            cum_zone_shock += gross_delay
            if float(speedup_recovery_mins or 0.0) > 0:
                cum_zone_speedup += float(speedup_recovery_mins or 0.0)

        cum_zone_shock += local_shock

        if s_seq < delay_origin_seq and not station_inj_map.get(s_code):
            ahead_stations.append({
                'seq': s_seq,
                'station_code': s_code,
                'station_name': s_name,
                'dist_km': s_dist,
                'is_ahead': False,
                'is_origin': False,
                'scheduled_arr': disp_sched,
                'day': s_day,
                'incoming_delay_mins': 0.0,
                'gross_delay_mins': 0.0,
                'speedup_recovered_mins': 0.0,
                'absorbed_ea_mins': 0.0,
                'net_delay_mins': 0.0,
                'predicted_arrival': format_predicted_eta(disp_sched, s_day, 0.0),
                'delay_absorbed': True,
                'status': 'ON_TIME',
                'note': 'Before Disturbance',
                'circumstance_tags': []
            })
        else:
            incoming_delay = max(0.0, round(cum_zone_shock - cum_zone_speedup, 1))

            dist_from_origin = max(0.0, s_dist - origin_dist)
            hop_ea_share = round(nominal_ea * (dist_from_origin / max(1.0, total_dist_rem)), 1)
            hop_absorb_cap = round(hop_ea_share * rec_rate, 1)
            hop_absorbed = round(min(incoming_delay, hop_absorb_cap), 1)
            stn_net = round(max(0.0, incoming_delay - hop_absorbed), 1)
            stn_absorbed = (stn_net <= 0.0)

            status_str = 'ON_TIME' if (stn_absorbed or stn_net <= 5.0) else 'LATE'
            note_str = "On Time"
            if local_tags:
                note_str = " & ".join(local_tags)
            elif stn_absorbed and incoming_delay > 0:
                note_str = "Delay Absorbed by EA Slack"
            elif s_seq == delay_origin_seq and not stn_absorbed:
                note_str = "Disturbance Origin"
            elif stn_net > 0:
                note_str = f"+{stn_net:.1f}m Late"

            ahead_stations.append({
                'seq': s_seq,
                'station_code': s_code,
                'station_name': s_name,
                'dist_km': s_dist,
                'is_ahead': (s_seq > delay_origin_seq),
                'is_origin': (s_seq == delay_origin_seq),
                'scheduled_arr': disp_sched,
                'day': s_day,
                'incoming_delay_mins': incoming_delay,
                'gross_delay_mins': round(cum_zone_shock, 1),
                'speedup_recovered_mins': round(cum_zone_speedup, 1),
                'absorbed_ea_mins': hop_absorbed,
                'net_delay_mins': stn_net,
                'predicted_arrival': format_predicted_eta(disp_sched, s_day, stn_net),
                'delay_absorbed': stn_absorbed,
                'status': status_str,
                'note': note_str,
                'circumstance_tags': local_tags
            })

    # If specific segment was provided, scale to segment hop distance
    seg_result = None
    if seg_info:
        seg_dist = float(seg_info.get('segment_distance_km', 100.0))
        dist_scale = max(0.2, min(3.0, seg_dist / 100.0))
        is_xing = int(seg_info.get('is_border_crossing', 0))
        xing_buf = 3.0 if is_xing == 1 else 0.0

        seg_primary = round(primary_delay * dist_scale, 1)
        seg_cascade = round(cascade_delay * dist_scale + xing_buf, 1)
        seg_gross = round(seg_primary + seg_cascade, 1)
        seg_nominal_ea = nominal_ea * dist_scale
        seg_absorbed = round(min(seg_gross * rec_rate, seg_nominal_ea * 0.50), 1)
        seg_net = round(max(0.0, seg_gross - seg_absorbed), 1)
        seg_sched_arr = str(seg_info.get('arr_time', '22:30')).strip()
        seg_day = int(seg_info.get('day', 1))
        seg_delay_absorbed = (seg_net <= 0.0)
        seg_eta = format_predicted_eta(seg_sched_arr, seg_day, (0.0 if seg_delay_absorbed else seg_net))

        seg_result = {
            'treta_segment_number': seg_info.get('treta_segment_number'),
            'corridor': seg_info.get('corridor'),
            'segment_type': seg_info.get('segment_type'),
            'from_station': seg_info.get('from_station_name') or seg_info.get('from_station_code'),
            'from_state_border': f"{seg_info.get('from_state', '')} [{seg_info.get('from_state_border_key', '')}]",
            'to_station': seg_info.get('to_station_name') or seg_info.get('to_station_code'),
            'to_state_border': f"{seg_info.get('to_state', '')} [{seg_info.get('to_state_border_key', '')}]",
            'is_border_crossing': is_xing,
            'state_border_transition': seg_info.get('state_border_transition'),
            'segment_distance_km': seg_dist,
            'segment_primary_delay': seg_primary,
            'segment_cascade_delay': seg_cascade,
            'segment_gross_delay': seg_gross,
            'segment_absorbed_ea': seg_absorbed,
            'segment_net_delay': 0.0 if seg_delay_absorbed else seg_net,
            'segment_scheduled_arrival': seg_sched_arr,
            'segment_predicted_eta': seg_eta,
            'delay_absorbed': seg_delay_absorbed,
            'segment_status': 'ON_TIME' if (seg_delay_absorbed or seg_net <= 5.0) else 'LATE'
        }

    applied_dict = {
        "train_tier": resolved_tier,
        "weather": weather,
        "tsr_level": tsr,
        "priority_congestion": congestion,
        "treta_block_occupancy": treta_block_occupancy,
        "crossing_conflict": crossing_conflict,
        "alarm_chain_pulling": acp_str,
        "engine_failure": engine_str,
        "terminal_platform_hold": terminal_platform_hold,
        "crew_duty_status": crew_duty_status,
        "treta_segment_number": treta_segment_number,
        "section_delay_mins": d_section,
        "speedup_recovery_mins": d_speedup_total,
        "multi_station_injections_count": len(station_inj_map)
    }
    primary_dict = {
        "d_inherited_cascade": d_inherited,
        "d_weather": d_weather,
        "d_tsr": d_tsr,
        "d_chain_pulling": d_acp,
        "d_engine_failure": d_engine,
        "d_section_delay": d_section,
        "section_delay_reason": section_delay_reason or ('Section Injected Shock' if d_section > 0 else 'None'),
        "PrimaryDelay": primary_delay
    }
    cascade_dict = {
        "d_headway": d_headway,
        "d_crossing": d_crossing,
        "d_platform_hold": d_platform,
        "d_crew": d_crew,
        "CascadeDelay": cascade_delay
    }
    math_dict = {
        "grossDelay": gross_delay,
        "speedup_recovered_mins": speedup_recovered,
        "effective_grossDelay": effective_gross,
        "Absorbed_by_EA": absorbed_ea,
        "NetDelay": 0.0 if delay_absorbed_completely else net_delay,
        "delay_absorbed_completely": delay_absorbed_completely,
        "ScheduledDestinationArrival": sched_dest_arr,
        "Predicted_ETA": predicted_eta,
        "Arrival_Status": arrival_status
    }

    # Generate extensive delay explanation
    explanation_res = generate_delay_explanation(
        applied_cases=applied_dict,
        primary_breakdown=primary_dict,
        cascade_breakdown=cascade_dict,
        math_resolution=math_dict,
        seg_info=seg_info
    )

    # Compute temporal overlays and cascaded delay impacts
    effective_net = seg_result['segment_net_delay'] if seg_result else (0.0 if delay_absorbed_completely else net_delay)
    if delay_absorbed_completely or effective_net <= 0.0:
        effective_net = 0.0

    eval_net = effective_net if effective_net > 0.0 else 0.0
    cascaded_res = compute_cascaded_overlays(
        seg_info=seg_info or get_segment_for_train(train_id),
        net_delay=eval_net,
        train_no=train_id,
        train_tier=resolved_tier
    )

    # Auto-persist cascaded secondary train impacts to WIN_SIMULATION.db sandbox
    if os.path.exists(SIM_DB_PATH) and cascaded_res.get('overlaid_trains') and effective_net > 0.0:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            conn = sqlite3.connect(SIM_DB_PATH)
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS SimulationCascadedEffects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    trigger_train_no TEXT,
                    trigger_segment TEXT,
                    affected_train_no TEXT,
                    affected_train_name TEXT,
                    affected_tier TEXT,
                    conflict_type TEXT,
                    transmitted_delay_mins REAL,
                    pushed_at TEXT
                )
            """)
            r_cols = [r[1] for r in cur.execute("PRAGMA table_info('RouteDivision')").fetchall()]
            if 'sim_proposed_delay' not in r_cols:
                cur.execute("ALTER TABLE 'RouteDivision' ADD COLUMN sim_proposed_delay REAL DEFAULT 0.0")
            if 'sim_new_eta' not in r_cols:
                cur.execute("ALTER TABLE 'RouteDivision' ADD COLUMN sim_new_eta TEXT DEFAULT ''")
            if 'sim_status' not in r_cols:
                cur.execute("ALTER TABLE 'RouteDivision' ADD COLUMN sim_status TEXT DEFAULT ''")
            if 'sim_updated_at' not in r_cols:
                cur.execute("ALTER TABLE 'RouteDivision' ADD COLUMN sim_updated_at TEXT DEFAULT ''")

            for aff in cascaded_res['overlaid_trains']:
                aff_t = str(aff.get('train_no')).strip().zfill(5)
                aff_clean = aff_t.lstrip('0')
                delay_val = float(aff.get('transmitted_delay_mins', 0.0))
                if delay_val > 0:
                    cur.execute("""
                        INSERT INTO SimulationCascadedEffects (
                            trigger_train_no, trigger_segment, affected_train_no, affected_train_name,
                            affected_tier, conflict_type, transmitted_delay_mins, pushed_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        train_id,
                        treta_segment_number or 'CORRIDOR_FULL',
                        aff_t,
                        aff.get('train_name'),
                        aff.get('train_tier'),
                        aff.get('conflict_type'),
                        delay_val,
                        now_str
                    ))
                    cur.execute("""
                        UPDATE RouteDivision
                        SET sim_proposed_delay = ?, sim_status = 'DELAYED_CASCADED', sim_updated_at = ?
                        WHERE train_no = ? OR train_no = ?
                    """, (delay_val, now_str, aff_t, aff_clean))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[predict_train] Auto-persist error: {e}")

    return {
        "train_no": train_id,
        "train_name": train_name,
        "train_tier": resolved_tier,
        "source_station": source_stn,
        "destination_station": dest_stn,
        "total_distance_km": total_dist,
        "total_halts": total_halts,
        "EA_allotted_mins": nominal_ea,
        "relevant_corridor_slug": rel_corr_slug,
        "relevant_corridor_name": rel_corr_name,
        "applied_cases": applied_dict,
        "primary_breakdown": primary_dict,
        "cascade_breakdown": cascade_dict,
        "math_resolution": math_dict,
        "segment_breakdown": seg_result,
        "delay_origin_station": delay_origin_station,
        "ahead_stations": ahead_stations,
        "explanation": explanation_res,
        "cascaded_delays": cascaded_res,
        "d_inherited_cascade": d_inherited,
        "inherited_from_sim_db": (d_inherited > 0.0),
        "db_comparison": db_comparison
    }


# -----------------------------------------------------------------------------
# RAILRADAR LIVE LOCATION API & MASTER DB (WIN.db) COMBINATION MATCHING ENGINE
# -----------------------------------------------------------------------------

RAILRADAR_SAMPLE_12919 = {
  "success": True,
  "data": {
    "trainNumber": "12919",
    "trainName": "Malwa SF Express",
    "startDate": "2026-06-22",
    "lastUpdatedAt": "2026-06-22T07:14:00+05:30",
    "status": "running",
    "delayMinutes": 12,
    "train": {
      "number": "12919",
      "name": "Malwa SF Express",
      "type": "Superfast Express",
      "category": "Superfast",
      "source": {
        "code": "INDB",
        "name": "Indore Junction"
      },
      "destination": {
        "code": "SVDK",
        "name": "Shri Mata Vaishno Devi Katra"
      },
      "runDays": [
        "mon",
        "tue",
        "wed",
        "thu",
        "fri",
        "sat",
        "sun"
      ],
      "distance": 1640,
      "duration": 1720,
      "avgSpeed": 57.2,
      "maxSpeed": 110,
      "totalHalts": 45,
      "returnTrain": "12920"
    },
    "currentLocation": {
      "stationCode": "UJN",
      "sequence": 2,
      "status": "departed",
      "isHalt": True,
      "isDiverted": False,
      "isActualPosition": True,
      "segmentProgress": 0.45,
      "speedKmh": 65.5,
      "bearingDegrees": 180
    },
    "previousHalt": {
      "stationCode": "INDB",
      "stationName": "Indore Junction",
      "sequence": 1,
      "distance": 0
    },
    "nextHalt": {
      "stationCode": "UJN",
      "stationName": "Ujjain Junction",
      "sequence": 2,
      "distance": 55
    },
    "exceptions": [
      {
        "type": "DIVERTED",
        "message": "Train is diverted between UJN (Ujjain Junction) and MKSM (Maksi)",
        "diverted": {
          "from": {
            "code": "UJN",
            "name": "Ujjain Junction",
            "sequence": 2
          },
          "to": {
            "code": "MKSM",
            "name": "Maksi",
            "sequence": 3
          },
          "divertedStations": [
            {
              "order": 0,
              "sequence": 3,
              "stationCode": "PLW",
              "stationName": "Pingleshwar",
              "lat": 23.19,
              "lng": 75.95,
              "isHalt": False,
              "status": "departed",
              "scheduledArrival": "2026-06-23T01:15:00+05:30",
              "scheduledDeparture": "2026-06-23T01:15:00+05:30",
              "actualArrival": "2026-06-23T01:27:00+05:30",
              "actualDeparture": "2026-06-23T01:27:00+05:30",
              "delayArrival": 12,
              "delayDeparture": 12,
              "platform": None,
              "platformChanged": False,
              "distance": 68
            },
            {
              "order": 1,
              "sequence": 4,
              "stationCode": "TJP",
              "stationName": "Tajpur",
              "lat": 23.2,
              "lng": 76.08,
              "isHalt": True,
              "status": "upcoming",
              "scheduledArrival": "2026-06-23T01:45:00+05:30",
              "scheduledDeparture": "2026-06-23T01:50:00+05:30",
              "actualArrival": None,
              "actualDeparture": None,
              "delayArrival": None,
              "delayDeparture": None,
              "platform": "1",
              "platformChanged": False,
              "distance": 82
            }
          ],
          "skippedStations": [
            {
              "code": "MKSM",
              "name": "Maksi",
              "scheduledSequence": 3,
              "scheduledArrival": "2026-06-23T02:10:00+05:30",
              "scheduledDeparture": "2026-06-23T02:12:00+05:30"
            }
          ],
          "hasReversal": False,
          "geometry": "encoded_polyline_string",
          "distanceKm": 41
        },
        "partiallyCancelled": None,
        "rescheduled": None
      }
    ],
    "route": [
      {
        "sequence": 1,
        "stationCode": "INDB",
        "stationName": "Indore Junction",
        "isHalt": True,
        "lat": 22.72,
        "lng": 75.86,
        "scheduledArrival": None,
        "scheduledDeparture": "2026-06-22T23:55:00+05:30",
        "actualArrival": None,
        "actualDeparture": "2026-06-23T00:07:00+05:30",
        "delayArrival": None,
        "delayDeparture": 12,
        "status": "departed",
        "distance": 0,
        "speedToNextStationKmph": 55,
        "platform": "4"
      },
      {
        "sequence": 2,
        "stationCode": "UJN",
        "stationName": "Ujjain Junction",
        "isHalt": True,
        "lat": 23.17,
        "lng": 75.78,
        "scheduledArrival": "2026-06-23T00:55:00+05:30",
        "scheduledDeparture": "2026-06-23T01:00:00+05:30",
        "actualArrival": "2026-06-23T01:07:00+05:30",
        "actualDeparture": "2026-06-23T01:12:00+05:30",
        "delayArrival": 12,
        "delayDeparture": 12,
        "status": "departed",
        "distance": 55,
        "speedToNextStationKmph": 60,
        "platform": "1"
      },
      {
        "sequence": 3,
        "stationCode": "MKSM",
        "stationName": "Maksi",
        "isHalt": True,
        "lat": 23.21,
        "lng": 76.22,
        "scheduledArrival": "2026-06-23T02:10:00+05:30",
        "scheduledDeparture": "2026-06-23T02:12:00+05:30",
        "actualArrival": None,
        "actualDeparture": None,
        "delayArrival": None,
        "delayDeparture": None,
        "status": "upcoming",
        "distance": 96,
        "speedToNextStationKmph": 62,
        "platform": "3"
      }
    ],
    "isLive": True
  },
  "meta": {
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-06-22T12:30:00+05:30",
    "executionTime": 38,
    "source": "database"
  }
}

def init_railradar_simulation_table():
    """Ensure WIN_SIMULATION.db exists as a sandbox copy and contains RailRadarTelemetry."""
    if not os.path.exists(SIM_DB_PATH) and os.path.exists(MASTER_DB_PATH):
        try:
            shutil.copyfile(MASTER_DB_PATH, SIM_DB_PATH)
        except Exception:
            pass
    if os.path.exists(SIM_DB_PATH):
        try:
            conn = sqlite3.connect(SIM_DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS RailRadarTelemetry (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    train_no TEXT,
                    train_name TEXT,
                    detected_station TEXT,
                    detected_delay_mins REAL,
                    speed_kmh REAL,
                    segment_progress REAL,
                    is_diverted INTEGER,
                    combination_id INTEGER,
                    matched_gross_delay REAL,
                    matched_net_delay REAL,
                    predicted_eta TEXT,
                    fetched_at TEXT
                )
            """)
            conn.commit()
            conn.close()
        except Exception:
            pass

# Initialize table on server start
init_railradar_simulation_table()

def get_railradar_live_telemetry(train_no: str) -> dict:
    """
    Fetches real-time train tracking telemetry strictly from API endpoints.
    - If upstream RailRadar API returns dynamic live data, that dynamic data is used.
    - If external API returns no data, is unreachable, or API key is unconfigured:
      All synthetic safety cover data is DELETED and 0 is displayed for delay, speed, and progress.
    """
    raw_t = str(train_no).strip()
    clean_t = raw_t.lstrip('0')
    t_key = raw_t.zfill(5) if len(raw_t) <= 5 else raw_t
    train_meta = TRAIN_MAP.get(t_key) or TRAIN_MAP.get(clean_t) or TRAIN_MAP.get(raw_t) or {}
    if not train_meta:
        try:
            conn = sqlite3.connect(f"file:{MASTER_DB_PATH}?mode=ro", uri=True)
            cur = conn.cursor()
            cur.execute("SELECT train_no, train_name, train_tier, source_station, destination_station FROM trains_metadata WHERE train_no = ? OR train_no = ? LIMIT 1", (t_key, clean_t))
            r = cur.fetchone()
            if r:
                train_meta = {'train_no': r[0], 'train_name': r[1], 'train_tier': r[2], 'source_station': r[3], 'destination_station': r[4]}
            conn.close()
        except Exception:
            pass
    resolved_train_name = train_meta.get('train_name') or f"TRAIN {t_key}"
    stops = SCHEDULES_MAP.get(t_key) or SCHEDULES_MAP.get(clean_t) or []
    now_ist = datetime.now().strftime("%Y-%m-%dT%H:%M:00+05:30")
    today_str = datetime.now().strftime("%Y-%m-%d")

    # 1. Attempt Upstream RailRadar Live API call
    if RAILRADAR_API_KEY:
        candidate_numbers = []
        if raw_t:
            candidate_numbers.append(raw_t)
        if t_key not in candidate_numbers:
            candidate_numbers.append(t_key)
        if clean_t and clean_t not in candidate_numbers:
            candidate_numbers.append(clean_t)

        urls_to_try = []
        for num in candidate_numbers:
            urls_to_try.extend([
                f"{RAILRADAR_API_URL}/trains/{num}/live",
                f"{RAILRADAR_API_URL}/live/{num}",
                f"{RAILRADAR_API_URL}/live-status/{num}",
                f"{RAILRADAR_API_URL}/train/{num}/live"
            ])

        for endpoint_url in urls_to_try:
            try:
                import urllib.request
                import json as _json
                req = urllib.request.Request(endpoint_url, headers={
                    "User-Agent": "BlackSheep-RailRadar/1.0",
                    "Authorization": f"Bearer {RAILRADAR_API_KEY}",
                    "X-API-KEY": RAILRADAR_API_KEY,
                    "x-api-key": RAILRADAR_API_KEY,
                    "Accept": "application/json"
                })
                with urllib.request.urlopen(req, timeout=5) as response:
                    if response.status == 200:
                        external_data = _json.loads(response.read().decode('utf-8'))
                        if external_data.get('success') and 'data' in external_data:
                            data_obj = external_data['data']
                            data_obj['isLive'] = True

                            curr_loc = data_obj.get('currentLocation') or {}
                            route_list = data_obj.get('route') or []
                            train_info = data_obj.get('train') or {}

                            # Ensure train name is official
                            if not data_obj.get('trainName') or str(data_obj.get('trainName')).startswith('TRAIN '):
                                data_obj['trainName'] = resolved_train_name
                            if not train_info.get('name') or str(train_info.get('name')).startswith('TRAIN '):
                                train_info['name'] = resolved_train_name

                            # Ensure delayMinutes is accurate float
                            live_delay = data_obj.get('delayMinutes')
                            if live_delay is None:
                                live_delay = curr_loc.get('delayMinutes', 0.0)
                            data_obj['delayMinutes'] = float(live_delay or 0.0)
                            curr_loc['delayMinutes'] = float(live_delay or 0.0)

                            # Calculate speed if 0 or null
                            speed_val = curr_loc.get('speedKmh')
                            if not speed_val or float(speed_val) == 0.0:
                                seq = curr_loc.get('sequence')
                                found_speed = None
                                if seq and route_list:
                                    for r_stn in route_list:
                                        if r_stn.get('sequence') == seq and r_stn.get('speedToNextStationKmph'):
                                            found_speed = float(r_stn['speedToNextStationKmph'])
                                            break
                                if not found_speed and train_info.get('avgSpeed'):
                                    found_speed = float(train_info['avgSpeed'])
                                curr_loc['speedKmh'] = found_speed or 0.0

                            # Calculate segmentProgress (as fraction 0.0 - 1.0)
                            prog_val = curr_loc.get('segmentProgress')
                            if not prog_val or float(prog_val) == 0.0:
                                dist_from_orig = float(curr_loc.get('distanceFromOriginKm', 0.0))
                                total_dist = float(train_info.get('distance', 0.0))
                                if not total_dist and route_list:
                                    total_dist = float(route_list[-1].get('distance', 0.0))
                                if total_dist > 0:
                                    curr_loc['segmentProgress'] = round(min(1.0, dist_from_orig / total_dist), 3)
                                else:
                                    curr_loc['segmentProgress'] = 0.0
                            elif float(prog_val) > 1.0:
                                curr_loc['segmentProgress'] = round(float(prog_val) / 100.0, 3)

                            data_obj['currentLocation'] = curr_loc

                            external_data['meta'] = external_data.get('meta', {})
                            external_data['meta']['source'] = 'upstream_live_api'
                            external_data['meta']['api_key_configured'] = True
                            external_data['meta']['is_live'] = True
                            external_data['meta']['endpoint_queried'] = endpoint_url
                            return external_data
            except Exception as e:
                pass

    # 2. No dynamic data available from upstream API endpoints:
    # All synthetic safety cover data (fake 14.0 delay, fake 78.5 km/h, fake 60% progress) is DELETED.
    # Returns clean 0 values as required.
    source_code = stops[0].get('station_code', '') if stops else train_meta.get('source_station', 'NDLS')
    source_name = stops[0].get('station_name', '') if stops else train_meta.get('source_station', 'NDLS')
    dest_code = stops[-1].get('station_code', '') if stops else train_meta.get('destination_station', '')
    dest_name = stops[-1].get('station_name', '') if stops else train_meta.get('destination_station', '')
    total_dist = float(stops[-1].get('dist_km', 0.0)) if stops else 0.0

    return {
        "success": True,
        "data": {
            "trainNumber": t_key,
            "trainName": resolved_train_name,
            "startDate": today_str,
            "lastUpdatedAt": now_ist,
            "status": "NO_LIVE_DATA",
            "delayMinutes": 0.0,
            "train": {
                "number": t_key,
                "name": resolved_train_name,
                "type": train_meta.get('train_tier', 'T2_SUPERFAST'),
                "category": train_meta.get('train_tier', 'T2_SUPERFAST'),
                "source": {"code": source_code, "name": source_name},
                "destination": {"code": dest_code, "name": dest_name},
                "distance": total_dist,
                "totalHalts": len(stops),
                "avgSpeed": 0.0
            },
            "currentLocation": {
                "stationCode": source_code,
                "stationName": source_name,
                "sequence": 0,
                "status": "NO_LIVE_DATA",
                "isHalt": False,
                "isDiverted": False,
                "isActualPosition": False,
                "segmentProgress": 0.0,
                "speedKmh": 0.0,
                "bearingDegrees": 0
            },
            "previousHalt": None,
            "nextHalt": None,
            "exceptions": [],
            "route": [],
            "isLive": False
        },
        "meta": {
            "traceId": f"offline-{t_key}",
            "timestamp": now_ist,
            "source": "api_no_live_data",
            "api_key_configured": bool(RAILRADAR_API_KEY),
            "is_live": False,
            "note": "No dynamic live telemetry returned from upstream API endpoints. All safety cover data deleted; displaying 0."
        }
    }

def match_railradar_to_master_db(
    telemetry: dict,
    section_delay_mins: float = 0.0,
    treta_segment_number: str = None,
    speedup_recovery_mins: float = 0.0,
    multi_station_injections: str = None
) -> dict:
    """
    Matches live RailRadar telemetry against MasterPnC combinations in WIN.db (Read-Only).
    Persists matched telemetry record into WIN_SIMULATION.db (Sandbox Working Copy).
    Calculates compound delay, predicted ETA, and downstream cascaded impact.
    """
    raw_data = telemetry.get('data', {})
    t_no_raw = str(raw_data.get('trainNumber', '12919')).strip()
    clean_t = t_no_raw.lstrip('0')
    t_key = t_no_raw.zfill(5) if len(t_no_raw) <= 5 else t_no_raw

    train_meta = TRAIN_MAP.get(t_key) or TRAIN_MAP.get(clean_t) or TRAIN_MAP.get(t_no_raw) or {}
    if not train_meta:
        try:
            conn = sqlite3.connect(f"file:{MASTER_DB_PATH}?mode=ro", uri=True)
            cur = conn.cursor()
            cur.execute("SELECT train_no, train_name, train_tier, source_station, destination_station FROM trains_metadata WHERE train_no = ? OR train_no = ? LIMIT 1", (t_key, clean_t))
            r = cur.fetchone()
            if r:
                train_meta = {'train_no': r[0], 'train_name': r[1], 'train_tier': r[2], 'source_station': r[3], 'destination_station': r[4]}
            conn.close()
        except Exception:
            pass

    train_name = train_meta.get('train_name') or raw_data.get('trainName') or raw_data.get('train', {}).get('name', f'TRAIN {t_key}')
    delay_mins = float(raw_data.get('delayMinutes', 0.0))
    is_live = bool(raw_data.get('isLive', False))
    sec_delay = max(0.0, float(section_delay_mins or 0.0))

    curr_loc = raw_data.get('currentLocation') or {}
    prev_halt = raw_data.get('previousHalt') or {}
    next_halt = raw_data.get('nextHalt') or {}
    exceptions = raw_data.get('exceptions', [])

    # 1. Resolve train tier & corridor
    corr_info = TRAIN_CORRIDOR_MAP.get(t_key, {})
    raw_slug = corr_info.get('corridor_slug', 'DEL-MUM')
    corr_slug = CORRIDOR_MAP_NORMALIZER.get(raw_slug, 'DEL-MUM')
    corr_name = NATIONAL_CORRIDORS.get(corr_slug, 'Delhi ↔ Mumbai (Western Corridor)')

    tier = train_meta.get('train_tier', 'T2_SUPERFAST')
    if tier not in ['T1_PREMIUM', 'T2_SUPERFAST', 'T3_EXPRESS_PASSENGER']:
        tier = 'T2_SUPERFAST'

    # 2. Check exceptions (e.g. DIVERTED route exception)
    has_diverted = any(str(e.get('type')).upper() == 'DIVERTED' for e in exceptions)
    preferred_crossing = 'Minor_Crossing_Wait' if has_diverted else 'Double_Quad_Track'

    speed_kmh = float(curr_loc.get('speedKmh', 0.0))

    # 3. Match combination in MasterPnC (Read-Only query on pristine WIN.db)
    matched_pnc = None
    target_match_delay = delay_mins if delay_mins > 0 else sec_delay
    try:
        conn = sqlite3.connect(f"file:{MASTER_DB_PATH}?mode=ro", uri=True)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT combination_id, train_tier, weather, tsr_level, priority_congestion,
                   treta_block_occupancy, crossing_conflict, alarm_chain_pulling, engine_failure,
                   terminal_platform_hold, crew_duty_status, d_weather, d_tsr, d_acp, d_engine_failure,
                   primary_delay_mins, d_headway_treta, d_crossing, d_platform_hold, d_crew_delay,
                   cascade_delay_mins, gross_delay_mins, nominal_ea_buffer_mins, absorbed_by_ea_mins,
                   net_delay_mins, arrival_status
            FROM MasterPnC
            WHERE train_tier = ?
            ORDER BY
                (CASE WHEN crossing_conflict = ? THEN 0 ELSE 1 END),
                abs(gross_delay_mins - ?) ASC,
                abs(net_delay_mins - ?) ASC
            LIMIT 1
        """, (tier, preferred_crossing, target_match_delay, target_match_delay))
        row = cursor.fetchone()
        cols = [d[0] for d in cursor.description]
        conn.close()

        if row:
            matched_pnc = dict(zip(cols, row))
            for k in ['tsr_level', 'priority_congestion']:
                if not matched_pnc.get(k) or str(matched_pnc.get(k)).lower() in ['none', 'nan']:
                    matched_pnc[k] = 'None'
    except Exception as e:
        print(f"[RailRadar] Error matching MasterPnC in WIN.db: {e}")

    if not matched_pnc:
        matched_pnc = {
            "combination_id": 12961 if tier == 'T2_SUPERFAST' else (1 if tier == 'T1_PREMIUM' else 25921),
            "train_tier": tier,
            "weather": "Clear",
            "tsr_level": "None",
            "priority_congestion": "None",
            "treta_block_occupancy": "Track_Clear",
            "crossing_conflict": preferred_crossing,
            "alarm_chain_pulling": "0_Events",
            "engine_failure": "Nominal",
            "terminal_platform_hold": "Platform_Available",
            "crew_duty_status": "Duty_Valid",
            "primary_delay_mins": 0.0,
            "cascade_delay_mins": 0.0,
            "gross_delay_mins": 0.0,
            "absorbed_by_ea_mins": 0.0,
            "net_delay_mins": 0.0,
            "arrival_status": "ON_TIME"
        }

    # 4. Resolve location, state borders & segment
    source_stn = raw_data.get('train', {}).get('source', {}).get('code') or train_meta.get('source_station', 'NDLS')
    dest_stn = raw_data.get('train', {}).get('destination', {}).get('code') or train_meta.get('destination_station', 'BPL')
    curr_stn_code = curr_loc.get('stationCode') or next_halt.get('stationCode') or source_stn
    prev_stn_code = prev_halt.get('stationCode') or source_stn

    from_border = STATION_STATE_MAP.get(prev_stn_code, {}).get('state_border_key', 'SB-MP')
    to_border = STATION_STATE_MAP.get(curr_stn_code, {}).get('state_border_key', 'SB-MP')
    is_border_crossing = 1 if from_border != to_border else 0

    seg_id = treta_segment_number or f"TS-{corr_slug}-{t_key}-002"
    prev_stn_name = prev_halt.get('stationName') or prev_stn_code
    curr_stn_name = curr_loc.get('stationName') or next_halt.get('stationName') or curr_stn_code
    seg_label = f"{prev_stn_name} → {curr_stn_name}" if is_live else f"{source_stn} → {dest_stn}"

    SEGMENT_BY_ID[seg_id] = {
        'treta_segment_number': seg_id,
        'train_no': t_key,
        'from_station_code': prev_stn_code,
        'from_station_name': prev_stn_name,
        'to_station_code': curr_stn_code,
        'to_station_name': curr_stn_name,
        'from_state_border_key': from_border,
        'to_state_border_key': to_border,
        'is_border_crossing': is_border_crossing,
        'segment_distance_km': float(next_halt.get('distance', 55.0)) if is_live else 0.0
    }

    matched_cases = {
        "train_tier": matched_pnc.get('train_tier', tier),
        "weather": matched_pnc.get('weather', 'Clear'),
        "tsr_level": matched_pnc.get('tsr_level', 'None') or 'None',
        "priority_congestion": matched_pnc.get('priority_congestion', 'None') or 'None',
        "treta_block_occupancy": matched_pnc.get('treta_block_occupancy', 'Track_Clear'),
        "crossing_conflict": matched_pnc.get('crossing_conflict', preferred_crossing),
        "alarm_chain_pulling": matched_pnc.get('alarm_chain_pulling', '0_Events'),
        "engine_failure": matched_pnc.get('engine_failure', 'Nominal'),
        "terminal_platform_hold": matched_pnc.get('terminal_platform_hold', 'Platform_Available'),
        "crew_duty_status": matched_pnc.get('crew_duty_status', 'Duty_Valid'),
        "treta_segment_number": seg_id,
        "section_delay_mins": sec_delay
    }

    # 5. Run prediction calculation with matched MasterPnC combination and section delay
    active_seg = treta_segment_number or seg_id
    effective_section_shock = (delay_mins if is_live else 0.0) + sec_delay

    prediction_result = predict_train(
        train_no=t_key,
        train_tier=matched_cases['train_tier'],
        weather=matched_cases['weather'],
        congestion=matched_cases['priority_congestion'],
        tsr=matched_cases['tsr_level'],
        treta_block_occupancy=matched_cases['treta_block_occupancy'],
        crossing_conflict=matched_cases['crossing_conflict'],
        chain_pulling=matched_cases['alarm_chain_pulling'],
        engine_failure=matched_cases['engine_failure'],
        terminal_platform_hold=matched_cases['terminal_platform_hold'],
        crew_duty_status=matched_cases['crew_duty_status'],
        treta_segment_number=active_seg,
        section_delay_mins=effective_section_shock,
        section_delay_reason=f"RailRadar Live Shock (+{delay_mins:.0f}m)" if is_live and delay_mins > 0 else ("Section Injection" if sec_delay > 0 else None),
        speedup_recovery_mins=speedup_recovery_mins,
        multi_station_injections=multi_station_injections
    )

    # When not live and no delays injected, show zero resolution
    if (not is_live or delay_mins == 0.0) and sec_delay == 0.0:
        prediction_result['math_resolution']['grossDelay'] = 0.0
        prediction_result['math_resolution']['Absorbed_by_EA'] = 0.0
        prediction_result['math_resolution']['NetDelay'] = 0.0
        prediction_result['math_resolution']['Arrival_Status'] = 'ON_TIME'
        prediction_result['cascaded_delays']['cumulative_knock_on_mins'] = 0.0
        prediction_result['cascaded_delays']['total_affected_trains'] = 0
        prediction_result['cascaded_delays']['overlaid_trains'] = []

    # 6. Strictly log telemetry to database copy WIN_SIMULATION.db (WIN.db is strictly untouched)
    if is_live or sec_delay > 0.0:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            init_railradar_simulation_table()
            if os.path.exists(SIM_DB_PATH):
                conn = sqlite3.connect(SIM_DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO RailRadarTelemetry (
                        train_no, train_name, detected_station, detected_delay_mins, speed_kmh,
                        segment_progress, is_diverted, combination_id, matched_gross_delay,
                        matched_net_delay, predicted_eta, fetched_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    t_key,
                    train_name,
                    curr_stn_code,
                    delay_mins + sec_delay,
                    speed_kmh,
                    float(curr_loc.get('segmentProgress', 0.0)),
                    1 if has_diverted else 0,
                    int(matched_pnc.get('combination_id', 0)),
                    float(prediction_result['math_resolution']['grossDelay']),
                    float(prediction_result['math_resolution']['NetDelay']),
                    str(prediction_result['math_resolution']['Predicted_ETA']),
                    now_str
                ))
                conn.commit()
                conn.close()
        except Exception as e:
            print(f"[RailRadar] Sandbox telemetry persistence error: {e}")

    return {
        "success": True,
        "train_no": t_key,
        "train_name": train_name,
        "railradar_raw": raw_data,
        "matched_combination": {
            "combination_id": matched_pnc.get('combination_id'),
            "train_tier": matched_cases['train_tier'],
            "weather": matched_cases['weather'],
            "tsr_level": matched_cases['tsr_level'],
            "priority_congestion": matched_cases['priority_congestion'],
            "treta_block_occupancy": matched_cases['treta_block_occupancy'],
            "crossing_conflict": matched_cases['crossing_conflict'],
            "alarm_chain_pulling": matched_cases['alarm_chain_pulling'],
            "engine_failure": matched_cases['engine_failure'],
            "terminal_platform_hold": matched_cases['terminal_platform_hold'],
            "crew_duty_status": matched_cases['crew_duty_status'],
            "pnc_gross_delay": matched_pnc.get('gross_delay_mins') if is_live else 0.0,
            "pnc_net_delay": matched_pnc.get('net_delay_mins') if is_live else 0.0,
            "has_diverted_exception": has_diverted
        },
        "frozen_controls": {
            "corridor": corr_slug,
            "border_crossing": str(is_border_crossing),
            "selected_segment": active_seg,
            "segment_label": seg_label,
            "from_station_code": prev_stn_code,
            "to_station_code": curr_stn_code,
            "cases": matched_cases,
            "is_frozen": is_live,
            "has_live_telemetry": is_live,
            "section_delay_mins": sec_delay,
            "speedup_recovery_mins": speedup_recovery_mins,
            "lock_reason": (
                f"Live RailRadar Telemetry ({curr_stn_code} • {f'+{delay_mins:.0f}m' if delay_mins >= 0 else f'{delay_mins:.0f}m'})"
                if is_live else (f"Section Delay Injected (+{sec_delay:.0f}m)" if sec_delay > 0 else "No Live GPS Signal (Reporting 0.0m delay • Controls Unlocked)")
            )
        },
        "prediction": prediction_result,
        "master_db_untouched": True,
        "sandbox_logged_db": "WIN_SIMULATION.db"
    }

@app.get("/api/railradar/live")
def get_railradar_live(train_no: str = Query("12919")):
    """
    Returns real-time train tracking telemetry from RailRadar API.
    """
    return get_railradar_live_telemetry(train_no)

@app.api_route("/api/railradar/match", methods=["GET", "POST"])
def match_railradar_endpoint(
    payload: dict = Body(None),
    train_no: str = Query(None),
    section_delay_mins: float = Query(0.0),
    treta_segment_number: str = Query(None),
    speedup_recovery_mins: float = Query(0.0),
    multi_station_injections: str = Query(None)
):
    """
    Matches live RailRadar telemetry against combinations in master matrix,
    calculates predictions, logs telemetry into sandbox, and returns frozen state.
    """
    if not payload or not payload.get('data'):
        target_train = train_no or (payload.get('train_no') if payload else '12919')
        payload = get_railradar_live_telemetry(target_train)
    sec_del = float(section_delay_mins or (payload.get('section_delay_mins', 0.0) if payload else 0.0))
    sec_num = treta_segment_number or (payload.get('treta_segment_number') if payload else None)
    speedup = float(speedup_recovery_mins or (payload.get('speedup_recovery_mins', 0.0) if payload else 0.0))
    multi_inj = multi_station_injections or (payload.get('multi_station_injections') if payload else None)
    return match_railradar_to_master_db(
        payload,
        section_delay_mins=sec_del,
        treta_segment_number=sec_num,
        speedup_recovery_mins=speedup,
        multi_station_injections=multi_inj
    )

@app.get("/api/railradar/auto_fetch_and_freeze")
def auto_fetch_and_freeze_endpoint(
    train_no: str = Query("12919"),
    section_delay_mins: float = Query(0.0),
    treta_segment_number: str = Query(None),
    speedup_recovery_mins: float = Query(0.0),
    multi_station_injections: str = Query(None)
):
    """
    Convenience endpoint: Fetches live telemetry, matches with MasterPnC combination,
    and returns frozen controls with complete compound prediction calculations.
    """
    telemetry = get_railradar_live_telemetry(train_no)
    return match_railradar_to_master_db(
        telemetry,
        section_delay_mins=section_delay_mins,
        treta_segment_number=treta_segment_number,
        speedup_recovery_mins=speedup_recovery_mins,
        multi_station_injections=multi_station_injections
    )

@app.get("/api/railradar/config")
def get_railradar_config():
    """
    Returns RailRadar API credentials status and connection endpoint configuration.
    """
    masked_key = ""
    if RAILRADAR_API_KEY:
        masked_key = (RAILRADAR_API_KEY[:4] + "..." + RAILRADAR_API_KEY[-4:]) if len(RAILRADAR_API_KEY) >= 8 else "CONFIGURED"

    return {
        "api_key_configured": bool(RAILRADAR_API_KEY),
        "api_key_preview": masked_key,
        "api_url": RAILRADAR_API_URL,
        "mode": "UPSTREAM_LIVE_API" if RAILRADAR_API_KEY else "BUILT_IN_SAMPLE_ENGINE",
        "sample_train": "12919 (Malwa SF Express with 12m delay & UJN departure)",
        "env_file_status": "Instance present in .env (RAILRADAR_API_KEY, RAILRADAR_API_URL)"
    }

# -----------------------------------------------------------------------------
# DATABASE SIMULATION SANDBOX ENDPOINTS (MASTER DB IS STRICTLY UNTOUCHED)
# -----------------------------------------------------------------------------


@app.get("/api/simulation/status")
def get_simulation_status():
    return {
        "mode": SIMULATION_STATE['mode'],
        "modifications_count": SIMULATION_STATE['modifications_count'],
        "last_updated": SIMULATION_STATE['last_updated'],
        "pushed_records_count": len(SIMULATION_STATE['pushed_records']),
        "is_pristine": (SIMULATION_STATE['mode'] == 'PRISTINE'),
        "master_db": "WIN.db (Read-Only Master)",
        "simulation_db": "WIN_SIMULATION.db (Sandbox Working Copy)"
    }

@app.post("/api/simulation/push")
def push_to_simulation_db(payload: dict = Body(...)):
    """
    Pushes proposed delay and cascaded scenario modifications into WIN_SIMULATION.db.
    The master database WIN.db is strictly untouched.
    """
    train_no = str(payload.get('train_no', '12001')).strip()
    seg_num = payload.get('treta_segment_number')
    net_delay = float(payload.get('net_delay_mins', 0.0))
    predicted_eta = str(payload.get('predicted_eta', ''))
    status = str(payload.get('status', 'LATE'))
    cascaded_trains = payload.get('cascaded_trains', [])

    if not os.path.exists(SIM_DB_PATH) and os.path.exists(MASTER_DB_PATH):
        shutil.copyfile(MASTER_DB_PATH, SIM_DB_PATH)

    records_updated = 0
    try:
        conn = sqlite3.connect(SIM_DB_PATH)
        cursor = conn.cursor()

        cols = [r[1] for r in cursor.execute("PRAGMA table_info('RouteDivision')").fetchall()]
        if 'sim_proposed_delay' not in cols:
            cursor.execute("ALTER TABLE 'RouteDivision' ADD COLUMN sim_proposed_delay REAL DEFAULT 0.0")
        if 'sim_new_eta' not in cols:
            cursor.execute("ALTER TABLE 'RouteDivision' ADD COLUMN sim_new_eta TEXT DEFAULT ''")
        if 'sim_status' not in cols:
            cursor.execute("ALTER TABLE 'RouteDivision' ADD COLUMN sim_status TEXT DEFAULT ''")
        if 'sim_updated_at' not in cols:
            cursor.execute("ALTER TABLE 'RouteDivision' ADD COLUMN sim_updated_at TEXT DEFAULT ''")

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if seg_num:
            cursor.execute("""
                UPDATE 'RouteDivision'
                SET sim_proposed_delay = ?, sim_new_eta = ?, sim_status = ?, sim_updated_at = ?
                WHERE treta_segment_number = ?
            """, (net_delay, predicted_eta, status, now_str, seg_num))
            records_updated += cursor.rowcount
        else:
            clean_t = train_no.lstrip('0')
            cursor.execute("""
                UPDATE 'RouteDivision'
                SET sim_proposed_delay = ?, sim_new_eta = ?, sim_status = ?, sim_updated_at = ?
                WHERE train_no = ? OR train_no = ?
            """, (net_delay, predicted_eta, status, now_str, train_no, clean_t))
            records_updated += cursor.rowcount

        if seg_num:
            cursor.execute("""
                UPDATE 'SegmentScenarioPnC'
                SET segment_net_delay_mins = ?, segment_arrival_status = ?
                WHERE treta_segment_number = ?
            """, (net_delay, status, seg_num))
            records_updated += cursor.rowcount

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS SimulationCascadedEffects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trigger_train_no TEXT,
                trigger_segment TEXT,
                affected_train_no TEXT,
                affected_train_name TEXT,
                affected_tier TEXT,
                conflict_type TEXT,
                transmitted_delay_mins REAL,
                pushed_at TEXT
            )
        """)

        for aff in cascaded_trains:
            cursor.execute("""
                INSERT INTO SimulationCascadedEffects (
                    trigger_train_no, trigger_segment, affected_train_no, affected_train_name,
                    affected_tier, conflict_type, transmitted_delay_mins, pushed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                train_no,
                seg_num or 'CORRIDOR_FULL',
                aff.get('train_no'),
                aff.get('train_name'),
                aff.get('train_tier'),
                aff.get('conflict_type'),
                float(aff.get('transmitted_delay_mins', 0.0)),
                now_str
            ))
            records_updated += 1

        conn.commit()
        conn.close()

        SIMULATION_STATE['mode'] = 'SIMULATION_MODIFIED'
        SIMULATION_STATE['modifications_count'] += 1
        SIMULATION_STATE['last_updated'] = now_str
        SIMULATION_STATE['pushed_records'].append({
            'train_no': train_no,
            'treta_segment_number': seg_num,
            'net_delay_mins': net_delay,
            'affected_trains_count': len(cascaded_trains),
            'timestamp': now_str
        })

        return {
            "success": True,
            "mode": "SIMULATION_MODIFIED",
            "message": f"Successfully pushed proposed delay to simulation database sandbox. {records_updated:,} record updates applied.",
            "records_updated": records_updated,
            "affected_trains_count": len(cascaded_trains),
            "sim_db_path": SIM_DB_PATH,
            "master_db_untouched": True,
            "timestamp": now_str
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation database push error: {str(e)}")

@app.post("/api/simulation/reset")
def reset_simulation_db():
    """
    Resets the simulation database sandbox by recopying pristine master WIN.db.
    Original conditions are completely restored.
    """
    if not os.path.exists(MASTER_DB_PATH):
        raise HTTPException(status_code=404, detail="Master database WIN.db not found to reset from")

    try:
        shutil.copyfile(MASTER_DB_PATH, SIM_DB_PATH)
        SIMULATION_STATE['mode'] = 'PRISTINE'
        SIMULATION_STATE['modifications_count'] = 0
        SIMULATION_STATE['last_updated'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        SIMULATION_STATE['pushed_records'] = []

        return {
            "success": True,
            "mode": "PRISTINE",
            "message": "Simulation database sandbox successfully reset to pristine original conditions from master WIN.db.",
            "master_db_untouched": True,
            "timestamp": SIMULATION_STATE['last_updated']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting simulation database: {str(e)}")

# Serve static frontend or API status
frontend_candidates = [
    os.path.join(PROJECT_ROOT, 'Frontend'),
    os.path.join(PROJECT_ROOT, 'Frontend', 'out'),
    os.path.join(CURRENT_DIR, 'Frontend'),
    os.path.join(PROJECT_ROOT, 'SPipelines', 'Frontend'),
]
frontend_dir = None
for cand in frontend_candidates:
    if os.path.exists(cand) and os.path.exists(os.path.join(cand, 'index.html')):
        frontend_dir = cand
        break

if frontend_dir:
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    @app.get("/")
    def index():
        return {
            "status": "online",
            "service": "Indian Railways Segmentation & Compound ETA Engine API",
            "docs": "/docs",
            "railradar_config": "/api/railradar/config",
            "frontend_url": "http://localhost:3000",
            "note": "Next.js frontend runs on http://localhost:3000 and proxies /api/* to this backend (http://127.0.0.1:8000)"
        }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
