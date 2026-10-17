"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import { Scene } from "@/components/broadcast/trail/SceneRenderer";
import { useLive } from "@/lib/client/useLive";
import type { Layer, SceneId } from "@/lib/trail/scenes";

/**
 * Previsualització/sortida d'UNA escena amb paràmetres a la URL (transparent per defecte):
 * /broadcast/trail/<id>/scene?scene=leaderboard&race=trail&sex=F
 *   scene, race, sex=M|F, bib, from, to, label, device, point, other, pos
 */
function One({ id }: { id: string }) {
  const p = useSearchParams();
  const { data: ev } = useLive<any>(`/api/trail/events/${id}?lite=1`, ["trail:changed"], 20000);
  const num = (k: string) => (p.get(k) != null && p.get(k) !== "" ? Number(p.get(k)) : undefined);
  const layer: Layer = {
    scene: (p.get("scene") ?? "presentation_profile") as SceneId,
    race_id: p.get("race"),
    sex: p.get("sex") === "F" ? "F" : p.get("sex") === "M" ? "M" : undefined,
    bib: p.get("bib") ?? undefined,
    from_km: num("from"),
    to_km: num("to"),
    label: p.get("label") ?? undefined,
    device: p.get("device") ?? undefined,
    point: num("point"),
    other: p.get("other") ?? undefined,
    position: num("pos"),
  };
  return <BroadcastFrame>{ev && <Scene eventId={id} ev={ev} layer={layer} isLive />}</BroadcastFrame>;
}

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <One id={params.id} />
    </Suspense>
  );
}
