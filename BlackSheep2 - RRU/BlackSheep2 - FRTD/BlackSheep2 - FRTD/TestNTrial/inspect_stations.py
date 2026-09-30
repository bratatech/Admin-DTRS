import os
import sqlite3
import pandas as pd
import json

print("--- TrainsMetadata_DND.csv ---")
df = pd.read_csv('SPipelines/Train-Data/TrainsMetadata_DND.csv', nrows=3)
print(df.columns.tolist())
print(df.head(2).to_dict(orient='records'))

print("\n--- TrainSchedules_DND.csv ---")
df2 = pd.read_csv('SPipelines/Train-Data/TrainSchedules_DND.csv', nrows=3)
print(df2.columns.tolist())
print(df2.head(2).to_dict(orient='records'))

print("\n--- TRETAZoneElements.csv ---")
df3 = pd.read_csv('SPipelines/Train-Data/TRETAZoneElements.csv', nrows=3)
print(df3.columns.tolist())
print(df3.head(2).to_dict(orient='records'))

print("\n--- TRETARoutes.csv ---")
df4 = pd.read_csv('SPipelines/Train-Data/TRETARoutes.csv', nrows=3)
print(df4.columns.tolist())
print(df4.head(2).to_dict(orient='records'))

print("\n--- ntes_trains.db ---")
if os.path.exists('BlackSheep/ntes_trains.db'):
    con = sqlite3.connect('BlackSheep/ntes_trains.db')
    cur = con.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cur.fetchall()
    print("Tables in sqlite:", tables)
    for t in tables:
        t_name = t[0]
        cur.execute(f"PRAGMA table_info({t_name});")
        cols = [c[1] for c in cur.fetchall()]
        print(f"  {t_name}: {cols[:10]}")
    con.close()

print("\n--- all_trains.json snippet ---")
if os.path.exists('SPipelines/all_trains.json'):
    with open('SPipelines/all_trains.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        print("all_trains.json type:", type(data))
        if isinstance(data, dict):
            print("Keys:", list(data.keys())[:5])
            first_k = list(data.keys())[0]
            print(f"Sample [{first_k}]:", str(data[first_k])[:300])
        elif isinstance(data, list):
            print("Length:", len(data))
            print("Sample item:", str(data[0])[:300])
