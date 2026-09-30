'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  RotateCcw,
  CloudSun,
  Compass,
  ShieldAlert,
  Lock,
  Zap,
  FastForward,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import {
  OperationalCases,
  TrainInfo,
  RouteSegment,
  StationCircumstance,
} from '@/types';

interface OperationalControlsProps {
  cases: OperationalCases;
  onChangeCase: (field: keyof OperationalCases, value: string) => void;
  onResetCases: () => void;
  onApplyPreset: (presetName: string) => void;
  isFrozen?: boolean;
  lockReason?: string;
  onToggleFreeze?: () => void;
  trainInfo?: TrainInfo | null;
  selectedTrainNo?: string;
  segments?: RouteSegment[];
  selectedSegment?: string;
  onChangeSegment?: (seg: string) => void;
  sectionDelayMins?: number;
  onUpdateSectionDelay?: (mins: number, segNo?: string) => void;
  speedupRecoveryMins?: number;
  onUpdateSpeedupRecovery?: (mins: number) => void;
  multiStationInjections?: StationCircumstance[];
  onUpdateMultiStationInjections?: (injections: StationCircumstance[]) => void;
}

const DISRUPTION_REASONS = [
  'Signal Clearance / Precedence Wait',
  'Temporary Speed Restriction (TSR) Caution Order',
  'Single-Track Crossing Precedence Hold',
  'Track & OHE Electrification Maintenance',
  'Alarm Chain Pulling (ACP) Event',
  'Locomotive Traction Tractive Drag',
];

const SUGGESTIONS: Record<string, Record<string, string>> = {
  train_tier: {
    T1_PREMIUM: '(Rajdhani / Shatabdi / Tejas / Vande Bharat)',
    T2_SUPERFAST: '(Superfast / Mail Express)',
    T3_EXPRESS_PASSENGER: '(Express / Passenger / Suburban)',
    T3_EXPRESS: '(Express / Passenger / Suburban)',
  },
  weather: {
    Clear: '(Nominal • ±0.0 min)',
    Fog: '(Dense Crawl • ±35.0 mins)',
    Heavy_Rain: '(Monsoon • ±12.0 mins)',
    Thunderstorm: '(Storm Caution • ±18.0 mins)',
    Snow: '(Sub-zero Freeze • ±22.0 mins)',
  },
  tsr_level: {
    None: '(Full Permissible Speed • ±0.0 min)',
    Minor: '(1-2 Caution Orders • ±8.0 mins)',
    Major: '(Engineering Block • ±24.0 mins)',
  },
  priority_congestion: {
    None: '(Free Section • 0.5x Headway)',
    Low: '(Nominal Daily Traffic • 1.0x Headway)',
    High: '(Corridor Congestion • 1.8x Headway)',
  },
  treta_block_occupancy: {
    Track_Clear: '(Free Block • ±0.0 min)',
    Preceding_Delayed_Minor: '(Preceding Delayed Minor • ±5.0 mins)',
    Preceding_Delayed_Moderate: '(Preceding Delayed Moderate • ±10.0 mins)',
    Preceding_Delayed_Severe: '(Preceding Delayed Severe • ±20.0 mins)',
  },
  crossing_conflict: {
    Double_Quad_Track: '(Clear Priority • ±0.0 min)',
    Minor_Crossing_Wait: '(Loop Wait • ±8.0 mins)',
    Major_Crossing_Wait: '(Main Line Precedence • ±25.0 mins)',
  },
  alarm_chain_pulling: {
    '0_Events': '(Nominal • ±0.0 min)',
    '1_Event': '(1 Event • ±15.0 mins brake reset)',
    '2_Events': '(2 Events • ±30.0 mins brake reset)',
  },
  engine_failure: {
    Nominal: '(Full Traction Power • ±0.0 min)',
    Failure: '(Failure • ±15.0m direct + ripple)',
  },
  terminal_platform_hold: {
    Platform_Available: '(Clear Path • ±0.0 min)',
    Outer_Holding: '(Outer Signal Wait • ±15.0 mins)',
  },
  crew_duty_status: {
    Duty_Valid: '(Active Crew • ±0.0 min)',
    Duty_Exceeded: '(Duty Exceeded • ±45.0m Relief)',
  },
};

