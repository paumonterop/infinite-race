import { projectOnTrack } from "./gpx";
import type { TrailRace } from "./types";

// Port de l'anàlisi de GPX de gfx-suite-onon (gpx_analysis.py): estadístiques de desnivell, trams d'1 km amb pendent
// i tecnicitat, i col·locació dels controls sobre la traça. La superfície (OpenStreetMap) no s'hi inclou.

export interface SlopeSegment {
  km_start: number;
  km_end: number;
  gain_m: number;
  loss_m: number;
  slope_pct_avg: number;
  slope_variability: number;
  technicity_score: number;
}

export interface PlacedCheckpoint {
  name: string;
  km_on_track: number;
  ele: number | null;
}

export interface Analysis {
  distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  min_elevation_m: number;
  max_elevation_m: number;
  technicity_score: number;
  /** [lat, lon, ele, km] reduït */
  points: number[][];
  slope_segments: SlopeSegment[];
  checkpoints: PlacedCheckpoint[];
}

const cache = new Map<string, Analysis>();

function movingAverage(v: number[], w = 5) {
  if (v.length < w) return v;
  const pad = Math.floor(w / 2);
  const out: number[] = [];
  for (let i = 0; i < v.length; i++) {
    let s = 0;
    for (let k = -pad; k < w - pad; k++) s += v[Math.min(v.length - 1, Math.max(0, i + k))];
    out.push(s / w);
  }
  return out;
}

const std = (v: number[]) => {
  if (v.length < 2) return 0;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
};

export function analyze(race: TrailRace): Analysis | null {
  const gpx = race.gpx;
  if (!gpx) return null;
  const key = `${race.id}:${gpx.file_name}:${gpx.points.length}:${gpx.total_km}:${race.checkpoints.map((c) => c.id + c.km).join(",")}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const pts = gpx.points.filter((p) => p[3] != null && !Number.isNaN(p[3])); // [lat,lon,km,ele]
  if (pts.length < 2) return null;
  const total = gpx.total_km;

  const eles = pts.map((p) => p[3]);
  const sm = movingAverage(eles, 5);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < sm.length; i++) {
    const d = sm[i] - sm[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }

  // trams d'1 km
  const segments: SlopeSegment[] = [];
  const n = Math.max(1, Math.ceil(total));
  let idx = 0;
  for (let s = 0; s < n; s++) {
    const a = s;
    const b = Math.min(s + 1, total);
    while (idx < pts.length && pts[idx][2] < a) idx++;
    let j = idx;
    const seg: number[][] = [];
    while (j < pts.length && pts[j][2] <= b) seg.push(pts[j++]);
    if (seg.length < 2) continue;
    let g = 0;
    let l = 0;
    const slopes: number[] = [];
    for (let i = 1; i < seg.length; i++) {
      const de = seg[i][3] - seg[i - 1][3];
      if (de > 0) g += de;
      else l -= de;
      const dm = Math.max((seg[i][2] - seg[i - 1][2]) * 1000, 0.01);
      slopes.push((de / dm) * 100);
    }
    const horiz = (seg[seg.length - 1][2] - seg[0][2]) * 1000;
    const avg = horiz > 0 ? ((g - l) / horiz) * 100 : 0;
    const variability = slopes.length > 1 ? std(slopes) : 0;
    segments.push({
      km_start: +a.toFixed(2),
      km_end: +b.toFixed(2),
      gain_m: +g.toFixed(1),
      loss_m: +l.toFixed(1),
      slope_pct_avg: +avg.toFixed(1),
      slope_variability: +variability.toFixed(1),
      technicity_score: +Math.min(100, Math.abs(avg) * 2.5 + variability * 1.5).toFixed(1),
    });
  }

  // punts reduïts per al navegador
  const step = Math.max(1, Math.ceil(pts.length / 1800));
  const points = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((p) => [p[0], p[1], +p[3].toFixed(1), +p[2].toFixed(3)]);

  const eleAt = (km: number) => {
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[2] - km) < Math.abs(best[2] - km)) best = p;
    return best[3];
  };
  const placed: PlacedCheckpoint[] = race.checkpoints.map((c) => {
    const km = c.lat != null && c.lon != null ? projectOnTrack(gpx, c.lat, c.lon).km : c.km;
    return { name: c.name, km_on_track: +km.toFixed(2), ele: +eleAt(km).toFixed(0) };
  });

  const out: Analysis = {
    distance_km: +total.toFixed(2),
    elevation_gain_m: +gain.toFixed(0),
    elevation_loss_m: +loss.toFixed(0),
    min_elevation_m: +Math.min(...eles).toFixed(0),
    max_elevation_m: +Math.max(...eles).toFixed(0),
    technicity_score: segments.length ? +(segments.reduce((a, s) => a + s.technicity_score, 0) / segments.length).toFixed(1) : 0,
    points,
    slope_segments: segments,
    checkpoints: placed,
  };
  cache.set(key, out);
  return out;
}
