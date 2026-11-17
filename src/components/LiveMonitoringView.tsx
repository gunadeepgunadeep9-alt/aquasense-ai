import React from "react";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  Wifi,
} from "lucide-react";
import {
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
  CalibrationConfig,
  IoTDeviceNode,
  SensorReading,
  SimulationScenario,
  ThresholdConfig,
} from "../types/water";
import { evaluateParameterStatus } from "../utils/waterQuality";

interface LiveMonitoringViewProps {
  activeNode: IoTDeviceNode;
  nodes: IoTDeviceNode[];
  onSelectNode: (id: string) => void;
  latest: SensorReading;
  history: SensorReading[];
  thresholds: ThresholdConfig;
  calibration: CalibrationConfig;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onManualSync: () => void;
  scenario: SimulationScenario;
  onChangeScenario: (s: SimulationScenario) => void;
  lastSyncTime: string;
}

const SCENARIO_OPTIONS: { id: SimulationScenario; label: string; detail: string }[] = [
  { id: "nominal", label: "Normal Operation", detail: "Balanced potable limits" },
  { id: "acidic_runoff", label: "Acidic Runoff (Low pH)", detail: "Simulates pH ~5.65 drop" },
  { id: "sediment_surge", label: "Sediment Surge (Turbidity)", detail: "Simulates >7.5 NTU spike" },
  { id: "tds_spike", label: "Dissolved Solids Spike", detail: "Simulates >680 ppm TDS" },
  { id: "thermal_shift", label: "Thermal Effluent Shift", detail: "Simulates >33 °C rise" },
];

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  activeNode,
  nodes,
  onSelectNode,
  latest,
  history,
  thresholds,
  calibration,
  isStreaming,
  onToggleStreaming,
  onManualSync,
  scenario,
  onChangeScenario,
  lastSyncTime,
}) => {
  const phStatus = evaluateParameterStatus("ph", latest.ph, thresholds);
  const turbStatus = evaluateParameterStatus("turbidity", latest.turbidity, thresholds);
  const tempStatus = evaluateParameterStatus("temperature", latest.temperature, thresholds);
  const tdsStatus = evaluateParameterStatus("tds", latest.tds, thresholds);

  const probes = [
    {
      name: "BNC pH Electrode (SEN0161)",
      channel: "ADC1_CH0",
      reading: `${latest.ph.toFixed(2)} pH`,
      status: phStatus,
      voltage: `${(1.5 + (7 - latest.ph) * 0.18).toFixed(3)} V`,
    },
    {
      name: "Optical Turbidity Sensor (SEN0189)",
      channel: "ADC1_CH3",
      reading: `${latest.turbidity.toFixed(2)} NTU`,
      status: turbStatus,
      voltage: `${Math.max(0.4, 4.12 - latest.turbidity * 0.28).toFixed(3)} V`,
    },
    {
      name: "DS18B20 Waterproof Thermal Probe",
      channel: "1-Wire GPIO4",
      reading: `${latest.temperature.toFixed(1)} °C`,
      status: tempStatus,
      voltage: "3.300 V Digital",
    },
    {
      name: "Gravity Analog TDS Meter v1.0",
      channel: "ADC1_CH6",
      reading: `${latest.tds} ppm`,
      status: tdsStatus,
      voltage: `${Math.min(2.3, latest.tds / 420).toFixed(3)} V`,
    },
  ];

  const streamData = history.slice(-24);

  return (
    <div className="space-y-6">
      {/* Top Live Control Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Live Sensor Monitoring
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                isStreaming ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isStreaming ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              {isStreaming ? "Streaming" : "Paused"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Last synchronization:{" "}
            <span className="font-mono font-medium text-slate-700 tabular-nums">
              {lastSyncTime}
            </span>{" "}
            · Refresh interval:{" "}
            <span className="font-mono font-medium text-slate-700 tabular-nums">
              {calibration.samplingIntervalSec}s
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Select IoT Node"
            value={activeNode.id}
            onChange={(e) => onSelectNode(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-none"
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id} — {n.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onManualSync}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Now
          </button>

          <button
            type="button"
            onClick={onToggleStreaming}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors whitespace-nowrap shrink-0 ${
              isStreaming
                ? "bg-slate-800 hover:bg-slate-900"
                : "bg-sky-600 hover:bg-sky-700"
            }`}
          >
            {isStreaming ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isStreaming ? "Pause Stream" : "Resume Stream"}
          </button>
        </div>
      </div>

      {/* Connected ESP32 Hardware Status & Anomaly Test Bar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-sky-700" />
              <h2 className="text-sm font-bold text-slate-900">Connected IoT Device</h2>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <Wifi className="h-3.5 w-3.5" />
              {activeNode.status}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <dt className="text-slate-500">Controller</dt>
              <dd className="mt-0.5 font-mono font-semibold text-slate-900">
                {activeNode.mcuModel}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Firmware Build</dt>
              <dd className="mt-0.5 font-mono font-semibold text-slate-900">
                {activeNode.firmware}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">MAC Address</dt>
              <dd className="mt-0.5 font-mono text-slate-800">{activeNode.macAddress}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Wi-Fi RSSI</dt>
              <dd className="mt-0.5 font-mono font-semibold text-sky-700 tabular-nums">
                {activeNode.rssi} dBm
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500">Power Source & Location</dt>
              <dd className="mt-0.5 font-medium text-slate-800">
                {activeNode.batteryOrPower} · {activeNode.location}
              </dd>
            </div>
          </dl>
        </div>

        {/* ESP32 Scenario / Fault Simulator for Testing & Viva Demo */}
        <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white to-sky-50/50 p-5 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-sky-100 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4.5 w-4.5 text-sky-700" />
              <h2 className="text-sm font-bold text-slate-900">
                ESP32 Field Condition Simulator
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Test threshold alerts & AI anomaly detection
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {SCENARIO_OPTIONS.map((opt) => {
              const active = scenario === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeScenario(opt.id)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    active
                      ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50/50"
                  }`}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span
                    className={`mt-0.5 text-[11px] ${
                      active ? "text-sky-100" : "text-slate-500"
                    }`}
                  >
                    {opt.detail}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sensor Probe Activity Indicators */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Active Probe Telemetry & ADC Channels
          </h2>
          <span className="font-mono text-xs text-slate-500">4 / 4 Probes Reporting</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {probes.map((probe) => (
            <div
              key={probe.channel}
              className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold text-sky-700">
                  {probe.channel}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    probe.status === "Critical"
                      ? "text-red-700"
                      : probe.status === "Warning"
                        ? "text-amber-700"
                        : "text-emerald-700"
                  }`}
                >
                  {probe.status === "Normal" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldAlert className="h-3.5 w-3.5" />
                  )}
                  {probe.status}
                </span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-800">{probe.name}</div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {probe.reading}
                </span>
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {probe.voltage}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Graphical Representation */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Real-Time pH & Temperature Stream
              </h3>
              <p className="text-xs text-slate-500">Dual-axis live ESP32 waveform</p>
            </div>
            <Activity className="h-4 w-4 text-sky-600" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={streamData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  yAxisId="ph"
                  domain={[4, 10]}
                  tick={{ fontSize: 11, fill: "#0284c7" }}
                />
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  domain={[10, 40]}
                  tick={{ fontSize: 11, fill: "#0d9488" }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  yAxisId="ph"
                  type="monotone"
                  dataKey="ph"
                  name="pH Level"
                  stroke="#0284c7"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  stroke="#0d9488"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Real-Time Turbidity & TDS Stream
              </h3>
              <p className="text-xs text-slate-500">Particulate & dissolved solids tracking</p>
            </div>
            <Activity className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={streamData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  yAxisId="turb"
                  domain={[0, 10]}
                  tick={{ fontSize: 11, fill: "#0891b2" }}
                />
                <YAxis
                  yAxisId="tds"
                  orientation="right"
                  domain={[100, 800]}
                  tick={{ fontSize: 11, fill: "#0369a1" }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  yAxisId="turb"
                  type="monotone"
                  dataKey="turbidity"
                  name="Turbidity (NTU)"
                  stroke="#06b6d4"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="tds"
                  type="monotone"
                  dataKey="tds"
                  name="TDS (ppm)"
                  stroke="#0369a1"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ESP32 HTTP Ingestion Payload Reference */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-sky-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Live ESP32 JSON Telemetry Packet
            </h3>
          </div>
          <span className="font-mono text-xs text-slate-500">
            POST /api/esp32/ingest
          </span>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-cyan-100">
          {JSON.stringify(
            {
              deviceId: activeNode.id,
              location: activeNode.location,
              ph: latest.ph,
              turbidity: latest.turbidity,
              temperature: latest.temperature,
              tds: latest.tds,
              wqi: latest.wqi,
              timestamp: latest.timestamp,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
};
