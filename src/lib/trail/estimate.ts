import { analyze } from "./analysis";
import { pointAtKm } from "./gpx";
import type { TrailRace, TrailRunner } from "./types";

/**
 * Posició estimada en directe dels primers d'una cursa.
 *
 * LiveTrail només publica passos reals per control. Aquí s'estima on és cada atleta ARA entre dos controls:
 *  - el seu ritme es mesura en «km plans equivalents» (Naismith: +1 km per cada 100 m de pujada, baixada que ajuda amb
 *    tope), de manera que una pujada dura i un tram ràpid es comparen bé;
 *  - ritme = 30 % del darrer tram + 70 % de tota la cursa fins ara, amb un 5 % de fatiga;
 *  - des de l'últim control s'avança en distància equivalent fins ara, sense passar del proper control
 *    (si va endarrerit en un pas, es queda just abans del control).
 */

export interface Leader {
  rank: number;
  bib: string;
  name: string;
  sex: "M" | "F" | "";
  status: "RUNNING" | "FINISHED";
  km: number; // km sobre la traça (GPX)
  lat: number;
  lon: number;
  ele: number | null;
  estimated: boolean; // false = just al control (posició real)
  last_point: string | null;
  last_at: string | null;
  next_point: string | null;
  next_eta: string | null; // hora prevista de pas pel proper control
  race_time_s: number | null; // temps al darrer control (o a meta)
  speed_kmh: number | null; // ritme estimat sobre el terreny
}

/** Paràmetres del model (es poden calibrar amb una cursa passada). */
export interface EstimateOpts {
  /** pes del ritme del darrer tram respecte al de tota la cursa (0-1) */
  wLast: number;
  /** factor de fatiga aplicat al ritme del tram següent (1 = igual; 0,95 = 5 % més lent) */
  fatigue: number;
}
// Calibrats amb les edicions 2023-2025 (error mig de l'hora de pas: 3-7 min, uns 9-16 % del tram).
export const DEFAULT_OPTS: EstimateOpts = { wLast: 0.3, fatigue: 0.95 };

interface Curve {
  total: number; // km del GPX
  E: (km: number) => number;
  invE: (e: number) => number;
}

const curves = new Map<string, Curve>();

function equivalent(len: number, gain: number, loss: number) {
  return Math.max(len + gain / 100 - Math.min(loss / 300, len * 0.3), len * 0.4);
}

function curveFor(race: TrailRace): Curve | null {
  const a = analyze(race);
  if (!a || !race.gpx) return null;
  const key = `${race.id}:${race.gpx.file_name}:${race.gpx.total_km}`;
  const hit = curves.get(key);
  if (hit) return hit;
  // distància equivalent acumulada als límits de cada tram d'1 km
  const kms: number[] = [0];
  const eqs: number[] = [0];
  for (const s of a.slope_segments) {
    const len = s.km_end - s.km_start;
    if (len <= 0) continue;
    if (Math.abs(kms[kms.length - 1] - s.km_start) > 1e-6) {
      // forat entre trams: es tracta com a pla
      kms.push(s.km_start);
      eqs.push(eqs[eqs.length - 1] + (s.km_start - kms[kms.length - 2]));
    }
    kms.push(s.km_end);
    eqs.push(eqs[eqs.length - 1] + equivalent(len, s.gain_m, s.loss_m));
  }
  const interp = (xs: number[], ys: number[], x: number) => {
    if (x <= xs[0]) return ys[0];
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i]) {
        const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1);
        return ys[i - 1] + t * (ys[i] - ys[i - 1]);
      }
    }
    return ys[ys.length - 1];
  };
  const c: Curve = { total: race.gpx.total_km, E: (km) => interp(kms, eqs, km), invE: (e) => interp(eqs, kms, e) };
  curves.set(key, c);
  return c;
}

interface Traj {
  km: number;
  t: number; // ms
  id: number;
}

/** Controls amb km sobre la traça (GPX): els km oficials de LiveTrail s'escalen a la longitud real del GPX. */
function checkpointKms(race: TrailRace, total: number) {
  const cps = race.checkpoints;
  const last = cps.length ? cps[cps.length - 1].km : total;
  const k = last > 0 ? total / last : 1;
  return cps.map((c) => ({ id: c.id, name: c.name, km: c.km * k }));
}

