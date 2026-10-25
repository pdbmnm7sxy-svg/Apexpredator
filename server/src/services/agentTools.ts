import { getReport } from './store.js';
import { analyzeSingleMeasurement } from './analyzer.js';
import { evaluateCombinations } from './combinations.js';
import {
  PARAMETER_CONFIGS,
  convertUnit,
  convertReferenceInterval,
  areUnitsCompatible,
} from '../config/referenceRanges.js';
import {
  AbnormalityClassification,
  CanonicalParameterId,
  Measurement,
  ReferenceInterval,
  ReportAnalysisResult,
} from '../types/index.js';

/**
 * Validates report ownership and session access.
 */
export async function getVerifiedReportHelper(
  reportId: string,
  sessionReport?: ReportAnalysisResult
): Promise<ReportAnalysisResult> {
  if (!reportId || typeof reportId !== 'string') {
    throw new Error('Validation error: reportId is required and must be a non-empty string.');
  }

  // Check passed active session report first
  if (sessionReport && sessionReport.reportId === reportId) {
    return sessionReport;
  }

  // Otherwise query repository store
  const stored = await getReport(reportId);
  if (!stored) {
    throw new Error(
      `Access error: Report with ID "${reportId}" not found in current session or database. Please upload or verify the report first.`
    );
  }

  return stored;
}

/**
 * TOOL 1: get_verified_report(reportId)
 * Reads verified structured measurements, patient demographics, and collection context.
 */
export async function toolGetVerifiedReport(
  args: { reportId: string },
  sessionReport?: ReportAnalysisResult
): Promise<{
  reportId: string;
  reportDate?: string;
  patientContext: {
    age?: number;
    sex?: 'male' | 'female' | 'other';
    fastingState?: string;
    notes?: string;
  };
  totalMeasurements: number;
  unverifiedMeasurementsCount: number;
  measurements: Array<{
    id: string;
    canonicalId: string;
    label: string;
    value: string;
    numericValue: number | null;
    comparator: string | null;
    originalUnit: string;
    extractedInterval: ReferenceInterval | null;
    context: string | null;
    sourcePage: number;
    supportingText: string;
    verificationStatus: string;
    warnings: string[];
  }>;
}> {
  if (!args || !args.reportId) {
    throw new Error('Invalid arguments: reportId must be provided.');
  }

  const report = await getVerifiedReportHelper(args.reportId, sessionReport);

  const measurements = report.measurements.map((m) => ({
    id: m.id,
    canonicalId: m.canonicalId,
    label: m.originalLabel,
    value: m.value,
    numericValue: m.numericValue,
    comparator: m.comparator,
    originalUnit: m.originalUnit,
    extractedInterval: m.extractedInterval,
    context: m.context,
    sourcePage: m.sourcePage,
    supportingText: m.supportingText,
    verificationStatus: m.verificationStatus,
    warnings: m.warnings,
  }));

  const unverified = measurements.filter((m) => m.verificationStatus === 'extracted').length;

  return {
    reportId: report.reportId,
    reportDate: report.reportDate,
    patientContext: report.patientContext || {},
    totalMeasurements: measurements.length,
    unverifiedMeasurementsCount: unverified,
    measurements,
  };
}

/**
 * TOOL 2: normalize_measurement(measurementId, targetUnit)
 * Converts measurement value and reference bounds together.
 * Never compares incompatible units. Marks unconvertible as needs review.
 */
