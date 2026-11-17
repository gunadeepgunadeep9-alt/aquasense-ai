import { jsPDF } from "jspdf";
import {
  AIPredictionResult,
  AlertItem,
  HealthStatus,
  IoTDeviceNode,
  ParameterKey,
  ReportPeriod,
  SensorReading,
  SimulationScenario,
  ThresholdConfig,
} from "../types/water";

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  phMin: 6.5,
  phMax: 8.5,
  turbidityMax: 5.0,
  tempMin: 10,
  tempMax: 30,
  tdsMax: 500,
};

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function calculateWQI(
  ph: number,
  turbidity: number,
  temperature: number,
  tds: number
): number {
  // Sub-index for pH (ideal 7.0 - 7.4)
  const phDev = Math.abs(ph - 7.2);
  const qPh = clamp(100 - phDev * 32, 10, 100);

  // Sub-index for Turbidity (ideal < 1 NTU, limit 5 NTU)
  const qTurb = clamp(100 - turbidity * 11.5, 5, 100);

  // Sub-index for Temperature (ideal 18 - 25 C)
  const tempDev = temperature > 25 ? temperature - 25 : temperature < 18 ? 18 - temperature : 0;
  const qTemp = clamp(100 - tempDev * 4.5, 20, 100);

  // Sub-index for TDS (ideal < 250 ppm, limit 500 ppm)
  const qTds = clamp(100 - Math.max(0, tds - 120) * 0.14, 10, 100);

  // Weighted sum (pH 0.30, Turbidity 0.30, TDS 0.25, Temp 0.15)
  const wqi = qPh * 0.3 + qTurb * 0.3 + qTds * 0.25 + qTemp * 0.15;
  return Math.round(clamp(wqi, 0, 100));
}

export function getWQILabel(wqi: number): {
  label: string;
  status: HealthStatus;
  description: string;
} {
  if (wqi >= 85) {
    return {
      label: "Excellent",
      status: "Normal",
      description: "Optimal physicochemical balance across all monitored probes.",
    };
  }
  if (wqi >= 70) {
    return {
      label: "Good",
      status: "Normal",
      description: "Parameters are within safe operational tolerances.",
    };
  }
  if (wqi >= 52) {
    return {
      label: "Advisory",
      status: "Warning",
      description: "Moderate parameter drift detected. Inspection recommended.",
    };
  }
  return {
    label: "Critical",
    status: "Critical",
    description: "Threshold exceedance detected. Immediate treatment review required.",
  };
}

export function evaluateParameterStatus(
  key: ParameterKey,
  value: number,
  t: ThresholdConfig
): HealthStatus {
  switch (key) {
    case "ph": {
      if (value < t.phMin || value > t.phMax) return "Critical";
      if (value < t.phMin + 0.3 || value > t.phMax - 0.3) return "Warning";
      return "Normal";
    }
    case "turbidity": {
      if (value > t.turbidityMax) return "Critical";
      if (value > t.turbidityMax * 0.78) return "Warning";
      return "Normal";
    }
    case "temperature": {
      if (value < t.tempMin || value > t.tempMax) return "Critical";
      if (value < t.tempMin + 2 || value > t.tempMax - 2.5) return "Warning";
      return "Normal";
    }
    case "tds": {
      if (value > t.tdsMax) return "Critical";
      if (value > t.tdsMax * 0.82) return "Warning";
      return "Normal";
    }
  }
}

