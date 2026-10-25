export interface SyntheticSample {
  id: string;
  name: string;
  category: string;
  description: string;
  expectedFindings: string;
  reportDate: string;
  patientContext: {
    age: number;
    sex: 'male' | 'female';
    fastingState?: string;
  };
  rawText: string;
}

export const SYNTHETIC_SAMPLES: SyntheticSample[] = [
  // Fixture 1: All supported values within their supplied intervals
  {
    id: 'sample-all-normal',
    name: '1. Routine Health Checkup (All Normal)',
    category: 'Baseline Normal',
    description: 'Comprehensive metabolic & hematologic panel with all values falling within standard reference intervals.',
    expectedFindings: '10 evaluated parameters, 10 Normal, 0 Abnormal, 0 Critical. 0 Combination Alerts.',
    reportDate: '2024-05-15',
    patientContext: { age: 38, sex: 'male', fastingState: 'fasting' },
    rawText: `
METROPOLITAN CLINICAL LABORATORIES
Patient Name: John Doe          Age: 38 Yrs     Gender: Male
Date of Collection: 2024-05-15  Report ID: MCL-84920
Physician: Dr. Sarah Vance, MD

COMPLETE BLOOD COUNT & METABOLIC PROFILE (FASTING)
-----------------------------------------------------------------------------------
TEST NAME                      RESULT      UNIT         REFERENCE RANGE
-----------------------------------------------------------------------------------
Hemoglobin                     14.8        g/dL         13.5 - 17.5
White Blood Cell Count (WBC)   6,800       /uL          4,000 - 11,000
Platelet Count                 245,000     /uL          150,000 - 450,000
Fasting Blood Glucose          88          mg/dL        70 - 99
Serum Creatinine               0.95        mg/dL        0.7 - 1.3
Total Cholesterol              172         mg/dL        < 200
LDL Cholesterol                92          mg/dL        < 100
HDL Cholesterol                52          mg/dL        > 40
Triglycerides                  118         mg/dL        < 150
Blood Pressure                 118/76      mmHg         90-120 / 60-80
-----------------------------------------------------------------------------------
End of Laboratory Report.
    `.trim(),
  },

  // Fixture 2: One isolated abnormality
  {
    id: 'sample-isolated-abnormality',
    name: '2. Isolated Impaired Fasting Glucose',
    category: 'Isolated Finding',
    description: 'Patient with prediabetic fasting blood glucose elevation, with all other renal and lipid parameters normal.',
    expectedFindings: 'Fasting Glucose 118 mg/dL (High). All other parameters normal. No combination alert triggered.',
    reportDate: '2024-06-10',
    patientContext: { age: 44, sex: 'female', fastingState: 'fasting' },
    rawText: `
APEX DIAGNOSTIC HEALTH CENTER
Patient Name: Jane Smith        Age: 44 Yrs     Gender: Female
Date of Collection: 2024-06-10  Report ID: ADH-11029
Ref By: Dr. R. Patel

PREVENTIVE HEALTH SCREENING
-----------------------------------------------------------------------------------
INVESTIGATION                  OBSERVED    UNITS        REFERENCE INTERVAL
-----------------------------------------------------------------------------------
Hemoglobin                     13.2        g/dL         12.0 - 15.5
W.B.C Count                    7,200       /uL          4,000 - 11,000
Platelets                      220,000     /uL          150,000 - 450,000
Fasting Blood Sugar            118         mg/dL        70 - 99
Serum Creatinine               0.82        mg/dL        0.5 - 1.1
Total Cholesterol              185         mg/dL        < 200
LDL Cholesterol                94          mg/dL        < 100
HDL Cholesterol                58          mg/dL        > 40
Triglycerides                  125         mg/dL        < 150
Blood Pressure                 120/78      mmHg         90-120 / 60-80
-----------------------------------------------------------------------------------
Remarks: Repeat fasting glucose recommended within 3 months.
    `.trim(),
  },

  // Fixture 3: Multiple abnormalities triggering a combination rule (Metabolic Atherogenic alert)
  {
    id: 'sample-metabolic-combination',
    name: '3. Cardiometabolic Risk Panel (Glucose + Triglycerides Alert)',
    category: 'Combination Alert',
    description: 'Concurrent elevated fasting glucose (158 mg/dL) and high triglycerides (285 mg/dL) alongside elevated LDL and blood pressure.',
    expectedFindings: 'Glucose High, Triglycerides High, LDL High, BP Systolic High. Triggers "Atherogenic Metabolic Co-Occurrence Alert" and "Hypertensive Strain".',
    reportDate: '2024-07-22',
    patientContext: { age: 52, sex: 'male', fastingState: 'fasting' },
    rawText: `
CITY HEALTH LABS & CARDIOLOGY CLINIC
Patient Name: Robert Miller     Age: 52 Yrs     Sex: Male
Report Date: 2024-07-22         Specimen ID: CHL-77412
Referring Physician: Dr. K. Gomez, MD

LIPID & DIABETIC RISK ASSESSMENT
-----------------------------------------------------------------------------------
PARAMETER                      VALUE       UNIT         REFERENCE
-----------------------------------------------------------------------------------
Fasting Blood Glucose          158         mg/dL        70 - 99
Triglycerides                  285         mg/dL        < 150
Total Cholesterol              248         mg/dL        < 200
LDL Cholesterol                152         mg/dL        < 100
HDL Cholesterol                36          mg/dL        > 40
Serum Creatinine               1.1         mg/dL        0.7 - 1.3
Blood Pressure                 146/92      mmHg         < 120 / 80
Hemoglobin                     15.1        g/dL         13.5 - 17.5
WBC Count                      8,100       /uL          4,000 - 11,000
Platelet Count                 270,000     /uL          150,000 - 450,000
-----------------------------------------------------------------------------------
Conclusion: Lipid and glycemic parameters markedly elevated.
    `.trim(),
  },

  // Fixture 4: Dual Hematologic Suppression (Bicytopenia alert)
  {
    id: 'sample-bicytopenia-combination',
    name: '4. Dual Cytopenia Panel (Hemoglobin + Platelets Suppressed)',
    category: 'Combination Alert',
    description: 'Simultaneous low hemoglobin (8.4 g/dL) and thrombocytopenia (68,000 /uL), triggering hematologic suppression alert.',
    expectedFindings: 'Hemoglobin Low (8.4 g/dL), Platelets Low (68,000 /uL). Triggers "Dual Hematologic Suppression (Bicytopenia Indicator)".',
    reportDate: '2024-08-04',
    patientContext: { age: 61, sex: 'female', fastingState: 'random' },
    rawText: `
ST. JUDE REGIONAL MEDICAL CENTER
Patient: Clara Oswald          Age: 61 Yrs     Sex: Female
Collection Date: 2024-08-04    Accession: SJR-90214
Department: Hematology & Oncology

COMPLETE HEMATOLOGY EVALUATION
-----------------------------------------------------------------------------------
ANALYTE                        VALUE       UNITS        BIOLOGICAL REFERENCE
-----------------------------------------------------------------------------------
Hemoglobin                     8.4         g/dL         12.0 - 15.5
Platelet Count                 68,000      /uL          150,000 - 450,000
White Blood Cell Count         4,400       /uL          4,000 - 11,000
Serum Creatinine               0.9         mg/dL        0.5 - 1.1
Random Blood Glucose           105         mg/dL        70 - 139
Blood Pressure                 114/72      mmHg         90-120 / 60-80
-----------------------------------------------------------------------------------
Clinical note: Multi-lineage cytopenia. Peripheral smear review advised.
    `.trim(),
  },

  // Fixture 5: Missing unit or reference interval requiring verification
  {
    id: 'sample-needs-verification',
    name: '5. Incomplete Lab Slip (Missing Unit & Missing Reference)',
    category: 'Needs Verification',
    description: 'Report snippet where serum creatinine lacks an explicit unit and total cholesterol lacks a printed reference range.',
    expectedFindings: 'Creatinine flagged "Needs Verification: Missing unit". Unspecified bounds flagged for manual check before clinical safety clearance.',
    reportDate: '2024-09-01',
    patientContext: { age: 49, sex: 'male' },
    rawText: `
SUBURBAN OUTPATIENT WALK-IN CLINIC
Patient: Thomas Wright         Age: 49 Yrs     Gender: Male
Date: 2024-09-01               Slip: SWC-3382

QUICK CHEM PANEL (PARTIAL COPY)
-----------------------------------------------------------------------------------
Hemoglobin                     14.0        g/dL         13.5 - 17.5
Serum Creatinine               1.8                      [Unit missing on printout]
Total Cholesterol              210         mg/dL
Fasting Blood Sugar            95          mg/dL        70 - 99
Blood Pressure                 124/82      mmHg
Platelets                      < 50        10^3/uL      150 - 450
-----------------------------------------------------------------------------------
Note: Lab printer ribbon fading; check manual requisition for missing units.
    `.trim(),
  },

  // Fixture 6: Scanned Report (OCR simulation with OCR noise & artifacts)
  {
    id: 'sample-scanned-ocr',
    name: '6. Scanned Thermal Printout (OCR Simulation)',
    category: 'OCR Scanned Test',
    description: 'Simulates noisy scanned image OCR with irregular spacing, dot leaders, and thermal printer formatting.',
    expectedFindings: 'Successfully extracted via OCR logic. High glucose (182 mg/dL) and elevated creatinine (1.65 mg/dL).',
    reportDate: '2024-09-18',
    patientContext: { age: 58, sex: 'male' },
    rawText: `
*** HOSPITAL EMERGENCY LAB - POINT OF CARE ***
DATE: 2024-09-18    TIME: 14:22    LOC: ER-BAY-4
PATIENT: ELEVATED RISK SCREENING (AGE 58 YRS, MALE)

Hb .................... 11.4 g/dl       (13.5 - 17.5)
W.B.C ................. 14,200 /ul      (4,000 - 11,000)
PLT ................... 180 10^3/uL     (150 - 450)
GLUCOSE (RANDOM) ...... 182 mg/dL       (70 - 139)
S. CREATININE ......... 1.65 mg/dl      (0.7 - 1.3)
B.P. .................. 154/96 mmHg     (90-120/60-80)
TOTAL CHOL ............ 230 mg/dL       (< 200)

OPERATOR: RN #4492
*** END OF REPORT ***
    `.trim(),
  },

  // Fixture 7 & 8: Longitudinal Dated Reports for Trend Tracking
  {
    id: 'sample-trend-earlier',
    name: '7. Patient History - Baseline (Jan 2024)',
    category: 'Longitudinal Trend 1',
    description: 'Earlier historical report showing initial high glucose (165 mg/dL) and high triglycerides (260 mg/dL).',
    expectedFindings: 'Shows elevated baseline markers for comparison against follow-up visit.',
    reportDate: '2024-01-15',
    patientContext: { age: 50, sex: 'female', fastingState: 'fasting' },
    rawText: `
COMMUNITY HEALTH ALLIANCE
Patient: Maria Hernandez      Age: 50 Yrs     Sex: Female
Date: 2024-01-15              Report: CHA-0012
VISIT: INITIAL ASSESSMENT (BASELINE)

Fasting Blood Glucose: 165 mg/dL (Ref: 70 - 99 mg/dL)
Triglycerides: 260 mg/dL (Ref: < 150 mg/dL)
Total Cholesterol: 235 mg/dL (Ref: < 200 mg/dL)
Serum Creatinine: 0.85 mg/dL (Ref: 0.5 - 1.1 mg/dL)
Blood Pressure: 138/88 mmHg (Ref: 90-120 / 60-80)
Hemoglobin: 13.0 g/dL (Ref: 12.0 - 15.5)
    `.trim(),
  },
  {
    id: 'sample-trend-later',
    name: '8. Patient History - Follow-Up (April 2024)',
    category: 'Longitudinal Trend 2',
    description: 'Follow-up report 3 months later showing improved fasting glucose (112 mg/dL) and triglycerides (175 mg/dL).',
    expectedFindings: 'Demonstrates measurable downward trend toward normal range following intervention.',
    reportDate: '2024-04-15',
    patientContext: { age: 50, sex: 'female', fastingState: 'fasting' },
    rawText: `
COMMUNITY HEALTH ALLIANCE
Patient: Maria Hernandez      Age: 50 Yrs     Sex: Female
Date: 2024-04-15              Report: CHA-0841
VISIT: 3-MONTH FOLLOW-UP

Fasting Blood Glucose: 112 mg/dL (Ref: 70 - 99 mg/dL)
Triglycerides: 175 mg/dL (Ref: < 150 mg/dL)
Total Cholesterol: 205 mg/dL (Ref: < 200 mg/dL)
Serum Creatinine: 0.82 mg/dL (Ref: 0.5 - 1.1 mg/dL)
Blood Pressure: 126/82 mmHg (Ref: 90-120 / 60-80)
Hemoglobin: 13.1 g/dL (Ref: 12.0 - 15.5)
    `.trim(),
  },
];