export async function toolNormalizeMeasurement(
  args: { reportId: string; measurementId: string; targetUnit?: string },
  sessionReport?: ReportAnalysisResult
): Promise<{
  measurementId: string;
  canonicalId: string;
  label: string;
  originalValue: number | string | null;
  originalUnit: string;
  normalizedValue: number | null;
  normalizedUnit: string;
  referenceInterval: ReferenceInterval | null;
  isCompatible: boolean;
  status: 'normalized' | 'same_unit' | 'needs_review';
  explanation: string;
  warnings: string[];
}> {
  if (!args || !args.reportId || !args.measurementId) {
    throw new Error('Invalid arguments: both reportId and measurementId are required.');
  }

  const report = await getVerifiedReportHelper(args.reportId, sessionReport);
  const m = report.measurements.find((x) => x.id === args.measurementId);

  if (!m) {
    throw new Error(`Measurement "${args.measurementId}" not found in report "${args.reportId}".`);
  }

  if (m.canonicalId === 'unsupported_other' || !PARAMETER_CONFIGS[m.canonicalId]) {
    return {
      measurementId: m.id,
      canonicalId: m.canonicalId,
      label: m.originalLabel,
      originalValue: m.numericValue ?? m.value,
      originalUnit: m.originalUnit,
      normalizedValue: null,
      normalizedUnit: m.originalUnit,
      referenceInterval: m.extractedInterval,
      isCompatible: false,
      status: 'needs_review',
      explanation: `Parameter "${m.originalLabel}" is not in the active dictionary. Conversion cannot be established.`,
      warnings: ['Unsupported parameter: automatic conversion not available'],
    };
  }

  const config = PARAMETER_CONFIGS[m.canonicalId];
  const targetUnit = args.targetUnit || config.standardUnit;
  const warnings = [...m.warnings];

  if (!m.originalUnit || m.originalUnit.trim() === '') {
    return {
      measurementId: m.id,
      canonicalId: m.canonicalId,
      label: config.name,
      originalValue: m.numericValue ?? m.value,
      originalUnit: 'Unspecified',
      normalizedValue: null,
      normalizedUnit: targetUnit,
      referenceInterval: m.extractedInterval,
      isCompatible: false,
      status: 'needs_review',
      explanation: 'Missing unit: Cannot safely normalize a measurement without an explicit unit.',
      warnings: [...warnings, 'Missing unit: safety guard triggered'],
    };
  }

  if (!areUnitsCompatible(m.canonicalId, m.originalUnit, targetUnit)) {
    return {
      measurementId: m.id,
      canonicalId: m.canonicalId,
      label: config.name,
      originalValue: m.numericValue ?? m.value,
      originalUnit: m.originalUnit,
      normalizedValue: null,
      normalizedUnit: targetUnit,
      referenceInterval: m.extractedInterval,
      isCompatible: false,
      status: 'needs_review',
      explanation: `Incompatible units: Cannot convert "${m.originalUnit}" to "${targetUnit}".`,
      warnings: [...warnings, `Incompatible units: ${m.originalUnit} vs ${targetUnit}`],
    };
  }

  // Convert measurement value
  let normVal = m.numericValue;
  let normUnit = m.originalUnit;

  if (m.numericValue !== null) {
    const conv = convertUnit(m.canonicalId, m.numericValue, m.originalUnit, targetUnit);
    if (conv) {
      normVal = conv.normalizedValue;
      normUnit = conv.normalizedUnit;
    }
  }

  // Convert reference interval bounds together with value
  let normInterval: ReferenceInterval | null = m.extractedInterval;
  if (normInterval) {
    normInterval = convertReferenceInterval(
      m.canonicalId,
      normInterval,
      m.originalUnit,
      normUnit
    );
  }

  const isSame = m.originalUnit.toLowerCase().replace(/\s+/g, '') === normUnit.toLowerCase().replace(/\s+/g, '');

  return {
    measurementId: m.id,
    canonicalId: m.canonicalId,
    label: config.name,
    originalValue: m.numericValue ?? m.value,
    originalUnit: m.originalUnit,
    normalizedValue: normVal,
    normalizedUnit: normUnit,
    referenceInterval: normInterval,
    isCompatible: true,
    status: isSame ? 'same_unit' : 'normalized',
    explanation: isSame
      ? `Measurement already in target unit (${normUnit}).`
      : `Converted ${m.numericValue} ${m.originalUnit} to ${normVal} ${normUnit}; reference bounds converted together.`,
    warnings,
  };
}

