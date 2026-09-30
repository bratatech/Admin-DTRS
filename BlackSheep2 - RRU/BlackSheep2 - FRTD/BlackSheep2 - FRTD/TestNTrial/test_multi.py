import urllib.request
import json

for t in ["12952", "19019"]:
    url = f"http://127.0.0.1:8000/api/predict?train_no={t}&weather=Clear&congestion=None&tsr=None"
    req = urllib.request.urlopen(url)
    data = json.loads(req.read().decode('utf-8'))
    math = data['math_resolution']
    print(f"Train {t} ({data['train_name']}):")
    print(f"  EA Allotted   : {data['EA_allotted_mins']} mins")
    print(f"  Gross Delay   : {math['grossDelay']} mins")
    print(f"  Absorbed by EA: {math['Absorbed_by_EA']} mins")
    print(f"  Net Delay     : {math['NetDelay']} mins")
    print(f"  Arrival Status: {math['Arrival_Status']}")
    print(f"  Scheduled Arr : {math['ScheduledDestinationArrival']}")
    print(f"  Predicted ETA : {math['Predicted_ETA']}\n")
