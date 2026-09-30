import os
import dotenv
import sqlalchemy

dotenv.load_dotenv()
url = os.getenv('POSTGRESQL')
engine = sqlalchemy.create_engine(url)

try:
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(sqlalchemy.text('CREATE DATABASE "WIN";'))
        print("SUCCESS: Database 'WIN' created in Neon PostgreSQL!")
except Exception as e:
    print("Could not create database WIN in Neon:", e)
