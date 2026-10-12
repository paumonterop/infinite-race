"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import TrailPresentation from "@/components/broadcast/TrailPresentation";
import TrailTicker from "@/components/broadcast/TrailTicker";
import { useLive } from "@/lib/client/useLive";
import type { Program } from "@/lib/trail/types";

/**
 * SORTIDA DE PROGRAMA per a vMix/OBS: /broadcast/trail/<id>[?transparent=1]
 * Mostra el que l'operador ha posat «en antena» des d'Esdeveniment → Broadcast.
 */
function Output({ id }: { id: string }) {
  useSearchParams(); // perquè BroadcastFrame (transparent=1) funcioni dins Suspense
  const { data: ev } = useLive<any>(`/api/trail/events/${id}`, ["trail:changed"], 20000);
  const { data: prog } = useLive<Program>(`/api/trail/events/${id}/program`, ["trail:program"], 3000);

  const race = ev?.races.find((r: any) => r.id === prog?.race_id) ?? ev?.races[0];
  const scene = prog?.scene ?? "none";
  const showScene = scene === "presentation" || scene === "presentation_profile";

  return (
    <BroadcastFrame>
      {race && (
        <TrailPresentation
          key={race.id}
          race={{
            name: race.name,
            color: race.color,
            distance_m: race.distance_m,
            elevation_gain: race.elevation_gain,
            gpx: race.gpx ? { total_km: race.gpx.total_km, track: race.gpx.track } : null,
            checkpoints: race.checkpoints.map((c: any) => ({ name: c.name, km: c.km })),
          }}
          eventName={ev?.name}
          isLive={showScene}
          showProfile={scene === "presentation_profile"}
          flag={ev?.flag ?? "es-ct"}
        />
      )}
      {prog?.ticker && <TrailTicker eventId={id} raceId={prog.race_id} backlog={0} />}
    </BroadcastFrame>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <Output id={params.id} />
    </Suspense>
  );
}
