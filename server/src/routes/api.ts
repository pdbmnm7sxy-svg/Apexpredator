import { Router, Request, Response } from 'express';
import multer from 'multer';
import { extractDocumentContent } from '../services/extractor.js';
import { parseMedicalReportText } from '../services/parser.js';
import { analyzeMeasurements } from '../services/analyzer.js';
import { evaluateCombinations } from '../services/combinations.js';
import { generateReportSummary, answerReportQuery } from '../services/llm.js';
import { runAiAnalysisAgent } from '../services/aiAgent.js';
import { evaluateCostAwareGuidance } from '../services/guidance.js';
import {
  saveReport,
  getReport,
  listReports,
  deleteReport,
  clearAllReports,
  getStorageStatus,
} from '../services/store.js';
import { SYNTHETIC_SAMPLES } from '../fixtures/syntheticSamples.js';
import { Measurement, ReportAnalysisResult } from '../types/index.js';
import { isGeminiKeyConfigured, getGeminiModel } from '../config/env.js';

const upload = multer({
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  storage: multer.memoryStorage(),
});

export const apiRouter = Router();

// Health & System Status
apiRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    storage: getStorageStatus(),
    aiAgent: {
      keyConfigured: isGeminiKeyConfigured(),
      model: getGeminiModel(),
      provider: 'gemini',
    },
    timestamp: new Date().toISOString(),
    version: '1.0.0-prototype',
    researchAttribution: {
      paper: 'MEDGPT: Medical Report Analysis & Explainability Reference Architecture',
      notes: 'Deterministic rule engine & combination alerts are prototype extensions based on MEDGPT framework.',
    },
  });
});

// List Synthetic Samples
apiRouter.get('/samples', (req: Request, res: Response) => {
  const sampleList = SYNTHETIC_SAMPLES.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description,
    expectedFindings: s.expectedFindings,
    reportDate: s.reportDate,
  }));
  res.json({ samples: sampleList });
});

// Load and Process Synthetic Sample
apiRouter.post('/samples/:id/load', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sample = SYNTHETIC_SAMPLES.find((s) => s.id === id);
    if (!sample) {
      return res.status(404).json({ error: `Sample ${id} not found.` });
    }

    // Parse raw text into structured measurements
    const parsed = parseMedicalReportText(sample.rawText, 1, 'text_regex', 0.98);

    // Merge patient context
    const patientContext = {
      ...parsed.patientContext,
      ...sample.patientContext,
    };
    const reportDate = sample.reportDate || parsed.reportDate || '2024-05-15';

    // Analyze measurements against reference intervals & critical thresholds
    const { findings, summaryMetrics } = analyzeMeasurements(
      parsed.measurements,
      patientContext.sex
    );

    // Evaluate concerning combinations
    const combinationAlerts = evaluateCombinations(
      parsed.measurements,
      findings,
      reportDate
    );

    const costAwareGuidance = evaluateCostAwareGuidance(
      findings,
      combinationAlerts,
      patientContext
    );

    const reportId = `rep-${sample.id}-${Date.now()}`;
    const result: ReportAnalysisResult = {
      reportId,
      fileName: `${sample.name}.txt`,
      reportDate,
      patientContext,
      costAwareGuidance,
      extractionMetadata: {
        pages: 1,
        method: sample.id === 'sample-scanned-ocr' ? 'pdf_raster_ocr' : 'pdf_text',
        averageConfidence: sample.id === 'sample-scanned-ocr' ? 0.88 : 0.99,
        characterCount: sample.rawText.length,
        rawTextSnippet: sample.rawText.slice(0, 300) + '...',
        processedAt: new Date().toISOString(),
      },
      measurements: parsed.measurements,
      findings,
      combinationAlerts,
      summaryMetrics,
      storageMode: getStorageStatus().mode,
      rawText: sample.rawText,
      disclaimer:
        'Educational prototype. Findings require professional medical interpretation. Not intended for direct clinical diagnoses.',
    };

    await saveReport(result);
    res.json(result);
  } catch (err: any) {
    console.error('Sample loading error:', err);
    res.status(500).json({ error: err.message || 'Failed to load sample.' });
  }
});

