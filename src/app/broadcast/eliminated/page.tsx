"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import { useLive } from "@/lib/client/useLive";

const LABELS: Record<string, { text: string; color: string }> = {
  ELIMINATED: { text: "ELIMINAT", color: "#f87171" },
  RETIRED: { text: "RETIRAT", color: "#fbbf24" },
  DISQUALIFIED: { text: "DESQUALIFICAT", color: "#c084fc" },
};

function EliminatedOverlay() {
  const params = useSearchParams();
  const showTicker = params.get("ticker") !== "0";
  const { data: runners } = useLive<any[]>("/api/leaderboard", ["runners:changed"], 3000);
  const list = (runners ?? []).filter((r) => ["ELIMINATED", "RETIRED", "DISQUALIFIED"].includes(r.status));

  return (
    <BroadcastFrame>
      <div style={{ padding: "70px 90px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 36 }}>
          <div style={{ width: 10, height: 64, background: "#f87171", borderRadius: 4 }} />
          <h1 style={{ fontSize: 64, fontWeight: 900 }}>FORA DE CURSA</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {list.slice(0, 16).map((r) => {
            const meta = LABELS[r.status] ?? { text: r.status, color: "#94a3b8" };
            return (
              <div
                key={r.id}
                className="animate-pop-in"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${meta.color}55`,
                  borderRadius: 14,
                  padding: "16px 26px",
                }}
              >
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, opacity: 0.6 }}>#{r.bib}</div>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>
                    {r.first_name} {r.last_name}
                  </div>
                  <div style={{ fontSize: 18, opacity: 0.6 }}>{r.laps_completed} LAPS</div>
                </div>
                <span
                  style={{
                    color: meta.color,
                    border: `2px solid ${meta.color}`,
                    borderRadius: 999,
                    padding: "6px 18px",
                    fontWeight: 900,
                    fontSize: 18,
                  }}
                >
                  {meta.text}
                </span>
              </div>
            );
          })}
          {list.length === 0 && (
            <p style={{ fontSize: 28, opacity: 0.5 }}>Encara no hi ha corredors fora de cursa.</p>
          )}
        </div>
      </div>
      {showTicker && <Ticker />}
    </BroadcastFrame>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EliminatedOverlay />
    </Suspense>
  );
}
