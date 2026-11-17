import React, { useState } from "react";
import {
  BellRing,
  Check,
  Cpu,
  Plus,
  RotateCcw,
  Save,
  Sliders,
  User,
} from "lucide-react";
import {
  CalibrationConfig,
  IoTDeviceNode,
  NotificationPrefs,
  ThresholdConfig,
  UserProfile,
} from "../types/water";
import { DEFAULT_THRESHOLDS } from "../utils/waterQuality";

interface SettingsViewProps {
  thresholds: ThresholdConfig;
  onUpdateThresholds: (t: ThresholdConfig) => void;
  calibration: CalibrationConfig;
  onUpdateCalibration: (c: CalibrationConfig) => void;
  nodes: IoTDeviceNode[];
  onToggleNodeStatus: (id: string) => void;
  onAddNode: (node: IoTDeviceNode) => void;
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  notifPrefs: NotificationPrefs;
  onUpdateNotifPrefs: (n: NotificationPrefs) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  thresholds,
  onUpdateThresholds,
  calibration,
  onUpdateCalibration,
  nodes,
  onToggleNodeStatus,
  onAddNode,
  profile,
  onUpdateProfile,
  notifPrefs,
  onUpdateNotifPrefs,
}) => {
  const [localThresh, setLocalThresh] = useState<ThresholdConfig>(thresholds);
  const [localCalib, setLocalCalib] = useState<CalibrationConfig>(calibration);
  const [localProfile, setLocalProfile] = useState<UserProfile>(profile);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [showAddNode, setShowAddNode] = useState(false);
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeLoc, setNewNodeLoc] = useState("");
  const [newNodeMac, setNewNodeMac] = useState("");

  const showSaved = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3200);
  };

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateThresholds(localThresh);
    showSaved("Alert threshold settings updated.");
  };

  const handleResetThresholds = () => {
    setLocalThresh(DEFAULT_THRESHOLDS);
    onUpdateThresholds(DEFAULT_THRESHOLDS);
    showSaved("Thresholds reset to WHO / EPA baseline.");
  };

  const handleSaveCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCalibration(localCalib);
    showSaved("Sensor calibration & sampling rate saved.");
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(localProfile);
    showSaved("User profile updated.");
  };

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;
    const nextIdx = nodes.length + 1;
    onAddNode({
      id: `AS-NODE-0${nextIdx}`,
      name: newNodeName.trim(),
      location: newNodeLoc.trim() || "Sector D · Auxiliary Line",
      mcuModel: "ESP32-WROOM-32D",
      macAddress: newNodeMac.trim() || `C4:4F:33:1A:8${nextIdx}:B2`,
      firmware: "v2.4.1",
      rssi: -58,
      batteryOrPower: "24V DC Industrial Rail",
      status: "Connected",
      lastSync: "Just now",
    });
    setNewNodeName("");
    setNewNodeLoc("");
    setNewNodeMac("");
    setShowAddNode(false);
    showSaved("New ESP32 sensor node registered.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            System Settings & Hardware Configuration
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Configure ESP32 sensor calibration, alert thresholds, IoT nodes, and notification channels
          </p>
        </div>

        {savedNotice && (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 1. Alert Threshold Settings */}
        <form
          onSubmit={handleSaveThresholds}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-sky-700" />
              <h2 className="text-sm font-bold text-slate-900">Alert Threshold Settings</h2>
            </div>
            <button
              type="button"
              onClick={handleResetThresholds}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-sky-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Minimum pH Level
              </label>
              <input
                type="number"
                step="0.1"
                value={localThresh.phMin}
                onChange={(e) =>
                  setLocalThresh({ ...localThresh, phMin: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Maximum pH Level
              </label>
              <input
                type="number"
                step="0.1"
                value={localThresh.phMax}
                onChange={(e) =>
                  setLocalThresh({ ...localThresh, phMax: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Max Turbidity (NTU)
              </label>
              <input
                type="number"
                step="0.5"
                value={localThresh.turbidityMax}
                onChange={(e) =>
                  setLocalThresh({
                    ...localThresh,
                    turbidityMax: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Max TDS Level (ppm)
              </label>
              <input
                type="number"
                step="10"
                value={localThresh.tdsMax}
                onChange={(e) =>
                  setLocalThresh({ ...localThresh, tdsMax: parseInt(e.target.value, 10) || 0 })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Min Temperature (°C)
              </label>
              <input
                type="number"
                step="1"
                value={localThresh.tempMin}
                onChange={(e) =>
                  setLocalThresh({ ...localThresh, tempMin: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Max Temperature (°C)
              </label>
              <input
                type="number"
                step="1"
                value={localThresh.tempMax}
                onChange={(e) =>
                  setLocalThresh({ ...localThresh, tempMax: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Save className="h-3.5 w-3.5" />
              Save Thresholds
            </button>
          </div>
        </form>

        {/* 2. Sensor Calibration Configuration */}
        <form
          onSubmit={handleSaveCalibration}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Cpu className="h-4.5 w-4.5 text-sky-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Sensor Configuration & Probe Calibration
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                pH Calibration Offset
              </label>
              <input
                type="number"
                step="0.01"
                value={localCalib.phOffset}
                onChange={(e) =>
                  setLocalCalib({ ...localCalib, phOffset: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Turbidity Baseline Offset (NTU)
              </label>
              <input
                type="number"
                step="0.05"
                value={localCalib.turbidityOffset}
                onChange={(e) =>
                  setLocalCalib({
                    ...localCalib,
                    turbidityOffset: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                TDS K-Value Multiplier
              </label>
              <input
                type="number"
                step="0.05"
                value={localCalib.tdsFactor}
                onChange={(e) =>
                  setLocalCalib({ ...localCalib, tdsFactor: parseFloat(e.target.value) || 1 })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                ESP32 Sampling Interval
              </label>
              <select
                value={localCalib.samplingIntervalSec}
                onChange={(e) =>
                  setLocalCalib({
                    ...localCalib,
                    samplingIntervalSec: Number(e.target.value) as 1 | 2 | 5 | 10,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              >
                <option value={1}>Every 1 second</option>
                <option value={2}>Every 2 seconds</option>
                <option value={5}>Every 5 seconds</option>
                <option value={10}>Every 10 seconds</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Save className="h-3.5 w-3.5" />
              Apply Calibration
            </button>
          </div>
        </form>
      </div>

      {/* 3. IoT Device Management */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              IoT Device Management (ESP32 Nodes)
            </h2>
            <p className="text-xs text-slate-500">
              Manage field microcontroller telemetry nodes and connection states
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddNode((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add ESP32 Node
          </button>
        </div>

        {showAddNode && (
          <form
            onSubmit={handleCreateNode}
            className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-sky-100 bg-sky-50/40 p-4 sm:grid-cols-4"
          >
            <input
              type="text"
              required
              placeholder="Node Name (e.g. Reverse Osmosis Line)"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Location (e.g. Sector D)"
              value={newNodeLoc}
              onChange={(e) => setNewNodeLoc(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="MAC Address (optional)"
              value={newNodeMac}
              onChange={(e) => setNewNodeMac(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              Register Node
            </button>
          </form>
        )}

        <div className="mt-4 divide-y divide-slate-100">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-sky-700">{node.id}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-semibold text-slate-900">{node.name}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-500">{node.location}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-500">
                  <span>{node.mcuModel}</span>
                  <span aria-hidden="true">·</span>
                  <span>MAC {node.macAddress}</span>
                  <span aria-hidden="true">·</span>
                  <span>FW {node.firmware}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-semibold ${
                    node.status === "Connected" ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {node.status}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleNodeStatus(node.id)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {node.status === "Connected" ? "Set Standby" : "Connect"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. User Profile & Notification Preferences */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="h-4.5 w-4.5 text-sky-700" />
            <h2 className="text-sm font-bold text-slate-900">User Profile Settings</h2>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <img
              src={localProfile.avatarUrl}
              alt={localProfile.name}
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-full border border-slate-200 object-cover"
            />
            <div>
              <div className="text-sm font-bold text-slate-900">{localProfile.name}</div>
              <div className="text-xs text-slate-500">
                {localProfile.role} · {localProfile.facility}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Full Name</label>
              <input
                type="text"
                value={localProfile.name}
                onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Role</label>
              <input
                type="text"
                value={localProfile.role}
                onChange={(e) => setLocalProfile({ ...localProfile, role: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                value={localProfile.email}
                onChange={(e) => setLocalProfile({ ...localProfile, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Facility</label>
              <input
                type="text"
                value={localProfile.facility}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, facility: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Save className="h-3.5 w-3.5" />
              Save Profile
            </button>
          </div>
        </form>

        {/* 5. Notification Preferences */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BellRing className="h-4.5 w-4.5 text-sky-700" />
            <h2 className="text-sm font-bold text-slate-900">Notification Preferences</h2>
          </div>

          <div className="mt-4 space-y-3.5">
            {(
              [
                {
                  key: "emailAlerts",
                  title: "Email Threshold Alerts",
                  desc: "Send instant email notifications when parameters cross safety limits.",
                },
                {
                  key: "pushNotifications",
                  title: "Browser Push Alerts",
                  desc: "Display real-time dashboard alert banners during active monitoring.",
                },
                {
                  key: "smsEscalation",
                  title: "SMS Critical Escalation",
                  desc: "Trigger SMS dispatch for High-severity turbidity or pH excursions.",
                },
                {
                  key: "criticalOnly",
                  title: "Critical Severity Filter",
                  desc: "Suppress low-priority advisory alerts outside operational hours.",
                },
                {
                  key: "dailyPdfDigest",
                  title: "Daily PDF Compliance Digest",
                  desc: "Compile 24-hour water quality index summary at 00:00 UTC.",
                },
              ] as const
            ).map((pref) => {
              const checked = notifPrefs[pref.key];
              return (
                <div
                  key={pref.key}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{pref.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{pref.desc}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={pref.title}
                    onClick={() => {
                      onUpdateNotifPrefs({ ...notifPrefs, [pref.key]: !checked });
                      showSaved("Notification preference updated.");
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                      checked ? "bg-sky-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                        checked ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
