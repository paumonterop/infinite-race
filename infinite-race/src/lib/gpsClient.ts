import { getRace } from "./raceEngine";

/** Returns the configured GPS server base URL (e.g. http://10.147.17.5:10009), or null if not set. */
export function getGpsServerUrl(): string | null {
  const race = getRace();
  return race.gps_server_url ? race.gps_server_url.trim().replace(/\/+$/, "") : null;
}

/**
 * Fetches a path from the configured external GPS server (the Flask app in
 * gps_server.py) and returns the parsed JSON. Throws a descriptive error if
 * the server isn't configured or doesn't respond, so callers can surface a
 * clean message instead of a raw network exception.
 */
export async function gpsFetch(path: string) {
  const base = getGpsServerUrl();
  if (!base) {
    throw new Error("NOT_CONFIGURED");
  }
  const url = `${base}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  } catch {
    throw new Error("UNREACHABLE");
  }
  if (!res.ok) {
    throw new Error(`HTTP_${res.status}`);
  }
  return res.json();
}
