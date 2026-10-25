export type CanonicalParameterId =
  | 'hemoglobin'
  | 'glucose_fasting'
  | 'glucose_random'
  | 'glucose_postprandial'
  | 'cholesterol_total'
  | 'cholesterol_ldl'
  | 'cholesterol_hdl'
  | 'triglycerides'
  | 'platelets'
  | 'creatinine'
  | 'wbc'
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic';

export type AbnormalityClassification =
  | 'within_reference'
  | 'low'
  | 'high'
  | 'critical'
  | 'needs_verification'
  | 'unable_to_classify';

export type AbnormalityDirection = 'normal' | 'low' | 'high' | 'critical' | 'indeterminate';

export type ReviewPriority = 'urgent' | 'high' | 'moderate' | 'low';

export interface ReferenceInterval {
  min: number | null;
  max: number | null;
  isMinInclusive: boolean;
  isMaxInclusive: boolean;
  rawString: string;
  unit: string;
  source: 'report_printed' | 'configured_demo_default';
  intendedContext?: string;
  isOneSided?: boolean;
  comparatorLimit?: '<' | '<=' | '>' | '>=';
  normalizedMin?: number | null;
  normalizedMax?: number | null;
  normalizedUnit?: string;
}

export interface Measurement {
  id: string;
  canonicalId: CanonicalParameterId | 'unsupported_other';
  originalLabel: string;
  value: string;
  numericValue: number | null;
  comparator: '<' | '>' | '<=' | '>=' | '=' | null;
  originalUnit: string;
  normalizedUnit: string;
  normalizedValue: number | null;
  extractedInterval: ReferenceInterval | null;
  context: string | null;
  sourcePage: number;
  supportingText: string;
  extractionMethod: 'text_regex' | 'ocr' | 'table_row' | 'manual' | 'pdf_raster_ocr';
  confidence: number;
  verificationStatus: 'extracted' | 'user_verified' | 'user_edited' | 'user_added';
  warnings: string[];
  isUserModified?: boolean;
}

export interface Finding {
  id: string;
  measurementId: string;
  canonicalId: CanonicalParameterId | 'unsupported_other';
  label: string;
  observedValue: string | number;
  unit: string;
  normalizedValue?: number;
  normalizedUnit?: string;
  classification: AbnormalityClassification;
  direction: AbnormalityDirection;
  referenceInterval: ReferenceInterval | null;
  triggeredRule: string;
  plainExplanation: string;
  clinicalSuggestion: string;
  supportingText: string;
  warnings: string[];
  toolVerified?: boolean;
}

export interface CombinationRulePredicate {
  parameterId: CanonicalParameterId;
  condition: 'status_in' | 'value_gt' | 'value_lt';
  expectedStatuses?: AbnormalityClassification[];
  threshold?: number;
  contextRequired?: string;
}

export interface CombinationRule {
  ruleId: string;
  version: string;
  title: string;
  category: 'cardiometabolic' | 'renal_vascular' | 'hematologic' | 'lipid_profile' | 'glycemic_infection';
  description: string;
  requiredParameters: CanonicalParameterId[];
  predicates: CombinationRulePredicate[];
  logicalOperator: 'AND' | 'OR';
  reviewPriority: ReviewPriority;
  referenceSource: string;
  missingDataBehavior: 'not_evaluable' | 'skip';
  explanationTemplate: string;
}

export interface CombinationAlert {
  ruleId: string;
  ruleTitle: string;
  status: 'matched' | 'not_matched' | 'not_evaluable';
  reviewPriority: ReviewPriority;
  contributingMeasurements: {
    parameterId: CanonicalParameterId;
    label: string;
    value: string | number;
    unit: string;
    classification: AbnormalityClassification;
    referenceRangeText: string;
  }[];
  matchedConditions: string[];
  missingParameters: CanonicalParameterId[];
  explanation: string;
  disclaimer: string;
  referenceSource: string;
}

export interface AgentFinding {
  id: string;
  measurementId: string;
  canonicalId: CanonicalParameterId | 'unsupported_other';
  label: string;
  originalValue: string | number;
  originalUnit: string;
  normalizedValue: string | number;
  normalizedUnit: string;
  classification: AbnormalityClassification;
  direction: AbnormalityDirection;
  referenceInterval: ReferenceInterval | null;
  evidenceSnippet: string;
  conciseExplanation: string;
  clinicalSuggestion: string;
  toolVerified: boolean;
  warnings: string[];
}

