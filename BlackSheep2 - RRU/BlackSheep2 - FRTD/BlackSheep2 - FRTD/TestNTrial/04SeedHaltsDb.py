import os
import pandas as pd
import re
from sqlalchemy import create_engine, text

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKSHEEP_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) if os.path.exists(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) else os.getcwd()

def get_path(rel_path):
    if os.path.exists(rel_path): return rel_path
    candidate = os.path.join(BLACKSHEEP_DIR, rel_path)
    return candidate if os.path.exists(candidate) else rel_path

# 1. Neon PostgreSQL Connection String
NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# 2. Load real train schedules from NTES export
csv_path = get_path('Train-Data/TrainSchedules_DND.csv')
print(f"Loading real NTES train schedules from {csv_path}...")
df = pd.read_csv(csv_path)

# Format train_no to string with 5-digit zero padding
df['train_no'] = df['train_no'].astype(str).str.zfill(5)

# Helper to parse halt_time ("10 Min" or "01:10 Hr" -> mins)
def parse_halt_time(halt_str):
    if pd.isna(halt_str) or str(halt_str).strip() in ['SRC', 'DSTN', '', 'nan']:
        return 0
    halt_str = str(halt_str).strip()
    if 'Hr' in halt_str:
        match = re.search(r'(\d+):(\d+)', halt_str)
        if match:
            return int(match.group(1)) * 60 + int(match.group(2))
    elif 'Min' in halt_str:
        match = re.search(r'(\d+)', halt_str)
        if match:
            return int(match.group(1))
    return 0

df['halt_mins'] = df['halt_time'].apply(parse_halt_time)
df['dist_km'] = pd.to_numeric(df['dist_km'], errors='coerce').fillna(0).astype(int)

# 3. Connect via SQLAlchemy
engine = create_engine(NEON_DATABASE_URL)

print(f"Uploading {len(df):,} real train halts to Neon PostgreSQL (table: 'train_halts')...")

# Batch upload using chunksize to prevent network timeouts over SSL
df.to_sql(
    'train_halts', 
    engine, 
    if_exists='replace', 
    index=False, 
    chunksize=5000, 
    method='multi'
)

# 4. Create indexes for ultra-fast query performance
print("Creating indexes on train_halts...")
with engine.connect() as conn:
    conn.execute(text('''
        CREATE INDEX IF NOT EXISTS idx_halts_train_sr 
        ON train_halts (train_no, sr_no);
    '''))
    conn.execute(text('''
        CREATE INDEX IF NOT EXISTS idx_halts_station 
        ON train_halts (station_code);
    '''))
    conn.commit()

print("Successfully seeded Neon PostgreSQL with real train halts!")
