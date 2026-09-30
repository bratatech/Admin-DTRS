'use client';

import React from 'react';
import { Route, Database, ArrowRight, Upload, RotateCw, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { RouteSegment, DbSimulationStatus } from '@/types';

interface SegmentationControlsProps {
  corridor: string;
  onChangeCorridor: (c: string) => void;
  borderCrossing: string;
  onChangeBorderCrossing: (bc: string) => void;
  selectedSegment: string;
  onChangeSegment: (seg: string) => void;
  segments: RouteSegment[];
  dbStatus: DbSimulationStatus | null;
  onPushToDb: () => void;
  onResetDb: () => void;
  isPushing: boolean;
  isResetting: boolean;
  toastMessage: { text: string; isSuccess: boolean } | null;
}

export const SegmentationControls: React.FC<SegmentationControlsProps> = ({
  corridor,
  onChangeCorridor,
  borderCrossing,
  onChangeBorderCrossing,
  selectedSegment,
  onChangeSegment,
  segments,
  dbStatus,
  onPushToDb,
  onResetDb,
  isPushing,
  isResetting,
  toastMessage,
}) => {
  return (
    <div className="irctc-card p-5 mb-5 border-l-4 border-l-emerald-600">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base font-bold text-irctc-blue">
            Corridor Route &amp; State Border Segmentation Engine
          </h2>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
            857 Route Hops &bull; 29 States
          </span>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          RouteDivision &amp; StateBorderDivision in <strong>WIN.db</strong>
        </div>
      </div>

      {/* Grid: Corridor & Border Traversal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Corridor */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Target National Rail Corridor (Auto-Synced):
          </label>
          <select
            className="irctc-select w-full"
            value={corridor}
            onChange={(e) => onChangeCorridor(e.target.value)}
          >
            <option value="ALL">All National &amp; Regional Corridors</option>
            <optgroup label="Golden Quadrilateral National Corridors">
              <option value="DEL-MUM">DEL-MUM &bull; Delhi ↔ Mumbai</option>
              <option value="DEL-HWH">DEL-HWH &bull; Delhi ↔ Howrah</option>
              <option value="DEL-MAS">DEL-MAS &bull; Delhi ↔ Chennai</option>
              <option value="MUM-MAS">MUM-MAS &bull; Mumbai ↔ Chennai</option>
              <option value="MUM-HWH">MUM-HWH &bull; Mumbai ↔ Howrah</option>
              <option value="HWH-MAS">HWH-MAS &bull; Howrah ↔ Chennai</option>
              <option value="HWH-GHY">HWH-GHY &bull; Howrah ↔ Guwahati</option>
            </optgroup>
            <optgroup label="Regional Trunk Corridors">
              <option value="DEL-JAT">DEL-JAT &bull; Delhi ↔ Jammu</option>
              <option value="MAS-BLR">MAS-BLR &bull; Chennai ↔ Bengaluru</option>
              <option value="MUM-ADI">MUM-ADI &bull; Mumbai ↔ Ahmedabad</option>
              <option value="HWH-PURI">HWH-PURI &bull; Howrah ↔ Puri</option>
              <option value="DEL-ASR">DEL-ASR &bull; Delhi ↔ Amritsar</option>
              <option value="ZONAL_FEEDER">ZONAL_FEEDER &bull; Feeder Network</option>
            </optgroup>
          </select>
          <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
            {corridor === 'ALL'
              ? '(All 7 National Corridors & Regional Routes)'
              : `(Active Corridor: ${corridor})`}
          </div>
        </div>

        {/* State Border Crossing */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            State Border Traversal Filter:
          </label>
          <select
            className="irctc-select w-full"
            value={borderCrossing}
            onChange={(e) => onChangeBorderCrossing(e.target.value)}
          >
            <option value="ALL">All Movements</option>
            <option value="0">Intra-State</option>
            <option value="1">Inter-State Border Crossing</option>
          </select>
          <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
            {borderCrossing === 'ALL'
              ? '(Intra-State + Inter-State Movements)'
              : borderCrossing === '0'
              ? '(Within Same State Territorial Boundary)'
              : '(Border Transition Hop Across States)'}
          </div>
        </div>
      </div>

      {/* Specific Segment Selector */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Select Specific Corridor Segment (Hop-Level Physics):
        </label>
        <select
          className="irctc-select w-full font-mono text-xs"
          value={selectedSegment}
          onChange={(e) => onChangeSegment(e.target.value)}
        >
          <option value="">
            -- Complete Route Journey (Select a specific hop below for segment physics) --
          </option>
          {segments.map((seg) => (
            <option key={seg.treta_segment_number} value={seg.treta_segment_number}>
              {seg.label ||
                `[${seg.treta_segment_number}] ${seg.from_station_name} (${seg.from_station_code}) → ${seg.to_station_name} (${seg.to_station_code}) • ${seg.segment_distance_km} km`}
            </option>
          ))}
        </select>
      </div>

      {/* Database Sandbox Integrity Bar */}
      <div className="bg-slate-100/90 rounded-lg p-3.5 border border-slate-300 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-irctc-blue" />
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold uppercase text-slate-800 text-[11px] tracking-wide">
                Database Sandbox Integrity:
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  !dbStatus || dbStatus.is_pristine
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {!dbStatus || dbStatus.is_pristine
                  ? 'MODE: PRISTINE (MASTER UNTOUCHED)'
                  : `MODE: SIMULATION SANDBOX (${dbStatus.modifications_count ?? 0} MODS)`}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Master <code>WIN.db</code> remains read-only. What-if pushes write to isolated <code>WIN_SIMULATION.db</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPushToDb}
            disabled={isPushing}
            className="bg-irctc-blue hover:bg-irctc-blue-dark text-white text-xs font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-amber-300" />
            <span>{isPushing ? 'Pushing...' : 'Push to Simulation DB'}</span>
          </button>
          <button
            type="button"
            onClick={onResetDb}
            disabled={isResetting}
            className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isResetting ? 'Resetting...' : 'Reset DB'}</span>
          </button>
        </div>
      </div>

      {/* Live Toast Notification */}
      {toastMessage && (
        <div
          className={`mt-3 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
            toastMessage.isSuccess
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-rose-50 text-rose-800 border border-rose-300'
          }`}
        >
          {toastMessage.isSuccess ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
