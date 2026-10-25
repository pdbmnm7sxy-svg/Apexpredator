import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  HeartPulse,
  HelpCircle,
  Info,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Activity,
  Zap,
} from 'lucide-react';
import {
  CostAwareGuidance,
  ClinicalContext,
  NextStepCategory,
} from '../types/index.js';

interface CostAwareGuidanceCardProps {
  guidance: CostAwareGuidance | null | undefined;
  clinicalContext?: ClinicalContext;
  onUpdateContext?: (updatedContext: ClinicalContext) => Promise<void> | void;
  isLoading?: boolean;
}

const SYMPTOM_OPTIONS = [
  { id: 'chest_pain', label: 'Chest Pain / Pressure', isRedFlag: true },
  { id: 'shortness_of_breath', label: 'Severe Shortness of Breath', isRedFlag: true },
  { id: 'severe_dizziness_syncope', label: 'Severe Dizziness / Fainting', isRedFlag: true },
  { id: 'uncontrolled_bleeding', label: 'Uncontrolled Bleeding', isRedFlag: true },
  { id: 'sudden_weakness', label: 'Sudden Weakness / Numbness', isRedFlag: true },
  { id: 'frequent_urination_thirst', label: 'Frequent Urination / Excessive Thirst', isRedFlag: false },
  { id: 'unexplained_weight_loss', label: 'Unexplained Weight Loss', isRedFlag: false },
  { id: 'persistent_fever', label: 'Persistent Fever / Chills', isRedFlag: false },
  { id: 'progressive_fatigue', label: 'Progressive Unexplained Fatigue', isRedFlag: false },
  { id: 'none', label: 'None (No current symptoms / Routine check)', isRedFlag: false },
];

const DURATION_OPTIONS = [
  { id: 'unspecified', label: 'Select symptom duration...' },
  { id: 'acute_hours', label: 'Sudden / Acute (< 24 Hours)' },
  { id: 'days', label: 'Several Days (2–7 Days)' },
  { id: 'weeks_to_months', label: 'Weeks to Months' },
  { id: 'chronic', label: 'Chronic / Long-standing' },
  { id: 'none_asymptomatic', label: 'Asymptomatic / No Symptoms' },
];

const CONDITION_OPTIONS = [
  { id: 'diabetes', label: 'Diabetes / Prediabetes' },
  { id: 'hypertension', label: 'High Blood Pressure' },
  { id: 'heart_disease', label: 'Cardiovascular Disease' },
  { id: 'kidney_disease', label: 'Chronic Kidney Disease' },
  { id: 'anemia', label: 'Anemia / Blood Disorder' },
  { id: 'none', label: 'No Known Pre-existing Conditions' },
];

const MEDICATION_OPTIONS = [
  { id: 'insulin', label: 'Insulin / Diabetes Medications' },
  { id: 'antihypertensive', label: 'Blood Pressure Medications' },
  { id: 'statin', label: 'Statins / Cholesterol Medications' },
  { id: 'blood_thinner', label: 'Blood Thinners / Anticoagulants' },
  { id: 'none', label: 'No Regular Prescription Medications' },
];

