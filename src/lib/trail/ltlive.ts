import { leadersOf, type EstimateOpts, DEFAULT_OPTS, type Leader } from "./estimate";
import { pointAtKm, projectOnTrackRange } from "./gpx";
import { lt } from "./livetrail";
import type { TrailEvent, TrailRace } from "./types";

/**
 * Posició en directe dels primers d'una cursa a partir de les dades de LiveTrail, com fa la seva web:
 *  1. GPS (`lastLocation` de fa menys de 10 min): es projecta sobre el track dins del tram [últim punt, proper punt];
 *  2. si no, previsió de LiveTrail: interpolació en el temps entre l'últim pas real i el pas previst del proper punt;
 *  3. si LiveTrail no dona res, es manté la nostra estimació pròpia (estimate.ts).
 * LiveTrail només inclou el top 3 del general i el top 3 de dones a `head-runners`; la resta es consulta a
 * `events/runners/<dorsal>/detail`, que té les previsions de qualsevol atleta.
 */

interface LtPassage {
  pointId: number;
  dateTime: string;
}
interface LtHead {
  bib: number;
  sex: "MALE" | "FEMALE";
  status: string;
  lastPassage?: LtPassage;
  nextPassage?: LtPassage;
  lastLocation?: { dateTime: string; lat: number; lon: number; origin?: string };
}
interface LtDetail {
  status: string;
  passings: { pointId: number; dateTime: string }[];
  predictions: LtPassage[] | null;
}

const HEAD_TTL = 8_000;
const DETAIL_TTL = 20_000;
const GPS_MAX_AGE_MS = 600_000;
const GPS_MAX_OFF_M = 400;

const heads = new Map<string, { at: number; p: Promise<LtHead[] | null> }>();
const details = new Map<string, { at: number; p: Promise<LtDetail | null> }>();

function cached<T>(store: Map<string, { at: number; p: Promise<T> }>, key: string, ttl: number, load: () => Promise<T>) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.p;
  const p = load();
  store.set(key, { at: Date.now(), p });
  return p;
}

function headRunners(tenant: string, raceId: string) {
  return cached(heads, `${tenant}:${raceId}`, HEAD_TTL, async () => {
    const d = await lt<{ scratch?: LtHead[]; female?: LtHead[] }>(tenant, `events/races/${raceId}/head-runners`).catch(() => null);
    return d ? [...(d.scratch ?? []), ...(d.female ?? [])] : null;
  });
}

function runnerDetail(tenant: string, bib: string) {
  return cached(details, `${tenant}:${bib}`, DETAIL_TTL, async () => lt<LtDetail>(tenant, `events/runners/${bib}/detail`).catch(() => null));
}

const t = (iso: string | undefined) => (iso ? new Date(iso).getTime() : NaN);

/** km sobre el GPX de cada punt de LiveTrail (els km oficials s'escalen a la longitud real del GPX) */
function pointKms(race: TrailRace) {
  const total = race.gpx!.total_km;
  const cps = race.checkpoints;
  const last = cps.length ? cps[cps.length - 1].km : total;
  const k = last > 0 ? total / last : 1;
  const m = new Map<number, number>([[0, 0]]);
  for (const c of cps) m.set(c.id, c.km * k);
  return m;
}

interface Pos {
  km: number;
  origin: "gps" | "livetrail";
  nextEta: string | null;
}

function locate(
  race: TrailRace,
  kms: Map<number, number>,
  last: LtPassage | undefined,
  next: LtPassage | undefined,
  loc: LtHead["lastLocation"] | undefined,
  now: number
): Pos | null {
  if (!last) return null;
  const kLast = kms.get(last.pointId);
  const kNext = next ? kms.get(next.pointId) : undefined;
  if (kLast == null) return null;
  if (!next || kNext == null || !(kNext > kLast)) return { km: kLast, origin: "livetrail", nextEta: null };

  if (loc && now - t(loc.dateTime) <= GPS_MAX_AGE_MS) {
    const p = projectOnTrackRange(race.gpx!, loc.lat, loc.lon, kLast, kNext);
    if (p && p.off_route_m <= GPS_MAX_OFF_M) return { km: p.km, origin: "gps", nextEta: next.dateTime };
  }
  const tl = t(last.dateTime);
  const tn = t(next.dateTime);
  if (!(tn > tl)) return { km: kLast, origin: "livetrail", nextEta: next.dateTime };
  const pct = Math.min(1, Math.max(0, (now - tl) / (tn - tl)));
  return { km: kLast + pct * (kNext - kLast), origin: "livetrail", nextEta: next.dateTime };
}

/**
 * Els `n` primers (general o per sexe) amb la millor posició disponible: GPS > previsió de LiveTrail > model propi.
 * `now` sempre és «ara»: per reproduir una cursa passada s'utilitza leadersOf (model propi).
 */
export async function leadersLive(ev: TrailEvent, race: TrailRace, n: number, sex: "all" | "M" | "F", opts: EstimateOpts = DEFAULT_OPTS): Promise<Leader[]> {
  const now = Date.now();
  const base = leadersOf(race, n, sex, now, opts);
  if (!race.gpx || base.length === 0 || race.status === "NOT_LAUNCHED") return base;

  const tenant = ev.livetrail.tenant;
  const kms = pointKms(race);
  const head = await headRunners(tenant, race.id);
  const headByBib = new Map((head ?? []).map((h) => [String(h.bib), h]));

  // atletes en cursa que no són al top de LiveTrail: se'n demana la fitxa (previsions)
  const needDetail = base.filter((l) => l.status === "RUNNING" && !headByBib.has(l.bib));
  const dets = await Promise.all(needDetail.map((l) => runnerDetail(tenant, l.bib)));
  const detByBib = new Map(needDetail.map((l, i) => [l.bib, dets[i]]));

  const out = base.map((l): Leader => {
    if (l.status === "FINISHED") return { ...l, origin: "model" };
    let pos: Pos | null = null;
    const h = headByBib.get(l.bib);
    if (h && h.status === "ON_RACE") {
      pos = locate(race, kms, h.lastPassage, h.nextPassage, h.lastLocation, now);
    } else {
      const d = detByBib.get(l.bib);
      if (d && d.status === "ON_RACE" && d.passings?.length) {
        const sorted = [...d.passings].sort((a, b) => t(a.dateTime) - t(b.dateTime));
        const last = sorted[sorted.length - 1];
        const next = (d.predictions ?? []).find((p) => t(p.dateTime) > t(last.dateTime) && (kms.get(p.pointId) ?? -1) > (kms.get(last.pointId) ?? 1e9));
        pos = locate(race, kms, last, next, undefined, now);
      }
    }
    if (!pos) return { ...l, origin: "model" };
    const km = Math.min(race.gpx!.total_km, pos.km);
    const [lat, lon] = pointAtKm(race.gpx!, km);
    return { ...l, km: +km.toFixed(2), lat, lon, origin: pos.origin, estimated: pos.origin !== "gps", next_eta: pos.nextEta ?? l.next_eta };
  });

  // l'ordre és el de la posició a la cursa (qui va més endavant); els arribats, primer
  out.sort((a, b) => {
    if (a.status !== b.status) return a.status === "FINISHED" ? -1 : 1;
    if (a.status === "FINISHED") return (a.race_time_s ?? 0) - (b.race_time_s ?? 0);
    return b.km - a.km;
  });
  return out.map((x, i) => ({ ...x, rank: i + 1 }));
}
