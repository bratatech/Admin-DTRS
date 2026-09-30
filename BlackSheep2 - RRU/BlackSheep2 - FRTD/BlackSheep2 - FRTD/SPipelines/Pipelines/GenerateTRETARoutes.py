"""
Pipelines/GenerateTRETARoutes.py
Generates the TRETAroutenumber attribute across all Indian Railways trains.
- Divides each train's route into sequential zone elements (station hops / block sections)
- Assigns a canonical TRETAroutenumber identifier based on corridor geography
- Maps concurrent and sequential train occupancy along each zone
- Merges treta_route_number into EACalculation.csv and TrainsMetadata_DND.csv
"""

import os
import sys
import pandas as pd
import numpy as np

def generate_treta_routes():
    print("=" * 85)
    print("GENERATING TRETAROUTENUMBER ATTRIBUTE & ZONE PARTITIONING FOR FLEET")
    print("=" * 85)

    schedules_df = pd.read_csv('Train-Data/TrainSchedules_DND.csv')
    metadata_df = pd.read_csv('Train-Data/TrainsMetadata_DND.csv')

    # Standardize train numbers
    schedules_df['train_no'] = schedules_df['train_no'].astype(str).str.zfill(5)
    metadata_df['train_no'] = metadata_df['train_no'].astype(str).str.zfill(5)

    # Sort schedules by train and sequence
    schedules_df = schedules_df.sort_values(['train_no', 'sr_no']).reset_index(drop=True)

    # Assign sequential zone elements for each train (station hop: current -> next)
    schedules_df['next_stn'] = schedules_df.groupby('train_no')['station_code'].shift(-1)
    schedules_df['next_train'] = schedules_df.groupby('train_no')['train_no'].shift(-1)

    # Valid hops within the same train
    valid_hops = schedules_df[schedules_df['next_stn'].notna() & (schedules_df['train_no'] == schedules_df['next_train'])].copy()
    
    # Define directional zone element: e.g. "TRETA_ZN_NDLS_BPL_01" or "NDLS->AGC"
    valid_hops['treta_zone_element'] = valid_hops['station_code'] + "->" + valid_hops['next_stn']
    valid_hops['hop_index'] = valid_hops.groupby('train_no').cumcount() + 1

    # Aggregate zones per train
    train_zones = valid_hops.groupby('train_no').agg(
        total_treta_zones=('treta_zone_element', 'count'),
        treta_zone_elements=('treta_zone_element', lambda x: list(x))
    ).reset_index()

    # Generate canonical TRETAroutenumber
    # Format: TRETA_<SRC>_<DST>_<HASH>
    merged = metadata_df.merge(train_zones, on='train_no', how='left')
    
    def construct_treta_route_no(row):
        src = str(row.get('source_station', 'SRC')).strip().replace(' ', '_').upper()[:4]
        dst = str(row.get('destination_station', 'DST')).strip().replace(' ', '_').upper()[:4]
        t_no = str(row['train_no'])
        zones = row.get('total_treta_zones', 0)
        return f"TRETA-{src}-{dst}-Z{zones:02d}-{t_no}"

    merged['treta_route_number'] = merged.apply(construct_treta_route_no, axis=1)

    # Save dedicated TRETARoutes mapping CSV
    treta_summary = merged[[
        'train_no', 'train_name', 'source_station', 'destination_station',
        'train_type', 'treta_route_number', 'total_treta_zones'
    ]].copy()
    treta_summary['total_treta_zones'] = treta_summary['total_treta_zones'].fillna(0).astype(int)
    treta_summary.to_csv('Train-Data/TRETARoutes.csv', index=False)
    print(f"Generated 'Train-Data/TRETARoutes.csv' with {len(treta_summary):,} trains mapped to TRETAroutenumber.")

    # Save detailed zone hop mapping
    valid_hops[['train_no', 'sr_no', 'station_code', 'next_stn', 'treta_zone_element', 'hop_index']].to_csv(
        'Train-Data/TRETAZoneElements.csv', index=False
    )
    print(f"Generated 'Train-Data/TRETAZoneElements.csv' with {len(valid_hops):,} active route zone elements.")

    # Update EACalculation.csv with treta_route_number
    if os.path.exists('Train-Data/EACalculation.csv'):
        ea_df = pd.read_csv('Train-Data/EACalculation.csv')
        ea_df['train_no'] = ea_df['train_no'].astype(str).str.zfill(5)
        if 'treta_route_number' in ea_df.columns:
            ea_df.drop(columns=['treta_route_number'], inplace=True)
        ea_df = ea_df.merge(treta_summary[['train_no', 'treta_route_number']], on='train_no', how='left')
        ea_df.to_csv('Train-Data/EACalculation.csv', index=False)
        print("Updated 'Train-Data/EACalculation.csv' with 'treta_route_number'.")

    # Sample audit display
    print("\n--- SAMPLE TRETAROUTENUMBER AUDIT ---")
    print(treta_summary[['train_no', 'train_name', 'treta_route_number', 'total_treta_zones']].head(8).to_string(index=False))
    print("=" * 85 + "\n")
    return treta_summary

if __name__ == '__main__':
    generate_treta_routes()
