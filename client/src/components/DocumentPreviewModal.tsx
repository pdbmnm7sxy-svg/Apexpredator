import React from 'react';
import { X, FileText, CheckCircle2, Copy } from 'lucide-react';
import { ExtractionMetadata } from '../types/index.js';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  metadata?: ExtractionMetadata;
  fileName?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  rawText,
  metadata,
  fileName,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const copyText = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-teal-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30">
              <FileText className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Source Document & Extracted Text
              </h3>
              <p className="text-xs text-slate-400">
                {fileName || 'Medical Report Text Preview'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Bar */}
        {metadata && (
          <div className="px-6 py-2 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span>Pages: <strong className="text-slate-200">{metadata.pages}</strong></span>
            <span>Method: <strong className="text-teal-300 uppercase">{metadata.method}</strong></span>
            <span>Confidence: <strong className="text-slate-200">{Math.round(metadata.averageConfidence * 100)}%</strong></span>
            <span>Characters: <strong className="text-slate-200">{metadata.characterCount}</strong></span>
          </div>
        )}

        {/* Text Container */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-300 whitespace-pre-wrap bg-slate-950/90 leading-relaxed selection:bg-teal-500/30">
          {rawText || 'No text extracted from document.'}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={copyText}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Raw Text'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
