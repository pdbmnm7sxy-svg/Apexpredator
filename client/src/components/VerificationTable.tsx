import React, { useState } from 'react';
import { Check, Edit2, Plus, Trash2, AlertCircle, RefreshCw, Eye, Sparkles, Shield, ShieldCheck } from 'lucide-react';
import { CanonicalParameterId, Measurement } from '../types/index.js';

interface VerificationTableProps {
  measurements: Measurement[];
  onMeasurementsChange: (updated: Measurement[]) => void;
  onReanalyze: () => void;
  isAnalyzing: boolean;
  onRunAgentAnalysis?: () => void;
  isAgentAnalyzing?: boolean;
  agentProgressStage?: string;
  hasConsent?: boolean;
  onConsentToggle?: () => void;
  onViewSourceDoc?: () => void;
}

const CANONICAL_OPTIONS: { id: CanonicalParameterId; label: string }[] = [
  { id: 'hemoglobin', label: 'Hemoglobin (Hb)' },
  { id: 'glucose_fasting', label: 'Fasting Blood Glucose' },
  { id: 'glucose_random', label: 'Random Blood Glucose' },
  { id: 'glucose_postprandial', label: 'Postprandial Blood Glucose' },
  { id: 'cholesterol_total', label: 'Total Cholesterol' },
  { id: 'cholesterol_ldl', label: 'LDL Cholesterol' },
  { id: 'cholesterol_hdl', label: 'HDL Cholesterol' },
  { id: 'triglycerides', label: 'Triglycerides' },
  { id: 'platelets', label: 'Platelet Count' },
  { id: 'creatinine', label: 'Serum Creatinine' },
  { id: 'wbc', label: 'WBC Count' },
  { id: 'blood_pressure_systolic', label: 'Systolic Blood Pressure' },
  { id: 'blood_pressure_diastolic', label: 'Diastolic Blood Pressure' },
];

