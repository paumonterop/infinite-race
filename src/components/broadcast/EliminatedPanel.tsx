"use client";
import Panel, { PanelHeader } from "./Panel";

const LABELS: Record<string, { text: string; color: string }> = {
  ELIMINATED: { text: "ELIMINAT", color: "#f87171" },
  RETIRED: { text: "RETIRAT", color: "#fbbf24" },
  DISQUALIFIED: { text: "DESQUAL.", color: "#c084fc" },
};

export default function EliminatedPanel({ list }: { list: any[] | null }) {
  const filtered = (list ?? []).filter((r) =>
    ["ELIMINATED", "RETIRED", "DISQUALIFIED"].includes(r.status)
  );
  return (
    <Panel>
      <PanelHeader title="FORA DE CURSA" accent="#f87171" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.slice(0, 8).map((r) => {
          const meta = LABELS[r.status] ?? { text: r.status, color: "#94a3b8" };
          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${meta.color}55`,
                borderRadius: 10,
                padding: "8px 14px",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.6 }}>#{r.bib}</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  {r.first_name} {r.last_name}
                </div>
              </div>
              <span
                style={{
                  color: meta.color,
                  border: `1.5px solid ${meta.color}`,
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontWeight: 900,
                  fontSize: 11,
                }}
              >
                {meta.text}
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ fontSize: 15, opacity: 0.5 }}>Cap corredor fora de cursa.</p>
        )}
      </div>
    </Panel>
  );
}
