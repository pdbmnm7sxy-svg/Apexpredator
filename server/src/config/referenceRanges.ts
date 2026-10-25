import { CanonicalParameterId, ReferenceInterval } from '../types/index.js';

export interface ParameterConfig {
  canonicalId: CanonicalParameterId;
  name: string;
  category: 'Hematology' | 'Metabolic' | 'Lipid Profile' | 'Renal Function' | 'Vitals';
  standardUnit: string;
  alternativeUnits: string[];
  referenceIntervals: {
    context?: string; // e.g. 'fasting', 'random', 'default', 'male', 'female'
    interval: ReferenceInterval;
  }[];
  criticalThresholds?: {
    low?: number;
    high?: number;
    ruleName: string;
    description: string;
  };
  plainName: string;
  description: string;
}

export const PARAMETER_CONFIGS: Record<CanonicalParameterId, ParameterConfig> = {
  hemoglobin: {
    canonicalId: 'hemoglobin',
    name: 'Hemoglobin (Hb)',
    category: 'Hematology',
    standardUnit: 'g/dL',
    alternativeUnits: ['g/L'],
    referenceIntervals: [
      {
        context: 'default',
        interval: {
          min: 12.0,
          max: 16.5,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '12.0 - 16.5 g/dL',
          unit: 'g/dL',
          source: 'configured_demo_default',
          intendedContext: 'Adult General (Synthetic Demo Reference)',
        },
      },
      {
        context: 'male',
        interval: {
          min: 13.5,
          max: 17.5,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '13.5 - 17.5 g/dL',
          unit: 'g/dL',
          source: 'configured_demo_default',
          intendedContext: 'Adult Male (Synthetic Demo Reference)',
        },
      },
      {
        context: 'female',
        interval: {
          min: 12.0,
          max: 15.5,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '12.0 - 15.5 g/dL',
          unit: 'g/dL',
          source: 'configured_demo_default',
          intendedContext: 'Adult Female (Synthetic Demo Reference)',
        },
      },
    ],
    criticalThresholds: {
      low: 7.0,
      high: 20.0,
      ruleName: 'Critical Hemoglobin Threshold Rule',
      description: 'Hemoglobin < 7.0 g/dL indicates severe life-threatening anemia; > 20.0 g/dL indicates critical polycythemia.',
    },
    plainName: 'Oxygen-carrying protein in red blood cells',
    description: 'Measures the concentration of hemoglobin, essential for delivering oxygen throughout the body.',
  },

  glucose_fasting: {
    canonicalId: 'glucose_fasting',
    name: 'Fasting Blood Glucose',
    category: 'Metabolic',
    standardUnit: 'mg/dL',
    alternativeUnits: ['mmol/L'],
    referenceIntervals: [
      {
        context: 'fasting',
        interval: {
          min: 70.0,
          max: 99.0,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '70 - 99 mg/dL',
          unit: 'mg/dL',
          source: 'configured_demo_default',
          intendedContext: 'Fasting State (Synthetic Demo Reference — ADA Guidelines)',
        },
      },
    ],
    criticalThresholds: {
      low: 50.0,
      high: 400.0,
      ruleName: 'Critical Glucose Range Rule',
      description: 'Glucose < 50 mg/dL carries acute neuroglycopenic risk; > 400 mg/dL carries acute hyperosmolar/ketoacidotic risk.',
    },
    plainName: 'Blood sugar level after overnight fast',
    description: 'Key parameter for evaluating glycemic regulation and screening for prediabetes or diabetes.',
  },

  glucose_random: {
    canonicalId: 'glucose_random',
    name: 'Random Blood Glucose',
    category: 'Metabolic',
    standardUnit: 'mg/dL',
    alternativeUnits: ['mmol/L'],
    referenceIntervals: [
      {
        context: 'random',
        interval: {
          min: 70.0,
          max: 139.0,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '70 - 139 mg/dL',
          unit: 'mg/dL',
          source: 'configured_demo_default',
          intendedContext: 'Random / Non-Fasting (Synthetic Demo Reference)',
        },
      },
    ],
    criticalThresholds: {
      low: 50.0,
      high: 400.0,
      ruleName: 'Critical Random Glucose Rule',
      description: 'Glucose < 50 mg/dL carries severe hypoglycemia risk; > 400 mg/dL carries severe hyperosmolar risk.',
    },
    plainName: 'Blood sugar level regardless of last meal',
    description: 'Measures blood glucose drawn at any non-standardized time.',
  },

  glucose_postprandial: {
    canonicalId: 'glucose_postprandial',
    name: 'Postprandial Blood Glucose (2hr)',
    category: 'Metabolic',
    standardUnit: 'mg/dL',
    alternativeUnits: ['mmol/L'],
    referenceIntervals: [
      {
        context: 'postprandial',
        interval: {
          min: 70.0,
          max: 140.0,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '70 - 140 mg/dL',
          unit: 'mg/dL',
          source: 'configured_demo_default',
          intendedContext: '2-Hour Postprandial (Synthetic Demo Reference)',
        },
      },
    ],
    criticalThresholds: {
      low: 50.0,
      high: 400.0,
      ruleName: 'Critical Postprandial Glucose Rule',
      description: 'Severe postprandial deviation.',
    },
    plainName: 'Blood sugar level 2 hours after eating',
    description: 'Tests body clearance and insulin response to a meal.',
  },

  cholesterol_total: {
    canonicalId: 'cholesterol_total',
    name: 'Total Cholesterol',
    category: 'Lipid Profile',
    standardUnit: 'mg/dL',
    alternativeUnits: ['mmol/L'],
    referenceIntervals: [
      {
        context: 'default',
        interval: {
          min: 100.0,
          max: 199.0,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '< 200 mg/dL (100 - 199 mg/dL desirable)',
          unit: 'mg/dL',
          source: 'configured_demo_default',
          intendedContext: 'Desirable Adult Level (Synthetic Demo Reference - NCEP ATP III)',
        },
      },
    ],
    criticalThresholds: {
      high: 350.0,
      ruleName: 'Severe Hypercholesterolemia Rule',
      description: 'Total cholesterol > 350 mg/dL requires urgent lipidologist or cardiovascular risk review.',
    },
    plainName: 'Overall circulating cholesterol',
    description: 'Total blood sterols, used in initial cardiovascular screening.',
  },

  cholesterol_ldl: {
    canonicalId: 'cholesterol_ldl',
    name: 'LDL Cholesterol',
    category: 'Lipid Profile',
    standardUnit: 'mg/dL',
    alternativeUnits: ['mmol/L'],
    referenceIntervals: [
      {
        context: 'default',
        interval: {
          min: 50.0,
          max: 99.0,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '< 100 mg/dL optimal (50 - 99 mg/dL)',
          unit: 'mg/dL',
          source: 'configured_demo_default',
          intendedContext: 'Optimal Adult Level (Synthetic Demo Reference - AHA/ACC)',
        },
      },
    ],
    criticalThresholds: {
      high: 190.0,
      ruleName: 'Severe LDL Elevation Rule',
      description: 'LDL >= 190 mg/dL is a recognized primary prevention trigger for familial hypercholesterolemia evaluation.',
    },
    plainName: 'Low-density lipoprotein ("bad" cholesterol)',
    description: 'Atherogenic lipoprotein directly implicated in arterial plaque formation.',
  },

  cholesterol_hdl: {
    canonicalId: 'cholesterol_hdl',
    name: 'HDL Cholesterol',
    category: 'Lipid Profile',
    standardUnit: 'mg/dL',
    alternativeUnits: ['mmol/L'],
    referenceIntervals: [
      {
        context: 'default',
        interval: {
          min: 40.0,
          max: 80.0,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '> 40 mg/dL desirable (40 - 80 mg/dL)',
          unit: 'mg/dL',
          source: 'configured_demo_default',
          intendedContext: 'Desirable Adult HDL (Synthetic Demo Reference)',
        },
      },
    ],
    plainName: 'High-density lipoprotein ("good" cholesterol)',
    description: 'Cardioprotective lipoprotein facilitating reverse cholesterol transport to the liver.',
  },

  triglycerides: {
    canonicalId: 'triglycerides',
    name: 'Triglycerides',
    category: 'Lipid Profile',
    standardUnit: 'mg/dL',
    alternativeUnits: ['mmol/L'],
    referenceIntervals: [
      {
        context: 'default',
        interval: {
          min: 30.0,
          max: 149.0,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '< 150 mg/dL normal (30 - 149 mg/dL)',
          unit: 'mg/dL',
          source: 'configured_demo_default',
          intendedContext: 'Normal Fasting Triglycerides (Synthetic Demo Reference)',
        },
      },
    ],
    criticalThresholds: {
      high: 500.0,
      ruleName: 'Critical Hypertriglyceridemia Rule',
      description: 'Triglycerides > 500 mg/dL poses significant acute risk for acute pancreatitis.',
    },
    plainName: 'Most common type of blood fat',
    description: 'Circulating neutral fats synthesized from unused calories.',
  },

  platelets: {
    canonicalId: 'platelets',
    name: 'Platelet Count',
    category: 'Hematology',
    standardUnit: '/uL',
    alternativeUnits: ['10^3/uL', 'x10^3/uL', '10^9/L', 'K/uL'],
    referenceIntervals: [
      {
        context: 'default',
        interval: {
          min: 150000,
          max: 450000,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '150,000 - 450,000 /uL (150 - 450 x10^3/uL)',
          unit: '/uL',
          source: 'configured_demo_default',
          intendedContext: 'Adult Reference Interval (Synthetic Demo Reference)',
        },
      },
    ],
    criticalThresholds: {
      low: 20000,
      high: 1000000,
      ruleName: 'Critical Platelet Threshold Rule',
      description: 'Platelets < 20,000 /uL creates severe spontaneous hemorrhagic danger; > 1,000,000 /uL increases thrombosis danger.',
    },
    plainName: 'Blood cells responsible for clotting',
    description: 'Fragments essential for primary hemostasis and wound closure.',
  },

  creatinine: {
    canonicalId: 'creatinine',
    name: 'Serum Creatinine',
    category: 'Renal Function',
    standardUnit: 'mg/dL',
    alternativeUnits: ['umol/L', 'µmol/L'],
    referenceIntervals: [
      {
        context: 'default',
        interval: {
          min: 0.6,
          max: 1.2,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '0.6 - 1.2 mg/dL',
          unit: 'mg/dL',
          source: 'configured_demo_default',
          intendedContext: 'Adult General (Synthetic Demo Reference)',
        },
      },
      {
        context: 'male',
        interval: {
          min: 0.7,
          max: 1.3,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '0.7 - 1.3 mg/dL',
          unit: 'mg/dL',
          source: 'configured_demo_default',
          intendedContext: 'Adult Male (Synthetic Demo Reference)',
        },
      },
      {
        context: 'female',
        interval: {
          min: 0.5,
          max: 1.1,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '0.5 - 1.1 mg/dL',
          unit: 'mg/dL',
          source: 'configured_demo_default',
          intendedContext: 'Adult Female (Synthetic Demo Reference)',
        },
      },
    ],
    criticalThresholds: {
      high: 4.0,
      ruleName: 'Severe Acute Renal Impairment Rule',
      description: 'Serum creatinine >= 4.0 mg/dL is a critical nephrology flag indicating profound filtration deficit.',
    },
    plainName: 'Waste product filtered out by kidneys',
    description: 'Metabolic byproduct of muscle metabolism; primary biomarker for glomerular filtration capability.',
  },

  wbc: {
    canonicalId: 'wbc',
    name: 'White Blood Cell Count (WBC)',
    category: 'Hematology',
    standardUnit: '/uL',
    alternativeUnits: ['10^3/uL', 'x10^3/uL', '10^9/L', 'K/uL'],
    referenceIntervals: [
      {
        context: 'default',
        interval: {
          min: 4000,
          max: 11000,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '4,000 - 11,000 /uL (4.0 - 11.0 x10^3/uL)',
          unit: '/uL',
          source: 'configured_demo_default',
          intendedContext: 'Adult Reference Interval (Synthetic Demo Reference)',
        },
      },
    ],
    criticalThresholds: {
      low: 2000,
      high: 30000,
      ruleName: 'Critical Leukocyte Threshold Rule',
      description: 'WBC < 2,000 /uL indicates dangerous neutropenia; WBC > 30,000 /uL suggests profound infection or leukemoid reaction.',
    },
    plainName: 'Immune defense blood cells',
    description: 'Total leukocyte count, key in evaluating infection, inflammation, or hematologic disorders.',
  },

  blood_pressure_systolic: {
    canonicalId: 'blood_pressure_systolic',
    name: 'Systolic Blood Pressure',
    category: 'Vitals',
    standardUnit: 'mmHg',
    alternativeUnits: [],
    referenceIntervals: [
      {
        context: 'default',
        interval: {
          min: 90.0,
          max: 120.0,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '90 - 120 mmHg normal',
          unit: 'mmHg',
          source: 'configured_demo_default',
          intendedContext: 'Adult Resting (Synthetic Demo Reference — AHA/ACC 2017)',
        },
      },
    ],
    criticalThresholds: {
      low: 80.0,
      high: 180.0,
      ruleName: 'Hypertensive Crisis / Shock Threshold',
      description: 'Systolic BP > 180 mmHg indicates hypertensive crisis; < 80 mmHg indicates hemodynamically significant hypotension.',
    },
    plainName: 'Peak arterial pressure during heart contraction',
    description: 'Upper number in blood pressure reading.',
  },

  blood_pressure_diastolic: {
    canonicalId: 'blood_pressure_diastolic',
    name: 'Diastolic Blood Pressure',
    category: 'Vitals',
    standardUnit: 'mmHg',
    alternativeUnits: [],
    referenceIntervals: [
      {
        context: 'default',
        interval: {
          min: 60.0,
          max: 80.0,
          isMinInclusive: true,
          isMaxInclusive: true,
          rawString: '60 - 80 mmHg normal',
          unit: 'mmHg',
          source: 'configured_demo_default',
          intendedContext: 'Adult Resting (Synthetic Demo Reference — AHA/ACC 2017)',
        },
      },
    ],
    criticalThresholds: {
      low: 50.0,
      high: 120.0,
      ruleName: 'Diastolic Crisis Threshold',
      description: 'Diastolic BP > 120 mmHg indicates acute hypertensive crisis requiring urgent intervention.',
    },
    plainName: 'Arterial pressure between heart beats',
    description: 'Lower number in blood pressure reading.',
  },
};

