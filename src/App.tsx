import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Cpu,
  Droplets,
  LayoutDashboard,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { AlertsView } from "./components/AlertsView";
import { AnalyticsView } from "./components/AnalyticsView";
import { DashboardView } from "./components/DashboardView";
import { LiveMonitoringView } from "./components/LiveMonitoringView";
import { SettingsView } from "./components/SettingsView";
import {
  AIPredictionResult,
  AlertItem,
  CalibrationConfig,
  IoTDeviceNode,
  NavTab,
  NotificationPrefs,
  SensorReading,
  SimulationScenario,
  ThresholdConfig,
  UserProfile,
} from "./types/water";
import {
  DEFAULT_THRESHOLDS,
  INITIAL_ALERTS,
  INITIAL_NODES,
  evaluateParameterStatus,
  formatTimeShort,
  generateInitialStream,
  generateNextReading,
} from "./utils/waterQuality";

const STORAGE_KEYS = {
  thresholds: "aquasense_thresholds_v1",
  calibration: "aquasense_calibration_v1",
  profile: "aquasense_profile_v1",
  notif: "aquasense_notif_v1",
};

const DEFAULT_PROFILE: UserProfile = {
  name: "Dr. Elena Vance",
  role: "Lead Water Quality Engineer",
  department: "Environmental Telemetry & AI",
  email: "elena.vance@aquasense.io",
  facility: "Metro Treatment Plant · Unit 4",
  avatarUrl: "/src/assets/images/avatar_water_engineer_1794910654891.jpg",
};

const DEFAULT_CALIBRATION: CalibrationConfig = {
  phOffset: 0.0,
  turbidityOffset: 0.0,
  tempOffset: 0.0,
  tdsFactor: 1.0,
  samplingIntervalSec: 2,
};

