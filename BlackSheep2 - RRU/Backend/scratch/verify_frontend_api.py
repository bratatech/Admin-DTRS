import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
base_url = "http://localhost:3000"

print("================================================================")
print("1. VERIFY FRONTEND PROXY TO SEARCH API (GET /api/search?q=12919)")
print("================================================================")
req = urllib.request.urlopen(f"{base_url}/api/search?q=12919")
res = json.loads(req.read().decode())
print(f"HTTP Status: {req.status}")
print(f"Train Found: {res[0]['train_no']} - {res[0]['train_name']}")
print(f"Route: {res[0]['source']} -> {res[0]['destination']}")
print(f"Tier: {res[0]['train_tier']}")

print("\n================================================================")
print("2. VERIFY FRONTEND PROXY TO PREDICT API WITH DYNAMIC DISTURBANCES")
print("   (Weather: Fog, TSR: Major, Conflict: Major_Crossing_Wait)")
print("================================================================")
predict_url = f"{base_url}/api/predict?train_no=12919&weather=Fog&tsr=Major&crossing_conflict=Major_Crossing_Wait&priority_congestion=High"
req = urllib.request.urlopen(predict_url)
pred = json.loads(req.read().decode())
pb = pred.get('primary_breakdown', {})
cb = pred.get('cascade_breakdown', {})
mr = pred.get('math_resolution', {})

print(f"Primary Delay (PD):       +{pb.get('PrimaryDelay')} mins (Weather: {pb.get('d_weather')}m, TSR: {pb.get('d_tsr')}m)")
print(f"Cascade Delay (CD):       +{cb.get('CascadeDelay')} mins (Crossing: {cb.get('d_crossing')}m, Headway: {cb.get('d_headway')}m)")
print(f"Gross Delay (GD):         +{mr.get('grossDelay')} mins")
print(f"Absorbed by Timetable EA: -{mr.get('Absorbed_by_EA')} mins")
print(f"Net Delay (ND):           +{mr.get('NetDelay')} mins")
print(f"Arrival Status:           {mr.get('Arrival_Status')}")
print(f"Predicted ETA:            {mr.get('Predicted_ETA')}")
assert mr.get('grossDelay', 0) > 0, "Gross delay must be non-zero!"
assert mr.get('NetDelay', 0) > 0, "Net delay must be non-zero!"
print(">>> DYNAMIC PREDICTION CALCULATION VERIFIED: VALUES ARE NOT FIXED TO 0! <<<")

print("\n================================================================")
print("3. VERIFY RAILRADAR WHEN NO LIVE UPSTREAM DATA IS PRESENT")
print("   (Should show 0.0 mins delay, 0.0 km/h, 0% progress, controls unlocked)")
print("================================================================")
rr_url = f"{base_url}/api/railradar/auto_fetch_and_freeze?train_no=12919"
req = urllib.request.urlopen(rr_url)
rr = json.loads(req.read().decode())
telemetry = rr.get('railradar_raw', {})
curr_loc = telemetry.get('currentLocation', {})
frozen = rr.get('frozen_controls', {})
pnc = rr.get('matched_combination', {})

print(f"Reported Delay:   {telemetry.get('delayMinutes')} mins")
print(f"Reported Speed:   {curr_loc.get('speedKmh')} km/h")
print(f"Segment Progress: {curr_loc.get('segmentProgress') * 100}%")
print(f"Controls Frozen:  {frozen.get('is_frozen')}")
print(f"Lock Reason:      {frozen.get('lock_reason')}")
assert telemetry.get('delayMinutes') == 0.0, "Delay must be 0.0 when no live data is present!"
assert curr_loc.get('speedKmh') == 0.0, "Speed must be 0.0 when no live data is present!"
assert frozen.get('is_frozen') == False, "Controls must not be frozen when offline!"
print(">>> OFFLINE / UNCONFIGURED STATE VERIFIED: CLEAN 0 DISPLAYED (NO FAKE DATA) <<<")

print("\n================================================================")
print("4. VERIFY RAILRADAR WHEN LIVE TELEMETRY ARRIVES VIA MATCH ENDPOINT")
print("   (Incoming: delayMinutes = 24.5, speed = 82.0 km/h, progress = 65%)")
print("================================================================")
live_payload = {
    "success": True,
    "data": {
        "trainNumber": "12919",
        "trainName": "Malwa SF Express",
        "delayMinutes": 24.5,
        "isLive": True,
        "currentLocation": {
            "stationCode": "UJN",
            "stationName": "Ujjain Junction",
            "speedKmh": 82.0,
            "segmentProgress": 0.65,
            "status": "departed",
            "isHalt": False
        },
        "previousHalt": {"stationCode": "DWX", "stationName": "Dewas"},
        "nextHalt": {"stationCode": "MKC", "stationName": "Maksi"}
    }
}
post_data = json.dumps(live_payload).encode('utf-8')
post_req = urllib.request.Request(f"{base_url}/api/railradar/match", data=post_data, headers={'Content-Type': 'application/json'})
res_post = urllib.request.urlopen(post_req)
live_res = json.loads(res_post.read().decode())
live_pnc = live_res.get('matched_combination', {})
live_frozen = live_res.get('frozen_controls', {})
live_pred_mr = live_res.get('prediction', {}).get('math_resolution', {})

print(f"Matched Combination ID: #{live_pnc.get('combination_id')}")
print(f"Live Gross Delay:       +{live_pnc.get('pnc_gross_delay')} mins")
print(f"Live Net Delay:         +{live_pnc.get('pnc_net_delay')} mins")
print(f"Controls Frozen:        {live_frozen.get('is_frozen')}")
print(f"Lock Reason:            {live_frozen.get('lock_reason')}")
print(f"Predicted Gross Delay:  +{live_pred_mr.get('grossDelay')} mins")
print(f"Predicted Net Delay:    +{live_pred_mr.get('NetDelay')} mins")
print(f"Arrival Status:         {live_pred_mr.get('Arrival_Status')}")
assert live_frozen.get('is_frozen') == True, "Controls must freeze upon live telemetry!"
assert live_pred_mr.get('grossDelay', 0) > 0, "Gross delay must be dynamic non-zero!"
print(">>> LIVE DYNAMIC INGESTION VERIFIED: REAL TELEMETRY DYNAMICALLY PROPAGATES! <<<")
print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
