import { describe, it, expect } from 'vitest';
import { parseMedicalReportText, extractReferenceInterval } from '../services/parser.js';
import { convertUnit } from '../config/referenceRanges.js';

describe('Algorithm 2: Medical Parameter Parser', () => {
  it('parses tabular lab rows with aliases for hemoglobin, glucose, creatinine, and platelets', () => {
    const raw = `
Hemoglobin                     14.2        g/dL         13.5 - 17.5
Fasting Blood Sugar            110         mg/dL        70 - 99
Serum Creatinine               1.4         mg/dL        0.7 - 1.3
Platelet Count                 180,000     /uL          150,000 - 450,000
    `;
    const res = parseMedicalReportText(raw, 1);
    expect(res.measurements.length).toBe(4);

    const hb = res.measurements.find((m) => m.canonicalId === 'hemoglobin')!;
    expect(hb).toBeDefined();
    expect(hb.numericValue).toBe(14.2);
    expect(hb.normalizedUnit).toBe('g/dL');
    expect(hb.extractedInterval?.min).toBe(13.5);
    expect(hb.extractedInterval?.max).toBe(17.5);

    const fbs = res.measurements.find((m) => m.canonicalId === 'glucose_fasting')!;
    expect(fbs).toBeDefined();
    expect(fbs.numericValue).toBe(110);
    expect(fbs.context).toBe('fasting');

    const creat = res.measurements.find((m) => m.canonicalId === 'creatinine')!;
    expect(creat).toBeDefined();
    expect(creat.numericValue).toBe(1.4);

    const plt = res.measurements.find((m) => m.canonicalId === 'platelets')!;
    expect(plt).toBeDefined();
    expect(plt.numericValue).toBe(180000);
  });

  it('correctly parses compound Blood Pressure readings into separate systolic and diastolic measurements', () => {
    const raw = `Blood Pressure: 142/88 mmHg (Ref: 90-120 / 60-80)`;
    const res = parseMedicalReportText(raw, 1);

    const sys = res.measurements.find((m) => m.canonicalId === 'blood_pressure_systolic')!;
    const dia = res.measurements.find((m) => m.canonicalId === 'blood_pressure_diastolic')!;

    expect(sys).toBeDefined();
    expect(sys.numericValue).toBe(142);
    expect(sys.normalizedUnit).toBe('mmHg');

    expect(dia).toBeDefined();
    expect(dia.numericValue).toBe(88);
    expect(dia.normalizedUnit).toBe('mmHg');
  });

  it('avoids mistaking patient age or dates for measurement values', () => {
    const raw = `
Patient Age: 45 Yrs
Date of Collection: 2024-05-12
Serum Creatinine: 0.9 mg/dL (0.6 - 1.2)
    `;
    const res = parseMedicalReportText(raw, 1);
    expect(res.patientContext.age).toBe(45);
    expect(res.reportDate).toBe('2024-05-12');

    const creat = res.measurements.find((m) => m.canonicalId === 'creatinine')!;
    expect(creat.numericValue).toBe(0.9);
    expect(creat.numericValue).not.toBe(45);
    expect(creat.numericValue).not.toBe(2024);
  });

  it('handles comparator values such as "< 50"', () => {
    const raw = `Platelets: < 50 10^3/uL (150 - 450)`;
    const res = parseMedicalReportText(raw, 1);
    const plt = res.measurements.find((m) => m.canonicalId === 'platelets')!;
    expect(plt).toBeDefined();
    expect(plt.comparator).toBe('<');
    expect(plt.numericValue).toBe(50);
    // 50 * 1000 = 50000
    expect(plt.normalizedValue).toBe(50000);
  });

  it('performs explicit, parameter-specific unit conversions', () => {
    // Glucose mmol/L -> mg/dL
    const glucConv = convertUnit('glucose_fasting', 5.5, 'mmol/L');
    expect(glucConv).not.toBeNull();
    expect(glucConv?.normalizedValue).toBeCloseTo(99.1, 1);
    expect(glucConv?.normalizedUnit).toBe('mg/dL');

    // Cholesterol mmol/L -> mg/dL
    const cholConv = convertUnit('cholesterol_total', 5.2, 'mmol/L');
    expect(cholConv).not.toBeNull();
    expect(cholConv?.normalizedValue).toBeCloseTo(201.1, 1);

    // Hemoglobin g/L -> g/dL
    const hbConv = convertUnit('hemoglobin', 140, 'g/L');
    expect(hbConv).not.toBeNull();
    expect(hbConv?.normalizedValue).toBe(14);
    expect(hbConv?.normalizedUnit).toBe('g/dL');

    // Platelets 10^3/uL -> /uL
    const pltConv = convertUnit('platelets', 250, '10^3/uL');
    expect(pltConv).not.toBeNull();
    expect(pltConv?.normalizedValue).toBe(250000);

    // Creatinine umol/L -> mg/dL
    const creatConv = convertUnit('creatinine', 106, 'umol/L');
    expect(creatConv).not.toBeNull();
    expect(creatConv?.normalizedValue).toBeCloseTo(1.2, 1);
  });

  it('returns null and never guesses when an incompatible unit is provided', () => {
    const invalidConv = convertUnit('glucose_fasting', 100, 'g/dL');
    expect(invalidConv).toBeNull();
  });

  it('extracts two-sided and one-sided reference intervals', () => {
    const twoSided = extractReferenceInterval('Glucose: 95 mg/dL (Ref: 70 - 99 mg/dL)');
    expect(twoSided).not.toBeNull();
    expect(twoSided?.min).toBe(70);
    expect(twoSided?.max).toBe(99);

    const oneSided = extractReferenceInterval('Total Cholesterol: 180 mg/dL (< 200)');
    expect(oneSided).not.toBeNull();
    expect(oneSided?.max).toBe(200);
    expect(oneSided?.isOneSided).toBe(true);
  });
});
