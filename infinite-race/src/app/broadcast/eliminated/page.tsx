"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import EliminatedPanel from "@/components/broadcast/EliminatedPanel";
import { useLive } from "@/lib/client/useLive";

function EliminatedOverlay() {
  const params = useSearchParams();
  const showTicker = params.get("ticker") !== "0";
  const { data: runners } = useLive<any[]>("/api/leaderboard", ["runners:changed"], 3000);

  return (
    <BroadcastFrame>
      <EliminatedPanel list={runners} />
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
