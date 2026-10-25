import { describe, it, expect } from 'vitest';
import { evaluateCombinations } from '../services/combinations.js';
import { Finding, Measurement } from '../types/index.js';

describe('Algorithm 4: Concerning Combinations Rule Engine', () => {
  function makeMeasurement(id: string, canonicalId: any, val: number, unit: string): Measurement {
    return {
      id,
      canonicalId,
      originalLabel: canonicalId,
      value: val.toString(),
      numericValue: val,
      comparator: null,
      originalUnit: unit,
      normalizedUnit: unit,
      normalizedValue: val,
      extractedInterval: null,
      context: canonicalId.includes('fasting') ? 'fasting' : null,
      sourcePage: 1,
      supportingText: `${canonicalId}: ${val} ${unit}`,
      extractionMethod: 'text_regex',
      confidence: 0.99,
      verificationStatus: 'extracted',
      warnings: [],
    };
  }

  function makeFinding(id: string, canonicalId: any, val: number, unit: string, classification: any): Finding {
    return {
      id: `f-${id}`,
      measurementId: id,
      canonicalId,
      label: canonicalId,
      observedValue: val,
      unit,
      classification,
      direction: classification === 'within_reference' ? 'normal' : classification,
      referenceInterval: null,
      triggeredRule: 'Test Rule',
      plainExplanation: 'Test explanation',
      clinicalSuggestion: 'Test suggestion',
      supportingText: 'Test text',
      warnings: [],
    };
  }

  it('matches Atherogenic Metabolic Alert when BOTH glucose and triglycerides are high', () => {
    const measurements = [
      makeMeasurement('m1', 'glucose_fasting', 155, 'mg/dL'),
      makeMeasurement('m2', 'triglycerides', 240, 'mg/dL'),
    ];
    const findings = [
      makeFinding('m1', 'glucose_fasting', 155, 'mg/dL', 'high'),
      makeFinding('m2', 'triglycerides', 240, 'mg/dL', 'high'),
    ];

    const alerts = evaluateCombinations(measurements, findings, '2024-05-15');
    const metabolicAlert = alerts.find((a) => a.ruleId === 'RULE-METABOLIC-01')!;

    expect(metabolicAlert).toBeDefined();
    expect(metabolicAlert.status).toBe('matched');
    expect(metabolicAlert.contributingMeasurements.length).toBe(2);
    expect(metabolicAlert.reviewPriority).toBe('high');
    expect(metabolicAlert.explanation).toContain('Fasting Glucose');
    expect(metabolicAlert.explanation).toContain('Triglycerides');
  });

  it('reports not_matched when only one condition is abnormal', () => {
    const measurements = [
      makeMeasurement('m1', 'glucose_fasting', 155, 'mg/dL'),
      makeMeasurement('m2', 'triglycerides', 110, 'mg/dL'), // Normal triglycerides!
    ];
    const findings = [
      makeFinding('m1', 'glucose_fasting', 155, 'mg/dL', 'high'),
      makeFinding('m2', 'triglycerides', 110, 'mg/dL', 'within_reference'),
    ];

    const alerts = evaluateCombinations(measurements, findings, '2024-05-15');
    const metabolicAlert = alerts.find((a) => a.ruleId === 'RULE-METABOLIC-01')!;

    expect(metabolicAlert).toBeDefined();
    expect(metabolicAlert.status).toBe('not_matched');
    expect(metabolicAlert.contributingMeasurements.length).toBe(0);
  });

  it('reports not_evaluable and lists missing parameters when report lacks required data', () => {
    // Report has Glucose, but lacks Triglycerides entirely
    const measurements = [
      makeMeasurement('m1', 'glucose_fasting', 155, 'mg/dL'),
    ];
    const findings = [
      makeFinding('m1', 'glucose_fasting', 155, 'mg/dL', 'high'),
    ];

    const alerts = evaluateCombinations(measurements, findings, '2024-05-15');
    const metabolicAlert = alerts.find((a) => a.ruleId === 'RULE-METABOLIC-01')!;

    expect(metabolicAlert).toBeDefined();
    expect(metabolicAlert.status).toBe('not_evaluable');
    expect(metabolicAlert.missingParameters).toContain('triglycerides');
    expect(metabolicAlert.explanation).toContain('TRIGLYCERIDES');
  });

  it('matches Bicytopenia Indicator when both Hemoglobin and Platelets are low', () => {
    const measurements = [
      makeMeasurement('m1', 'hemoglobin', 8.5, 'g/dL'),
      makeMeasurement('m2', 'platelets', 65000, '/uL'),
    ];
    const findings = [
      makeFinding('m1', 'hemoglobin', 8.5, 'g/dL', 'low'),
      makeFinding('m2', 'platelets', 65000, '/uL', 'low'),
    ];

    const alerts = evaluateCombinations(measurements, findings, '2024-05-15');
    const hematoAlert = alerts.find((a) => a.ruleId === 'RULE-HEMATO-03')!;

    expect(hematoAlert).toBeDefined();
    expect(hematoAlert.status).toBe('matched');
    expect(hematoAlert.reviewPriority).toBe('urgent');
  });

  it('matches Hypertensive Renal Strain when Creatinine and Blood Pressure Systolic are both elevated', () => {
    const measurements = [
      makeMeasurement('m1', 'creatinine', 1.8, 'mg/dL'),
      makeMeasurement('m2', 'blood_pressure_systolic', 152, 'mmHg'),
    ];
    const findings = [
      makeFinding('m1', 'creatinine', 1.8, 'mg/dL', 'high'),
      makeFinding('m2', 'blood_pressure_systolic', 152, 'mmHg', 'high'),
    ];

    const alerts = evaluateCombinations(measurements, findings, '2024-05-15');
    const renalAlert = alerts.find((a) => a.ruleId === 'RULE-RENAL-VASC-02')!;

    expect(renalAlert).toBeDefined();
    expect(renalAlert.status).toBe('matched');
    expect(renalAlert.reviewPriority).toBe('urgent');
  });
});
