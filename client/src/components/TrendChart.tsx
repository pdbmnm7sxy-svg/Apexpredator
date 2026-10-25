import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { TrendingUp, Calendar, Info } from 'lucide-react';
import { ReportAnalysisResult } from '../types/index.js';

interface TrendChartProps {
  reports: ReportAnalysisResult[];
  onLoadTrendSample: () => void;
}

export const TrendChart: React.FC<TrendChartProps> = ({ reports, onLoadTrendSample }) => {
  const [selectedParameter, setSelectedParameter] = useState<'glucose_fasting' | 'triglycerides' | 'hemoglobin' | 'creatinine'>('glucose_fasting');

  // Filter reports that have a date and the selected parameter
  const sortedReports = [...reports].sort((a, b) => {
    return (a.reportDate || '').localeCompare(b.reportDate || '');
  });

  const chartData = sortedReports.map((r) => {
    const m = r.measurements.find((meas) => meas.canonicalId === selectedParameter);
    const dateLabel = r.reportDate || 'Undated';
    return {
      date: dateLabel,
      reportName: r.fileName,
      value: m?.normalizedValue !== null && m?.normalizedValue !== undefined ? m.normalizedValue : null,
      unit: m?.normalizedUnit || '',
    };
  }).filter((d) => d.value !== null);

  const getParamConfig = () => {
    switch (selectedParameter) {
      case 'glucose_fasting':
        return { name: 'Fasting Blood Glucose', unit: 'mg/dL', refMin: 70, refMax: 99, color: '#14b8a6' };
      case 'triglycerides':
        return { name: 'Triglycerides', unit: 'mg/dL', refMin: 30, refMax: 150, color: '#f59e0b' };
      case 'hemoglobin':
        return { name: 'Hemoglobin', unit: 'g/dL', refMin: 12.0, refMax: 16.5, color: '#ef4444' };
      case 'creatinine':
        return { name: 'Serum Creatinine', unit: 'mg/dL', refMin: 0.6, refMax: 1.2, color: '#6366f1' };
    }
  };

  const config = getParamConfig();

  return (
    <div className="w-full space-y-4 rounded-2xl bg-slate-900/80 border border-teal-500/30 p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>Longitudinal Parameter Trend Tracking</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-teal-300">
                {chartData.length} Data Points
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Track changes across multiple clinical visits against standard normal reference bands
            </p>
          </div>
        </div>

        {/* Parameter Selector Pills */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedParameter('glucose_fasting')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedParameter === 'glucose_fasting'
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fasting Glucose
          </button>
          <button
            onClick={() => setSelectedParameter('triglycerides')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedParameter === 'triglycerides'
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Triglycerides
          </button>
          <button
            onClick={() => setSelectedParameter('hemoglobin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedParameter === 'hemoglobin'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hemoglobin
          </button>
          <button
            onClick={() => setSelectedParameter('creatinine')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedParameter === 'creatinine'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Creatinine
          </button>
        </div>
      </div>

      {chartData.length >= 2 ? (
        <div className="w-full h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 25, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 11 }}
                domain={['auto', 'auto']}
                unit={` ${config.unit}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #14b8a6',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Legend verticalAlign="top" height={36} />

              {/* Normal Reference Band */}
              <ReferenceArea
                y1={config.refMin}
                y2={config.refMax}
                fill="#14b8a6"
                fillOpacity={0.08}
                stroke="#14b8a6"
                strokeOpacity={0.2}
                strokeDasharray="2 2"
              />

              <Line
                type="monotone"
                dataKey="value"
                name={`${config.name} (${config.unit})`}
                stroke={config.color}
                strokeWidth={3}
                dot={{ r: 6, fill: config.color, stroke: '#0f172a', strokeWidth: 2 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-200">
              Single Report Loaded ({chartData.length} point)
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Trend lines automatically render when two or more reports from different dates are present.
            </p>
          </div>
          <button
            onClick={onLoadTrendSample}
            className="px-3.5 py-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600 text-teal-200 hover:text-white text-xs font-semibold transition-colors"
          >
            Load 2-Visit Follow-Up Sample to View Trends →
          </button>
        </div>
      )}
    </div>
  );
};
