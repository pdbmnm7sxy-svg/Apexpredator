import {
  CostAwareGuidance,
  ClinicalContext,
  Finding,
  CombinationAlert,
  NextStepCategory,
  GuidanceSupportingFinding,
  ContextCompleteness,
} from '../types/index.js';

/**
 * Recognizable acute emergency red flag symptoms that demand immediate Emergency attention.
 * Sourced from American College of Emergency Physicians (ACEP) escalation guidelines.
 */
export const EMERGENCY_RED_FLAG_SYMPTOMS = [
  'chest_pain',
  'shortness_of_breath',
  'severe_dizziness_syncope',
  'uncontrolled_bleeding',
  'acute_confusion',
  'speech_difficulty',
  'sudden_weakness',
  'worst_headache',
] as const;

/**
 * Concerning symptoms that warrant prompt medical review (within 24-72 hours).
 */
export const CONCERNING_SYMPTOMS = [
  'frequent_urination_thirst',
  'unexplained_weight_loss',
  'persistent_fever',
  'progressive_fatigue',
  'severe_palpitations',
  'unusual_bruising',
  'persistent_abdominal_pain',
] as const;

/**
 * Sourced clinical escalation protocols.
 */
export const SOURCED_CRITERIA_SOURCES = {
  emergency:
    'College of American Pathologists (CAP) Critical Laboratory Value Thresholds & ACEP Emergency Escalation Guidelines',
  prompt:
    'ADA Standards of Medical Care in Diabetes, ACC/AHA Multi-Society Guidelines & AAFP Clinical Triage Protocols',
  routine:
    'USPSTF Preventive Services Guidelines & ACP Adult Health Maintenance Recommendations',
  selfCare:
    'CDC Health Maintenance Guidelines & Preventive Health Periodic Assessment Standards',
};

/**
 * Evaluates cost-aware next-step guidance based on verified findings,
 * concerning combinations, and patient-reported clinical context.
 */
