from sqlalchemy import create_engine, text

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(NEON_DATABASE_URL)

with engine.connect() as conn:
    cols = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ml_compound_permutations';")).fetchall()
    print("Columns in ml_compound_permutations:")
    for c in cols:
        print(f"  '{c[0]}'")
