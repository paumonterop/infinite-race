import { defaultLabel } from "./devices";
import { gradientAt, projectOnTrack } from "./gpx";
import type { GpsPosition, TrailEvent } from "./types";

/** Dades crues tal com les envien les motxilles (event Socket.IO `gps_data`). Només en memòria. */
export interface RawGps {
  id: string;
  lat: any;
  lon: any;
  speed_kmh?: number | null;
  alt?: number | null;
  num_sats?: number | null;
  received_at: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __gps_raw__: Record<string, RawGps> | undefined;
}

export const OFFLINE_AFTER_MS = 10_000;

export { defaultLabel };
const OFF_ROUTE_M = 500;

export function rawGps(): Record<string, RawGps> {
  if (!global.__gps_raw__) global.__gps_raw__ = {};
  return global.__gps_raw__;
}

/** Accepta "4205.97 N", "42,5", ddmm.mmmm o decimal. */
export function toDecimal(coord: any): number | null {
  if (coord == null) return null;
  if (typeof coord === "number") return Number.isFinite(coord) ? coord : null;
  const s = String(coord).trim().replace(",", ".");
  const [value, hemi = ""] = s.split(/\s+/);
  let f = parseFloat(value);
  if (!Number.isFinite(f)) return null;
  if (Math.abs(f) > 90) {
    const deg = Math.floor(f / 100);
    f = deg + (f % 100) / 60;
  }
  return hemi === "S" || hemi === "W" ? -f : f;
}

export function ingestGps(d: any) {
  if (!d?.id) return;
  rawGps()[String(d.id)] = {
    id: String(d.id),
    lat: d.lat,
    lon: d.lon,
    speed_kmh: d.speed_kmh ?? null,
    alt: d.alt ?? null,
    num_sats: d.num_sats ?? null,
    received_at: Date.now(),
  };
}

export function positionsFor(ev: TrailEvent, now = Date.now()): GpsPosition[] {
  const raw = rawGps();
  const ids = new Set([...Object.keys(raw), ...Object.keys(ev.devices)]);
  const out: GpsPosition[] = [];
  for (const id of Array.from(ids).sort()) {
    const r = raw[id];
    const dev = ev.devices[id];
    const lat = r ? toDecimal(r.lat) : null;
    const lon = r ? toDecimal(r.lon) : null;
    const online = !!r && now - r.received_at <= OFFLINE_AFTER_MS && lat != null && lon != null;
    const race = dev?.race_id ? ev.races.find((x) => x.id === dev.race_id) : undefined;
    const runner = race && dev?.bib ? race.runners.find((x) => x.bib === dev.bib) : undefined;
    let km: number | null = null;
    let pct: number | null = null;
    let off = false;
    let grad: number | null = null;
    let ele: number | null = null;
    if (online && race?.gpx) {
      const p = projectOnTrack(race.gpx, lat!, lon!);
      off = p.off_route_m > OFF_ROUTE_M;
      km = +p.km.toFixed(2);
      pct = Math.min(100, +((p.km / race.gpx.total_km) * 100).toFixed(1));
      const g = gradientAt(race.gpx, p.km);
      grad = g.gradient_pct;
      ele = g.ele_m;
    }
    out.push({
      id,
      label: dev?.label || defaultLabel(id),
      lat: lat ?? null,
      lon: lon ?? null,
      speed_kmh: r?.speed_kmh ?? null,
      status: online ? "online" : "offline",
      last_seen: r ? new Date(r.received_at).toISOString() : null,
      race_id: dev?.race_id ?? null,
      bib: dev?.bib ?? null,
      runner_name: runner ? `${runner.first_name} ${runner.last_name}`.trim() : null,
      km,
      pct,
      off_route: off,
      gradient_pct: grad,
      ele_m: ele,
    });
  }
  return out;
}
