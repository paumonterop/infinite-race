import type { Analysis, SlopeSegment } from "./analysis";

/** Un tram entre dos controls consecutius (Sortida → 1r control, …, últim control → Meta). Codi pur (client i servidor). */
export interface CpSegment {
  km_start: number;
  km_end: number;
  name: string;
  from: string;
  to: string;
  type: "UPHILL" | "DOWNHILL";
  gain_m: number;
  loss_m: number;
}

function sumOverRange(segs: SlopeSegment[], a: number, b: number) {
  let gain = 0;
  let loss = 0;
  for (const s of segs) {
    const lo = Math.max(s.km_start, a);
    const hi = Math.min(s.km_end, b);
    if (hi <= lo) continue;
    const f = (hi - lo) / (s.km_end - s.km_start);
    gain += s.gain_m * f;
    loss += s.loss_m * f;
  }
  return { gain, loss };
}

export function checkpointSegments(a: Analysis): CpSegment[] {
  const pts = [
    { name: "Sortida", km: 0 },
    ...[...a.checkpoints].sort((x, y) => x.km_on_track - y.km_on_track).map((c) => ({ name: c.name, km: c.km_on_track })),
    { name: "Meta", km: a.distance_km },
  ].filter((p, i, arr) => i === 0 || p.km - arr[i - 1].km > 0.01);
  const out: CpSegment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const { gain, loss } = sumOverRange(a.slope_segments, pts[i].km, pts[i + 1].km);
    out.push({
      km_start: Math.round(pts[i].km * 100) / 100,
      km_end: Math.round(pts[i + 1].km * 100) / 100,
      name: `${pts[i].name} → ${pts[i + 1].name}`,
      from: pts[i].name,
      to: pts[i + 1].name,
      type: gain >= loss ? "UPHILL" : "DOWNHILL",
      gain_m: Math.round(gain),
      loss_m: Math.round(loss),
    });
  }
  return out;
}
