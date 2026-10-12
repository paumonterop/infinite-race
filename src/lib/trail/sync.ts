import { emitUpdate } from "@/lib/io";
import { knownPassings, pushNewPassings } from "./feed";
import { lt, ltPassings, ltSummaries } from "./livetrail";
import { persistTrail, trailStore } from "./store";
import type { Checkpoint, Passing, TrailEvent, TrailRace, TrailRunner } from "./types";

const COLORS = ["#fc5a00", "#0ea5e9", "#22c55e", "#a855f7", "#eab308", "#ec4899"];
const POLL_LIVE_MS = 10_000;
const POLL_IDLE_MS = 60_000;
const WINDOW_BEFORE_MS = 15 * 60_000;
const WINDOW_AFTER_MS = 14 * 3600_000;

const nextDue = new Map<string, number>();
const running = new Map<string, Promise<void>>();

export function inLiveWindow(race: TrailRace, now = Date.now()) {
  if (!race.start_iso) return false;
  const d = now - new Date(race.start_iso).getTime();
  return d >= -WINDOW_BEFORE_MS && d <= WINDOW_AFTER_MS;
}

/** Crea/actualitza les curses d'un esdeveniment a partir de LiveTrail (sense tocar GPX ni atletes). */
export async function discoverRaces(ev: TrailEvent) {
  const sums = await ltSummaries(ev.livetrail.tenant);
  sums.forEach((s, i) => {
    let r = ev.races.find((x) => x.id === s.raceId);
    if (!r) {
      r = {
        id: s.raceId,
        name: "",
        color: COLORS[i % COLORS.length],
        start_iso: null,
        distance_m: null,
        elevation_gain: null,
        status: "NOT_LAUNCHED",
        checkpoints: [],
        runners: [],
        gpx: null,
      };
      ev.races.push(r);
    }
    r.name = s.fullname || s.shortname || s.raceId;
    if (s.color) r.color = s.color;
    r.start_iso = s.startDate ?? r.start_iso;
    r.distance_m = s.distance ?? r.distance_m;
    r.elevation_gain = s.elevationGain ?? r.elevation_gain;
    r.status = s.status ?? r.status;
  });
}

function secondsBetween(a: string, b: string) {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 1000);
}

function normSex(s: any): "M" | "F" | "" {
  return s === "MALE" ? "M" : s === "FEMALE" ? "F" : "";
}

function upsertRunner(race: TrailRace, ru: any): TrailRunner {
  const bib = String(ru.bib ?? "");
  let r = race.runners.find((x) => x.bib === bib);
  if (!r) {
    r = {
      bib,
      first_name: "",
      last_name: "",
      sex: "",
      category: "",
      club: "",
      status: "REGISTERED",
      last_point_id: null,
      last_point_name: null,
      last_point_km: null,
      last_at: null,
      race_time_s: null,
      rank: null,
      rank_sex: null,
      passings: [],
    };
    race.runners.push(r);
  }
  r.first_name = ru.firstName ?? r.first_name;
  r.last_name = ru.lastName ?? r.last_name;
  r.sex = normSex(ru.sex) || r.sex;
  r.category = ru.category ?? r.category;
  r.club = ru.club ?? r.club;
  // Estat oficial de LiveTrail (FINISHER, DNF, DNS…) quan hi és.
  const st = String(ru.status ?? "").toUpperCase();
  r.lt_status = st === "FINISHER" ? "FINISHED" : st === "DNS" ? "DNS" : /^(DNF|DSQ|DISQ|ABANDON|RETIRED|WITHDRAWN|MISSING)/.test(st) ? "DNF" : undefined;
  return r;
}

/** Recalcula rànquings (per punt assolit i temps) i estat d'una cursa. */
export function recomputeRanks(race: TrailRace) {
  const finishKm = race.checkpoints.length ? race.checkpoints[race.checkpoints.length - 1].km : Infinity;
  for (const r of race.runners) {
    if (r.lt_status) {
      r.status = r.lt_status;
      continue;
    }
    if (r.last_point_km == null) r.status = "REGISTERED";
    else r.status = r.last_point_km >= finishKm - 0.01 ? "FINISHED" : "RUNNING";
  }
  const order = (list: TrailRunner[]) =>
    list
      .filter((r) => r.last_point_km != null)
      .sort((a, b) => b.last_point_km! - a.last_point_km! || (a.race_time_s ?? 0) - (b.race_time_s ?? 0));
  order(race.runners).forEach((r, i) => (r.rank = i + 1));
  for (const sex of ["M", "F"] as const) {
    order(race.runners.filter((r) => r.sex === sex)).forEach((r, i) => (r.rank_sex = i + 1));
  }
}

