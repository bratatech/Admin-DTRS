'use client';

import React, { useState, useEffect } from 'react';
import { Compass, MapPin, ArrowRight, Layers, Sparkles, RefreshCw, Train } from 'lucide-react';
import { NationalCorridor } from '@/types';

interface CorridorsExplorerProps {
  onSelectCorridor: (corridorSlug: string) => void;
}

export const CorridorsExplorer: React.FC<CorridorsExplorerProps> = ({ onSelectCorridor }) => {
  const [corridors, setCorridors] = useState<NationalCorridor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchCorridors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/corridors');
      if (!res.ok) throw new Error('Failed to fetch national corridors');
      const data: NationalCorridor[] = await res.json();
      setCorridors(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching corridors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCorridors();
  }, []);

  const filteredCorridors = corridors.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.corridor.toLowerCase().includes(q) ||
      c.corridor_slug.toLowerCase().includes(q) ||
      c.states_list.toLowerCase().includes(q) ||
      c.state_borders_sequence.toLowerCase().includes(q)
    );
  });

  // Calculate metrics
  const totalBordersCrossed = corridors.reduce((acc, c) => acc + (c.total_state_borders_crossed || 0), 0);
  const allStates = Array.from(
    new Set(
      corridors.flatMap((c) =>
        c.states_list
          ? c.states_list.split(',').map((s) => s.trim())
          : []
      )
    )
  ).filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Overview Banner Card */}
      <div className="irctc-card p-5 border-l-4 border-l-irctc-blue">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-irctc-blue text-white shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-irctc-blue">
                  National Rail Corridors &bull; Golden Quadrilateral Trunk Network
                </h2>
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-200">
                  /api/corridors
                </span>
              </div>
              <p className="text-xs text-irctc-text-muted mt-0.5">
                7 High-density arterial corridors connecting national megacities with multi-state territorial border progressions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchCorridors}
            disabled={isLoading}
            className="text-xs text-slate-600 hover:text-irctc-blue bg-slate-50 border border-slate-200 px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-irctc-orange' : ''}`} />
            <span>Refresh Corridors</span>
          </button>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              National Corridors
            </div>
            <div className="text-xl font-mono font-extrabold text-irctc-blue">
              {corridors.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Golden Quad &amp; Diagonals</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Total Border Transitions
            </div>
            <div className="text-xl font-mono font-extrabold text-amber-600">
              {totalBordersCrossed}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">State Crossings Mapped</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Distinct States Traversed
            </div>
            <div className="text-xl font-mono font-extrabold text-emerald-700">
              {allStates.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Territorial Boundaries</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Network Coverage
            </div>
            <div className="text-xl font-mono font-extrabold text-indigo-700">
              100%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Primary Passenger Trunk</div>
          </div>
        </div>

        {/* Filter Input */}
        <div>
          <input
            type="text"
            className="w-full bg-white border border-slate-300 focus:border-irctc-blue rounded-lg py-2 px-3.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-irctc-blue/15 transition-all shadow-2xs"
            placeholder="Search corridors by name, slug (e.g. DEL-MUM, DEL-HWH), or state code (e.g. MH, UP, WB)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Loading & Error Indicators */}
      {isLoading && corridors.length === 0 && (
        <div className="irctc-card p-10 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-irctc-blue border-t-irctc-orange rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-600 font-semibold">Loading National Rail Corridors from /api/corridors...</p>
        </div>
      )}

      {error && (
        <div className="irctc-card p-4 bg-rose-50 border-rose-300 text-rose-800 text-xs">
          <strong>Error loading corridors:</strong> {error}
        </div>
      )}

      {/* Corridors Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCorridors.map((c) => {
          const sequenceTokens = c.state_borders_sequence
            ? c.state_borders_sequence.split('->').map((s) => s.trim())
            : [];
          const states = c.states_list
            ? c.states_list.split(',').map((s) => s.trim())
            : [];

          return (
            <div
              key={c.corridor_slug}
              className="irctc-card p-5 border-l-4 border-l-irctc-blue hover:shadow-md transition-shadow"
            >
              {/* Header Info */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs bg-irctc-blue text-white px-2.5 py-0.5 rounded shadow-2xs">
                      {c.corridor_slug}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                      {c.total_state_borders_crossed} State Borders Crossed
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {states.length} States Traversed
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>{c.corridor}</span>
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCorridor(c.corridor_slug)}
                  className="bg-irctc-orange hover:bg-irctc-orange-dark text-white font-bold text-xs px-3.5 py-1.5 rounded-md shadow-sm transition-all transform active:scale-95 flex items-center gap-1.5"
                >
                  <Train className="w-3.5 h-3.5" />
                  <span>Analyze Trains on Corridor</span>
                </button>
              </div>

              {/* State Border Progression Flow */}
              <div className="mb-3">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-irctc-blue" />
                  <span>Territorial State Border Progression Sequence:</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  {sequenceTokens.map((token, idx) => (
                    <React.Fragment key={idx}>
                      <div className="flex items-center gap-1 bg-white border border-slate-300 px-2.5 py-1 rounded shadow-2xs font-mono text-xs font-bold text-irctc-blue">
                        <MapPin className="w-3 h-3 text-irctc-orange" />
                        <span>{token}</span>
                      </div>
                      {idx < sequenceTokens.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* State Codes Breakdown */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">States in Corridor:</span>
                {states.map((st, sIdx) => (
                  <span
                    key={sIdx}
                    className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-irctc-blue border border-blue-200"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
