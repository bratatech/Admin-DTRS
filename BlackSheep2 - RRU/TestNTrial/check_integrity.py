from sqlalchemy import create_engine, text

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(NEON_DATABASE_URL)

with engine.connect() as conn:
    print("Checking key integrity...")
    # 1. trains_metadata unique train_no
    tm_cnt = conn.execute(text("SELECT count(*), count(distinct train_no) FROM trains_metadata;")).fetchone()
    print(f"trains_metadata: total={tm_cnt[0]}, distinct={tm_cnt[1]}")

    # 2. 1-to-1 tables
    for t in ['ea_calculation', 'slow_acc_delay', 'headway_delay', 'platform_alloc_delay', 'servicing_delay', 'single_track_delay', 'tired_crew_delay', 'final_orchestra_output']:
        res = conn.execute(text(f"SELECT count(*), count(distinct train_no) FROM {t};")).fetchone()
        diff = conn.execute(text(f"SELECT count(*) FROM {t} WHERE train_no NOT IN (SELECT train_no FROM trains_metadata);")).scalar()
        print(f"{t:25}: total={res[0]}, distinct={res[1]}, orphans={diff}")

    # 3. train_halts
    halts_cnt = conn.execute(text("SELECT count(*), count(distinct (train_no, sr_no)) FROM train_halts;")).fetchone()
    halts_orphans = conn.execute(text("SELECT count(*) FROM train_halts WHERE train_no NOT IN (SELECT train_no FROM trains_metadata);")).scalar()
    print(f"train_halts              : total={halts_cnt[0]}, distinct (train_no, sr_no)={halts_cnt[1]}, orphans={halts_orphans}")

    # 4. delay_predictions
    dp_cnt = conn.execute(text("SELECT count(*), count(distinct (train_no, weather, priority_congestion, tsr_level)) FROM delay_predictions;")).fetchone()
    dp_orphans = conn.execute(text("SELECT count(*) FROM delay_predictions WHERE train_no NOT IN (SELECT train_no FROM trains_metadata);")).scalar()
    print(f"delay_predictions        : total={dp_cnt[0]}, distinct scenario={dp_cnt[1]}, orphans={dp_orphans}")