export const CostAwareGuidanceCard: React.FC<CostAwareGuidanceCardProps> = ({
  guidance,
  clinicalContext = {},
  onUpdateContext,
  isLoading = false,
}) => {
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(
    clinicalContext.symptoms || []
  );
  const [selectedDuration, setSelectedDuration] = useState<string>(
    clinicalContext.symptomDuration || 'unspecified'
  );
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    clinicalContext.existingConditions || []
  );
  const [selectedMeds, setSelectedMeds] = useState<string[]>(
    clinicalContext.medications || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!guidance) return null;

  const toggleSymptom = (id: string) => {
    if (id === 'none') {
      setSelectedSymptoms(['none']);
      return;
    }
    const filtered = selectedSymptoms.filter((s) => s !== 'none');
    if (filtered.includes(id)) {
      setSelectedSymptoms(filtered.filter((s) => s !== id));
    } else {
      setSelectedSymptoms([...filtered, id]);
    }
  };

  const toggleCondition = (id: string) => {
    if (id === 'none') {
      setSelectedConditions(['none']);
      return;
    }
    const filtered = selectedConditions.filter((c) => c !== 'none');
    if (filtered.includes(id)) {
      setSelectedConditions(filtered.filter((c) => c !== id));
    } else {
      setSelectedConditions([...filtered, id]);
    }
  };

  const toggleMed = (id: string) => {
    if (id === 'none') {
      setSelectedMeds(['none']);
      return;
    }
    const filtered = selectedMeds.filter((m) => m !== 'none');
    if (filtered.includes(id)) {
      setSelectedMeds(filtered.filter((m) => m !== id));
    } else {
      setSelectedMeds([...filtered, id]);
    }
  };

  const handleSaveContext = async () => {
    if (!onUpdateContext) return;
    setIsSubmitting(true);
    try {
      await onUpdateContext({
        ...clinicalContext,
        symptoms: selectedSymptoms,
        symptomDuration: selectedDuration as any,
        existingConditions: selectedConditions,
        medications: selectedMeds,
      });
      setIsContextDrawerOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Styling maps based on Category
  const getCategoryStyles = (category: NextStepCategory) => {
    switch (category) {
      case 'emergency_attention':
        return {
          border: 'border-rose-500/50',
          bg: 'bg-rose-950/25',
          headerBg: 'bg-gradient-to-r from-rose-950/80 via-red-900/60 to-rose-950/80',
          badgeBg: 'bg-rose-600 text-white',
          icon: <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0" />,
          titleColor: 'text-rose-200',
        };
      case 'prompt_medical_review':
        return {
          border: 'border-amber-500/50',
          bg: 'bg-amber-950/20',
          headerBg: 'bg-gradient-to-r from-amber-950/70 via-orange-950/60 to-amber-950/70',
          badgeBg: 'bg-amber-500 text-slate-950',
          icon: <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />,
          titleColor: 'text-amber-200',
        };
      case 'routine_follow_up':
        return {
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-950/20',
          headerBg: 'bg-gradient-to-r from-cyan-950/70 via-slate-900 to-cyan-950/70',
          badgeBg: 'bg-cyan-600 text-white',
          icon: <Calendar className="w-6 h-6 text-cyan-400 shrink-0" />,
          titleColor: 'text-cyan-200',
        };
      case 'self_care_and_monitoring':
      default:
        return {
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-950/20',
          headerBg: 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70',
          badgeBg: 'bg-emerald-600 text-white',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />,
          titleColor: 'text-emerald-200',
        };
    }
  };

  const styles = getCategoryStyles(guidance.category);

  return (
    <div
      className={`w-full rounded-2xl border ${styles.border} ${styles.bg} p-6 shadow-2xl space-y-6 transition-all`}
    >
      {/* Header Bar */}
      <div className={`p-4 rounded-xl ${styles.headerBg} border border-slate-800 flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex items-start space-x-3.5">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-700/60">
            {styles.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${styles.badgeBg}`}
              >
                {guidance.categoryLabel}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {guidance.urgencyLevel.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <h3 className={`text-base font-bold mt-1 ${styles.titleColor}`}>
              {guidance.title}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {guidance.headline}
            </p>
          </div>
        </div>

        {/* Clinical Context Toggle Button */}
        <button
          onClick={() => setIsContextDrawerOpen(!isContextDrawerOpen)}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/40 transition-colors shadow-sm"
        >
          <Stethoscope className="w-4 h-4 text-teal-400" />
          <span>
            {guidance.contextCompleteness === 'insufficient'
              ? 'Complete Clinical Context (Required)'
              : 'Edit Symptoms & Context'}
          </span>
          {isContextDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Insufficient Information Warning Banner */}
      {guidance.contextCompleteness !== 'complete' && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-start space-x-2.5 animate-in fade-in">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-amber-300 block">
              Clinical Context Is Incomplete (No Symptoms or Duration Provided)
            </strong>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Laboratory numbers cannot be safely interpreted in isolation. Because you have not yet provided information regarding symptoms, duration, pre-existing conditions, or current medications, this recommendation is a preliminary laboratory-based tier and <strong>cannot confirm that you are healthy or risk-free</strong>. Please provide your context below rather than relying on reassurance from normal numbers alone.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Clinical Context Intake Form (Collapsible) */}
      {isContextDrawerOpen && (
        <div className="p-5 rounded-xl bg-slate-950 border border-teal-500/40 space-y-4 animate-in fade-in">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Clinical Context Intake Questionnaire
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">
              Helps calibrate proportionate next-step recommendations
            </span>
          </div>

          {/* 1. Symptoms */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              1. Are you currently experiencing any symptoms? (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_OPTIONS.map((opt) => {
                const isSelected = selectedSymptoms.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleSymptom(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? opt.isRedFlag
                          ? 'bg-rose-950 text-rose-300 border-rose-500'
                          : 'bg-teal-950 text-teal-300 border-teal-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {opt.isRedFlag && '🚨 '}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Symptom Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              2. How long have symptoms been present?
            </label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              className="w-full sm:w-80 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:border-teal-400 outline-none"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pre-existing Conditions */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              3. Do you have any diagnosed pre-existing conditions?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_OPTIONS.map((opt) => {
                const isSelected = selectedConditions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleCondition(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Current Medications */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              4. Are you taking regular prescription medications?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MEDICATION_OPTIONS.map((opt) => {
                const isSelected = selectedMeds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleMed(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-purple-950 text-purple-300 border-purple-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Context Button */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setIsContextDrawerOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveContext}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Evaluating Context...' : 'Update Context & Recalculate Guidance'}
            </button>
          </div>
        </div>
      )}

      {/* Main Rationale & Supporting Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supporting Findings */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <HeartPulse className="w-4 h-4 text-teal-400" />
            <span>Why This Next Step Is Recommended</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {guidance.rationale}
          </p>
          {guidance.supportingFindings.length > 0 && (
            <div className="pt-2 border-t border-slate-900 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block">Supporting Laboratory Findings:</span>
              <ul className="space-y-1 text-xs text-slate-300">
                {guidance.supportingFindings.map((sf, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-teal-400 font-bold">•</span>
                    <span>
                      <strong className="text-slate-200">{sf.label}</strong>: {sf.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {guidance.supportingSymptoms.length > 0 && (
            <div className="pt-2 border-t border-slate-900 space-y-1">
              <span className="text-[11px] font-semibold text-amber-400 block">Reported Symptoms:</span>
              <ul className="space-y-0.5 text-xs text-slate-300">
                {guidance.supportingSymptoms.map((ss, idx) => (
                  <li key={idx} className="flex items-center space-x-1.5 text-amber-200">
                    <span>⚠️</span>
                    <span>{ss}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Cost-Conscious Care Navigation */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
          <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center space-x-1.5">
            <DollarSign className="w-4 h-4 text-teal-400" />
            <span>Cost-Conscious Care Navigation</span>
          </h4>
          <div className="p-2.5 rounded-lg bg-teal-950/30 border border-teal-500/20 text-xs text-teal-200 space-y-1">
            <span className="font-semibold block text-teal-300">Recommended Care Setting:</span>
            <p className="font-bold text-slate-100">{guidance.costConsciousNavigation.recommendedCareSetting}</p>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {guidance.costConsciousNavigation.costSavingNotes}
          </p>
          <div className="pt-2 border-t border-slate-900 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 block">Lower-Cost Healthcare Options:</span>
            <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
              {guidance.costConsciousNavigation.lowerCostOptions.map((opt, idx) => (
                <li key={idx}>{opt}</li>
              ))}
            </ul>
          </div>
          <span className="text-[10px] text-slate-400 italic block pt-1">
            *MedLens suggests care setting categories (such as public clinics, primary care, or telehealth) to protect your wallet and does not invent local clinic names or prices.
          </span>
        </div>
      </div>

      {/* Essential Clinical Caveats & Disclaimers */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs text-slate-300">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold border-b border-slate-900 pb-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Crucial Medical & Self-Care Boundaries</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
          <div className="space-y-1">
            <strong className="text-slate-200 block">1. Reference Ranges & Health:</strong>
            <p className="text-slate-400">
              {guidance.educationalCaveats.referenceRangeDisclaimer}
            </p>
          </div>
          <div className="space-y-1">
            <strong className="text-slate-200 block">2. Isolated Out-of-Range Results:</strong>
            <p className="text-slate-400">
              {guidance.educationalCaveats.isolatedAbnormalDisclaimer}
            </p>
          </div>
          <div className="space-y-1">
            <strong className="text-slate-200 block">3. Self-Care Is Not Treatment:</strong>
            <p className="text-slate-400">
              {guidance.educationalCaveats.selfCareLimitations}
            </p>
          </div>
          <div className="space-y-1">
            <strong className="text-slate-200 block">4. Prescriptions & Medication Safety:</strong>
            <p className="text-slate-400">
              {guidance.safetyRestrictions.noMedicationAlterationStatement}
            </p>
          </div>
        </div>

        {/* Emergency Red Flags to Watch */}
        <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-[11px] space-y-1.5">
          <strong className="text-rose-300 flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span>Emergency Red-Flag Symptoms (Seek Immediate ER Care If Developed):</span>
          </strong>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-300">
            {guidance.educationalCaveats.redFlagsToWatch.map((rf, idx) => (
              <span key={idx} className="flex items-center space-x-1">
                <span className="text-rose-400 font-bold">•</span>
                <span>{rf}</span>
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 italic pt-1">
            {guidance.safetyRestrictions.noWaitUntilCriticalStatement}
          </p>
        </div>

        {/* Clinical Source Citation */}
        <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-900">
          <span>Clinical Escalation Protocol Source: <strong>{guidance.clinicalSource}</strong></span>
          <span className="italic">Non-prescriptive educational guidance</span>
        </div>
      </div>
    </div>
  );
};
