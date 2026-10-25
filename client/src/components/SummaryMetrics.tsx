import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  FileQuestion,
  BarChart3,
  Info,
} from 'lucide-react';
import { ReportSummaryMetrics } from '../types/index.js';

interface SummaryMetricsProps {
  metrics: ReportSummaryMetrics;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({ metrics }) => {
  return (
    <div className="w-full space-y-3">
      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Analyzed */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Evaluated</span>
            <BarChart3 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-100">
              {metrics.analyzed}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              of {metrics.totalExtracted} extracted
            </span>
          </div>
        </div>

        {/* Normal */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-medium">Within Range</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-300">
              {metrics.normalCount}
            </span>
            <span className="text-[11px] text-emerald-400/80 block mt-0.5">
              Expected bounds
            </span>
          </div>
        </div>

        {/* Abnormal */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-medium">Out of Range</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-300">
              {metrics.abnormalCount}
            </span>
            <span className="text-[11px] text-amber-400/80 block mt-0.5">
              Mild/moderate deviations
            </span>
          </div>
        </div>

        {/* Critical Alerts */}
        <div
          className={`p-4 rounded-xl bg-slate-900/80 border flex flex-col justify-between ${
            metrics.criticalCount > 0
              ? 'border-rose-500/50 bg-rose-950/20'
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-medium">Critical Values</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl font-bold ${
                metrics.criticalCount > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {metrics.criticalCount}
            </span>
            <span className="text-[11px] text-rose-400/80 block mt-0.5">
              Urgent threshold rule
            </span>
          </div>
        </div>

        {/* Needs Verification */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-indigo-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-xs font-medium">Verify Needed</span>
            <HelpCircle className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-indigo-300">
              {metrics.verificationNeededCount}
            </span>
            <span className="text-[11px] text-indigo-400/80 block mt-0.5">
              Missing unit / ambiguous
            </span>
          </div>
        </div>

        {/* Evaluated In-Range Ratio */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-teal-950/40 border border-teal-500/30 flex flex-col justify-between relative group">
          <div className="flex items-center justify-between text-teal-300">
            <span className="text-xs font-semibold">In-Range Ratio</span>
            <Info className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-teal-200">
              {metrics.normalCount} <span className="text-sm font-normal text-slate-400">/ {Math.max(1, metrics.analyzed)}</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Tests within expected bounds
            </span>
          </div>

          {/* Hover Tooltip explaining formula */}
          <div className="absolute inset-x-0 -bottom-2 translate-y-full hidden group-hover:block z-30 p-2.5 rounded-lg bg-slate-950 border border-teal-500/40 text-[10px] text-slate-300 shadow-xl">
            <strong>Descriptive Ratio:</strong> {metrics.normalCount} of {metrics.analyzed} evaluated parameters fall within reference intervals. This is a descriptive parameter count, NOT a composite clinical score or diagnostic percentage.
          </div>
        </div>
      </div>
    </div>
  );
};
