"use client";
import Panel, { PanelHeader } from "./Panel";

export default function LeaderboardPanel({ list, title }: { list: any[] | null; title: string }) {
  const top = (list ?? []).slice(0, 8);
  return (
    <Panel>
      <PanelHeader title="CLASSIFICACIÓ" badge={title} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {top.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "34px 56px 1fr 76px",
              alignItems: "center",
              background: i === 0 ? "rgba(14,165,233,0.18)" : "rgba(255,255,255,0.04)",
              border: i === 0 ? "1px solid #0EA5E9" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: "8px 14px",
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 900, color: i === 0 ? "#0EA5E9" : "#94a3b8" }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, opacity: 0.7 }}>#{r.bib}</span>
            <span style={{ fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.first_name} {r.last_name}
            </span>
            <span style={{ fontSize: 17, fontWeight: 900, textAlign: "right" }}>
              {r.laps_completed} <span style={{ fontSize: 11, opacity: 0.6 }}>V</span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
