import sys
import pandas as pd

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

df_route = pd.read_csv('SPipelines/Segmentation/RouteDivision.csv')
print('=== 1. CORRIDOR ROUTE SEGMENTATION (RouteDivision) ===')
print(f'Total station-to-station segments: {len(df_route):,}')
print('\nBy Segment Category:')
for k, v in df_route['segment_type'].value_counts().items():
    print(f'  - {k:22}: {v:,} segments')

print('\nBy 7 National Corridors:')
for k, v in df_route['corridor'].value_counts().items():
    print(f'  - {k:22}: {v:,} segments')

print('\nBy State Border Traversal:')
print(f"  - Intra-State (Within same State)   : {(df_route['is_border_crossing'] == 0).sum():,} segments")
print(f"  - Inter-State (Cross-Border Hops)   : {(df_route['is_border_crossing'] == 1).sum():,} segments")

df_sb = pd.read_csv('SPipelines/Segmentation/StateBorderDivision.csv')
print('\n=== 2. STATE BORDER TERRITORIAL SEGMENTATION (StateBorderDivision) ===')
print(f'Total State Border Clusters (States/UTs clubbed): {len(df_sb)}')

df_stn = pd.read_csv('SPipelines/Segmentation/StationStateDivision.csv')
print(f'Total Stations/Halt Stations segmented: {len(df_stn):,}')
print(f"Total Corridor Stations (Golden Quadrilateral): {(df_stn['is_corridor_station'] == 1).sum():,}")

df_csb = pd.read_csv('SPipelines/Segmentation/CorridorStateBorders.csv')
print('\n=== 3. CORRIDOR STATE BORDER PROGRESSIONS (CorridorStateBorders) ===')
print(f'Total Corridors Mapped: {len(df_csb)}')
for _, r in df_csb.iterrows():
    print(f"  - {r['corridor']:20s}: {r['total_state_borders_crossed']} border crossings | {r['state_borders_sequence']}")