export interface AgentCombination {
  ruleId: string;
  ruleTitle: string;
  status: 'matched' | 'not_matched' | 'not_evaluable';
  reviewPriority: ReviewPriority;
  contributingMeasurementIds: string[];
  contributingAnalytes: {
    parameterId: CanonicalParameterId;
    label: string;
    value: string | number;
    unit: string;
    classification: AbnormalityClassification;
    referenceRange: string;
  }[];
  basis: 'configured_synthetic_rule' | 'sourced_association';
  rationale: string;
  limitations: string;
  disclaimer: string;
}

export interface AgentToolCallRecord {
  step: number;
  toolName: string;
  arguments: Record<string, any>;
  output: any;
  durationMs?: number;
}

export type NextStepCategory =
  | 'emergency_attention'
  | 'prompt_medical_review'
  | 'routine_follow_up'
  | 'self_care_and_monitoring';

export type ContextCompleteness = 'insufficient' | 'partial' | 'complete';

export interface ClinicalContext {
  age?: number;
  sex?: 'male' | 'female' | 'other';
  fastingState?: string;
  notes?: string;
  symptoms?: string[];
  symptomDuration?: 'acute_hours' | 'days' | 'weeks_to_months' | 'chronic' | 'none_asymptomatic' | 'unspecified';
  existingConditions?: string[];
  medications?: string[];
  isPregnant?: boolean;
  recentSurgeryOrIllness?: boolean;
}

export interface GuidanceSupportingFinding {
  parameterId?: string;
  label: string;
  observedValue?: string | number;
  referenceRangeText?: string;
  classification?: string;
  reason: string;
}

export interface CostAwareGuidance {
  category: NextStepCategory;
  categoryLabel: string;
  title: string;
  headline: string;
  rationale: string;
  urgencyLevel: 'immediate_emergency' | 'prompt_days' | 'routine_scheduled' | 'monitoring_lifestyle';
  supportingFindings: GuidanceSupportingFinding[];
  supportingSymptoms: string[];
  contextCompleteness: ContextCompleteness;
  missingContextDetails: string[];
  costConsciousNavigation: {
    recommendedCareSetting: string;
    costSavingNotes: string;
    lowerCostOptions: string[];
  };
  educationalCaveats: {
    referenceRangeDisclaimer: string;
    isolatedAbnormalDisclaimer: string;
    selfCareLimitations: string;
    redFlagsToWatch: string[];
  };
  clinicalSource: string;
  safetyRestrictions: {
    noMedicationAlterationStatement: string;
    noWaitUntilCriticalStatement: string;
  };
}

export interface AgentAnalysisResult {
  reportId: string;
  analysisVersion: string;
  analysisMethod: 'ai_agent_orchestrated' | 'deterministic_local';
  modelUsed: string;
  provider: 'gemini' | 'mock' | 'deterministic_local';
  status: 'completed' | 'failed' | 'consent_required' | 'api_key_missing';
  errorMessage?: string;
  nextStepSuggestion?: string;
  costAwareGuidance?: CostAwareGuidance;
  findings: AgentFinding[];
  combinations: AgentCombination[];
  missingInformationAndLimitations: string[];
  patientFriendlySummary: string;
  suggestedQuestionsForDoctor: string[];
  toolExecutionTrace: AgentToolCallRecord[];
  timestamp: string;
  disclaimer: string;
}

export interface ReportSummaryMetrics {
  totalExtracted: number;
  analyzed: number;
  normalCount: number;
  abnormalCount: number;
  criticalCount: number;
  unclassifiedCount: number;
  verificationNeededCount: number;
  prototypeReportIndicator: number;
}

export interface ExtractionMetadata {
  pages: number;
  method: 'pdf_text' | 'pdf_raster_ocr' | 'image_ocr' | 'mixed';
  averageConfidence: number;
  characterCount: number;
  rawTextSnippet: string;
  processedAt: string;
}

export interface ReportAnalysisResult {
  reportId: string;
  fileName: string;
  reportDate?: string;
  patientContext?: ClinicalContext;
  extractionMetadata: ExtractionMetadata;
  measurements: Measurement[];
  findings: Finding[];
  combinationAlerts: CombinationAlert[];
  agentAnalysis?: AgentAnalysisResult | null;
  costAwareGuidance?: CostAwareGuidance;
  summaryMetrics: ReportSummaryMetrics;
  storageMode: 'session_memory' | 'mongodb_persistent';
  rawText: string;
  disclaimer: string;
}

export interface ExplainableSummaryResponse {
  summary: string;
  provider: 'llm_gemini' | 'rule_grounded_template' | 'ai_agent';
  keyObservations: string[];
  suggestedQuestionsForDoctor: string[];
  disclaimer: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  groundedInFindings?: string[];
}
