"use client";
import { formatHMS } from "@/lib/client/useCountdown";

const LEVEL_COLOR: Record<string, string> = {
  normal: "#0EA5E9",
  alert: "#f59e0b",
  critical: "#ef4444",
  final: "#ef4444",
};

export default function TimerBadge({
  race,
  remaining,
  level,
}: {
  race: any;
  remaining: number;
  level: string;
}) {
  const color = LEVEL_COLOR[level] ?? LEVEL_COLOR.normal;
  const flashing = level === "final";

  return (
    <div
      style={{
        position: "absolute",
        top: 32,
        right: 32,
        display: "flex",
        alignItems: "stretch",
        background: "rgba(8,12,18,0.9)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "6px 12px",
          background: "rgba(255,255,255,0.05)",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#94a3b8" }}>
          {race?.status === "RUNNING" ? `VOLTA ${race.current_lap}` : race?.status ?? ""}
        </span>
      </div>
      <div
        className={flashing ? "animate-flash-crit" : ""}
        style={{
          fontSize: 34,
          fontWeight: 900,
          lineHeight: 1,
          color,
          fontVariantNumeric: "tabular-nums",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {formatHMS(remaining)}
      </div>
    </div>
  );
}
