export type NavTab = "dashboard" | "live" | "analytics" | "alerts" | "settings";

export type ParameterKey = "ph" | "turbidity" | "temperature" | "tds";

export type HealthStatus = "Normal" | "Warning" | "Critical";

export type AlertSeverity = "Low" | "Medium" | "High";

export type ReportPeriod = "daily" | "weekly" | "monthly";

export type SimulationScenario =
  | "nominal"
  | "acidic_runoff"
  | "sediment_surge"
  | "tds_spike"
  | "thermal_shift";

export interface SensorReading {
  timestamp: string;
  timeLabel: string;
  ph: number;
  turbidity: number;
  temperature: number;
  tds: number;
  wqi: number;
}

export interface ThresholdConfig {
  phMin: number;
  phMax: number;
  turbidityMax: number;
  tempMin: number;
  tempMax: number;
  tdsMax: number;
}

export interface CalibrationConfig {
  phOffset: number;
  turbidityOffset: number;
  tempOffset: number;
  tdsFactor: number;
  samplingIntervalSec: 1 | 2 | 5 | 10;
}

export interface IoTDeviceNode {
  id: string;
  name: string;
  location: string;
  mcuModel: string;
  macAddress: string;
  firmware: string;
  rssi: number;
  batteryOrPower: string;
  status: "Connected" | "Standby" | "Offline";
  lastSync: string;
}

export interface AlertItem {
  id: string;
  parameter: "pH Level" | "Turbidity" | "TDS Level" | "Temperature" | "System";
  parameterKey: ParameterKey | "system";
  valueLabel: string;
  thresholdLabel: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  nodeName: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface AIPredictionResult {
  overallStatus: "Optimal" | "Advisory" | "Critical";
  predictedNextHourWqi: number;
  contaminationRisk: "Low" | "Moderate" | "Elevated" | "High";
  abnormalParameters: string[];
  potentialContaminationWarning: string;
  analysisSummary: string;
  recommendations: string[];
  confidenceScore: number;
  generatedAt: string;
  model?: string;
}

export interface UserProfile {
  name: string;
  role: string;
  department: string;
  email: string;
  facility: string;
  avatarUrl: string;
}

export interface NotificationPrefs {
  emailAlerts: boolean;
  pushNotifications: boolean;
  smsEscalation: boolean;
  criticalOnly: boolean;
  dailyPdfDigest: boolean;
}
