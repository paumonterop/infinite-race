"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import LeaderPanel from "@/components/broadcast/LeaderPanel";
import { useLive } from "@/lib/client/useLive";

function LeaderOverlay() {
  const params = useSearchParams();
  const showTicker = params.get("ticker") !== "0";
  const { data: stats } = useLive<any>("/api/stats", ["runners:changed"], 3000);

  return (
    <BroadcastFrame>
      <LeaderPanel stats={stats} />
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
