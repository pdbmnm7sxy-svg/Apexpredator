import { CombinationRule } from '../types/index.js';

export const COMBINATION_RULES: CombinationRule[] = [
  {
    ruleId: 'RULE-METABOLIC-01',
    version: '1.0.0-prototype',
    title: 'Atherogenic Metabolic Co-Occurrence Alert',
    category: 'cardiometabolic',
    description: 'Co-occurrence of elevated blood glucose and elevated serum triglycerides from the same specimen.',
    requiredParameters: ['glucose_fasting', 'triglycerides'],
    logicalOperator: 'AND',
    predicates: [
      {
        parameterId: 'glucose_fasting',
        condition: 'status_in',
        expectedStatuses: ['high', 'critical'],
        contextRequired: 'fasting',
      },
      {
        parameterId: 'triglycerides',
        condition: 'status_in',
        expectedStatuses: ['high', 'critical'],
      },
    ],
    reviewPriority: 'high',
    referenceSource: 'Synthetic Demo Rule (Cardiometabolic Screening Co-Occurrence — Prototype Extension)',
    missingDataBehavior: 'not_evaluable',
    explanationTemplate:
      'Both Fasting Glucose ({glucose_fasting_val} {glucose_fasting_unit}) and Triglycerides ({triglycerides_val} {triglycerides_unit}) exceed their respective upper reference limits in this report. This pattern is commonly observed in insulin resistance and metabolic dysregulation, and may merit comprehensive cardiometabolic review with your physician.',
  },

  {
    ruleId: 'RULE-RENAL-VASC-02',
    version: '1.0.0-prototype',
    title: 'Hypertensive Renal Strain Indicator',
    category: 'renal_vascular',
    description: 'Elevated serum creatinine paired with an elevated systolic blood pressure measurement.',
    requiredParameters: ['creatinine', 'blood_pressure_systolic'],
    logicalOperator: 'AND',
    predicates: [
      {
        parameterId: 'creatinine',
        condition: 'status_in',
        expectedStatuses: ['high', 'critical'],
      },
      {
        parameterId: 'blood_pressure_systolic',
        condition: 'status_in',
        expectedStatuses: ['high', 'critical'],
      },
    ],
    reviewPriority: 'urgent',
    referenceSource: 'Synthetic Demo Rule (Cardiorenal Synergy Protocol — Prototype Extension)',
    missingDataBehavior: 'not_evaluable',
    explanationTemplate:
      'Elevated Serum Creatinine ({creatinine_val} {creatinine_unit}) co-occurs with Elevated Systolic Blood Pressure ({blood_pressure_systolic_val} {blood_pressure_systolic_unit}). Sustained high arterial pressures can exacerbate glomerular microvascular strain, indicating that a timely clinical evaluation of kidney function and blood pressure management is recommended.',
  },

  {
    ruleId: 'RULE-HEMATO-03',
    version: '1.0.0-prototype',
    title: 'Dual Hematologic Suppression (Bicytopenia Indicator)',
    category: 'hematologic',
    description: 'Concurrent reduction in both circulating hemoglobin (anemia) and platelet count (thrombocytopenia).',
    requiredParameters: ['hemoglobin', 'platelets'],
    logicalOperator: 'AND',
    predicates: [
      {
        parameterId: 'hemoglobin',
        condition: 'status_in',
        expectedStatuses: ['low', 'critical'],
      },
      {
        parameterId: 'platelets',
        condition: 'status_in',
        expectedStatuses: ['low', 'critical'],
      },
    ],
    reviewPriority: 'urgent',
    referenceSource: 'Synthetic Demo Rule (Multi-Lineage Hematologic Protocol — Prototype Extension)',
    missingDataBehavior: 'not_evaluable',
    explanationTemplate:
      'Both Hemoglobin ({hemoglobin_val} {hemoglobin_unit}) and Platelet Count ({platelets_val} {platelets_unit}) fall below their lower reference intervals. Simultaneous suppression across erythroid and megakaryocytic cell lines indicates multi-lineage hematologic involvement, warranting prompt hematological evaluation.',
  },

  {
    ruleId: 'RULE-LIPID-04',
    version: '1.0.0-prototype',
    title: 'Atherogenic Lipoprotein Discordance',
    category: 'lipid_profile',
    description: 'Simultaneous elevation of atherogenic LDL cholesterol and depression of protective HDL cholesterol.',
    requiredParameters: ['cholesterol_ldl', 'cholesterol_hdl'],
    logicalOperator: 'AND',
    predicates: [
      {
        parameterId: 'cholesterol_ldl',
        condition: 'status_in',
        expectedStatuses: ['high', 'critical'],
      },
      {
        parameterId: 'cholesterol_hdl',
        condition: 'status_in',
        expectedStatuses: ['low', 'critical'],
      },
    ],
    reviewPriority: 'high',
    referenceSource: 'Synthetic Demo Rule (Dyslipidemia Profile Balance — Prototype Extension)',
    missingDataBehavior: 'not_evaluable',
    explanationTemplate:
      'Elevated LDL Cholesterol ({cholesterol_ldl_val} {cholesterol_ldl_unit}) is accompanied by Depressed HDL Cholesterol ({cholesterol_hdl_val} {cholesterol_hdl_unit}). This unfavorable ratio accelerates arterial plaque deposition and suggests targeted lifestyle or lipid management review.',
  },

  {
    ruleId: 'RULE-GLYCEMIC-INFECT-05',
    version: '1.0.0-prototype',
    title: 'Hyperglycemic Immune Reaction Indicator',
    category: 'glycemic_infection',
    description: 'Marked glucose elevation occurring alongside elevated white blood cell count.',
    requiredParameters: ['glucose_fasting', 'wbc'],
    logicalOperator: 'AND',
    predicates: [
      {
        parameterId: 'glucose_fasting',
        condition: 'status_in',
        expectedStatuses: ['high', 'critical'],
      },
      {
        parameterId: 'wbc',
        condition: 'status_in',
        expectedStatuses: ['high', 'critical'],
      },
    ],
    reviewPriority: 'urgent',
    referenceSource: 'Synthetic Demo Rule (Infection-Induced Glycemic Stress Protocol — Prototype Extension)',
    missingDataBehavior: 'not_evaluable',
    explanationTemplate:
      'Elevated Glucose ({glucose_fasting_val} {glucose_fasting_unit}) co-exists with Leukocytosis (WBC {wbc_val} {wbc_unit}). Acute systemic infection or severe inflammation frequently triggers counter-regulatory stress hormones that spike blood glucose, requiring medical assessment.',
  },
];
