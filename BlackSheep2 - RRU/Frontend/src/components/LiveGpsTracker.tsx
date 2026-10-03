'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Navigation,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  Gauge,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sliders,
  AlertCircle,
  Train,
  Network,
  FastForward,
  PlusCircle,
  X,
  Key,
} from 'lucide-react';
import {
  LiveMatchResponse,
  TrainInfo,
  RouteSegment,
  StationCircumstance,
} from '@/types';

interface LiveGpsTrackerProps {
  selectedTrainNo: string;
  onTrackTrain: (trainNo: string, sectionDelay?: number, customSegment?: string, speedupRecovery?: number, multiInjections?: StationCircumstance[]) => void;
  liveGpsData: LiveMatchResponse | null;
  isLoading: boolean;
  isFrozen: boolean;
  onToggleFreeze: () => void;
  trainInfo?: TrainInfo | null;
  segments?: RouteSegment[];
  selectedSegment?: string;
  onChangeSegment?: (seg: string) => void;
  sectionDelayMins?: number;
  onUpdateSectionDelay?: (mins: number, segNo?: string) => void;
  speedupRecoveryMins?: number;
  onUpdateSpeedupRecovery?: (mins: number) => void;
  multiStationInjections?: StationCircumstance[];
  onUpdateMultiStationInjections?: (injections: StationCircumstance[]) => void;
  countdownSeconds?: number | null;
  onAdvanceToDisturbances?: () => void;
  onCancelCountdown?: () => void;
}

const PRESET_TRAINS = [
  { no: '12919', name: '12919 Malwa Express' },
  { no: '12001', name: '12001 NDLS Shatabdi' },
  { no: '12952', name: '12952 Tejas Rajdhani' },
  { no: '12626', name: '12626 Kerala Express' },
];

const DISRUPTION_REASONS = [
  'Signal Clearance / Precedence Wait',
  'Temporary Speed Restriction (TSR) Caution Order',
  'Single-Track Crossing Precedence Hold',
  'Track & OHE Electrification Maintenance',
  'Alarm Chain Pulling (ACP) Event',
  'Locomotive Traction Tractive Drag',
];

const CIRCUMSTANCE_TYPES = [
  { type: 'WEATHER', label: 'Weather Shock (Fog / Monsoonal Rain)', defaultMins: 15 },
  { type: 'TSR', label: 'TSR Caution Order (Speed Restriction)', defaultMins: 10 },
  { type: 'ACP', label: 'Alarm Chain Pulling (Passenger ACP)', defaultMins: 10 },
  { type: 'ENGINE', label: 'Engine Traction Drag / Loco Snag', defaultMins: 20 },
  { type: 'HOLD', label: 'Station Platform / Precedence Hold', defaultMins: 15 },
  { type: 'SPEEDUP', label: 'MPS Section Speed-Up Time Recovery', defaultMins: 10 },
];

