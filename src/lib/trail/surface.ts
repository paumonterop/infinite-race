import fs from "fs";
import path from "path";
import type { TrailGpx } from "./types";

// Superfície del recorregut a partir d'OpenStreetMap (port de gfx-suite-onon/osm_surface.py): es demanen a Overpass
// les vies (highway=*) que envolten la traça, es classifica cada via i s'assigna a cada tram la via més propera.

export const SURFACE_ORDER = ["Road", "Forestry road", "Trail", "Hiking trail", "Mountain trail", "Unknown"] as const;
export type SurfaceType = (typeof SURFACE_ORDER)[number];

export const SURFACE_LABELS: Record<SurfaceType, string> = {
  Road: "Asfalt / carretera",
  "Forestry road": "Pista forestal",
  Trail: "Corriol",
  "Hiking trail": "Camí de senderisme",
  "Mountain trail": "Camí de muntanya",
  Unknown: "Sense dades",
};

export interface SurfaceSegment {
  km_start: number;
  km_end: number;
  surface_type: SurfaceType;
}

export interface SurfaceResult {
  status: "ready";
  computed_at: string;
  matched_pct: number;
  n_ways: number;
  segments: SurfaceSegment[];
  distribution_km: Record<SurfaceType, number>;
}

export type SurfaceState = SurfaceResult | { status: "pending" } | { status: "error"; error: string } | { status: "none" };

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const CHUNK_MAX_DEG = 0.12;
const BBOX_PAD_DEG = 0.0006;
const SAMPLE_STEP_KM = 0.05;
const MAX_MATCH_DIST_M = 25;
const MIN_RUN_SAMPLES = 2;

const PAVED = new Set(["asphalt", "paved", "concrete", "concrete:plates", "concrete:lanes", "paving_stones", "sett", "cobblestone", "unhewn_cobblestone", "bricks", "chipseal", "metal", "tartan"]);
const ROAD = new Set(["motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link", "tertiary", "tertiary_link", "unclassified", "residential", "living_street", "service", "road", "pedestrian"]);
const PATH = new Set(["path", "footway", "bridleway", "steps", "cycleway"]);
const MOUNTAIN_SAC = new Set(["mountain_hiking", "demanding_mountain_hiking", "alpine_hiking", "demanding_alpine_hiking", "difficult_alpine_hiking"]);

export function classifyWay(tags: Record<string, string>): SurfaceType | null {
  const hw = tags.highway;
  const surface = tags.surface;
  const paved = surface != null && PAVED.has(surface);
  const knownUnpaved = surface != null && !paved;
  if (tags.footway === "sidewalk" || tags.footway === "crossing") return null;
  if (hw && ROAD.has(hw)) return knownUnpaved ? "Forestry road" : "Road";
  if (hw === "track") return paved || tags.tracktype === "grade1" ? "Road" : "Forestry road";
  if (hw && PATH.has(hw)) {
    if (paved && hw !== "steps") return "Road";
    if (tags.sac_scale && MOUNTAIN_SAC.has(tags.sac_scale)) return "Mountain trail";
    if (tags.sac_scale === "hiking") return "Hiking trail";
    return "Trail";
  }
  return null;
}

function chunkBoxes(pts: number[][]) {
  const boxes: number[][] = [];
  let s = 0, w = 0, n = 0, e = 0, started = false;
  for (const p of pts) {
    const [lat, lon] = p;
    if (!started) {
      s = n = lat;
      w = e = lon;
      started = true;
      continue;
    }
    const ns = Math.min(s, lat), nn = Math.max(n, lat), nw = Math.min(w, lon), ne = Math.max(e, lon);
    if (nn - ns > CHUNK_MAX_DEG || ne - nw > CHUNK_MAX_DEG) {
      boxes.push([s, w, n, e]);
      s = n = lat;
      w = e = lon;
    } else {
      s = ns; n = nn; w = nw; e = ne;
    }
  }
  if (started) boxes.push([s, w, n, e]);
  return boxes.map(([s2, w2, n2, e2]) => [s2 - BBOX_PAD_DEG, w2 - BBOX_PAD_DEG, n2 + BBOX_PAD_DEG, e2 + BBOX_PAD_DEG]);
}

