import { simplifyForClient } from "./gpx";
import { othersOf } from "./others";
import type { TrailEvent } from "./types";

/** Versió lleugera d'un esdeveniment per al navegador (traça reduïda, sense passos individuals). */
export function eventView(ev: TrailEvent) {
  return {
    ...ev,
    others: othersOf(ev),
    races: ev.races.map((r) => ({
      ...r,
      gpx: r.gpx
        ? { file_name: r.gpx.file_name, total_km: r.gpx.total_km, elevation_gain: r.gpx.elevation_gain, track: simplifyForClient(r.gpx) }
        : null,
      runners: r.runners.map(({ passings, ...rest }) => ({ ...rest, passings_count: passings.length })),
    })),
  };
}

export function eventSummary(ev: TrailEvent) {
  return {
    id: ev.id,
    name: ev.name,
    sport: ev.sport,
    created_at: ev.created_at,
    tenant: ev.livetrail.tenant,
    last_sync: ev.livetrail.last_sync,
    last_error: ev.livetrail.last_error,
    races: ev.races.map((r) => ({
      id: r.id, name: r.name, color: r.color, start_iso: r.start_iso, status: r.status,
      distance_m: r.distance_m, runners: r.runners.length, has_gpx: !!r.gpx,
    })),
  };
}
