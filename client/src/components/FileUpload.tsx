import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, ShieldAlert, CheckSquare, Square } from 'lucide-react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  hasConsent: boolean;
  onConsentChange: (consent: boolean) => void;
  onOpenSamples: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelected,
  isLoading,
  hasConsent,
  onConsentChange,
  onOpenSamples,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 lg:p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-teal-400 bg-teal-950/40 scale-[1.01]'
            : 'border-slate-700/80 hover:border-teal-500/50 bg-slate-900/60 hover:bg-slate-900/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Drop your medical report here, or <span className="text-teal-400 underline underline-offset-4">browse</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports searchable & scanned PDF, PNG, and JPEG documents (up to 15MB)
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs text-slate-400 pt-2">
            <span className="flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>PDF (Text & Scanned)</span>
            </span>
            <span className="flex items-center space-x-1">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>PNG / JPEG (OCR)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Demo CTA & Privacy Consent Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
        {/* User Privacy Consent Toggle */}
        <div
          onClick={() => onConsentChange(!hasConsent)}
          className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-300 select-none group"
        >
          {hasConsent ? (
            <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-400 shrink-0" />
          )}
          <span>
            Consent to send <strong>de-identified structured findings</strong> to optional Gemini AI summary
          </span>
        </div>

        {/* Quick Sample Button */}
        <button
          type="button"
          onClick={onOpenSamples}
          className="text-xs font-semibold text-teal-400 hover:text-teal-300 underline underline-offset-4 flex items-center space-x-1"
        >
          <span>Don't have a report? Try 8 preloaded synthetic samples →</span>
        </button>
      </div>
    </div>
  );
};
