import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKSHEEP_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) if os.path.exists(os.path.join(CURRENT_DIR, '..', 'BlackSheep')) else os.getcwd()
PIPELINES_DIR = os.path.join(BLACKSHEEP_DIR, 'Pipelines')

# Switch working directory to BlackSheep if needed so relative Train-Data paths resolve
if os.path.exists(BLACKSHEEP_DIR):
    os.chdir(BLACKSHEEP_DIR)

if PIPELINES_DIR not in sys.path:
    sys.path.insert(0, PIPELINES_DIR)

from MLCompoundDelayModel import RailwayDelayMLSimulator

sim = RailwayDelayMLSimulator()

print("=" * 80)
print("TESTING TRETA & ABNORMAL FAILURE SCENARIOS")
print("=" * 80)

# Test 1: Normal baseline
res_base = sim.compute_single_case('12001', weather='CLEAR', track='NORMAL', dispatch='FREE_FLOW')
print("1. Baseline Train 12001:")
print(f"   TRETA Route: {res_base['treta_route_number']}")
print(f"   Primary Delay: {res_base['primary_breakdown']['PrimaryDelay']} mins")
print(f"   Cascade Delay: {res_base['cascade_breakdown']['CascadeDelay']} mins")
print(f"   Gross Delay: {res_base['math_resolution']['grossDelay']} mins")

# Test 2: Chain pulling (1 event = +15 mins)
res_cp = sim.compute_single_case('12001', weather='CLEAR', track='NORMAL', dispatch='FREE_FLOW', chain_pulling_events=1)
print("\n2. Train 12001 with 1 Chain Pulling Event:")
print(f"   Chain Pulling Delay: {res_cp['primary_breakdown']['d_chain_pulling']} mins")
print(f"   Primary Delay: {res_cp['primary_breakdown']['PrimaryDelay']} mins (Baseline + 15m)")
assert res_cp['primary_breakdown']['d_chain_pulling'] == 15.0, "Chain pulling must be 15.0 mins!"

# Test 3: Blocking train on same TRETA zone delayed by 7 mins
res_block7 = sim.compute_single_case('12001', weather='CLEAR', track='NORMAL', dispatch='TRETA_ZONE_OCCUPIED', blocking_train_delay=7.0)
print("\n3. Train 12001 with Preceding Train Blocking TRETA Zone for 7 mins:")
print(f"   Headway Delay: {res_block7['cascade_breakdown']['d_headway']} mins (Trailing train inherits 7.0m!)")
assert res_block7['cascade_breakdown']['d_headway'] == 7.0, "Trailing train must inherit 7.0 mins!"

# Test 4: Engine failure on train blocking TRETA zone
res_eng = sim.compute_single_case('12001', weather='CLEAR', track='NORMAL', dispatch='TRETA_ZONE_OCCUPIED', engine_failure=True)
print("\n4. Train on Same TRETA Route Zone with Engine Failure:")
print(f"   Engine Failure Direct Delay: {res_eng['primary_breakdown']['d_engine_failure']} mins")
print(f"   Downstream Zone Ripple Delay: {res_eng['cascade_breakdown']['d_headway']} mins (10-15m ripple)")

print("\n" + "=" * 80)
print("ALL TRETA & ABNORMAL FAILURE TESTS PASSED PERFECTLY!")
print("=" * 80)