// Step 1: Upload and Extract (returns raw text, established reportId, and editable verification table)
apiRouter.post('/extract', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded.' });
    }

    const { buffer, mimetype, originalname } = req.file;

    // Run extraction
    const extraction = await extractDocumentContent(buffer, mimetype, originalname);

    // Parse medical parameters from full text
    const parsed = parseMedicalReportText(extraction.fullText, 1, 'text_regex', extraction.metadata.averageConfidence);

    const reportId = `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const reportDate = parsed.reportDate || new Date().toISOString().split('T')[0];

    // Establish report in session store so subsequent operations reference this reportId
    const initialReport: ReportAnalysisResult = {
      reportId,
      fileName: originalname,
      reportDate,
      patientContext: parsed.patientContext,
      extractionMetadata: extraction.metadata,
      measurements: parsed.measurements,
      findings: [],
      combinationAlerts: [],
      summaryMetrics: {
        totalExtracted: parsed.measurements.length,
        analyzed: 0,
        normalCount: 0,
        abnormalCount: 0,
        criticalCount: 0,
        unclassifiedCount: 0,
        verificationNeededCount: parsed.measurements.length,
        prototypeReportIndicator: 0,
      },
      storageMode: getStorageStatus().mode,
      rawText: extraction.fullText,
      disclaimer: 'Extracted report pending user verification.',
    };

    await saveReport(initialReport);

    res.json({
      reportId,
      fileName: originalname,
      fileSize: buffer.length,
      mimeType: mimetype,
      extractionMetadata: extraction.metadata,
      rawText: extraction.fullText,
      patientContext: parsed.patientContext,
      reportDate,
      measurements: parsed.measurements,
    });
  } catch (err: any) {
    console.error('Extraction route error:', err);
    res.status(422).json({ error: err.message || 'Failed to extract document content.' });
  }
});

// Step 2: Analyze Verified Measurements (Deterministic Local Engine)
// Reuses existing reportId if provided to prevent duplicate historical visits
apiRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const {
      reportId: existingReportId,
      measurements,
      fileName,
      reportDate,
      patientContext,
      rawText,
      extractionMetadata,
    } = req.body as {
      reportId?: string;
      measurements: Measurement[];
      fileName?: string;
      reportDate?: string;
      patientContext?: any;
      rawText?: string;
      extractionMetadata?: any;
    };

    if (!Array.isArray(measurements)) {
      return res.status(400).json({ error: 'Invalid measurements array provided.' });
    }

    // Run deterministic analysis
    const { findings, summaryMetrics } = analyzeMeasurements(
      measurements,
      patientContext?.sex
    );

    // Evaluate concerning combinations
    const combinationAlerts = evaluateCombinations(
      measurements,
      findings,
      reportDate
    );

    const reportId = existingReportId || `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Check if report already exists in store
    const existing = await getReport(reportId);

    const activeContext = patientContext || existing?.patientContext || {};
    const costAwareGuidance = evaluateCostAwareGuidance(
      findings,
      combinationAlerts,
      activeContext
    );

    const result: ReportAnalysisResult = {
      reportId,
      fileName: fileName || existing?.fileName || 'User Report',
      reportDate: reportDate || existing?.reportDate || new Date().toISOString().split('T')[0],
      patientContext: activeContext,
      extractionMetadata: extractionMetadata || existing?.extractionMetadata || {
        pages: 1,
        method: 'pdf_text',
        averageConfidence: 0.95,
        characterCount: rawText?.length || 0,
        rawTextSnippet: (rawText || '').slice(0, 300),
        processedAt: new Date().toISOString(),
      },
      measurements,
      findings,
      combinationAlerts,
      summaryMetrics,
      costAwareGuidance,
      agentAnalysis: existing?.agentAnalysis || null,
      storageMode: getStorageStatus().mode,
      rawText: rawText || existing?.rawText || '',
      disclaimer:
        'Educational prototype. Findings require professional medical interpretation. Not intended for direct clinical diagnoses.',
    };

    await saveReport(result);
    res.json(result);
  } catch (err: any) {
    console.error('Analyze route error:', err);
    res.status(500).json({ error: err.message || 'Analysis failed.' });
  }
});

// AI Agent Orchestrated Analysis Endpoint
apiRouter.post('/agent/analyze', async (req: Request, res: Response) => {
  try {
    const {
      reportId,
      hasConsent,
      measurements,
      patientContext,
      forceMock,
    } = req.body;

    if (!reportId) {
      return res.status(400).json({ error: 'reportId is required for AI agent analysis.' });
    }

    let report = await getReport(reportId);

    // If measurements are provided (e.g. edited by user), update them before analysis
    if (report && Array.isArray(measurements)) {
      report.measurements = measurements;
      if (patientContext) report.patientContext = { ...report.patientContext, ...patientContext };
      await saveReport(report);
    } else if (!report && Array.isArray(measurements)) {
      report = {
        reportId,
        fileName: 'User Report',
        reportDate: new Date().toISOString().split('T')[0],
        patientContext: patientContext || {},
        extractionMetadata: {
          pages: 1,
          method: 'pdf_text',
          averageConfidence: 0.95,
          characterCount: 0,
          rawTextSnippet: '',
          processedAt: new Date().toISOString(),
        },
        measurements,
        findings: [],
        combinationAlerts: [],
        summaryMetrics: {
          totalExtracted: measurements.length,
          analyzed: 0,
          normalCount: 0,
          abnormalCount: 0,
          criticalCount: 0,
          unclassifiedCount: 0,
          verificationNeededCount: 0,
          prototypeReportIndicator: 0,
        },
        storageMode: getStorageStatus().mode,
        rawText: '',
        disclaimer: 'Educational prototype report.',
      };
      await saveReport(report);
    }

    // Run AI Agent Orchestrator
    const agentAnalysis = await runAiAnalysisAgent({
      reportId,
      hasConsent: Boolean(hasConsent),
      forceMock: Boolean(forceMock),
      sessionReport: report || undefined,
    });

    if (report) {
      if (agentAnalysis.costAwareGuidance) {
        report.costAwareGuidance = agentAnalysis.costAwareGuidance;
      } else if (report.findings && report.findings.length > 0) {
        report.costAwareGuidance = evaluateCostAwareGuidance(
          report.findings,
          report.combinationAlerts,
          report.patientContext
        );
      }
      report.agentAnalysis = agentAnalysis;
      await saveReport(report);
    }

    res.json({
      report,
      agentAnalysis,
    });
  } catch (err: any) {
    console.error('Agent analysis endpoint error:', err);
    res.status(500).json({ error: err.message || 'AI agent analysis failed.' });
  }
});

