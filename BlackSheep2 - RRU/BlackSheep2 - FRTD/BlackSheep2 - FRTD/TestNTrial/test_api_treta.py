import urllib.request
import json

base_url = "http://127.0.0.1:8000/api/predict"

def test_case(name, params):
    query = "&".join([f"{k}={v}" for k, v in params.items()])
    url = f"{base_url}?{query}"
    res = json.loads(urllib.request.urlopen(url).read().decode())
    print(f"\n--- {name} ---")
    print(f"Train: {res['train_no']} ({res['train_name']}) | TRETA: {res.get('treta_route_number')}")
    print(f"Primary Delay: {res['primary_breakdown']['PrimaryDelay']} mins (Chain Pulling: {res['primary_breakdown']['d_chain_pulling']}m, Engine Fail: {res['primary_breakdown']['d_engine_failure']}m)")
    print(f"Cascade Delay: {res['cascade_breakdown']['CascadeDelay']} mins (Headway/Block: {res['cascade_breakdown']['d_headway']}m)")
    print(f"Gross Delay  : {res['math_resolution']['grossDelay']} mins")
    print(f"Net Delay    : {res['math_resolution']['NetDelay']} mins ({res['math_resolution']['Arrival_Status']})")
    print(f"ETA          : {res['math_resolution']['Predicted_ETA']}")
    return res

# 1. Baseline
test_case("1. Baseline Ideal", {"train_no": "12001", "weather": "Clear", "congestion": "None", "tsr": "None"})

# 2. Chain pulling (+15m)
test_case("2. Alarm Chain Pulling (1 event)", {"train_no": "12001", "weather": "Clear", "chain_pulling": 1})

# 3. Preceding train blocks TRETA zone by 7 mins (Trailing train inherits 7m)
test_case("3. Preceding Train Delayed 7m on TRETA Zone", {"train_no": "12001", "weather": "Clear", "blocking_delay": 7.0})

# 4. Engine failure on train in same TRETA route zone (10-15m ripple)
test_case("4. Engine Failure on TRETA Route", {"train_no": "12001", "weather": "Clear", "engine_failure": "true"})
