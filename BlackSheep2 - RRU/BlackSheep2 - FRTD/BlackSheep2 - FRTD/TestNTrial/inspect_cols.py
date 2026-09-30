from sqlalchemy import create_engine, text

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(NEON_DATABASE_URL)

with engine.connect() as conn:
    tables = [
        'trains_metadata', 'ea_calculation', 'slow_acc_delay',
        'headway_delay', 'platform_alloc_delay', 'servicing_delay',
        'single_track_delay', 'tired_crew_delay', 'final_orchestra_output',
        'train_halts', 'delay_predictions', 'ml_compound_permutations'
    ]
    for t_name in tables:
        cols = conn.execute(text(f"""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{t_name}'
            ORDER BY ordinal_position;
        """)).fetchall()
        print(f"\n--- {t_name} ---")
        for c in cols:
            print(f"  {c[0]:30} | {c[1]:15} | Nullable: {c[2]}")
