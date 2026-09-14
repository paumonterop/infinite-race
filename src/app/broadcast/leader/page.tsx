"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import { useLive } from "@/lib/client/useLive";

function LeaderCard({ label, runner, color }: { label: string; runner: any; color: string }) {
  if (!runner) return null;
  return (
    <div
      className="animate-pop-in"
      style={{
        flex: 1,
        background: `linear-gradient(160deg, ${color}22, transparent)`,
        border: `2px solid ${color}`,
        borderRadius: 24,
        padding: "40px 44px",
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 3, color }}>{label}</div>
      <div style={{ fontSize: 100, fontWeight: 900, lineHeight: 1, margin: "18px 0" }}>
        #{runner.bib}
      </div>
      <div style={{ fontSize: 42, fontWeight: 800 }}>
        {runner.first_name} {runner.last_name}
      </div>
      <div style={{ fontSize: 30, opacity: 0.75, marginTop: 10 }}>
        {runner.laps_completed} LAPS · {runner.total_km} KM
      </div>
    </div>
  );
}

function LeaderOverlay() {
  const params = useSearchParams();
  const showTicker = params.get("ticker") !== "0";
  const { data: stats } = useLive<any>("/api/stats", ["runners:changed"], 3000);

  return (
    <BroadcastFrame>
      <div style={{ padding: "80px 90px", display: "flex", flexDirection: "column", height: "100%" }}>
        <h1 style={{ fontSize: 60, fontWeight: 900, marginBottom: 40 }}>LEADERS</h1>
        <div style={{ display: "flex", gap: 30 }}>
          <LeaderCard label="LÍDER MASCULÍ" runner={stats?.leaderMale} color="#0EA5E9" />
          <LeaderCard label="LÍDER FEMENINA" runner={stats?.leaderFemale} color="#f472b6" />
        </div>
      </div>
      {showTicker && <Ticker />}
    </BroadcastFrame>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LeaderOverlay />
    </Suspense>
  );
}