export const OperationalControls: React.FC<OperationalControlsProps> = ({
  cases,
  onChangeCase,
  onResetCases,
  onApplyPreset,
  isFrozen = false,
  lockReason,
  onToggleFreeze,
  trainInfo,
  selectedTrainNo,
  segments = [],
  selectedSegment = '',
  onChangeSegment,
  sectionDelayMins = 0,
  onUpdateSectionDelay,
  speedupRecoveryMins = 0,
  onUpdateSpeedupRecovery,
  multiStationInjections = [],
  onUpdateMultiStationInjections,
}) => {
  const effectiveTier = trainInfo?.train_tier || cases.train_tier || 'T1_PREMIUM';
  const tierAutoSpeedup = effectiveTier.startsWith('T1') ? 20 : (effectiveTier.startsWith('T2') ? 15 : 10);

  // Local state for Section Delay
  const [localSelectedSeg, setLocalSelectedSeg] = useState<string>(selectedSegment || '');
  const [selectedReason, setSelectedReason] = useState<string>(DISRUPTION_REASONS[0]);
  const [localSectionDelay, setLocalSectionDelay] = useState<number>(sectionDelayMins || 0);
  const [localSpeedup, setLocalSpeedup] = useState<number>(speedupRecoveryMins || tierAutoSpeedup);

  const availableSegments = (trainInfo?.segments && trainInfo.segments.length > 0)
    ? trainInfo.segments
    : (segments && segments.length > 0 ? segments : []);

  useEffect(() => {
    if (selectedSegment) {
      setLocalSelectedSeg(selectedSegment);
    }
  }, [selectedSegment]);

  useEffect(() => {
    if (typeof sectionDelayMins === 'number') {
      setLocalSectionDelay(sectionDelayMins);
    }
  }, [sectionDelayMins]);

  // Strictly auto-fetch speedup recovery rate from train tier: 20m for T1, 15m for T2, 10m for T3
  useEffect(() => {
    setLocalSpeedup(tierAutoSpeedup);
    if (onUpdateSpeedupRecovery && speedupRecoveryMins !== tierAutoSpeedup) {
      onUpdateSpeedupRecovery(tierAutoSpeedup);
    }
  }, [tierAutoSpeedup, speedupRecoveryMins, onUpdateSpeedupRecovery]);

  // Ensure cases.train_tier is strictly synced to database trainInfo
  useEffect(() => {
    if (trainInfo?.train_tier && cases.train_tier !== trainInfo.train_tier) {
      onChangeCase('train_tier', trainInfo.train_tier);
    }
  }, [trainInfo?.train_tier, cases.train_tier, onChangeCase]);

  const handleApplySectionDelay = (delayVal: number, segNo?: string) => {
    setLocalSectionDelay(delayVal);
    const targetSeg = segNo !== undefined ? segNo : localSelectedSeg;
    if (onUpdateSectionDelay) {
      onUpdateSectionDelay(delayVal, targetSeg);
    }
  };

  const handleApplySpeedup = (mins: number) => {
    setLocalSpeedup(mins);
    if (onUpdateSpeedupRecovery) {
      onUpdateSpeedupRecovery(mins);
    }
  };

  return (
    <div className="irctc-card p-5 mb-5 border-l-4 border-l-irctc-blue relative">
      {/* Frozen Overlay Banner */}
      {isFrozen && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 text-amber-800">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold uppercase tracking-wide">Operational Controls Frozen:</span>{' '}
              <span className="font-medium">
                {lockReason
                  ? lockReason.replace(/\s*•\s*(?:Master|Base)PnC\s*#?\d*/gi, '').replace(/(?:Master|Base)PnC\s*#?\d*\s*/gi, '').trim()
                  : 'Locked to live telemetry.'}
              </span>
            </div>
          </div>
          {onToggleFreeze && (
            <button
              type="button"
              onClick={onToggleFreeze}
              className="text-xs px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Unlock Controls
            </button>
          )}
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-irctc-blue" />
          <h2 className="text-base font-bold text-irctc-blue">
            Operational Disturbance Cases &amp; Network Constraints
          </h2>
          <span className="text-xs bg-blue-100 text-irctc-blue font-bold px-2 py-0.5 rounded border border-blue-200">
            10 Cascade Conditions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetCases}
            disabled={isFrozen}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 px-2.5 py-1.5 rounded hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer"
            title="Reset All 10 Cases to Nominal Baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline (Clear)</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Group 1: Physical Disturbances & Speed Restrictions */}
        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <CloudSun className="w-4 h-4 text-irctc-blue" />
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-irctc-blue">
              Group 1: Track-Level Physical Disturbances (Primary Shock $PD$)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Train Tier */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  1. Timetable Tier (Auto-Synced):
                </label>
                <span className="text-[10px] font-mono bg-blue-50 text-irctc-blue font-extrabold px-1.5 py-0.2 rounded border border-blue-200">
                  DATABASE
                </span>
              </div>

              {/* Fixed Read-only DB-Synced Specification Card */}
              <div className="h-[38px] px-3 py-1.5 bg-slate-100/90 border border-slate-300 rounded-lg flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="font-mono font-black text-xs text-slate-900 truncate">
                    {effectiveTier}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                    effectiveTier === 'T1_PREMIUM'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : effectiveTier === 'T2_SUPERFAST'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                  }`}
                >
                  {effectiveTier === 'T1_PREMIUM'
                    ? 'T1 High Priority'
                    : effectiveTier === 'T2_SUPERFAST'
                    ? 'T2 Medium Priority'
                    : 'T3 Standard Priority'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mt-1">
                <span className="truncate text-irctc-blue font-semibold">
                  {SUGGESTIONS.train_tier[effectiveTier] || '(Official Timetable Tier)'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                  Fixed for Train {trainInfo?.train_no || selectedTrainNo || '12001'}
                </span>
              </div>
            </div>

            {/* 2. Weather */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. Weather Condition (DW):
              </label>
              <select
                className="irctc-select w-full disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                disabled={isFrozen}
                value={cases.weather}
                onChange={(e) => onChangeCase('weather', e.target.value)}
              >
                <option value="Clear">Clear</option>
                <option value="Fog">Fog</option>
                <option value="Heavy_Rain">Heavy Rain</option>
                <option value="Thunderstorm">Thunderstorm</option>
                <option value="Snow">Snowfall</option>
              </select>
              <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
                {SUGGESTIONS.weather[cases.weather]}
              </div>
            </div>

            {/* 3. TSR Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3. Speed Restriction / TSR (DTS):
              </label>
              <select
                className="irctc-select w-full disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                disabled={isFrozen}
                value={cases.tsr_level}
                onChange={(e) => onChangeCase('tsr_level', e.target.value)}
              >
                <option value="None">None</option>
                <option value="Minor">Minor TSR</option>
                <option value="Major">Major TSR</option>
              </select>
              <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
                {SUGGESTIONS.tsr_level[cases.tsr_level]}
              </div>
            </div>
          </div>

          {trainInfo?.inherited_delay_info?.has_inherited_delay && (
            <div className="mt-3 p-2.5 bg-amber-100/70 border border-amber-300 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-950 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                <span>Inherited Primary Delay Active (WIN_SIMULATION.db &bull; {trainInfo.inherited_delay_info.conflict_type}):</span>
              </div>
              <span className="font-mono font-black text-rose-700 bg-white/90 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                +{trainInfo.inherited_delay_info.inherited_delay_mins.toFixed(1)} mins Shock
              </span>
            </div>
          )}
        </div>

        {/* Group 2: Signalling, Congestion & Interlocking */}
        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-4 h-4 text-irctc-blue" />
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-irctc-blue">
              Group 2: Block Signalling &amp; Line Conflicts (Cascading Shocks $CD$)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 4. Priority Congestion */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                4. Priority Congestion:
              </label>
              <select
                className="irctc-select w-full disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                disabled={isFrozen}
                value={cases.priority_congestion}
                onChange={(e) => onChangeCase('priority_congestion', e.target.value)}
              >
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="High">High</option>
              </select>
              <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
                {SUGGESTIONS.priority_congestion[cases.priority_congestion]}
              </div>
            </div>

            {/* 5. DTRS Block Occupancy */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                5. Block Occupancy:
              </label>
              <select
                className="irctc-select w-full disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                disabled={isFrozen}
                value={cases.treta_block_occupancy}
                onChange={(e) => onChangeCase('treta_block_occupancy', e.target.value)}
              >
                <option value="Track_Clear">Track Clear</option>
                <option value="Preceding_Delayed_Minor">Preceding Delayed Minor</option>
                <option value="Preceding_Delayed_Moderate">Preceding Delayed Moderate</option>
                <option value="Preceding_Delayed_Severe">Preceding Delayed Severe</option>
              </select>
              <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
                {SUGGESTIONS.treta_block_occupancy[cases.treta_block_occupancy]}
              </div>
            </div>

            {/* 6. Crossing Conflict */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                6. Crossing / Junction Conflict (DCR):
              </label>
              <select
                className="irctc-select w-full disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                disabled={isFrozen}
                value={cases.crossing_conflict}
                onChange={(e) => onChangeCase('crossing_conflict', e.target.value)}
              >
                <option value="Double_Quad_Track">Double / Quad Track</option>
                <option value="Minor_Crossing_Wait">Minor Crossing Wait</option>
                <option value="Major_Crossing_Wait">Major Crossing Wait</option>
              </select>
              <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
                {SUGGESTIONS.crossing_conflict[cases.crossing_conflict]}
              </div>
            </div>
          </div>
        </div>

        {/* Group 3: Mechanical, Terminals & Crew Duty */}
        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-irctc-blue" />
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-irctc-blue">
              Group 3: Equipment, Station &amp; Crew Operations (Incident Shocks)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 7. ACP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                7. Alarm Chain Pulling (DCP):
              </label>
              <select
                className="irctc-select w-full disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                disabled={isFrozen}
                value={cases.alarm_chain_pulling}
                onChange={(e) => onChangeCase('alarm_chain_pulling', e.target.value)}
              >
                <option value="0_Events">0 Events</option>
                <option value="1_Event">1 Event</option>
                <option value="2_Events">2 Events</option>
              </select>
              <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
                {SUGGESTIONS.alarm_chain_pulling[cases.alarm_chain_pulling]}
              </div>
            </div>

            {/* 8. Engine Failure */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                8. Locomotive Status (DE):
              </label>
              <select
                className="irctc-select w-full disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                disabled={isFrozen}
                value={cases.engine_failure}
                onChange={(e) => onChangeCase('engine_failure', e.target.value)}
              >
                <option value="Nominal">Nominal</option>
                <option value="Failure">Failure</option>
              </select>
              <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
                {SUGGESTIONS.engine_failure[cases.engine_failure]}
              </div>
            </div>

            {/* 9. Platform Hold */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                9. Platform Availability (DPL):
              </label>
              <select
                className="irctc-select w-full disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                disabled={isFrozen}
                value={cases.terminal_platform_hold}
                onChange={(e) => onChangeCase('terminal_platform_hold', e.target.value)}
              >
                <option value="Platform_Available">Platform Available</option>
                <option value="Outer_Holding">Outer Holding</option>
              </select>
              <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
                {SUGGESTIONS.terminal_platform_hold[cases.terminal_platform_hold]}
              </div>
            </div>

            {/* 10. Crew Duty */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                10. Crew Duty Status (DCW):
              </label>
              <select
                className="irctc-select w-full disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                disabled={isFrozen}
                value={cases.crew_duty_status}
                onChange={(e) => onChangeCase('crew_duty_status', e.target.value)}
              >
                <option value="Duty_Valid">Duty Valid</option>
                <option value="Duty_Exceeded">Duty Exceeded</option>
              </select>
              <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
                {SUGGESTIONS.crew_duty_status[cases.crew_duty_status]}
              </div>
            </div>
          </div>
        </div>

        {/* Group 4: Additional Disturbance Controls (Inject Delay & MPS Rate) */}
        <div className="p-4 bg-gradient-to-r from-indigo-900/5 via-blue-900/5 to-emerald-900/5 border border-indigo-200 rounded-xl space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 animate-bounce" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Group 4: Inject Late Departure 
              </h3>
           
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              {multiStationInjections.length > 0 ? (
                <span className="text-indigo-700 font-bold">
                  {multiStationInjections.length} Segment Circumstance{multiStationInjections.length === 1 ? '' : 's'} Active
                </span>
              ) : (
                <span className="text-slate-500">Standard Baseline</span>
              )}
            </div>
          </div>

          {/* Sub-Section 4A: Section / Route Hop Disturbance (Inject Delay) */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Section Operational Disruption (Inject Delay):</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Segment / Hop Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target Route Section / Hop:
                </label>
                <select
                  className="irctc-select w-full text-xs font-semibold"
                  value={localSelectedSeg}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalSelectedSeg(val);
                    if (onChangeSegment) onChangeSegment(val);
                  }}
                >
                  <option value="">
                    -- Whole Route / Current Detected Section ({cases.treta_segment_number?.replace(/^TRETA/i, 'DTRS') || 'Default'}) --
                  </option>
                  {availableSegments.map((seg) => (
                    <option key={seg.treta_segment_number} value={seg.treta_segment_number}>
                      {seg.label || `[${seg.treta_segment_number?.replace(/^TRETA/i, 'DTRS')}] ${seg.from_station_name} → ${seg.to_station_name}`} ({seg.segment_distance_km} km {seg.is_border_crossing ? '• Border Crossing 🌐' : ''})
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-slate-500 mt-1">
                  Injected disturbance propagates across all downstream stations with progressive buffer slack absorption.
                </div>
              </div>

              {/* Disturbance Reason */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Section Operational Disruption Reason:
                </label>
                <select
                  className="irctc-select w-full text-xs font-semibold"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                >
                  {DISRUPTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-slate-500 mt-1">
                  Categorizes the disturbance in the 5-Stage mathematical resolution and audit logs.
                </div>
              </div>
            </div>

            {/* Delay Minute Buttons & Custom Input */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-extrabold text-slate-700 mr-1">Inject Delay:</span>
                {[0, 5, 10, 15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleApplySectionDelay(mins, localSelectedSeg)}
                    className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all border ${
                      localSectionDelay === mins
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {mins === 0 ? '±0m (Clear)' : `+${mins}m`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-bold text-slate-600">Custom:</span>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    step="5"
                    className="w-16 px-2 py-1 text-xs font-mono font-bold border rounded border-slate-300 bg-white"
                    value={localSectionDelay}
                    onChange={(e) => setLocalSectionDelay(Number(e.target.value))}
                  />
                  <span className="text-slate-500 text-[11px]">mins</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleApplySectionDelay(localSectionDelay, localSelectedSeg)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Apply Shock
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Section 4B: Maximum Speed Cover-up (Auto-Fetched MPS Rate) */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                <FastForward className="w-3.5 h-3.5 text-emerald-600" />
                <span>Maximum Speed Cover-up (Time Recovery on Clear MPS Sections - MPS Rate):</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 border border-emerald-300">
                  Auto-Fetched: {effectiveTier.startsWith('T1') ? '20m (T1 Premium)' : effectiveTier.startsWith('T2') ? '15m (T2 Superfast)' : '10m (T3 Express)'}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded border border-emerald-300 shadow-2xs">
                  Active Recovery: -{localSpeedup}m
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Scenario Preset Chips */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Quick Scenario Presets:</span>
        <button
          type="button"
          onClick={() => onApplyPreset('ideal')}
          className="text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
        >
          Clear Ideal (±0m)
        </button>
        <button
          type="button"
          onClick={() => onApplyPreset('fog')}
          className="text-xs px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-300 font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
        >
          Severe Fog (±35m)
        </button>
        <button
          type="button"
          onClick={() => onApplyPreset('monsoon')}
          className="text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-300 font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
        >
          Monsoon Rain + Crossing Loop
        </button>
        <button
          type="button"
          onClick={() => onApplyPreset('breakdown')}
          className="text-xs px-2.5 py-1 rounded bg-rose-50 text-rose-800 border border-rose-300 font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
        >
          Engine Failure + ACP (±30m)
        </button>
        <button
          type="button"
          onClick={() => onApplyPreset('border')}
          className="text-xs px-2.5 py-1 rounded bg-purple-50 text-purple-800 border border-purple-300 font-semibold hover:bg-purple-100 transition-colors cursor-pointer"
        >
          Border Congestion + Duty Exceeded
        </button>
      </div>
    </div>
  );
};