/**
 * Checks if two unit strings are compatible for a given canonical parameter.
 */
export function areUnitsCompatible(
  canonicalId: CanonicalParameterId,
  unitA: string,
  unitB: string
): boolean {
  if (!unitA || !unitB) return false;
  const a = unitA.trim().toLowerCase().replace(/\s+/g, '');
  const b = unitB.trim().toLowerCase().replace(/\s+/g, '');
  if (a === b) return true;

  const config = PARAMETER_CONFIGS[canonicalId];
  if (!config) return false;

  const validUnits = [config.standardUnit, ...config.alternativeUnits].map((u) =>
    u.trim().toLowerCase().replace(/\s+/g, '')
  );

  return validUnits.includes(a) && validUnits.includes(b);
}

/**
 * Parameter-specific unit conversion functions.
 * Converts between any supported alternative unit and standard unit (or target unit).
 * Never silently guesses missing units!
 */
export function convertUnit(
  canonicalId: CanonicalParameterId,
  value: number,
  fromUnit: string,
  toUnit?: string
): { normalizedValue: number; normalizedUnit: string } | null {
  if (!fromUnit) return null;
  const normFrom = fromUnit.trim().toLowerCase().replace(/\s+/g, '');
  const config = PARAMETER_CONFIGS[canonicalId];
  if (!config) return null;

  const std = config.standardUnit.toLowerCase().replace(/\s+/g, '');
  const targetUnit = toUnit ? toUnit.trim().toLowerCase().replace(/\s+/g, '') : std;

  // Same unit: no conversion needed
  if (normFrom === targetUnit) {
    return { normalizedValue: value, normalizedUnit: toUnit || config.standardUnit };
  }

  // Convert to standard unit first
  let valInStd: number = value;

  switch (canonicalId) {
    case 'glucose_fasting':
    case 'glucose_random':
    case 'glucose_postprandial': {
      // std: mg/dL
      if (normFrom === 'mmol/l') {
        valInStd = Math.round(value * 18.0182 * 10) / 10;
      } else if (normFrom === 'mg/dl') {
        valInStd = value;
      } else {
        return null;
      }

      if (targetUnit === 'mmol/l') {
        return { normalizedValue: Math.round((valInStd / 18.0182) * 10) / 10, normalizedUnit: 'mmol/L' };
      }
      return { normalizedValue: valInStd, normalizedUnit: 'mg/dL' };
    }

    case 'cholesterol_total':
    case 'cholesterol_ldl':
    case 'cholesterol_hdl': {
      // std: mg/dL
      if (normFrom === 'mmol/l') {
        valInStd = Math.round(value * 38.67 * 10) / 10;
      } else if (normFrom === 'mg/dl') {
        valInStd = value;
      } else {
        return null;
      }

      if (targetUnit === 'mmol/l') {
        return { normalizedValue: Math.round((valInStd / 38.67) * 10) / 10, normalizedUnit: 'mmol/L' };
      }
      return { normalizedValue: valInStd, normalizedUnit: 'mg/dL' };
    }

    case 'triglycerides': {
      // std: mg/dL
      if (normFrom === 'mmol/l') {
        valInStd = Math.round(value * 88.57 * 10) / 10;
      } else if (normFrom === 'mg/dl') {
        valInStd = value;
      } else {
        return null;
      }

      if (targetUnit === 'mmol/l') {
        return { normalizedValue: Math.round((valInStd / 88.57) * 10) / 10, normalizedUnit: 'mmol/L' };
      }
      return { normalizedValue: valInStd, normalizedUnit: 'mg/dL' };
    }

    case 'creatinine': {
      // std: mg/dL
      if (normFrom === 'umol/l' || normFrom === 'µmol/l') {
        valInStd = Math.round((value / 88.4) * 100) / 100;
      } else if (normFrom === 'mg/dl') {
        valInStd = value;
      } else {
        return null;
      }

      if (targetUnit === 'umol/l' || targetUnit === 'µmol/l') {
        return { normalizedValue: Math.round(valInStd * 88.4), normalizedUnit: 'μmol/L' };
      }
      return { normalizedValue: valInStd, normalizedUnit: 'mg/dL' };
    }

    case 'hemoglobin': {
      // std: g/dL
      if (normFrom === 'g/l') {
        valInStd = Math.round((value / 10) * 10) / 10;
      } else if (normFrom === 'g/dl') {
        valInStd = value;
      } else {
        return null;
      }

      if (targetUnit === 'g/l') {
        return { normalizedValue: Math.round(valInStd * 10), normalizedUnit: 'g/L' };
      }
      return { normalizedValue: valInStd, normalizedUnit: 'g/dL' };
    }

    case 'platelets':
    case 'wbc': {
      // std: /uL
      const isThousands =
        normFrom === '10^3/ul' ||
        normFrom === 'x10^3/ul' ||
        normFrom === '10^9/l' ||
        normFrom === 'k/ul' ||
        normFrom === 'thousand/ul' ||
        normFrom === '10*3/ul';

      const isBaseUl =
        normFrom === '/ul' ||
        normFrom === 'cells/ul' ||
        normFrom === 'cells/mcl' ||
        normFrom === '/mcl';

      if (isThousands) {
        valInStd = Math.round(value * 1000);
      } else if (isBaseUl) {
        valInStd = Math.round(value);
      } else {
        return null;
      }

      if (targetUnit === '10^3/ul' || targetUnit === 'x10^3/ul' || targetUnit === 'k/ul') {
        return { normalizedValue: Math.round((valInStd / 1000) * 10) / 10, normalizedUnit: '10^3/uL' };
      }
      return { normalizedValue: valInStd, normalizedUnit: '/uL' };
    }

    case 'blood_pressure_systolic':
    case 'blood_pressure_diastolic': {
      if (normFrom === 'mmhg') {
        return { normalizedValue: value, normalizedUnit: 'mmHg' };
      }
      return null;
    }
  }

  return null;
}