// Step 3.5: Update Patient Clinical Context (Symptoms, Duration, Conditions, Medications) & Recalculate Guidance
apiRouter.post('/reports/:id/guidance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clinicalContext } = req.body;

    const report = await getReport(id);
    if (!report) {
      return res.status(404).json({ error: `Report ${id} not found.` });
    }

    const updatedContext = {
      ...(report.patientContext || {}),
      ...(clinicalContext || {}),
    };

    report.patientContext = updatedContext;

    const guidance = evaluateCostAwareGuidance(
      report.findings,
      report.combinationAlerts,
      updatedContext
    );

    report.costAwareGuidance = guidance;
    if (report.agentAnalysis) {
      report.agentAnalysis.costAwareGuidance = guidance;
      report.agentAnalysis.nextStepSuggestion = guidance.headline;
    }

    await saveReport(report);
    res.json({ report, costAwareGuidance: guidance });
  } catch (err: any) {
    console.error('Guidance update error:', err);
    res.status(500).json({ error: 'Failed to update clinical context guidance.' });
  }
});

// Direct Guidance Evaluation (Stateless)
apiRouter.post('/guidance/evaluate', (req: Request, res: Response) => {
  try {
    const { findings, combinationAlerts, clinicalContext } = req.body;
    if (!Array.isArray(findings)) {
      return res.status(400).json({ error: 'findings array is required' });
    }

    const costAwareGuidance = evaluateCostAwareGuidance(
      findings,
      Array.isArray(combinationAlerts) ? combinationAlerts : [],
      clinicalContext
    );

    res.json({ costAwareGuidance });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to evaluate guidance.' });
  }
});

// Update Report Measurements (Interactive Verification)
apiRouter.post('/reports/:id/measurements', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { measurements, patientContext } = req.body;

    const report = await getReport(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (Array.isArray(measurements)) {
      report.measurements = measurements;
    }
    if (patientContext) {
      report.patientContext = { ...report.patientContext, ...patientContext };
    }

    // Invalidate stale findings and AI analysis when measurements are modified
    report.findings = [];
    report.combinationAlerts = [];
    report.agentAnalysis = null;

    await saveReport(report);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Step 3: Grounded Explainable Summary
apiRouter.post('/summary', async (req: Request, res: Response) => {
  try {
    const { findings, combinationAlerts, summaryMetrics, hasConsent } = req.body;
    if (!Array.isArray(findings)) {
      return res.status(400).json({ error: 'Missing findings data.' });
    }

    const summary = await generateReportSummary(
      findings,
      combinationAlerts || [],
      summaryMetrics || {
        totalExtracted: findings.length,
        analyzed: findings.length,
        normalCount: 0,
        abnormalCount: 0,
        criticalCount: 0,
        unclassifiedCount: 0,
        verificationNeededCount: 0,
        prototypeReportIndicator: 0,
      },
      Boolean(hasConsent)
    );

    res.json(summary);
  } catch (err: any) {
    console.error('Summary route error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate summary.' });
  }
});

// Step 4: Interactive Report Chat
apiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { question, findings, combinationAlerts, conversationHistory, hasConsent } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question string is required.' });
    }

    const answer = await answerReportQuery(
      question,
      findings || [],
      combinationAlerts || [],
      conversationHistory || [],
      Boolean(hasConsent)
    );

    res.json({ answer });
  } catch (err: any) {
    console.error('Chat route error:', err);
    res.status(500).json({ error: err.message || 'Chat error.' });
  }
});

// Reports History & Management
apiRouter.get('/reports', async (req: Request, res: Response) => {
  try {
    const list = await listReports();
    res.json({ reports: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/reports/:id', async (req: Request, res: Response) => {
  try {
    const report = await getReport(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/reports/:id', async (req: Request, res: Response) => {
  try {
    const success = await deleteReport(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/reports/clear', async (req: Request, res: Response) => {
  try {
    await clearAllReports();
    res.json({ success: true, message: 'All reports cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
