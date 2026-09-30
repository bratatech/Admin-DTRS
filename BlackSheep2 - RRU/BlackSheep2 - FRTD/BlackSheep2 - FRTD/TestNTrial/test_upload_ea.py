import os
import pandas as pd
from sqlalchemy import create_engine, text

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKSHEEP_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) if os.path.exists(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) else os.getcwd()

def get_path(rel_path):
    if os.path.exists(rel_path): return rel_path
    candidate = os.path.join(BLACKSHEEP_DIR, rel_path)
    return candidate if os.path.exists(candidate) else rel_path

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(NEON_DATABASE_URL)

df = pd.read_csv(get_path("Train-Data/EACalculation.csv"), keep_default_na=False)
df['train_no'] = df['train_no'].astype(str).str.zfill(5)
clean_cols = {c: c.strip().lower().replace(' ', '_').replace('-', '_') for c in df.columns}
df.rename(columns=clean_cols, inplace=True)

with engine.connect() as conn:
    cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'ea_calculation';")).fetchall()
    db_cols = [c[0] for c in cols]
    print("CSV cols:", list(df.columns))
    print("DB cols :", db_cols)
    diff_cols = set(df.columns) - set(db_cols)
    print("Columns in CSV but not in DB:", diff_cols)
