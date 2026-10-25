import {
  AbnormalityClassification,
  AbnormalityDirection,
  CanonicalParameterId,
  Finding,
  Measurement,
  ReferenceInterval,
  ReportSummaryMetrics,
} from '../types/index.js';
import {
  PARAMETER_CONFIGS,
  convertUnit,
  areUnitsCompatible,
  convertReferenceInterval,
} from '../config/referenceRanges.js';

/**
 * Pure, deterministic rule-based analysis function.
 * Evaluates verified measurements against applicable reference intervals and critical rules.
 */
export function analyzeMeasurements(
  measurements: Measurement[],
  patientSex?: 'male' | 'female' | 'other'
): {
  findings: Finding[];
  summaryMetrics: ReportSummaryMetrics;
} {
  const findings: Finding[] = [];

  let normalCount = 0;
  let abnormalCount = 0;
  let criticalCount = 0;
  let unclassifiedCount = 0;
  let verificationNeededCount = 0;

  for (const m of measurements) {
    const finding = analyzeSingleMeasurement(m, patientSex);
    findings.push(finding);

    switch (finding.classification) {
      case 'within_reference':
        normalCount++;
        break;
      case 'low':
      case 'high':
        abnormalCount++;
        break;
      case 'critical':
        criticalCount++;
        break;
      case 'needs_verification':
        verificationNeededCount++;
        break;
      case 'unable_to_classify':
        unclassifiedCount++;
        break;
    }
  }

  const analyzed = normalCount + abnormalCount + criticalCount;
  // Prototype report indicator (arbitrary demonstrative formula):
  // (normalCount / max(1, analyzed)) * 100
  // Documented explicitly as a prototype indicator, NOT a clinical diagnosis or score!
  const prototypeReportIndicator =
    analyzed > 0 ? Math.round((normalCount / analyzed) * 100) : 0;

  const summaryMetrics: ReportSummaryMetrics = {
    totalExtracted: measurements.length,
    analyzed,
    normalCount,
    abnormalCount,
    criticalCount,
    unclassifiedCount,
    verificationNeededCount,
    prototypeReportIndicator,
  };

  return { findings, summaryMetrics };
}

/**
 * Analyzes a single measurement against reference intervals and critical rules.
 */
