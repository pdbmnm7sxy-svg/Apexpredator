import {
  ExplainableSummaryResponse,
  Measurement,
  ReportAnalysisResult,
  AgentAnalysisResult,
  ClinicalContext,
  CostAwareGuidance,
} from '../types/index.js';

const API_BASE = '/api';

export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Failed to fetch system status');
  return res.json();
}

export async function fetchSamples(): Promise<{
  samples: {
    id: string;
    name: string;
    category: string;
    description: string;
    expectedFindings: string;
    reportDate: string;
  }[];
}> {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) throw new Error('Failed to fetch synthetic samples');
  return res.json();
}

export async function loadSampleReport(sampleId: string): Promise<ReportAnalysisResult> {
  const res = await fetch(`${API_BASE}/samples/${sampleId}/load`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load sample ${sampleId}`);
  }
  return res.json();
}

export async function extractDocumentFile(file: File): Promise<{
  fileName: string;
  fileSize: number;
  mimeType: string;
  extractionMetadata: any;
  rawText: string;
  patientContext: any;
  reportDate: string;
  measurements: Measurement[];
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/extract`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Document extraction failed');
  }

  return res.json();
}

export async function analyzeReportData(payload: {
  measurements: Measurement[];
  fileName?: string;
  reportDate?: string;
  patientContext?: any;
  rawText?: string;
  extractionMetadata?: any;
}): Promise<ReportAnalysisResult> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Report analysis failed');
  }

  return res.json();
}

export async function fetchExplainableSummary(payload: {
  findings: any[];
  combinationAlerts: any[];
  summaryMetrics: any;
  hasConsent: boolean;
}): Promise<ExplainableSummaryResponse> {
  const res = await fetch(`${API_BASE}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate explainable summary');
  }

  return res.json();
}

export async function sendReportChatMessage(payload: {
  question: string;
  findings: any[];
  combinationAlerts: any[];
  conversationHistory: { role: string; content: string }[];
  hasConsent: boolean;
}): Promise<{ answer: string }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Chat query failed');
  }

  return res.json();
}

export async function fetchReportsHistory(): Promise<{ reports: ReportAnalysisResult[] }> {
  const res = await fetch(`${API_BASE}/reports`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function clearAllSavedReports(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/reports/clear`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear reports');
  return res.json();
}

export async function runAiAgentAnalysis(payload: {
  reportId?: string;
  hasConsent: boolean;
  measurements?: Measurement[];
  patientContext?: any;
  forceMock?: boolean;
}): Promise<{
  report: ReportAnalysisResult;
  agentAnalysis: AgentAnalysisResult;
}> {
  const res = await fetch(`${API_BASE}/agent/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI Agent analysis failed');
  }

  return res.json();
}

export async function updateReportClinicalContext(
  reportId: string,
  clinicalContext: ClinicalContext
): Promise<{
  report: ReportAnalysisResult;
  costAwareGuidance: CostAwareGuidance;
}> {
  const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/guidance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinicalContext }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update clinical context guidance');
  }

  return res.json();
}

export async function evaluateDirectGuidance(payload: {
  findings: any[];
  combinationAlerts?: any[];
  clinicalContext?: ClinicalContext;
}): Promise<{ costAwareGuidance: CostAwareGuidance }> {
  const res = await fetch(`${API_BASE}/guidance/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to evaluate guidance');
  }

  return res.json();
}
