"""
SetupNeonRelationalSchema.py
Establishes comprehensive relational integrity across Neon PostgreSQL:
- PRIMARY KEY on trains_metadata (train_no)
- 1-to-1 FOREIGN KEY and PRIMARY KEY on all cascade pipeline tables (ea_calculation, slow_acc_delay, etc.)
- Composite PRIMARY KEY and FOREIGN KEY on 1-to-many tables (train_halts, delay_predictions)
- Surrogate PRIMARY KEY and FOREIGN KEY on ml_compound_permutations
- Performance indexes and constraints
"""

import time
from sqlalchemy import create_engine, text

NEON_DATABASE_URL = "postgresql://neondb_owner:npg_2lRjCV9Lyfhs@ep-fragrant-shape-b3lplil7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

ONE_TO_ONE_TABLES = [
    'ea_calculation',
    'slow_acc_delay',
    'headway_delay',
    'platform_alloc_delay',
    'servicing_delay',
    'single_track_delay',
    'tired_crew_delay',
    'final_orchestra_output'
]

def setup_relational_schema():
    print("=" * 85)
    print("APPLYING RELATIONAL DBMS CONSTRAINTS TO NEON POSTGRESQL")
    print("=" * 85)

    engine = create_engine(NEON_DATABASE_URL, pool_pre_ping=True)

    with engine.connect() as conn:
        # 1. Master Table: trains_metadata PRIMARY KEY
        print("\n[STEP 1/5] Setting PRIMARY KEY on 'trains_metadata' (train_no)...")
        conn.execute(text("""
            DO $$
            BEGIN
                -- Drop existing constraint if exists
                IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pk_trains_metadata') THEN
                    ALTER TABLE trains_metadata DROP CONSTRAINT pk_trains_metadata CASCADE;
                END IF;
                
                -- Ensure train_no is NOT NULL
                ALTER TABLE trains_metadata ALTER COLUMN train_no SET NOT NULL;
                
                -- Add PRIMARY KEY
                ALTER TABLE trains_metadata ADD CONSTRAINT pk_trains_metadata PRIMARY KEY (train_no);
            END $$;
        """))
        conn.commit()
        print("  [OK] trains_metadata PRIMARY KEY (train_no) established.")

        # 2. 1-to-1 Child Tables (Pipeline outputs)
        print("\n[STEP 2/5] Linking 1-to-1 pipeline child tables with PRIMARY KEY & FOREIGN KEY...")
        for tbl in ONE_TO_ONE_TABLES:
            t0 = time.time()
            pk_name = f"pk_{tbl}"
            fk_name = f"fk_{tbl}_trains_metadata"
            print(f"  Configuring constraints on '{tbl}'...")

            conn.execute(text(f"""
                DO $$
                BEGIN
                    -- Remove any duplicate train_no if present
                    DELETE FROM {tbl} a USING {tbl} b
                    WHERE a.ctid < b.ctid AND a.train_no = b.train_no;

                    -- Drop old constraints if they exist
                    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '{fk_name}') THEN
                        ALTER TABLE {tbl} DROP CONSTRAINT {fk_name};
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '{pk_name}') THEN
                        ALTER TABLE {tbl} DROP CONSTRAINT {pk_name};
                    END IF;

                    -- Set NOT NULL on train_no
                    ALTER TABLE {tbl} ALTER COLUMN train_no SET NOT NULL;

                    -- Add PRIMARY KEY (train_no)
                    ALTER TABLE {tbl} ADD CONSTRAINT {pk_name} PRIMARY KEY (train_no);

                    -- Add FOREIGN KEY referencing trains_metadata(train_no) ON DELETE CASCADE
                    ALTER TABLE {tbl} ADD CONSTRAINT {fk_name} 
                        FOREIGN KEY (train_no) REFERENCES trains_metadata(train_no)
                        ON UPDATE CASCADE ON DELETE CASCADE;
                END $$;
            """))
            conn.commit()
            print(f"    [OK] {tbl}: PK (train_no) + FK -> trains_metadata(train_no) in {time.time() - t0:.2f}s")

        # 3. train_halts (1-to-Many: train_no, sr_no)
        print("\n[STEP 3/5] Configuring 'train_halts' with composite PK (train_no, sr_no) and FK...")
        t0 = time.time()
        conn.execute(text("""
            DO $$
            BEGIN
                -- Drop old constraints
                IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_train_halts_trains_metadata') THEN
                    ALTER TABLE train_halts DROP CONSTRAINT fk_train_halts_trains_metadata;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pk_train_halts') THEN
                    ALTER TABLE train_halts DROP CONSTRAINT pk_train_halts;
                END IF;

                -- Set NOT NULL
                ALTER TABLE train_halts ALTER COLUMN train_no SET NOT NULL;
                ALTER TABLE train_halts ALTER COLUMN sr_no SET NOT NULL;

                -- Composite PRIMARY KEY
                ALTER TABLE train_halts ADD CONSTRAINT pk_train_halts PRIMARY KEY (train_no, sr_no);

                -- FOREIGN KEY referencing trains_metadata(train_no)
                ALTER TABLE train_halts ADD CONSTRAINT fk_train_halts_trains_metadata 
                    FOREIGN KEY (train_no) REFERENCES trains_metadata(train_no)
                    ON UPDATE CASCADE ON DELETE CASCADE;
            END $$;
        """))
        # Add index on station_code for fast station lookups
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_train_halts_station ON train_halts (station_code, day);"))
        conn.commit()
        print(f"  [OK] train_halts composite PK and FK configured in {time.time() - t0:.2f}s.")

        # 4. delay_predictions (1-to-Many: train_no, weather, priority_congestion, tsr_level)
        print("\n[STEP 4/5] Configuring 'delay_predictions' with composite PK and FK...")
        t0 = time.time()
        conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_delay_predictions_trains_metadata') THEN
                    ALTER TABLE delay_predictions DROP CONSTRAINT fk_delay_predictions_trains_metadata;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pk_delay_predictions') THEN
                    ALTER TABLE delay_predictions DROP CONSTRAINT pk_delay_predictions;
                END IF;

                -- Fill any NaN/NULL values where pandas treated string 'None' as SQL NULL
                UPDATE delay_predictions SET priority_congestion = 'None' WHERE priority_congestion IS NULL;
                UPDATE delay_predictions SET tsr_level = 'None' WHERE tsr_level IS NULL;
                UPDATE delay_predictions SET weather = 'Clear' WHERE weather IS NULL;

                ALTER TABLE delay_predictions ALTER COLUMN train_no SET NOT NULL;
                ALTER TABLE delay_predictions ALTER COLUMN weather SET NOT NULL;
                ALTER TABLE delay_predictions ALTER COLUMN priority_congestion SET NOT NULL;
                ALTER TABLE delay_predictions ALTER COLUMN tsr_level SET NOT NULL;

                ALTER TABLE delay_predictions ADD CONSTRAINT pk_delay_predictions 
                    PRIMARY KEY (train_no, weather, priority_congestion, tsr_level);

                ALTER TABLE delay_predictions ADD CONSTRAINT fk_delay_predictions_trains_metadata 
                    FOREIGN KEY (train_no) REFERENCES trains_metadata(train_no)
                    ON UPDATE CASCADE ON DELETE CASCADE;
            END $$;
        """))
        conn.commit()
        print(f"  [OK] delay_predictions composite PK and FK configured in {time.time() - t0:.2f}s.")

        # 5. ml_compound_permutations (Surrogate PK + FK)
        print("\n[STEP 5/5] Configuring 'ml_compound_permutations' with surrogate PK and FK...")
        t0 = time.time()
        conn.execute(text("""
            DO $$
            BEGIN
                -- Add id column if not exists
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ml_compound_permutations' AND column_name = 'id') THEN
                    ALTER TABLE ml_compound_permutations ADD COLUMN id BIGSERIAL;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ml_permutations_trains_metadata') THEN
                    ALTER TABLE ml_compound_permutations DROP CONSTRAINT fk_ml_permutations_trains_metadata;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pk_ml_compound_permutations') THEN
                    ALTER TABLE ml_compound_permutations DROP CONSTRAINT pk_ml_compound_permutations;
                END IF;

                ALTER TABLE ml_compound_permutations ALTER COLUMN train_no SET NOT NULL;
                ALTER TABLE ml_compound_permutations ADD CONSTRAINT pk_ml_compound_permutations PRIMARY KEY (id);

                ALTER TABLE ml_compound_permutations ADD CONSTRAINT fk_ml_permutations_trains_metadata 
                    FOREIGN KEY (train_no) REFERENCES trains_metadata(train_no)
                    ON UPDATE CASCADE ON DELETE CASCADE;
            END $$;
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ml_perm_lookup ON ml_compound_permutations (train_no, case_weather, case_dispatch);"))
        conn.commit()
        print(f"  [OK] ml_compound_permutations surrogate PK, FK, and index configured in {time.time() - t0:.2f}s.")

    print("\n" + "=" * 85)
    print("ALL RELATIONAL CONSTRAINTS SUCCESSFULLY APPLIED TO NEON POSTGRESQL!")
    print("=" * 85)

if __name__ == '__main__':
    setup_relational_schema()
