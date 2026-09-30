import urllib.request
import json

url = "http://127.0.0.1:8000/api/predict?train_no=12001&weather=Clear&congestion=None&tsr=None"
req = urllib.request.urlopen(url)
data = json.loads(req.read().decode('utf-8'))
print(json.dumps(data, indent=2))
