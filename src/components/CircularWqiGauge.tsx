import React from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { getWQILabel } from "../utils/waterQuality";

interface CircularWqiGaugeProps {
  score: number;
  size?: number;
}

export const CircularWqiGauge: React.FC<CircularWqiGaugeProps> = ({
  score,
  size = 196,
}) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  const info = getWQILabel(clamped);

  const strokeColor =
    info.status === "Critical"
      ? "#dc2626"
      : info.status === "Warning"
        ? "#d97706"
        : "url(#wqiOceanGrad)";

  const waterFillColor =
    info.status === "Critical"
      ? "rgba(220, 38, 38, 0.12)"
      : info.status === "Warning"
        ? "rgba(217, 119, 6, 0.12)"
        : "rgba(6, 182, 212, 0.14)";

  const statusTextColor =
    info.status === "Critical"
      ? "text-red-700"
      : info.status === "Warning"
        ? "text-amber-700"
        : "text-emerald-700";

  const StatusIcon =
    info.status === "Critical"
      ? ShieldAlert
      : info.status === "Warning"
        ? AlertTriangle
        : ShieldCheck;

  // Water level inside the inner circle (0-100%)
  const waterY = 100 - clamped * 0.72;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Inner water-wave circle */}
        <div
          className="absolute inset-4 overflow-hidden rounded-full border border-sky-100 bg-sky-50/40"
          aria-hidden="true"
        >
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <g
              className="transition-transform duration-700 ease-out"
              style={{ transform: `translateY(${waterY - 25}px)` }}
            >
              <path
                d="M -50 20 Q -25 12 0 20 T 50 20 T 100 20 T 150 20 L 150 130 L -50 130 Z"
                fill={waterFillColor}
                className="animate-wave-slow"
              />
            </g>
          </svg>
        </div>

        {/* Circular progress SVG */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`Water Quality Index ${clamped} out of 100`}
        >
          <defs>
            <linearGradient id="wqiOceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium tracking-wide text-slate-500">
            WQI Score
          </span>
          <span className="font-mono text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
            {clamped}
          </span>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            / 100
          </span>
        </div>
      </div>

      <div className={`mt-4 flex items-center gap-1.5 text-sm font-semibold ${statusTextColor}`}>
        <StatusIcon className="h-4 w-4 shrink-0" />
        <span>{info.label} Quality</span>
      </div>
      <p className="mt-1 max-w-[240px] text-center text-xs leading-relaxed text-slate-500">
        {info.description}
      </p>
    </div>
  );
};