export function analyzeSingleMeasurement(
  m: Measurement,
  patientSex?: 'male' | 'female' | 'other'
): Finding {
  const id = `f-${m.id}`;
  const warnings = [...m.warnings];

  // If parameter is unsupported
  if (m.canonicalId === 'unsupported_other' || !PARAMETER_CONFIGS[m.canonicalId]) {
    return {
      id,
      measurementId: m.id,
      canonicalId: m.canonicalId,
      label: m.originalLabel,
      observedValue: m.value,
      unit: m.originalUnit,
      classification: 'unable_to_classify',
      direction: 'indeterminate',
      referenceInterval: null,
      triggeredRule: 'Unsupported Parameter Rule',
      plainExplanation: `The parameter "${m.originalLabel}" is recognized in the document, but is not currently in the active clinical reference dictionary.`,
      clinicalSuggestion: 'Consult your lab or physician for interpretation of this specialized test.',
      supportingText: m.supportingText,
      warnings: [...warnings, 'Parameter not in active rule catalog'],
    };
  }

  const config = PARAMETER_CONFIGS[m.canonicalId];

  // Check if value is numeric or valid comparator
  if (m.numericValue === null || isNaN(m.numericValue)) {
    return {
      id,
      measurementId: m.id,
      canonicalId: m.canonicalId,
      label: config.name,
      observedValue: m.value || 'N/A',
      unit: m.originalUnit,
      classification: 'needs_verification',
      direction: 'indeterminate',
      referenceInterval: null,
      triggeredRule: 'Non-Numeric Value Rule',
      plainExplanation: `Could not parse a deterministic numeric value from "${m.value}".`,
      clinicalSuggestion: 'Verify the original report and manually enter the numeric reading.',
      supportingText: m.supportingText,
      warnings: [...warnings, 'Non-numeric or unparseable reading'],
    };
  }

  // Check if unit is missing
  if (!m.originalUnit || m.originalUnit.trim() === '' || !m.normalizedUnit) {
    return {
      id,
      measurementId: m.id,
      canonicalId: m.canonicalId,
      label: config.name,
      observedValue: m.numericValue,
      unit: 'Unspecified',
      classification: 'needs_verification',
      direction: 'indeterminate',
      referenceInterval: null,
      triggeredRule: 'Missing Unit Verification Rule',
      plainExplanation: `A numeric reading (${m.numericValue}) was extracted, but no unit was detected in the document text. Interpretation without explicit units is clinically unsafe.`,
      clinicalSuggestion: 'Verify the unit on your lab sheet before evaluating this finding.',
      supportingText: m.supportingText,
      warnings: [...warnings, 'Missing unit: safety guard triggered'],
    };
  }

  // Step 1: Reference Interval Selection
  // Precedence 1: Explicit printed interval from report
  // Precedence 2: Configured demo interval matching context & unit
  let refInterval: ReferenceInterval | null = null;
  let intervalSource: 'report_printed' | 'configured_demo_default' = 'configured_demo_default';

  if (m.extractedInterval && (m.extractedInterval.min !== null || m.extractedInterval.max !== null)) {
    refInterval = m.extractedInterval;
    intervalSource = 'report_printed';
  } else {
    // Look up configured intervals
    const candidateIntervals = config.referenceIntervals;
    let match = candidateIntervals.find((ci) => ci.context === m.context);
    if (!match && patientSex && (patientSex === 'male' || patientSex === 'female')) {
      match = candidateIntervals.find((ci) => ci.context === patientSex);
    }
    if (!match) {
      match = candidateIntervals.find((ci) => ci.context === 'default' || !ci.context);
    }
    if (match) {
      refInterval = match.interval;
      intervalSource = 'configured_demo_default';
    }
  }

  if (!refInterval) {
    return {
      id,
      measurementId: m.id,
      canonicalId: m.canonicalId,
      label: config.name,
      observedValue: m.numericValue,
      unit: m.normalizedUnit,
      classification: 'unable_to_classify',
      direction: 'indeterminate',
      referenceInterval: null,
      triggeredRule: 'No Applicable Reference Interval Rule',
      plainExplanation: `No authoritative or synthetic reference interval found matching unit "${m.normalizedUnit}" and context "${m.context || 'general'}".`,
      clinicalSuggestion: 'Discuss with a healthcare provider who can apply lab-specific reference ranges.',
      supportingText: m.supportingText,
      warnings,
    };
  }

  // Safety check: Never compare incompatible units
  const intervalUnit = refInterval.unit || '';
  const measOrigUnit = m.originalUnit || '';
  const measNormUnit = m.normalizedUnit || '';

  const isCompatible =
    !intervalUnit ||
    (!measOrigUnit && !measNormUnit) ||
    (measOrigUnit ? areUnitsCompatible(m.canonicalId as CanonicalParameterId, measOrigUnit, intervalUnit) : false) ||
    (measNormUnit ? areUnitsCompatible(m.canonicalId as CanonicalParameterId, measNormUnit, intervalUnit) : false);

  if (!isCompatible) {
    return {
      id,
      measurementId: m.id,
      canonicalId: m.canonicalId,
      label: config.name,
      observedValue: m.numericValue !== null ? m.numericValue : m.value,
      unit: m.originalUnit || 'Unspecified',
      normalizedValue: m.normalizedValue ?? undefined,
      normalizedUnit: m.normalizedUnit,
      classification: 'needs_verification',
      direction: 'indeterminate',
      referenceInterval: refInterval,
      triggeredRule: 'Incompatible Units Safety Guard',
      plainExplanation: `Cannot compare measurement (${m.numericValue ?? m.value} ${m.originalUnit}) against reference interval (${refInterval.rawString}) due to incompatible units. Automatic conversion is not possible.`,
      clinicalSuggestion: 'Consult your lab or clinician to verify units before interpreting this finding.',
      supportingText: m.supportingText,
      warnings: [...warnings, `Incompatible units: ${m.originalUnit} vs ${intervalUnit}`],
    };
  }

  // Step 2: Critical Value Rule Evaluation (evaluated in standardUnit using normalizedValue)
  if (config.criticalThresholds) {
    const critVal = m.normalizedValue !== null ? m.normalizedValue : m.numericValue;
    const { low, high, ruleName, description } = config.criticalThresholds;

    if (critVal !== null) {
      if (low !== undefined && critVal < low) {
        return {
          id,
          measurementId: m.id,
          canonicalId: m.canonicalId,
          label: config.name,
          observedValue: m.normalizedValue !== null ? m.normalizedValue : (m.numericValue ?? m.value),
          unit: m.normalizedUnit || m.originalUnit,
          normalizedValue: m.normalizedValue ?? undefined,
          normalizedUnit: m.normalizedUnit,
          classification: 'critical',
          direction: 'critical',
          referenceInterval: refInterval,
          triggeredRule: ruleName,
          plainExplanation: `CRITICAL ALERT: ${description} (Observed: ${m.numericValue} ${m.originalUnit}${m.normalizedValue !== null && m.originalUnit !== m.normalizedUnit ? ` / ${m.normalizedValue} ${m.normalizedUnit}` : ''})`,
          clinicalSuggestion: 'URGENT: This value is in a critically low range. Contact a healthcare provider or emergency services immediately.',
          supportingText: m.supportingText,
          warnings,
        };
      }

      if (high !== undefined && critVal > high) {
        return {
          id,
          measurementId: m.id,
          canonicalId: m.canonicalId,
          label: config.name,
          observedValue: m.normalizedValue !== null ? m.normalizedValue : (m.numericValue ?? m.value),
          unit: m.normalizedUnit || m.originalUnit,
          normalizedValue: m.normalizedValue ?? undefined,
          normalizedUnit: m.normalizedUnit,
          classification: 'critical',
          direction: 'critical',
          referenceInterval: refInterval,
          triggeredRule: ruleName,
          plainExplanation: `CRITICAL ALERT: ${description} (Observed: ${m.numericValue} ${m.originalUnit}${m.normalizedValue !== null && m.originalUnit !== m.normalizedUnit ? ` / ${m.normalizedValue} ${m.normalizedUnit}` : ''})`,
          clinicalSuggestion: 'URGENT: This value is in a critically high range. Seek immediate medical attention.',
          supportingText: m.supportingText,
          warnings,
        };
      }
    }
  }

  // Step 3: Handle Comparator Results (e.g. "< 5" or "> 200")
  if (m.comparator) {
    return evaluateComparatorMeasurement(m, refInterval, config, id, warnings);
  }

  // Step 4: Standard Two-Sided and One-Sided Reference Interval Evaluation
  // Determine comparison values in the same consistent unit space:
  let compareVal: number;
  let min: number | null;
  let max: number | null;
  let evalUnit: string;

  if (
    intervalSource === 'report_printed' &&
    refInterval.min !== null &&
    m.numericValue !== null &&
    (!refInterval.unit || areUnitsCompatible(m.canonicalId as CanonicalParameterId, m.originalUnit, refInterval.unit)) &&
    (refInterval.normalizedMin === undefined || refInterval.normalizedMin === null)
  ) {
    // Both value and interval are in original printed unit space
    compareVal = m.numericValue;
    min = refInterval.min;
    max = refInterval.max;
    evalUnit = m.originalUnit;
  } else {
    // Both value and interval are in normalized standard unit space
    compareVal = m.normalizedValue !== null ? m.normalizedValue : m.numericValue!;
    min =
      refInterval.normalizedMin !== undefined && refInterval.normalizedMin !== null
        ? refInterval.normalizedMin
        : refInterval.min;
    max =
      refInterval.normalizedMax !== undefined && refInterval.normalizedMax !== null
        ? refInterval.normalizedMax
        : refInterval.max;
    evalUnit = refInterval.normalizedUnit || m.normalizedUnit || config.standardUnit;
  }

  const observedValDisplay = compareVal;
  const displayUnit = evalUnit;

  // One-sided "< X" reference (e.g. Total Cholesterol < 200)
  if (min === null && max !== null) {
    const isNormal = refInterval.isMaxInclusive ? compareVal <= max : compareVal < max;
    if (isNormal) {
      return {
        id,
        measurementId: m.id,
        canonicalId: m.canonicalId,
        label: config.name,
        observedValue: observedValDisplay,
        unit: displayUnit,
        normalizedValue: m.normalizedValue ?? undefined,
        normalizedUnit: m.normalizedUnit,
        classification: 'within_reference',
        direction: 'normal',
        referenceInterval: refInterval,
        triggeredRule: `Upper Limit Reference Rule (${intervalSource})`,
        plainExplanation: `Observed value ${observedValDisplay} ${displayUnit} is within the desirable upper bound of ${refInterval.rawString}.`,
        clinicalSuggestion: 'Maintains desirable level. Continue routine preventive health care.',
        supportingText: m.supportingText,
        warnings,
      };
    } else {
      return {
        id,
        measurementId: m.id,
        canonicalId: m.canonicalId,
        label: config.name,
        observedValue: observedValDisplay,
        unit: displayUnit,
        normalizedValue: m.normalizedValue ?? undefined,
        normalizedUnit: m.normalizedUnit,
        classification: 'high',
        direction: 'high',
        referenceInterval: refInterval,
        triggeredRule: `Upper Limit Elevation Rule (${intervalSource})`,
        plainExplanation: `Observed value ${observedValDisplay} ${displayUnit} exceeds the recommended upper bound (${refInterval.rawString}).`,
        clinicalSuggestion: 'Discuss this elevation with your doctor to explore dietary, lifestyle, or clinical considerations.',
        supportingText: m.supportingText,
        warnings,
      };
    }
  }

  // One-sided "> X" reference (e.g. HDL > 40)
  if (max === null && min !== null) {
    const isNormal = refInterval.isMinInclusive ? compareVal >= min : compareVal > min;
    if (isNormal) {
      return {
        id,
        measurementId: m.id,
        canonicalId: m.canonicalId,
        label: config.name,
        observedValue: observedValDisplay,
        unit: displayUnit,
        normalizedValue: m.normalizedValue ?? undefined,
        normalizedUnit: m.normalizedUnit,
        classification: 'within_reference',
        direction: 'normal',
        referenceInterval: refInterval,
        triggeredRule: `Lower Bound Reference Rule (${intervalSource})`,
        plainExplanation: `Observed value ${observedValDisplay} ${displayUnit} meets or exceeds the recommended minimum (${refInterval.rawString}).`,
        clinicalSuggestion: 'Within desirable range.',
        supportingText: m.supportingText,
        warnings,
      };
    } else {
      return {
        id,
        measurementId: m.id,
        canonicalId: m.canonicalId,
        label: config.name,
        observedValue: observedValDisplay,
        unit: displayUnit,
        normalizedValue: m.normalizedValue ?? undefined,
        normalizedUnit: m.normalizedUnit,
        classification: 'low',
        direction: 'low',
        referenceInterval: refInterval,
        triggeredRule: `Lower Bound Depletion Rule (${intervalSource})`,
        plainExplanation: `Observed value ${observedValDisplay} ${displayUnit} is below the recommended threshold (${refInterval.rawString}).`,
        clinicalSuggestion: 'Review this lower level with a clinician for potential contributing factors.',
        supportingText: m.supportingText,
        warnings,
      };
    }
  }

  // Standard Two-Sided Interval [min, max]
  if (min !== null && max !== null) {
    const isMinMet = refInterval.isMinInclusive ? compareVal >= min : compareVal > min;
    const isMaxMet = refInterval.isMaxInclusive ? compareVal <= max : compareVal < max;

    if (isMinMet && isMaxMet) {
      return {
        id,
        measurementId: m.id,
        canonicalId: m.canonicalId,
        label: config.name,
        observedValue: observedValDisplay,
        unit: displayUnit,
        normalizedValue: m.normalizedValue ?? undefined,
        normalizedUnit: m.normalizedUnit,
        classification: 'within_reference',
        direction: 'normal',
        referenceInterval: refInterval,
        triggeredRule: `Standard Interval Inclusion Rule (${intervalSource})`,
        plainExplanation: `Result ${observedValDisplay} ${displayUnit} is within the normal reference interval (${refInterval.rawString}).`,
        clinicalSuggestion: 'Result is in normal range. No immediate action required based on this test alone.',
        supportingText: m.supportingText,
        warnings,
      };
    } else if (!isMinMet) {
      return {
        id,
        measurementId: m.id,
        canonicalId: m.canonicalId,
        label: config.name,
        observedValue: observedValDisplay,
        unit: displayUnit,
        normalizedValue: m.normalizedValue ?? undefined,
        normalizedUnit: m.normalizedUnit,
        classification: 'low',
        direction: 'low',
        referenceInterval: refInterval,
        triggeredRule: `Lower Reference Bound Exclusion Rule (${intervalSource})`,
        plainExplanation: `Result ${observedValDisplay} ${displayUnit} is below the lower reference boundary (${refInterval.rawString}).`,
        clinicalSuggestion: 'Discuss this low result with a healthcare practitioner to understand its clinical relevance.',
        supportingText: m.supportingText,
        warnings,
      };
    } else {
      return {
        id,
        measurementId: m.id,
        canonicalId: m.canonicalId,
        label: config.name,
        observedValue: observedValDisplay,
        unit: displayUnit,
        normalizedValue: m.normalizedValue ?? undefined,
        normalizedUnit: m.normalizedUnit,
        classification: 'high',
        direction: 'high',
        referenceInterval: refInterval,
        triggeredRule: `Upper Reference Bound Exclusion Rule (${intervalSource})`,
        plainExplanation: `Result ${observedValDisplay} ${displayUnit} is higher than the upper reference boundary (${refInterval.rawString}).`,
        clinicalSuggestion: 'Discuss this elevated finding with your clinician to assess medical context and follow-up.',
        supportingText: m.supportingText,
        warnings,
      };
    }
  }

  return {
    id,
    measurementId: m.id,
    canonicalId: m.canonicalId,
    label: config.name,
    observedValue: observedValDisplay,
    unit: displayUnit,
    normalizedValue: m.normalizedValue ?? undefined,
    normalizedUnit: m.normalizedUnit,
    classification: 'unable_to_classify',
    direction: 'indeterminate',
    referenceInterval: refInterval,
    triggeredRule: 'Indeterminate Boundary Rule',
    plainExplanation: `Unable to definitively assess ${observedValDisplay} ${displayUnit} against interval ${refInterval.rawString}.`,
    clinicalSuggestion: 'Consult your lab or clinician.',
    supportingText: m.supportingText,
    warnings,
  };
}