/**
 * TOOL 3: compare_with_reference(measurementId)
 * Deterministically compares measurement against applicable reference intervals and critical rules.
 */
export async function toolCompareWithReference(
  args: { reportId: string; measurementId: string },
  sessionReport?: ReportAnalysisResult
): Promise<{
  measurementId: string;
  canonicalId: string;
  label: string;
  observedValue: string | number;
  unit: string;
  normalizedValue?: number;
  normalizedUnit?: string;
  classification: AbnormalityClassification;
  direction: 'normal' | 'low' | 'high' | 'critical' | 'indeterminate';
  referenceInterval: ReferenceInterval | null;
  ruleTriggered: string;
  plainExplanation: string;
  clinicalSuggestion: string;
  toolVerified: true;
  warnings: string[];
}> {
  if (!args || !args.reportId || !args.measurementId) {
    throw new Error('Invalid arguments: reportId and measurementId are required.');
  }

  const report = await getVerifiedReportHelper(args.reportId, sessionReport);
  const m = report.measurements.find((x) => x.id === args.measurementId);

  if (!m) {
    throw new Error(`Measurement "${args.measurementId}" not found in report "${args.reportId}".`);
  }

  // Evaluate single measurement using unit-safe deterministic analyzer
  const finding = analyzeSingleMeasurement(m, report.patientContext?.sex);

  return {
    measurementId: finding.measurementId,
    canonicalId: finding.canonicalId,
    label: finding.label,
    observedValue: finding.observedValue,
    unit: finding.unit,
    normalizedValue: finding.normalizedValue,
    normalizedUnit: finding.normalizedUnit,
    classification: finding.classification,
    direction: finding.direction,
    referenceInterval: finding.referenceInterval,
    ruleTriggered: finding.triggeredRule,
    plainExplanation: finding.plainExplanation,
    clinicalSuggestion: finding.clinicalSuggestion,
    toolVerified: true,
    warnings: finding.warnings,
  };
}

/**
 * TOOL 4: get_reference_context(measurementId)
 * Retrieves full reference interval details, source, and context.
 */
export async function toolGetReferenceContext(
  args: { reportId: string; measurementId: string },
  sessionReport?: ReportAnalysisResult
): Promise<{
  measurementId: string;
  canonicalId: string;
  label: string;
  printedReportInterval: ReferenceInterval | null;
  configuredDemoIntervals: Array<{
    context: string;
    rawString: string;
    unit: string;
    intendedContext?: string;
  }>;
  criticalThresholds?: {
    low?: number;
    high?: number;
    ruleName: string;
    description: string;
  };
  supportingSnippet: string;
  disclaimer: string;
}> {
  if (!args || !args.reportId || !args.measurementId) {
    throw new Error('Invalid arguments: reportId and measurementId are required.');
  }

  const report = await getVerifiedReportHelper(args.reportId, sessionReport);
  const m = report.measurements.find((x) => x.id === args.measurementId);

  if (!m) {
    throw new Error(`Measurement "${args.measurementId}" not found in report "${args.reportId}".`);
  }

  const config = m.canonicalId !== 'unsupported_other' ? PARAMETER_CONFIGS[m.canonicalId] : null;

  return {
    measurementId: m.id,
    canonicalId: m.canonicalId,
    label: m.originalLabel,
    printedReportInterval: m.extractedInterval,
    configuredDemoIntervals: (config?.referenceIntervals || []).map((ri) => ({
      context: ri.context || 'default',
      rawString: ri.interval.rawString,
      unit: ri.interval.unit,
      intendedContext: ri.interval.intendedContext,
    })),
    criticalThresholds: config?.criticalThresholds,
    supportingSnippet: m.supportingText,
    disclaimer:
      'All reference intervals are illustrative test configurations or lab-printed demo ranges, not clinically validated diagnostic standards.',
  };
}

/**
 * TOOL 5: validate_analysis(analysis)
 * Validates candidate agent classifications and combinations against deterministic tool comparisons.
 */