export const LiveGpsTracker: React.FC<LiveGpsTrackerProps> = ({
  selectedTrainNo,
  onTrackTrain,
  liveGpsData,
  isLoading,
  isFrozen,
  onToggleFreeze,
  trainInfo,
  segments = [],
  selectedSegment = '',
  onChangeSegment,
  sectionDelayMins = 0,
  onUpdateSectionDelay,
  speedupRecoveryMins = 0,
  onUpdateSpeedupRecovery,
  multiStationInjections = [],
  onUpdateMultiStationInjections,
  countdownSeconds,
  onAdvanceToDisturbances,
  onCancelCountdown,
}) => {
  const [inputTrainNo, setInputTrainNo] = useState<string>(selectedTrainNo || '12919');
  const [localSectionDelay, setLocalSectionDelay] = useState<number>(sectionDelayMins || 0);
  const [localSelectedSeg, setLocalSelectedSeg] = useState<string>(selectedSegment || '');
  const [selectedReason, setSelectedReason] = useState<string>(DISRUPTION_REASONS[0]);

  // Multi-station injection state
  const [targetStationCode, setTargetStationCode] = useState<string>('');
  const [selectedCircumstance, setSelectedCircumstance] = useState<string>('WEATHER');
  const [injectionMins, setInjectionMins] = useState<number>(15);
  const [localSpeedup, setLocalSpeedup] = useState<number>(speedupRecoveryMins || 0);

  // API Key management state
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [activeKeyPreview, setActiveKeyPreview] = useState<string>('');
  const [isKeyConfiguredState, setIsKeyConfiguredState] = useState<boolean>(false);
  const [keySourceState, setKeySourceState] = useState<string>('');
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [saveStatusMsg, setSaveStatusMsg] = useState<string>('');

  const refreshKeyConfig = async () => {
    try {
      const storedKey = typeof window !== 'undefined'
        ? (localStorage.getItem('LIVE_API_KEY') || localStorage.getItem('RAILRADAR_API_KEY') || '')
        : '';
      const url = storedKey ? `/api/railradar/config?api_key=${encodeURIComponent(storedKey)}` : '/api/railradar/config';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setIsKeyConfiguredState(Boolean(data.api_key_configured));
        setActiveKeyPreview(data.api_key_preview || (storedKey ? `${storedKey.slice(0, 4)}...${storedKey.slice(-4)}` : ''));
        setKeySourceState(data.api_key_source || (storedKey ? 'localStorage' : 'unconfigured'));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshKeyConfig();
  }, [liveGpsData]);

  const handleSaveApiKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = apiKeyInput.trim();
    if (!clean) return;
    setIsSavingKey(true);
    setSaveStatusMsg('');
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('LIVE_API_KEY', clean);
        localStorage.setItem('RAILRADAR_API_KEY', clean);
      }
      const res = await fetch('/api/railradar/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: clean })
      });
      if (res.ok) {
        const data = await res.json();
        setIsKeyConfiguredState(Boolean(data.api_key_configured));
        setActiveKeyPreview(data.api_key_preview || `${clean.slice(0, 4)}...${clean.slice(-4)}`);
        setKeySourceState(data.api_key_source || 'LIVE_API_KEY');
        setSaveStatusMsg('✅ API key verified & saved! Re-querying live GPS telemetry...');
        setTimeout(() => {
          setApiKeyModalOpen(false);
          setSaveStatusMsg('');
          onTrackTrain(inputTrainNo, localSectionDelay, localSelectedSeg, localSpeedup, multiStationInjections);
        }, 900);
      } else {
        setSaveStatusMsg('Key saved to local browser cache. Re-querying...');
        setTimeout(() => {
          setApiKeyModalOpen(false);
          setSaveStatusMsg('');
          onTrackTrain(inputTrainNo, localSectionDelay, localSelectedSeg, localSpeedup, multiStationInjections);
        }, 900);
      }
    } catch {
      setSaveStatusMsg('Saved locally to browser.');
      setTimeout(() => {
        setApiKeyModalOpen(false);
        setSaveStatusMsg('');
        onTrackTrain(inputTrainNo, localSectionDelay, localSelectedSeg, localSpeedup, multiStationInjections);
      }, 900);
    } finally {
      setIsSavingKey(false);
    }
  };

  useEffect(() => {
    if (selectedTrainNo) {
      setInputTrainNo(selectedTrainNo);
    }
  }, [selectedTrainNo]);

  useEffect(() => {
    if (typeof sectionDelayMins === 'number') {
      setLocalSectionDelay(sectionDelayMins);
    }
  }, [sectionDelayMins]);

  useEffect(() => {
    if (typeof speedupRecoveryMins === 'number') {
      setLocalSpeedup(speedupRecoveryMins);
    }
  }, [speedupRecoveryMins]);

  useEffect(() => {
    if (selectedSegment) {
      setLocalSelectedSeg(selectedSegment);
    }
  }, [selectedSegment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputTrainNo.trim()) {
      onTrackTrain(inputTrainNo.trim(), localSectionDelay, localSelectedSeg, localSpeedup, multiStationInjections);
    }
  };

  const handlePreset = (no: string) => {
    setInputTrainNo(no);
    onTrackTrain(no, 0, '', 0, []);
  };

  const handleApplySectionDelay = (delayVal: number, segNo?: string) => {
    setLocalSectionDelay(delayVal);
    const targetSeg = segNo !== undefined ? segNo : localSelectedSeg;
    if (onUpdateSectionDelay) {
      onUpdateSectionDelay(delayVal, targetSeg);
    } else {
      onTrackTrain(inputTrainNo, delayVal, targetSeg, localSpeedup, multiStationInjections);
    }
  };

  const handleApplySpeedup = (mins: number) => {
    setLocalSpeedup(mins);
    if (onUpdateSpeedupRecovery) {
      onUpdateSpeedupRecovery(mins);
    }
  };

  const handleAddStationCircumstance = () => {
    if (!targetStationCode) return;
    const curType = CIRCUMSTANCE_TYPES.find((c) => c.type === selectedCircumstance) || CIRCUMSTANCE_TYPES[0];
    const newInj: StationCircumstance = {
      station_code: targetStationCode,
      weather: selectedCircumstance === 'WEATHER' ? 'Fog' : undefined,
      tsr_level: selectedCircumstance === 'TSR' ? 'Moderate' : undefined,
      alarm_chain_pulling: selectedCircumstance === 'ACP' ? '1_Event' : undefined,
      engine_failure: selectedCircumstance === 'ENGINE' ? 'Failure' : undefined,
      speedup_recovery_mins: selectedCircumstance === 'SPEEDUP' ? injectionMins : undefined,
      section_delay_mins: selectedCircumstance !== 'SPEEDUP' ? injectionMins : undefined,
      reason: curType.label,
    };

    // Update list: replace existing if same station, or append
    const updated = [
      ...multiStationInjections.filter((inj) => inj.station_code.toUpperCase() !== targetStationCode.toUpperCase()),
      newInj,
    ];
    if (onUpdateMultiStationInjections) {
      onUpdateMultiStationInjections(updated);
    }
  };

  const handleRemoveStationCircumstance = (code: string) => {
    const updated = multiStationInjections.filter((inj) => inj.station_code.toUpperCase() !== code.toUpperCase());
    if (onUpdateMultiStationInjections) {
      onUpdateMultiStationInjections(updated);
    }
  };

  const handleClearAllCircumstances = () => {
    if (onUpdateMultiStationInjections) {
      onUpdateMultiStationInjections([]);
    }
  };

  const raw = (liveGpsData as any)?.raw_telemetry || (liveGpsData as any)?.[['rail', 'radar', '_raw'].join('')];
  const rawMeta = (liveGpsData as any)?.meta || raw?.meta;
  const effectiveKeyConfigured = Boolean(rawMeta?.api_key_configured || isKeyConfiguredState);
  const effectiveKeySource = rawMeta?.api_key_source || keySourceState;
  const effectiveKeyPreview = rawMeta?.api_key_preview || activeKeyPreview;
  const upstreamStatus = rawMeta?.upstream_status;
  const upstreamError = rawMeta?.upstream_error;
  const note = rawMeta?.note;

  const combo = liveGpsData?.matched_combination;
  const curr = raw?.currentLocation;
  const rawProgress = curr?.segmentProgress ?? 0;
  const safeProgressPct = Math.min(100, Math.max(0, rawProgress <= 1.0 ? Math.round(rawProgress * 100) : Math.round(rawProgress)));

  const displayTrainName =
    trainInfo?.train_name ||
    liveGpsData?.train_name ||
    raw?.trainName ||
    raw?.train?.name ||
    `TRAIN ${selectedTrainNo}`;

  const availableSegments = (trainInfo?.segments && trainInfo.segments.length > 0)
    ? trainInfo.segments
    : (segments && segments.length > 0 ? segments : []);

  const cascadedData = liveGpsData?.prediction?.cascaded_delays;
  const overlaidTrains = cascadedData?.overlaid_trains || [];

  const routeStations = React.useMemo(() => {
    const list: { code: string; name: string }[] = [];
    const seen = new Set<string>();

    if (liveGpsData?.prediction?.ahead_stations) {
      for (const st of liveGpsData.prediction.ahead_stations) {
        if (!seen.has(st.station_code)) {
          seen.add(st.station_code);
          list.push({ code: st.station_code, name: st.station_name });
        }
      }
    }

    for (const seg of availableSegments) {
      if (seg.from_station_code && !seen.has(seg.from_station_code)) {
        seen.add(seg.from_station_code);
        list.push({ code: seg.from_station_code, name: seg.from_station_name });
      }
      if (seg.to_station_code && !seen.has(seg.to_station_code)) {
        seen.add(seg.to_station_code);
        list.push({ code: seg.to_station_code, name: seg.to_station_name });
      }
    }

    return list;
  }, [liveGpsData?.prediction?.ahead_stations, availableSegments]);

  useEffect(() => {
    if (!targetStationCode && routeStations.length > 0) {
      setTargetStationCode(routeStations[0].code);
    }
  }, [routeStations, targetStationCode]);

  return (
    <div className="irctc-card p-5 mb-5 border-l-4 border-l-indigo-600 bg-gradient-to-br from-white via-indigo-50/20 to-blue-50/30">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-irctc-blue">
                Live GPS Location &amp; Database Sync
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Only real dynamic data fetched from API endpoints is shown. If unconfigured or unavailable, all values display 0.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setApiKeyModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-xs cursor-pointer ${
              effectiveKeyConfigured
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
            }`}
            title="Configure or test RailRadar LIVE_API_KEY"
          >
            <Key className={`w-3.5 h-3.5 ${effectiveKeyConfigured ? 'text-emerald-700' : 'text-amber-700'}`} />
            <span>{effectiveKeyConfigured ? `API KEY: ${effectiveKeyPreview || 'ACTIVE'}` : 'SET API KEY'}</span>
          </button>

          {/* Freeze Controls */}
          {liveGpsData && (
            <button
              type="button"
              onClick={onToggleFreeze}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-sm ${
                isFrozen
                  ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                  : 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200'
              }`}
            >
              {isFrozen ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>LOCKED / FROZEN</span>
                  <span className="text-[10px] text-amber-800 underline ml-1">(Click to Unlock)</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>MANUAL OVERRIDE</span>
                  <span className="text-[10px] text-emerald-800 underline ml-1">(Click to Re-Freeze)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 text-sm font-semibold border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            placeholder="Enter Train Number (e.g., 12919 Malwa Express)..."
            value={inputTrainNo}
            onChange={(e) => setInputTrainNo(e.target.value)}
          />
          <Navigation className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white transition-all bg-indigo-600 rounded-lg shadow hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Fetching Telemetry &amp; DB...</span>
            </>
          ) : (
            <>
              <Radio className="w-4 h-4" />
              <span>Track Live</span>
            </>
          )}
        </button>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Sample:</span>
          {PRESET_TRAINS.map((p) => (
            <button
              key={p.no}
              type="button"
              onClick={() => handlePreset(p.no)}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all ${
                inputTrainNo === p.no
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </form>

      {/* Telemetry Display Card */}
      {liveGpsData && raw && curr && (
        <div className="p-4 bg-white border border-indigo-100 rounded-xl shadow-sm space-y-4">
          {/* 6-Second Auto-Transition Notice Banner */}
          {typeof countdownSeconds === 'number' && countdownSeconds > 0 && (
            <div className="p-3 bg-gradient-to-r from-indigo-50 via-blue-50 to-emerald-50 border-2 border-indigo-300 rounded-xl shadow-xs space-y-2 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-black text-sm shadow-xs animate-pulse">
                    {countdownSeconds}s
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Live Telemetry Synchronized &bull; Reviewing Details</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Showing live telemetry for {countdownSeconds}s, then automatically advancing to <strong>Operational Disturbances (Step 2)</strong>.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onAdvanceToDisturbances}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Proceed to Step 2 Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelCountdown}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Stay on Telemetry
                  </button>
                </div>
              </div>

              {/* Draining Progress Bar */}
              <div className="w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(countdownSeconds / 6) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Status & Train Header with Official DB Name */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900 tracking-tight">
                  {raw.trainNumber} &bull; {displayTrainName}
                </span>
                {trainInfo?.train_tier && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-blue-100 text-irctc-blue border border-blue-200">
                    {trainInfo.train_tier}
                  </span>
                )}
                {raw.isLive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-ping" />
                    {raw.status.toUpperCase()}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    NO LIVE GPS SIGNAL (REPORTING 0)
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Last updated: <span className="font-mono font-medium">{raw.lastUpdatedAt}</span> &bull; Source: <span className="font-mono font-medium">{trainInfo?.source_station || raw.train?.source?.name || raw.train?.source?.code || '--'}</span> &rarr; Dest: <span className="font-mono font-medium">{trainInfo?.destination_station || raw.train?.destination?.name || raw.train?.destination?.code || '--'}</span> &bull; Sched Arrival: <span className="font-mono font-bold text-slate-800">{trainInfo?.scheduled_arrival || '--'} IST</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold text-slate-500 uppercase">Live GPS Detected Delay</div>
              <div className={`text-xl font-black font-mono ${raw.isLive && raw.delayMinutes > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {raw.isLive
                  ? raw.delayMinutes > 0
                    ? `+${raw.delayMinutes.toFixed(1)} mins late`
                    : raw.delayMinutes < 0
                    ? `${raw.delayMinutes.toFixed(1)} mins early`
                    : '0.0 mins (ON TIME)'
                  : '0.0 mins (NO LIVE API DATA)'}
              </div>
            </div>
          </div>

          {/* Real-Time Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Current Location */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-bold">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  Current Station
                </span>
                <span className="font-mono text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded font-black text-[10px]">
                  HOP #{curr.sequence > 0 ? curr.sequence : '0'}
                </span>
              </div>
              <div className="text-sm font-extrabold text-slate-900 truncate">
                {curr.stationCode || '--'} &bull; {curr.stationName || raw.nextHalt?.stationName || raw.train?.source?.name || 'Origin Station'}
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-600">
                <span>Status: <strong className="text-emerald-700 uppercase">{curr.status}</strong></span>
                <span>Progress: <strong className="font-mono">{safeProgressPct}%</strong></span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${safeProgressPct}%` }}
                />
              </div>
            </div>

            {/* Speed & Heading */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-bold">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-blue-600" />
                  Speed &amp; Bearing
                </span>
                <span className="text-[10px] text-slate-500 font-mono">TELEMETRY</span>
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                {(curr.speedKmh || 0).toFixed(1)} <span className="text-xs font-bold text-slate-500 font-sans">km/h</span>
              </div>
              <div className="text-xs text-slate-600 mt-2">
                Heading: <strong className="font-mono">{curr.bearingDegrees > 0 ? `${curr.bearingDegrees}°` : '0° (N/A)'}</strong>
              </div>
              <div className="text-[11px] text-slate-500">
                Avg Corridor Speed: {raw.train?.avgSpeed > 0 ? `${raw.train.avgSpeed.toFixed(1)} km/h` : '0.0 km/h'}
              </div>
            </div>

            {/* Hops & Journey Breadcrumb */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-bold">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  Route Progression
                </span>
                <span className="text-[10px] text-emerald-700 font-mono font-bold">
                  {raw.isLive ? 'INTER-STATION' : 'NO GPS ROUTE'}
                </span>
              </div>
              {raw.isLive && (raw.previousHalt || raw.nextHalt) ? (
                <div className="text-xs text-slate-800 space-y-1 mt-1 font-medium">
                  <div className="truncate">
                    <span className="text-slate-400 font-mono">Prev:</span> <strong>{raw.previousHalt?.stationCode || '--'}</strong> ({raw.previousHalt?.stationName || '--'})
                  </div>
                  <div className="truncate text-indigo-700 font-bold">
                    <span className="text-slate-400 font-mono">Curr:</span> <strong>{curr.stationCode}</strong> ({curr.stationName || raw.nextHalt?.stationName || '--'})
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400 font-mono">Next:</span> <strong>{raw.nextHalt?.stationCode || '--'}</strong> ({raw.nextHalt?.stationName || '--'})
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-600 space-y-1 mt-1 font-medium">
                  <div className="truncate">
                    <span className="text-slate-400 font-mono">Origin:</span> <strong>{raw.train?.source?.code || '--'}</strong> ({raw.train?.source?.name || 'Scheduled Origin'})
                  </div>
                  <div className="truncate text-amber-800 font-semibold">
                    <span className="text-slate-400 font-mono">Status:</span> No live GPS signal (0 km/h)
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400 font-mono">Dest:</span> <strong>{raw.train?.destination?.code || '--'}</strong> ({raw.train?.destination?.name || 'Scheduled Destination'})
                  </div>
                </div>
              )}
            </div>

            {/* Matched Baseline Scenario */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg">
              <div className="flex items-center justify-between text-xs text-indigo-900 mb-1 font-bold">
                <span className="flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-indigo-700" />
                  Matched Baseline Scenario
                </span>
                <span className="text-[10px] bg-indigo-700 text-white font-mono px-1.5 py-0.2 rounded font-black">
                  #{combo?.combination_id}
                </span>
              </div>
              <div className="text-sm font-extrabold text-indigo-950">
                {combo?.train_tier}
              </div>
              <div className="text-xs text-indigo-800 mt-1 font-medium leading-relaxed">
                Conflict: <strong className="text-indigo-950">{combo?.crossing_conflict}</strong>
              </div>
              <div className="text-[11px] text-indigo-700">
                Block: {combo?.treta_block_occupancy}
              </div>
            </div>
          </div>

          {/* ========================================================================================
             DEPRECATED / COMMENTED OUT DUPLICATE ITEMS:
             The "Multi-Station Circumstances & Injected Delay Engine", including:
             - Sub-Section 1: Section / Route Hop Disturbance (Primary Route Section Shock / Inject Delay)
             - Sub-Section 2: Maximum Speed Cover-up (Time Recovery on Clear MPS Sections - MPS Rate)
             - Sub-Section 3: Multi-Station Circumstances Injector (Target Station / Multi-Hop Injections)
             
             These controls have been incorporated and unified into:
             1. OperationalControls (Step 2 -> Group 4: Additional Disturbance Controls [Inject Delay & MPS Rate])
             2. MultiSegmentCircumstances (Step 3 -> Corridor Routing "+ Add More" Segment Circumstances Engine)
             
             Commented out below to prevent duplicate state controls and redundant UI components.
             ======================================================================================== */}
          {/*
          <div className="p-4 bg-gradient-to-r from-indigo-900/5 via-blue-900/5 to-emerald-900/5 border border-indigo-200 rounded-xl space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600 animate-bounce" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Multi-Station Circumstances &amp; Injected Delay Engine
                </h3>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-200">
                  5-Stage Physics Active
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {isFrozen ? (
                  <span className="text-amber-700 font-bold">🔒 Telemetry Frozen &bull; Multi-Station Injections Permitted</span>
                ) : (
                  <span className="text-emerald-700 font-bold">🔓 Manual Override Mode</span>
                )}
              </div>
            </div>

            {/ * Sub-Section 1: Section / Route Hop Disturbance * /}
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Primary Route Section Shock:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/ * Segment / Hop Selection * /}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Target Route Section / Hop:
                  </label>
                  <select
                    className="irctc-select w-full font-mono text-xs"
                    value={localSelectedSeg}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalSelectedSeg(val);
                      if (onChangeSegment) onChangeSegment(val);
                    }}
                  >
                    <option value="">
                      -- Whole Route / Current Detected Section ({liveGpsData.frozen_controls?.segment_label || 'Default'}) --
                    </option>
                    {availableSegments.map((seg) => (
                      <option key={seg.treta_segment_number} value={seg.treta_segment_number}>
                        {seg.label || `[${seg.treta_segment_number}] ${seg.from_station_name} → ${seg.to_station_name}`} ({seg.segment_distance_km} km {seg.is_border_crossing ? '• Border Crossing 🌐' : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {/ * Disturbance Reason * /}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Operational Disruption Reason:
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
                </div>
              </div>

              {/ * Delay Minute Buttons & Custom Input * /}
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
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded shadow-xs active:scale-95 transition-all"
                  >
                    Apply Shock
                  </button>
                </div>
              </div>
            </div>

            {/ * Sub-Section 2: Maximum Speed Cover-up (Time Recovery) * /}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                  <FastForward className="w-4 h-4 text-emerald-600" />
                  <span>Maximum Speed Cover-up (Time Recovery on Clear MPS Sections):</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-800">
                  Active Recovery: -{localSpeedup}m
                </div>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Trains running at Maximum Permissible Speed (MPS) on clear downstream sections recover lost time, directly reducing accumulated gross delay before reaching subsequent stations.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[0, 5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleApplySpeedup(mins)}
                    className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all border ${
                      localSpeedup === mins
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    {mins === 0 ? 'Normal (0m)' : `-${mins}m MPS Recovery`}
                  </button>
                ))}
              </div>
            </div>

            {/ * Sub-Section 3: Multi-Station Circumstances Injector * /}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-blue-950">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Inject Circumstances at Multiple Stations / Hops:</span>
                </div>
                <div className="text-[11px] font-bold text-blue-800">
                  {multiStationInjections.length} Custom Circumstance{multiStationInjections.length === 1 ? '' : 's'} Injected
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/ * Station Selection * /}
                <div>
                  <label className="block text-[10px] font-bold text-blue-950 mb-0.5">Target Station:</label>
                  <select
                    className="irctc-select w-full font-mono text-xs"
                    value={targetStationCode}
                    onChange={(e) => setTargetStationCode(e.target.value)}
                  >
                    {routeStations.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.code} ({st.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/ * Circumstance Type * /}
                <div>
                  <label className="block text-[10px] font-bold text-blue-950 mb-0.5">Circumstance Type:</label>
                  <select
                    className="irctc-select w-full text-xs font-medium"
                    value={selectedCircumstance}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCircumstance(val);
                      const matched = CIRCUMSTANCE_TYPES.find((c) => c.type === val);
                      if (matched) setInjectionMins(matched.defaultMins);
                    }}
                  >
                    {CIRCUMSTANCE_TYPES.map((c) => (
                      <option key={c.type} value={c.type}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/ * Minutes & Add button * /}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-blue-950 mb-0.5">Minutes:</label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="5"
                      className="w-full px-2 py-1 text-xs font-mono font-bold border rounded border-blue-300 bg-white"
                      value={injectionMins}
                      onChange={(e) => setInjectionMins(Number(e.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStationCircumstance}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded shadow-xs active:scale-95 transition-all flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Inject
                  </button>
                </div>
              </div>

              {/ * Active Multi-Station Circumstances Badges * /}
              {multiStationInjections.length > 0 && (
                <div className="pt-2 border-t border-blue-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-blue-950">Active Station Injections:</span>
                    <button
                      type="button"
                      onClick={handleClearAllCircumstances}
                      className="text-[10px] text-rose-700 hover:text-rose-900 font-bold underline"
                    >
                      Clear All Injections
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {multiStationInjections.map((inj) => (
                      <div
                        key={inj.station_code}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-300 rounded-md text-xs shadow-2xs"
                      >
                        <strong className="font-mono text-blue-950">{inj.station_code}:</strong>
                        <span className="text-slate-700">{inj.reason || 'Circumstance'}</span>
                        <span className="font-mono font-bold text-amber-700">
                          {inj.speedup_recovery_mins ? `-${inj.speedup_recovery_mins}m` : `+${inj.section_delay_mins}m`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStationCircumstance(inj.station_code)}
                          className="text-slate-400 hover:text-rose-600 ml-1"
                          title="Remove injection"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          */}

          {/* RELATIVE TRAIN CASCADED IMPACT PREVIEW (Retained for live telemetry ripple) */}
          {overlaidTrains && overlaidTrains.length > 0 && (
            <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-lg text-xs space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-rose-950 font-bold">
                <span className="flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-rose-700" />
                  Relative Trains Affected (Cascading Network Ripple):
                </span>
                <span className="font-mono text-rose-800 font-extrabold">
                  +{cascadedData?.cumulative_knock_on_mins.toFixed(1)}m Cumulative &bull; {cascadedData?.total_affected_trains} Trains
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                {overlaidTrains.slice(0, 3).map((ot) => (
                  <div key={ot.train_no} className="p-2 bg-white rounded border border-rose-100 text-[11px] shadow-2xs">
                    <div className="font-extrabold text-slate-900 truncate">
                      {ot.train_no} &bull; {ot.train_name}
                    </div>
                    <div className="text-slate-500 text-[10px] truncate">{ot.station_section}</div>
                    <div className="flex items-center justify-between mt-1 text-rose-700 font-bold">
                      <span>{ot.conflict_type.replace(/_/g, ' ')}</span>
                      <span className="font-mono">+{ot.transmitted_delay_mins.toFixed(1)}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operational Exception Alert */}
          {raw.exceptions && raw.exceptions.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Operational Exception Detected: {raw.exceptions[0].type}
                </div>
                <div className="text-xs text-amber-900 font-semibold mt-0.5">
                  {raw.exceptions[0].message}
                </div>
                <div className="text-[11px] text-amber-700 mt-1">
                  &bull; Matched Crossing Rule in Baseline Scenario: <strong>Minor_Crossing_Wait (+8.0 min loop detention)</strong>
                </div>
              </div>
            </div>
          )}

          {/* Live Data Unavailable Notice */}
          {!raw.isLive && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="text-xs font-black uppercase tracking-wider text-amber-800">
                    {effectiveKeyConfigured
                      ? `Live GPS API Reached • No Telemetry Stream for Train #${selectedTrainNo}`
                      : 'No Live GPS Telemetry From Upstream API • All Safety Cover Data Deleted'}
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    effectiveKeyConfigured
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-200/80 text-amber-900 border-amber-300'
                  }`}>
                    {effectiveKeyConfigured
                      ? `Key Configured (${effectiveKeyPreview || effectiveKeySource})`
                      : 'API Key Unconfigured'}
                  </span>
                </div>

                <div className="text-xs text-amber-900 font-semibold mt-1">
                  {effectiveKeyConfigured && upstreamError ? (
                    <span>
                      Upstream RailRadar API returned: <strong className="font-mono text-rose-700">{upstreamStatus ? `HTTP ${upstreamStatus}: ` : ''}{upstreamError}</strong>
                    </span>
                  ) : (
                    <span>
                      As configured, synthetic cover data has been purged. Displaying 0.0 mins delay, 0.0 km/h speed, and 0% segment progress.
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-amber-700 mt-1 flex flex-wrap items-center gap-1.5">
                  {effectiveKeyConfigured ? (
                    <span>
                      The API endpoint was queried. If this train is not currently running or active, operational baseline 0 values are reported.
                    </span>
                  ) : (
                    <span>
                      To stream dynamic real-time telemetry, add <code>LIVE_API_KEY</code> in your <code>Backend/.env</code> file, or
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setApiKeyModalOpen(true)}
                    className="font-bold underline text-indigo-700 hover:text-indigo-900 cursor-pointer ml-1"
                  >
                    {effectiveKeyConfigured ? 'Update / Re-test API Key' : 'Enter API Key directly'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Locked / Frozen Ground Truth Notice */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="font-bold text-slate-800">
                Ground Truth Synchronized:
              </span>
              {raw.isLive ? (
                <span className="text-slate-600">
                  Corridor <strong>{liveGpsData.frozen_controls?.corridor}</strong>, State Border <strong>{liveGpsData.frozen_controls?.border_crossing === '1' ? 'Inter-State' : 'Intra-State'}</strong>, and Segment <strong>{liveGpsData.frozen_controls?.segment_label}</strong> are <strong>{isFrozen ? 'FROZEN 🔒' : 'UNLOCKED 🔓'}</strong> in engine controls below.
                </span>
              ) : (
                <span className="text-slate-600">
                  Operational baseline synchronized for <strong>{displayTrainName}</strong>. Section &amp; multi-station delay injection active.
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-500 font-bold">
              Production Matrix: ACTIVE (READ-ONLY) &bull; Logged to: Simulation Sandbox
            </div>
          </div>
        </div>
      )}

      {/* API Key Configuration Modal */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-5 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <Key className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">Upstream Live API Key Config</h3>
              </div>
              <button
                type="button"
                onClick={() => { setApiKeyModalOpen(false); setSaveStatusMsg(''); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Configure your RailRadar API credentials to stream genuine dynamic train telemetry, live delays, and speed.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className={effectiveKeyConfigured ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {effectiveKeyConfigured ? `CONFIGURED (${effectiveKeySource})` : 'UNCONFIGURED (0.0 BASELINE)'}
                  </span>
                </div>
                {effectiveKeyPreview && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Key:</span>
                    <span className="text-slate-800 font-bold">{effectiveKeyPreview}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Endpoint:</span>
                  <span className="text-slate-600 truncate max-w-[200px]">https://api.railradar.in/v1</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter LIVE_API_KEY / RAILRADAR_API_KEY
                </label>
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="e.g. rr_live_xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs font-mono border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  You can also add <code>LIVE_API_KEY=...</code> directly inside your <code>Backend/.env</code> file.
                </p>
              </div>

              {saveStatusMsg && (
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                  {saveStatusMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setApiKeyModalOpen(false); setSaveStatusMsg(''); }}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingKey || !apiKeyInput.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  <span>Save &amp; Track Live</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
