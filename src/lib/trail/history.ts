import fs from "fs";
import path from "path";
import { lt } from "./livetrail";
import type { TrailEvent, TrailRace, TrailRunner } from "./types";

// Històric: edicions anteriors de la mateixa cursa a LiveTrail (mateix organitzador, tenants <nom>_<any>).
// Dona records, guanyadors per edició, resultats previs d'un atleta i els favorits.

export interface HistResult {
  year: number;
  race_name: string;
  name: string;
  bib: string;
  club: string;
  sex: "M" | "F";
  category: string;
  rank: number; // classificació absoluta
  rank_sex: number;
  time_s: number;
}

export interface HistEdition {
  year: number;
  race_id: string;
  race_name: string;
  distance_m: number;
  finishers: number;
  winner_m: HistResult | null;
  winner_f: HistResult | null;
}

export interface RaceHistory {
  fetched_at: string;
  editions: HistEdition[];
  results: HistResult[];
  record_m: HistResult | null;
  record_f: HistResult | null;
}

const DIR = path.join(process.cwd(), "data", "history");
const TTL_MS = 12 * 3600_000;
const FIRST_YEAR = 2016;
const mem = new Map<string, RaceHistory>();
const inflight = new Map<string, Promise<RaceHistory>>();

// ── noms ──
const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ");
export const nameTokens = (first: string, last: string) =>
  strip(`${first} ${last}`).split(/\s+/).filter((t) => t.length > 0).sort();

/** Mateixa persona: mateixos tokens, o un nom és subconjunt de l'altre (≥2 tokens en comú). */
export function samePerson(a: string[], b: string[]) {
  if (a.join(" ") === b.join(" ")) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return s.length >= 2 && s.every((t) => l.includes(t));
}

export function tenantBase(tenant: string) {
  return tenant.replace(/_\d{4}$/, "");
}

