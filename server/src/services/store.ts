import mongoose from 'mongoose';
import { ReportAnalysisResult } from '../types/index.js';

// In-Memory store for Session Mode
const inMemoryReports = new Map<string, ReportAnalysisResult>();
let isMongoConnected = false;
let mongoConnectionAttempted = false;

// Mongoose schema for persistent mode
const ReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true },
    fileName: String,
    reportDate: String,
    patientContext: Object,
    extractionMetadata: Object,
    measurements: Array,
    findings: Array,
    combinationAlerts: Array,
    summaryMetrics: Object,
    storageMode: String,
    rawText: String,
    disclaimer: String,
  },
  { timestamps: true }
);

let ReportModel: mongoose.Model<any> | null = null;

/**
 * Initializes storage: tries connecting to MongoDB if MONGODB_URI is provided.
 * Gracefully falls back to temporary in-memory session mode otherwise.
 */
export async function initializeStorage(): Promise<void> {
  if (mongoConnectionAttempted) return;
  mongoConnectionAttempted = true;

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('ℹ️  MedLens: No MONGODB_URI provided. Running in Temporary Session Mode (In-Memory).');
    isMongoConnected = false;
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2500 });
    isMongoConnected = true;
    ReportModel = mongoose.models.Report || mongoose.model('Report', ReportSchema);
    console.log('✅ MedLens: Connected to MongoDB for persistent history.');
  } catch (err: any) {
    console.warn(`⚠️  MedLens: MongoDB connection failed (${err.message}). Defaulting to Temporary Session Mode (In-Memory).`);
    isMongoConnected = false;
  }
}

export function getStorageStatus(): {
  mode: 'session_memory' | 'mongodb_persistent';
  connected: boolean;
  message: string;
} {
  if (isMongoConnected) {
    return {
      mode: 'mongodb_persistent',
      connected: true,
      message: 'Connected to MongoDB (Persistent Database Mode)',
    };
  }
  return {
    mode: 'session_memory',
    connected: false,
    message: 'Temporary Session Mode (In-Memory) — MongoDB not connected. Data remains in this session.',
  };
}

export async function saveReport(report: ReportAnalysisResult): Promise<void> {
  const status = getStorageStatus();
  report.storageMode = status.mode;

  if (isMongoConnected && ReportModel) {
    try {
      await ReportModel.findOneAndUpdate(
        { reportId: report.reportId },
        report,
        { upsert: true, new: true }
      );
      return;
    } catch (e) {
      console.error('Mongo save error, saving to memory fallback:', e);
    }
  }

  inMemoryReports.set(report.reportId, report);
}

export async function getReport(reportId: string): Promise<ReportAnalysisResult | null> {
  if (isMongoConnected && ReportModel) {
    try {
      const doc = await ReportModel.findOne({ reportId }).lean();
      if (doc) return doc as unknown as ReportAnalysisResult;
    } catch (e) {
      console.error('Mongo query error, falling back to memory:', e);
    }
  }

  return inMemoryReports.get(reportId) || null;
}

export async function listReports(): Promise<ReportAnalysisResult[]> {
  if (isMongoConnected && ReportModel) {
    try {
      const docs = await ReportModel.find().sort({ createdAt: -1 }).limit(20).lean();
      return docs as unknown as ReportAnalysisResult[];
    } catch (e) {
      console.error('Mongo list error, falling back to memory:', e);
    }
  }

  return Array.from(inMemoryReports.values()).reverse();
}

export async function deleteReport(reportId: string): Promise<boolean> {
  if (isMongoConnected && ReportModel) {
    try {
      const res = await ReportModel.deleteOne({ reportId });
      return (res.deletedCount || 0) > 0;
    } catch (e) {
      console.error('Mongo delete error:', e);
    }
  }

  return inMemoryReports.delete(reportId);
}

export async function clearAllReports(): Promise<void> {
  if (isMongoConnected && ReportModel) {
    try {
      await ReportModel.deleteMany({});
    } catch (e) {
      console.error('Mongo clear error:', e);
    }
  }

  inMemoryReports.clear();
}