const DEFAULT_NOTIF: NotificationPrefs = {
  emailAlerts: true,
  pushNotifications: true,
  smsEscalation: false,
  criticalOnly: false,
  dailyPdfDigest: true,
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [now, setNow] = useState<Date>(() => new Date());
  const [history, setHistory] = useState<SensorReading[]>(() => generateInitialStream(24));
  const [isStreaming, setIsStreaming] = useState(true);
  const [scenario, setScenario] = useState<SimulationScenario>("nominal");
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => formatTimeShort(new Date()));

  const [nodes, setNodes] = useState<IoTDeviceNode[]>(INITIAL_NODES);
  const [activeNodeId, setActiveNodeId] = useState<string>(INITIAL_NODES[0].id);

  const [thresholds, setThresholds] = useState<ThresholdConfig>(() =>
    loadStored(STORAGE_KEYS.thresholds, DEFAULT_THRESHOLDS)
  );
  const [calibration, setCalibration] = useState<CalibrationConfig>(() =>
    loadStored(STORAGE_KEYS.calibration, DEFAULT_CALIBRATION)
  );
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadStored(STORAGE_KEYS.profile, DEFAULT_PROFILE)
  );
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() =>
    loadStored(STORAGE_KEYS.notif, DEFAULT_NOTIF)
  );

  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);

  const [aiPrediction, setAiPrediction] = useState<AIPredictionResult | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const lastAlertCooldownRef = useRef<Record<string, number>>({});

  const activeNode = useMemo(
    () => nodes.find((n) => n.id === activeNodeId) ?? nodes[0],
    [nodes, activeNodeId]
  );

  const latest = history[history.length - 1];

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Persist user settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.thresholds, JSON.stringify(thresholds));
  }, [thresholds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.calibration, JSON.stringify(calibration));
  }, [calibration]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notif, JSON.stringify(notifPrefs));
  }, [notifPrefs]);

  // Threshold alert generator when new sample arrives
  const checkAndLogAlerts = useCallback(
    (sample: SensorReading, node: IoTDeviceNode) => {
      const nowMs = Date.now();
      const cooldownMs = 20000;

      const checks: Array<{
        key: "ph" | "turbidity" | "temperature" | "tds";
        label: AlertItem["parameter"];
        valueLabel: string;
        thresholdLabel: string;
        message: string;
      }> = [
        {
          key: "ph",
          label: "pH Level",
          valueLabel: `${sample.ph.toFixed(2)} pH`,
          thresholdLabel: `${thresholds.phMin} – ${thresholds.phMax} pH`,
          message:
            sample.ph < thresholds.phMin
              ? "Acidity excursion below lower pH threshold."
              : "Alkalinity excursion above upper pH threshold.",
        },
        {
          key: "turbidity",
          label: "Turbidity",
          valueLabel: `${sample.turbidity.toFixed(2)} NTU`,
          thresholdLabel: `Max ${thresholds.turbidityMax.toFixed(1)} NTU`,
          message: "Suspended solids turbidity exceeded configured clarity limit.",
        },
        {
          key: "temperature",
          label: "Temperature",
          valueLabel: `${sample.temperature.toFixed(1)} °C`,
          thresholdLabel: `${thresholds.tempMin} – ${thresholds.tempMax} °C`,
          message: "Water thermal reading moved outside safe operating band.",
        },
        {
          key: "tds",
          label: "TDS Level",
          valueLabel: `${sample.tds} ppm`,
          thresholdLabel: `Max ${thresholds.tdsMax} ppm`,
          message: "Total dissolved solids concentration exceeded upper limit.",
        },
      ];

      const newItems: AlertItem[] = [];

      checks.forEach((chk) => {
        const status = evaluateParameterStatus(chk.key, sample[chk.key], thresholds);
        if (status === "Normal") return;

        const cooldownKey = `${node.id}:${chk.key}:${status}`;
        const prevTime = lastAlertCooldownRef.current[cooldownKey] ?? 0;
        if (nowMs - prevTime < cooldownMs) return;

        lastAlertCooldownRef.current[cooldownKey] = nowMs;
        const severity = status === "Critical" ? "High" : "Medium";
        if (notifPrefs.criticalOnly && severity !== "High") return;

        newItems.push({
          id: `ALT-${Math.floor(2100 + Math.random() * 7800)}`,
          parameter: chk.label,
          parameterKey: chk.key,
          valueLabel: chk.valueLabel,
          thresholdLabel: chk.thresholdLabel,
          message: chk.message,
          severity,
          timestamp: `Today · ${sample.timeLabel}`,
          nodeName: node.name,
          acknowledged: false,
          resolved: false,
        });
      });

      if (newItems.length > 0) {
        setAlerts((prev) => [...newItems, ...prev].slice(0, 60));
      }
    },
    [thresholds, notifPrefs.criticalOnly]
  );

  const pushNextSample = useCallback(() => {
    const nodeIdx = Math.max(
      0,
      nodes.findIndex((n) => n.id === activeNodeId)
    );
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      const raw = generateNextReading(last, scenario, nodeIdx * 0.4);
      const calibrated: SensorReading = {
        ...raw,
        ph: Number((raw.ph + calibration.phOffset).toFixed(2)),
        turbidity: Number(Math.max(0.1, raw.turbidity + calibration.turbidityOffset).toFixed(2)),
        temperature: Number((raw.temperature + calibration.tempOffset).toFixed(1)),
        tds: Math.round(raw.tds * calibration.tdsFactor),
      };
      checkAndLogAlerts(calibrated, activeNode);
      setLastSyncTime(calibrated.timeLabel);
      return [...prev.slice(-39), calibrated];
    });
  }, [activeNodeId, activeNode, calibration, checkAndLogAlerts, nodes, scenario]);

  // Live ESP32 stream interval
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(pushNextSample, calibration.samplingIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [isStreaming, calibration.samplingIntervalSec, pushNextSample]);

  // Server-side Gemini AI prediction caller
  const runAiPrediction = useCallback(
    async (overrideReading?: SensorReading) => {
      const targetReading = overrideReading ?? history[history.length - 1];
      setAiLoading(true);
      setAiError(null);
      try {
        const res = await fetch("/api/ai-predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reading: targetReading,
            thresholds,
            wqiScore: targetReading.wqi,
            nodeName: `${activeNode.id} (${activeNode.name})`,
            recentHistory: history.slice(-6).map((h) => ({
              time: h.timeLabel,
              ph: h.ph,
              turbidity: h.turbidity,
              temperature: h.temperature,
              tds: h.tds,
              wqi: h.wqi,
            })),
            contextMode: scenario,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `Request failed with status ${res.status}`);
        }
        setAiPrediction(data as AIPredictionResult);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Unable to reach AI prediction service.";
        setAiError(msg);
      } finally {
        setAiLoading(false);
      }
    },
    [activeNode.id, activeNode.name, history, scenario, thresholds]
  );

  // Initial AI analysis on mount
  const initialAiTriggered = useRef(false);
  useEffect(() => {
    if (!initialAiTriggered.current) {
      initialAiTriggered.current = true;
      runAiPrediction();
    }
  }, [runAiPrediction]);

  // Trigger AI re-evaluation when user switches simulation scenario
  const handleScenarioChange = (next: SimulationScenario) => {
    setScenario(next);
    const nodeIdx = Math.max(
      0,
      nodes.findIndex((n) => n.id === activeNodeId)
    );
    const immediateSample = generateNextReading(latest, next, nodeIdx * 0.4);
    setHistory((prev) => [...prev.slice(-39), immediateSample]);
    setLastSyncTime(immediateSample.timeLabel);
    checkAndLogAlerts(immediateSample, activeNode);
    runAiPrediction(immediateSample);
  };

  const activeAlertCount = useMemo(
    () => alerts.filter((a) => !a.resolved).length,
    [alerts]
  );

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "live", label: "Live Monitoring", icon: Activity },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleSelectNav = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navigation Bar (Strict 3-zone layout) */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Brand Logo & Name */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectNav("dashboard")}
              className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus:outline-none"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-cyan-500 text-white shadow-sm">
                <Droplets className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                AquaSense AI
              </span>
            </button>
          </div>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? "text-sky-700"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                  {item.id === "alerts" && activeAlertCount > 0 && (
                    <span className="ml-1.5 font-mono text-xs font-semibold text-red-600 tabular-nums">
                      ({activeAlertCount})
                    </span>
                  )}
                  {active && (
                    <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-sky-600" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: User Profile */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-lg py-1.5 pr-2 pl-1.5 text-left transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border border-slate-200 object-cover"
              />
              <span className="hidden text-xs font-semibold text-slate-800 sm:inline">
                {profile.name}
              </span>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <div className="border-b border-slate-100 pb-2.5">
                  <div className="text-xs font-bold text-slate-900">{profile.name}</div>
                  <div className="text-[11px] text-slate-500">{profile.role}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                    {profile.email}
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setActiveTab("settings");
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Account & Sensor Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setActiveTab("alerts");
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Alert Notification Log ({activeAlertCount} active)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Container with Sidebar */}
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 sm:px-6">
        {/* Desktop Sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-22 space-y-6">
            {/* Sidebar Navigation */}
            <nav
              aria-label="Sidebar navigation"
              className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm"
            >
              <div className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-slate-400">
                Monitoring Console
              </div>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectNav(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? "bg-sky-50 text-sky-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {item.id === "alerts" && activeAlertCount > 0 && (
                        <span className="font-mono text-[11px] font-bold text-red-600 tabular-nums">
                          {activeAlertCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* ESP32 Node Selector */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Cpu className="h-4 w-4 text-sky-700" />
                <span>ESP32 Sensor Nodes</span>
              </div>
              <div className="mt-3 space-y-1.5">
                {nodes.map((node) => {
                  const selected = node.id === activeNode.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setActiveNodeId(node.id)}
                      className={`w-full rounded-xl border p-2.5 text-left transition-colors ${
                        selected
                          ? "border-sky-300 bg-sky-50/70"
                          : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-sky-800">{node.id}</span>
                        <span
                          className={`text-[11px] font-medium ${
                            node.status === "Connected" ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {node.status}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-600">
                        {node.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Presentation Scenario Trigger */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-900">Test Water Conditions</div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Simulate field events to test AI & alerts
              </p>
              <div className="mt-3 space-y-1.5">
                {(
                  [
                    { id: "nominal", label: "Normal Water Flow" },
                    { id: "acidic_runoff", label: "Low pH Acidic Event" },
                    { id: "sediment_surge", label: "High Turbidity Surge" },
                    { id: "tds_spike", label: "High TDS Spike" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleScenarioChange(item.id)}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                      scenario === item.id
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 flex w-72 flex-col gap-5 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-display text-base font-bold text-slate-900">
                  AquaSense AI
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectNav(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium ${
                        active ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </span>
                      {item.id === "alerts" && activeAlertCount > 0 && (
                        <span className="font-mono text-xs font-bold text-red-600">
                          {activeAlertCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="min-w-0 flex-1">
          {activeTab === "dashboard" && (
            <DashboardView
              now={now}
              activeNode={activeNode}
              latest={latest}
              history={history}
              thresholds={thresholds}
              aiPrediction={aiPrediction}
              aiLoading={aiLoading}
              aiError={aiError}
              onRunAiPrediction={() => runAiPrediction()}
              onNavigateLive={() => setActiveTab("live")}
              onNavigateAlerts={() => setActiveTab("alerts")}
              activeAlertCount={activeAlertCount}
            />
          )}

          {activeTab === "live" && (
            <LiveMonitoringView
              activeNode={activeNode}
              nodes={nodes}
              onSelectNode={setActiveNodeId}
              latest={latest}
              history={history}
              thresholds={thresholds}
              calibration={calibration}
              isStreaming={isStreaming}
              onToggleStreaming={() => setIsStreaming((v) => !v)}
              onManualSync={pushNextSample}
              scenario={scenario}
              onChangeScenario={handleScenarioChange}
              lastSyncTime={lastSyncTime}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView
              activeNode={activeNode}
              latest={latest}
              thresholds={thresholds}
              aiPrediction={aiPrediction}
              onRunAiPrediction={() => runAiPrediction()}
              aiLoading={aiLoading}
            />
          )}

          {activeTab === "alerts" && (
            <AlertsView
              alerts={alerts}
              onAcknowledge={(id) =>
                setAlerts((prev) =>
                  prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
                )
              }
              onResolve={(id) =>
                setAlerts((prev) =>
                  prev.map((a) =>
                    a.id === id ? { ...a, acknowledged: true, resolved: true } : a
                  )
                )
              }
              onClearResolved={() =>
                setAlerts((prev) => prev.filter((a) => !a.resolved))
              }
            />
          )}

          {activeTab === "settings" && (
            <SettingsView
              thresholds={thresholds}
              onUpdateThresholds={setThresholds}
              calibration={calibration}
              onUpdateCalibration={setCalibration}
              nodes={nodes}
              onToggleNodeStatus={(id) =>
                setNodes((prev) =>
                  prev.map((n) =>
                    n.id === id
                      ? {
                          ...n,
                          status: n.status === "Connected" ? "Standby" : "Connected",
                        }
                      : n
                  )
                )
              }
              onAddNode={(node) => setNodes((prev) => [...prev, node])}
              profile={profile}
              onUpdateProfile={setProfile}
              notifPrefs={notifPrefs}
              onUpdateNotifPrefs={setNotifPrefs}
            />
          )}
        </main>
      </div>
    </div>
  );
}
