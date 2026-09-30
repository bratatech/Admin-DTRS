'use client';

import React from 'react';
import { Layers, AlertTriangle, Clock } from 'lucide-react';
import { CascadedDelays as CascadedDelaysType } from '@/types';

interface CascadedDelaysProps {
  cascaded: CascadedDelaysType | null;
}

export const CascadedDelays: React.FC<CascadedDelaysProps> = ({ cascaded }) => {
  if (!cascaded) return null;

  const count = cascaded.total_affected_trains;
  const totalMins = cascaded.cumulative_knock_on_mins;

  return (
    <div className="irctc-card p-5 mb-5 border-l-4 border-l-rose-600">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold text-irctc-blue">
              Attribute: Cascaded Delays &amp; Temporal Train Overlays
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Knock-on network disruptions transmitted to trailing and concurrent services sharing this DTRS segment window
          </p>
        </div>

        {/* Aggregate Counters */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Overlaid Trains
            </span>
            <span className="text-lg font-extrabold font-mono text-rose-600 leading-tight">
              {count}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Cumulative Ripple Delay
            </span>
            <span className="text-lg font-extrabold font-mono text-amber-600 leading-tight">
              +{totalMins.toFixed(1)}m
            </span>
          </div>
        </div>
      </div>

      {/* Overlaid Trains Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-irctc-blue text-white">
              <th className="py-2 px-3 font-semibold w-36">Train No / Name</th>
              <th className="py-2 px-3 font-semibold w-24">Tier</th>
              <th className="py-2 px-3 font-semibold w-48">Corridor Hop / Section</th>
              <th className="py-2 px-3 font-semibold w-32">Time Window</th>
              <th className="py-2 px-3 font-semibold">Conflict Type &amp; Dispatch Impact</th>
              <th className="py-2 px-3 font-semibold text-right w-32">Transmitted Delay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {cascaded.overlaid_trains.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500 text-xs italic">
                  No temporal train overlay conflicts detected on this corridor segment under current conditions.
                </td>
              </tr>
            ) : (
              cascaded.overlaid_trains.map((train, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-irctc-blue">{train.train_no}</span>
                    <div className="text-[11px] font-semibold text-slate-800 truncate max-w-[140px]">
                      {train.train_name}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {train.train_tier}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-700">
                    <div className="font-semibold">
                      {train.station_section || train.segment_hop || 'Section Hop'}
                    </div>
                    {train.corridor_segment && (
                      <div className="font-mono text-[10px] text-slate-400">
                        {train.corridor_segment}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{train.scheduled_window}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">
                    {train.conflict_type}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                    +{train.transmitted_delay_mins.toFixed(1)} mins
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
