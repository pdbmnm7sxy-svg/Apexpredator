import {
  CanonicalParameterId,
  CombinationAlert,
  Finding,
  Measurement,
} from '../types/index.js';
import { COMBINATION_RULES } from '../config/combinationRules.js';

/**
 * Pure, deterministic multi-parameter combination rule engine.
 * Evaluates verified measurements from the SAME report / specimen date.
 */
export function evaluateCombinations(
  measurements: Measurement[],
  findings: Finding[],
  reportDate?: string
): CombinationAlert[] {
  const alerts: CombinationAlert[] = [];

  // Map findings by canonical parameter ID for rapid lookup
  const findingMap = new Map<CanonicalParameterId, Finding>();
  for (const f of findings) {
    if (f.canonicalId !== 'unsupported_other') {
      findingMap.set(f.canonicalId, f);
    }
  }

  // Map measurements by canonical parameter ID
  const measurementMap = new Map<CanonicalParameterId, Measurement>();
  for (const m of measurements) {
    if (m.canonicalId !== 'unsupported_other') {
      measurementMap.set(m.canonicalId, m);
    }
  }

  for (const rule of COMBINATION_RULES) {
    // Step 1: Check for missing parameters
    const missingParameters: CanonicalParameterId[] = [];
    for (const req of rule.requiredParameters) {
      if (!findingMap.has(req)) {
        missingParameters.push(req);
      }
    }

    // If any required parameter is missing:
    if (missingParameters.length > 0) {
      if (rule.missingDataBehavior === 'not_evaluable') {
        const missingNames = missingParameters
          .map((p) => p.replace(/_/g, ' ').toUpperCase())
          .join(', ');

        alerts.push({
          ruleId: rule.ruleId,
          ruleTitle: rule.title,
          status: 'not_evaluable',
          reviewPriority: rule.reviewPriority,
          contributingMeasurements: [],
          matchedConditions: [],
          missingParameters,
          explanation: `Not Evaluable: Report does not contain required test data for: ${missingNames}. This combination cannot be assessed from this document.`,
          disclaimer: 'Educational prototype rule. Missing data prevents evaluation.',
          referenceSource: rule.referenceSource,
        });
      }
      continue;
    }

    // Step 2: Evaluate predicates
    const matchedConditions: string[] = [];
    const contributing: CombinationAlert['contributingMeasurements'] = [];
    let allPredicatesPassed = true;
    let anyPredicatePassed = false;

    for (const pred of rule.predicates) {
      const finding = findingMap.get(pred.parameterId)!;
      const measurement = measurementMap.get(pred.parameterId)!;

      let predPassed = false;
      let reason = '';

      if (pred.condition === 'status_in' && pred.expectedStatuses) {
        if (pred.expectedStatuses.includes(finding.classification)) {
          predPassed = true;
          reason = `${finding.label} is ${finding.classification.toUpperCase()} (${finding.observedValue} ${finding.unit}; Ref: ${finding.referenceInterval?.rawString || 'N/A'})`;
        }
      } else if (pred.condition === 'value_gt' && pred.threshold !== undefined) {
        const num = measurement.normalizedValue !== null ? measurement.normalizedValue : measurement.numericValue;
        if (num !== null && num > pred.threshold) {
          predPassed = true;
          reason = `${finding.label} (${num} ${finding.unit}) exceeds threshold of ${pred.threshold}`;
        }
      } else if (pred.condition === 'value_lt' && pred.threshold !== undefined) {
        const num = measurement.normalizedValue !== null ? measurement.normalizedValue : measurement.numericValue;
        if (num !== null && num < pred.threshold) {
          predPassed = true;
          reason = `${finding.label} (${num} ${finding.unit}) is below threshold of ${pred.threshold}`;
        }
      }

      if (predPassed) {
        matchedConditions.push(reason);
        contributing.push({
          parameterId: pred.parameterId,
          label: finding.label,
          value: finding.observedValue,
          unit: finding.unit,
          classification: finding.classification,
          referenceRangeText: finding.referenceInterval?.rawString || 'Configured Range',
        });
        anyPredicatePassed = true;
      } else {
        allPredicatesPassed = false;
      }
    }

    const isMatch =
      rule.logicalOperator === 'AND' ? allPredicatesPassed : anyPredicatePassed;

    if (isMatch) {
      // Build dynamic explanation from template
      let explanation = rule.explanationTemplate;
      for (const req of rule.requiredParameters) {
        const f = findingMap.get(req)!;
        explanation = explanation
          .replace(new RegExp(`{${req}_val}`, 'g'), f.observedValue.toString())
          .replace(new RegExp(`{${req}_unit}`, 'g'), f.unit);
      }

      alerts.push({
        ruleId: rule.ruleId,
        ruleTitle: rule.title,
        status: 'matched',
        reviewPriority: rule.reviewPriority,
        contributingMeasurements: contributing,
        matchedConditions,
        missingParameters: [],
        explanation,
        disclaimer:
          'Illustrative co-occurrence prototype rule. This alert indicates findings that may merit coordinated clinical review, but does not diagnose any disease or compute clinical probabilities.',
        referenceSource: rule.referenceSource,
      });
    } else {
      alerts.push({
        ruleId: rule.ruleId,
        ruleTitle: rule.title,
        status: 'not_matched',
        reviewPriority: rule.reviewPriority,
        contributingMeasurements: [],
        matchedConditions: [],
        missingParameters: [],
        explanation: 'The parameters required for this co-occurrence rule were evaluated, but criteria for this alert were not met.',
        disclaimer: 'Educational prototype rule. Findings within expected limits for this rule.',
        referenceSource: rule.referenceSource,
      });
    }
  }

  return alerts;
}
