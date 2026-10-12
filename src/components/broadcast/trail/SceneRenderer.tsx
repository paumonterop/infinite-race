"use client";
import { useEffect, useRef, useState } from "react";
import TrailPresentation from "@/components/broadcast/TrailPresentation";
import { Layer, Program, SCENE_BY_ID, Slot } from "@/lib/trail/scenes";
import { ChronoAllScene, ChronoScene, GpsGradientScene, GpsSpeedScene } from "./ChronoGauges";
import { FavoritesScene, HistoryRecordScene, HistoryWinnersScene, LeaderboardScene, PositionTagScene } from "./ListScenes";
import { HighlightsScene, SceneProps, WeatherScene, raceOf } from "./RaceScenes";
import { OtherChyronScene, RunnerCardScene, RunnerChyronScene } from "./RunnerScenes";
import { CheckpointScene, SegmentInfoScene, SegmentProfileScene } from "./SegmentScenes";

function PresentationScene({ ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  if (!race) return null;
  return (
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
      isLive={isLive}
      showProfile
      flag={ev?.flag ?? "es-ct"}
    />
  );
}

/** Una escena concreta. `shift`: el dial de pendent es desplaça a l'esquerra si també hi ha el de velocitat. */
export function Scene(props: SceneProps & { shift?: boolean }) {
  const { layer } = props;
  switch (layer.scene) {
    case "presentation_profile":
      return <PresentationScene {...props} />;
    case "highlights_stats":
    case "highlights_climb":
    case "highlights_descent":
    case "highlights_surface":
      return <HighlightsScene {...props} />;
    case "weather":
      return <WeatherScene {...props} />;
    case "checkpoint":
      return <CheckpointScene {...props} />;
    case "runner_chyron":
      return <RunnerChyronScene {...props} />;
    case "runner_card":
      return <RunnerCardScene {...props} />;
    case "chyron_other":
      return <OtherChyronScene {...props} />;
    case "leaderboard":
      return <LeaderboardScene {...props} />;
    case "position_tag":
      return <PositionTagScene {...props} />;
    case "favorites":
      return <FavoritesScene {...props} />;
    case "history_record":
      return <HistoryRecordScene {...props} />;
    case "history_winners":
      return <HistoryWinnersScene {...props} />;
    case "segment_info":
      return <SegmentInfoScene {...props} />;
    case "segment_profile":
      return <SegmentProfileScene {...props} />;
    case "chrono":
      return <ChronoScene {...props} />;
    case "chrono_all":
      return <ChronoAllScene {...props} />;
    case "gps_speed":
      return <GpsSpeedScene {...props} />;
    case "gps_gradient":
      return <GpsGradientScene {...props} />;
    default:
      return null;
  }
}

interface Rendered {
  layer: Layer;
  live: boolean;
  key: string;
}

const OUT_MS = 1600; // temps que es manté muntada una escena mentre fa l'animació de sortida

/**
 * Pintura les capes del programa. Quan una capa surt, es manté muntada amb isLive=false fins que acaba l'animació de
 * sortida; si una capa canvia de contingut (p. ex. un altre dorsal) es torna a muntar i fa l'entrada de nou.
 */
export function ProgramStage({ eventId, ev, program }: { eventId: string; ev: any; program: Program | null }) {
  const [rendered, setRendered] = useState<Partial<Record<Slot, Rendered>>>({});
  const timers = useRef<Partial<Record<Slot, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => {
    if (!program) return;
    setRendered((prev) => {
      const next = { ...prev };
      const slots = new Set<Slot>([...(Object.keys(prev) as Slot[]), ...(Object.keys(program.layers) as Slot[])]);
      slots.forEach((slot) => {
        const want = program.layers[slot];
        const cur = prev[slot];
        if (want) {
          const sig = JSON.stringify(want);
          clearTimeout(timers.current[slot]);
          if (!cur || cur.key !== sig) next[slot] = { layer: want, live: true, key: sig };
          else if (!cur.live) next[slot] = { ...cur, live: true };
        } else if (cur && cur.live) {
          next[slot] = { ...cur, live: false };
          clearTimeout(timers.current[slot]);
          timers.current[slot] = setTimeout(() => {
            setRendered((p) => {
              const n = { ...p };
              if (n[slot] && !n[slot]!.live) delete n[slot];
              return n;
            });
          }, OUT_MS);
        }
      });
      return next;
    });
  }, [program]);

  const speedOn = !!rendered.gauge_speed?.live;
  // amb el ticker en antena (barra de 120 px a baix) les escenes inferiors pugen per no quedar tapades
  const sb = program?.ticker ? "180px" : "48px";
  return (
    <div style={{ position: "absolute", inset: 0, ["--sb" as any]: sb }}>
      {(Object.entries(rendered) as [Slot, Rendered][]).map(([slot, r]) => (
        <Scene key={slot + r.key} eventId={eventId} ev={ev} layer={r.layer} isLive={r.live} shift={slot === "gauge_gradient" && speedOn} />
      ))}
    </div>
  );
}

export { SCENE_BY_ID };
