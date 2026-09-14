"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import Panel, { PanelHeader } from "@/components/broadcast/Panel";
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
        <Panel>
          <PanelHeader title={`DORSAL ${runner.bib}`} />
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
            {runner.first_name} {runner.last_name}
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 15, fontWeight: 700, opacity: 0.9 }}>
            <span>{runner.laps_completed} VOLTES</span>
            <span>{runner.total_km} KM</span>
            <span>+{runner.total_elevation} M+</span>
          </div>
        </Panel>
      ) : (
        <p style={{ position: "absolute", top: 40, left: 40, fontSize: 18, opacity: 0.5 }}>
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
