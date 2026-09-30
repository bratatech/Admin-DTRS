'use client';

import React from 'react';
import { Clock, TrendingUp, ShieldCheck, AlertOctagon, CheckCircle2, ArrowRight, Gauge, FileText, Database, AlertTriangle, MapPin, Zap, FastForward, GitBranch } from 'lucide-react';
import { PredictionResult } from '@/types';

interface ResultsDashboardProps {
  result: PredictionResult | null;
  isLoading: boolean;
}

const toFixedVal = (val: any, decimals = 1): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
  return isNaN(num) ? '0.0' : num.toFixed(decimals);
};

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
              EVALUATING HOP: {seg.treta_segment_number?.replace(/^TRETA/i, 'DTRS')}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {/* 1. Primary Delay */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Primary Delay (PD)
          </div>
          <div className="text-lg font-mono font-extrabold text-rose-600">
            +{toFixedVal(result.primary_breakdown?.PrimaryDelay)}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {result.d_inherited_cascade && result.d_inherited_cascade > 0
              ? `D_inherited (+${toFixedVal(result.d_inherited_cascade)}m) + DW + DTS + DCP + DE`
              : 'DW + DTS + DCP + DE'}
          </div>
        </div>

        {/* 2. Cascade Shocks */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Cascade Shocks (CD)
          </div>
          <div className="text-lg font-mono font-extrabold text-amber-600">
            +{toFixedVal(result.cascade_breakdown?.CascadeDelay)}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">DH + DCR + DPL + DCW</div>
        </div>

        {/* 3. Gross Delay */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Gross Delay (GD)
          </div>
          <div className="text-lg font-mono font-extrabold text-slate-800">
            {toFixedVal(result.math_resolution?.grossDelay)}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">PD + CD Total Shock</div>
        </div>

        {/* 4. Max Speed Cover-up */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
            <FastForward className="w-3.5 h-3.5 text-emerald-600" />
            <span>Max Speed Cover-up</span>
          </div>
          <div className="text-lg font-mono font-extrabold text-emerald-700">
            {(result.math_resolution?.speedup_recovered_mins ?? 0) > 0
              ? `-${toFixedVal(result.math_resolution?.speedup_recovered_mins)}m`
              : '0.0m'}
          </div>
          <div className="text-[10px] text-emerald-600/90 mt-0.5">MPS Section Recovery</div>
        </div>

        {/* 5. Buffer Absorbed */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
            Buffer Slack (MEA)
          </div>
          <div className="text-lg font-mono font-extrabold text-emerald-700">
            &minus;{toFixedVal(result.math_resolution?.Absorbed_by_EA)}m
          </div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">Absorbed by Slack</div>
        </div>

        {/* 6. Final Net Delay */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Final Net Delay (ND)
          </div>
          <div
            className={`text-lg font-mono font-extrabold ${
              (Number(result.math_resolution?.NetDelay) || 0) > 5.0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {toFixedVal(result.math_resolution?.NetDelay)}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">max(0, GD &minus; MEA)</div>
        </div>

        {/* 7. Predicted ETA */}
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
            Step-by-Step 5-Stage Mathematical Derivation
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
                  <span className="font-bold text-slate-900">Primary Delay</span>
                  <div className="text-[10px] font-mono text-slate-500">
                    {result.d_inherited_cascade && result.d_inherited_cascade > 0
                      ? 'PD = D_inherited + DW + DTS + DCP + DE'
                      : 'PD = DW + DTS + DCP + DE'}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  {result.d_inherited_cascade && result.d_inherited_cascade > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 mr-1.5 mb-1 rounded bg-amber-100 text-amber-950 font-bold text-[11px] border border-amber-300 shadow-2xs">
                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                      <span>Inherited Cascaded: +{toFixedVal(result.d_inherited_cascade)}m</span>
                      <span className="text-[10px] text-amber-800 font-normal">
                        ({result.db_comparison?.conflict_type || 'WIN_SIMULATION.db'})
                      </span>
                    </span>
                  )}
                  Weather: {result.applied_cases.weather} (+{toFixedVal(result.primary_breakdown.d_weather)}m) + TSR:{' '}
                  {result.applied_cases.tsr_level} (+{toFixedVal(result.primary_breakdown.d_tsr)}m) + ACP:{' '}
                  {result.applied_cases.alarm_chain_pulling} (+{toFixedVal(result.primary_breakdown.d_chain_pulling)}m) +
                  Engine: {result.applied_cases.engine_failure} (+{toFixedVal(result.primary_breakdown.d_engine_failure)}
                  m)
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                  +{toFixedVal(result.primary_breakdown.PrimaryDelay)} mins
                </td>
              </tr>

              {/* Stage 2 */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">Stage 2</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-slate-900">Cascading Shocks</span>
                  <div className="text-[10px] font-mono text-slate-500">CD = DH + DCR + DPL + DCW</div>
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  Headway (DH): {toFixedVal(result.cascade_breakdown.d_headway)}m + Crossing (DCR):{' '}
                  {toFixedVal(result.cascade_breakdown.d_crossing)}m + Platform (DPL):{' '}
                  {toFixedVal(result.cascade_breakdown.d_platform_hold)}m + Crew (DCW):{' '}
                  {toFixedVal(result.cascade_breakdown.d_crew)}m
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                  +{toFixedVal(result.cascade_breakdown.CascadeDelay)} mins
                </td>
              </tr>

              {/* Stage 3 */}
              <tr className="bg-slate-50/60 font-semibold">
                <td className="py-2.5 px-3 font-mono text-slate-700">Stage 3</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-slate-900">Gross Disturbance</span>
                  <div className="text-[10px] font-mono text-slate-500">GD = PD + CD</div>
                </td>
                <td className="py-2.5 px-3 text-slate-600 font-normal">
                  Total combined disturbance: {toFixedVal(result.math_resolution?.grossDelay)}m
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                  {toFixedVal(result.math_resolution?.grossDelay)} mins
                </td>
              </tr>

              {/* Stage 4 */}
              <tr className="bg-emerald-50/50 hover:bg-emerald-50/80">
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">Stage 4</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-emerald-900">Buffer Absorbed</span>
                  <div className="text-[10px] font-mono text-emerald-700">MEA = min(GD &times; RR, 0.20 &times; EA)</div>
                </td>
                <td className="py-2.5 px-3 text-emerald-800">
                  Allotted Timetable Slack: {toFixedVal(result.EA_allotted_mins)} mins &bull; Train Tier Recovery Rate
                  Applied
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                  &minus;{toFixedVal(result.math_resolution?.Absorbed_by_EA)} mins
                </td>
              </tr>

              {/* Stage 5 */}
              <tr className="bg-slate-100 font-semibold">
                <td className="py-2.5 px-3 font-mono text-slate-800">Stage 5</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-slate-900">Net Destination Delay </span>
                  <div className="text-[10px] font-mono text-slate-500">ND = max(0, GD &minus; MEA)</div>
                </td>
                <td className="py-2.5 px-3 text-slate-700 font-normal">
                  Final unrecoverable delay arriving at destination station after timetable buffer absorption
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  {toFixedVal(result.math_resolution?.NetDelay)} mins
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
                  {toFixedVal(result.math_resolution?.NetDelay)} mins)
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-extrabold text-sm text-irctc-blue">
                  {result.math_resolution.Predicted_ETA}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Route-Wide Delay Spread & Station Arrival ETAs */}
      {result.ahead_stations && result.ahead_stations.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-irctc-orange" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                Zone-Wise Delay Propagation, Speed-Up Coverup &amp; Station ETAs
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Origin: <strong className="text-slate-800">{result.delay_origin_station || 'Current Hop'}</strong> &bull; Progressive Slack (EA) &amp; Max Speed Recovery
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="py-2 px-3 font-semibold w-10 text-center">#</th>
                  <th className="py-2 px-3 font-semibold w-48">Station Stop</th>
                  <th className="py-2 px-3 font-semibold w-20">Distance</th>
                  <th className="py-2 px-3 font-semibold w-24">Scheduled</th>
                  <th className="py-2 px-3 font-semibold w-28 text-amber-300">Delay Before Arr</th>
                  <th className="py-2 px-3 font-semibold w-24 text-emerald-300">Speed Coverup</th>
                  <th className="py-2 px-3 font-semibold w-24 text-teal-300">EA Absorbed</th>
                  <th className="py-2 px-3 font-semibold w-24 text-rose-300">Net Delay</th>
                  <th className="py-2 px-3 font-semibold w-32 text-amber-200">Predicted Clock ETA</th>
                  <th className="py-2 px-3 font-semibold text-right">Dispatch &amp; Local Circumstances</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {result.ahead_stations.map((stn, idx) => {
                  const isLateStop = stn.status === 'LATE' || (!stn.delay_absorbed && stn.net_delay_mins > 5.0);
                  const delayBefore = stn.incoming_delay_mins !== undefined ? stn.incoming_delay_mins : stn.gross_delay_mins;
                  const speedupRecovered = stn.speedup_recovered_mins ?? 0;
                  return (
                    <tr
                      key={idx}
                      className={stn.is_origin ? 'bg-amber-50/70 font-semibold' : 'hover:bg-slate-50/80'}
                    >
                      <td className="py-2 px-3 font-mono text-center text-slate-400">
                        {stn.seq}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-irctc-blue">{stn.station_code}</span>
                          <span className="text-slate-700 font-medium truncate max-w-[150px]">{stn.station_name}</span>
                          {stn.is_origin && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded border border-amber-300">
                              SHOCK ORIGIN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {stn.dist_km.toFixed(1)} km
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {stn.scheduled_arr} IST
                      </td>
                      <td className="py-2 px-3 font-mono font-bold">
                        {delayBefore > 0 ? (
                          <span className="text-amber-700">+{delayBefore.toFixed(1)}m</span>
                        ) : (
                          <span className="text-slate-400">0.0m</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium">
                        {speedupRecovered > 0 ? (
                          <span className="text-emerald-700 font-bold">-{speedupRecovered.toFixed(1)}m</span>
                        ) : (
                          <span className="text-slate-400">0.0m</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-emerald-700">
                        {stn.absorbed_ea_mins > 0 ? `-${stn.absorbed_ea_mins.toFixed(1)}m` : '0.0m'}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold">
                        {stn.net_delay_mins > 0 ? (
                          <span className="text-rose-600">+{stn.net_delay_mins.toFixed(1)}m</span>
                        ) : (
                          <span className="text-emerald-700">0.0m</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {stn.predicted_arrival}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                              isLateStop
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isLateStop ? `+${stn.net_delay_mins.toFixed(0)}m LATE` : 'ON TIME'}
                          </span>
                          {stn.note && stn.note !== 'On Time' && (
                            <span className="text-[10px] font-medium text-slate-500 max-w-[160px] truncate" title={stn.note}>
                              {stn.note}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sequential Downstream Train Cascading Chain */}
      {result.cascaded_delays?.cascading_chain && result.cascaded_delays.cascading_chain.length > 0 ? (
        <div className="mb-6 bg-rose-50/70 border-2 border-rose-200 rounded-lg p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-rose-200">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                Sequential Downstream Train Cascading Chain &bull; Propagated Delay Progression
              </h3>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
              CASCADING PROPAGATION ACTIVE ({result.cascaded_delays.cascading_chain.length} TRAINS AFFECTED)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.cascaded_delays.cascading_chain.map((node, nIdx) => (
              <div key={nIdx} className="bg-white p-3 rounded-lg border border-rose-200/90 shadow-2xs relative">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Step {node.order}: {node.role}
                  </span>
                  <span className="font-mono text-xs font-black text-rose-600">
                    +{node.delay_mins.toFixed(1)}m
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-irctc-blue">
                  {node.train_no} &bull; <span className="font-sans font-semibold text-slate-800">{node.train_name}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Conflict: <strong className="text-slate-700">{node.impact}</strong></span>
                  <span className="text-rose-700 font-bold">{node.propagated_eta_impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <strong>Non-Cascading Operational Window:</strong> Primary disturbance is absorbed by timetable buffer slack (ND &le; 0 mins). No downstream or subsequent trains are affected on this corridor.
          </div>
        </div>
      )}

      {/* Operational Timetable Baseline & Simulation Sandbox Audit */}
      {result.db_comparison && (
        <div className="mb-6 bg-slate-50/80 border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-irctc-blue" />
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                Operational Timetable Baseline &bull; Production Baseline vs Simulation Sandbox Audit
              </h3>
            </div>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                result.db_comparison.has_inherited_delay
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {result.db_comparison.has_inherited_delay
                ? 'INHERITED CASCADED DELAY ACCOUNTED IN PRIMARY STAGE 1'
                : 'PRODUCTION TIMETABLE BASELINE MATCHED'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Production Baseline Row */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between font-bold text-slate-700 pb-1.5 mb-1.5 border-b border-slate-100">
                <span>Production Timetable Matrix (Baseline)</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  Untouched Baseline
                </span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-slate-600">
                <div>Train: <strong>{result.db_comparison.win_db_master.train_no}</strong> &bull; Hop: <strong>{result.db_comparison.win_db_master.segment || 'Full Route'}</strong></div>
                <div>Baseline Delay: <strong className="text-emerald-700">{(result.db_comparison.win_db_master.baseline_delay_mins ?? 0).toFixed(1)} mins</strong></div>
                <div>Timetable Status: <strong className="text-emerald-800 uppercase">{result.db_comparison.win_db_master.arrival_status}</strong></div>
              </div>
            </div>

            {/* Simulation Sandbox Row */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between font-bold text-slate-700 pb-1.5 mb-1.5 border-b border-slate-100">
                <span>Simulation Sandbox (Working Copy)</span>
                <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                  Isolated Sandbox
                </span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-slate-600">
                <div>Train: <strong>{result.db_comparison.win_sim_db.train_no}</strong> &bull; Hop: <strong>{result.db_comparison.win_sim_db.segment || 'Full Route'}</strong></div>
                <div>
                  Current Simulated Delay:{' '}
                  <strong className={(result.db_comparison.win_sim_db.sim_delay_mins ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    +{(result.db_comparison.win_sim_db.sim_delay_mins ?? 0).toFixed(1)} mins
                  </strong>
                </div>
                <div>
                  Simulation Status:{' '}
                  <strong className="text-slate-800 uppercase">{result.db_comparison.win_sim_db.arrival_status}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 p-2.5 bg-sky-50/80 rounded border border-sky-200 text-xs text-sky-950 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
            <div>
              <strong>Audit Status:</strong> {result.db_comparison.source_explanation}. Rows for Train <strong>#{result.train_no}</strong> cross-verified. When inherited delays exist, the engine incorporates them into <strong>Stage 1 Primary Delay ($PD$)</strong> so no operational cascade shock is lost.
            </div>
          </div>
        </div>
      )}

      {/* Control Room Summary Callout */}
      <div className="bg-irctc-blue-light/50 border-l-4 border-l-irctc-blue p-3.5 rounded-r-lg text-xs text-slate-700 leading-relaxed">
        <strong>Dispatch Simulation Summary:</strong> Train <strong>{result.train_no}</strong> ({result.train_name}) operates
        with a gross disturbance of <strong>{toFixedVal(result.math_resolution?.grossDelay)} mins</strong>. Timetable
        slack absorbs <strong>{toFixedVal(result.math_resolution?.Absorbed_by_EA)} mins</strong>, leaving a net arrival delay
        of <strong>{toFixedVal(result.math_resolution?.NetDelay)} minutes</strong>.{' '}
        {isLate
          ? 'Notice: Arrival exceeds the 5-minute punctuality tolerance threshold. Dispatchers should prepare reception loop priority.'
          : 'Status: Train operates within strict punctuality bounds (≤ 5.0 mins). Normal corridor paths maintained.'}
      </div>
    </div>
  );
};
