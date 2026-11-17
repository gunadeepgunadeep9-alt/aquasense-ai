import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { AlertItem, AlertSeverity } from "../types/water";

interface AlertsViewProps {
  alerts: AlertItem[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onClearResolved: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onAcknowledge,
  onResolve,
  onClearResolved,
}) => {
  const [severityFilter, setSeverityFilter] = useState<"All" | AlertSeverity>("All");
  const [paramFilter, setParamFilter] = useState<string>("All");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const active = alerts.filter((a) => !a.resolved);
    return {
      high: active.filter((a) => a.severity === "High").length,
      medium: active.filter((a) => a.severity === "Medium").length,
      low: active.filter((a) => a.severity === "Low").length,
      resolved: alerts.filter((a) => a.resolved).length,
    };
  }, [alerts]);

  const filtered = useMemo(() => {
    return alerts.filter((item) => {
      if (severityFilter !== "All" && item.severity !== severityFilter) return false;
      if (paramFilter !== "All" && item.parameter !== paramFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const match =
          item.message.toLowerCase().includes(q) ||
          item.parameter.toLowerCase().includes(q) ||
          item.nodeName.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [alerts, severityFilter, paramFilter, query]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Alerts & Notification History
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Automated threshold breach monitoring across pH, Turbidity, TDS, and Temperature probes
          </p>
        </div>

        <button
          type="button"
          onClick={onClearResolved}
          disabled={counts.resolved === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear Resolved ({counts.resolved})
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-red-200/90 bg-red-50/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-red-700">
            <span>Critical (High)</span>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-red-800 tabular-nums">
            {counts.high}
          </div>
          <div className="mt-0.5 text-[11px] text-red-700/80">Immediate action required</div>
        </div>

        <div className="rounded-xl border border-amber-200/90 bg-amber-50/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
            <span>Warning (Medium)</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-amber-800 tabular-nums">
            {counts.medium}
          </div>
          <div className="mt-0.5 text-[11px] text-amber-700/80">Parameter drift detected</div>
        </div>

        <div className="rounded-xl border border-sky-200/90 bg-sky-50/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-800">
            <span>Advisory (Low)</span>
            <Bell className="h-4 w-4" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-sky-900 tabular-nums">
            {counts.low}
          </div>
          <div className="mt-0.5 text-[11px] text-sky-800/80">Minor threshold proximity</div>
        </div>

        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Normal / Resolved</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-800 tabular-nums">
            {counts.resolved}
          </div>
          <div className="mt-0.5 text-[11px] text-emerald-700/80">Logged historical events</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(["All", "High", "Medium", "Low"] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  severityFilter === sev
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {sev === "All" ? "All Severities" : sev}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by parameter"
            value={paramFilter}
            onChange={(e) => setParamFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none"
          >
            <option value="All">All Parameters</option>
            <option value="pH Level">pH Level</option>
            <option value="Turbidity">Turbidity</option>
            <option value="TDS Level">TDS Level</option>
            <option value="Temperature">Temperature</option>
          </select>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search alerts, nodes, or IDs..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Alert Notification List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              No matching alerts
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              All monitored water quality parameters match your selected filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((alert) => {
              const isResolved = alert.resolved;
              const style = isResolved
                ? {
                    container: "bg-white",
                    text: "text-emerald-700",
                    icon: CheckCircle2,
                    label: "Normal / Resolved",
                  }
                : alert.severity === "High"
                  ? {
                      container: "bg-red-50/35",
                      text: "text-red-700",
                      icon: ShieldAlert,
                      label: "High · Critical",
                    }
                  : alert.severity === "Medium"
                    ? {
                        container: "bg-amber-50/35",
                        text: "text-amber-700",
                        icon: AlertTriangle,
                        label: "Medium · Warning",
                      }
                    : {
                        container: "bg-amber-50/20",
                        text: "text-amber-700",
                        icon: AlertTriangle,
                        label: "Low · Advisory",
                      };

              const StatusIcon = style.icon;

              return (
                <div
                  key={alert.id}
                  className={`flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:px-6 ${style.container}`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1 font-semibold ${style.text}`}>
                        <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                        {style.label}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-900">{alert.parameter}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">
                        {alert.valueLabel}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        ({alert.thresholdLabel})
                      </span>
                    </div>

                    <p className="text-sm text-slate-700">{alert.message}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono">{alert.id}</span>
                      <span aria-hidden="true">·</span>
                      <span>{alert.nodeName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{alert.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!alert.resolved && !alert.acknowledged && (
                      <button
                        type="button"
                        onClick={() => onAcknowledge(alert.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                      >
                        Acknowledge
                      </button>
                    )}
                    {!alert.resolved ? (
                      <button
                        type="button"
                        onClick={() => onResolve(alert.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark Resolved
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-emerald-700">Resolved</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
