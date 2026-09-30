'use client';

import React from 'react';
import { Clock, TrendingUp, ShieldCheck, AlertOctagon, CheckCircle2, ArrowRight, Gauge, FileText } from 'lucide-react';
import { PredictionResult } from '@/types';

interface ResultsDashboardProps {
  result: PredictionResult | null;
  isLoading: boolean;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  result,
  isLoading,
}) => {
  if (!result && isLoading) {
    return (
      <div className="irctc-card p-12 text-center my-6 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-irctc-blue border-t-irctc-orange rounded-full animate-spin mb-4" />
        <h3 className="text-base font-bold text-irctc-blue">
          Evaluating 5-Stage Delay Physics &amp; WIN Scenarios...
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Cross-referencing timetable slack, kinetic restrictions, and block headway.
        </p>
      </div>
    );
  }

  if (!result) return null;

  const isLate = result.math_resolution.Arrival_Status === 'LATE';
  const seg = result.segment_breakdown;

  return (
    <div className={`irctc-card p-5 mb-5 border-l-4 border-l-irctc-blue relative transition-opacity duration-200 ${isLoading ? 'opacity-70' : 'opacity-100'}`}>
      {/* Subtle Recalculation Indicator Bar */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-irctc-blue via-irctc-orange to-irctc-blue animate-pulse rounded-t-lg z-10" />
      )}
      {/* Top Banner: Train Name & Status */}
      <div className="flex flex-wrap items-start justify-between pb-4 mb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-irctc-blue text-white">
              TRAIN {result.train_no}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
              {result.train_tier}
            </span>
            <span className="text-xs font-semibold text-irctc-orange bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
              {result.relevant_corridor_slug} &bull; {result.relevant_corridor_name}
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {result.train_name}
          </h2>

          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-700">{result.source_station}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 inline" />
            <span className="font-semibold text-slate-700">{result.destination_station}</span>
            <span className="text-slate-300">&bull;</span>
            <span>{result.total_distance_km.toFixed(1)} km</span>
            <span className="text-slate-300">&bull;</span>
            <span>{result.total_halts} Halts</span>
            <span className="text-slate-300">&bull;</span>
            <span>Timetable Slack (EA): {result.EA_allotted_mins.toFixed(1)} mins</span>
          </div>
        </div>

        {/* Live Punctuality Badge */}
        <div>
          <div
            className={`px-4 py-2 rounded-lg font-black text-sm tracking-wide shadow-sm flex items-center gap-2 border ${
              isLate
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isLate ? 'bg-rose-600 animate-pulse' : 'bg-emerald-600'}`} />
            <span>{isLate ? 'LATE AT DESTINATION' : 'ON TIME (PUNCTUAL)'}</span>
          </div>
        </div>
      </div>

      {/* Hop-Level Segment Callout if Segment Evaluated */}
      {seg && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-xs font-bold text-irctc-blue">
              EVALUATING HOP: {seg.treta_segment_number}
            </div>
            <div className="text-xs text-sky-900 mt-0.5">
              <strong>{seg.from_station}</strong> &rarr; <strong>{seg.to_station}</strong> &bull;{' '}
              {seg.segment_distance_km} km &bull; {seg.segment_type}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-white rounded border border-sky-200 text-slate-700">
              {seg.from_state_border} &rarr; {seg.to_state_border}
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                seg.is_border_crossing
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {seg.is_border_crossing ? 'INTER-STATE BORDER CROSSING' : 'INTRA-STATE SECTION'}
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {/* 1. Primary Delay */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Primary Delay (PD)
          </div>
          <div className="text-lg font-mono font-extrabold text-rose-600">
            +{result.primary_breakdown.PrimaryDelay.toFixed(1)}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">DW + DTS + DCP + DE</div>
        </div>

        {/* 2. Cascade Shocks */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Cascade Shocks (CD)
          </div>
          <div className="text-lg font-mono font-extrabold text-amber-600">
            +{result.cascade_breakdown.CascadeDelay.toFixed(1)}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">DH + DCR + DPL + DCW</div>
        </div>

        {/* 3. Gross Delay */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Gross Delay (GD)
          </div>
          <div className="text-lg font-mono font-extrabold text-slate-800">
            {result.math_resolution.grossDelay.toFixed(1)}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">PD + CD Total Shock</div>
        </div>

        {/* 4. Buffer Absorbed */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
            Buffer Slack (MEA)
          </div>
          <div className="text-lg font-mono font-extrabold text-emerald-700">
            &minus;{result.math_resolution.Absorbed_by_EA.toFixed(1)}m
          </div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">Absorbed by Slack</div>
        </div>

        {/* 5. Final Net Delay */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Final Net Delay (ND)
          </div>
          <div
            className={`text-lg font-mono font-extrabold ${
              result.math_resolution.NetDelay > 5.0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {result.math_resolution.NetDelay.toFixed(1)}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">max(0, GD &minus; MEA)</div>
        </div>

        {/* 6. Predicted ETA */}
        <div className="bg-irctc-blue-light/70 border-2 border-irctc-blue/30 rounded-lg p-3 text-center">
          <div className="text-[11px] font-extrabold text-irctc-blue uppercase tracking-wider mb-0.5">
            Predicted ETA
          </div>
          <div className="text-base sm:text-lg font-mono font-extrabold text-irctc-blue leading-tight">
            {result.math_resolution.Predicted_ETA}
          </div>
          <div className="text-[10px] text-irctc-blue/80 font-medium mt-0.5">
            Sched: {result.math_resolution.ScheduledDestinationArrival} IST
          </div>
        </div>
      </div>

      {/* 5-Stage Mathematical Derivation Table */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2.5">
          <FileText className="w-4 h-4 text-irctc-blue" />
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
            Step-by-Step 5-Stage Mathematical Derivation (Verified in WIN.db)
          </h3>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-irctc-blue text-white">
                <th className="py-2 px-3 font-semibold w-16">Stage</th>
                <th className="py-2 px-3 font-semibold w-52">Formula &amp; Component</th>
                <th className="py-2 px-3 font-semibold">Operational Inputs &amp; Mathematical Breakdown</th>
                <th className="py-2 px-3 font-semibold text-right w-32">Calculated Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {/* Stage 1 */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">Stage 1</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-slate-900">Primary Delay ($PD$)</span>
                  <div className="text-[10px] font-mono text-slate-500">PD = DW + DTS + DCP + DE</div>
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  Weather: {result.applied_cases.weather} (+{result.primary_breakdown.d_weather.toFixed(1)}m) + TSR:{' '}
                  {result.applied_cases.tsr_level} (+{result.primary_breakdown.d_tsr.toFixed(1)}m) + ACP:{' '}
                  {result.applied_cases.alarm_chain_pulling} (+{result.primary_breakdown.d_chain_pulling.toFixed(1)}m) +
                  Engine: {result.applied_cases.engine_failure} (+{result.primary_breakdown.d_engine_failure.toFixed(1)}
                  m)
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                  +{result.primary_breakdown.PrimaryDelay.toFixed(1)} mins
                </td>
              </tr>

              {/* Stage 2 */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">Stage 2</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-slate-900">Cascading Shocks ($CD$)</span>
                  <div className="text-[10px] font-mono text-slate-500">CD = DH + DCR + DPL + DCW</div>
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  Headway (DH): {result.cascade_breakdown.d_headway.toFixed(1)}m + Crossing (DCR):{' '}
                  {result.cascade_breakdown.d_crossing.toFixed(1)}m + Platform (DPL):{' '}
                  {result.cascade_breakdown.d_platform_hold.toFixed(1)}m + Crew (DCW):{' '}
                  {result.cascade_breakdown.d_crew.toFixed(1)}m
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                  +{result.cascade_breakdown.CascadeDelay.toFixed(1)} mins
                </td>
              </tr>

              {/* Stage 3 */}
              <tr className="bg-slate-50/60 font-semibold">
                <td className="py-2.5 px-3 font-mono text-slate-700">Stage 3</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-slate-900">Gross Delay ($GD$)</span>
                  <div className="text-[10px] font-mono text-slate-500">GD = PD + CD</div>
                </td>
                <td className="py-2.5 px-3 text-slate-600 font-normal">
                  Total combined disturbance across all kinetic and domino network constraints
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                  {result.math_resolution.grossDelay.toFixed(1)} mins
                </td>
              </tr>

              {/* Stage 4 */}
              <tr className="bg-emerald-50/50 hover:bg-emerald-50/80">
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">Stage 4</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-emerald-900">Buffer Absorbed ($MEA$)</span>
                  <div className="text-[10px] font-mono text-emerald-700">MEA = min(GD &times; RR, 0.20 &times; EA)</div>
                </td>
                <td className="py-2.5 px-3 text-emerald-800">
                  Allotted Timetable Slack: {result.EA_allotted_mins.toFixed(1)} mins &bull; Train Tier Recovery Rate
                  Applied
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                  &minus;{result.math_resolution.Absorbed_by_EA.toFixed(1)} mins
                </td>
              </tr>

              {/* Stage 5 */}
              <tr className="bg-slate-100 font-semibold">
                <td className="py-2.5 px-3 font-mono text-slate-800">Stage 5</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-slate-900">Net Destination Delay ($ND$)</span>
                  <div className="text-[10px] font-mono text-slate-500">ND = max(0, GD &minus; MEA)</div>
                </td>
                <td className="py-2.5 px-3 text-slate-700 font-normal">
                  Final unrecoverable delay arriving at destination station after timetable buffer absorption
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  {result.math_resolution.NetDelay.toFixed(1)} mins
                </td>
              </tr>

              {/* Final Predicted ETA */}
              <tr className="bg-irctc-blue-light/70 font-bold border-t-2 border-irctc-blue/30">
                <td className="py-2.5 px-3 font-mono text-irctc-blue">Final</td>
                <td className="py-2.5 px-3 text-irctc-blue">
                  PREDICTED ETA (PEA)
                  <div className="text-[10px] font-mono text-irctc-blue/80 font-normal">PEA = Scheduled_Arrival + ND</div>
                </td>
                <td className="py-2.5 px-3 text-irctc-blue font-medium">
                  Working Timetable Arrival ({result.math_resolution.ScheduledDestinationArrival} IST) + Net Delay (
                  {result.math_resolution.NetDelay.toFixed(1)} mins)
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-extrabold text-sm text-irctc-blue">
                  {result.math_resolution.Predicted_ETA}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Control Room Summary Callout */}
      <div className="bg-irctc-blue-light/50 border-l-4 border-l-irctc-blue p-3.5 rounded-r-lg text-xs text-slate-700 leading-relaxed">
        <strong>Dispatch Simulation Summary:</strong> Train <strong>{result.train_no}</strong> ({result.train_name}) operates
        with a gross disturbance of <strong>{result.math_resolution.grossDelay.toFixed(1)} mins</strong>. Timetable
        slack absorbs <strong>{result.math_resolution.Absorbed_by_EA.toFixed(1)} mins</strong>, leaving a net arrival delay
        of <strong>{result.math_resolution.NetDelay.toFixed(1)} minutes</strong>.{' '}
        {isLate
          ? 'Notice: Arrival exceeds the 5-minute punctuality tolerance threshold. Dispatchers should prepare reception loop priority.'
          : 'Status: Train operates within strict punctuality bounds (≤ 5.0 mins). Normal corridor paths maintained.'}
      </div>
    </div>
  );
};
