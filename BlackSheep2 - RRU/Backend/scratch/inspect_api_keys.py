import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
base_url = "http://localhost:3000"

predict_url = f"{base_url}/api/predict?train_no=12919&weather=Fog&tsr=Major&crossing_conflict=Major_Crossing_Wait&priority_congestion=High"
req = urllib.request.urlopen(predict_url)
pred = json.loads(req.read().decode())
print("Prediction response keys:", list(pred.keys()))
print("Math resolution:", pred.get("math_resolution"))

rr_url = f"{base_url}/api/railradar/auto_fetch_and_freeze?train_no=12919"
req = urllib.request.urlopen(rr_url)
rr = json.loads(req.read().decode())
print("\nRailRadar response keys:", list(rr.keys()))
if "telemetry" in rr:
    print("Telemetry data:", json.dumps(rr["telemetry"].get("data"), indent=2))
