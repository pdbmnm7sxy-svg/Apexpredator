import {
  CanonicalParameterId,
  Measurement,
  ReferenceInterval,
} from '../types/index.js';
import {
  PARAMETER_CONFIGS,
  convertUnit,
  convertReferenceInterval,
  areUnitsCompatible,
} from '../config/referenceRanges.js';

interface ParameterAlias {
  canonicalId: CanonicalParameterId;
  label: string;
  regex: RegExp;
  context?: string;
  priority: number;
}

// Extensible alias dictionary
const PARAMETER_ALIASES: ParameterAlias[] = [
  // Blood Pressure compound
  {
    canonicalId: 'blood_pressure_systolic',
    label: 'Blood Pressure',
    regex: /\b(?:blood\s*pressure|b\.?p\.?|arterial\s*pressure)\b/i,
    priority: 10,
  },
  // Hemoglobin
  {
    canonicalId: 'hemoglobin',
    label: 'Hemoglobin',
    regex: /\b(?:haemoglobin|hemoglobin|hb|hgb)\b(?!\s*a1c|\s*electrophoresis)/i,
    priority: 8,
  },
  // Fasting Blood Glucose
  {
    canonicalId: 'glucose_fasting',
    label: 'Fasting Blood Glucose',
    regex: /\b(?:fasting\s+(?:blood\s+)?(?:sugar|glucose)|fbs|glucose\s*[-–(]?\s*fasting|f\.?b\.?s\.?)\b/i,
    context: 'fasting',
    priority: 9,
  },
  // Postprandial Glucose
  {
    canonicalId: 'glucose_postprandial',
    label: 'Postprandial Blood Glucose',
    regex: /\b(?:postprandial\s+(?:blood\s+)?(?:sugar|glucose)|ppbs|glucose\s*[-–(]?\s*postprandial|p\.?p\.?b\.?s\.?|2\s*hr\s+postprandial)\b/i,
    context: 'postprandial',
    priority: 9,
  },
  // Random / General Blood Glucose
  {
    canonicalId: 'glucose_random',
    label: 'Random Blood Glucose',
    regex: /\b(?:random\s+(?:blood\s+)?(?:sugar|glucose)|rbs|r\.?b\.?s\.?|blood\s+(?:sugar|glucose)|serum\s+glucose|glucose\s*[-–(]?\s*random)\b/i,
    context: 'random',
    priority: 6,
  },
  // LDL Cholesterol (must be checked before total cholesterol)
  {
    canonicalId: 'cholesterol_ldl',
    label: 'LDL Cholesterol',
    regex: /\b(?:ldl\s*(?:cholesterol|-c)?|low\s*density\s*lipoprotein(?:\s*cholesterol)?)\b/i,
    priority: 9,
  },
  // HDL Cholesterol (must be checked before total cholesterol)
  {
    canonicalId: 'cholesterol_hdl',
    label: 'HDL Cholesterol',
    regex: /\b(?:hdl\s*(?:cholesterol|-c)?|high\s*density\s*lipoprotein(?:\s*cholesterol)?)\b/i,
    priority: 9,
  },
  // Triglycerides
  {
    canonicalId: 'triglycerides',
    label: 'Triglycerides',
    regex: /\b(?:triglycerides?|tg|trigs?|serum\s+triglycerides?)\b/i,
    priority: 8,
  },
  // Total Cholesterol
  {
    canonicalId: 'cholesterol_total',
    label: 'Total Cholesterol',
    regex: /\b(?:total\s*cholesterol|cholesterol(?:\s*total)?|serum\s*cholesterol)\b/i,
    priority: 7,
  },
  // Platelets
  {
    canonicalId: 'platelets',
    label: 'Platelet Count',
    regex: /\b(?:platelets?(?:\s*count)?|plt|thrombocytes?)\b/i,
    priority: 8,
  },
  // Serum Creatinine
  {
    canonicalId: 'creatinine',
    label: 'Serum Creatinine',
    regex: /\b(?:serum\s+creatinine|creatinine(?:\s*serum)?|s\.?\s*creatinine|creat\.?)\b/i,
    priority: 8,
  },
  // WBC Count
  {
    canonicalId: 'wbc',
    label: 'WBC Count',
    regex: /\b(?:wbc(?:\s*count)?|white\s*blood\s*(?:cell|corpuscle)s?(?:\s*count)?|total\s*leukocyte\s*count|tlc|leukocytes?)\b/i,
    priority: 8,
  },
];

// Regex for extracting dates (YYYY-MM-DD or DD/MM/YYYY or MM/DD/YYYY or Month DD, YYYY)
const DATE_REGEX = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i;

// Regex for patient demographics (Age, Gender)
const AGE_REGEX = /\b(?:age|years|yrs|yo)\s*[:=-]?\s*(\d{1,3})\b/i;
const GENDER_REGEX = /\b(?:sex|gender)\s*[:=-]?\s*(male|female|m|f)\b/i;

/**
 * Parses raw text lines from a document into structured medical measurements.
 */
export function parseMedicalReportText(
  rawText: string,
  pageNumber = 1,
  extractionMethod: 'text_regex' | 'ocr' | 'table_row' = 'text_regex',
  baseConfidence = 0.95
): {
  measurements: Measurement[];
  patientContext: { age?: number; sex?: 'male' | 'female' | 'other'; fastingState?: string; notes?: string };
  reportDate?: string;
} {
  const measurements: Measurement[] = [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let detectedDate: string | undefined;
  const patientContext: { age?: number; sex?: 'male' | 'female' | 'other'; fastingState?: string; notes?: string } = {};

  // Step 1: Scan header for patient metadata & report date
  for (const line of lines.slice(0, 20)) {
    if (!detectedDate) {
      const dateMatch = line.match(DATE_REGEX);
      if (dateMatch && !line.toLowerCase().includes('dob') && !line.toLowerCase().includes('birth')) {
        detectedDate = dateMatch[0];
      }
    }
    if (patientContext.age === undefined) {
      const ageMatch = line.match(AGE_REGEX);
      if (ageMatch && parseInt(ageMatch[1], 10) > 0 && parseInt(ageMatch[1], 10) <= 125) {
        patientContext.age = parseInt(ageMatch[1], 10);
      }
    }
    if (patientContext.sex === undefined) {
      const sexMatch = line.match(GENDER_REGEX);
      if (sexMatch) {
        const val = sexMatch[1].toLowerCase();
        patientContext.sex = val.startsWith('m') ? 'male' : 'female';
      }
    }
  }

  // Step 2: Row-aware scanning for parameters
  const seenCanonical = new Set<string>();

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // Skip obvious header or demographic lines to avoid misparsing age or dates
    if (/^(?:patient\s+name|doctor|hospital|clinic|lab\s+no|sample\s+id|specimen|bill\s+no|address|phone|email)/i.test(line)) {
      continue;
    }

    // Check for Blood Pressure compound (e.g. 120/80 mmHg or 130 / 85)
    if (/\b(?:blood\s*pressure|b\.?p\.?)\b/i.test(line)) {
      const bpMatch = line.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})(?:\s*(?:mmHg|mm\s*hg))?/i);
      if (bpMatch) {
        const sysVal = parseInt(bpMatch[1], 10);
        const diaVal = parseInt(bpMatch[2], 10);

        // Check if there is an extracted reference in the line or adjacent lines
        let bpSysRef = extractReferenceInterval(line, 'mmHg');
        let bpDiaRef: ReferenceInterval | null = null;

        // Check adjacent lines (e.g. "Systolic demo interval: 90 - 119 mmHg", "Diastolic demo interval: 60 - 79 mmHg")
        for (let j = lineIndex + 1; j < Math.min(lines.length, lineIndex + 4); j++) {
          const nextLine = lines[j];
          if (/systolic(?:\s*demo)?\s*interval/i.test(nextLine)) {
            const sysMatch = extractReferenceInterval(nextLine, 'mmHg');
            if (sysMatch) {
              bpSysRef = {
                ...sysMatch,
                rawString: sysMatch.rawString.includes('mmHg') ? sysMatch.rawString : `${sysMatch.rawString} mmHg`,
                unit: 'mmHg',
                normalizedMin: sysMatch.min,
                normalizedMax: sysMatch.max,
                normalizedUnit: 'mmHg',
                source: 'report_printed',
              };
            }
          }
          if (/diastolic(?:\s*demo)?\s*interval/i.test(nextLine)) {
            const diaMatch = extractReferenceInterval(nextLine, 'mmHg');
            if (diaMatch) {
              bpDiaRef = {
                ...diaMatch,
                rawString: diaMatch.rawString.includes('mmHg') ? diaMatch.rawString : `${diaMatch.rawString} mmHg`,
                unit: 'mmHg',
                normalizedMin: diaMatch.min,
                normalizedMax: diaMatch.max,
                normalizedUnit: 'mmHg',
                source: 'report_printed',
              };
            }
          }
        }

        if (bpSysRef && !bpSysRef.unit) {
          bpSysRef.unit = 'mmHg';
          bpSysRef.normalizedMin = bpSysRef.min;
          bpSysRef.normalizedMax = bpSysRef.max;
          bpSysRef.normalizedUnit = 'mmHg';
        }
        if (bpDiaRef && !bpDiaRef.unit) {
          bpDiaRef.unit = 'mmHg';
          bpDiaRef.normalizedMin = bpDiaRef.min;
          bpDiaRef.normalizedMax = bpDiaRef.max;
          bpDiaRef.normalizedUnit = 'mmHg';
        }

        // Systolic measurement
        measurements.push({
          id: `m-bp-sys-${Date.now()}-${measurements.length}`,
          canonicalId: 'blood_pressure_systolic',
          originalLabel: 'Systolic Blood Pressure (from B.P.)',
          value: sysVal.toString(),
          numericValue: sysVal,
          comparator: null,
          originalUnit: 'mmHg',
          normalizedUnit: 'mmHg',
          normalizedValue: sysVal,
          extractedInterval: bpSysRef || null,
          context: 'resting',
          sourcePage: pageNumber,
          supportingText: line,
          extractionMethod,
          confidence: baseConfidence,
          verificationStatus: 'extracted',
          warnings: [],
        });

        // Diastolic measurement
        measurements.push({
          id: `m-bp-dia-${Date.now()}-${measurements.length}`,
          canonicalId: 'blood_pressure_diastolic',
          originalLabel: 'Diastolic Blood Pressure (from B.P.)',
          value: diaVal.toString(),
          numericValue: diaVal,
          comparator: null,
          originalUnit: 'mmHg',
          normalizedUnit: 'mmHg',
          normalizedValue: diaVal,
          extractedInterval: bpDiaRef || null,
          context: 'resting',
          sourcePage: pageNumber,
          supportingText: line,
          extractionMethod,
          confidence: baseConfidence,
          verificationStatus: 'extracted',
          warnings: [],
        });

        seenCanonical.add('blood_pressure_systolic');
        seenCanonical.add('blood_pressure_diastolic');
        continue;
      }
    }

    // Match individual parameters
    for (const alias of PARAMETER_ALIASES) {
      if (alias.canonicalId.startsWith('blood_pressure')) continue;

      const aliasMatch = line.match(alias.regex);
      if (!aliasMatch) continue;

      // Extract value, unit, reference interval from line or next line
      const extraction = extractParameterFromLine(line, alias.canonicalId);
      if (!extraction) continue;

      const warnings: string[] = [];

      // Check if duplicate
      if (seenCanonical.has(alias.canonicalId)) {
        warnings.push(`Duplicate measurement detected for ${alias.label}; preserved for verification.`);
      }
      seenCanonical.add(alias.canonicalId);

      // Warning for missing unit
      if (!extraction.unit) {
        warnings.push('Unit not specified in report text; please verify or enter correct unit.');
      }

      // Warning for comparator
      if (extraction.comparator) {
        warnings.push(`Comparator measurement (${extraction.comparator}) detected.`);
      }

      // Unit conversion
      let normalizedValue = extraction.numericValue;
      let normalizedUnit = extraction.unit;

      if (extraction.numericValue !== null && extraction.unit) {
        const conv = convertUnit(alias.canonicalId, extraction.numericValue, extraction.unit);
        if (conv) {
          normalizedValue = conv.normalizedValue;
          normalizedUnit = conv.normalizedUnit;
        } else if (extraction.unit.toLowerCase() !== PARAMETER_CONFIGS[alias.canonicalId].standardUnit.toLowerCase()) {
          warnings.push(`Unit "${extraction.unit}" differs from standard "${PARAMETER_CONFIGS[alias.canonicalId].standardUnit}". Automatic conversion not configured.`);
        }
      }

      // Convert reference interval bounds together with measurement value
      let processedInterval = extraction.extractedInterval;
      if (processedInterval) {
        if (!processedInterval.unit && extraction.unit) {
          processedInterval = {
            ...processedInterval,
            unit: extraction.unit,
          };
        }
        if (extraction.unit) {
          processedInterval = convertReferenceInterval(
            alias.canonicalId,
            processedInterval,
            extraction.unit,
            normalizedUnit
          );
        }
      }

      measurements.push({
        id: `m-${alias.canonicalId}-${Date.now()}-${measurements.length}`,
        canonicalId: alias.canonicalId,
        originalLabel: alias.label,
        value: extraction.rawValue,
        numericValue: extraction.numericValue,
        comparator: extraction.comparator,
        originalUnit: extraction.unit || '',
        normalizedUnit,
        normalizedValue,
        extractedInterval: processedInterval,
        context: alias.context || null,
        sourcePage: pageNumber,
        supportingText: line,
        extractionMethod,
        confidence: baseConfidence,
        verificationStatus: 'extracted',
        warnings,
      });

      break; // Matched highest priority alias for this line
    }
  }

  return {
    measurements,
    patientContext,
    reportDate: detectedDate,
  };
}

