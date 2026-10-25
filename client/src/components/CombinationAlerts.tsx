import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Stethoscope,
  Info,
} from 'lucide-react';
import { CombinationAlert } from '../types/index.js';

interface CombinationAlertsProps {
  alerts: CombinationAlert[];
}

export const CombinationAlerts: React.FC<CombinationAlertsProps> = ({ alerts }) => {
  const [showNotEvaluable, setShowNotEvaluable] = useState(false);

  const matchedAlerts = alerts.filter((a) => a.status === 'matched');
  const notMatchedAlerts = alerts.filter((a) => a.status === 'not_matched');
  const notEvaluableAlerts = alerts.filter((a) => a.status === 'not_evaluable');

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-rose-900/30';
      case 'high':
        return 'bg-amber-950/90 text-amber-300 border-amber-500/50 shadow-amber-900/30';
      case 'moderate':
        return 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50 shadow-cyan-900/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="w-full space-y-4 rounded-2xl bg-slate-900/80 border border-teal-500/30 p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>Concerning Combination Rules Engine</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30">
                {matchedAlerts.length} Active Co-Occurrence Alert(s)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Evaluates multi-analyte physiological relationships from the same report date. (Hackathon Challenge Extension)
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Source: Synthetic Rule Catalog v1.0
        </div>
      </div>

      {/* Matched Alerts */}
      {matchedAlerts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {matchedAlerts.map((alert) => (
            <div
              key={alert.ruleId}
              className="p-5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-lg space-y-3.5 relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400" />

              {/* Title & Priority Badge */}
              <div className="flex flex-wrap items-start justify-between gap-2 pt-1">
                <div>
                  <div className="flex items-center space-x-2">
                    <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                    <h3 className="font-bold text-slate-100 text-sm">
                      {alert.ruleTitle}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
                    Rule ID: {alert.ruleId} • {alert.referenceSource}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-md ${getPriorityBadge(
                    alert.reviewPriority
                  )}`}
                >
                  {alert.reviewPriority} Review Priority
                </span>
              </div>

              {/* Contributing Measurements */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-300">
                  Contributing Analyte Findings:
                </span>
                <div className="flex flex-wrap gap-2">
                  {alert.contributingMeasurements.map((cm, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-700/80 flex items-center space-x-2 text-xs"
                    >
                      <span className="font-semibold text-slate-200">
                        {cm.label}:
                      </span>
                      <span className="font-mono text-amber-300 font-bold">
                        {cm.value} {cm.unit}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                          cm.classification === 'critical'
                            ? 'bg-rose-950 text-rose-300'
                            : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {cm.classification}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plain Explanation */}
              <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                <div className="flex items-start space-x-2">
                  <Stethoscope className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-100 block mb-1">
                      Clinical Co-Occurrence Rationale:
                    </strong>
                    <span>{alert.explanation}</span>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 pt-1">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {alert.disclaimer} Always discuss with a physician.
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
          <span className="text-sm font-semibold text-slate-300">
            No concerning multi-analyte combinations detected in this report.
          </span>
          <p className="text-xs text-slate-400">
            All evaluated cross-parameter rules passed or parameters fell within acceptable baseline bounds.
          </p>
        </div>
      )}

      {/* Accordion for Rules Not Matched / Not Evaluable */}
      <div className="pt-2 border-t border-slate-800">
        <button
          onClick={() => setShowNotEvaluable(!showNotEvaluable)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors"
        >
          <span className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>
              View Rule Catalog Status ({notMatchedAlerts.length} Not Matched,{' '}
              {notEvaluableAlerts.length} Not Evaluable Due to Missing Tests)
            </span>
          </span>
          {showNotEvaluable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showNotEvaluable && (
          <div className="mt-3 space-y-2.5 animate-in fade-in">
            {/* Not Evaluable */}
            {notEvaluableAlerts.map((na) => (
              <div
                key={na.ruleId}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">
                    {na.ruleTitle} ({na.ruleId})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    Not Evaluable
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {na.explanation}
                </p>
              </div>
            ))}

            {/* Not Matched */}
            {notMatchedAlerts.map((nm) => (
              <div
                key={nm.ruleId}
                className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-300">
                    {nm.ruleTitle} ({nm.ruleId})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 uppercase">
                    Conditions Not Met
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {nm.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
