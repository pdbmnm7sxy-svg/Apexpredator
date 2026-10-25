import { describe, it, expect } from 'vitest';
import { analyzeMeasurements, analyzeSingleMeasurement } from '../services/analyzer.js';
import { Measurement } from '../types/index.js';

describe('Algorithm 3: Rule-Based Abnormality Analyzer', () => {
  const baseMeasurement: Measurement = {
    id: 'm-test-1',
    canonicalId: 'glucose_fasting',
    originalLabel: 'Fasting Blood Glucose',
    value: '95',
    numericValue: 95,
    comparator: null,
    originalUnit: 'mg/dL',
    normalizedUnit: 'mg/dL',
    normalizedValue: 95,
    extractedInterval: null,
    context: 'fasting',
    sourcePage: 1,
    supportingText: 'Glucose 95 mg/dL',
    extractionMethod: 'text_regex',
    confidence: 0.99,
    verificationStatus: 'extracted',
    warnings: [],
  };

  it('classifies a value within reference interval as within_reference (inclusive bounds)', () => {
    // Exactly at min (70)
    const atMin = analyzeSingleMeasurement({ ...baseMeasurement, numericValue: 70, normalizedValue: 70 });
    expect(atMin.classification).toBe('within_reference');
    expect(atMin.direction).toBe('normal');

    // Exactly at max (99)
    const atMax = analyzeSingleMeasurement({ ...baseMeasurement, numericValue: 99, normalizedValue: 99 });
    expect(atMax.classification).toBe('within_reference');
    expect(atMax.direction).toBe('normal');
  });

  it('classifies values outside reference boundaries as low or high', () => {
    const low = analyzeSingleMeasurement({ ...baseMeasurement, numericValue: 64, normalizedValue: 64 });
    expect(low.classification).toBe('low');
    expect(low.direction).toBe('low');

    const high = analyzeSingleMeasurement({ ...baseMeasurement, numericValue: 125, normalizedValue: 125 });
    expect(high.classification).toBe('high');
    expect(high.direction).toBe('high');
  });

  it('triggers critical classification ONLY when a separate explicit critical rule is violated', () => {
    // Normal high glucose (e.g. 150 mg/dL is high, but NOT critical)
    const highNotCritical = analyzeSingleMeasurement({ ...baseMeasurement, numericValue: 150, normalizedValue: 150 });
    expect(highNotCritical.classification).toBe('high');
    expect(highNotCritical.classification).not.toBe('critical');

    // Critical high glucose (> 400 mg/dL)
    const criticalHigh = analyzeSingleMeasurement({ ...baseMeasurement, numericValue: 450, normalizedValue: 450 });
    expect(criticalHigh.classification).toBe('critical');
    expect(criticalHigh.direction).toBe('critical');
    expect(criticalHigh.triggeredRule).toContain('Critical Glucose');

    // Critical low glucose (< 50 mg/dL)
    const criticalLow = analyzeSingleMeasurement({ ...baseMeasurement, numericValue: 42, normalizedValue: 42 });
    expect(criticalLow.classification).toBe('critical');
    expect(criticalLow.direction).toBe('critical');

    // Platelets critical rule (< 20,000 /uL)
    const critPlt = analyzeSingleMeasurement({
      ...baseMeasurement,
      canonicalId: 'platelets',
      numericValue: 15000,
      normalizedValue: 15000,
      normalizedUnit: '/uL',
    });
    expect(critPlt.classification).toBe('critical');
    expect(critPlt.triggeredRule).toContain('Critical Platelet');
  });

  it('prefers explicitly printed report intervals over configured defaults', () => {
    const printedRange = {
      min: 65,
      max: 105,
      isMinInclusive: true,
      isMaxInclusive: true,
      rawString: '65 - 105 mg/dL (Lab Specific)',
      unit: 'mg/dL',
      source: 'report_printed' as const,
    };

    // 102 mg/dL would be HIGH under standard 70-99, but NORMAL under lab printed 65-105
    const finding = analyzeSingleMeasurement({
      ...baseMeasurement,
      numericValue: 102,
      normalizedValue: 102,
      extractedInterval: printedRange,
    });

    expect(finding.classification).toBe('within_reference');
    expect(finding.referenceInterval?.source).toBe('report_printed');
    expect(finding.referenceInterval?.rawString).toContain('65 - 105');
  });

  it('flags missing units as needs_verification for clinical safety', () => {
    const missingUnitFinding = analyzeSingleMeasurement({
      ...baseMeasurement,
      originalUnit: '',
      normalizedUnit: '',
    });
    expect(missingUnitFinding.classification).toBe('needs_verification');
    expect(missingUnitFinding.triggeredRule).toContain('Missing Unit');
  });

  it('supports interactive re-analysis after user corrects a value or unit', () => {
    // Initial extracted measurement had typo "18" instead of "180" for platelets, but unit was missing
    const initial: Measurement = {
      ...baseMeasurement,
      canonicalId: 'platelets',
      numericValue: 18,
      normalizedValue: 18,
      originalUnit: '',
      normalizedUnit: '',
    };
    const initialFinding = analyzeSingleMeasurement(initial);
    expect(initialFinding.classification).toBe('needs_verification');

    // User corrects value to 180 and unit to "10^3/uL"
    const corrected: Measurement = {
      ...initial,
      value: '180',
      numericValue: 180,
      originalUnit: '10^3/uL',
      normalizedUnit: '/uL',
      normalizedValue: 180000,
      isUserModified: true,
      verificationStatus: 'user_edited',
    };
    const correctedFinding = analyzeSingleMeasurement(corrected);
    expect(correctedFinding.classification).toBe('within_reference');
    expect(correctedFinding.observedValue).toBe(180000);
  });
});