async function overpass(query: string): Promise<any[]> {
  let last = "cap servidor ha respost";
  for (const url of OVERPASS) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "gfx-sports/1.0 (analisi de cursa)" },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(45000),
      });
      if (r.ok) return ((await r.json()) as any).elements ?? [];
      last = r.status === 429 || r.status >= 502 ? "OpenStreetMap està saturat ara mateix" : `OpenStreetMap ha respost amb l'error ${r.status}`;
    } catch (e: any) {
      last = e?.name === "TimeoutError" ? "El servidor d'OpenStreetMap ha trigat massa a respondre" : "No s'ha pogut connectar amb OpenStreetMap";
    }
  }
  throw new Error(last);
}

export async function computeSurface(gpx: TrailGpx): Promise<SurfaceResult> {
  const pts = gpx.points; // [lat, lon, km, ele]
  const total = gpx.total_km;
  const ways = new Map<number, any>();
  for (const [s, w, n, e] of chunkBoxes(pts)) {
    const q = `[out:json][timeout:30];way["highway"](${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)});out tags geom;`;
    for (const el of await overpass(q)) if (el.type === "way" && el.geometry) ways.set(el.id, el);
  }

  // mostres cada 50 m
  const kms: number[] = [];
  for (let k = 0; k < total; k += SAMPLE_STEP_KM) kms.push(k);
  kms.push(total);
  const lats: number[] = [];
  const lons: number[] = [];
  let j = 1;
  for (const k of kms) {
    while (j < pts.length - 1 && pts[j][2] < k) j++;
    const [la1, lo1, k1] = pts[j - 1];
    const [la2, lo2, k2] = pts[j];
    const t = k2 === k1 ? 0 : Math.min(1, Math.max(0, (k - k1) / (k2 - k1)));
    lats.push(la1 + t * (la2 - la1));
    lons.push(lo1 + t * (lo2 - lo1));
  }
  const lat0 = lats.reduce((a, b) => a + b, 0) / lats.length;
  const lon0 = lons.reduce((a, b) => a + b, 0) / lons.length;
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111320;
  const ky = 110540;

  const sx1: number[] = [], sy1: number[] = [], sx2: number[] = [], sy2: number[] = [], scat: SurfaceType[] = [];
  for (const way of Array.from(ways.values())) {
    const cat = classifyWay(way.tags ?? {});
    if (!cat) continue;
    const g = way.geometry;
    for (let i = 0; i < g.length - 1; i++) {
      sx1.push((g[i].lon - lon0) * kx); sy1.push((g[i].lat - lat0) * ky);
      sx2.push((g[i + 1].lon - lon0) * kx); sy2.push((g[i + 1].lat - lat0) * ky);
      scat.push(cat);
    }
  }

  const labels: SurfaceType[] = [];
  let matched = 0;
  for (let i = 0; i < lats.length; i++) {
    const px = (lons[i] - lon0) * kx;
    const py = (lats[i] - lat0) * ky;
    let best = Infinity;
    let bi = -1;
    for (let s = 0; s < scat.length; s++) {
      const dx = sx2[s] - sx1[s];
      const dy = sy2[s] - sy1[s];
      const l2 = dx * dx + dy * dy || 1e-9;
      const t = Math.min(1, Math.max(0, ((px - sx1[s]) * dx + (py - sy1[s]) * dy) / l2));
      const d2 = (px - (sx1[s] + t * dx)) ** 2 + (py - (sy1[s] + t * dy)) ** 2;
      if (d2 < best) {
        best = d2;
        bi = s;
      }
    }
    if (bi >= 0 && best <= MAX_MATCH_DIST_M ** 2) {
      labels.push(scat[bi]);
      matched++;
    } else labels.push("Unknown");
  }

  // agrupa consecutius i absorbeix trams massa curts
  let runs: [SurfaceType, number, number][] = [];
  labels.forEach((lab, i) => {
    if (runs.length && runs[runs.length - 1][0] === lab) runs[runs.length - 1][2] = i;
    else runs.push([lab, i, i]);
  });
  let changed = true;
  while (changed && runs.length > 1) {
    changed = false;
    for (let k = 0; k < runs.length; k++) {
      if (runs[k][2] - runs[k][1] + 1 < MIN_RUN_SAMPLES) {
        runs[k][0] = (k > 0 ? runs[k - 1] : runs[k + 1])[0];
        changed = true;
        break;
      }
    }
    const merged: [SurfaceType, number, number][] = [];
    for (const r of runs) {
      if (merged.length && merged[merged.length - 1][0] === r[0]) merged[merged.length - 1][2] = r[2];
      else merged.push([...r]);
    }
    runs = merged;
  }

  const segments: SurfaceSegment[] = runs.map(([lab, i0, i1]) => ({
    km_start: +(i0 === 0 ? 0 : (kms[i0 - 1] + kms[i0]) / 2).toFixed(3),
    km_end: +(i1 === kms.length - 1 ? total : (kms[i1] + kms[i1 + 1]) / 2).toFixed(3),
    surface_type: lab,
  }));
  const dist = Object.fromEntries(SURFACE_ORDER.map((c) => [c, 0])) as Record<SurfaceType, number>;
  for (const s of segments) dist[s.surface_type] += s.km_end - s.km_start;
  for (const c of SURFACE_ORDER) dist[c] = +dist[c].toFixed(1);

  return {
    status: "ready",
    computed_at: new Date().toISOString(),
    matched_pct: +((100 * matched) / kms.length).toFixed(1),
    n_ways: ways.size,
    segments,
    distribution_km: dist,
  };
}

