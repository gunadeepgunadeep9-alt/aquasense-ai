import React, { useMemo, useState } from "react";
import {
  BrainCircuit,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AIPredictionResult,
  IoTDeviceNode,
  ReportPeriod,
  SensorReading,
  ThresholdConfig,
} from "../types/water";
import { exportWaterQualityPdf, getAnalyticsSeries } from "../utils/waterQuality";

interface AnalyticsViewProps {
  activeNode: IoTDeviceNode;
  latest: SensorReading;
  thresholds: ThresholdConfig;
  aiPrediction: AIPredictionResult | null;
  onRunAiPrediction: () => void;
  aiLoading: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  activeNode,
  latest,
  thresholds,
  aiPrediction,
  onRunAiPrediction,
  aiLoading,
}) => {
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  const series = useMemo(() => getAnalyticsSeries(period), [period]);

  const summary = useMemo(() => {
    const count = series.length;
    const avgWqi = Math.round(series.reduce((s, x) => s + x.wqi, 0) / count);
    const avgPh = (series.reduce((s, x) => s + x.ph, 0) / count).toFixed(2);
    const avgTurb = (series.reduce((s, x) => s + x.turbidity, 0) / count).toFixed(2);
    const avgTds = Math.round(series.reduce((s, x) => s + x.tds, 0) / count);
    const avgTemp = (series.reduce((s, x) => s + x.temperature, 0) / count).toFixed(1);
    const minWqi = Math.min(...series.map((x) => x.wqi));
    const maxWqi = Math.max(...series.map((x) => x.wqi));
    return { avgWqi, avgPh, avgTurb, avgTds, avgTemp, minWqi, maxWqi };
  }, [series]);

  const handleDownloadPdf = () => {
    exportWaterQualityPdf({
      period,
      series,
      latest,
      wqi: latest.wqi,
      node: activeNode,
      thresholds,
      aiPrediction,
    });
    setPdfFeedback(`AquaSense_AI_Report_${period}.pdf downloaded`);
    setTimeout(() => setPdfFeedback(null), 4000);
  };

  const handleExportCsv = () => {
    const header = "Interval,pH,Turbidity (NTU),Temperature (C),TDS (ppm),WQI,Compliance (%)\n";
    const rows = series
      .map(
        (r) =>
          `${r.label},${r.ph},${r.turbidity},${r.temperature},${r.tds},${r.wqi},${r.compliantPct}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aquasense_${period}_analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:flex-row lg:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Water Quality Analytics & Reports
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Historical comparisons, compliance aggregations, and AI-assisted trend evaluation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
            role="tablist"
            aria-label="Report period"
          >
            {(
              [
                { id: "daily", label: "Daily" },
                { id: "weekly", label: "Weekly" },
                { id: "monthly", label: "Monthly" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={period === tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  period === tab.id
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF Report
          </button>
        </div>
      </div>

      {pdfFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          <FileText className="h-4 w-4 shrink-0" />
          <span>{pdfFeedback}</span>
        </div>
      )}

      {/* Period KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Period Average WQI</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-sky-700 tabular-nums">
            {summary.avgWqi}
            <span className="ml-1 text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
            Range: {summary.minWqi} – {summary.maxWqi}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Mean pH Level</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.avgPh}
            <span className="ml-1 text-xs font-normal text-slate-400">pH</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">Within WHO neutral band</div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Mean Turbidity</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.avgTurb}
            <span className="ml-1 text-xs font-normal text-slate-400">NTU</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Mean Temp: {summary.avgTemp} °C</div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Mean TDS Concentration</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.avgTds}
            <span className="ml-1 text-xs font-normal text-slate-400">ppm</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Node: {activeNode.id}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Sensor Reading Comparison (Bar Chart) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                WQI & Compliance Comparison ({period})
              </h2>
              <p className="text-xs text-slate-500">
                Water Quality Index score vs. sensor threshold compliance (%)
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-sky-600" />
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 10, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="wqi" name="WQI Score" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="compliantPct"
                  name="Compliance (%)"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Parameter Variations */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Historical Turbidity & TDS Trend ({period})
              </h2>
              <p className="text-xs text-slate-500">
                Dual-axis dissolved solids vs. particulate clarity
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis yAxisId="tds" domain={[150, 350]} tick={{ fontSize: 11, fill: "#0369a1" }} />
                <YAxis
                  yAxisId="turb"
                  orientation="right"
                  domain={[0, 6]}
                  tick={{ fontSize: 11, fill: "#0891b2" }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  yAxisId="tds"
                  type="monotone"
                  dataKey="tds"
                  name="TDS (ppm)"
                  stroke="#0284c7"
                  strokeWidth={2.2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="turb"
                  type="monotone"
                  dataKey="turbidity"
                  name="Turbidity (NTU)"
                  stroke="#06b6d4"
                  strokeWidth={2.2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI-Based Trend Analysis Card */}
      <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-r from-white via-sky-50/50 to-cyan-50/40 p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
              <BrainCircuit className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                AI-Based Trend Analysis ({period.charAt(0).toUpperCase() + period.slice(1)} Window)
              </h2>
              <p className="text-xs text-slate-500">
                Automated synthesis of sensor drift and contamination risk patterns
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRunAiPrediction}
            disabled={aiLoading}
            className="rounded-lg border border-sky-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {aiLoading ? "Updating..." : "Refresh AI Insights"}
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {aiPrediction
            ? aiPrediction.analysisSummary
            : `Over the selected ${period} window, average WQI maintained ${summary.avgWqi}/100 with mean pH at ${summary.avgPh} and TDS at ${summary.avgTds} ppm.`}
        </p>
      </div>

      {/* Historical Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-bold text-slate-900">
            Historical Telemetry Log ({period})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Interval</th>
                <th className="px-4 py-2.5 text-right font-semibold">pH</th>
                <th className="px-4 py-2.5 text-right font-semibold">Turbidity (NTU)</th>
                <th className="px-4 py-2.5 text-right font-semibold">Temp (°C)</th>
                <th className="px-4 py-2.5 text-right font-semibold">TDS (ppm)</th>
                <th className="px-4 py-2.5 text-right font-semibold">WQI</th>
                <th className="px-5 py-2.5 text-right font-semibold">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {series.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50/70">
                  <td className="px-5 py-2.5 font-mono font-medium text-slate-800">{row.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {row.ph.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {row.turbidity.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {row.temperature.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {row.tds}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-sky-700">
                    {row.wqi}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums text-emerald-700">
                    {row.compliantPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
