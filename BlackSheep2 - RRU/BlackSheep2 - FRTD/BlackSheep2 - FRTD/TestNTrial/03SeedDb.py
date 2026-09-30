import os
import pandas as pd
from sqlalchemy import create_engine, text

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKSHEEP_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) if os.path.exists(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) else os.getcwd()

def get_path(rel_path):
    if os.path.exists(rel_path): return rel_path
    candidate = os.path.join(BLACKSHEEP_DIR, rel_path)
    return candidate if os.path.exists(candidate) else rel_path

# 1. Paste your Neon PostgreSQL Connection String here (make sure sslmode=require is included)
NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# 2. Load the generated permutations
df = pd.read_csv(get_path('Train-Data/PnCOutput.csv'))

# Convert train_no to string to preserve leading zeros (e.g., '00111')
df['train_no'] = df['train_no'].astype(str).str.zfill(5)

# 3. Connect via SQLAlchemy
engine = create_engine(NEON_DATABASE_URL)

print("Uploading permutations to Neon PostgreSQL...")

# Batch upload using chunksize to prevent network timeouts over SSL
df.to_sql(
    'delay_predictions', 
    engine, 
    if_exists='replace', 
    index=False, 
    chunksize=1000, 
    method='multi'
)

# 4. Create composite index for ultra-fast queries
with engine.connect() as conn:
    conn.execute(text('''
        CREATE INDEX IF NOT EXISTS idx_delay_lookup 
        ON delay_predictions (train_no, weather, priority_congestion, tsr_level);
    '''))
    conn.commit()

print("Successfully seeded Neon PostgreSQL database with composite index!")