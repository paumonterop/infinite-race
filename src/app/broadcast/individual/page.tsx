"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import { useLive } from "@/lib/client/useLive";

function IndividualOverlay() {
  const params = useSearchParams();
  const showTicker = params.get("ticker") !== "0";
  const bibParam = params.get("bib");
  const { data: state } = useLive<any>("/api/broadcast/state", ["broadcast:changed"], 3000);
  const { data: runners } = useLive<any[]>("/api/runners", ["runners:changed"], 3000);

  const runner = bibParam
    ? (runners ?? []).find((r) => String(r.bib) === bibParam)
    : (runners ?? []).find((r) => r.id === state?.selected_runner_id);

  return (
    <BroadcastFrame>
      {runner ? (
        <div
          className="animate-pop-in"
          style={{
            position: "absolute",
            left: 90,
            bottom: 190,
            background: "rgba(11,15,20,0.85)",
            border: "2px solid #0EA5E9",
            borderRadius: 20,
            padding: "30px 50px",
            minWidth: 620,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0EA5E9", letterSpacing: 2 }}>
            DORSAL {runner.bib}
          </div>
          <div style={{ fontSize: 56, fontWeight: 900, margin: "8px 0" }}>
            {runner.first_name} {runner.last_name}
          </div>
          <div style={{ display: "flex", gap: 40, fontSize: 30, fontWeight: 700, opacity: 0.9 }}>
            <span>{runner.laps_completed} LAPS</span>
            <span>{runner.total_km} KM</span>
            <span>+{runner.total_elevation} M+</span>
          </div>
        </div>
      ) : (
        <p style={{ position: "absolute", top: 60, left: 90, fontSize: 30, opacity: 0.5 }}>
          Cap corredor seleccionat
        </p>
      )}
      {showTicker && <Ticker />}
    </BroadcastFrame>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <IndividualOverlay />
    </Suspense>
  );
}
