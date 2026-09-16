"use client";
import Panel, { PanelHeader } from "./Panel";

function LeaderRow({ label, runner, color }: { label: string; runner: any; color: string }) {
  if (!runner) return null;
  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${color}22, transparent)`,
        border: `1.5px solid ${color}`,
        borderRadius: 12,
        padding: "14px 18px",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "6px 0" }}>
        <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>#{runner.bib}</span>
        <span style={{ fontSize: 18, fontWeight: 800 }}>
          {runner.first_name} {runner.last_name}
        </span>
      </div>
      <div style={{ fontSize: 14, opacity: 0.75 }}>
        {runner.laps_completed} VOLTES · {runner.total_km} KM
      </div>
    </div>
  );
}

export default function LeaderPanel({ stats }: { stats: any }) {
  return (
    <Panel>
      <PanelHeader title="LÍDERS" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <LeaderRow label="LÍDER MASCULÍ" runner={stats?.leaderMale} color="#0EA5E9" />
        <LeaderRow label="LÍDER FEMENINA" runner={stats?.leaderFemale} color="#f472b6" />
      </div>
    </Panel>
  );
}
