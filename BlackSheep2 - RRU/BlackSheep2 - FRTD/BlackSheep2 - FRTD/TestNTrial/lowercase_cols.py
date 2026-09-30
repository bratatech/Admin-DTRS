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
    for tbl in tables:
        cols = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{tbl}';")).fetchall()
        for c in cols:
            col_name = c[0]
            if col_name != col_name.lower():
                print(f"Renaming {tbl}.\"{col_name}\" -> {col_name.lower()}...")
                conn.execute(text(f'ALTER TABLE {tbl} RENAME COLUMN "{col_name}" TO {col_name.lower()};'))
    conn.commit()
    print("All column names across all Neon tables are now strictly lowercase!")