export function formatTimeShort(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function generateInitialStream(count = 24): SensorReading[] {
  const now = Date.now();
  const points: SensorReading[] = [];
  let ph = 7.22;
  let turbidity = 2.38;
  let temperature = 24.7;
  let tds = 246;

  for (let i = count - 1; i >= 0; i--) {
    const dt = new Date(now - i * 4000);
    ph = Number(clamp(ph + (Math.random() - 0.5) * 0.06, 7.05, 7.42).toFixed(2));
    turbidity = Number(clamp(turbidity + (Math.random() - 0.5) * 0.18, 1.9, 3.1).toFixed(2));
    temperature = Number(clamp(temperature + (Math.random() - 0.5) * 0.18, 23.8, 25.6).toFixed(1));
    tds = Math.round(clamp(tds + (Math.random() - 0.5) * 8, 230, 275));

    points.push({
      timestamp: dt.toISOString(),
      timeLabel: formatTimeShort(dt),
      ph,
      turbidity,
      temperature,
      tds,
      wqi: calculateWQI(ph, turbidity, temperature, tds),
    });
  }
  return points;
}

export function generateNextReading(
  prev: SensorReading,
  scenario: SimulationScenario,
  nodeOffset = 0
): SensorReading {
  const now = new Date();
  let targetPh = 7.22 + nodeOffset * 0.08;
  let targetTurb = 2.42 + nodeOffset * 0.25;
  let targetTemp = 24.8 + nodeOffset * 0.4;
  let targetTds = 248 + nodeOffset * 18;

  if (scenario === "acidic_runoff") {
    targetPh = 5.65;
    targetTurb = 4.2;
    targetTds = 390;
  } else if (scenario === "sediment_surge") {
    targetTurb = 7.85;
    targetTds = 445;
    targetPh = 7.05;
  } else if (scenario === "tds_spike") {
    targetTds = 685;
    targetPh = 7.85;
    targetTurb = 3.9;
  } else if (scenario === "thermal_shift") {
    targetTemp = 33.4;
    targetPh = 7.45;
    targetTurb = 3.4;
  }

  const ease = 0.34;
  const ph = Number(
    clamp(prev.ph + (targetPh - prev.ph) * ease + (Math.random() - 0.5) * 0.06, 4.0, 10.5).toFixed(2)
  );
  const turbidity = Number(
    clamp(
      prev.turbidity + (targetTurb - prev.turbidity) * ease + (Math.random() - 0.5) * 0.22,
      0.3,
      15.0
    ).toFixed(2)
  );
  const temperature = Number(
    clamp(
      prev.temperature + (targetTemp - prev.temperature) * ease + (Math.random() - 0.5) * 0.16,
      5.0,
      45.0
    ).toFixed(1)
  );
  const tds = Math.round(
    clamp(prev.tds + (targetTds - prev.tds) * ease + (Math.random() - 0.5) * 10, 50, 1200)
  );

  return {
    timestamp: now.toISOString(),
    timeLabel: formatTimeShort(now),
    ph,
    turbidity,
    temperature,
    tds,
    wqi: calculateWQI(ph, turbidity, temperature, tds),
  };
}

export interface AnalyticsPoint {
  label: string;
  ph: number;
  turbidity: number;
  temperature: number;
  tds: number;
  wqi: number;
  compliantPct: number;
}

export function getAnalyticsSeries(period: ReportPeriod): AnalyticsPoint[] {
  if (period === "daily") {
    const hours = [
      "00:00",
      "02:00",
      "04:00",
      "06:00",
      "08:00",
      "10:00",
      "12:00",
      "14:00",
      "16:00",
      "18:00",
      "20:00",
      "22:00",
    ];
    return hours.map((label, idx) => {
      const ph = Number((7.15 + Math.sin(idx * 0.55) * 0.14).toFixed(2));
      const turbidity = Number((2.1 + Math.cos(idx * 0.6) * 0.55 + (idx === 5 ? 0.9 : 0)).toFixed(2));
      const temperature = Number((22.8 + Math.sin((idx - 3) * 0.4) * 2.2).toFixed(1));
      const tds = Math.round(238 + Math.sin(idx * 0.5) * 24 + (idx === 6 ? 18 : 0));
      return {
        label,
        ph,
        turbidity,
        temperature,
        tds,
        wqi: calculateWQI(ph, turbidity, temperature, tds),
        compliantPct: idx === 5 ? 96.4 : 99.8,
      };
    });
  }

  if (period === "weekly") {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const tdsVals = [242, 249, 265, 294, 258, 246, 244];
    const turbVals = [2.2, 2.4, 2.8, 3.6, 2.7, 2.3, 2.2];
    const phVals = [7.24, 7.21, 7.18, 7.09, 7.19, 7.25, 7.23];
    const tempVals = [24.2, 24.5, 25.1, 25.8, 25.0, 24.4, 24.6];
    return days.map((label, idx) => ({
      label,
      ph: phVals[idx],
      turbidity: turbVals[idx],
      temperature: tempVals[idx],
      tds: tdsVals[idx],
      wqi: calculateWQI(phVals[idx], turbVals[idx], tempVals[idx], tdsVals[idx]),
      compliantPct: idx === 3 ? 95.2 : 99.4,
    }));
  }

  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const phM = [7.22, 7.18, 7.15, 7.24];
  const turbM = [2.3, 2.7, 3.1, 2.4];
  const tempM = [23.9, 24.4, 25.3, 24.8];
  const tdsM = [240, 255, 272, 248];
  return weeks.map((label, idx) => ({
    label,
    ph: phM[idx],
    turbidity: turbM[idx],
    temperature: tempM[idx],
    tds: tdsM[idx],
    wqi: calculateWQI(phM[idx], turbM[idx], tempM[idx], tdsM[idx]),
    compliantPct: idx === 2 ? 96.8 : 99.5,
  }));
}

export const INITIAL_NODES: IoTDeviceNode[] = [
  {
    id: "AS-NODE-01",
    name: "Intake Reservoir Array",
    location: "Sector A · North Basin",
    mcuModel: "ESP32-WROOM-32D",
    macAddress: "A4:CF:12:8B:44:10",
    firmware: "v2.4.1",
    rssi: -52,
    batteryOrPower: "24V DC Mains + LiFePO4 Backup",
    status: "Connected",
    lastSync: "Just now",
  },
  {
    id: "AS-NODE-02",
    name: "Sand Filtration Outlet",
    location: "Sector B · Treatment Bay 2",
    mcuModel: "ESP32-S3-DevKitC",
    macAddress: "B8:D6:1A:3E:91:04",
    firmware: "v2.4.1",
    rssi: -61,
    batteryOrPower: "PoE Industrial Rail",
    status: "Connected",
    lastSync: "2s ago",
  },
  {
    id: "AS-NODE-03",
    name: "Distribution Overhead Tank",
    location: "Sector C · Campus Main",
    mcuModel: "ESP32-WROOM-32U",
    macAddress: "30:AE:A4:7F:12:C8",
    firmware: "v2.3.9",
    rssi: -68,
    batteryOrPower: "Solar 12V + Telemetry Cell",
    status: "Standby",
    lastSync: "4m ago",
  },
];

export const INITIAL_ALERTS: AlertItem[] = [
  {
    id: "ALT-2041",
    parameter: "Turbidity",
    parameterKey: "turbidity",
    valueLabel: "5.42 NTU",
    thresholdLabel: "Max 5.00 NTU",
    message: "Brief suspended particulate spike after backwash cycle in Sector B.",
    severity: "Medium",
    timestamp: "Today · 09:14:22",
    nodeName: "Sand Filtration Outlet",
    acknowledged: true,
    resolved: true,
  },
  {
    id: "ALT-2040",
    parameter: "TDS Level",
    parameterKey: "tds",
    valueLabel: "532 ppm",
    thresholdLabel: "Max 500 ppm",
    message: "Dissolved solids exceeded threshold during peak intake draw.",
    severity: "High",
    timestamp: "Yesterday · 17:42:08",
    nodeName: "Intake Reservoir Array",
    acknowledged: true,
    resolved: true,
  },
  {
    id: "ALT-2039",
    parameter: "pH Level",
    parameterKey: "ph",
    valueLabel: "6.41 pH",
    thresholdLabel: "6.50 – 8.50 pH",
    message: "Mild acidity shift detected following stormwater inflow.",
    severity: "Low",
    timestamp: "Yesterday · 11:05:49",
    nodeName: "Intake Reservoir Array",
    acknowledged: true,
    resolved: true,
  },
  {
    id: "ALT-2038",
    parameter: "Temperature",
    parameterKey: "temperature",
    valueLabel: "30.6 °C",
    thresholdLabel: "10.0 – 30.0 °C",
    message: "Afternoon ambient thermal drift above target operating range.",
    severity: "Medium",
    timestamp: "2 days ago · 14:28:15",
    nodeName: "Distribution Overhead Tank",
    acknowledged: true,
    resolved: true,
  },
];

export function exportWaterQualityPdf(params: {
  period: ReportPeriod;
  series: AnalyticsPoint[];
  latest: SensorReading;
  wqi: number;
  node: IoTDeviceNode;
  thresholds: ThresholdConfig;
  aiPrediction: AIPredictionResult | null;
}) {
  const { period, series, latest, wqi, node, thresholds, aiPrediction } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(2, 132, 199);
  doc.rect(0, 0, pageWidth, 86, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("AquaSense AI", 40, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(
    "AI & IoT-Based Smart Water Quality Monitoring System · Analytical Compliance Report",
    40,
    58
  );

  doc.setFontSize(9.5);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 40, 38, { align: "right" });
  doc.text(`Report Scope: ${period.toUpperCase()}`, pageWidth - 40, 56, { align: "right" });

  // Node & WQI Summary
  let y = 116;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("1. Executive Water Quality Summary", 40, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Monitored Node: ${node.name} (${node.id}) · ${node.location} · MCU: ${node.mcuModel}`,
    40,
    y
  );

  y += 20;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(40, y, pageWidth - 80, 62, 6, 6, "F");

  doc.setTextColor(2, 132, 199);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(`${wqi} / 100`, 58, y + 36);
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("OVERALL WQI", 58, y + 50);

  const wqiStatus = getWQILabel(wqi);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Status: ${wqiStatus.label}`, 185, y + 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(wqiStatus.description, 185, y + 44);

  // Current Sensor Snapshot Table
  y += 92;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("2. Current Sensor Snapshot & Threshold Compliance", 40, y);

  y += 14;
  const rows = [
    ["pH Level", `${latest.ph.toFixed(2)} pH`, `${thresholds.phMin} – ${thresholds.phMax} pH`, evaluateParameterStatus("ph", latest.ph, thresholds)],
    ["Turbidity", `${latest.turbidity.toFixed(2)} NTU`, `< ${thresholds.turbidityMax.toFixed(1)} NTU`, evaluateParameterStatus("turbidity", latest.turbidity, thresholds)],
    ["Temperature", `${latest.temperature.toFixed(1)} °C`, `${thresholds.tempMin} – ${thresholds.tempMax} °C`, evaluateParameterStatus("temperature", latest.temperature, thresholds)],
    ["TDS Level", `${latest.tds} ppm`, `< ${thresholds.tdsMax} ppm`, evaluateParameterStatus("tds", latest.tds, thresholds)],
  ];

  doc.setFillColor(226, 232, 240);
  doc.rect(40, y, pageWidth - 80, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Parameter", 52, y + 15);
  doc.text("Measured Value", 190, y + 15);
  doc.text("Configured Limit", 330, y + 15);
  doc.text("Status", 470, y + 15);

  y += 22;
  rows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(40, y, pageWidth - 80, 22, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(row[0], 52, y + 15);
    doc.text(row[1], 190, y + 15);
    doc.setTextColor(71, 85, 105);
    doc.text(row[2], 330, y + 15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(row[3] === "Normal" ? 22 : row[3] === "Warning" ? 217 : 220, row[3] === "Normal" ? 163 : row[3] === "Warning" ? 119 : 38, row[3] === "Normal" ? 74 : row[3] === "Warning" ? 6 : 38);
    doc.text(row[3], 470, y + 15);
    y += 22;
  });

  // Historical Period Table
  y += 26;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`3. ${period.charAt(0).toUpperCase() + period.slice(1)} Parameter Log`, 40, y);

  y += 14;
  doc.setFillColor(226, 232, 240);
  doc.rect(40, y, pageWidth - 80, 20, "F");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Interval", 52, y + 13);
  doc.text("pH", 150, y + 13);
  doc.text("Turbidity (NTU)", 220, y + 13);
  doc.text("Temp (°C)", 320, y + 13);
  doc.text("TDS (ppm)", 400, y + 13);
  doc.text("WQI", 490, y + 13);

  y += 20;
  series.slice(0, 12).forEach((pt, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(40, y, pageWidth - 80, 19, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(pt.label, 52, y + 13);
    doc.text(pt.ph.toFixed(2), 150, y + 13);
    doc.text(pt.turbidity.toFixed(2), 220, y + 13);
    doc.text(pt.temperature.toFixed(1), 320, y + 13);
    doc.text(String(pt.tds), 400, y + 13);
    doc.text(String(pt.wqi), 490, y + 13);
    y += 19;
  });

  // AI Prediction Section
  y += 28;
  if (y < 720) {
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("4. AI Diagnostic & Trend Assessment", 40, y);

    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const summaryText =
      aiPrediction?.analysisSummary ??
      "AI Analysis: Water parameters are currently within configured monitoring limits. Continue regular monitoring.";
    const wrapped = doc.splitTextToSize(summaryText, pageWidth - 80);
    doc.text(wrapped, 40, y);
    y += wrapped.length * 14 + 8;

    if (aiPrediction?.recommendations?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Recommended Actions:", 40, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      aiPrediction.recommendations.slice(0, 3).forEach((rec) => {
        const recLines = doc.splitTextToSize(`• ${rec}`, pageWidth - 92);
        doc.text(recLines, 48, y);
        y += recLines.length * 13 + 3;
      });
    }
  }

  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text("AquaSense AI · Smart Water Quality Monitoring Platform", 40, 812);

  doc.save(`AquaSense_AI_Report_${period}.pdf`);
}
