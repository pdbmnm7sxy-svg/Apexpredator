import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  BookOpen,
  Filter,
} from 'lucide-react';
import { AbnormalityClassification, Finding } from '../types/index.js';

interface FindingsTableProps {
  findings: Finding[];
}

export const FindingsTable: React.FC<FindingsTableProps> = ({ findings }) => {
  const [filter, setFilter] = useState<'all' | 'abnormal' | 'normal' | 'verify'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFindings = findings.filter((f) => {
    if (filter === 'abnormal') {
      return (
        f.classification === 'high' ||
        f.classification === 'low' ||
        f.classification === 'critical'
      );
    }
    if (filter === 'normal') {
      return f.classification === 'within_reference';
    }
    if (filter === 'verify') {
      return (
        f.classification === 'needs_verification' ||
        f.classification === 'unable_to_classify'
      );
    }
    return true;
  });

  const getStatusBadge = (status: AbnormalityClassification) => {
    switch (status) {
      case 'within_reference':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Normal</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>High</span>
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Low</span>
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/90 text-rose-300 border border-rose-500/50 animate-pulse">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Critical</span>
          </span>
        );
      case 'needs_verification':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Needs Review</span>
          </span>
        );
      case 'unable_to_classify':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <FileQuestion className="w-3.5 h-3.5 text-slate-400" />
            <span>Unclassified</span>
          </span>
        );
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="w-full space-y-4 rounded-2xl bg-slate-900/80 border border-teal-500/30 p-6 shadow-xl">
      {/* Header and Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <span>Deterministic Abnormality Findings</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {filteredFindings.length} of {findings.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Rule-based classifications according to printed report intervals and standard clinical thresholds
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({findings.length})
          </button>
          <button
            onClick={() => setFilter('abnormal')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === 'abnormal'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Abnormal & Critical (
            {
              findings.filter(
                (f) =>
                  f.classification === 'high' ||
                  f.classification === 'low' ||
                  f.classification === 'critical'
              ).length
            }
            )
          </button>
          <button
            onClick={() => setFilter('normal')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === 'normal'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Normal ({findings.filter((f) => f.classification === 'within_reference').length})
          </button>
          <button
            onClick={() => setFilter('verify')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === 'verify'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Review (
            {
              findings.filter(
                (f) =>
                  f.classification === 'needs_verification' ||
                  f.classification === 'unable_to_classify'
              ).length
            }
            )
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[11px]">
            <tr>
              <th className="py-3 px-3.5">Parameter</th>
              <th className="py-3 px-3.5">Observed Value</th>
              <th className="py-3 px-3.5">Status</th>
              <th className="py-3 px-3.5">Reference Interval</th>
              <th className="py-3 px-3.5">Reference Source</th>
              <th className="py-3 px-3.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredFindings.map((f) => {
              const isExpanded = expandedId === f.id;

              return (
                <React.Fragment key={f.id}>
                  <tr
                    onClick={() => toggleExpand(f.id)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    {/* Name */}
                    <td className="py-3 px-3.5 font-sans font-medium text-slate-200">
                      <span>{f.label}</span>
                    </td>

                    {/* Observed Value */}
                    <td className="py-3 px-3.5 font-bold text-slate-100 text-sm">
                      <span>{f.observedValue}</span>{' '}
                      <span className="text-xs font-normal text-slate-400 font-sans">
                        {f.unit}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 font-sans">
                      {getStatusBadge(f.classification)}
                    </td>

                    {/* Reference Interval */}
                    <td className="py-3 px-3.5 text-slate-300">
                      {f.referenceInterval ? (
                        <span>{f.referenceInterval.rawString}</span>
                      ) : (
                        <span className="text-slate-400 italic font-sans text-[11px]">
                          None Available
                        </span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-3.5 text-slate-400 text-[11px] font-sans">
                      {f.referenceInterval?.source === 'report_printed' ? (
                        <span className="text-teal-400">Printed in Report</span>
                      ) : (
                        <span className="text-slate-400">Configured Demo Range</span>
                      )}
                    </td>

                    {/* Expand Toggle */}
                    <td className="py-3 px-3.5 text-right font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(f.id);
                        }}
                        className="inline-flex items-center space-x-1 text-xs text-teal-400 hover:text-teal-300 transition-colors"
                      >
                        <span>{isExpanded ? 'Hide' : 'Why?'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expandable "Why was this flagged?" Evidence Panel */}
                  {isExpanded && (
                    <tr className="bg-slate-950/90 font-sans text-xs">
                      <td colSpan={6} className="p-4 border-t border-b border-teal-500/20">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Explanation */}
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="flex items-center space-x-1.5 text-teal-300 font-semibold text-xs">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Rule Evaluation & Explanation</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed text-xs">
                              {f.plainExplanation}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400 block pt-1">
                              Triggered Rule: {f.triggeredRule}
                            </span>
                          </div>

                          {/* Clinician Suggestion */}
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="flex items-center space-x-1.5 text-cyan-300 font-semibold text-xs">
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Clinical Discussion Suggestion</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed text-xs">
                              {f.clinicalSuggestion}
                            </p>
                          </div>

                          {/* Source Evidence */}
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-xs">
                            <span className="text-slate-400 block text-[11px] font-sans font-semibold">
                              Original Document Snippet:
                            </span>
                            <div className="p-2 rounded bg-slate-950 text-slate-300 text-[11px] whitespace-pre-wrap border border-slate-800">
                              {f.supportingText || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
