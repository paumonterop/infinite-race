"use client";
import { useLive } from "@/lib/client/useLive";

export default function Ticker() {
  const { data: runners } = useLive<any[]>("/api/leaderboard", ["runners:changed"], 4000);
  const list = runners ?? [];
  const items = [...list, ...list]; // duplicate for seamless loop

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 84,
        background: "linear-gradient(90deg,#0b0f14,#111827)",
        borderTop: "3px solid #0EA5E9",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#0EA5E9",
          color: "#05070a",
          fontWeight: 900,
          fontSize: 26,
          padding: "0 28px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          zIndex: 2,
        }}
      >
        CLASSIFICACIÓ
      </div>
      <div
        className="animate-ticker"
        style={{
          display: "flex",
          whiteSpace: "nowrap",
          animationDuration: `${Math.max(20, list.length * 3)}s`,
        }}
      >
        {items.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              padding: "0 34px",
              fontSize: 28,
              fontWeight: 700,
              color: statusColor(r.status),
            }}
          >
            <span style={{ opacity: 0.6, fontWeight: 900 }}>#{r.bib}</span>
            <span>
              {r.first_name} {r.last_name?.[0] ?? ""}.
            </span>
            <span style={{ fontWeight: 900 }}>{r.laps_completed} LAPS</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "ACTIVE":
    case "LAP_COMPLETED":
      return "#34d399";
    case "ELIMINATED":
      return "#f87171";
    case "RETIRED":
      return "#fbbf24";
    case "DISQUALIFIED":
      return "#c084fc";
    default:
      return "#e6edf3";
  }
}
