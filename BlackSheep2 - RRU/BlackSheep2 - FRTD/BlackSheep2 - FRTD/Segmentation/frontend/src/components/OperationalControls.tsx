'use client';

import React from 'react';
import { Sliders, RotateCcw, CloudSun, Compass, ShieldAlert } from 'lucide-react';
import { OperationalCases } from '@/types';

interface OperationalControlsProps {
  cases: OperationalCases;
  onChangeCase: (field: keyof OperationalCases, value: string) => void;
  onResetCases: () => void;
  onApplyPreset: (presetName: string) => void;
}

const SUGGESTIONS: Record<string, Record<string, string>> = {
  train_tier: {
    T1_PREMIUM: '(Rajdhani / Shatabdi / Tejas)',
    T2_SUPERFAST: '(Superfast Express)',
    T3_EXPRESS_PASSENGER: '(Mail / Express)',
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
    Double_Quad_Track: '(Double / Quad Track • ±0.0 min)',
    Minor_Crossing_Wait: '(Single Line Loop Wait • ±8.0 mins)',
    Major_Crossing_Wait: '(Junction Detention • ±25.0 mins)',
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
}) => {
  return (
    <div className="irctc-card p-5 mb-5 border-l-4 border-l-irctc-orange">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-irctc-orange" />
          <h2 className="text-base font-bold text-irctc-blue">
            Operational Disturbance Cases &bull; 10 Master PnC Factors
          </h2>
          <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-200">
            38,880 Combinations
          </span>
        </div>
        <button
          type="button"
          onClick={onResetCases}
          className="text-xs text-slate-600 hover:text-irctc-red hover:border-irctc-red bg-slate-50 border border-slate-200 px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Ideal Baseline</span>
        </button>
      </div>

      {/* 3 Structured Sections */}
      <div className="space-y-4">
        {/* Group 1: Traction, Kinetic & Environment */}
        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <CloudSun className="w-4 h-4 text-irctc-blue" />
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-irctc-blue">
              Group 1: Traction Tier &amp; Kinetic Restrictions (Primary Delay $PD$)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Tier */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1. Train Tier (Priority):
              </label>
              <select
                className="irctc-select w-full"
                value={cases.train_tier}
                onChange={(e) => onChangeCase('train_tier', e.target.value)}
              >
                <option value="T1_PREMIUM">T1_PREMIUM</option>
                <option value="T2_SUPERFAST">T2_SUPERFAST</option>
                <option value="T3_EXPRESS_PASSENGER">T3_EXPRESS_PASSENGER</option>
              </select>
              <div className="text-[11px] font-medium text-irctc-blue mt-1 truncate">
                {SUGGESTIONS.train_tier[cases.train_tier]}
              </div>
            </div>

            {/* 2. Weather */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. Weather Condition (DW):
              </label>
              <select
                className="irctc-select w-full"
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
                className="irctc-select w-full"
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
                className="irctc-select w-full"
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

            {/* 5. TRETA Block Occupancy */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                5. Block Occupancy:
              </label>
              <select
                className="irctc-select w-full"
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
                className="irctc-select w-full"
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
                className="irctc-select w-full"
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
                className="irctc-select w-full"
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
                className="irctc-select w-full"
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
                className="irctc-select w-full"
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
      </div>

      {/* Quick Scenario Preset Chips */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Quick Scenario Presets:</span>
        <button
          type="button"
          onClick={() => onApplyPreset('ideal')}
          className="text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold hover:bg-emerald-100 transition-colors"
        >
          Clear Ideal (±0m)
        </button>
        <button
          type="button"
          onClick={() => onApplyPreset('fog')}
          className="text-xs px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-300 font-semibold hover:bg-amber-100 transition-colors"
        >
          Severe Fog (±35m)
        </button>
        <button
          type="button"
          onClick={() => onApplyPreset('monsoon')}
          className="text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-300 font-semibold hover:bg-blue-100 transition-colors"
        >
          Monsoon Rain + Crossing Loop
        </button>
        <button
          type="button"
          onClick={() => onApplyPreset('breakdown')}
          className="text-xs px-2.5 py-1 rounded bg-rose-50 text-rose-800 border border-rose-300 font-semibold hover:bg-rose-100 transition-colors"
        >
          Engine Failure + ACP (±30m)
        </button>
        <button
          type="button"
          onClick={() => onApplyPreset('border')}
          className="text-xs px-2.5 py-1 rounded bg-purple-50 text-purple-800 border border-purple-300 font-semibold hover:bg-purple-100 transition-colors"
        >
          Border Congestion + Duty Exceeded
        </button>
      </div>
    </div>
  );
};
