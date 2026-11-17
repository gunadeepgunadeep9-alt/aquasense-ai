import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Gauge,
  ShieldAlert,
  Thermometer,
  Waves,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { HealthStatus, ParameterKey, SensorReading } from "../types/water";

interface SensorCardProps {
  parameterKey: ParameterKey;
  title: string;
  value: string;
  unit: string;
  status: HealthStatus;
  limitLabel: string;
  lastUpdated: string;
  history: SensorReading[];
  onInspect?: () => void;
}

const ICON_MAP: Record<ParameterKey, React.ComponentType<{ className?: string }>> = {
  ph: FlaskConical,
  turbidity: Waves,
  temperature: Thermometer,
  tds: Gauge,
};

const CHART_COLOR_MAP: Record<ParameterKey, { stroke: string; fill: string }> = {
  ph: { stroke: "#0284c7", fill: "#bae6fd" },
  turbidity: { stroke: "#0891b2", fill: "#a5f3fc" },
  temperature: { stroke: "#0369a1", fill: "#7dd3fc" },
  tds: { stroke: "#0d9488", fill: "#99f6e4" },
};

export const SensorCard: React.FC<SensorCardProps> = ({
  parameterKey,
  title,
  value,
  unit,
  status,
  limitLabel,
  lastUpdated,
  history,
  onInspect,
}) => {
  const ParamIcon = ICON_MAP[parameterKey];
  const palette = CHART_COLOR_MAP[parameterKey];

  const statusMeta =
    status === "Critical"
      ? {
          textClass: "text-red-700",
          icon: ShieldAlert,
          stroke: "#dc2626",
          fill: "#fecaca",
        }
      : status === "Warning"
        ? {
            textClass: "text-amber-700",
            icon: AlertTriangle,
            stroke: "#d97706",
            fill: "#fde68a",
          }
        : {
            textClass: "text-emerald-700",
            icon: CheckCircle2,
            stroke: palette.stroke,
            fill: palette.fill,
          };

  const StatusIcon = statusMeta.icon;
  const sparkData = history.slice(-14).map((pt) => ({
    t: pt.timeLabel,
    v: pt[parameterKey],
  }));

  const gradId = `spark-${parameterKey}`;

  return (
    <div
      onClick={onInspect}
      role={onInspect ? "button" : undefined}
      tabIndex={onInspect ? 0 : undefined}
      onKeyDown={
        onInspect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onInspect();
              }
            }
          : undefined
      }
      className={`group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-sm transition-all duration-150 ${
        onInspect
          ? "cursor-pointer hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          : ""
      }`}
    >
      {/* Top Row: Parameter Title & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
            <ParamIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="font-mono text-[11px] text-slate-500">{limitLabel}</p>
          </div>
        </div>

        <div className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 ${statusMeta.textClass}`}>
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{status}</span>
        </div>
      </div>

      {/* Middle Row: Numeric Readout + Unit */}
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline">
          <span className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {value}
          </span>
          <span className="ml-1.5 font-mono text-xs font-medium text-slate-500">
            {unit}
          </span>
        </div>
      </div>

      {/* Sparkline Chart */}
      <div className="mt-3 h-14 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={statusMeta.stroke} stopOpacity={0.28} />
                <stop offset="100%" stopColor={statusMeta.stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <YAxis domain={["auto", "auto"]} hide />
            <Area
              type="monotone"
              dataKey="v"
              stroke={statusMeta.stroke}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer: Last Updated */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
        <span>Last updated</span>
        <span className="font-mono tabular-nums text-slate-600">{lastUpdated}</span>
      </div>
    </div>
  );
};
