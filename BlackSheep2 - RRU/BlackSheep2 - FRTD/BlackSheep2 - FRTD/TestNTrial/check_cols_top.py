from sqlalchemy import create_engine, text

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(NEON_DATABASE_URL)

with engine.connect() as conn:
    for t in ['trains_metadata', 'ea_calculation', 'slow_acc_delay', 'headway_delay', 'platform_alloc_delay', 'servicing_delay', 'single_track_delay']:
        cols = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{t}' ORDER BY ordinal_position;")).fetchall()
        print(t, [c[0] for c in cols])
