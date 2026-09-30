import sys
import os
sys.path.append(os.path.abspath('SPipelines/Segmentation'))
from StateSegmentation import build_station_state_catalog
import pandas as pd

stn_catalog = build_station_state_catalog()
df_route = pd.read_csv('SPipelines/Segmentation/RouteDivision.csv')

df_route['from_state'] = df_route['from_station_code'].map(lambda c: stn_catalog[c]['state_name'])
df_route['from_state_code'] = df_route['from_station_code'].map(lambda c: stn_catalog[c]['state_code'])
df_route['from_state_border_key'] = 'SB-' + df_route['from_state_code']

df_route['to_state'] = df_route['to_station_code'].map(lambda c: stn_catalog[c]['state_name'])
df_route['to_state_code'] = df_route['to_station_code'].map(lambda c: stn_catalog[c]['state_code'])
df_route['to_state_border_key'] = 'SB-' + df_route['to_state_code']

df_route['is_border_crossing'] = (df_route['from_state_code'] != df_route['to_state_code']).astype(int)
df_route['state_border_transition'] = df_route.apply(
    lambda r: f"SB-{r['from_state_code']}->SB-{r['to_state_code']}" if r['is_border_crossing'] == 1 else f"INTRA-SB-{r['from_state_code']}", axis=1
)
df_route['state_border_key'] = df_route.apply(
    lambda r: f"SB-{r['from_state_code']}" if r['is_border_crossing'] == 0 else f"SB-XING-{r['from_state_code']}-{r['to_state_code']}", axis=1
)

print('Total segments:', len(df_route))
print('Intra-state segments:', (df_route['is_border_crossing'] == 0).sum())
print('Inter-state border crossing segments:', (df_route['is_border_crossing'] == 1).sum())
print('\nSample border crossing segments:')
print(df_route[df_route['is_border_crossing'] == 1][['corridor', 'train_no', 'from_station_code', 'from_state', 'to_station_code', 'to_state', 'state_border_transition', 'state_border_key']].head(8).to_string())
