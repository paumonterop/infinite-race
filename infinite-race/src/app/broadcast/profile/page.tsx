"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import GpxProfilePanel from "@/components/broadcast/GpxProfilePanel";
import { useLive } from "@/lib/client/useLive";

function ProfileOverlay() {
  const params = useSearchParams();
  const showTicker = params.get("ticker") !== "0";
  const { data: race } = useLive<any>("/api/race", ["race:changed"], 5000);

  return (
    <BroadcastFrame>
      <GpxProfilePanel selectedIds={race?.gps_selected_ids ?? []} />
      {showTicker && <Ticker />}
    </BroadcastFrame>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProfileOverlay />
    </Suspense>
  );
}
