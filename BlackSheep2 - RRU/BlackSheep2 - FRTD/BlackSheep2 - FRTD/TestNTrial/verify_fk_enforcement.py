import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
engine = create_engine(NEON_DATABASE_URL)

print("=" * 80)
print("TESTING RELATIONAL CONSTRAINT ENFORCEMENT IN NEON POSTGRESQL")
print("=" * 80)

with engine.connect() as conn:
    # 1. Test Foreign Key Violation: Inserting an orphan record into ea_calculation
    print("\n1. Testing Foreign Key Violation on 'ea_calculation'...")
    try:
        conn.execute(text("INSERT INTO ea_calculation (train_no, train_name) VALUES ('99999', 'GHOST TRAIN');"))
        conn.commit()
        print("   [FAIL] Orphan record inserted without error! FK not enforced.")
        sys.exit(1)
    except IntegrityError as e:
        conn.rollback()
        print("   [PASS] ForeignKeyViolation successfully caught!")
        print(f"          PostgreSQL error: {e.orig}")

    # 2. Test Foreign Key Violation on train_halts
    print("\n2. Testing Foreign Key Violation on 'train_halts'...")
    try:
        conn.execute(text("INSERT INTO train_halts (train_no, sr_no, station_code) VALUES ('99999', 1, 'NDLS');"))
        conn.commit()
        print("   [FAIL] Orphan halt inserted without error! FK not enforced.")
        sys.exit(1)
    except IntegrityError as e:
        conn.rollback()
        print("   [PASS] ForeignKeyViolation successfully caught on train_halts!")

    # 3. Test Primary Key Uniqueness on trains_metadata
    print("\n3. Testing Primary Key Uniqueness on 'trains_metadata'...")
    try:
        conn.execute(text("INSERT INTO trains_metadata (train_no, train_name) VALUES ('12001', 'DUPLICATE SHATABDI');"))
        conn.commit()
        print("   [FAIL] Duplicate train_no inserted into trains_metadata! PK not enforced.")
        sys.exit(1)
    except IntegrityError as e:
        conn.rollback()
        print("   [PASS] UniqueViolation / PK violation successfully caught!")

print("\n" + "=" * 80)
print("ALL RELATIONAL CONSTRAINTS ARE STRICTLY ENFORCED BY NEON POSTGRESQL!")
print("=" * 80)