/**
 * Converts reference interval bounds together with measurement values.
 * Populates normalizedMin, normalizedMax, and normalizedUnit.
 */
export function convertReferenceInterval(
  canonicalId: CanonicalParameterId,
  interval: ReferenceInterval,
  fromUnit: string,
  toUnit?: string
): ReferenceInterval {
  const normFrom = fromUnit.trim().toLowerCase().replace(/\s+/g, '');
  const config = PARAMETER_CONFIGS[canonicalId];
  if (!config) return interval;

  const std = config.standardUnit.toLowerCase().replace(/\s+/g, '');
  const targetUnit = toUnit ? toUnit.trim().toLowerCase().replace(/\s+/g, '') : std;

  if (normFrom === targetUnit) {
    return {
      ...interval,
      normalizedMin: interval.min,
      normalizedMax: interval.max,
      normalizedUnit: toUnit || config.standardUnit,
    };
  }

  let normMin: number | null = null;
  let normMax: number | null = null;
  let normUnit: string = config.standardUnit;

  if (interval.min !== null) {
    const convMin = convertUnit(canonicalId, interval.min, fromUnit, toUnit);
    if (convMin) {
      normMin = convMin.normalizedValue;
      normUnit = convMin.normalizedUnit;
    }
  }

  if (interval.max !== null) {
    const convMax = convertUnit(canonicalId, interval.max, fromUnit, toUnit);
    if (convMax) {
      normMax = convMax.normalizedValue;
      normUnit = convMax.normalizedUnit;
    }
  }

  return {
    ...interval,
    normalizedMin: normMin,
    normalizedMax: normMax,
    normalizedUnit: normUnit,
  };
}
