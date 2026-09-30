'use client';

import React, { useState, useEffect } from 'react';
import { Train, Database, Clock, RefreshCw, Zap, ShieldCheck, Route, Compass, Landmark } from 'lucide-react';
import { DbSimulationStatus } from '@/types';

export type NavTabType = 'engine' | 'corridors' | 'borders';

interface HeaderProps {
  onComputeClick: () => void;
  dbStatus: DbSimulationStatus | null;
  onRefreshDbStatus: () => void;
  activeTab?: NavTabType;
  onSelectTab?: (tab: NavTabType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onComputeClick,
  dbStatus,
  onRefreshDbStatus,
  activeTab = 'engine',
  onSelectTab,
}) => {
  const [istTime, setIstTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format to IST
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      };
      const timeStr = new Intl.DateTimeFormat('en-IN', options).format(now);
      const dateStr = new Intl.DateTimeFormat('en-IN', dateOptions).format(now);
      setIstTime(`${dateStr} | ${timeStr} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="mb-6">
      {/* Top IRCTC Portal Bar */}
      <div className="bg-irctc-blue-dark text-slate-200 text-xs px-4 py-1.5 flex flex-wrap justify-between items-center border-b border-irctc-blue-muted/30">
        <div className="flex items-center gap-4">
          <span className="font-medium tracking-wide">
            GOVERNMENT OF INDIA &bull; MINISTRY OF RAILWAYS
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-amber-300 font-semibold">
            CENTRE FOR RAILWAY INFORMATION SYSTEMS (CRIS)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-irctc-orange" />
            <span>{istTime || 'Loading IST...'}</span>
          </div>
        </div>
      </div>

      {/* Main IRCTC Navigation Bar */}
      <div className="bg-irctc-blue text-white shadow-irctc-lg px-5 py-3.5 flex flex-wrap justify-between items-center gap-4">
        {/* Brand Section */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center shadow-md p-1.5 border border-irctc-orange">
            {/* Indian Railways Emblem / IRCTC Icon */}
            <div className="w-full h-full rounded bg-irctc-blue flex flex-col items-center justify-center text-white">
              <Train className="w-5 h-5 text-irctc-orange" />
              <span className="text-[7px] font-extrabold tracking-tighter leading-none mt-0.5 text-white">
                IRCTC
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white leading-tight">
                Indian Railways
              </h1>
              <span className="bg-irctc-orange text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wider uppercase">
                WIN Matrix
              </span>
            </div>
            <p className="text-xs text-blue-100 font-normal">
              Compound Delay &amp; Corridor Segmentation Analytics Engine &bull; 38,880 MasterPnC Scenarios
            </p>
          </div>
        </div>

        {/* Action Controls & DB Status */}
        <div className="flex items-center gap-3">
          {/* DB Indicator */}
          <div className="hidden md:flex items-center gap-2 bg-irctc-blue-dark/80 px-3 py-1.5 rounded-lg border border-white/10 text-xs">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <span className="text-slate-300 font-medium">DB WIN: </span>
              <span className={`font-bold ${dbStatus?.is_pristine ? 'text-emerald-400' : 'text-amber-300'}`}>
                {dbStatus?.is_pristine ? 'PRISTINE MASTER' : `SANDBOX (${dbStatus?.modifications_count || 0} MODS)`}
              </span>
            </div>
            <button
              type="button"
              onClick={onRefreshDbStatus}
              title="Refresh DB Status"
              className="ml-1 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Top Compute CTA */}
          <button
            type="button"
            onClick={onComputeClick}
            className="bg-irctc-orange hover:bg-irctc-orange-dark text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-md transition-all transform active:scale-95 flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-100 fill-amber-100" />
            <span>Compute Compound ETA</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs Bar */}
      {onSelectTab && (
        <div className="bg-white border-b border-slate-200 shadow-2xs">
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto py-1.5">
            <button
              type="button"
              onClick={() => onSelectTab('engine')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'engine'
                  ? 'bg-irctc-blue text-white shadow-xs'
                  : 'text-slate-600 hover:text-irctc-blue hover:bg-slate-100'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Compound Delay Engine &amp; Segments</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('corridors')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'corridors'
                  ? 'bg-irctc-blue text-white shadow-xs'
                  : 'text-slate-600 hover:text-irctc-blue hover:bg-slate-100'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>National Rail Corridors (7)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTab === 'corridors' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                /api/corridors
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('borders')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'borders'
                  ? 'bg-irctc-blue text-white shadow-xs'
                  : 'text-slate-600 hover:text-irctc-blue hover:bg-slate-100'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>State Border Divisions (29)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTab === 'borders' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                /api/state_borders
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

