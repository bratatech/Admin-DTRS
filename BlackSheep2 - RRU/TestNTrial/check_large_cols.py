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

pairs = [
    (get_path('Train-Data/TrainSchedules_DND.csv'), 'train_halts'),
    (get_path('Train-Data/MLCompoundPermutations.csv'), 'ml_compound_permutations'),
    (get_path('Train-Data/PnCOutput.csv'), 'delay_predictions')
]

with engine.connect() as conn:
    for csv_file, tbl in pairs:
        df = pd.read_csv(csv_file, nrows=5, keep_default_na=False)
        csv_cols = [c.strip().lower().replace(' ', '_').replace('-', '_') for c in df.columns]
        res = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{tbl}';")).fetchall()
        db_cols = [r[0].lower() for r in res]
        print(f"\n--- {tbl} ---")
        print("CSV cols:", csv_cols)
        print("DB cols :", db_cols)
        print("CSV not in DB:", set(csv_cols) - set(db_cols))
        print("DB not in CSV:", set(db_cols) - set(csv_cols))
