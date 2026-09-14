import { getStore, persist } from "./store";
import { emitUpdate } from "./io";
import { v4 as uuid } from "uuid";
import type { Race, Runner, RunnerStatus, BroadcastState } from "./types";

export function logEvent(
  type: string,
  opts: { runnerId?: string; lapNumber?: number; message?: string; metadata?: any; actor?: string } = {}
) {
  const store = getStore();
  store.events.push({
    id: uuid(),
    type,
    runner_id: opts.runnerId ?? null,
    lap_number: opts.lapNumber ?? null,
    message: opts.message ?? null,
    metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
    actor: opts.actor ?? "organizer",
    timestamp: new Date().toISOString(),
  });
  persist();
}

export function getRace(): Race {
  return getStore().race;
}

export function getRunners(): Runner[] {
  return [...getStore().runners].sort((a, b) => a.bib - b.bib);
}

export function getRunner(id: string): Runner | undefined {
  return getStore().runners.find((r) => r.id === id);
}

export function getRunnerByBib(bib: number): Runner | undefined {
  return getStore().runners.find((r) => r.bib === bib);
}

// ---------- Broadcast state ----------

export function getBroadcastState(): BroadcastState {
  return getStore().broadcastState;
}

export function updateBroadcastState(patch: Partial<BroadcastState>): BroadcastState {
  const store = getStore();
  store.broadcastState = {
    ...store.broadcastState,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  persist();
  emitUpdate("broadcast:changed");
  return store.broadcastState;
}

// ---------- Runner CRUD ----------

export function createRunner(input: Partial<Runner>): Runner {
  const store = getStore();
  const now = new Date().toISOString();
  const runner: Runner = {
    id: uuid(),
    bib: Number(input.bib),
    first_name: input.first_name ?? "",
    last_name: input.last_name ?? "",
    gender: input.gender === "F" ? "F" : "M",
    nationality: input.nationality ?? null,
    team: input.team ?? null,
    status: "PENDING",
    laps_completed: 0,
    total_km: 0,
    total_elevation: 0,
    last_lap_at: null,
    last_lap_time_seconds: null,
    eliminated_at: null,
    eliminated_lap: null,
    created_at: now,
    updated_at: now,
  };
  store.runners.push(runner);
  persist();
  logEvent("RUNNER_CREATED", { runnerId: runner.id, message: `Dorsal ${runner.bib} afegit` });
  emitUpdate("runners:changed");
  return runner;
}

export function updateRunner(id: string, input: Partial<Runner>): Runner {
  const store = getStore();
  const idx = store.runners.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Runner not found");
  const fields = [
    "bib",
    "first_name",
    "last_name",
    "gender",
    "nationality",
    "team",
    "status",
    "laps_completed",
    "total_km",
    "total_elevation",
  ] as const;
  const current = store.runners[idx];
  const merged: Runner = { ...current };
  for (const f of fields) {
    if (input[f] !== undefined) (merged as any)[f] = input[f];
  }
  merged.updated_at = new Date().toISOString();
  store.runners[idx] = merged;
  persist();
  logEvent("RUNNER_UPDATED", { runnerId: id });
  emitUpdate("runners:changed");
  return merged;
}

export function deleteRunner(id: string) {
  const store = getStore();
  store.laps = store.laps.filter((l) => l.runner_id !== id);
  store.runners = store.runners.filter((r) => r.id !== id);
  persist();
  logEvent("RUNNER_DELETED", { runnerId: id });
  emitUpdate("runners:changed");
}

export function setRunnerStatus(id: string, status: RunnerStatus, opts: { lap?: number } = {}) {
  const store = getStore();
  const idx = store.runners.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Runner not found");
  const runner = store.runners[idx];
  const now = new Date().toISOString();
  if (status === "ELIMINATED" || status === "RETIRED" || status === "DISQUALIFIED") {
    store.runners[idx] = {
      ...runner,
      status,
      eliminated_at: now,
      eliminated_lap: opts.lap ?? getRace().current_lap,
      updated_at: now,
    };
  } else {
    store.runners[idx] = { ...runner, status, updated_at: now };
  }
  persist();
  logEvent(`RUNNER_${status}`, { runnerId: id, message: `Dorsal ${runner.bib} -> ${status}` });
  emitUpdate("runners:changed");
}

// ---------- Lap control ----------

export function completeLap(runnerId: string, actor = "organizer") {
  const store = getStore();
  const idx = store.runners.findIndex((r) => r.id === runnerId);
  if (idx === -1) throw new Error("Runner not found");
  const runner = store.runners[idx];
  const race = getRace();

  if (runner.status === "LAP_COMPLETED") {
    return runner; // avoid double counting / double click protection
  }
  if (!["ACTIVE", "PENDING"].includes(runner.status)) {
    return runner; // can't complete lap if eliminated/retired
  }

  const lapNumber = Math.max(race.current_lap, 1);
  const now = new Date();
  const startedAt = race.current_lap_started_at ? new Date(race.current_lap_started_at) : now;
  const lapTimeSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));

  store.laps.push({
    id: uuid(),
    runner_id: runnerId,
    lap_number: lapNumber,
    completed_at: now.toISOString(),
    lap_time_seconds: lapTimeSeconds,
    created_at: now.toISOString(),
  });

  const newLaps = runner.laps_completed + 1;
  store.runners[idx] = {
    ...runner,
    laps_completed: newLaps,
    total_km: +(newLaps * race.distance_per_lap_km).toFixed(2),
    total_elevation: +(newLaps * race.elevation_per_lap_m).toFixed(0),
    status: "LAP_COMPLETED",
    last_lap_at: now.toISOString(),
    last_lap_time_seconds: lapTimeSeconds,
    updated_at: now.toISOString(),
  };
  persist();

  logEvent("LAP_COMPLETED", {
    runnerId,
    lapNumber,
    actor,
    message: `Dorsal ${runner.bib} completa volta ${lapNumber}`,
  });
  emitUpdate("runners:changed");
  emitUpdate("lap:completed", { runnerId, lapNumber });
  return getRunner(runnerId);
}

