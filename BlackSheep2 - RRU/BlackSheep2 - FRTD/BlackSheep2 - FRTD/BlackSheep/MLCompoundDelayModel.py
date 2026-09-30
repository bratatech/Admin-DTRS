"""
MLCompoundDelayModel.py (Root Runner)
Delegates to Pipelines/MLCompoundDelayModel.py
"""
import os
import sys

PIPELINES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Pipelines')
if PIPELINES_DIR not in sys.path:
    sys.path.insert(0, PIPELINES_DIR)

from MLCompoundDelayModel import RailwayDelayMLSimulator, main

if __name__ == '__main__':
    main()