export function estimate(runner: TrailRunner, race: TrailRace, now: number, curve: Curve | null, opts: EstimateOpts = DEFAULT_OPTS): Omit<Leader, "rank"> | null {
  if (!race.gpx) return null;
  const total = race.gpx.total_km;
  const cps = checkpointKms(race, total);
  const E = curve ? curve.E : (km: number) => km;
  const invE = curve ? curve.invE : (e: number) => e;

  // passos coneguts a l'instant `now` (permet reproduir una cursa passada), ordenats per control
  const byId = new Map(runner.passings.map((p) => [p.point_id, p]));
  const known: Traj[] = [];
  for (const c of cps) {
    const p = byId.get(c.id);
    if (!p) continue;
    const t = new Date(p.at).getTime();
    if (t <= now) known.push({ km: c.km, t, id: c.id });
  }
  if (known.length === 0) return null;
  // sortida: hora d'arribada al primer control menys el seu temps de cursa
  const first = runner.passings.find((p) => p.point_id === known[0].id)!;
  const startT = new Date(first.at).getTime() - first.seconds * 1000;
  const pts: Traj[] = [{ km: 0, t: startT, id: 0 }, ...known];

  const k = pts.length - 1;
  const lastPt = pts[k];
  const finishKm = cps.length ? cps[cps.length - 1].km : total;
  const finished = lastPt.km >= finishKm - 0.01;
  const nextCp = cps.find((c) => c.km > lastPt.km + 0.001) ?? null;
  const lastCp = cps.find((c) => c.id === lastPt.id) ?? null;

  const dtAll = lastPt.t - pts[0].t;
  const vAll = dtAll > 0 ? E(lastPt.km) / dtAll : 0; // km equivalents per ms
  let v = vAll;
  if (k >= 2) {
    const dt = lastPt.t - pts[k - 1].t;
    const vLast = dt > 0 ? (E(lastPt.km) - E(pts[k - 1].km)) / dt : 0;
    if (vLast > 0) v = vAll > 0 ? opts.wLast * vLast + (1 - opts.wLast) * vAll : vLast;
  }
  v *= opts.fatigue;

  let km = lastPt.km;
  let estimated = false;
  let nextEta: string | null = null;
  if (!finished && v > 0) {
    const eNext = nextCp ? E(nextCp.km) : E(finishKm);
    const eNow = E(lastPt.km) + v * Math.max(0, now - lastPt.t);
    if (now > lastPt.t) {
      km = invE(Math.min(eNow, eNext));
      estimated = true;
    }
    nextEta = new Date(lastPt.t + (eNext - E(lastPt.km)) / v).toISOString();
  }
  if (finished) km = Math.min(total, km);

  const [lat, lon] = pointAtKm(race.gpx, Math.min(km, total));
  const ele = (() => {
    const pts2 = race.gpx.points;
    let best = pts2[0];
    for (const p of pts2) if (Math.abs(p[2] - km) < Math.abs(best[2] - km)) best = p;
    return best[3] == null || Number.isNaN(best[3]) ? null : Math.round(best[3]);
  })();

  // ritme sobre el terreny (km/h reals) del darrer tram
  let kmh: number | null = null;
  if (k >= 1) {
    const dt = lastPt.t - pts[k - 1].t;
    if (dt > 0) kmh = +(((lastPt.km - pts[k - 1].km) / dt) * 3_600_000).toFixed(1);
  }

  return {
    bib: runner.bib,
    name: `${runner.first_name} ${runner.last_name}`.trim(),
    sex: runner.sex,
    status: finished ? "FINISHED" : "RUNNING",
    km: +km.toFixed(2),
    lat,
    lon,
    ele,
    estimated,
    last_point: lastCp?.name ?? null,
    last_at: new Date(lastPt.t).toISOString(),
    next_point: finished ? null : nextCp?.name ?? null,
    next_eta: nextEta,
    race_time_s: Math.round((lastPt.t - startT) / 1000),
    speed_kmh: kmh,
  };
}

/** Els `n` primers de la cursa (general o per sexe) amb la seva posició estimada ara. */
export function leadersOf(race: TrailRace, n: number, sex: "all" | "M" | "F", now = Date.now(), opts: EstimateOpts = DEFAULT_OPTS): Leader[] {
  const curve = curveFor(race);
  const list: Omit<Leader, "rank">[] = [];
  for (const r of race.runners) {
    if (r.status === "DNF" || r.status === "DNS") continue;
    if (sex !== "all" && r.sex !== sex) continue;
    const e = estimate(r, race, now, curve, opts);
    if (e) list.push(e);
  }
  // arribats primer (per temps), després qui va més lluny
  list.sort((a, b) => {
    if (a.status !== b.status) return a.status === "FINISHED" ? -1 : 1;
    if (a.status === "FINISHED") return (a.race_time_s ?? 0) - (b.race_time_s ?? 0);
    return b.km - a.km || (a.race_time_s ?? 0) - (b.race_time_s ?? 0);
  });
  return list.slice(0, n).map((x, i) => ({ ...x, rank: i + 1 }));
}
