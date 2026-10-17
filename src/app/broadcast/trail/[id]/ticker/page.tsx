"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import TrailTicker from "@/components/broadcast/TrailTicker";
import { useLive } from "@/lib/client/useLive";

/** Ús: /broadcast/trail/<id>/ticker?race=<raceId>&transparent=1&backlog=6  (sense `race` = totes les curses) */
function Overlay({ id }: { id: string }) {
  const p = useSearchParams();
  const { data: ev } = useLive<any>(`/api/trail/events/${id}?lite=1`, ["trail:changed"], 30000);
  return (
    <BroadcastFrame transparentDefault>
      <TrailTicker eventId={id} raceId={p.get("race")} backlog={parseInt(p.get("backlog") ?? "6", 10)} speed={ev?.ticker_speed} />
    </BroadcastFrame>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <Overlay id={params.id} />
    </Suspense>
  );
}
