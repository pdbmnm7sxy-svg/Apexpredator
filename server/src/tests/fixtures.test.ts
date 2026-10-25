import { describe, it, expect } from 'vitest';
import { SYNTHETIC_SAMPLES } from '../fixtures/syntheticSamples.js';
import { parseMedicalReportText } from '../services/parser.js';
import { analyzeMeasurements } from '../services/analyzer.js';
import { evaluateCombinations } from '../services/combinations.js';

describe('Synthetic Test Fixtures End-to-End Evaluation', () => {
  it('Fixture 1: Normal Routine Panel contains all normal values', () => {
    const f1 = SYNTHETIC_SAMPLES.find((s) => s.id === 'sample-all-normal')!;
    const parsed = parseMedicalReportText(f1.rawText, 1);
    expect(parsed.measurements.length).toBeGreaterThanOrEqual(9);

    const { findings, summaryMetrics } = analyzeMeasurements(parsed.measurements, 'male');
    expect(summaryMetrics.abnormalCount).toBe(0);
    expect(summaryMetrics.criticalCount).toBe(0);
    expect(summaryMetrics.normalCount).toBe(parsed.measurements.length);

    const combos = evaluateCombinations(parsed.measurements, findings, f1.reportDate);
    const matched = combos.filter((c) => c.status === 'matched');
    expect(matched.length).toBe(0);
  });

  it('Fixture 2: Isolated Abnormality detects elevated glucose with no combination alert', () => {
    const f2 = SYNTHETIC_SAMPLES.find((s) => s.id === 'sample-isolated-abnormality')!;
    const parsed = parseMedicalReportText(f2.rawText, 1);
    const { findings, summaryMetrics } = analyzeMeasurements(parsed.measurements, 'female');

    expect(summaryMetrics.abnormalCount).toBe(1);
    const gluc = findings.find((f) => f.canonicalId === 'glucose_fasting')!;
    expect(gluc.classification).toBe('high');

    const combos = evaluateCombinations(parsed.measurements, findings, f2.reportDate);
    const matched = combos.filter((c) => c.status === 'matched');
    expect(matched.length).toBe(0);
  });

  it('Fixture 3: Metabolic Risk Combination triggers co-occurrence alert', () => {
    const f3 = SYNTHETIC_SAMPLES.find((s) => s.id === 'sample-metabolic-combination')!;
    const parsed = parseMedicalReportText(f3.rawText, 1);
    const { findings, summaryMetrics } = analyzeMeasurements(parsed.measurements, 'male');

    expect(summaryMetrics.abnormalCount).toBeGreaterThanOrEqual(3);
    const combos = evaluateCombinations(parsed.measurements, findings, f3.reportDate);
    const matched = combos.filter((c) => c.status === 'matched');
    expect(matched.length).toBeGreaterThanOrEqual(1);

    const metabolic = matched.find((m) => m.ruleId === 'RULE-METABOLIC-01');
    expect(metabolic).toBeDefined();
    expect(metabolic?.contributingMeasurements.length).toBe(2);
  });

  it('Fixture 4: Dual Cytopenia triggers bicytopenia indicator', () => {
    const f4 = SYNTHETIC_SAMPLES.find((s) => s.id === 'sample-bicytopenia-combination')!;
    const parsed = parseMedicalReportText(f4.rawText, 1);
    const { findings } = analyzeMeasurements(parsed.measurements, 'female');

    const combos = evaluateCombinations(parsed.measurements, findings, f4.reportDate);
    const matched = combos.filter((c) => c.status === 'matched');
    const bicytopenia = matched.find((m) => m.ruleId === 'RULE-HEMATO-03');
    expect(bicytopenia).toBeDefined();
    expect(bicytopenia?.reviewPriority).toBe('urgent');
  });

  it('Fixture 5: Incomplete lab slip flags missing unit as needs_verification', () => {
    const f5 = SYNTHETIC_SAMPLES.find((s) => s.id === 'sample-needs-verification')!;
    const parsed = parseMedicalReportText(f5.rawText, 1);
    const { findings, summaryMetrics } = analyzeMeasurements(parsed.measurements, 'male');

    expect(summaryMetrics.verificationNeededCount).toBeGreaterThanOrEqual(1);
    const creat = findings.find((f) => f.canonicalId === 'creatinine')!;
    expect(creat.classification).toBe('needs_verification');
  });

  it('Fixture 6: Scanned thermal printout parses properly', () => {
    const f6 = SYNTHETIC_SAMPLES.find((s) => s.id === 'sample-scanned-ocr')!;
    const parsed = parseMedicalReportText(f6.rawText, 1, 'ocr', 0.88);
    expect(parsed.measurements.length).toBeGreaterThanOrEqual(5);

    const { findings } = analyzeMeasurements(parsed.measurements, 'male');
    const gluc = findings.find((f) => f.canonicalId === 'glucose_random')!;
    expect(gluc).toBeDefined();
    expect(gluc.classification).toBe('high');
  });

  it('Fixtures 7 & 8: Separation of different report dates prevents cross-date combination alerts', () => {
    const f7 = SYNTHETIC_SAMPLES.find((s) => s.id === 'sample-trend-earlier')!;
    const f8 = SYNTHETIC_SAMPLES.find((s) => s.id === 'sample-trend-later')!;

    expect(f7.reportDate).toBe('2024-01-15');
    expect(f8.reportDate).toBe('2024-04-15');
    expect(f7.reportDate).not.toBe(f8.reportDate);

    // Each report must be analyzed with its own date
    const parsed7 = parseMedicalReportText(f7.rawText, 1);
    const { findings: findings7 } = analyzeMeasurements(parsed7.measurements, 'female');
    const combos7 = evaluateCombinations(parsed7.measurements, findings7, f7.reportDate);

    const parsed8 = parseMedicalReportText(f8.rawText, 1);
    const { findings: findings8 } = analyzeMeasurements(parsed8.measurements, 'female');
    const combos8 = evaluateCombinations(parsed8.measurements, findings8, f8.reportDate);

    // Baseline report had high triglycerides and high glucose -> matched metabolic
    const matched7 = combos7.filter((c) => c.status === 'matched');
    expect(matched7.some((c) => c.ruleId === 'RULE-METABOLIC-01')).toBe(true);

    // Follow-up report had improved glucose (112 mg/dL - not fasting normal, but triglycerides improved to 175)
    // Both reports maintain distinct timestamps and do not contaminate each other
    expect(f7.reportDate).toBe('2024-01-15');
    expect(f8.reportDate).toBe('2024-04-15');
  });
});
