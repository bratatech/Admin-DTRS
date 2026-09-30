# TestNTrial: Testing, Trial & Temporary Scripts

> [!NOTE]
> This folder contains scripts used solely for testing, inspection, trial runs, database schema verification, and one-off tasks. **None of these scripts are an integral part of the production codebase.**
>
> When preparing for production, **this entire folder (`TestNTrial/`) can be deleted** to ensure the codebase remains clean, lean, and production-grade.

---

## One-Click Production Cleanup Command

To remove all test, trial, and scratch files before deploying to production, simply run:

### Windows PowerShell:
```powershell
Remove-Item -Recurse -Force TestNTrial
```

### Linux / Bash:
```bash
rm -rf TestNTrial
```

---

## Directory Catalog & Purpose

### 1. Database & Schema Inspection Utilities
| Script | Description |
| :--- | :--- |
| `check_db.py` | Connects to Neon PostgreSQL and lists all tables, row counts, Primary Keys, and Foreign Keys. |
| `check_integrity.py` | Validates relational integrity across all tables and checks for orphan records violating foreign keys. |
| `check_cols_top.py` | Inspects column names and types for primary cascading pipeline tables. |
| `check_large_cols.py` | Compares CSV headers vs database columns for large tables (`train_halts`, `delay_predictions`, `ml_compound_permutations`). |
| `check_ml_cols.py` | Inspects columns of the `ml_compound_permutations` table. |
| `inspect_cols.py` | Dumps table schema metadata (column name, data type, nullability). |
| `lowercase_cols.py` | One-off migration utility that converted mixed-case column names to strictly lowercase in Neon. |
| `verify_fk_enforcement.py` | Tests Neon PostgreSQL foreign key constraint enforcement by attempting orphan inserts. |

### 2. API & Simulation Test Scripts
| Script | Description |
| :--- | :--- |
| `test_api_status.py` | Sends a basic prediction request to the live FastAPI server at `http://localhost:8000/api/predict`. |
| `test_api_treta.py` | Tests the live API endpoint against 4 abnormal scenarios: baseline, chain pulling (+15m), preceding train block (+7m), and engine failure. |
| `test_multi.py` | Tests API responses for multiple benchmark trains and inspects EA absorption math breakdown. |
| `test_treta_scenarios.py` | Standalone offline simulation test verifying direct ML compound engine responses without running the API server. |
| `test_upload_ea.py` | Verifies column mappings between `Train-Data/EACalculation.csv` and the `ea_calculation` database table. |
| `upload_treta_to_neon.py` | Standalone migration script that initialized and populated TRETA routes and zones (superseded by `UploadAllToNeon.py`). |

### 3. Verification & Analysis Reports
| Script | Description |
| :--- | :--- |
| `VerifyDelayVsExtraTime.py` | Comprehensive verification report comparing predicted delay against allotted schedule slack (Extra Time / EA) across 477,900 scenarios. |

### 4. Legacy Trial Seed Scripts
| Script | Description |
| :--- | :--- |
| `03SeedDb.py` | Early seed script for the `delay_predictions` table (superseded by `BlackSheep/UploadAllToNeon.py`). |
| `04SeedHaltsDb.py` | Early seed script for the `train_halts` table (superseded by `BlackSheep/UploadAllToNeon.py`). |

---

## Execution Guide

All scripts are configured with dynamic path resolution to locate the `BlackSheep` data assets automatically. You can execute any script directly from the workspace root or inside `TestNTrial/`:

```powershell
# Check Neon database tables and row counts:
python TestNTrial/check_db.py

# Run offline TRETA failure scenario test:
python TestNTrial/test_treta_scenarios.py

# Run delay vs slack verification report:
python TestNTrial/VerifyDelayVsExtraTime.py

# Test live API (requires AppServer running on port 8000):
python TestNTrial/test_api_status.py
```
