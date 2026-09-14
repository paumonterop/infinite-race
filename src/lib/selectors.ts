import { getStore } from "./store";
import type { Runner } from "./types";
import { getRunners, getRace } from "./raceEngine";

function tiebreak(a: Runner, b: Runner) {
  if (b.laps_completed !== a.laps_completed) return b.laps_completed - a.laps_completed;
  const aT = a.last_lap_at ? new Date(a.last_lap_at).getTime() : Infinity;
  const bT = b.last_lap_at ? new Date(b.last_lap_at).getTime() : Infinity;
  return aT - bT;
}

export function leaderboardGeneral(): Runner[] {
  return [...getRunners()].sort(tiebreak);
}

export function leaderboardByGender(gender: "M" | "F"): Runner[] {
  return leaderboardGeneral().filter((r) => r.gender === gender);
}

export function activeRunners(): Runner[] {
  return getRunners().filter((r) => r.status === "ACTIVE" || r.status === "LAP_COMPLETED");
}

export function eliminatedRunners(): Runner[] {
  return leaderboardGeneral().filter((r) =>
    ["ELIMINATED", "RETIRED", "DISQUALIFIED"].includes(r.status)
  );
}

export function leader(gender?: "M" | "F"): Runner | undefined {
  const list = gender ? leaderboardByGender(gender) : leaderboardGeneral();
  return list[0];
}

export function raceStats() {
  const runners = getRunners();
  const race = getRace();
  const store = getStore();
  const active = runners.filter((r) => r.status === "ACTIVE" || r.status === "LAP_COMPLETED");
  const eliminated = runners.filter((r) => r.status === "ELIMINATED");
  const retired = runners.filter((r) => r.status === "RETIRED");
  const dsq = runners.filter((r) => r.status === "DISQUALIFIED");
  const men = runners.filter((r) => r.gender === "M");
  const women = runners.filter((r) => r.gender === "F");
  const totalLaps = runners.reduce((s, r) => s + r.laps_completed, 0);
  const totalKm = runners.reduce((s, r) => s + r.total_km, 0);
  const totalElevation = runners.reduce((s, r) => s + r.total_elevation, 0);

  const timedLaps = store.laps.filter((l) => l.lap_time_seconds !== null && l.lap_time_seconds !== undefined);
  let bestLap: any = null;
  for (const l of timedLaps) {
    if (!bestLap || (l.lap_time_seconds as number) < bestLap.lap_time_seconds) bestLap = l;
  }
  if (bestLap) {
    const r = runners.find((x) => x.id === bestLap.runner_id);
    bestLap = { ...bestLap, bib: r?.bib, first_name: r?.first_name, last_name: r?.last_name };
  }

  const mostLaps = [...runners].sort((a, b) => b.laps_completed - a.laps_completed)[0];

  const activeByLapMap = new Map<number, Set<string>>();
  for (const l of store.laps) {
    if (!activeByLapMap.has(l.lap_number)) activeByLapMap.set(l.lap_number, new Set());
    activeByLapMap.get(l.lap_number)!.add(l.runner_id);
  }
  const activeByLap = Array.from(activeByLapMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([lap_number, set]) => ({ lap_number, active_count: set.size }));

  const eliminationsByLapMap = new Map<number, number>();
  for (const r of runners) {
    if (r.eliminated_lap !== null && r.eliminated_lap !== undefined) {
      eliminationsByLapMap.set(r.eliminated_lap, (eliminationsByLapMap.get(r.eliminated_lap) ?? 0) + 1);
    }
  }
  const eliminationsByLap = Array.from(eliminationsByLapMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([lap_number, count]) => ({ lap_number, count }));

  return {
    race,
    totalParticipants: runners.length,
    men: men.length,
    women: women.length,
    active: active.length,
    eliminated: eliminated.length,
    retired: retired.length,
    disqualified: dsq.length,
    currentLap: race.current_lap,
    totalLaps,
    totalKm: +totalKm.toFixed(1),
    totalElevation: Math.round(totalElevation),
    bestLap,
    mostLaps,
    leaderMale: leader("M"),
    leaderFemale: leader("F"),
    activeByLap,
    eliminationsByLap,
  };
}

export function recentEvents(limit = 100) {
  const store = getStore();
  return [...store.events]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}
