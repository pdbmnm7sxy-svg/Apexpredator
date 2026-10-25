import React from 'react';
import { X, Play, Sparkles, CheckCircle2, AlertCircle, AlertOctagon, HelpCircle, Eye } from 'lucide-react';

interface SampleItem {
  id: string;
  name: string;
  category: string;
  description: string;
  expectedFindings: string;
  reportDate: string;
}

interface SampleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleItem[];
  onSelectSample: (id: string) => void;
  isLoading: boolean;
}

export const SampleSelector: React.FC<SampleSelectorProps> = ({
  isOpen,
  onClose,
  samples,
  onSelectSample,
  isLoading,
}) => {
  if (!isOpen) return null;

  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'Baseline Normal':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30';
      case 'Isolated Finding':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30';
      case 'Combination Alert':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/30';
      case 'Needs Verification':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30';
      case 'OCR Scanned Test':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/30';
      default:
        return 'bg-teal-950/80 text-teal-300 border-teal-500/30';
    }
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'Baseline Normal':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'Combination Alert':
        return <AlertOctagon className="w-4 h-4 text-amber-400" />;
      case 'Needs Verification':
        return <HelpCircle className="w-4 h-4 text-indigo-400" />;
      case 'OCR Scanned Test':
        return <Eye className="w-4 h-4 text-purple-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-teal-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30">
              <Sparkles className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Choose a Synthetic Clinical Sample
              </h2>
              <p className="text-xs text-slate-400">
                Instant testing scenarios covering normal panels, critical bounds, combinations, OCR, and trends
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {samples.map((sample) => (
              <div
                key={sample.id}
                onClick={() => !isLoading && onSelectSample(sample.id)}
                className="group relative p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/40 cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getBadgeColor(
                        sample.category
                      )}`}
                    >
                      {getIcon(sample.category)}
                      <span>{sample.category}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {sample.reportDate}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-200 group-hover:text-teal-300 transition-colors text-sm mb-1">
                    {sample.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                    {sample.description}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-teal-400/90 font-medium truncate pr-2">
                    🎯 {sample.expectedFindings}
                  </div>
                  <button
                    disabled={isLoading}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-teal-600/30 hover:bg-teal-600 text-teal-200 hover:text-white text-xs font-semibold shrink-0 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Synthetic demo data generated strictly for prototype validation.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
