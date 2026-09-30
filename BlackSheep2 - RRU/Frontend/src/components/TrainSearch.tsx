'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Train, CheckCircle2, ChevronRight, Sparkles, MapPin, Gauge, AlertTriangle } from 'lucide-react';
import { TrainSearchResult, TrainInfo } from '@/types';

interface TrainSearchProps {
  selectedTrainNo: string;
  trainInfo: TrainInfo | null;
  onSelectTrain: (trainNo: string) => void;
  isLoading: boolean;
}

const PRESET_TRAINS = [
  { no: '12001', name: 'Shatabdi Exp', tier: 'T1', corridor: 'DEL-MAS' },
  { no: '22348', name: 'Vande Bharat (Cascaded)', tier: 'T1', corridor: 'DEL-HWH' },
  { no: '02024', name: 'PNBE HWH Spl (Live GPS)', tier: 'T2', corridor: 'DEL-HWH' },
  { no: '12952', name: 'Tejas Rajdhani', tier: 'T1', corridor: 'DEL-MUM' },
  { no: '12951', name: 'Mumbai Rajdhani', tier: 'T1', corridor: 'DEL-MUM Rev' },
  { no: '12302', name: 'Howrah Rajdhani', tier: 'T1', corridor: 'DEL-HWH' },
  { no: '12626', name: 'Kerala Exp', tier: 'T2', corridor: 'DEL-MAS' },
  { no: '12215', name: 'Garib Rath', tier: 'T2', corridor: 'DEL-MUM' },
  { no: '19019', name: 'Dehradun Exp', tier: 'T3', corridor: 'Northern' },
];

