import React, { useEffect, useState } from 'react';
import { Header } from './components/Header.tsx';
import { FileUpload } from './components/FileUpload.tsx';
import { ProcessingProgress } from './components/ProcessingProgress.tsx';
import { VerificationTable } from './components/VerificationTable.tsx';
import { SummaryMetrics } from './components/SummaryMetrics.tsx';
import { CombinationAlerts } from './components/CombinationAlerts.tsx';
import { FindingsTable } from './components/FindingsTable.tsx';
import { TrendChart } from './components/TrendChart.tsx';
import { GroundedSummaryChat } from './components/GroundedSummaryChat.tsx';
import { DocumentPreviewModal } from './components/DocumentPreviewModal.tsx';
import { SampleSelector } from './components/SampleSelector.tsx';
import { AgentAnalysisView } from './components/AgentAnalysisView.tsx';
import { CostAwareGuidanceCard } from './components/CostAwareGuidanceCard.tsx';
import {
  fetchSystemStatus,
  fetchSamples,
  loadSampleReport,
  extractDocumentFile,
  analyzeReportData,
  fetchExplainableSummary,
  fetchReportsHistory,
  clearAllSavedReports,
  runAiAgentAnalysis,
  updateReportClinicalContext,
} from './api/index.ts';
import {
  ExplainableSummaryResponse,
  Measurement,
  ReportAnalysisResult,
  AgentAnalysisResult,
  ClinicalContext,
} from './types/index.ts';
import { Download, FileText, CheckCircle2, AlertTriangle, Printer, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [storageMode, setStorageMode] = useState<'session_memory' | 'mongodb_persistent'>('session_memory');
  const [samples, setSamples] = useState<any[]>([]);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Active Report State
  const [currentReport, setCurrentReport] = useState<ReportAnalysisResult | null>(null);
  const [verifiedMeasurements, setVerifiedMeasurements] = useState<Measurement[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [extractionMetadata, setExtractionMetadata] = useState<any>(null);
  const [patientContext, setPatientContext] = useState<any>({});
  const [reportDate, setReportDate] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  // Historical reports for trends
  const [reportsHistory, setReportsHistory] = useState<ReportAnalysisResult[]>([]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Consent & Summary state (Default Consent OFF for privacy)
  const [hasConsent, setHasConsent] = useState(false);
  const [summary, setSummary] = useState<ExplainableSummaryResponse | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // AI Agent Analysis State
  const [isAgentAnalyzing, setIsAgentAnalyzing] = useState(false);
  const [agentAnalysis, setAgentAnalysis] = useState<AgentAnalysisResult | null>(null);
  const [agentProgressStage, setAgentProgressStage] = useState('');

  // On mount: load status, samples, and report history
  useEffect(() => {
    fetchSystemStatus()
      .then((res) => {
        if (res.storage?.mode) setStorageMode(res.storage.mode);
      })
      .catch((e) => console.warn('Status fetch error:', e));

    fetchSamples()
      .then((res) => setSamples(res.samples || []))
      .catch((e) => console.warn('Samples fetch error:', e));

    fetchReportsHistory()
      .then((res) => setReportsHistory(res.reports || []))
      .catch(() => {});
  }, []);

  // Handle Document Upload
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStep(1);
    setStatusMessage('Ingesting document and parsing file structure...');

    try {
      setCurrentStep(2);
      setStatusMessage('Extracting text and running OCR on image/scanned pages...');
      const ext = await extractDocumentFile(file);

      setCurrentStep(3);
      setStatusMessage('Extracting medical analytes and reference ranges...');
      setFileName(ext.fileName);
      setRawText(ext.rawText);
      setExtractionMetadata(ext.extractionMetadata);
      setPatientContext(ext.patientContext);
      setReportDate(ext.reportDate);
      setVerifiedMeasurements(ext.measurements);

      setCurrentStep(4);
      setStatusMessage('Running deterministic reference range and critical threshold rules...');
      const analyzed = await analyzeReportData({
        measurements: ext.measurements,
        fileName: ext.fileName,
        reportDate: ext.reportDate,
        patientContext: ext.patientContext,
        rawText: ext.rawText,
        extractionMetadata: ext.extractionMetadata,
      });

      setCurrentStep(5);
      setStatusMessage('Evaluating concerning combinations...');
      setCurrentReport(analyzed);
      setReportsHistory((prev) => [analyzed, ...prev]);

      // Automatically generate summary
      generateSummaryForReport(analyzed);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to process document.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Load Synthetic Sample
  const handleSelectSample = async (sampleId: string) => {
    setIsSampleModalOpen(false);
    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStep(1);
    setStatusMessage('Loading synthetic sample fixture...');

    try {
      setCurrentStep(3);
      setStatusMessage('Parsing medical parameters & reference boundaries...');
      const rep = await loadSampleReport(sampleId);

      setCurrentStep(4);
      setStatusMessage('Evaluating deterministic rules and critical thresholds...');
      setCurrentReport(rep);
      setVerifiedMeasurements(rep.measurements);
      setRawText(rep.rawText);
      setExtractionMetadata(rep.extractionMetadata);
      setPatientContext(rep.patientContext);
      setReportDate(rep.reportDate || '2024-05-15');
      setFileName(rep.fileName);
      setReportsHistory((prev) => [rep, ...prev]);

      setCurrentStep(5);
      setStatusMessage('Evaluating concerning co-occurrence rules...');

      // Generate explainable summary
      generateSummaryForReport(rep);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to load sample report.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-run analysis with human verified/edited measurements
  const handleReanalyze = async () => {
    if (!verifiedMeasurements.length) return;
    setIsProcessing(true);
    setStatusMessage('Re-evaluating rules with human-verified values...');

    try {
      const analyzed = await analyzeReportData({
        measurements: verifiedMeasurements,
        fileName,
        reportDate,
        patientContext,
        rawText,
        extractionMetadata,
      });

      setCurrentReport(analyzed);
      generateSummaryForReport(analyzed);
    } catch (err: any) {
      setErrorMessage(err.message || 'Re-analysis failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // AI Agent Analysis Execution
  const handleRunAgentAnalysis = async () => {
    if (!verifiedMeasurements.length) return;
    setIsAgentAnalyzing(true);
    setErrorMessage(null);
    setAgentProgressStage('Initializing AI agent and loading verified parameters...');

    const t1 = setTimeout(() => {
      setAgentProgressStage('Executing normalize_measurement & aligning reference bounds...');
    }, 400);
    const t2 = setTimeout(() => {
      setAgentProgressStage('Calling compare_with_reference & evaluating thresholds...');
    }, 900);
    const t3 = setTimeout(() => {
      setAgentProgressStage('Validating findings and synthesizing clinician questions...');
    }, 1400);

    try {
      const result = await runAiAgentAnalysis({
        reportId: currentReport?.reportId,
        hasConsent,
        measurements: verifiedMeasurements,
        patientContext: currentReport?.patientContext || patientContext,
      });

      setAgentAnalysis(result.agentAnalysis);
      if (result.report) {
        setCurrentReport(result.report);
      }
    } catch (err: any) {
      console.error('Agent analysis error:', err);
      setErrorMessage(err.message || 'AI agent analysis failed.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsAgentAnalyzing(false);
      setAgentProgressStage('');
    }
  };

  // Update Clinical Context (symptoms, duration, conditions, medications)
  const handleUpdateClinicalContext = async (updatedContext: ClinicalContext) => {
    if (!currentReport) return;
    try {
      const res = await updateReportClinicalContext(currentReport.reportId, updatedContext);
      setCurrentReport(res.report);
      setPatientContext(res.report.patientContext || updatedContext);
      if (agentAnalysis && res.report.agentAnalysis) {
        setAgentAnalysis(res.report.agentAnalysis);
      }
    } catch (err: any) {
      console.error('Failed to update clinical context:', err);
      setErrorMessage(err.message || 'Failed to update clinical context guidance');
    }
  };

  // Generate Summary
  const generateSummaryForReport = async (report: ReportAnalysisResult) => {
    setIsLoadingSummary(true);
    try {
      const sum = await fetchExplainableSummary({
        findings: report.findings,
        combinationAlerts: report.combinationAlerts,
        summaryMetrics: report.summaryMetrics,
        hasConsent,
      });
      setSummary(sum);
    } catch (e: any) {
      console.warn('Summary generation error:', e);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Reset current state
  const handleReset = () => {
    setCurrentReport(null);
    setVerifiedMeasurements([]);
    setRawText('');
    setSummary(null);
    setAgentAnalysis(null);
    setErrorMessage(null);
  };

  // Load trend sample (earlier + later reports)
  const handleLoadTrendFixture = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage('Loading longitudinal 2-visit patient panel (Jan & April 2024)...');
      const r1 = await loadSampleReport('sample-trend-earlier');
      const r2 = await loadSampleReport('sample-trend-later');
      setCurrentReport(r2);
      setVerifiedMeasurements(r2.measurements);
      setRawText(r2.rawText);
      setReportsHistory([r1, r2]);
      generateSummaryForReport(r2);
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export report as JSON
  const handleExportJSON = () => {
    if (!currentReport) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentReport, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `MedLens_Analysis_${currentReport.reportDate || 'Report'}.json`;
    a.click();
  };

  // Print/PDF Export
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Global Header */}
      <Header
        storageMode={storageMode}
        onReset={handleReset}
        hasActiveReport={Boolean(currentReport || verifiedMeasurements.length > 0)}
        onOpenSamples={() => setIsSampleModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-white underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <ProcessingProgress
            currentStep={currentStep}
            statusMessage={statusMessage}
          />
        )}

        {/* Upload Zone (Visible when no active report is loaded) */}
        {!currentReport && !verifiedMeasurements.length && !isProcessing && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2 pt-4">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30">
                AI & Rule-Based MedTech Demo
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-100">
                Explainable Medical Report Analyzer
              </h2>
              <p className="text-sm text-slate-400">
                Upload a clinical laboratory report or load a synthetic test panel. MedLens extracts parameters, highlights out-of-range values, and uncovers concerning multi-analyte combinations.
              </p>
            </div>

            <FileUpload
              onFileSelected={handleFileUpload}
              isLoading={isProcessing}
              hasConsent={hasConsent}
              onConsentChange={setHasConsent}
              onOpenSamples={() => setIsSampleModalOpen(true)}
            />

            {/* Quick Feature Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-teal-400 block">
                  1. Hybrid Extraction & OCR
                </span>
                <p className="text-xs text-slate-400">
                  Selectable text PDFs, scanned documents via Tesseract OCR, and image uploads.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-cyan-400 block">
                  2. Deterministic Rule Engine
                </span>
                <p className="text-xs text-slate-400">
                  Precedence for printed lab ranges, inclusive boundary checks, and critical threshold rules.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-amber-400 block">
                  3. Concerning Combinations
                </span>
                <p className="text-xs text-slate-400">
                  Cross-analyte rules flagging atherogenic metabolic risk, cytopenias, and cardiorenal strain.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Human-in-the-Loop Editable Verification Table */}
        {verifiedMeasurements.length > 0 && (
          <VerificationTable
            measurements={verifiedMeasurements}
            onMeasurementsChange={(updated) => {
              setVerifiedMeasurements(updated);
              if (agentAnalysis) setAgentAnalysis(null);
            }}
            onReanalyze={handleReanalyze}
            isAnalyzing={isProcessing}
            onRunAgentAnalysis={handleRunAgentAnalysis}
            isAgentAnalyzing={isAgentAnalyzing}
            agentProgressStage={agentProgressStage}
            hasConsent={hasConsent}
            onConsentToggle={() => setHasConsent(!hasConsent)}
            onViewSourceDoc={() => setIsPreviewModalOpen(true)}
          />
        )}

        {/* AI Agent Analysis Card (Prominently displayed when running or finished) */}
        {(agentAnalysis || isAgentAnalyzing) && (
          <AgentAnalysisView
            agentAnalysis={agentAnalysis}
            isLoading={isAgentAnalyzing}
            hasConsent={hasConsent}
            onConsentToggle={() => setHasConsent(!hasConsent)}
          />
        )}

        {/* Results Dashboard */}
        {currentReport && (
          <div className="space-y-6 pt-2">
            {/* Report Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {currentReport.fileName}
                  </h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                    <span>Date: <strong className="text-slate-200">{currentReport.reportDate}</strong></span>
                    {currentReport.patientContext?.age && (
                      <span>Age: <strong className="text-slate-200">{currentReport.patientContext.age} Yrs</strong></span>
                    )}
                    {currentReport.patientContext?.sex && (
                      <span>Sex: <strong className="text-slate-200 uppercase">{currentReport.patientContext.sex}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Export & Inspect */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>Raw Text</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={handlePrintPDF}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* Cost-Aware Next-Step Guidance Card */}
            {currentReport.costAwareGuidance && (
              <CostAwareGuidanceCard
                guidance={currentReport.costAwareGuidance}
                clinicalContext={currentReport.patientContext || patientContext}
                onUpdateContext={handleUpdateClinicalContext}
              />
            )}

            {/* Summary Metrics */}
            <SummaryMetrics metrics={currentReport.summaryMetrics} />

            {/* Concerning Combination Alerts (Key Hackathon Requirement) */}
            <CombinationAlerts alerts={currentReport.combinationAlerts} />

            {/* Findings Table */}
            <FindingsTable findings={currentReport.findings} />

            {/* Trend Chart (Longitudinal Analysis) */}
            <TrendChart
              reports={reportsHistory}
              onLoadTrendSample={handleLoadTrendFixture}
            />

            {/* Explainable AI Summary & Grounded Chat */}
            <GroundedSummaryChat
              summary={summary}
              findings={currentReport.findings}
              combinationAlerts={currentReport.combinationAlerts}
              hasConsent={hasConsent}
              onRequestSummary={() => generateSummaryForReport(currentReport)}
              isLoadingSummary={isLoadingSummary}
            />
          </div>
        )}
      </main>

      {/* Synthetic Sample Selector Modal */}
      <SampleSelector
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        samples={samples}
        onSelectSample={handleSelectSample}
        isLoading={isProcessing}
      />

      {/* Raw Document Text Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        rawText={rawText}
        metadata={extractionMetadata}
        fileName={fileName}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-4 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MedLens Hackathon Prototype • Healthcare & MedTech Track</span>
          <span>Architecture inspired by MEDGPT research framework (prototype extensions)</span>
        </div>
      </footer>
    </div>
  );
};
