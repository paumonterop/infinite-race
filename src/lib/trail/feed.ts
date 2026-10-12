import { getIO } from "@/lib/io";
import type { TrailRace } from "./types";

/** Un pas d'un atleta per un control, tal com es mostra al ticker. */
export interface FeedItem {
  seq: number;
  race_id: string;
  race_name: string;
  color: string;
  bib: string;
  name: string;
  sex: "M" | "F" | "";
  category: string;
  point_id: number;
  point_name: string;
  point_km: number;
  is_finish: boolean;
  at: string;
  race_time_s: number;
  pos: number; // posició absoluta en aquest control
  pos_sex: number | null;
}

interface Feed {
  seq: number;
  items: FeedItem[];
}

declare global {
  // eslint-disable-next-line no-var
  var __trail_feed__: Record<string, Feed> | undefined;
}

const MAX_ITEMS = 2000;
const BACKFILL = 30;

function feedFor(eventId: string): Feed {
  if (!global.__trail_feed__) global.__trail_feed__ = {};
  return (global.__trail_feed__[eventId] ??= { seq: 0, items: [] });
}

export function readFeed(eventId: string, since: number | null, backlog: number, raceId?: string | null) {
  const f = feedFor(eventId);
  const pool = raceId ? f.items.filter((i) => i.race_id === raceId) : f.items;
  const items = since == null ? pool.slice(-backlog) : pool.filter((i) => i.seq > since);
  return { seq: f.seq, items };
}

/** Claus "dorsal:punt" ja conegudes d'una cursa, per detectar només els passos nous. */
export function knownPassings(race: TrailRace): Set<string> {
  const s = new Set<string>();
  for (const r of race.runners) for (const p of r.passings) s.add(`${r.bib}:${p.point_id}`);
  return s;
}

/**
 * Compara l'estat de la cursa amb `known` (abans de sincronitzar) i afegeix a la cua els passos nous,
 * ordenats per hora d'arribada. Si és la primera càrrega d'una cursa ja començada només s'hi posen
 * els últims passos, per no inundar el ticker.
 */
export function pushNewPassings(eventId: string, race: TrailRace, known: Set<string>) {
  const first = known.size === 0;
  const lastPointId = race.checkpoints.length ? race.checkpoints[race.checkpoints.length - 1].id : null;
  const cpById = new Map(race.checkpoints.map((c) => [c.id, c]));

  // posició en cada control: ordre d'hora de pas
  const byPoint = new Map<number, { bib: string; at: number; sex: string }[]>();
  for (const r of race.runners) {
    for (const p of r.passings) {
      let arr = byPoint.get(p.point_id);
      if (!arr) byPoint.set(p.point_id, (arr = []));
      arr.push({ bib: r.bib, at: new Date(p.at).getTime(), sex: r.sex });
    }
  }
  for (const arr of Array.from(byPoint.values())) arr.sort((a, b) => a.at - b.at);

  const fresh: Omit<FeedItem, "seq">[] = [];
  for (const r of race.runners) {
    for (const p of r.passings) {
      if (known.has(`${r.bib}:${p.point_id}`)) continue;
      const cp = cpById.get(p.point_id);
      if (!cp) continue;
      const arr = byPoint.get(p.point_id) ?? [];
      const idx = arr.findIndex((x) => x.bib === r.bib);
      const sexIdx = r.sex ? arr.filter((x) => x.sex === r.sex).findIndex((x) => x.bib === r.bib) : -1;
      fresh.push({
        race_id: race.id,
        race_name: race.name,
        color: race.color,
        bib: r.bib,
        name: `${r.first_name} ${r.last_name}`.trim(),
        sex: r.sex,
        category: r.category,
        point_id: cp.id,
        point_name: cp.name,
        point_km: cp.km,
        is_finish: cp.id === lastPointId,
        at: p.at,
        race_time_s: p.seconds,
        pos: idx + 1,
        pos_sex: sexIdx >= 0 ? sexIdx + 1 : null,
      });
    }
  }
  if (!fresh.length) return;
  fresh.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const chosen = first ? fresh.slice(-BACKFILL) : fresh;

  const f = feedFor(eventId);
  for (const it of chosen) f.items.push({ ...it, seq: ++f.seq });
  if (f.items.length > MAX_ITEMS) f.items.splice(0, f.items.length - MAX_ITEMS);
  getIO()?.emit("trail:feed", { id: eventId, seq: f.seq });
}
