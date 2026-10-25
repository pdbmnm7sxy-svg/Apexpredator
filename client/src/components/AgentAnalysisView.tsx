import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  ShieldCheck,
  Cpu,
  Clock,
  Layers,
} from 'lucide-react';
import { AgentAnalysisResult, AgentFinding, AgentCombination } from '../types/index.js';

interface AgentAnalysisViewProps {
  agentAnalysis: AgentAnalysisResult | null;
  isLoading: boolean;
  onConsentToggle?: () => void;
  hasConsent?: boolean;
}

export const AgentAnalysisView: React.FC<AgentAnalysisViewProps> = ({
  agentAnalysis,
  isLoading,
}) => {
  const [showTrace, setShowTrace] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'findings' | 'combinations'>('summary');

  if (isLoading) {
    return (
      <div className="w-full p-8 rounded-2xl bg-slate-900/90 border border-teal-500/40 text-center space-y-4 shadow-xl">
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400 animate-pulse">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
        </div>
        <h3 className="text-base font-bold text-slate-100">
          AI Analysis Agent is Evaluating Report...
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Calling deterministic tools: normalizing measurement units, checking printed reference intervals, and validating combinations against clinical guidelines.
        </p>
        <div className="flex items-center justify-center space-x-2 text-xs text-teal-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <span>Bounded Tool Orchestration Active</span>
        </div>
      </div>
    );
  }

  if (!agentAnalysis) return null;

  // Handle Missing Key State honestly
  if (agentAnalysis.status === 'api_key_missing') {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>AI Analysis Unavailable: Missing API Key</span>
        </div>
        <p className="text-xs text-slate-300">
          {agentAnalysis.errorMessage}
        </p>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
          <span className="font-semibold text-slate-200 block">Next Steps:</span>
          <p>{agentAnalysis.nextStepSuggestion}</p>
        </div>
      </div>
    );
  }

  // Handle Consent Denial honestly
  if (agentAnalysis.status === 'consent_required') {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-3">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>Explicit Consent Required for AI Agent Analysis</span>
        </div>
        <p className="text-xs text-slate-300">
          MedLens strictly protects your privacy: medical report parameters are never transmitted to external AI providers without your explicit opt-in.
        </p>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
          <span className="font-semibold text-slate-200 block">Next Steps:</span>
          <p>{agentAnalysis.nextStepSuggestion}</p>
        </div>
      </div>
    );
  }

  // Handle Provider Failure honestly
  if (agentAnalysis.status === 'failed') {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-3">
        <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
          <AlertOctagon className="w-5 h-5 shrink-0" />
          <span>AI Analysis Failed</span>
        </div>
        <p className="text-xs text-rose-200">
          {agentAnalysis.errorMessage}
        </p>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
          <span className="font-semibold text-slate-200 block">Recommended Action:</span>
          <p>{agentAnalysis.nextStepSuggestion}</p>
        </div>
      </div>
    );
  }

  const outOfRangeCount = agentAnalysis.findings.filter(
    (f) => f.classification === 'low' || f.classification === 'high' || f.classification === 'critical'
  ).length;

  return (
    <div className="w-full space-y-4 rounded-2xl bg-slate-900/90 border border-teal-500/40 p-6 shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-400 border border-teal-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-100">
                AI-Agent Orchestrated Analysis
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-500/40 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>{agentAnalysis.provider === 'mock' ? 'Mock Test Provider' : `Gemini (${agentAnalysis.modelUsed})`}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Evidence-grounded medical report interpretation powered by bounded tool calling & deterministic verification.
            </p>
          </div>
        </div>

        {/* Trace Toggle & Metadata */}
        <div className="flex items-center space-x-2">
          {agentAnalysis.toolExecutionTrace.length > 0 && (
            <button
              onClick={() => setShowTrace(!showTrace)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span>{agentAnalysis.toolExecutionTrace.length} Tool Calls</span>
              {showTrace ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Tool Execution Trace (Collapsible) */}
      {showTrace && agentAnalysis.toolExecutionTrace.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-950/90 border border-teal-500/30 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold text-teal-300 border-b border-slate-800 pb-2">
            <span className="flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>Deterministic Tool Execution Log (Bounded Orchestration)</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Only verified tool outputs are used for interpretation
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {agentAnalysis.toolExecutionTrace.map((call, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-teal-400 font-bold text-[10px]">
                      Step {call.step}
                    </span>
                    <span className="text-teal-300 font-semibold">{call.toolName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Args:</span> {JSON.stringify(call.arguments)}
                  </div>
                </div>
                {call.durationMs !== undefined && (
                  <span className="text-[10px] text-slate-500 shrink-0 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{call.durationMs}ms</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'summary'
              ? 'bg-teal-950 text-teal-300 border border-teal-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Patient Summary & Questions
        </button>
        <button
          onClick={() => setActiveTab('findings')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'findings'
              ? 'bg-teal-950 text-teal-300 border border-teal-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Agent Findings ({agentAnalysis.findings.length})
        </button>
        <button
          onClick={() => setActiveTab('combinations')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'combinations'
              ? 'bg-teal-950 text-teal-300 border border-teal-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Co-Occurrence Combinations ({agentAnalysis.combinations.length})
        </button>
      </div>

      {/* TAB 1: Summary & Clinician Questions */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {/* Main Narrative Summary */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-teal-400" />
              <span>Evidence-Grounded Patient Summary</span>
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed">
              {agentAnalysis.patientFriendlySummary}
            </p>
          </div>

          {/* Cost-Aware Next-Step Recommendation */}
          {agentAnalysis.costAwareGuidance && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-teal-500/30 flex items-start space-x-3 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-500/40 text-[10px] font-bold uppercase shrink-0 mt-0.5">
                {agentAnalysis.costAwareGuidance.categoryLabel}
              </span>
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-200 block">
                  {agentAnalysis.costAwareGuidance.title} ({agentAnalysis.costAwareGuidance.costConsciousNavigation.recommendedCareSetting})
                </span>
                <p className="text-slate-400 text-[11px]">
                  {agentAnalysis.costAwareGuidance.costConsciousNavigation.costSavingNotes}
                </p>
              </div>
            </div>
          )}

          {/* Clinician Questions */}
          {agentAnalysis.suggestedQuestionsForDoctor.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Suggested Questions for Your Clinician</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {agentAnalysis.suggestedQuestionsForDoctor.map((q, idx) => (
                  <li key={idx}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Info & Limitations */}
          {agentAnalysis.missingInformationAndLimitations.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Analysis Boundaries & Limitations:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {agentAnalysis.missingInformationAndLimitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Agent Findings Table */}
      {activeTab === 'findings' && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Parameter</th>
                <th className="py-2.5 px-3">Original Value</th>
                <th className="py-2.5 px-3">Normalized Value</th>
                <th className="py-2.5 px-3">Reference Interval</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3">Tool Verified</th>
                <th className="py-2.5 px-3">Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {agentAnalysis.findings.map((f) => {
                const isOutOfRange = f.classification === 'low' || f.classification === 'high';
                return (
                  <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      {f.label}
                    </td>
                    <td className="py-2.5 px-3 text-slate-100 font-bold">
                      {f.originalValue} <span className="text-slate-400 text-[10px] font-normal">{f.originalUnit}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {f.normalizedValue} <span className="text-slate-500 text-[10px]">{f.normalizedUnit}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {f.referenceInterval?.rawString || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          f.classification === 'within_reference'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : f.classification === 'low'
                            ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                            : f.classification === 'high'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : f.classification === 'critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                        }`}
                      >
                        {f.classification.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {f.toolVerified ? (
                        <span className="text-emerald-400 flex items-center space-x-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[11px]">Pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300 text-[11px] max-w-xs truncate">
                      {f.conciseExplanation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Combinations */}
      {activeTab === 'combinations' && (
        <div className="space-y-3">
          {agentAnalysis.combinations.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 text-center">
              No concerning multi-analyte co-occurrences were identified for this report.
            </p>
          ) : (
            agentAnalysis.combinations.map((comb) => (
              <div
                key={comb.ruleId}
                className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                      {comb.reviewPriority.toUpperCase()} PRIORITY
                    </span>
                    <h4 className="text-xs font-bold text-slate-100">{comb.ruleTitle}</h4>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{comb.ruleId}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{comb.rationale}</p>
                <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2">
                  <span>Basis: <strong>Illustrative Co-Occurrence</strong> (Not causal or diagnostic)</span>
                  <span className="italic">{comb.disclaimer}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>{agentAnalysis.disclaimer}</span>
        <span className="text-[10px] text-slate-500 font-mono">v{agentAnalysis.analysisVersion}</span>
      </div>
    </div>
  );
};
