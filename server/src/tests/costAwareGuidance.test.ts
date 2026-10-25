import { describe, it, expect } from 'vitest';
import { evaluateCostAwareGuidance } from '../services/guidance.js';
import { Finding, CombinationAlert, ClinicalContext } from '../types/index.js';

describe('Cost-Aware Next-Step Guidance Engine', () => {
  const baseFinding: Finding = {
    id: 'f1',
    measurementId: 'm1',
    canonicalId: 'cholesterol_total',
    label: 'Total Cholesterol',
    observedValue: 228,
    unit: 'mg/dL',
    normalizedValue: 228,
    normalizedUnit: 'mg/dL',
    classification: 'high',
    direction: 'high',
    referenceInterval: {
      min: 0,
      max: 199,
      isMinInclusive: true,
      isMaxInclusive: true,
      rawString: '0 - 199',
      unit: 'mg/dL',
      source: 'report_printed',
    },
    triggeredRule: 'Upper Limit Rule',
    plainExplanation: 'Elevated total cholesterol',
    clinicalSuggestion: 'Discuss with doctor',
    supportingText: 'Total Cholesterol 228',
    warnings: [],
  };

  const normalFinding: Finding = {
    id: 'f2',
    measurementId: 'm2',
    canonicalId: 'creatinine',
    label: 'Serum Creatinine',
    observedValue: 0.9,
    unit: 'mg/dL',
    normalizedValue: 0.9,
    normalizedUnit: 'mg/dL',
    classification: 'within_reference',
    direction: 'normal',
    referenceInterval: {
      min: 0.7,
      max: 1.3,
      isMinInclusive: true,
      isMaxInclusive: true,
      rawString: '0.7 - 1.3',
      unit: 'mg/dL',
      source: 'report_printed',
    },
    triggeredRule: 'Within Interval Rule',
    plainExplanation: 'Normal creatinine',
    clinicalSuggestion: 'Within expected bounds',
    supportingText: 'Creatinine 0.9',
    warnings: [],
  };

  const criticalPlateletFinding: Finding = {
    id: 'f3',
    measurementId: 'm3',
    canonicalId: 'platelets',
    label: 'Platelet Count',
    observedValue: 15000,
    unit: '/uL',
    normalizedValue: 15000,
    normalizedUnit: '/uL',
    classification: 'critical',
    direction: 'critical',
    referenceInterval: {
      min: 150000,
      max: 450000,
      isMinInclusive: true,
      isMaxInclusive: true,
      rawString: '150 - 450 10^3/uL',
      unit: '/uL',
      source: 'report_printed',
    },
    triggeredRule: 'Critical Low Rule (< 20,000 /uL)',
    plainExplanation: 'Critical thrombocytopenia',
    clinicalSuggestion: 'Urgent evaluation',
    supportingText: 'Platelets 15 10^3/uL',
    warnings: [],
  };

  const matchedCombination: CombinationAlert = {
    ruleId: 'RULE-METABOLIC-01',
    ruleTitle: 'Atherogenic Metabolic Co-Occurrence',
    status: 'matched',
    reviewPriority: 'high',
    contributingMeasurements: [],
    matchedConditions: ['Fasting Glucose is HIGH', 'Triglycerides is HIGH'],
    missingParameters: [],
    explanation: 'Co-occurring elevated glucose and triglycerides',
    disclaimer: 'Illustrative co-occurrence',
    referenceSource: 'Metabolic criteria',
  };

  describe('Tier 1: Emergency Attention', () => {
    it('triggers emergency attention when a critical laboratory threshold is present', () => {
      const guidance = evaluateCostAwareGuidance([criticalPlateletFinding], []);
      expect(guidance.category).toBe('emergency_attention');
      expect(guidance.urgencyLevel).toBe('immediate_emergency');
      expect(guidance.costConsciousNavigation.recommendedCareSetting).toMatch(/Emergency Department/i);
      expect(guidance.clinicalSource).toMatch(/Critical Laboratory/i);
      expect(guidance.supportingFindings.length).toBeGreaterThan(0);
    });

    it('triggers emergency attention when acute red-flag symptoms are reported even with non-critical lab values', () => {
      const context: ClinicalContext = {
        symptoms: ['chest_pain', 'shortness_of_breath'],
        symptomDuration: 'acute_hours',
        existingConditions: ['hypertension'],
        medications: ['antihypertensive'],
      };
      const guidance = evaluateCostAwareGuidance([baseFinding], [], context);
      expect(guidance.category).toBe('emergency_attention');
      expect(guidance.supportingSymptoms).toEqual(
        expect.arrayContaining([expect.stringMatching(/chest pain/i)])
      );
      expect(guidance.costConsciousNavigation.recommendedCareSetting).toMatch(/Emergency/i);
    });
  });

  describe('Tier 2: Prompt Medical Review', () => {
    it('triggers prompt medical review for concerning multi-analyte combinations', () => {
      const glucoseFinding: Finding = {
        ...baseFinding,
        id: 'f-gl',
        canonicalId: 'glucose_fasting',
        label: 'Fasting Blood Glucose',
        observedValue: 142,
      };
      const triFinding: Finding = {
        ...baseFinding,
        id: 'f-tr',
        canonicalId: 'triglycerides',
        label: 'Triglycerides',
        observedValue: 210,
      };

      const guidance = evaluateCostAwareGuidance(
        [glucoseFinding, triFinding],
        [matchedCombination],
        { symptoms: ['none'], symptomDuration: 'none_asymptomatic', existingConditions: ['none'], medications: ['none'] }
      );

      expect(guidance.category).toBe('prompt_medical_review');
      expect(guidance.urgencyLevel).toBe('prompt_days');
      expect(guidance.costConsciousNavigation.recommendedCareSetting).toMatch(/Primary Care|Urgent Care|Telehealth/i);
      // Ensures it offers lower-cost alternatives to avoid ER facility fees
      expect(guidance.costConsciousNavigation.costSavingNotes).toMatch(/Emergency Department|emergency room/i);
      expect(guidance.costConsciousNavigation.lowerCostOptions.length).toBeGreaterThan(0);
    });

    it('triggers prompt medical review when multiple abnormal findings are present without acute red flags', () => {
      const f1: Finding = { ...baseFinding, id: '1', canonicalId: 'glucose_fasting' };
      const f2: Finding = { ...baseFinding, id: '2', canonicalId: 'triglycerides' };
      const guidance = evaluateCostAwareGuidance([f1, f2], [], {
        symptoms: ['none'],
        symptomDuration: 'none_asymptomatic',
        existingConditions: ['none'],
        medications: ['none'],
      });
      expect(guidance.category).toBe('prompt_medical_review');
    });
  });

  describe('Tier 3: Routine Follow-Up', () => {
    it('triggers routine follow-up for isolated mild out-of-range deviations in asymptomatic users', () => {
      const guidance = evaluateCostAwareGuidance([baseFinding, normalFinding], [], {
        symptoms: ['none'],
        symptomDuration: 'none_asymptomatic',
        existingConditions: ['none'],
        medications: ['none'],
      });

      expect(guidance.category).toBe('routine_follow_up');
      expect(guidance.urgencyLevel).toBe('routine_scheduled');
      expect(guidance.costConsciousNavigation.recommendedCareSetting).toMatch(/Primary Care|Annual/i);
      expect(guidance.costConsciousNavigation.costSavingNotes).toMatch(/scheduled|routine/i);
      expect(guidance.educationalCaveats.isolatedAbnormalDisclaimer).toMatch(/isolated abnormal/i);
    });
  });

  describe('Tier 4: General Self-Care & Monitoring', () => {
    it('triggers self-care & monitoring when all evaluated parameters are within reference range and asymptomatic', () => {
      const guidance = evaluateCostAwareGuidance([normalFinding], [], {
        symptoms: ['none'],
        symptomDuration: 'none_asymptomatic',
        existingConditions: ['none'],
        medications: ['none'],
      });

      expect(guidance.category).toBe('self_care_and_monitoring');
      expect(guidance.urgencyLevel).toBe('monitoring_lifestyle');
      expect(guidance.educationalCaveats.referenceRangeDisclaimer).toMatch(/does NOT guarantee that a person is healthy/i);
      expect(guidance.educationalCaveats.selfCareLimitations).toMatch(/NEVER be used as a treatment/i);
      expect(guidance.educationalCaveats.redFlagsToWatch.length).toBeGreaterThan(0);
    });
  });

  describe('Clinical Context Completeness & Anti-Reassurance', () => {
    it('flags context as insufficient when symptoms, duration, and conditions are omitted', () => {
      const guidance = evaluateCostAwareGuidance([normalFinding], []);
      expect(guidance.contextCompleteness).toBe('insufficient');
      expect(guidance.missingContextDetails).toEqual(
        expect.arrayContaining([expect.stringMatching(/symptoms/i)])
      );
      // Does not offer false reassurance
      expect(guidance.educationalCaveats.referenceRangeDisclaimer).toBeDefined();
    });

    it('flags context as complete when all questionnaire fields are supplied', () => {
      const context: ClinicalContext = {
        symptoms: ['none'],
        symptomDuration: 'none_asymptomatic',
        existingConditions: ['hypertension'],
        medications: ['antihypertensive'],
      };
      const guidance = evaluateCostAwareGuidance([normalFinding], [], context);
      expect(guidance.contextCompleteness).toBe('complete');
      expect(guidance.missingContextDetails.length).toBe(0);
    });
  });

  describe('Safety Prohibitions & Epistemic Boundaries', () => {
    it('explicitly includes safety restrictions against medication alteration and waiting until critical', () => {
      const guidance = evaluateCostAwareGuidance([baseFinding], []);
      expect(guidance.safetyRestrictions.noMedicationAlterationStatement).toMatch(/NOT diagnose, prescribe/i);
      expect(guidance.safetyRestrictions.noWaitUntilCriticalStatement).toMatch(/NEVER advise users to wait until their condition becomes critical/i);
    });

    it('suggests lower-cost options without inventing local clinic names or prices', () => {
      const guidance = evaluateCostAwareGuidance([baseFinding], [matchedCombination]);
      const lowerCostText = guidance.costConsciousNavigation.lowerCostOptions.join(' ');
      // Ensures generic category suggestions (e.g. FQHC, Telehealth, Primary Care)
      expect(lowerCostText).toMatch(/Federally Qualified Health Centers|Community|Telehealth|Primary Care/i);
      // Does not invent specific local addresses or fictional dollar prices
      expect(lowerCostText).not.toMatch(/\$\d+\.\d{2}/);
    });
  });
});
