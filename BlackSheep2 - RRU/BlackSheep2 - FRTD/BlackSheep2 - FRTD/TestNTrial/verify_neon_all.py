import os
import dotenv
import sqlalchemy

dotenv.load_dotenv()
engine = sqlalchemy.create_engine(os.getenv('POSTGRESQL'))
with engine.connect() as conn:
    tables = [r[0] for r in conn.execute(sqlalchemy.text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")).fetchall()]
    print("Neon Base Tables:", tables)
    for t in tables:
        cnt = conn.execute(sqlalchemy.text(f'SELECT count(*) FROM "{t}";')).scalar()
        print(f'  Table "{t}": {cnt:,} rows')
    
    views = [r[0] for r in conn.execute(sqlalchemy.text("SELECT table_name FROM information_schema.views WHERE table_schema='public';")).fetchall()]
    print("\nNeon Views:", views)