export async function toolValidateAnalysis(
  args: {
    reportId: string;
    findings: Array<{
      measurementId: string;
      classification: AbnormalityClassification;
      observedValue?: string | number;
      unit?: string;
    }>;
    combinations?: Array<{
      ruleId: string;
      status: 'matched' | 'not_matched' | 'not_evaluable';
      contributingMeasurementIds?: string[];
    }>;
  },
  sessionReport?: ReportAnalysisResult
): Promise<{
  isValid: boolean;
  totalFindingsValidated: number;
  discrepancies: Array<{
    measurementId: string;
    parameterLabel: string;
    agentClassification: string;
    toolClassification: string;
    reason: string;
  }>;
  combinationDiscrepancies: Array<{
    ruleId: string;
    agentStatus: string;
    toolStatus: string;
    reason: string;
  }>;
  message: string;
}> {
  if (!args || !args.reportId || !Array.isArray(args.findings)) {
    throw new Error('Invalid arguments: reportId and findings array are required.');
  }

  const report = await getVerifiedReportHelper(args.reportId, sessionReport);
  const discrepancies: Array<{
    measurementId: string;
    parameterLabel: string;
    agentClassification: string;
    toolClassification: string;
    reason: string;
  }> = [];

  // Deterministically verify each finding
  for (const agentFinding of args.findings) {
    const m = report.measurements.find((x) => x.id === agentFinding.measurementId);
    if (!m) {
      discrepancies.push({
        measurementId: agentFinding.measurementId,
        parameterLabel: 'Unknown',
        agentClassification: agentFinding.classification,
        toolClassification: 'not_found',
        reason: `Measurement with ID ${agentFinding.measurementId} does not exist in report ${args.reportId}.`,
      });
      continue;
    }

    const groundTruth = analyzeSingleMeasurement(m, report.patientContext?.sex);
    if (groundTruth.classification !== agentFinding.classification) {
      discrepancies.push({
        measurementId: m.id,
        parameterLabel: groundTruth.label,
        agentClassification: agentFinding.classification,
        toolClassification: groundTruth.classification,
        reason: `Agent classified ${groundTruth.label} as "${agentFinding.classification}", but tool comparison determined "${groundTruth.classification}" based on interval "${groundTruth.referenceInterval?.rawString || 'N/A'}".`,
      });
    }
  }

  // Cross-check combination alerts if provided
  const combinationDiscrepancies: Array<{
    ruleId: string;
    agentStatus: string;
    toolStatus: string;
    reason: string;
  }> = [];

  if (args.combinations && Array.isArray(args.combinations)) {
    // Run ground truth combination engine
    const groundTruthFindings = report.measurements.map((m) =>
      analyzeSingleMeasurement(m, report.patientContext?.sex)
    );
    const groundTruthCombinations = evaluateCombinations(
      report.measurements,
      groundTruthFindings,
      report.reportDate
    );

    for (const agentComb of args.combinations) {
      const gt = groundTruthCombinations.find((c) => c.ruleId === agentComb.ruleId);
      if (!gt) continue;

      if (gt.status !== agentComb.status) {
        combinationDiscrepancies.push({
          ruleId: agentComb.ruleId,
          agentStatus: agentComb.status,
          toolStatus: gt.status,
          reason: `Agent marked combination ${agentComb.ruleId} as "${agentComb.status}", but rule engine determined "${gt.status}".`,
        });
      }
    }
  }

  const isValid = discrepancies.length === 0 && combinationDiscrepancies.length === 0;

  return {
    isValid,
    totalFindingsValidated: args.findings.length,
    discrepancies,
    combinationDiscrepancies,
    message: isValid
      ? 'All classifications and combinations match ground-truth tool calculations perfectly.'
      : `Validation detected ${discrepancies.length} finding discrepancies and ${combinationDiscrepancies.length} combination discrepancies. Correction required.`,
  };
}
