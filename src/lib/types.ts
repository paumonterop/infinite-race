export type RunnerStatus =
  | "PENDING"
  | "ACTIVE"
  | "LAP_COMPLETED"
  | "ELIMINATED"
  | "RETIRED"
  | "DISQUALIFIED";

export type RaceStatus = "SETUP" | "READY" | "RUNNING" | "PAUSED" | "FINISHED";

export interface Runner {
  id: string;
  bib: number;
  first_name: string;
  last_name: string;
  gender: "M" | "F";
  nationality: string | null;
  team: string | null;
  status: RunnerStatus;
  laps_completed: number;
  total_km: number;
  total_elevation: number;
  last_lap_at: string | null;
  last_lap_time_seconds: number | null;
  eliminated_at: string | null;
  eliminated_lap: number | null;
  created_at: string;
  updated_at: string;
}

export interface Race {
  id: number;
  name: string;
  status: RaceStatus;
  current_lap: number;
  lap_duration_seconds: number;
  current_lap_started_at: string | null;
  current_lap_ends_at: string | null;
  paused_remaining_seconds: number | null;
  race_started_at: string | null;
  distance_per_lap_km: number;
  elevation_per_lap_m: number;
  max_laps: number | null;
  elimination_rule: "ELIMINATE" | "RETIRE" | "NONE";
  alert_thresholds: string; // JSON
  primary_color: string;
  accent_color: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LapRecord {
  id: string;
  runner_id: string;
  lap_number: number;
  completed_at: string;
  lap_time_seconds: number | null;
  created_at: string;
}

export interface RaceEvent {
  id: string;
  type: string;
  runner_id: string | null;
  lap_number: number | null;
  message: string | null;
  metadata: string | null;
  actor: string;
  timestamp: string;
}

export interface BroadcastState {
  id: number;
  active_view: string;
  ticker_enabled: number;
  selected_runner_id: string | null;
  updated_at: string;
}
