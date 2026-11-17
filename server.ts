import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

interface TelemetryPayload {
  deviceId: string;
  location?: string;
  ph: number;
  turbidity: number;
  temperature: number;
  tds: number;
  timestamp: string;
}

const hardwareTelemetryStore = new Map<string, TelemetryPayload>();

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "aquasense-ai-backend",
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/esp32/ingest", (req, res) => {
    const { deviceId, location, ph, turbidity, temperature, tds } = req.body ?? {};
    if (
      typeof deviceId !== "string" ||
      typeof ph !== "number" ||
      typeof turbidity !== "number" ||
      typeof temperature !== "number" ||
      typeof tds !== "number"
    ) {
      res.status(400).json({
        error: "Invalid ESP32 telemetry payload. Expected deviceId, ph, turbidity, temperature, tds.",
      });
      return;
    }

    const record: TelemetryPayload = {
      deviceId,
      location: typeof location === "string" ? location : "Field Sensor Node",
      ph,
      turbidity,
      temperature,
      tds,
      timestamp: new Date().toISOString(),
    };

    hardwareTelemetryStore.set(deviceId, record);
    res.status(201).json({ accepted: true, record });
  });

  app.get("/api/esp32/latest", (_req, res) => {
    res.json({
      nodes: Array.from(hardwareTelemetryStore.values()),
    });
  });

  app.post("/api/ai-predict", async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error: "GEMINI_API_KEY is not configured in Settings > Secrets.",
      });
      return;
    }

    const { reading, thresholds, wqiScore, nodeName, recentHistory, contextMode } = req.body ?? {};

    if (!reading || typeof reading.ph !== "number") {
      res.status(400).json({
        error: "Missing valid sensor reading payload.",
      });
      return;
    }

    try {
      const prompt = `Analyze the following real-time IoT water quality telemetry from node "${nodeName ?? "AS-NODE-01"}" (${contextMode ?? "live monitoring"}):

Current Sensor Readings:
- pH Level: ${reading.ph} pH (Configured safe range: ${thresholds?.phMin ?? 6.5} - ${thresholds?.phMax ?? 8.5})
- Turbidity: ${reading.turbidity} NTU (Configured max: ${thresholds?.turbidityMax ?? 5.0} NTU)
- Water Temperature: ${reading.temperature} °C (Configured range: ${thresholds?.tempMin ?? 10} - ${thresholds?.tempMax ?? 30} °C)
- Total Dissolved Solids (TDS): ${reading.tds} ppm (Configured max: ${thresholds?.tdsMax ?? 500} ppm)
- Calculated Water Quality Index (WQI): ${wqiScore}/100

Recent Historical Trend (last 6 samples):
${JSON.stringify(recentHistory ?? [], null, 2)}

Provide an industrial water engineering prediction and diagnostic report:
1. Classify overallStatus as "Optimal", "Advisory", or "Critical".
2. Predict the Water Quality Index (predictedNextHourWqi) for the next 60 minutes based on parameter trajectory.
3. Assess contaminationRisk ("Low", "Moderate", "Elevated", or "High").
4. List any abnormalParameters (empty array if all parameters are within limits).
5. Provide potentialContaminationWarning (clear statement of potential cause if drifting/abnormal, or "No active contamination indicators detected." if nominal).
6. Provide analysisSummary starting with "AI Analysis:" — concise, factual engineering assessment (2 sentences max). If all parameters are comfortably within limits, align with: "AI Analysis: Water parameters are currently within configured monitoring limits. Continue regular monitoring." plus brief trend context.
7. Provide 3 concise, actionable recommendations for treatment plant / IoT operators.
8. Provide confidenceScore (between 82 and 99).`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction:
            "You are AquaSense AI, an industrial water quality diagnostic engine for municipal and smart-campus IoT monitoring systems (ESP32 sensor arrays). Be precise, concise, engineering-focused, and avoid hype.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallStatus: {
                type: Type.STRING,
                description: "One of Optimal, Advisory, or Critical",
              },
              predictedNextHourWqi: {
                type: Type.NUMBER,
                description: "Predicted WQI score 0-100 for the next 60 minutes",
              },
              contaminationRisk: {
                type: Type.STRING,
                description: "One of Low, Moderate, Elevated, or High",
              },
              abnormalParameters: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Names of parameters outside safe bounds or trending abnormally",
              },
              potentialContaminationWarning: {
                type: Type.STRING,
                description: "Short warning or confirmation of no contamination",
              },
              analysisSummary: {
                type: Type.STRING,
                description: "Concise summary starting with 'AI Analysis:'",
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 actionable recommendations",
              },
              confidenceScore: {
                type: Type.NUMBER,
                description: "Model confidence percentage 80-99",
              },
            },
            required: [
              "overallStatus",
              "predictedNextHourWqi",
              "contaminationRisk",
              "abnormalParameters",
              "potentialContaminationWarning",
              "analysisSummary",
              "recommendations",
              "confidenceScore",
            ],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);

      res.json({
        ...parsed,
        generatedAt: new Date().toISOString(),
        model: "gemini-4-hydrogen",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate AI water quality prediction.";
      res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AquaSense AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
