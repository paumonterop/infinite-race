"use client";
import { Suspense } from "react";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import TrailTicker from "@/components/broadcast/TrailTicker";
import { ProgramStage } from "@/components/broadcast/trail/SceneRenderer";
import { useLive } from "@/lib/client/useLive";
import type { Program } from "@/lib/trail/scenes";

/**
 * SORTIDA DE PROGRAMA per a vMix/OBS: /broadcast/trail/<id>
 * Transparent i sense contrasenya. Mostra les escenes que l'operador ha posat «en antena» des d'Esdeveniment → Broadcast
 * (?transparent=0 per veure-la amb fons fosc al navegador).
 */
function Output({ id }: { id: string }) {
  const { data: ev } = useLive<any>(`/api/trail/events/${id}`, ["trail:changed"], 20000);
  const { data: prog } = useLive<Program>(`/api/trail/events/${id}/program`, ["trail:program"], 2000);
  return (
    <BroadcastFrame>
      {ev && prog?.layers && <ProgramStage eventId={id} ev={ev} program={prog} />}
      {prog?.ticker && <TrailTicker eventId={id} raceId={null} backlog={0} />}
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
