import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { extractDocumentContent } from '../services/extractor.js';
import { parseMedicalReportText } from '../services/parser.js';
import { analyzeMeasurements, analyzeSingleMeasurement } from '../services/analyzer.js';
import { evaluateCombinations } from '../services/combinations.js';
import { convertUnit, convertReferenceInterval, areUnitsCompatible } from '../config/referenceRanges.js';
import { Measurement, ReferenceInterval } from '../types/index.js';

describe('Acceptance Tests: Synthetic Medical Report & Unit Conversion Bug Fix', () => {
  const pdfPath = path.resolve(__dirname, '../../../sample_reports/MedLens_Synthetic_Medical_Report.pdf');

  it('verifies all 11 measurements and exact classifications on MedLens_Synthetic_Medical_Report.pdf', async () => {
    expect(fs.existsSync(pdfPath)).toBe(true);

    const buffer = fs.readFileSync(pdfPath);
    const extraction = await extractDocumentContent(buffer, 'application/pdf', 'MedLens_Synthetic_Medical_Report.pdf');
    const parsed = parseMedicalReportText(extraction.fullText, 1, 'text_regex');

    // Requirement: 11 numeric measurements, treating blood pressure as two measurements
    expect(parsed.measurements).toHaveLength(11);

    const analysis = analyzeMeasurements(parsed.measurements, parsed.patientContext.sex);
    const findingsByCanonical = new Map(analysis.findings.map((f) => [f.canonicalId, f]));

    // Requirement: 6 out-of-range measurements and 5 within range
    expect(analysis.summaryMetrics.abnormalCount).toBe(6);
    expect(analysis.summaryMetrics.normalCount).toBe(5);
    expect(analysis.summaryMetrics.criticalCount).toBe(0);

    // Requirement: LOW: hemoglobin and platelets
    const hgb = findingsByCanonical.get('hemoglobin');
    expect(hgb).toBeDefined();
    expect(hgb?.classification).toBe('low');
    expect(hgb?.observedValue).toBe(10.2);

    const plt = findingsByCanonical.get('platelets');
    expect(plt).toBeDefined();
    expect(plt?.classification).toBe('low');
    // Confirm Platelets is NOT flagged HIGH!
    expect(plt?.classification).not.toBe('high');

    // Requirement: HIGH: fasting glucose, total cholesterol, LDL, and triglycerides
    const fbg = findingsByCanonical.get('glucose_fasting');
    expect(fbg?.classification).toBe('high');
    expect(fbg?.observedValue).toBe(142);

    const tc = findingsByCanonical.get('cholesterol_total');
    expect(tc?.classification).toBe('high');
    expect(tc?.observedValue).toBe(228);

    const ldl = findingsByCanonical.get('cholesterol_ldl');
    expect(ldl?.classification).toBe('high');
    expect(ldl?.observedValue).toBe(145);

    const tg = findingsByCanonical.get('triglycerides');
    expect(tg?.classification).toBe('high');
    expect(tg?.observedValue).toBe(210);

    // Requirement: WITHIN RANGE: WBC, HDL, creatinine, systolic BP, diastolic BP
    const wbc = findingsByCanonical.get('wbc');
    expect(wbc).toBeDefined();
    expect(wbc?.classification).toBe('within_reference');
    // Confirm WBC is NOT flagged HIGH!
    expect(wbc?.classification).not.toBe('high');

    const hdl = findingsByCanonical.get('cholesterol_hdl');
    expect(hdl?.classification).toBe('within_reference');
    expect(hdl?.observedValue).toBe(48);

    const cr = findingsByCanonical.get('creatinine');
    expect(cr?.classification).toBe('within_reference');
    expect(cr?.observedValue).toBe(0.9);

    const sbp = findingsByCanonical.get('blood_pressure_systolic');
    expect(sbp?.classification).toBe('within_reference');
    expect(sbp?.observedValue).toBe(118);

    const dbp = findingsByCanonical.get('blood_pressure_diastolic');
    expect(dbp?.classification).toBe('within_reference');
    expect(dbp?.observedValue).toBe(76);

    // Requirement: The two illustrative combinations described are identified
    const combinations = evaluateCombinations(parsed.measurements, analysis.findings, parsed.reportDate);
    const matchedRules = combinations.filter((c) => c.status === 'matched').map((c) => c.ruleId);

    expect(matchedRules).toContain('RULE-METABOLIC-01'); // Glucose + Triglycerides
    expect(matchedRules).toContain('RULE-HEMATO-03'); // Hemoglobin + Platelets

    // Requirement: No false glucose-plus-WBC alert
    const infectRule = combinations.find((c) => c.ruleId === 'RULE-GLYCEMIC-INFECT-05');
    expect(infectRule?.status).toBe('not_matched');

    // Requirement: No unsupported critical classification
    analysis.findings.forEach((f) => {
      expect(f.classification).not.toBe('critical');
    });
  });

  it('verifies reference bounds convert together with measurement values', () => {
    // WBC 7.4 10^3/uL with interval 4.0 - 11.0 10^3/uL
    const rawInterval: ReferenceInterval = {
      min: 4.0,
      max: 11.0,
      isMinInclusive: true,
      isMaxInclusive: true,
      rawString: '4.0 - 11.0',
      unit: '10^3/uL',
      source: 'report_printed',
    };

    const convertedInterval = convertReferenceInterval('wbc', rawInterval, '10^3/uL', '/uL');
    expect(convertedInterval.normalizedMin).toBe(4000);
    expect(convertedInterval.normalizedMax).toBe(11000);
    expect(convertedInterval.normalizedUnit).toBe('/uL');

    // Platelets 110 10^3/uL with interval 150 - 450 10^3/uL
    const rawPltInterval: ReferenceInterval = {
      min: 150,
      max: 450,
      isMinInclusive: true,
      isMaxInclusive: true,
      rawString: '150 - 450',
      unit: '10^3/uL',
      source: 'report_printed',
    };

    const convertedPlt = convertReferenceInterval('platelets', rawPltInterval, '10^3/uL', '/uL');
    expect(convertedPlt.normalizedMin).toBe(150000);
    expect(convertedPlt.normalizedMax).toBe(450000);
    expect(convertedPlt.normalizedUnit).toBe('/uL');
  });

  it('verifies equivalent measurements expressed in different units give identical classifications', () => {
    const baseWbc: Measurement = {
      id: 'm-wbc-test',
      canonicalId: 'wbc',
      originalLabel: 'WBC Count',
      value: '7.4',
      numericValue: 7.4,
      comparator: null,
      originalUnit: '10^3/uL',
      normalizedUnit: '/uL',
      normalizedValue: 7400,
      extractedInterval: {
        min: 4.0,
        max: 11.0,
        isMinInclusive: true,
        isMaxInclusive: true,
        rawString: '4.0 - 11.0 10^3/uL',
        unit: '10^3/uL',
        source: 'report_printed',
        normalizedMin: 4000,
        normalizedMax: 11000,
        normalizedUnit: '/uL',
      },
      context: null,
      sourcePage: 1,
      supportingText: 'WBC 7.4 10^3/uL',
      extractionMethod: 'text_regex',
      confidence: 0.99,
      verificationStatus: 'extracted',
      warnings: [],
    };

    // Form 1: 7.4 in 10^3/uL
    const finding1 = analyzeSingleMeasurement(baseWbc);
    expect(finding1.classification).toBe('within_reference');

    // Form 2: 7400 in /uL
    const wbcInCells: Measurement = {
      ...baseWbc,
      value: '7400',
      numericValue: 7400,
      originalUnit: '/uL',
      normalizedUnit: '/uL',
      normalizedValue: 7400,
      extractedInterval: {
        min: 4000,
        max: 11000,
        isMinInclusive: true,
        isMaxInclusive: true,
        rawString: '4000 - 11000 /uL',
        unit: '/uL',
        source: 'report_printed',
        normalizedMin: 4000,
        normalizedMax: 11000,
        normalizedUnit: '/uL',
      },
    };

    const finding2 = analyzeSingleMeasurement(wbcInCells);
    expect(finding2.classification).toBe('within_reference');
    expect(finding1.classification).toBe(finding2.classification);

    // Platelets Form 1: 110 10^3/uL -> LOW
    const plt1: Measurement = {
      ...baseWbc,
      id: 'm-plt-1',
      canonicalId: 'platelets',
      value: '110',
      numericValue: 110,
      originalUnit: '10^3/uL',
      normalizedUnit: '/uL',
      normalizedValue: 110000,
      extractedInterval: {
        min: 150,
        max: 450,
        isMinInclusive: true,
        isMaxInclusive: true,
        rawString: '150 - 450',
        unit: '10^3/uL',
        source: 'report_printed',
        normalizedMin: 150000,
        normalizedMax: 450000,
        normalizedUnit: '/uL',
      },
    };
    const pltFinding1 = analyzeSingleMeasurement(plt1);
    expect(pltFinding1.classification).toBe('low');

    // Platelets Form 2: 110000 /uL -> LOW
    const plt2: Measurement = {
      ...plt1,
      id: 'm-plt-2',
      value: '110000',
      numericValue: 110000,
      originalUnit: '/uL',
      extractedInterval: {
        min: 150000,
        max: 450000,
        isMinInclusive: true,
        isMaxInclusive: true,
        rawString: '150000 - 450000 /uL',
        unit: '/uL',
        source: 'report_printed',
        normalizedMin: 150000,
        normalizedMax: 450000,
        normalizedUnit: '/uL',
      },
    };
    const pltFinding2 = analyzeSingleMeasurement(plt2);
    expect(pltFinding2.classification).toBe('low');
    expect(pltFinding1.classification).toBe(pltFinding2.classification);
  });

  it('marks incompatible units or missing units as needs_verification safety guard', () => {
    // Hemoglobin with nonsense unit "seconds"
    const incompatible: Measurement = {
      id: 'm-incompat',
      canonicalId: 'hemoglobin',
      originalLabel: 'Hemoglobin',
      value: '14.0',
      numericValue: 14.0,
      comparator: null,
      originalUnit: 'seconds',
      normalizedUnit: 'seconds',
      normalizedValue: null,
      extractedInterval: {
        min: 12.0,
        max: 16.0,
        isMinInclusive: true,
        isMaxInclusive: true,
        rawString: '12.0 - 16.0 g/dL',
        unit: 'g/dL',
        source: 'report_printed',
      },
      context: null,
      sourcePage: 1,
      supportingText: 'Hemoglobin 14.0 seconds',
      extractionMethod: 'text_regex',
      confidence: 0.9,
      verificationStatus: 'extracted',
      warnings: [],
    };

    const finding = analyzeSingleMeasurement(incompatible);
    expect(finding.classification).toBe('needs_verification');
    expect(finding.triggeredRule).toContain('Incompatible');

    // Unit compatibility function check
    expect(areUnitsCompatible('hemoglobin', 'g/dL', 'g/L')).toBe(true);
    expect(areUnitsCompatible('hemoglobin', 'g/dL', 'seconds')).toBe(false);
    expect(areUnitsCompatible('platelets', '10^3/uL', '/uL')).toBe(true);
    expect(areUnitsCompatible('platelets', '10^3/uL', 'mg/dL')).toBe(false);
  });
});
