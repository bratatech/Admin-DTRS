'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Map, Landmark, Train, RefreshCw, Search, Layers, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { StateBorderDivision } from '@/types';

export const StateBordersExplorer: React.FC = () => {
  const [stateBorders, setStateBorders] = useState<StateBorderDivision[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'stations' | 'corridor' | 'halts' | 'name'>('stations');
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

  const fetchStateBorders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/state_borders');
      if (!res.ok) throw new Error('Failed to fetch state borders');
      const data: StateBorderDivision[] = await res.json();
      setStateBorders(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching state borders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStateBorders();
  }, []);

  const toggleExpand = (key: string) => {
    setExpandedStates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // KPIs
  const totalStations = useMemo(
    () => stateBorders.reduce((acc, sb) => acc + (Number(sb.total_stations_clubbed) || 0), 0),
    [stateBorders]
  );
  const totalCorridorStations = useMemo(
    () => stateBorders.reduce((acc, sb) => acc + (Number(sb.corridor_stations_count) || 0), 0),
    [stateBorders]
  );
  const totalHalts = useMemo(
    () => stateBorders.reduce((acc, sb) => acc + (Number(sb.total_halt_events) || 0), 0),
    [stateBorders]
  );

  // Filtered & Sorted
  const processedBorders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = stateBorders.filter((sb) => {
      if (!q) return true;
      return (
        sb.state_name.toLowerCase().includes(q) ||
        sb.state_code.toLowerCase().includes(q) ||
        sb.state_border_key.toLowerCase().includes(q) ||
        (sb.primary_railway_zones && sb.primary_railway_zones.toLowerCase().includes(q)) ||
        (sb.major_junctions && sb.major_junctions.toLowerCase().includes(q)) ||
        (sb.corridor_stations_list && sb.corridor_stations_list.toLowerCase().includes(q))
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'stations') return (Number(b.total_stations_clubbed) || 0) - (Number(a.total_stations_clubbed) || 0);
      if (sortBy === 'corridor') return (Number(b.corridor_stations_count) || 0) - (Number(a.corridor_stations_count) || 0);
      if (sortBy === 'halts') return (Number(b.total_halt_events) || 0) - (Number(a.total_halt_events) || 0);
      if (sortBy === 'name') return a.state_name.localeCompare(b.state_name);
      return 0;
    });
  }, [stateBorders, searchQuery, sortBy]);

  return (
    <div className="space-y-5">
      {/* Overview Card */}
      <div className="irctc-card p-5 border-l-4 border-l-emerald-600">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-700 text-white shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-irctc-blue">
                  Territorial State Border Divisions &bull; Station Partition Catalog
                </h2>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                  /api/state_borders
                </span>
              </div>
              <p className="text-xs text-irctc-text-muted mt-0.5">
                29 State territorial borders cataloging all 9,950+ Indian Railways stations into regional dispatch clubs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchStateBorders}
            disabled={isLoading}
            className="text-xs text-slate-600 hover:text-emerald-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh State Borders</span>
          </button>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              State Borders Mapped
            </div>
            <div className="text-xl font-mono font-extrabold text-emerald-700">
              {stateBorders.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Territorial Divisions</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Total Stations Clubbed
            </div>
            <div className="text-xl font-mono font-extrabold text-irctc-blue">
              {totalStations.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">All Railway Stations</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Corridor Stations
            </div>
            <div className="text-xl font-mono font-extrabold text-amber-600">
              {totalCorridorStations.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Trunk Route Stations</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Total Halt Events
            </div>
            <div className="text-xl font-mono font-extrabold text-purple-700">
              {totalHalts.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Timetable Stop Records</div>
          </div>
        </div>

        {/* Filter and Sort Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              className="w-full bg-white border border-slate-300 focus:border-irctc-blue rounded-lg py-2 pl-9 pr-3.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-irctc-blue/15 transition-all shadow-2xs"
              placeholder="Search by state name, code (UP, MH, DL), junction (CNB, NDLS), zone (NR, WR), or station..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 shrink-0">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="irctc-select w-full text-xs"
            >
              <option value="stations">Total Stations (High → Low)</option>
              <option value="corridor">Corridor Stations (High → Low)</option>
              <option value="halts">Halt Events (High → Low)</option>
              <option value="name">State Name (Alphabetical)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading & Error Indicators */}
      {isLoading && stateBorders.length === 0 && (
        <div className="irctc-card p-10 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-irctc-orange rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-600 font-semibold">Loading 29 State Border Divisions from /api/state_borders...</p>
        </div>
      )}

      {error && (
        <div className="irctc-card p-4 bg-rose-50 border-rose-300 text-rose-800 text-xs">
          <strong>Error loading state borders:</strong> {error}
        </div>
      )}

      {/* State Division Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {processedBorders.map((sb) => {
          const isExpanded = !!expandedStates[sb.state_border_key];
          const zones = sb.primary_railway_zones
            ? sb.primary_railway_zones
                .split(',')
                .map((z) => z.trim())
                .filter((z) => z && z !== '?')
            : [];
          const junctions = sb.major_junctions
            ? sb.major_junctions.split(',').map((j) => j.trim()).filter(Boolean)
            : [];
          const corridorStations = sb.corridor_stations_list
            ? sb.corridor_stations_list.split(',').map((s) => s.trim()).filter(Boolean)
            : [];

          return (
            <div
              key={sb.state_border_key}
              className="irctc-card p-4 border-l-4 border-l-emerald-600 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-xs bg-emerald-700 text-white px-2 py-0.5 rounded shadow-2xs">
                        {sb.state_border_key}
                      </span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {sb.state_code}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                      {sb.state_name}
                    </h3>
                  </div>

                  {/* Quick Counts */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-irctc-blue border border-blue-200">
                      {Number(sb.total_stations_clubbed).toLocaleString()} Stations
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                      {Number(sb.corridor_stations_count)} Corridor
                    </span>
                  </div>
                </div>

                {/* Halt Events & Zones */}
                <div className="space-y-2 mb-3">
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">Total Halt Events:</span>
                    <span className="font-mono font-bold text-purple-800">
                      {Number(sb.total_halt_events).toLocaleString()}
                    </span>
                  </div>

                  {/* Primary Zones */}
                  {zones.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Railway Zones Operating in Territory:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {zones.map((z, zIdx) => (
                          <span
                            key={zIdx}
                            className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {z}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Major Junctions */}
                  {junctions.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Major Junction Hubs:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {junctions.map((j, jIdx) => (
                          <span
                            key={jIdx}
                            className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200"
                          >
                            {j}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Corridor Stations Expandable Drawer */}
              {corridorStations.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => toggleExpand(sb.state_border_key)}
                    className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-emerald-700 transition-colors py-1"
                  >
                    <span>
                      Corridor Route Stations ({corridorStations.length})
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-2.5 rounded bg-slate-50 border border-slate-200 max-h-36 overflow-y-auto">
                      <div className="flex flex-wrap gap-1">
                        {corridorStations.map((st, sIdx) => (
                          <span
                            key={sIdx}
                            className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-800 border border-slate-200 shadow-2xs"
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
