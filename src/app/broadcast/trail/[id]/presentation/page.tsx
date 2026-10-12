"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import TrailPresentation from "@/components/broadcast/TrailPresentation";
import { useLive } from "@/lib/client/useLive";

/**
 * Ús: /broadcast/trail/<id>/presentation?race=<raceId>[&profile=1][&duration=15][&flag=es-ct][&transparent=1]
 *  - race: cursa a presentar (per defecte, la primera)
 *  - profile=1: títol + perfil amb punts de control
 *  - duration: segons en pantalla abans de sortir (sense valor = es queda)
 *  - live=0: l'escena no entra (per controlar-la des de vMix recarregant amb live=1)
 */
function Overlay({ id }: { id: string }) {
  const p = useSearchParams();
  const { data: ev } = useLive<any>(`/api/trail/events/${id}`, ["trail:changed"], 30000);
  const [live, setLive] = useState(p.get("live") !== "0");
  const duration = parseFloat(p.get("duration") ?? "");

  useEffect(() => {
    if (!live || !duration) return;
    const t = setTimeout(() => setLive(false), duration * 1000);
    return () => clearTimeout(t);
  }, [live, duration]);

  const race = ev?.races.find((r: any) => r.id === p.get("race")) ?? ev?.races[0];
  return (
    <BroadcastFrame>
      {race && (
        <TrailPresentation
          race={{
            name: race.name,
            color: race.color,
            distance_m: race.distance_m,
            elevation_gain: race.elevation_gain,
            gpx: race.gpx ? { total_km: race.gpx.total_km, track: race.gpx.track } : null,
            checkpoints: race.checkpoints.map((c: any) => ({ name: c.name, km: c.km })),
          }}
          eventName={ev?.name}
          isLive={live}
          showProfile={p.get("profile") === "1"}
          flag={p.get("flag") ?? "es-ct"}
        />
      )}
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