export function evaluateCostAwareGuidance(
  findings: Finding[],
  combinations: CombinationAlert[],
  clinicalContext?: ClinicalContext
): CostAwareGuidance {
  const context = clinicalContext || {};
  const symptoms = (context.symptoms || []).map((s) => s.toLowerCase().trim());
  const conditions = (context.existingConditions || []).map((c) => c.toLowerCase().trim());
  const medications = (context.medications || []).map((m) => m.toLowerCase().trim());
  const duration = context.symptomDuration || 'unspecified';

  const activeSymptoms = symptoms.filter(
    (s) => s !== 'none' && s !== 'none_no_symptoms' && s !== 'no' && s !== ''
  );
  const activeConditions = conditions.filter(
    (c) => c !== 'none' && c !== 'no' && c !== 'healthy' && c !== ''
  );
  const activeMeds = medications.filter((m) => m !== 'none' && m !== 'no' && m !== '');

  // 1. Determine Context Completeness
  const hasSymptomsInput = context.symptoms !== undefined && context.symptoms.length > 0;
  const hasDurationInput = context.symptomDuration !== undefined && context.symptomDuration !== 'unspecified';
  const hasConditionsInput = context.existingConditions !== undefined && context.existingConditions.length > 0;
  const hasMedsInput = context.medications !== undefined && context.medications.length > 0;

  const missingDetails: string[] = [];
  if (!hasSymptomsInput) missingDetails.push('Presence or absence of current symptoms');
  if (!hasDurationInput) missingDetails.push('Duration of symptoms (if any)');
  if (!hasConditionsInput) missingDetails.push('Known pre-existing medical conditions');
  if (!hasMedsInput) missingDetails.push('Current prescribed medications');

  let contextCompleteness: ContextCompleteness = 'complete';
  if (missingDetails.length >= 3) {
    contextCompleteness = 'insufficient';
  } else if (missingDetails.length > 0) {
    contextCompleteness = 'partial';
  }

  // 2. Identify Critical Findings and Emergency Symptoms
  const criticalFindings = findings.filter((f) => f.classification === 'critical');
  const matchedCombinations = combinations.filter((c) => c.status === 'matched');
  const abnormalFindings = findings.filter(
    (f) => f.classification === 'low' || f.classification === 'high'
  );
  const normalFindings = findings.filter((f) => f.classification === 'within_reference');

  const presentEmergencySymptoms = EMERGENCY_RED_FLAG_SYMPTOMS.filter((rf) =>
    symptoms.includes(rf)
  );

  const presentConcerningSymptoms = CONCERNING_SYMPTOMS.filter((cs) =>
    symptoms.includes(cs)
  );

  const supportingFindingsList: GuidanceSupportingFinding[] = [];
  const supportingSymptomsList: string[] = [];

  let category: NextStepCategory;
  let categoryLabel: string;
  let title: string;
  let headline: string;
  let rationale: string;
  let urgencyLevel: CostAwareGuidance['urgencyLevel'];
  let recommendedCareSetting: string;
  let costSavingNotes: string;
  let lowerCostOptions: string[];
  let clinicalSource: string;

  // TIER 1: EMERGENCY ATTENTION
  if (criticalFindings.length > 0 || presentEmergencySymptoms.length > 0) {
    category = 'emergency_attention';
    categoryLabel = 'Emergency Attention Required';
    urgencyLevel = 'immediate_emergency';
    title = 'Immediate Emergency Medical Evaluation Recommended';
    recommendedCareSetting = 'Nearest Hospital Emergency Department (ED) or Call 911 / Emergency Services';
    clinicalSource = SOURCED_CRITERIA_SOURCES.emergency;

    if (criticalFindings.length > 0 && presentEmergencySymptoms.length > 0) {
      headline = 'Critical laboratory thresholds AND acute red-flag symptoms detected.';
      rationale =
        'This report contains laboratory values exceeding life-safety critical thresholds, alongside reported emergency symptoms. This combination requires immediate in-person emergency hospital assessment to prevent severe acute complications.';
    } else if (criticalFindings.length > 0) {
      headline = 'Laboratory result exceeds recognized critical emergency threshold.';
      rationale =
        'One or more parameters meet recognized critical laboratory alert criteria (e.g., severe cytopenia or critical glycemic extreme). Immediate medical evaluation is required regardless of whether you currently feel ill.';
    } else {
      headline = 'Reported symptoms meet acute emergency red-flag criteria.';
      rationale =
        'You reported recognized emergency red-flag symptoms (such as acute chest pain, severe shortness of breath, syncope, or uncontrolled bleeding). Emergency evaluation must never be delayed by outpatient scheduling or repeat testing.';
    }

    criticalFindings.forEach((cf) => {
      supportingFindingsList.push({
        parameterId: cf.canonicalId,
        label: cf.label,
        observedValue: cf.observedValue,
        referenceRangeText: cf.referenceInterval?.rawString,
        classification: cf.classification,
        reason: `Exceeds critical emergency threshold: ${cf.triggeredRule}`,
      });
    });

    presentEmergencySymptoms.forEach((s) => {
      const formatted = s.replace(/_/g, ' ');
      supportingSymptomsList.push(`Acute red-flag symptom reported: ${formatted}`);
    });

    costSavingNotes =
      'Safety Priority: During an acute medical emergency or critical laboratory alert, seeking outpatient or lower-cost alternatives is not safe. Hospital emergency departments are required by law (EMTALA) to stabilize medical emergencies regardless of immediate ability to pay. Hospital charity care and financial assistance programs can be addressed after emergency stabilization.';
    lowerCostOptions = [
      'Emergency Department: Do not delay care. Request a patient financial counselor or charity care application following stabilization.',
    ];
  }

  // TIER 2: PROMPT MEDICAL REVIEW
  else if (
    matchedCombinations.length > 0 ||
    abnormalFindings.length >= 2 ||
    presentConcerningSymptoms.length > 0 ||
    (abnormalFindings.length >= 1 &&
      (activeConditions.length > 0 ||
        (activeSymptoms.length > 0 && (duration === 'days' || duration === 'weeks_to_months'))))
  ) {
    category = 'prompt_medical_review';
    categoryLabel = 'Prompt Medical Review (Non-Emergency)';
    urgencyLevel = 'prompt_days';
    title = 'Timely Clinician Assessment Recommended (Within 24–72 Hours)';
    recommendedCareSetting = 'Primary Care Clinic (PCP), In-Network Urgent Care, or Urgent Telehealth Triage';
    clinicalSource = SOURCED_CRITERIA_SOURCES.prompt;

    headline =
      matchedCombinations.length > 0
        ? 'Concerning multi-analyte co-occurrence pattern identified.'
        : 'Multiple or significant out-of-range parameters warrant timely clinical evaluation.';

    rationale =
      'While not currently presenting acute emergency thresholds, your findings suggest active physiological deviation (such as cardiometabolic discordance, multi-lineage hematologic suppression, or symptomatic lab changes). A prompt consultation with a doctor within several days helps identify underlying causes and prevents escalation into urgent complications.';

    matchedCombinations.forEach((mc) => {
      supportingFindingsList.push({
        label: mc.ruleTitle,
        classification: 'high',
        reason: `Matched concerning combination: ${mc.ruleTitle} (${mc.explanation})`,
      });
    });

    abnormalFindings.slice(0, 4).forEach((af) => {
      supportingFindingsList.push({
        parameterId: af.canonicalId,
        label: af.label,
        observedValue: af.observedValue,
        referenceRangeText: af.referenceInterval?.rawString,
        classification: af.classification,
        reason: `${af.label} is ${af.classification.toUpperCase()} (${af.observedValue} ${af.unit}; Ref: ${af.referenceInterval?.rawString || 'N/A'})`,
      });
    });

    presentConcerningSymptoms.forEach((s) => {
      const formatted = s.replace(/_/g, ' ');
      supportingSymptomsList.push(`Concerning symptom reported: ${formatted} (Duration: ${duration.replace(/_/g, ' ')})`);
    });

    costSavingNotes =
      'Cost-Saving Navigation: You do NOT necessarily need an expensive Emergency Department visit for these findings if you do not have acute emergency symptoms (like chest pain or shortness of breath). Emergency room visits often incur facility fees of $1,000–$3,000+. A prompt visit with your primary care provider, an in-network urgent care clinic, or a virtual telehealth triage appointment can address these findings effectively at a fraction of the cost.';
    lowerCostOptions = [
      'In-network Primary Care Provider (PCP) for prompt outpatient consultation',
      'Federally Qualified Health Centers (FQHCs) or public community health clinics (sliding-fee scale based on income)',
      'Accredited Telehealth Consultation for initial clinical review and lab order coordination',
      'In-network Urgent Care Center if your primary doctor is unavailable within 48–72 hours',
    ];
  }

  // TIER 3: ROUTINE FOLLOW-UP
  else if (abnormalFindings.length > 0) {
    category = 'routine_follow_up';
    categoryLabel = 'Routine Follow-Up';
    urgencyLevel = 'routine_scheduled';
    title = 'Discuss at Your Next Scheduled Doctor Appointment';
    recommendedCareSetting = 'Scheduled Primary Care Provider (PCP) Visit or Annual Wellness Exam';
    clinicalSource = SOURCED_CRITERIA_SOURCES.routine;

    headline = 'Isolated mild-to-moderate deviation suitable for routine clinical review.';
    rationale =
      'Your report shows an isolated out-of-range value (such as a borderline cholesterol or lipid parameter) without concerning combinations or acute symptoms. An isolated abnormal finding does NOT establish a disease; lab values vary based on diet, hydration, and biological fluctuation. This is appropriate to review at your next scheduled routine primary care visit.';

    abnormalFindings.forEach((af) => {
      supportingFindingsList.push({
        parameterId: af.canonicalId,
        label: af.label,
        observedValue: af.observedValue,
        referenceRangeText: af.referenceInterval?.rawString,
        classification: af.classification,
        reason: `Mild isolated ${af.classification.toUpperCase()} result (${af.observedValue} ${af.unit}; Ref: ${af.referenceInterval?.rawString || 'N/A'})`,
      });
    });

    costSavingNotes =
      'Cost-Saving Navigation: Avoid unnecessary urgent care co-pays ($100–$250) or emergency room bills ($1,500+) for isolated, non-critical lab deviations. Bring this printed report to your already scheduled periodic check-up or book a routine primary care visit. Your doctor can determine whether a simple, inexpensive repeat fasting test is warranted.';
    lowerCostOptions = [
      'Discuss at your next routine annual physical exam (often covered 100% with no co-pay under preventive care benefits)',
      'Scheduled in-network primary care appointment',
      'Local public health department clinics offering low-cost blood pressure and lipid monitoring checks',
    ];
  }

  // TIER 4: GENERAL SELF-CARE & MONITORING
  else {
    category = 'self_care_and_monitoring';
    categoryLabel = 'General Self-Care & Monitoring';
    urgencyLevel = 'monitoring_lifestyle';
    title = 'Maintain Healthy Habits & Routine Preventive Care';
    recommendedCareSetting = 'Self-Monitoring & Periodic Preventive Health Check-Ups';
    clinicalSource = SOURCED_CRITERIA_SOURCES.selfCare;

    headline = 'Evaluated laboratory parameters fall within expected reference intervals.';
    rationale =
      'All tested parameters are currently within printed or standard reference ranges, and no acute or concerning symptoms were reported. Continue your healthy daily habits (balanced nutrition, hydration, regular exercise, and sleep) and maintain your age-appropriate routine preventive health checks.';

    normalFindings.slice(0, 4).forEach((nf) => {
      supportingFindingsList.push({
        parameterId: nf.canonicalId,
        label: nf.label,
        observedValue: nf.observedValue,
        referenceRangeText: nf.referenceInterval?.rawString,
        classification: nf.classification,
        reason: `Within printed expected reference interval (${nf.observedValue} ${nf.unit})`,
      });
    });

    costSavingNotes =
      'Cost-Saving Navigation: No doctor visit or repeat testing expense is needed based on these laboratory numbers alone. Save on healthcare costs by avoiding unprompted repeat testing and focusing on everyday health maintenance and scheduled annual wellness check-ups.';
    lowerCostOptions = [
      'Maintain routine preventive screenings at scheduled annual wellness visits',
      'Free or low-cost community health fair screenings for periodic blood pressure or glucose checks',
    ];
  }

  // Build the complete, rigorously bounded CostAwareGuidance response
  return {
    category,
    categoryLabel,
    title,
    headline,
    rationale,
    urgencyLevel,
    supportingFindings: supportingFindingsList,
    supportingSymptoms: supportingSymptomsList,
    contextCompleteness,
    missingContextDetails: missingDetails,
    costConsciousNavigation: {
      recommendedCareSetting,
      costSavingNotes,
      lowerCostOptions,
    },
    educationalCaveats: {
      referenceRangeDisclaimer:
        'Crucial Clinical Principle: Having all numbers "within the printed reference range" does NOT guarantee that a person is healthy or free of disease. Many conditions do not reflect early in routine blood tests, and medical diagnoses require comprehensive physical examination and clinical history.',
      isolatedAbnormalDisclaimer:
        'Clinical Variation: An isolated abnormal laboratory finding does NOT automatically establish a disease or chronic condition. Transient factors including recent meals, dehydration, stress, exercise, or minor viral illnesses can cause temporary shifts.',
      selfCareLimitations:
        'Strict Safety Limitation: General self-care information (e.g. hydration, nutrition, stress management) represents supportive health maintenance only and must NEVER be used as a treatment for an unconfirmed, suspected, or evolving medical condition.',
      redFlagsToWatch: [
        'Sudden, crushing, or radiating chest pain, pressure, or tightness',
        'Severe shortness of breath or sudden respiratory distress',
        'Sudden weakness, facial droop, numbness, or difficulty speaking',
        'Uncontrolled bleeding, coughing up blood, or black/bloody stools',
        'Sudden fainting, loss of consciousness, or severe confusion',
      ],
    },
    clinicalSource,
    safetyRestrictions: {
      noMedicationAlterationStatement:
        'MedLens does NOT diagnose, prescribe, calculate medication dosages, or recommend starting, stopping, or altering any medication. All pharmacological decisions require direct consultation with your prescribing physician.',
      noWaitUntilCriticalStatement:
        'Proportionate Timeliness: MedLens will NEVER advise users to wait until their condition becomes critical. If you develop worsening, persistent, or concerning symptoms, contact a healthcare professional promptly regardless of past test values.',
    },
  };
}
