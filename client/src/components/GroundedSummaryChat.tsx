import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  HelpCircle,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Bot,
  User,
  CheckCircle,
} from 'lucide-react';
import { ExplainableSummaryResponse, Finding, CombinationAlert } from '../types/index.js';
import { sendReportChatMessage } from '../api/index.js';

interface GroundedSummaryChatProps {
  summary: ExplainableSummaryResponse | null;
  findings: Finding[];
  combinationAlerts: CombinationAlert[];
  hasConsent: boolean;
  onRequestSummary: () => void;
  isLoadingSummary: boolean;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export const GroundedSummaryChat: React.FC<GroundedSummaryChatProps> = ({
  summary,
  findings,
  combinationAlerts,
  hasConsent,
  onRequestSummary,
  isLoadingSummary,
}) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isSending) return;

    const userMsg: ChatMsg = { role: 'user', content: q };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsSending(true);

    try {
      const res = await sendReportChatMessage({
        question: q,
        findings,
        combinationAlerts,
        conversationHistory: nextHistory,
        hasConsent,
      });

      setMessages([...nextHistory, { role: 'assistant', content: res.answer }]);
    } catch (err: any) {
      setMessages([
        ...nextHistory,
        {
          role: 'assistant',
          content: 'Sorry, unable to answer this question right now. Please refer to the findings table.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const sampleQuestions = [
    'Why is my blood glucose flagged?',
    'What does the combination alert mean?',
    'Are my platelets normal?',
    'What should I ask my doctor at my visit?',
  ];

  return (
    <div className="w-full space-y-4 rounded-2xl bg-slate-900/80 border border-teal-500/30 p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>Explainable Clinical Summary & Grounded Q&A</span>
              {summary && (
                <span
                  className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
                    summary.provider === 'llm_gemini'
                      ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                      : 'bg-teal-950 text-teal-300 border-teal-500/40'
                  }`}
                >
                  {summary.provider === 'llm_gemini'
                    ? 'Gemini Multimodal Adapter'
                    : 'Deterministic Grounded Template'}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Clear, patient-friendly explanations grounded strictly in structured findings
            </p>
          </div>
        </div>

        {!summary && (
          <button
            onClick={onRequestSummary}
            disabled={isLoadingSummary}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-slate-950 shadow transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isLoadingSummary ? 'Generating...' : 'Generate Clinical Summary'}</span>
          </button>
        )}
      </div>

      {/* Summary Content */}
      {summary ? (
        <div className="space-y-4 animate-in fade-in">
          {/* Main narrative */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {summary.summary}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Observations */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-teal-300 flex items-center space-x-1.5 uppercase tracking-wide">
                <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
                <span>Key Clinical Observations</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {summary.keyObservations.map((obs, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-teal-400 font-bold">•</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggested Doctor Questions */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5 uppercase tracking-wide">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Suggested Questions for Your Clinician</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {summary.suggestedQuestionsForDoctor.map((q, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-cyan-400 font-bold">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-400">
            Click "Generate Clinical Summary" to produce an easy-to-read synthesis of your report's key observations and questions to bring to your doctor.
          </p>
        </div>
      )}

      {/* Interactive Report Chat Section */}
      <div className="pt-3 border-t border-slate-800 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
          <MessageSquare className="w-4 h-4 text-teal-400" />
          <span>Ask Questions About This Report</span>
        </div>

        {/* Suggested Quick Questions */}
        <div className="flex flex-wrap gap-1.5">
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq)}
              className="px-2.5 py-1 rounded-full text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 text-slate-300 hover:text-teal-300 transition-colors"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        {messages.length > 0 && (
          <div className="max-h-64 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start space-x-2 text-xs ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="p-1 rounded-full bg-teal-500/20 text-teal-400 shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-teal-700 text-white rounded-br-none'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="p-1 rounded-full bg-slate-800 text-slate-400 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Ask a question about your verified test values (e.g. What is my fasting glucose?)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-teal-400 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="p-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <span className="text-[10px] text-slate-400 block text-center">
          MedLens AI answers questions grounded strictly in the current verified report. Findings require professional medical interpretation.
        </span>
      </div>
    </div>
  );
};
