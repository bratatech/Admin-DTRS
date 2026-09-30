'use client';

import React, { useState } from 'react';
import {
  PlusCircle,
  Trash2,
  AlertTriangle,
  Route,
  MapPin,
  Clock,
  FastForward,
  CloudSun,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { RouteSegment, StationCircumstance, TrainInfo } from '@/types';

interface MultiSegmentCircumstancesProps {
  trainInfo?: TrainInfo | null;
  segments?: RouteSegment[];
  multiStationInjections: StationCircumstance[];
  onUpdateMultiStationInjections: (injections: StationCircumstance[]) => void;
  isFrozen?: boolean;
  lockReason?: string;
}

const DISRUPTION_REASONS = [
  'Signal Clearance / Precedence Wait',
  'Temporary Speed Restriction (TSR) Caution Order',
  'Single-Track Crossing Precedence Hold',
  'Track & OHE Electrification Maintenance',
  'Alarm Chain Pulling (ACP) Event',
  'Locomotive Traction Tractive Drag',
];

export const MultiSegmentCircumstances: React.FC<MultiSegmentCircumstancesProps> = ({
  trainInfo,
  segments = [],
  multiStationInjections = [],
  onUpdateMultiStationInjections,
  isFrozen = false,
  lockReason,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const availableSegments = (trainInfo?.segments && trainInfo.segments.length > 0)
    ? trainInfo.segments
    : (segments && segments.length > 0 ? segments : []);

  const routeStations = React.useMemo(() => {
    const list: { code: string; name: string }[] = [];
    const seen = new Set<string>();

    for (const seg of availableSegments) {
      if (seg.from_station_code && !seen.has(seg.from_station_code)) {
        seen.add(seg.from_station_code);
        list.push({ code: seg.from_station_code, name: seg.from_station_name || seg.from_station_code });
      }
      if (seg.to_station_code && !seen.has(seg.to_station_code)) {
        seen.add(seg.to_station_code);
        list.push({ code: seg.to_station_code, name: seg.to_station_name || seg.to_station_code });
      }
    }
    return list;
  }, [availableSegments]);

  // Add a new segment circumstance card
  const handleAddSegment = () => {
    if (isFrozen) return;

    // Pick an unused segment if possible, else default to availableSegments[0]
    const usedSegs = new Set(multiStationInjections.map((inj) => inj.segment_number));
    const nextSeg = availableSegments.find((s) => !usedSegs.has(s.treta_segment_number)) || availableSegments[0];

    const stnCode = nextSeg?.to_station_code || nextSeg?.from_station_code || routeStations[0]?.code || 'NDLS';
    const stnName = nextSeg?.to_station_name || nextSeg?.from_station_name || routeStations[0]?.name || stnCode;
    const segNum = nextSeg?.treta_segment_number || `TS-${stnCode}`;
    const segLabel = nextSeg ? `${nextSeg.from_station_name || nextSeg.from_station_code} → ${nextSeg.to_station_name || nextSeg.to_station_code}` : `Station ${stnCode}`;

    const newCircumstance: StationCircumstance = {
      station_code: stnCode,
      station_name: stnName,
      segment_number: segNum,
      segment_label: segLabel,
      weather: 'Clear',
      tsr_level: 'None',
      treta_block_occupancy: 'Track_Clear',
      crossing_conflict: 'Double_Quad_Track',
      alarm_chain_pulling: '0_Events',
      engine_failure: 'Nominal',
      terminal_platform_hold: 'Platform_Available',
      crew_duty_status: 'Duty_Valid',
      section_delay_mins: 15,
      speedup_recovery_mins: 0,
      reason: DISRUPTION_REASONS[0],
    };

    const updated = [...multiStationInjections, newCircumstance];
    onUpdateMultiStationInjections(updated);
    setExpandedIndex(updated.length - 1);
  };

  // Remove a specific segment circumstance
  const handleRemoveSegment = (indexToRemove: number) => {
    if (isFrozen) return;
    const updated = multiStationInjections.filter((_, idx) => idx !== indexToRemove);
    onUpdateMultiStationInjections(updated);
    if (expandedIndex === indexToRemove) {
      setExpandedIndex(updated.length > 0 ? 0 : null);
    } else if (expandedIndex !== null && expandedIndex > indexToRemove) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  // Update a specific field for a segment circumstance
  const handleUpdateField = (index: number, field: keyof StationCircumstance, value: any) => {
    if (isFrozen) return;
    const updated = [...multiStationInjections];
    const current = { ...updated[index], [field]: value };

    // If segment changed, auto-update station code and label
    if (field === 'segment_number') {
      const foundSeg = availableSegments.find((s) => s.treta_segment_number === value);
      if (foundSeg) {
        current.station_code = foundSeg.to_station_code || foundSeg.from_station_code;
        current.station_name = foundSeg.to_station_name || foundSeg.from_station_name;
        current.segment_label = `${foundSeg.from_station_name || foundSeg.from_station_code} → ${foundSeg.to_station_name || foundSeg.to_station_code}`;
      }
    }

    updated[index] = current;
    onUpdateMultiStationInjections(updated);
  };

  // Calculate total shock for a circumstance item
  const calculateItemShock = (c: StationCircumstance) => {
    let s = Number(c.section_delay_mins || 0);
    if (c.weather === 'Fog') s += 35;
    else if (c.weather === 'Heavy_Rain') s += 12;
    else if (c.weather === 'Thunderstorm') s += 18;
    else if (c.weather === 'Snow') s += 22;

    if (c.tsr_level === 'Minor') s += 8;
    else if (c.tsr_level === 'Major') s += 24;

    if (c.treta_block_occupancy === 'Preceding_Delayed_Minor') s += 5;
    else if (c.treta_block_occupancy === 'Preceding_Delayed_Moderate') s += 10;
    else if (c.treta_block_occupancy === 'Preceding_Delayed_Severe') s += 20;

    if (c.crossing_conflict === 'Minor_Crossing_Wait') s += 8;
    else if (c.crossing_conflict === 'Major_Crossing_Wait') s += 22;

    if (c.alarm_chain_pulling === '1_Event') s += 15;
    else if (c.alarm_chain_pulling === '2_Events') s += 30;

    if (c.engine_failure === 'Failure') s += 15;
    if (c.terminal_platform_hold === 'Outer_Holding') s += 15;
    if (c.crew_duty_status === 'Duty_Exceeded') s += 45;

    return s;
  };

  return (
    <div className="irctc-card p-4 sm:p-5 mb-5 border-l-4 border-l-indigo-600 bg-white">
      {/* Header with Title & Add More Button */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-indigo-700" />
            <h3 className="text-sm sm:text-base font-extrabold text-irctc-blue">
              Additional Segment Disturbance Circumstances
            </h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-200">
              Multi-Segment Dynamic Shocks
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Add full disturbance circumstances (as defined in 2. Disturbance) for multiple route segments with independent inject stations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddSegment}
          disabled={isFrozen}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs rounded-md shadow-xs active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Add More</span>
        </button>
      </div>

      {isFrozen && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span><strong>Locked by Live Telemetry:</strong> Controls frozen to preserve real-world GPS tracking.</span>
        </div>
      )}

      {/* Empty State */}
      {multiStationInjections.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50 space-y-2">
          <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-600">
            No additional segment circumstances configured.
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Click <strong>+ Add More</strong> above to repeat the addition of operational disturbance circumstances for a different segment having a different inject station.
          </p>
          <button
            type="button"
            onClick={handleAddSegment}
            disabled={isFrozen}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-md shadow-2xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add More Segment Circumstances</span>
          </button>
        </div>
      ) : (
        /* List of Injected Segment Circumstances */
        <div className="space-y-3">
          {multiStationInjections.map((circ, idx) => {
            const isExpanded = expandedIndex === idx;
            const itemShock = calculateItemShock(circ);

            return (
              <div
                key={`${circ.station_code}-${idx}`}
                className={`border rounded-lg transition-all ${
                  isExpanded ? 'border-indigo-400 bg-indigo-50/20 shadow-xs' : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                {/* Collapsed Header Bar */}
                <div className="p-3 flex flex-wrap items-center justify-between gap-2">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1 min-w-[220px]"
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">
                          {circ.segment_label || `Station ${circ.station_code}`}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          {circ.station_code}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-sm">
                        {circ.reason || 'Operational Disturbance'} • Shock: +{itemShock}m {circ.speedup_recovery_mins ? `• Speedup: -${circ.speedup_recovery_mins}m` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      +{itemShock}m
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveSegment(idx)}
                      disabled={isFrozen}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-40 cursor-pointer"
                      title="Remove this segment circumstance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      className="p-1 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Full Circumstance Form (matching 2. Disturbance) */}
                {isExpanded && (
                  <div className="p-3.5 pt-1 border-t border-indigo-100 bg-white rounded-b-lg space-y-3">
                    {/* Top Segment & Inject Station Dropdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Target Route Segment (Spatial Hop):
                        </label>
                        <select
                          className="irctc-select w-full text-xs font-semibold"
                          value={circ.segment_number || ''}
                          onChange={(e) => handleUpdateField(idx, 'segment_number', e.target.value)}
                          disabled={isFrozen}
                        >
                          {availableSegments.map((seg) => (
                            <option key={seg.treta_segment_number} value={seg.treta_segment_number}>
                              [{seg.treta_segment_number?.replace(/^TRETA/i, 'DTRS')}] {seg.from_station_name} → {seg.to_station_name} ({seg.segment_distance_km} km)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Inject Station at this Segment:
                        </label>
                        <select
                          className="irctc-select w-full text-xs font-semibold"
                          value={circ.station_code}
                          onChange={(e) => {
                            const foundStn = routeStations.find((s) => s.code === e.target.value);
                            handleUpdateField(idx, 'station_code', e.target.value);
                            if (foundStn) {
                              handleUpdateField(idx, 'station_name', foundStn.name);
                            }
                          }}
                          disabled={isFrozen}
                        >
                          {routeStations.map((stn) => (
                            <option key={stn.code} value={stn.code}>
                              {stn.code} ({stn.name})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Section Delay & Reason */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Injected Delay (mins):
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="300"
                            step="5"
                            className="w-24 px-2 py-1 text-xs font-mono font-bold border rounded border-slate-300 bg-white"
                            value={circ.section_delay_mins || 0}
                            onChange={(e) => handleUpdateField(idx, 'section_delay_mins', Number(e.target.value))}
                            disabled={isFrozen}
                          />
                          <span className="text-slate-500 text-xs">mins</span>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Operational Disruption Reason:
                        </label>
                        <select
                          className="irctc-select w-full text-xs font-semibold"
                          value={circ.reason || DISRUPTION_REASONS[0]}
                          onChange={(e) => handleUpdateField(idx, 'reason', e.target.value)}
                          disabled={isFrozen}
                        >
                          {DISRUPTION_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Full Grid of Circumstances from 2. Disturbance */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                      {/* Weather */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Weather Condition:
                        </label>
                        <select
                          className="irctc-select w-full text-xs"
                          value={circ.weather || 'Clear'}
                          onChange={(e) => handleUpdateField(idx, 'weather', e.target.value)}
                          disabled={isFrozen}
                        >
                          <option value="Clear">Clear (±0m)</option>
                          <option value="Fog">Fog Crawl (+35m)</option>
                          <option value="Heavy_Rain">Monsoon Rain (+12m)</option>
                          <option value="Thunderstorm">Thunderstorm (+18m)</option>
                          <option value="Snow">Snow Freeze (+22m)</option>
                        </select>
                      </div>

                      {/* TSR */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Speed Restriction (TSR):
                        </label>
                        <select
                          className="irctc-select w-full text-xs"
                          value={circ.tsr_level || 'None'}
                          onChange={(e) => handleUpdateField(idx, 'tsr_level', e.target.value)}
                          disabled={isFrozen}
                        >
                          <option value="None">None (±0m)</option>
                          <option value="Minor">Minor Caution (+8m)</option>
                          <option value="Major">Major Block (+24m)</option>
                        </select>
                      </div>

                      {/* Headway / Block Occupancy */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Block Occupancy:
                        </label>
                        <select
                          className="irctc-select w-full text-xs"
                          value={circ.treta_block_occupancy || 'Track_Clear'}
                          onChange={(e) => handleUpdateField(idx, 'treta_block_occupancy', e.target.value)}
                          disabled={isFrozen}
                        >
                          <option value="Track_Clear">Track Clear (±0m)</option>
                          <option value="Preceding_Delayed_Minor">Preceding Minor (+5m)</option>
                          <option value="Preceding_Delayed_Moderate">Preceding Moderate (+10m)</option>
                          <option value="Preceding_Delayed_Severe">Preceding Severe (+20m)</option>
                        </select>
                      </div>

                      {/* Single Track Crossing */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Crossing Conflict:
                        </label>
                        <select
                          className="irctc-select w-full text-xs"
                          value={circ.crossing_conflict || 'Double_Quad_Track'}
                          onChange={(e) => handleUpdateField(idx, 'crossing_conflict', e.target.value)}
                          disabled={isFrozen}
                        >
                          <option value="Double_Quad_Track">Clear Priority (±0m)</option>
                          <option value="Minor_Crossing_Wait">Loop Wait (+8m)</option>
                          <option value="Major_Crossing_Wait">Main Precedence (+22m)</option>
                        </select>
                      </div>

                      {/* Alarm Chain Pulling */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Alarm Chain Pulling (ACP):
                        </label>
                        <select
                          className="irctc-select w-full text-xs"
                          value={circ.alarm_chain_pulling || '0_Events'}
                          onChange={(e) => handleUpdateField(idx, 'alarm_chain_pulling', e.target.value)}
                          disabled={isFrozen}
                        >
                          <option value="0_Events">0 Events (±0m)</option>
                          <option value="1_Event">1 Event (+15m)</option>
                          <option value="2_Events">2 Events (+30m)</option>
                        </select>
                      </div>

                      {/* Engine Traction */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Engine / Traction Snag:
                        </label>
                        <select
                          className="irctc-select w-full text-xs"
                          value={circ.engine_failure || 'Nominal'}
                          onChange={(e) => handleUpdateField(idx, 'engine_failure', e.target.value)}
                          disabled={isFrozen}
                        >
                          <option value="Nominal">Nominal Power (±0m)</option>
                          <option value="Failure">Traction Snag (+15m)</option>
                        </select>
                      </div>

                      {/* Terminal Platform Hold */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Platform Availability:
                        </label>
                        <select
                          className="irctc-select w-full text-xs"
                          value={circ.terminal_platform_hold || 'Platform_Available'}
                          onChange={(e) => handleUpdateField(idx, 'terminal_platform_hold', e.target.value)}
                          disabled={isFrozen}
                        >
                          <option value="Platform_Available">Platform Clear (±0m)</option>
                          <option value="Outer_Holding">Outer Hold (+15m)</option>
                        </select>
                      </div>

                      {/* Crew Duty */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Crew Duty Status:
                        </label>
                        <select
                          className="irctc-select w-full text-xs"
                          value={circ.crew_duty_status || 'Duty_Valid'}
                          onChange={(e) => handleUpdateField(idx, 'crew_duty_status', e.target.value)}
                          disabled={isFrozen}
                        >
                          <option value="Duty_Valid">Duty Valid &lt;8h (±0m)</option>
                          <option value="Duty_Exceeded">Duty Exceeded &gt;=8h (+45m)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