export function undoLastLap(runnerId: string, actor = "organizer") {
  const store = getStore();
  const idx = store.runners.findIndex((r) => r.id === runnerId);
  if (idx === -1) throw new Error("Runner not found");
  const runner = store.runners[idx];

  const runnerLaps = store.laps
    .map((l, i) => ({ ...l, _i: i }))
    .filter((l) => l.runner_id === runnerId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const lastLap = runnerLaps[runnerLaps.length - 1];
  if (!lastLap) return runner;

  store.laps.splice(lastLap._i, 1);

  const race = getRace();
  const newLaps = Math.max(0, runner.laps_completed - 1);
  store.runners[idx] = {
    ...runner,
    laps_completed: newLaps,
    total_km: +(newLaps * race.distance_per_lap_km).toFixed(2),
    total_elevation: +(newLaps * race.elevation_per_lap_m).toFixed(0),
    status: "ACTIVE",
    updated_at: new Date().toISOString(),
  };
  persist();

  logEvent("LAP_UNDO", {
    runnerId,
    lapNumber: lastLap.lap_number,
    actor,
    message: `Desfeta volta de dorsal ${runner.bib}`,
  });
  emitUpdate("runners:changed");
  return getRunner(runnerId);
}

// ---------- Race lifecycle ----------

export function updateRaceConfig(input: Partial<Race>) {
  const store = getStore();
  store.race = { ...store.race, ...input, updated_at: new Date().toISOString() };
  persist();
  logEvent("RACE_CONFIG_UPDATED", { message: "Configuració de cursa actualitzada" });
  emitUpdate("race:changed");
  return store.race;
}

export function startRace() {
  const store = getStore();
  const now = new Date();
  const endsAt = new Date(now.getTime() + store.race.lap_duration_seconds * 1000);
  store.race = {
    ...store.race,
    status: "RUNNING",
    current_lap: 1,
    current_lap_started_at: now.toISOString(),
    current_lap_ends_at: endsAt.toISOString(),
    race_started_at: now.toISOString(),
    paused_remaining_seconds: null,
    updated_at: now.toISOString(),
  };
  store.runners = store.runners.map((r) =>
    r.status === "PENDING" || r.status === "LAP_COMPLETED" ? { ...r, status: "ACTIVE" } : r
  );
  persist();
  logEvent("RACE_STARTED", { message: "Cursa iniciada", lapNumber: 1 });
  emitUpdate("race:changed");
  emitUpdate("runners:changed");
  return store.race;
}

export function pauseRace() {
  const store = getStore();
  const race = store.race;
  if (race.status !== "RUNNING") return race;
  const now = new Date();
  const ends = race.current_lap_ends_at ? new Date(race.current_lap_ends_at) : now;
  const remaining = Math.max(0, Math.round((ends.getTime() - now.getTime()) / 1000));
  store.race = { ...race, status: "PAUSED", paused_remaining_seconds: remaining, updated_at: now.toISOString() };
  persist();
  logEvent("RACE_PAUSED", { message: `Cursa pausada amb ${remaining}s restants` });
  emitUpdate("race:changed");
  return store.race;
}

export function resumeRace() {
  const store = getStore();
  const race = store.race;
  if (race.status !== "PAUSED") return race;
  const now = new Date();
  const remaining = race.paused_remaining_seconds ?? race.lap_duration_seconds;
  const endsAt = new Date(now.getTime() + remaining * 1000);
  store.race = {
    ...race,
    status: "RUNNING",
    current_lap_started_at: now.toISOString(),
    current_lap_ends_at: endsAt.toISOString(),
    paused_remaining_seconds: null,
    updated_at: now.toISOString(),
  };
  persist();
  logEvent("RACE_RESUMED", { message: "Cursa represa" });
  emitUpdate("race:changed");
  return store.race;
}

export function resetRace() {
  const store = getStore();
  const now = new Date().toISOString();
  store.race = {
    ...store.race,
    status: "SETUP",
    current_lap: 0,
    current_lap_started_at: null,
    current_lap_ends_at: null,
    paused_remaining_seconds: null,
    race_started_at: null,
    updated_at: now,
  };
  store.laps = [];
  store.runners = store.runners.map((r) => ({
    ...r,
    status: "PENDING",
    laps_completed: 0,
    total_km: 0,
    total_elevation: 0,
    last_lap_at: null,
    last_lap_time_seconds: null,
    eliminated_at: null,
    eliminated_lap: null,
    updated_at: now,
  }));
  persist();
  logEvent("RACE_RESET", { message: "Cursa reiniciada completament" });
  emitUpdate("race:changed");
  emitUpdate("runners:changed");
  return store.race;
}

export function endRace() {
  const store = getStore();
  store.race = { ...store.race, status: "FINISHED", updated_at: new Date().toISOString() };
  persist();
  logEvent("RACE_FINISHED", { message: "Cursa finalitzada" });
  emitUpdate("race:changed");
  return store.race;
}

/** Advance to the next lap: apply elimination rules to runners who didn't complete, then open new lap. */
export function advanceLap(actor = "organizer") {
  const store = getStore();
  const race = store.race;
  const finishedLap = race.current_lap;
  const now = new Date();

  store.runners = store.runners.map((r) => {
    if (r.status === "ACTIVE") {
      if (race.elimination_rule === "NONE") return r;
      const status: RunnerStatus = race.elimination_rule === "RETIRE" ? "RETIRED" : "ELIMINATED";
      logEvent(`RUNNER_${status}`, {
        runnerId: r.id,
        lapNumber: finishedLap,
        actor: "system",
        message: `Dorsal ${r.bib} no ha completat la volta ${finishedLap} -> ${status}`,
      });
      return { ...r, status, eliminated_at: now.toISOString(), eliminated_lap: finishedLap, updated_at: now.toISOString() };
    }
    if (r.status === "LAP_COMPLETED") {
      return { ...r, status: "ACTIVE", updated_at: now.toISOString() };
    }
    return r;
  });

  const nextLapNumber = finishedLap + 1;
  const endsAt = new Date(now.getTime() + race.lap_duration_seconds * 1000);
  let newStatus = race.status;
  if (race.max_laps && nextLapNumber > race.max_laps) {
    newStatus = "FINISHED";
  } else {
    newStatus = "RUNNING";
  }

  store.race = {
    ...race,
    current_lap: nextLapNumber,
    current_lap_started_at: now.toISOString(),
    current_lap_ends_at: endsAt.toISOString(),
    status: newStatus,
    updated_at: now.toISOString(),
  };
  persist();

  logEvent("LAP_ADVANCED", {
    lapNumber: nextLapNumber,
    actor,
    message: `Final volta ${finishedLap} / Inici volta ${nextLapNumber}`,
  });
  emitUpdate("race:changed");
  emitUpdate("runners:changed");
  emitUpdate("lap:advanced", { lapNumber: nextLapNumber });
  return store.race;
}

/** Called periodically (server tick) - checks if the current lap has expired and advances automatically. */
export function checkLapExpiry() {
  const race = getRace();
  if (race.status !== "RUNNING" || !race.current_lap_ends_at) return;
  const ends = new Date(race.current_lap_ends_at).getTime();
  if (Date.now() >= ends) {
    advanceLap("system");
  }
}

// ---------- Manual lap correction ----------

export function setCurrentLapNumber(lapNumber: number) {
  const store = getStore();
  store.race = { ...store.race, current_lap: lapNumber, updated_at: new Date().toISOString() };
  persist();
  logEvent("LAP_MANUAL_CORRECTION", { lapNumber, message: `Volta corregida manualment a ${lapNumber}` });
  emitUpdate("race:changed");
}
