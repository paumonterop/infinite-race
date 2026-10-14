import type { TrailGpx } from "./types";

const R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dphi = rad(lat2 - lat1);
  const dl = rad(lon2 - lon1);
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Parseja un GPX (primer track) i calcula km acumulats i desnivell positiu. */
export function parseGpx(xml: string, fileName: string): TrailGpx {
  const pts: number[][] = [];
  const re = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>|<trkpt\b([^>]*)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const attrs = m[1] ?? m[3] ?? "";
    const lat = /lat="([^"]+)"/.exec(attrs);
    const lon = /lon="([^"]+)"/.exec(attrs);
    if (!lat || !lon) continue;
    const ele = m[2] ? /<ele>([^<]+)<\/ele>/.exec(m[2]) : null;
    pts.push([parseFloat(lat[1]), parseFloat(lon[1]), 0, ele ? parseFloat(ele[1]) : NaN]);
  }
  if (pts.length < 2) throw new Error("El GPX no conté cap track (trkpt)");

  let km = 0;
  let gain = 0;
  let lastEle = pts[0][3];
  for (let i = 1; i < pts.length; i++) {
    km += haversineM(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) / 1000;
    pts[i][2] = km;
    const e = pts[i][3];
    if (!Number.isNaN(e) && !Number.isNaN(lastEle)) {
      // llindar de 2 m per no comptar soroll del GPS
      if (Math.abs(e - lastEle) >= 2) {
        if (e > lastEle) gain += e - lastEle;
        lastEle = e;
      }
    } else if (!Number.isNaN(e)) lastEle = e;
  }
  const points = pts.map((p) => [
    +p[0].toFixed(6),
    +p[1].toFixed(6),
    +p[2].toFixed(4),
    Number.isNaN(p[3]) ? NaN : +p[3].toFixed(1),
  ]);
  return { file_name: fileName, total_km: +km.toFixed(3), elevation_gain: Math.round(gain), points };
}

/** Projecta una posició sobre la traça. Torna km sobre la traça i distància a la ruta (m). */
export function projectOnTrack(gpx: TrailGpx, lat: number, lon: number) {
  const pts = gpx.points;
  const kx = Math.cos(rad(lat)) * 111320;
  const ky = 110574;
  let best = { dist: Infinity, km: 0 };
  for (let i = 1; i < pts.length; i++) {
    const [la1, lo1, k1] = pts[i - 1];
    const [la2, lo2, k2] = pts[i];
    const ax = (lo1 - lon) * kx, ay = (la1 - lat) * ky;
    const bx = (lo2 - lon) * kx, by = (la2 - lat) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const px = ax + t * dx, py = ay + t * dy;
    const d = Math.hypot(px, py);
    if (d < best.dist) best = { dist: d, km: k1 + t * (k2 - k1) };
  }
  return { km: best.km, off_route_m: best.dist };
}

/** Versió reduïda de la traça per enviar al navegador. */
export function simplifyForClient(gpx: TrailGpx, max = 2500) {
  const step = Math.max(1, Math.ceil(gpx.points.length / max));
  const out = gpx.points.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== gpx.points[gpx.points.length - 1]) out.push(gpx.points[gpx.points.length - 1]);
  return out;
}

/** Posició (lat, lon) d'un km concret de la traça. */
export function pointAtKm(gpx: TrailGpx, km: number): [number, number] {
  const pts = gpx.points;
  if (km <= 0) return [pts[0][0], pts[0][1]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][2] >= km) {
      const [la1, lo1, k1] = pts[i - 1];
      const [la2, lo2, k2] = pts[i];
      const t = k2 === k1 ? 0 : (km - k1) / (k2 - k1);
      return [la1 + t * (la2 - la1), lo1 + t * (lo2 - lo1)];
    }
  }
  const l = pts[pts.length - 1];
  return [l[0], l[1]];
}

/** Pendent (%) i altitud (m) a un km de la traça, mesurats sobre una finestra de +-100 m. */
export function gradientAt(gpx: TrailGpx, km: number): { gradient_pct: number; ele_m: number | null } {
  const eleAt = (k: number): number | null => {
    const pts = gpx.points;
    if (k <= pts[0][2]) return pts[0][3] ?? null;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][2] >= k) {
        const k1 = pts[i - 1][2], e1 = pts[i - 1][3];
        const k2 = pts[i][2], e2 = pts[i][3];
        if (e1 == null || e2 == null || Number.isNaN(e1) || Number.isNaN(e2)) return null;
        return k2 === k1 ? e2 : e1 + ((k - k1) / (k2 - k1)) * (e2 - e1);
      }
    }
    return pts[pts.length - 1][3] ?? null;
  };
  const a = Math.max(0, km - 0.1);
  const b = Math.min(gpx.total_km, km + 0.1);
  const ea = eleAt(a);
  const eb = eleAt(b);
  const here = eleAt(km);
  const ele = here == null ? null : Math.round(here);
  if (ea == null || eb == null || b - a <= 0) return { gradient_pct: 0, ele_m: ele };
  return { gradient_pct: +(((eb - ea) / ((b - a) * 1000)) * 100).toFixed(1), ele_m: ele };
}

/** Com projectOnTrack, però només sobre el tram entre els km k0 i k1 (evita ambigüitats si el track passa dos cops pel mateix lloc). */
export function projectOnTrackRange(gpx: TrailGpx, lat: number, lon: number, k0: number, k1: number) {
  const pts = gpx.points;
  const kx = Math.cos(rad(lat)) * 111320;
  const ky = 110574;
  let best: { dist: number; km: number } | null = null;
  for (let i = 1; i < pts.length; i++) {
    const [la1, lo1, ka] = pts[i - 1];
    const [la2, lo2, kb] = pts[i];
    if (kb < k0 - 0.3 || ka > k1 + 0.3) continue;
    const ax = (lo1 - lon) * kx, ay = (la1 - lat) * ky;
    const bx = (lo2 - lon) * kx, by = (la2 - lat) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const tt = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const d = Math.hypot(ax + tt * dx, ay + tt * dy);
    if (!best || d < best.dist) best = { dist: d, km: ka + tt * (kb - ka) };
  }
  return best ? { km: Math.min(k1, Math.max(k0, best.km)), off_route_m: best.dist } : null;
}
