"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import { useLive } from "@/lib/client/useLive";

function LeaderboardOverlay() {
  const params = useSearchParams();
  const view = params.get("view") ?? "general";
  const showTicker = params.get("ticker") !== "0";
  const url =
    view === "men" ? "/api/leaderboard?gender=M" : view === "women" ? "/api/leaderboard?gender=F" : "/api/leaderboard";
  const { data: list } = useLive<any[]>(url, ["runners:changed"], 3000);
  const title = view === "men" ? "MASCULINA" : view === "women" ? "FEMENINA" : "GENERAL";

  const top = (list ?? []).slice(0, 12);

  return (
    <BroadcastFrame>
      <div style={{ padding: "70px 90px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 36 }}>
          <div
            style={{
              width: 10,
              height: 64,
              background: "#0EA5E9",
              borderRadius: 4,
            }}
          />
          <h1 style={{ fontSize: 64, fontWeight: 900, letterSpacing: 1 }}>CLASSIFICACIÓ</h1>
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#0EA5E9",
              border: "3px solid #0EA5E9",
              borderRadius: 999,
              padding: "6px 26px",
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {top.map((r, i) => (
            <div
              key={r.id}
              className="animate-pop-in"
              style={{
                display: "grid",
                gridTemplateColumns: "90px 130px 1fr 220px",
                alignItems: "center",
                background: i === 0 ? "rgba(14,165,233,0.18)" : "rgba(255,255,255,0.04)",
                border: i === 0 ? "2px solid #0EA5E9" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: "14px 28px",
              }}
            >
              <span style={{ fontSize: 40, fontWeight: 900, color: i === 0 ? "#0EA5E9" : "#94a3b8" }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 34, fontWeight: 800, opacity: 0.7 }}>#{r.bib}</span>
              <span style={{ fontSize: 38, fontWeight: 800 }}>
                {r.first_name} {r.last_name}
              </span>
              <span style={{ fontSize: 40, fontWeight: 900, textAlign: "right" }}>
                {r.laps_completed} <span style={{ fontSize: 22, opacity: 0.6 }}>LAPS</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      {showTicker && <Ticker />}
    </BroadcastFrame>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LeaderboardOverlay />
    </Suspense>
  );
}