/**
 * Extracts numeric value, comparator, unit, and reference interval from a line matching a parameter.
 */
function extractParameterFromLine(
  line: string,
  canonicalId: CanonicalParameterId
): {
  rawValue: string;
  numericValue: number | null;
  comparator: '<' | '>' | '<=' | '>=' | '=' | null;
  unit: string;
  extractedInterval: ReferenceInterval | null;
} | null {
  // Strip out alias match itself from front
  // Pattern looks for number or comparator+number
  // E.g. "Hemoglobin 14.2 g/dL 12.0 - 16.5"
  // E.g. "Total Cholesterol : 240 mg/dl (< 200)"
  // E.g. "Platelets: < 50 10^3/uL (150-450)"
  // E.g. "WBC: 12,400 /uL"

  // First detect if line has a reference interval so we don't confuse reference bounds with the result value
  const extractedInterval = extractReferenceInterval(line);

  // Search for the primary measurement value
  // We match numbers, handling commas (like 150,000 or 12,400)
  const valRegex = /(?:([<>]=?|=)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/g;
  const matches = [...line.matchAll(valRegex)];

  if (matches.length === 0) return null;

  // Identify which match is the patient value vs reference limits or age
  let valueMatch: RegExpMatchArray | null = null;
  let comparator: '<' | '>' | '<=' | '>=' | '=' | null = null;

  for (const m of matches) {
    const fullMatch = m[0];
    const compStr = m[1] as '<' | '>' | '<=' | '>=' | '=' | undefined;
    const numStr = m[2].replace(/,/g, '');
    const num = parseFloat(numStr);

    // Skip if this number matches the extracted interval bounds exactly
    if (extractedInterval) {
      if (extractedInterval.min === num || extractedInterval.max === num) {
        continue;
      }
    }

    // Skip if this looks like a date year or age tag
    if (num > 1900 && num < 2100 && line.toLowerCase().includes('date')) {
      continue;
    }

    // First viable number is typically the result value
    valueMatch = m;
    comparator = compStr || null;
    break;
  }

  if (!valueMatch) {
    // If all numbers matched the interval, take the first number before the interval
    valueMatch = matches[0];
    comparator = (valueMatch[1] as '<' | '>' | '<=' | '>=' | '=' | undefined) || null;
  }

  const rawNumString = valueMatch[2].replace(/,/g, '');
  const numericVal = parseFloat(rawNumString);
  const rawValue = (comparator ? `${comparator} ` : '') + rawNumString;

  // Extract unit
  const unit = extractUnit(line, canonicalId);

  return {
    rawValue,
    numericValue: isNaN(numericVal) ? null : numericVal,
    comparator,
    unit,
    extractedInterval,
  };
}

/**
 * Extracts medical unit from the line based on canonical parameter expected units.
 */
function extractUnit(line: string, canonicalId: CanonicalParameterId): string {
  const config = PARAMETER_CONFIGS[canonicalId];
  if (!config) return '';

  // Sort by length descending so compound units like 10^3/uL match before /uL
  const allUnits = [config.standardUnit, ...config.alternativeUnits].sort(
    (a, b) => b.length - a.length
  );
  for (const u of allUnits) {
    const escaped = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s|\\(|\\b)${escaped}(?:$|\\s|\\)|\\b)`, 'i');
    if (regex.test(line)) {
      return u;
    }
  }

  // Also check common generic units
  if (/\b(?:mg\/dl|mg\/d[lI])\b/i.test(line)) return 'mg/dL';
  if (/\b(?:g\/dl|g\/d[lI])\b/i.test(line)) return 'g/dL';
  if (/\b(?:mmol\/l)\b/i.test(line)) return 'mmol/L';
  if (/\b(?:umol\/l|µmol\/l)\b/i.test(line)) return 'μmol/L';
  if (/\b(?:mmhg)\b/i.test(line)) return 'mmHg';
  if (/\b(?:10\^3\/ul|x10\^3\/ul|k\/ul|10\*3\/ul)\b/i.test(line)) return '10^3/uL';
  if (/\b(?:\/ul|\/mcl|cells\/ul|cells\/mcl)\b/i.test(line)) return '/uL';

  return '';
}

/**
 * Extracts printed reference interval from a line.
 * Handles:
 * - Two-sided intervals: "12.0 - 16.5", "70 to 99", "0.7 – 1.3"
 * - One-sided limits: "< 200", "<= 100", "> 40", ">= 60"
 */
export function extractReferenceInterval(
  line: string,
  unitHint = ''
): ReferenceInterval | null {
  // Look for two-sided interval pattern: min to max or min - max
  // Avoid matching date-like structures by checking context
  const twoSidedRegex = /(?:ref(?:erence)?(?:\s*range|\s*interval)?|normal)?\s*[:=-]?\s*\[?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*\]?/i;
  const twoSidedMatch = line.match(twoSidedRegex);

  if (twoSidedMatch) {
    const minVal = parseFloat(twoSidedMatch[1].replace(/,/g, ''));
    const maxVal = parseFloat(twoSidedMatch[2].replace(/,/g, ''));

    // Sanity check: minVal must be less than maxVal
    if (!isNaN(minVal) && !isNaN(maxVal) && minVal < maxVal) {
      return {
        min: minVal,
        max: maxVal,
        isMinInclusive: true,
        isMaxInclusive: true,
        rawString: `${twoSidedMatch[1]} - ${twoSidedMatch[2]}`,
        unit: unitHint,
        source: 'report_printed',
      };
    }
  }

  // Look for one-sided interval pattern: "< 200" or "<= 100" or "> 40"
  const oneSidedRegex = /(?:<|<=|>|>=)\s*(\d+(?:,\d{3})*(?:\.\d+)?)/;
  const oneSidedMatch = line.match(oneSidedRegex);

  if (oneSidedMatch) {
    const limit = parseFloat(oneSidedMatch[1].replace(/,/g, ''));
    const isLessThan = line.includes('<');
    const isInclusive = line.includes('<=') || line.includes('>=');

    if (!isNaN(limit)) {
      return {
        min: isLessThan ? null : limit,
        max: isLessThan ? limit : null,
        isMinInclusive: isLessThan ? false : isInclusive,
        isMaxInclusive: isLessThan ? isInclusive : false,
        rawString: oneSidedMatch[0],
        unit: unitHint,
        source: 'report_printed',
        isOneSided: true,
        comparatorLimit: line.includes('<=') ? '<=' : line.includes('>=') ? '>=' : isLessThan ? '<' : '>',
      };
    }
  }

  return null;
}
