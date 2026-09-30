'use client';

import React from 'react';
import { FileSearch, Activity, Network, ShieldCheck } from 'lucide-react';
import { ExplanationResponse } from '@/types';

interface DelayExplanationProps {
  explanation: ExplanationResponse | null;
}

export const DelayExplanation: React.FC<DelayExplanationProps> = ({ explanation }) => {
  if (!explanation) return null;

  const isLate = explanation.status === 'LATE';

  return (
    <div className="irctc-card p-5 mb-5 border-l-4 border-l-irctc-blue">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-irctc-blue" />
          <h2 className="text-base font-bold text-irctc-blue">
            Attribute: Compound Delay Calculation &amp; Dispatch Explanation
          </h2>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
            isLate
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}
        >
          {explanation.status}
        </span>
      </div>

      {/* Narrative Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* 1. Kinetic & Equipment */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wide mb-2">
            <Activity className="w-4 h-4 text-rose-600" />
            <span>1. Kinetic &amp; Equipment Root Causes</span>
          </div>
          <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc">
            {explanation.primary_reasons.map((reason, idx) => (
              <li key={idx} className="leading-relaxed">
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* 2. Cascading Domino Shocks */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
            <Network className="w-4 h-4 text-amber-600" />
            <span>2. Network Precedence &amp; Preceding Constraints</span>
          </div>
          <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc">
            {explanation.cascade_reasons.map((reason, idx) => (
              <li key={idx} className="leading-relaxed">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. Timetable Recovery & Directive */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>3. Timetable Buffer Recovery &amp; Section Dispatch Assessment</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed mb-3">
          {explanation.recovery_summary}
        </p>
        <div className="bg-irctc-blue-light/70 border border-irctc-blue/20 rounded-md p-2.5 text-xs text-irctc-blue font-semibold">
          {explanation.dispatch_directive}
        </div>
      </div>
    </div>
  );
};
