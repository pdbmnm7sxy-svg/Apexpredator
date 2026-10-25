import React from 'react';
import { Activity, ShieldCheck, Database, RefreshCw, FileText, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  storageMode: 'session_memory' | 'mongodb_persistent';
  onReset: () => void;
  hasActiveReport: boolean;
  onOpenSamples: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  storageMode,
  onReset,
  hasActiveReport,
  onOpenSamples,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-teal-500/20 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-700 shadow-lg shadow-teal-500/20">
            <Activity className="w-6 h-6 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-200 via-cyan-100 to-white bg-clip-text text-transparent">
                MedLens
              </h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-500/30">
                Prototype v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Explainable Medical Report Analyzer • Healthcare & MedTech
            </p>
          </div>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Storage Mode Pill */}
          <div
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              storageMode === 'mongodb_persistent'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
            }`}
            title={
              storageMode === 'mongodb_persistent'
                ? 'Connected to MongoDB database for persistent history'
                : 'Temporary Session Mode: MongoDB not connected. Data remains in this browser session.'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span>
              {storageMode === 'mongodb_persistent'
                ? 'MongoDB Persistent'
                : 'Temporary Session Mode (In-Memory)'}
            </span>
          </div>

          {/* Engine Active Indicator */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900/90 text-teal-300 border border-teal-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Deterministic Rule Engine Active</span>
          </div>

          {/* Try Sample Button */}
          <button
            onClick={onOpenSamples}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md shadow-teal-700/20 active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Try Sample Report</span>
          </button>

          {/* Reset Button */}
          {hasActiveReport && (
            <button
              onClick={onReset}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 transition-all active:scale-95"
              title="Clear current report and start over"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Disclaimer Banner */}
      <div className="mt-2.5 max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-between text-[11px] bg-slate-900/70 border border-teal-500/20 text-slate-300 px-3 py-1 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Educational prototype.</strong> Findings require professional medical interpretation. Not intended for direct diagnostic decisions.
            </span>
          </div>
          <span className="hidden md:inline text-slate-400 text-[10px]">
            Architecture based on MEDGPT framework (prototype extensions)
          </span>
        </div>
      </div>
    </header>
  );
};