export const VerificationTable: React.FC<VerificationTableProps> = ({
  measurements,
  onMeasurementsChange,
  onReanalyze,
  isAnalyzing,
  onRunAgentAnalysis,
  isAgentAnalyzing = false,
  agentProgressStage = '',
  hasConsent = false,
  onConsentToggle,
  onViewSourceDoc,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Measurement>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRow, setNewRow] = useState<Partial<Measurement>>({
    canonicalId: 'glucose_fasting',
    value: '',
    originalUnit: 'mg/dL',
    context: 'fasting',
  });

  const startEdit = (m: Measurement) => {
    setEditingId(m.id);
    setEditForm({
      value: m.value,
      originalUnit: m.originalUnit,
      context: m.context || '',
      extractedInterval: m.extractedInterval
        ? { ...m.extractedInterval }
        : {
            min: null,
            max: null,
            rawString: '',
            unit: m.originalUnit,
            source: 'report_printed',
            isMinInclusive: true,
            isMaxInclusive: true,
          },
    });
  };

  const saveEdit = (id: string) => {
    const num = parseFloat(editForm.value || '0');
    const updated = measurements.map((m) => {
      if (m.id !== id) return m;

      // Retain source evidence while marking user verified
      return {
        ...m,
        value: editForm.value || m.value,
        numericValue: isNaN(num) ? m.numericValue : num,
        normalizedValue: isNaN(num) ? m.normalizedValue : num,
        originalUnit: editForm.originalUnit !== undefined ? editForm.originalUnit : m.originalUnit,
        normalizedUnit: editForm.originalUnit !== undefined ? editForm.originalUnit : m.normalizedUnit,
        context: editForm.context || null,
        extractedInterval: editForm.extractedInterval?.rawString
          ? editForm.extractedInterval
          : m.extractedInterval,
        isUserModified: true,
        verificationStatus: 'user_edited' as const,
        warnings: m.warnings.filter((w) => !w.includes('Unit not specified')),
      };
    });

    onMeasurementsChange(updated);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const toggleVerify = (id: string) => {
    const updated = measurements.map((m) => {
      if (m.id !== id) return m;
      const nextStatus = m.verificationStatus === 'user_verified' ? 'extracted' : 'user_verified';
      return {
        ...m,
        verificationStatus: nextStatus as any,
      };
    });
    onMeasurementsChange(updated);
  };

  const deleteRow = (id: string) => {
    const updated = measurements.filter((m) => m.id !== id);
    onMeasurementsChange(updated);
  };

  const handleAddNewRow = () => {
    if (!newRow.value || !newRow.canonicalId) return;

    const num = parseFloat(newRow.value);
    const opt = CANONICAL_OPTIONS.find((c) => c.id === newRow.canonicalId);

    const created: Measurement = {
      id: `m-manual-${Date.now()}`,
      canonicalId: newRow.canonicalId as CanonicalParameterId,
      originalLabel: opt?.label || 'Manual Parameter',
      value: newRow.value,
      numericValue: isNaN(num) ? null : num,
      comparator: null,
      originalUnit: newRow.originalUnit || '',
      normalizedUnit: newRow.originalUnit || '',
      normalizedValue: isNaN(num) ? null : num,
      extractedInterval: newRow.extractedInterval?.rawString
        ? newRow.extractedInterval
        : null,
      context: newRow.context || null,
      sourcePage: 1,
      supportingText: 'Manually added by user during verification',
      extractionMethod: 'manual',
      confidence: 1.0,
      verificationStatus: 'user_added',
      warnings: [],
      isUserModified: true,
    };

    onMeasurementsChange([...measurements, created]);
    setIsAddingNew(false);
    setNewRow({
      canonicalId: 'glucose_fasting',
      value: '',
      originalUnit: 'mg/dL',
      context: 'fasting',
    });
  };

  return (
    <div className="w-full space-y-4 rounded-2xl bg-slate-900/80 border border-teal-500/30 p-6 shadow-xl">
      {/* Header and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>Extracted Measurements & Verification Table</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/40">
                {measurements.length} Parameters Extracted
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Human-in-the-loop review: verify extracted values, units, and ranges before or after running the deterministic rule engine. Source evidence is preserved.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Explicit Consent Opt-In Toggle */}
          {onConsentToggle && (
            <button
              onClick={onConsentToggle}
              type="button"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                hasConsent
                  ? 'bg-teal-950/80 text-teal-300 border-teal-500/40'
                  : 'bg-slate-850 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle explicit consent for cloud AI agent evaluation"
            >
              {hasConsent ? (
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>AI Consent: <strong className={hasConsent ? 'text-teal-300' : 'text-slate-400'}>{hasConsent ? 'Granted' : 'Off'}</strong></span>
            </button>
          )}

          {onViewSourceDoc && (
            <button
              onClick={onViewSourceDoc}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-teal-400" />
              <span>Source Text</span>
            </button>
          )}

          <button
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Test</span>
          </button>

          {/* Secondary Action: Deterministic Rule Engine */}
          <button
            onClick={onReanalyze}
            disabled={isAnalyzing || isAgentAnalyzing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Run local deterministic comparison rules without AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Evaluating...' : 'Deterministic Check'}</span>
          </button>

          {/* Primary Action: Analyze with AI Agent */}
          {onRunAgentAnalysis && (
            <button
              onClick={onRunAgentAnalysis}
              disabled={isAgentAnalyzing || isAnalyzing}
              className="flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 hover:from-teal-300 hover:via-emerald-300 hover:to-cyan-300 text-slate-950 shadow-lg shadow-teal-500/25 transition-all active:scale-95 disabled:opacity-60"
            >
              <Sparkles className={`w-3.5 h-3.5 text-slate-950 ${isAgentAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAgentAnalyzing ? (agentProgressStage || 'AI Agent Analyzing...') : 'Analyze with AI Agent'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress banner for Agent Analysis */}
      {isAgentAnalyzing && (
        <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/30 flex items-center justify-between text-xs text-teal-300 animate-pulse">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span className="font-medium">{agentProgressStage || 'AI Agent running bounded deterministic tools...'}</span>
          </div>
          <span className="text-[11px] font-mono text-teal-400/80">Step 1-5 In Progress</span>
        </div>
      )}

      {/* Manual Add Row Form */}
      {isAddingNew && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-teal-500/40 space-y-3 animate-in fade-in">
          <h4 className="text-xs font-semibold text-teal-300 flex items-center space-x-1">
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Medical Parameter Manually</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Parameter</label>
              <select
                value={newRow.canonicalId}
                onChange={(e) => setNewRow({ ...newRow, canonicalId: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-teal-400 outline-none"
              >
                {CANONICAL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Observed Value</label>
              <input
                type="text"
                placeholder="e.g. 145"
                value={newRow.value}
                onChange={(e) => setNewRow({ ...newRow, value: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-teal-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Unit</label>
              <input
                type="text"
                placeholder="e.g. mg/dL"
                value={newRow.originalUnit}
                onChange={(e) => setNewRow({ ...newRow, originalUnit: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-teal-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Context</label>
              <input
                type="text"
                placeholder="e.g. fasting, random"
                value={newRow.context || ''}
                onChange={(e) => setNewRow({ ...newRow, context: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-teal-400 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNewRow}
              className="px-3 py-1 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-md"
            >
              Add Parameter
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[11px]">
            <tr>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Parameter</th>
              <th className="py-3 px-3">Extracted Value</th>
              <th className="py-3 px-3">Unit</th>
              <th className="py-3 px-3">Printed Reference</th>
              <th className="py-3 px-3">Extraction Source</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {measurements.map((m) => {
              const isEditing = editingId === m.id;
              const isVerified =
                m.verificationStatus === 'user_verified' || m.verificationStatus === 'user_edited';

              return (
                <tr
                  key={m.id}
                  className={`hover:bg-slate-800/30 transition-colors ${
                    m.isUserModified ? 'bg-teal-950/20' : ''
                  }`}
                >
                  {/* Status Checkbox */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <button
                      onClick={() => toggleVerify(m.id)}
                      className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                        isVerified
                          ? 'bg-teal-950 text-teal-300 border border-teal-500/40'
                          : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:border-teal-500/50'
                      }`}
                      title="Toggle human verification status"
                    >
                      <Check className={`w-3 h-3 ${isVerified ? 'text-teal-400' : 'text-slate-600'}`} />
                      <span>{isVerified ? 'Verified' : 'Verify'}</span>
                    </button>
                  </td>

                  {/* Parameter Label */}
                  <td className="py-3 px-3 font-sans font-medium text-slate-200">
                    <div>
                      <span>{m.originalLabel}</span>
                      {m.context && (
                        <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-teal-300">
                          {m.context}
                        </span>
                      )}
                    </div>
                    {m.warnings.length > 0 && (
                      <div className="flex items-center space-x-1 text-[10px] text-amber-400 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{m.warnings[0]}</span>
                      </div>
                    )}
                  </td>

                  {/* Value */}
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.value || ''}
                        onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                        className="bg-slate-950 border border-teal-500/50 text-teal-200 rounded px-2 py-1 text-xs w-24 outline-none"
                      />
                    ) : (
                      <span className="font-semibold text-slate-100 text-sm">
                        {m.value}
                      </span>
                    )}
                  </td>

                  {/* Unit */}
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.originalUnit || ''}
                        onChange={(e) => setEditForm({ ...editForm, originalUnit: e.target.value })}
                        className="bg-slate-950 border border-teal-500/50 text-teal-200 rounded px-2 py-1 text-xs w-20 outline-none"
                      />
                    ) : m.originalUnit ? (
                      <span className="text-slate-300">{m.originalUnit}</span>
                    ) : (
                      <span className="text-amber-400 italic text-[11px]">Unspecified</span>
                    )}
                  </td>

                  {/* Printed Reference */}
                  <td className="py-3 px-3 text-slate-400 text-xs">
                    {m.extractedInterval ? (
                      <span className="text-slate-300 font-mono">
                        {m.extractedInterval.rawString}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        Using Configured Default
                      </span>
                    )}
                  </td>

                  {/* Honest Extraction Source Badges (No arbitrary fake 99%) */}
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-1 text-[11px]">
                      {m.verificationStatus === 'user_edited' ? (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-sans text-[10px] font-semibold">
                          User Edited
                        </span>
                      ) : m.verificationStatus === 'user_verified' ? (
                        <span className="px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/40 font-sans text-[10px] font-semibold">
                          User Verified
                        </span>
                      ) : m.extractionMethod === 'manual' ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 font-sans text-[10px] font-semibold">
                          User Added
                        </span>
                      ) : m.extractionMethod === 'pdf_raster_ocr' || m.extractionMethod === 'ocr' ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/40 font-sans text-[10px] font-semibold">
                          OCR Match
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-sans text-[10px] font-semibold">
                          Direct Text Match
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end space-x-1.5 font-sans">
                        <button
                          onClick={() => saveEdit(m.id)}
                          className="px-2 py-1 text-[11px] font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => startEdit(m)}
                          className="p-1 rounded text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors"
                          title="Edit extracted value, unit, or range"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteRow(m.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
