"""
Root runner for Orchestrar.py
Delegates execution to Pipelines/Orchestrar.py
"""
import os
import sys

# Add Pipelines directory to sys.path
PIPELINES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Pipelines')
if PIPELINES_DIR not in sys.path:
    sys.path.insert(0, PIPELINES_DIR)

from Orchestrar import run_cascade_simulation, get_train_cascade_prediction

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Master Cascading Delay Pipeline Simulation")
    parser.add_argument('--weather', default='Clear', choices=['Clear', 'Fog', 'Heavy_Rain', 'Thunderstorm', 'Snow'])
    parser.add_argument('--congestion', default='Low', choices=['None', 'Low', 'High'])
    parser.add_argument('--tsr', default='Minor', choices=['None', 'Minor', 'Major'])
    parser.add_argument('--headway', type=float, default=8.0)
    parser.add_argument('--platform_margin', type=float, default=5.0)
    parser.add_argument('--crossing_margin', type=float, default=5.0)
    parser.add_argument('--duty_limit', type=float, default=600.0)
    parser.add_argument('--output', default='Train-Data/FinalOrchestraOutput.csv')
    args = parser.parse_args()

    run_cascade_simulation(
        weather=args.weather,
        priority_congestion=args.congestion,
        tsr_level=args.tsr,
        headway_mins=args.headway,
        clearance_margin_mins=args.platform_margin,
        crossing_clearance_mins=args.crossing_margin,
        duty_limit_mins=args.duty_limit,
        output_master_csv=args.output
    )
