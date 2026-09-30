import os
import dotenv
import sqlalchemy

dotenv.load_dotenv()
url = os.getenv('POSTGRESQL')
base, db_part = url.rsplit('/neondb', 1)
win_url = base + '/WIN' + db_part

print("--- NEON POSTGRESQL DATABASE 'WIN' ---")
engine = sqlalchemy.create_engine(win_url)
with engine.connect() as conn:
    tables = conn.execute(sqlalchemy.text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")).fetchall()
    for t in tables:
        tname = t[0]
        cnt = conn.execute(sqlalchemy.text(f'SELECT count(*) FROM "{tname}";')).scalar()
        print(f'  Table "{tname}": {cnt:,} rows')
    views = conn.execute(sqlalchemy.text("SELECT table_name FROM information_schema.views WHERE table_schema='public';")).fetchall()
    print("  Views:", [v[0] for v in views])

print("\n--- LOCAL SQLITE DATABASE 'WIN.db' ---")
sqlite_path = os.path.abspath("WIN.db")
sqlite_engine = sqlalchemy.create_engine(f"sqlite:///{sqlite_path}")
with sqlite_engine.connect() as conn:
    tables = conn.execute(sqlalchemy.text("SELECT name FROM sqlite_master WHERE type='table';")).fetchall()
    for t in tables:
        tname = t[0]
        cnt = conn.execute(sqlalchemy.text(f'SELECT count(*) FROM "{tname}";')).scalar()
        print(f'  Table "{tname}": {cnt:,} rows')
    views = conn.execute(sqlalchemy.text("SELECT name FROM sqlite_master WHERE type='view';")).fetchall()
    print("  Views:", [v[0] for v in views])
