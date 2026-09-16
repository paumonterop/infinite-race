import fs from "fs";
import path from "path";
import type { Race, Runner, LapRecord, RaceEvent, BroadcastState } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "race.json");

export interface StoreShape {
  race: Race;
  runners: Runner[];
  laps: LapRecord[];
  events: RaceEvent[];
  broadcastState: BroadcastState;
}

function defaultStore(): StoreShape {
  const now = new Date().toISOString();
  return {
    race: {
      id: 1,
      name: "INFINITE RACE VAL D'ARAN",
      status: "SETUP",
      current_lap: 0,
      lap_duration_seconds: 3600,
      current_lap_started_at: null,
      current_lap_ends_at: null,
      paused_remaining_seconds: null,
      race_started_at: null,
      distance_per_lap_km: 6.7,
      elevation_per_lap_m: 250,
      max_laps: null,
      elimination_rule: "ELIMINATE",
      scheduled_start_at: null,
      auto_start_enabled: false,
      gps_server_url: null,
      gps_selected_ids: [],
      vmix_host: null,
      vmix_port: 8099,
      vmix_auto_select: false,
      vmix_gps_map: {},
      alert_thresholds: JSON.stringify({ normal: 600, alert: 300, critical: 60, final: 10 }),
      primary_color: "#0EA5E9",
      accent_color: "#F59E0B",
      logo_url: null,
      created_at: now,
      updated_at: now,
    },
    runners: [],
    laps: [],
    events: [],
    broadcastState: {
      id: 1,
      active_view: "leaderboard_general",
      ticker_enabled: 1,
      selected_runner_id: null,
      updated_at: now,
    },
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __race_store__: StoreShape | undefined;
}

function load(): StoreShape {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const fresh = defaultStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields added in updates don't crash old data files.
    const fresh = defaultStore();
    return {
      race: { ...fresh.race, ...parsed.race },
      runners: Array.isArray(parsed.runners) ? parsed.runners : [],
      laps: Array.isArray(parsed.laps) ? parsed.laps : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      broadcastState: { ...fresh.broadcastState, ...parsed.broadcastState },
    };
  } catch {
    const fresh = defaultStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

export function getStore(): StoreShape {
  if (!global.__race_store__) {
    global.__race_store__ = load();
  }
  return global.__race_store__;
}

let saveTimer: NodeJS.Timeout | null = null;

/** Persists the store to disk. Debounced by a tick so rapid successive
 * mutations in the same request don't cause redundant disk writes. */
export function persist() {
  const store = getStore();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  }, 50);
}

export function persistSync() {
  const store = getStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}
