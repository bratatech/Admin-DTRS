from sqlalchemy import create_engine, text

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(NEON_DATABASE_URL)

with engine.connect() as conn:
    tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")).fetchall()
    print("Tables in Neon:")
    for t in tables:
        t_name = t[0]
        # Check row count
        count = conn.execute(text(f"SELECT count(*) FROM {t_name};")).scalar()
        # Check primary key and foreign keys
        pks = conn.execute(text(f"""
            SELECT c.column_name 
            FROM information_schema.table_constraints tc 
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
            JOIN information_schema.columns c ON c.table_name = tc.table_name AND c.column_name = ccu.column_name 
            WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = '{t_name}';
        """)).fetchall()
        
        fks = conn.execute(text(f"""
            SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints tc 
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name 
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = '{t_name}';
        """)).fetchall()

        pk_str = ", ".join([p[0] for p in pks]) if pks else "NONE"
        fk_str = ", ".join([f"{f[1]} -> {f[2]}({f[3]})" for f in fks]) if fks else "NONE"
        print(f"  {t_name:25} | Rows: {count:7} | PK: {pk_str:15} | FKs: {fk_str}")
