import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AIPredictionResult,
  IoTDeviceNode,
  ParameterKey,
  SensorReading,
  ThresholdConfig,
} from "../types/water";
import { evaluateParameterStatus, getWQILabel } from "../utils/waterQuality";
import { CircularWqiGauge } from "./CircularWqiGauge";
import { SensorCard } from "./SensorCard";
import { WaterWaveBackdrop } from "./WaterWaveBackdrop";

interface DashboardViewProps {
  now: Date;
  activeNode: IoTDeviceNode;
  latest: SensorReading;
  history: SensorReading[];
  thresholds: ThresholdConfig;
  aiPrediction: AIPredictionResult | null;
  aiLoading: boolean;
  aiError: string | null;
  onRunAiPrediction: () => void;
  onNavigateLive: () => void;
  onNavigateAlerts: () => void;
  activeAlertCount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  now,
  activeNode,
  latest,
  history,
  thresholds,
  aiPrediction,
  aiLoading,
  aiError,
  onRunAiPrediction,
  onNavigateLive,
  onNavigateAlerts,
  activeAlertCount,
}) => {
  const [chartParam, setChartParam] = useState<"all" | ParameterKey>("all");

  const phStatus = evaluateParameterStatus("ph", latest.ph, thresholds);
  const turbStatus = evaluateParameterStatus("turbidity", latest.turbidity, thresholds);
  const tempStatus = evaluateParameterStatus("temperature", latest.temperature, thresholds);
  const tdsStatus = evaluateParameterStatus("tds", latest.tds, thresholds);

  const wqiInfo = getWQILabel(latest.wqi);

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedClock = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Normalized 0-100 view for "all" chart so all 4 parameters sit clearly on one scale
  const chartData = useMemo(() => {
    return history.slice(-18).map((pt) => ({
      time: pt.timeLabel,
      ph: pt.ph,
      turbidity: pt.turbidity,
      temperature: pt.temperature,
      tds: pt.tds,
      wqi: pt.wqi,
      phNorm: Number(((pt.ph / 14) * 100).toFixed(1)),
      turbNorm: Number(Math.min(100, (pt.turbidity / 10) * 100).toFixed(1)),
      tempNorm: Number(Math.min(100, (pt.temperature / 45) * 100).toFixed(1)),
      tdsNorm: Number(Math.min(100, (pt.tds / 1000) * 100).toFixed(1)),
    }));
  }, [history]);

  const toleranceMeters = [
    {
      label: "pH Balance",
      valueText: `${latest.ph.toFixed(2)} pH`,
      pct: Math.min(100, Math.max(8, (latest.ph / 14) * 100)),
      status: phStatus,
    },
    {
      label: "Clarity (Turbidity)",
      valueText: `${latest.turbidity.toFixed(2)} NTU`,
      pct: Math.min(100, (latest.turbidity / (thresholds.turbidityMax * 1.6)) * 100),
      status: turbStatus,
    },
    {
      label: "Thermal Stability",
      valueText: `${latest.temperature.toFixed(1)} °C`,
      pct: Math.min(100, (latest.temperature / 45) * 100),
      status: tempStatus,
    },
    {
      label: "Dissolved Solids (TDS)",
      valueText: `${latest.tds} ppm`,
      pct: Math.min(100, (latest.tds / (thresholds.tdsMax * 1.5)) * 100),
      status: tdsStatus,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Welcome Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white via-sky-50/70 to-cyan-50/80 p-6 shadow-sm sm:p-7">
        <WaterWaveBackdrop variant="hero" alertLevel={wqiInfo.status} />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-medium text-sky-800">{activeNode.name}</span>
              <span aria-hidden="true">·</span>
              <span>{activeNode.location}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <Wifi className="h-3.5 w-3.5" />
                {activeNode.mcuModel} {activeNode.status}
              </span>
            </div>

            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
              Welcome to AquaSense AI
            </h1>
            <p className="mt-1.5 text-sm font-medium text-sky-800 sm:text-base">
              Monitor Water Quality. Protect Every Drop.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <div className="rounded-xl border border-sky-100 bg-white/85 px-4 py-2.5 backdrop-blur-md">
              <div className="text-[11px] font-medium text-slate-500">{formattedDate}</div>
              <div className="mt-0.5 flex items-center gap-3 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                <span>{formattedClock}</span>
                <span aria-hidden="true" className="text-slate-300">|</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700">
                  <Cpu className="h-3.5 w-3.5" />
                  {activeNode.id}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {activeAlertCount > 0 && (
                <button
                  type="button"
                  onClick={onNavigateAlerts}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 whitespace-nowrap shrink-0"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {activeAlertCount} Active {activeAlertCount === 1 ? "Alert" : "Alerts"}
                </button>
              )}
              <button
                type="button"
                onClick={onNavigateLive}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
              >
                <Activity className="h-3.5 w-3.5" />
                Live Telemetry
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Four Water Quality Monitoring Cards */}
      <section aria-label="Live Sensor Readings">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SensorCard
            parameterKey="ph"
            title="pH Level"
            value={latest.ph.toFixed(2)}
            unit="pH"
            status={phStatus}
            limitLabel={`Safe: ${thresholds.phMin.toFixed(1)} – ${thresholds.phMax.toFixed(1)}`}
            lastUpdated={latest.timeLabel}
            history={history}
            onInspect={onNavigateLive}
          />
          <SensorCard
            parameterKey="turbidity"
            title="Turbidity"
            value={latest.turbidity.toFixed(2)}
            unit="NTU"
            status={turbStatus}
            limitLabel={`Limit: < ${thresholds.turbidityMax.toFixed(1)} NTU`}
            lastUpdated={latest.timeLabel}
            history={history}
            onInspect={onNavigateLive}
          />
          <SensorCard
            parameterKey="temperature"
            title="Temperature"
            value={latest.temperature.toFixed(1)}
            unit="°C"
            status={tempStatus}
            limitLabel={`Safe: ${thresholds.tempMin} – ${thresholds.tempMax} °C`}
            lastUpdated={latest.timeLabel}
            history={history}
            onInspect={onNavigateLive}
          />
          <SensorCard
            parameterKey="tds"
            title="TDS Level"
            value={String(latest.tds)}
            unit="ppm"
            status={tdsStatus}
            limitLabel={`Limit: < ${thresholds.tdsMax} ppm`}
            lastUpdated={latest.timeLabel}
            history={history}
            onInspect={onNavigateLive}
          />
        </div>
      </section>

      {/* 3. Water Quality Analysis Section */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Water Quality Analysis
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Composite Water Quality Index (WQI) and real-time historical variations
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
            role="tablist"
            aria-label="Chart parameter filter"
          >
            {(
              [
                { id: "all", label: "All Metrics" },
                { id: "ph", label: "pH" },
                { id: "turbidity", label: "Turbidity" },
                { id: "temperature", label: "Temp" },
                { id: "tds", label: "TDS" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={chartParam === tab.id}
                onClick={() => setChartParam(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  chartParam === tab.id
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left: Circular Progress Indicator + Tolerance Breakdown */}
          <div className="flex flex-col items-center lg:col-span-4 lg:border-r lg:border-slate-100 lg:pr-6">
            <CircularWqiGauge score={latest.wqi} />

            <div className="mt-6 w-full space-y-3 border-t border-slate-100 pt-5">
              {toleranceMeters.map((m) => (
                <div key={m.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{m.label}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {m.valueText}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        m.status === "Critical"
                          ? "bg-red-600"
                          : m.status === "Warning"
                            ? "bg-amber-500"
                            : "bg-sky-600"
                      }`}
                      style={{ width: `${Math.max(6, m.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Multi-Parameter Historical Variations Chart */}
          <div className="lg:col-span-8">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                {chartParam === "all"
                  ? "Normalized sensor variations (% of scale) across recent telemetry window"
                  : `Measured ${chartParam} trajectory over recent samples`}
              </span>
              <span className="font-mono tabular-nums text-slate-400">
                Samples: {chartData.length}
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    domain={chartParam === "all" ? [0, 100] : ["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.96)",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />

                  {chartParam === "all" ? (
                    <>
                      <Area
                        type="monotone"
                        dataKey="phNorm"
                        name="pH (scaled)"
                        stroke="#0284c7"
                        strokeWidth={2}
                        fill="url(#gradSky)"
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="turbNorm"
                        name="Turbidity (scaled)"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fill="url(#gradCyan)"
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="tempNorm"
                        name="Temp (scaled)"
                        stroke="#0369a1"
                        strokeWidth={1.75}
                        fill="none"
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="tdsNorm"
                        name="TDS (scaled)"
                        stroke="#0d9488"
                        strokeWidth={1.75}
                        fill="none"
                        isAnimationActive={false}
                      />
                    </>
                  ) : (
                    <Area
                      type="monotone"
                      dataKey={chartParam}
                      name={
                        chartParam === "ph"
                          ? "pH Level"
                          : chartParam === "turbidity"
                            ? "Turbidity (NTU)"
                            : chartParam === "temperature"
                              ? "Temperature (°C)"
                              : "TDS (ppm)"
                      }
                      stroke="#0284c7"
                      strokeWidth={2.2}
                      fill="url(#gradSky)"
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AI Prediction & Diagnostics Section */}
      <section className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-cyan-50/40 p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-sky-100 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                AI Water Quality Prediction & Anomaly Detection
              </h2>
              <p className="text-xs text-slate-500">
                Predictive contamination modeling and automated threshold diagnostics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRunAiPrediction}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm transition-colors hover:bg-sky-50 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${aiLoading ? "animate-spin" : ""}`} />
            {aiLoading ? "Analyzing Stream..." : "Run AI Prediction"}
          </button>
        </div>

        {aiError && (
          <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 sm:flex-row sm:items-center">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold">AI Prediction Service Unavailable</p>
                <p className="mt-0.5 text-red-700">{aiError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRunAiPrediction}
              className="rounded-md bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 whitespace-nowrap shrink-0"
            >
              Retry Analysis
            </button>
          </div>
        )}

        {aiLoading && !aiPrediction && (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-28 animate-pulse rounded-xl bg-slate-200/70" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-200/70" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-200/70" />
          </div>
        )}

        {aiPrediction && (
          <div className="mt-5 space-y-5">
            {/* Key Prediction Summary Statement */}
            <div className="rounded-xl border border-sky-100 bg-white/90 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {aiPrediction.overallStatus === "Critical" ? (
                    <ShieldAlert className="h-4 w-4 text-red-600" />
                  ) : aiPrediction.overallStatus === "Advisory" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>{aiPrediction.overallStatus} Forecast</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Confidence</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {aiPrediction.confidenceScore.toFixed(1)}%
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {new Date(aiPrediction.generatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {aiPrediction.analysisSummary}
              </p>
            </div>

            {/* 3-Column AI Output Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">
                  Predicted Next-Hour WQI
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-sky-700 tabular-nums">
                    {Math.round(aiPrediction.predictedNextHourWqi)}
                  </span>
                  <span className="font-mono text-xs text-slate-400">/ 100</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Contamination Risk:{" "}
                  <span
                    className={`font-semibold ${
                      aiPrediction.contaminationRisk === "High" ||
                      aiPrediction.contaminationRisk === "Elevated"
                        ? "text-red-700"
                        : aiPrediction.contaminationRisk === "Moderate"
                          ? "text-amber-700"
                          : "text-emerald-700"
                    }`}
                  >
                    {aiPrediction.contaminationRisk}
                  </span>
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">
                  Abnormal Parameter Detection
                </div>
                <div className="mt-2">
                  {aiPrediction.abnormalParameters.length === 0 ? (
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>All Parameters Nominal</span>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {aiPrediction.abnormalParameters.map((p) => (
                        <li
                          key={p}
                          className="flex items-center gap-1.5 text-xs font-semibold text-red-700"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {aiPrediction.potentialContaminationWarning}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">
                  AI-Generated Recommendations
                </div>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-700">
                  {aiPrediction.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 font-mono text-[11px] font-semibold text-sky-700">
                        0{i + 1}.
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
