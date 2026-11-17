import React from "react";

interface WaterWaveBackdropProps {
  variant?: "hero" | "subtle";
  alertLevel?: "Normal" | "Warning" | "Critical";
}

export const WaterWaveBackdrop: React.FC<WaterWaveBackdropProps> = ({
  variant = "hero",
  alertLevel = "Normal",
}) => {
  const primaryColor =
    alertLevel === "Critical"
      ? "rgba(220, 38, 38, 0.08)"
      : alertLevel === "Warning"
        ? "rgba(217, 119, 6, 0.08)"
        : "rgba(2, 132, 199, 0.09)";

  const secondaryColor =
    alertLevel === "Critical"
      ? "rgba(244, 63, 94, 0.06)"
      : alertLevel === "Warning"
        ? "rgba(245, 158, 11, 0.06)"
        : "rgba(6, 182, 212, 0.10)";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <svg
        className={`absolute bottom-0 left-0 w-[200%] ${
          variant === "hero" ? "h-28" : "h-16"
        } animate-wave-slow`}
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,48 C150,96 300,0 450,48 C600,96 750,0 900,48 C1050,96 1200,0 1200,48 L1200,120 L0,120 Z"
          fill={primaryColor}
        />
      </svg>
      <svg
        className={`absolute bottom-0 left-0 w-[200%] ${
          variant === "hero" ? "h-24" : "h-14"
        } animate-wave-reverse`}
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,64 C180,16 360,110 540,64 C720,16 900,110 1080,64 C1140,48 1170,40 1200,48 L1200,120 L0,120 Z"
          fill={secondaryColor}
        />
      </svg>
    </div>
  );
};