/**
 * Handles comparator measurements (e.g. "< 5" or "> 100").
 */
function evaluateComparatorMeasurement(
  m: Measurement,
  ref: ReferenceInterval,
  config: (typeof PARAMETER_CONFIGS)[keyof typeof PARAMETER_CONFIGS],
  id: string,
  warnings: string[]
): Finding {
  const comp = m.comparator;

  // Determine comparison values in the same consistent unit space:
  let compareVal: number;
  let min: number | null;
  let max: number | null;
  let evalUnit: string;

  if (
    ref.source === 'report_printed' &&
    ref.min !== null &&
    m.numericValue !== null &&
    (!ref.unit || areUnitsCompatible(m.canonicalId as CanonicalParameterId, m.originalUnit, ref.unit))
  ) {
    compareVal = m.numericValue;
    min = ref.min;
    max = ref.max;
    evalUnit = m.originalUnit;
  } else {
    compareVal = m.normalizedValue !== null ? m.normalizedValue : m.numericValue!;
    min =
      ref.normalizedMin !== undefined && ref.normalizedMin !== null
        ? ref.normalizedMin
        : ref.min;
    max =
      ref.normalizedMax !== undefined && ref.normalizedMax !== null
        ? ref.normalizedMax
        : ref.max;
    evalUnit = m.normalizedUnit || config.standardUnit;
  }

  const observedValDisplay = `${comp} ${m.numericValue !== null ? m.numericValue : m.value}`;
  const displayUnit = m.originalUnit || evalUnit;

  // Case 1: Result is "< X" and reference upper limit is "max" (or "< max")
  if (comp === '<' || comp === '<=') {
    if (max !== null && compareVal <= max) {
      // If result is below X, and X <= max, but interval has min and compareVal <= min:
      if (min !== null && compareVal <= min) {
        return {
          id,
          measurementId: m.id,
          canonicalId: m.canonicalId,
          label: config.name,
          observedValue: observedValDisplay,
          unit: displayUnit,
          normalizedValue: m.normalizedValue ?? undefined,
          normalizedUnit: m.normalizedUnit,
          classification: 'needs_verification',
          direction: 'indeterminate',
          referenceInterval: ref,
          triggeredRule: 'Comparator Lower Bound Indeterminacy Rule',
          plainExplanation: `Measurement "${observedValDisplay} ${displayUnit}" cannot be confirmed within reference interval (${ref.rawString}) because the true numeric value may be below the lower limit of ${min}.`,
          clinicalSuggestion: 'Consult clinician or lab for quantitative dilution value if needed.',
          supportingText: m.supportingText,
          warnings: [...warnings, 'Comparator lower boundary uncertainty'],
        };
      }

      return {
        id,
        measurementId: m.id,
        canonicalId: m.canonicalId,
        label: config.name,
        observedValue: observedValDisplay,
        unit: displayUnit,
        normalizedValue: m.normalizedValue ?? undefined,
        normalizedUnit: m.normalizedUnit,
        classification: 'within_reference',
        direction: 'normal',
        referenceInterval: ref,
        triggeredRule: 'Comparator Upper Limit Conformance Rule',
        plainExplanation: `Measurement "${observedValDisplay} ${displayUnit}" is within the allowed reference boundary (${ref.rawString}).`,
        clinicalSuggestion: 'Within expected non-elevated reference limits.',
        supportingText: m.supportingText,
        warnings,
      };
    }
  }

  // Case 2: Result is "> X" and reference upper limit is max
  if (comp === '>' || comp === '>=') {
    if (max !== null && compareVal >= max) {
      return {
        id,
        measurementId: m.id,
        canonicalId: m.canonicalId,
        label: config.name,
        observedValue: observedValDisplay,
        unit: displayUnit,
        normalizedValue: m.normalizedValue ?? undefined,
        normalizedUnit: m.normalizedUnit,
        classification: 'high',
        direction: 'high',
        referenceInterval: ref,
        triggeredRule: 'Comparator Elevation Confirmation Rule',
        plainExplanation: `Measurement "${observedValDisplay} ${displayUnit}" confirmed to exceed reference upper bound (${ref.rawString}).`,
        clinicalSuggestion: 'Discuss this elevated finding with your healthcare provider.',
        supportingText: m.supportingText,
        warnings,
      };
    }
  }

  return {
    id,
    measurementId: m.id,
    canonicalId: m.canonicalId,
    label: config.name,
    observedValue: observedValDisplay,
    unit: displayUnit,
    normalizedValue: m.normalizedValue ?? undefined,
    normalizedUnit: m.normalizedUnit,
    classification: 'needs_verification',
    direction: 'indeterminate',
    referenceInterval: ref,
    triggeredRule: 'Comparator Indeterminate Rule',
    plainExplanation: `Measurement "${observedValDisplay} ${displayUnit}" requires clinical review against interval ${ref.rawString}.`,
    clinicalSuggestion: 'Review with a healthcare practitioner.',
    supportingText: m.supportingText,
    warnings: [...warnings, 'Comparator value indeterminate against range'],
  };
}