// ── memòria cau (en memòria + disc) i estat del càlcul ──
const DIR = path.join(process.cwd(), "data", "surface");
const mem = new Map<string, SurfaceState>();
const running = new Set<string>();

const keyOf = (eventId: string, raceId: string, gpx: TrailGpx) => `${eventId}__${raceId}__${gpx.file_name.replace(/[^a-z0-9.-]/gi, "_")}__${gpx.total_km}`;

export function surfaceState(eventId: string, raceId: string, gpx: TrailGpx | null): SurfaceState {
  if (!gpx) return { status: "none" };
  const key = keyOf(eventId, raceId, gpx);
  const m = mem.get(key);
  if (m) return m;
  const f = path.join(DIR, key + ".json");
  try {
    if (fs.existsSync(f)) {
      const d = JSON.parse(fs.readFileSync(f, "utf-8")) as SurfaceResult;
      mem.set(key, d);
      return d;
    }
  } catch {
    /* es recalcula */
  }
  return { status: "none" };
}

/** Llança el càlcul en segon pla (idempotent). Es consulta amb surfaceState. */
export function startSurface(eventId: string, raceId: string, gpx: TrailGpx, force = false) {
  const key = keyOf(eventId, raceId, gpx);
  if (running.has(key)) return;
  // surfaceState també carrega la còpia del disc: un GPX ja analitzat mai es torna a consultar a OpenStreetMap.
  if (!force && surfaceState(eventId, raceId, gpx).status === "ready") return;
  running.add(key);
  mem.set(key, { status: "pending" });
  computeSurface(gpx)
    .then((r) => {
      mem.set(key, r);
      try {
        fs.mkdirSync(DIR, { recursive: true });
        fs.writeFileSync(path.join(DIR, key + ".json"), JSON.stringify(r));
      } catch {
        /* només és cache */
      }
    })
    .catch((e) => mem.set(key, { status: "error", error: e?.message ?? String(e) }))
    .finally(() => running.delete(key));
}