export const TrainSearch: React.FC<TrainSearchProps> = ({
  selectedTrainNo,
  trainInfo,
  onSelectTrain,
  isLoading,
}) => {
  const [query, setQuery] = useState<string>(selectedTrainNo);
  const [suggestions, setSuggestions] = useState<TrainSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keep input synchronized if selectedTrainNo is updated externally (e.g. from live GPS tracking)
  useEffect(() => {
    if (selectedTrainNo && selectedTrainNo !== query) {
      setQuery(selectedTrainNo);
    }
  }, [selectedTrainNo]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data: TrainSearchResult[] = await res.json();
          setSuggestions(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Failed to search trains:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (tNo: string) => {
    setQuery(tNo);
    setShowDropdown(false);
    onSelectTrain(tNo);
  };

  return (
    <div className="irctc-card p-5 mb-5 border-l-4 border-l-irctc-blue">
      {/* Title & Help */}
      <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <Train className="w-5 h-5 text-irctc-blue" />
          <h2 className="text-base font-bold text-irctc-blue">
            Train Search &amp; Auto-Pickup Parameter Engine
          </h2>
        </div>
        <span className="text-xs text-irctc-text-muted">
          Auto-picks up Tier, Working Timetable, Corridor &amp; 
        </span>
      </div>

      {/* Search Input with Autocomplete */}
      <div className="relative mb-4" ref={dropdownRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-irctc-blue absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            className="w-full bg-white border-2 border-slate-300 focus:border-irctc-blue rounded-lg py-2.5 pl-10 pr-24 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-irctc-blue/15 transition-all shadow-sm"
            placeholder="Search by Train No, Name, or Route (e.g. 12001, Shatabdi, Rajdhani, Delhi to Mumbai)..."
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              const cleaned = val.trim();
              if (cleaned.length === 5 && /^\d{5}$/.test(cleaned) && cleaned !== selectedTrainNo) {
                handleSelect(cleaned);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions.length > 0) {
                  handleSelect(suggestions[0].train_no);
                } else if (query.trim()) {
                  handleSelect(query.trim());
                }
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
          />
          {isSearching && (
            <span className="absolute right-3 text-xs text-irctc-orange font-semibold flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-irctc-orange animate-ping" />
              Searching...
            </span>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
            {suggestions.map((train) => (
              <button
                key={train.train_no}
                type="button"
                onClick={() => handleSelect(train.train_no)}
                className="w-full text-left px-4 py-2.5 hover:bg-irctc-blue-light/60 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-irctc-blue text-sm">
                      {train.train_no}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {train.train_name}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {train.train_tier}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{train.source}</span>
                    <span className="text-slate-300">&rarr;</span>
                    <span>{train.destination}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-irctc-orange font-medium">{train.corridor_slug}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-irctc-orange group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Auto-Pickup Status Banner */}
      {trainInfo && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-full bg-emerald-100 text-emerald-700 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">
                  AUTO-PICKUP ACTIVE
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.2 rounded border border-emerald-200">
                  {trainInfo.train_no} &bull; {trainInfo.train_name}
                </span>
              </div>
              <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                Tier: <strong>{trainInfo.train_tier}</strong> &bull; Corridor:{' '}
                <strong>{trainInfo.relevant_corridor_slug}</strong> ({trainInfo.relevant_corridor_name}) &bull; Extra
                Allotted Slack (EA): <strong>{trainInfo.EA_allotted_mins.toFixed(1)}m</strong> &bull;{' '}
                {trainInfo.available_segments_count} Hops Mapped &bull; Sched Arrival:{' '}
                <strong>{trainInfo.scheduled_arrival} IST</strong>
              </p>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 bg-white/80 px-2.5 py-1 rounded border border-emerald-200/60 shadow-2xs">
            Synced with Working Timetable
          </div>
        </div>
      )}

      {/* Pre-existing Cascaded Delay Notification Banner */}
      {trainInfo?.inherited_delay_info?.has_inherited_delay && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-3.5 mb-4 shadow-sm animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-full bg-amber-200 text-amber-900">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-wide text-amber-950">
                Cascaded Delay Concept Active &bull; Inherited Primary Delay Found
              </span>
            </div>
            <span className="text-xs font-mono font-black text-rose-700 bg-amber-200 px-2.5 py-0.5 rounded border border-amber-400">
              +{trainInfo.inherited_delay_info.inherited_delay_mins.toFixed(1)} mins Pre-Existing Shock
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-950">
            <div className="p-2 bg-white/70 rounded border border-amber-200">
              <span className="font-bold text-slate-700">Production Timetable Baseline:</span>
              <div className="font-mono text-slate-600 mt-0.5">
                Baseline Delay: <strong>{(trainInfo.inherited_delay_info.win_db_master.baseline_delay_mins ?? 0).toFixed(1)}m</strong> &bull; Status: <strong className="text-emerald-700">{trainInfo.inherited_delay_info.win_db_master.arrival_status}</strong>
              </div>
            </div>
            <div className="p-2 bg-amber-100/60 rounded border border-amber-300">
              <span className="font-bold text-amber-900">Simulation Sandbox:</span>
              <div className="font-mono text-amber-950 mt-0.5">
                Inherited Delay: <strong className="text-rose-700">+{trainInfo.inherited_delay_info.inherited_delay_mins.toFixed(1)}m</strong> &bull; Conflict: <strong>{trainInfo.inherited_delay_info.conflict_type}</strong>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-amber-900/90 mt-2 font-medium">
            <strong>Knock-on Trigger:</strong> Triggered by Train #<strong>{trainInfo.inherited_delay_info.trigger_train_no}</strong> in preceding dispatch cycle. This +{trainInfo.inherited_delay_info.inherited_delay_mins.toFixed(1)}m delay is automatically accounted for in <strong>Stage 1 Primary Delay ($PD$)</strong>.
          </div>
        </div>
      )}

      {/* Quick Train Presets */}
      <div>
        <span className="text-xs font-semibold text-slate-600 mr-2 inline-block mb-1.5">
          Quick Train Presets:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_TRAINS.map((preset) => {
            const isActive = selectedTrainNo === preset.no;
            return (
              <button
                key={preset.no}
                type="button"
                onClick={() => handleSelect(preset.no)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-irctc-blue text-white shadow-xs font-bold border border-irctc-blue'
                    : 'bg-slate-100 text-slate-700 hover:bg-irctc-blue-light hover:text-irctc-blue border border-slate-200'
                }`}
              >
                <span className="font-mono font-bold">{preset.no}</span> {preset.name} (
                <span className="text-[10px] font-bold text-irctc-orange">{preset.tier}</span>)
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
