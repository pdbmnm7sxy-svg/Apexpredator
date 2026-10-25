import React from 'react';
import { Loader2, CheckCircle, FileText, Cpu, Eye, ShieldCheck, Layers } from 'lucide-react';

interface ProcessingProgressProps {
  currentStep: number; // 1 to 5
  statusMessage: string;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  currentStep,
  statusMessage,
}) => {
  const steps = [
    { id: 1, label: 'Document Ingestion', icon: FileText },
    { id: 2, label: 'OCR & Normalization', icon: Eye },
    { id: 3, label: 'Row & Alias Parsing', icon: Cpu },
    { id: 4, label: 'Reference Range Rules', icon: ShieldCheck },
    { id: 5, label: 'Combination Analysis', icon: Layers },
  ];

  return (
    <div className="w-full p-6 rounded-2xl bg-slate-900/90 border border-teal-500/30 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
          <h3 className="text-sm font-semibold text-slate-100">
            {statusMessage || 'Processing Clinical Report...'}
          </h3>
        </div>
        <span className="text-xs font-mono text-teal-400">
          Step {Math.min(currentStep, 5)} of 5
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
          style={{ width: `${(Math.min(currentStep, 5) / 5) * 100}%` }}
        />
      </div>

      {/* Steps Row */}
      <div className="grid grid-cols-5 gap-2 pt-1">
        {steps.map((s) => {
          const isDone = currentStep > s.id;
          const isCurrent = currentStep === s.id;
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={`flex flex-col items-center text-center space-y-1.5 p-2 rounded-lg transition-colors ${
                isCurrent
                  ? 'bg-teal-950/60 border border-teal-500/40 text-teal-200'
                  : isDone
                  ? 'text-slate-300'
                  : 'text-slate-600'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isDone
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                    : isCurrent
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className="text-[10px] font-medium leading-tight line-clamp-1">
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