export async function syncRace(ev: TrailEvent, race: TrailRace) {
  const tenant = ev.livetrail.tenant;
  const [points, live] = await Promise.all([
    lt<any[]>(tenant, "events/points", { raceId: race.id }),
    lt<any>(tenant, `events/races/${race.id}/live`),
  ]);
  const usable = (points ?? [])
    .filter((p) => !p.isDisabled && (p.distance ?? 0) > 0)
    .sort((a, b) => a.distance - b.distance);
  race.checkpoints = usable.map<Checkpoint>((p) => ({
    id: p.pointId,
    name: p.name ?? p.shortName ?? `Punt ${p.pointId}`,
    km: +(p.distance / 1000).toFixed(2),
    altitude: p.altitude ?? null,
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    first_at: p.dateFirstRunners ?? null,
    last_at: p.dateLastRunners ?? null,
  }));
  const cpById = new Map(race.checkpoints.map((c) => [c.id, c]));
  if (live?.status) race.status = live.status;

  if (race.status === "NOT_LAUNCHED" && !inLiveWindow(race)) return;

  const rows = await ltPassings(tenant, race.id);
  const known = knownPassings(race);
  for (const row of rows) {
    const r = upsertRunner(race, row.runner ?? {});
    const pb = row.passingsByPointId ?? {};
    const s0 = pb["0"] ?? {};
    const start = s0.datetimeOut ?? s0.datetimeIn ?? race.start_iso;
    if (!start) continue;
    const ps: Passing[] = [];
    for (const cp of race.checkpoints) {
      const v = pb[String(cp.id)];
      const at = v?.datetimeIn ?? v?.datetimeOut;
      if (!at) continue;
      ps.push({ point_id: cp.id, at, seconds: secondsBetween(at, start) });
    }
    r.passings = ps;
    const last = ps[ps.length - 1];
    if (last) {
      const cp = cpById.get(last.point_id)!;
      r.last_point_id = cp.id;
      r.last_point_name = cp.name;
      r.last_point_km = cp.km;
      r.last_at = last.at;
      r.race_time_s = last.seconds;
    }
  }
  recomputeRanks(race);
  pushNewPassings(ev.id, race, known);
}

export function syncEvent(ev: TrailEvent): Promise<void> {
  const inflight = running.get(ev.id);
  if (inflight) return inflight;
  const p = doSync(ev).finally(() => running.delete(ev.id));
  running.set(ev.id, p);
  return p;
}

async function doSync(ev: TrailEvent) {
  try {
    await discoverRaces(ev);
    for (const race of ev.races) await syncRace(ev, race);
    ev.livetrail.last_sync = new Date().toISOString();
    ev.livetrail.last_error = null;
  } catch (e: any) {
    ev.livetrail.last_error = e?.message ?? String(e);
  } finally {
    persistTrail();
    emitUpdate("trail:changed", { id: ev.id });
  }
}

/** Llista d'inscrits. LiveTrail només deixa cercar per dorsal o per 2 lletres: recorrem tots els prefixos. */
export async function importRegistrants(ev: TrailEvent) {
  const tenant = ev.livetrail.tenant;
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const queries: string[] = [];
  for (const a of letters) for (const b of letters) queries.push(a + b);
  const raceIds = new Set(ev.races.map((r) => r.id));
  const found = new Map<string, any>();
  let cursor = 0;
  const worker = async () => {
    while (cursor < queries.length) {
      const q = queries[cursor++];
      for (let page = 0; page < 20; page++) {
        const d = await lt<any>(tenant, "events/search/runners/full", { query: q, limit: 100, page }).catch(() => null);
        if (!d?.results?.length) break;
        for (const r of d.results) if (raceIds.has(r.raceId)) found.set(`${r.raceId}:${r.bib}`, r);
        if ((page + 1) * 100 >= (d.totalResults ?? 0)) break;
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  for (const [key, r] of Array.from(found.entries())) {
    const race = ev.races.find((x) => x.id === key.split(":")[0]);
    if (race) upsertRunner(race, r);
  }
  ev.livetrail.last_registrants = new Date().toISOString();
  persistTrail();
  emitUpdate("trail:changed", { id: ev.id });
  return found.size;
}

/** Cridat cada segon pel servidor: sincronitza els esdeveniments que toquen. */
export function tickTrail() {
  const now = Date.now();
  for (const ev of trailStore().events) {
    if ((nextDue.get(ev.id) ?? 0) > now) continue;
    const live = ev.races.some((r) => r.status === "LIVE" || r.status === "STARTED" || inLiveWindow(r, now));
    nextDue.set(ev.id, now + (live ? POLL_LIVE_MS : POLL_IDLE_MS));
    void syncEvent(ev);
  }
}
