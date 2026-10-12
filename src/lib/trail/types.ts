export interface TrailGpx {
  file_name: string;
  total_km: number;
  elevation_gain: number;
  points: number[][]; // [lat, lon, km, ele]
}

export interface Checkpoint {
  id: number;
  name: string;
  km: number;
  altitude: number | null;
  lat: number | null;
  lon: number | null;
  first_at: string | null;
  last_at: string | null;
}

export interface Passing {
  point_id: number;
  at: string;
  seconds: number; // temps de cursa en segons
}

export type TrailRunnerStatus = "REGISTERED" | "RUNNING" | "FINISHED" | "DNF" | "DNS";

export interface TrailRunner {
  bib: string;
  first_name: string;
  last_name: string;
  sex: "M" | "F" | "";
  category: string;
  club: string;
  status: TrailRunnerStatus;
  lt_status?: TrailRunnerStatus; // estat oficial de LiveTrail
  last_point_id: number | null;
  last_point_name: string | null;
  last_point_km: number | null;
  last_at: string | null;
  race_time_s: number | null;
  rank: number | null;
  rank_sex: number | null;
  passings: Passing[];
}

export interface TrailRace {
  id: string; // raceId de LiveTrail
  name: string;
  color: string;
  start_iso: string | null;
  distance_m: number | null;
  elevation_gain: number | null;
  status: string; // NOT_LAUNCHED | LIVE | ...
  checkpoints: Checkpoint[];
  runners: TrailRunner[];
  gpx: TrailGpx | null;
}

export interface GpsDevice {
  label: string;
  race_id: string | null;
  bib: string | null;
}

export interface TrailEvent {
  id: string;
  name: string;
  sport: "trail";
  livetrail: {
    url: string;
    tenant: string;
    last_sync: string | null;
    last_error: string | null;
    last_registrants: string | null;
  };
  races: TrailRace[];
  devices: Record<string, GpsDevice>;
  created_at: string;
}

export interface GpsPosition {
  id: string;
  label: string;
  lat: number | null;
  lon: number | null;
  speed_kmh: number | null;
  status: "online" | "offline";
  last_seen: string | null;
  race_id: string | null;
  bib: string | null;
  runner_name: string | null;
  km: number | null;
  pct: number | null;
  off_route: boolean;
}