function tenantYear(tenant: string) {
  const m = /_(\d{4})$/.exec(tenant);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

function toResult(r: any, year: number, raceName: string): HistResult | null {
  if (r.status !== "FINISHER" || !(r.raceTime > 0)) return null;
  return {
    year,
    race_name: raceName,
    name: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim(),
    bib: String(r.bib ?? ""),
    club: r.club ?? "",
    sex: r.sex === "FEMALE" ? "F" : "M",
    category: r.category ?? "",
    rank: r.ranking?.scratch ?? 0,
    rank_sex: r.ranking?.sex ?? 0,
    time_s: r.raceTime,
  };
}

async function fetchRanking(tenant: string, raceId: string, sex: "MALE" | "FEMALE") {
  const d = await lt<any>(tenant, `events/ranking/final/${raceId}`, { limit: 2000, sex }).catch(() => null);
  return (d?.runners ?? []) as any[];
}

async function build(ev: TrailEvent, race: TrailRace): Promise<RaceHistory> {
  const base = tenantBase(ev.livetrail.tenant);
  const thisYear = tenantYear(ev.livetrail.tenant);
  const dist = race.distance_m ?? (race.gpx ? race.gpx.total_km * 1000 : 0);
  const editions: HistEdition[] = [];
  const results: HistResult[] = [];

  for (let year = thisYear - 1; year >= FIRST_YEAR; year--) {
    const tenant = `${base}_${year}`;
    const sums: any[] | null = await lt<any[]>(tenant, "events/races/summaries").catch(() => null);
    if (!sums?.length) continue;
    // cursa de l'edició més semblant en distància (±30 %); si empaten, la del mateix raceId
    const cands = sums
      .filter((s) => s.distance && dist && Math.abs(s.distance - dist) / dist <= 0.3)
      .sort((a, b) => Math.abs(a.distance - dist) - Math.abs(b.distance - dist) || (a.raceId === race.id ? -1 : 1));
    const m = cands[0];
    if (!m) continue;
    const name = m.fullname || m.shortname || m.raceId;
    const [men, women] = await Promise.all([fetchRanking(tenant, m.raceId, "MALE"), fetchRanking(tenant, m.raceId, "FEMALE")]);
    const rs = [...men, ...women].map((r) => toResult(r, year, name)).filter((x): x is HistResult => !!x);
    results.push(...rs);
    const best = (sex: "M" | "F") => rs.filter((r) => r.sex === sex).sort((a, b) => a.time_s - b.time_s)[0] ?? null;
    editions.push({
      year,
      race_id: m.raceId,
      race_name: name,
      distance_m: m.distance,
      finishers: rs.length,
      winner_m: best("M"),
      winner_f: best("F"),
    });
  }

  // El rècord només es compara entre edicions de recorregut semblant (±8 % de distància).
  const comparable = new Set(editions.filter((e) => dist && Math.abs(e.distance_m - dist) / dist <= 0.08).map((e) => e.year));
  const recOf = (sex: "M" | "F") =>
    results.filter((r) => r.sex === sex && comparable.has(r.year)).sort((a, b) => a.time_s - b.time_s)[0] ?? null;

  return { fetched_at: new Date().toISOString(), editions, results, record_m: recOf("M"), record_f: recOf("F") };
}

/**
 * Rècords (home i dona) entre les edicions de recorregut semblant (±20 % de distància: el traçat canvia cada any).
 * Es calculen en llegir, així el criteri es pot canviar sense tornar a descarregar res.
 */
export function computeRecords(h: RaceHistory, distM: number | null, tol = 0.2) {
  const ok = new Set(h.editions.filter((e) => !distM || Math.abs(e.distance_m - distM) / distM <= tol).map((e) => e.year));
  const rec = (sex: "M" | "F") => h.results.filter((r) => r.sex === sex && ok.has(r.year)).sort((a, b) => a.time_s - b.time_s)[0] ?? null;
  const withKm = (r: HistResult | null) => (r ? { ...r, distance_m: h.editions.find((e) => e.year === r.year)?.distance_m ?? null } : null);
  return { record_m: withKm(rec("M")), record_f: withKm(rec("F")) };
}

export function getHistory(ev: TrailEvent, race: TrailRace): Promise<RaceHistory> {
  const key = `${ev.livetrail.tenant}__${race.id}`;
  const m = mem.get(key);
  if (m && Date.now() - new Date(m.fetched_at).getTime() < TTL_MS) return Promise.resolve(m);
  const f = path.join(DIR, `${key}.json`);
  try {
    if (fs.existsSync(f)) {
      const d: RaceHistory = JSON.parse(fs.readFileSync(f, "utf-8"));
      if (Date.now() - new Date(d.fetched_at).getTime() < TTL_MS) {
        mem.set(key, d);
        return Promise.resolve(d);
      }
    }
  } catch {
    /* cache malmesa: es torna a descarregar */
  }
  let p = inflight.get(key);
  if (!p) {
    p = build(ev, race)
      .then((d) => {
        mem.set(key, d);
        try {
          fs.mkdirSync(DIR, { recursive: true });
          fs.writeFileSync(f, JSON.stringify(d));
        } catch {
          /* només és cache */
        }
        return d;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

/** Resultats previs d'un atleta (més recents primer). */
export function athleteHistory(h: RaceHistory, first: string, last: string): HistResult[] {
  const t = nameTokens(first, last);
  return h.results.filter((r) => samePerson(t, strip(r.name).split(/\s+/).filter(Boolean).sort())).sort((a, b) => b.year - a.year);
}

export interface Favorite {
  rank: number;
  name: string;
  club: string;
  bib: string | null;
  note: string; // «1r · 2025»
  best_rank: number;
  best_time_s: number;
  editions: number;
}

const ordinal = (n: number) => (n === 1 ? "1r" : n === 2 ? "2n" : n === 3 ? "3r" : n === 4 ? "4t" : `${n}è`);

/**
 * Favorits d'un sexe: inscrits amb millor resultat previ en aquesta cursa. Si encara no hi ha inscrits (o n'hi ha pocs),
 * s'ompl amb els millors de les últimes edicions (sense dorsal).
 */
export function favorites(h: RaceHistory, runners: TrailRunner[], sex: "M" | "F", limit = 10): Favorite[] {
  const byPerson = new Map<string, { toks: string[]; res: HistResult[] }>();
  for (const r of h.results.filter((x) => x.sex === sex)) {
    const toks = strip(r.name).split(/\s+/).filter(Boolean).sort();
    const k = toks.join(" ");
    const e = byPerson.get(k) ?? { toks, res: [] };
    e.res.push(r);
    byPerson.set(k, e);
  }
  const people = Array.from(byPerson.values());
  const mk = (p: { res: HistResult[] }, bib: string | null, club?: string): Omit<Favorite, "rank"> => {
    const best = p.res.slice().sort((a, b) => a.rank_sex - b.rank_sex || b.year - a.year)[0];
    return {
      name: best.name,
      club: club ?? best.club,
      bib,
      note: `${ordinal(best.rank_sex)} · ${best.year}`,
      best_rank: best.rank_sex,
      best_time_s: best.time_s,
      editions: p.res.length,
    };
  };

  const picked: Omit<Favorite, "rank">[] = [];
  const used = new Set<string>();
  for (const r of runners.filter((x) => x.sex === sex)) {
    const t = nameTokens(r.first_name, r.last_name);
    const p = people.find((q) => samePerson(t, q.toks));
    if (p) {
      picked.push(mk(p, r.bib, r.club || undefined));
      used.add(p.toks.join(" "));
    }
  }
  picked.sort((a, b) => a.best_rank - b.best_rank || a.best_time_s - b.best_time_s);
  let out = picked.slice(0, limit);
  if (out.length < limit) {
    // farcit amb els millors de l'última edició comparable (sense dorsal)
    const recent = people
      .filter((p) => !used.has(p.toks.join(" ")))
      .map((p) => mk(p, null))
      .sort((a, b) => a.best_rank - b.best_rank || a.best_time_s - b.best_time_s);
    out = out.concat(recent.slice(0, limit - out.length));
  }
  return out.map((f, i) => ({ ...f, rank: i + 1 }));
}
