import type { TrailEvent } from "./types";

// Meteo amb Open-Meteo (gratuït, sense clau). Ubicacions: sortida, punt més alt i meta de les curses amb GPX.
// Si l'hora de sortida cau dins la previsió (16 dies) es mostra la previsió d'aquella hora; si no, el temps actual.

export interface WeatherLoc {
  name: string;
  lat: number;
  lon: number;
  ele: number | null;
  mode: "forecast" | "current";
  at: string | null;
  temperature: number | null;
  feels_like: number | null;
  humidity: number | null;
  wind_speed: number | null;
  precip_prob: number | null;
  condition: string; // sunny | cloudy | rain | snow | showers | storm | fog
}

export function conditionFromCode(code: number | null | undefined): string {
  if (code == null) return "cloudy";
  if (code === 0 || code === 1) return "sunny";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return code >= 80 ? "showers" : "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

let cache: { key: string; at: number; data: WeatherLoc[] } | null = null;

export function locationsOf(ev: TrailEvent, raceId?: string | null) {
  const races = ev.races.filter((r) => r.gpx && (!raceId || r.id === raceId));
  const src = races.length ? races : ev.races.filter((r) => r.gpx);
  if (!src.length) return [];
  const g = src[0].gpx!;
  const first = g.points[0];
  const last = g.points[g.points.length - 1];
  let hi = g.points[0];
  for (const p of g.points) if (p[3] != null && !Number.isNaN(p[3]) && (hi[3] == null || p[3] > hi[3])) hi = p;
  const locs = [{ name: "Sortida", lat: first[0], lon: first[1], ele: first[3] ?? null }];
  if (hi[3] != null) locs.push({ name: "Punt més alt", lat: hi[0], lon: hi[1], ele: Math.round(hi[3]) });
  const dLast = Math.hypot(last[0] - first[0], last[1] - first[1]);
  if (dLast > 0.01) locs.push({ name: "Meta", lat: last[0], lon: last[1], ele: last[3] ?? null });
  return locs;
}

export async function getWeather(ev: TrailEvent, raceId?: string | null): Promise<WeatherLoc[]> {
  const race = ev.races.find((r) => r.id === raceId) ?? ev.races[0];
  const locs = locationsOf(ev, raceId);
  if (!locs.length) return [];
  const key = `${ev.id}:${race?.id}:${race?.start_iso}:${locs.map((l) => l.lat.toFixed(3)).join(",")}`;
  if (cache && cache.key === key && Date.now() - cache.at < 20 * 60_000) return cache.data;

  const startMs = race?.start_iso ? new Date(race.start_iso).getTime() : null;
  const useForecast = startMs != null && startMs > Date.now() - 3600_000 && startMs < Date.now() + 15 * 86400_000;

  const out = await Promise.all(
    locs.map(async (l): Promise<WeatherLoc> => {
      const base: WeatherLoc = {
        ...l, mode: "current", at: null, temperature: null, feels_like: null, humidity: null, wind_speed: null, precip_prob: null, condition: "cloudy",
      };
      try {
        const u = new URL("https://api.open-meteo.com/v1/forecast");
        u.searchParams.set("latitude", String(l.lat));
        u.searchParams.set("longitude", String(l.lon));
        u.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code");
        u.searchParams.set("hourly", "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation_probability");
        u.searchParams.set("timezone", "Europe/Madrid");
        u.searchParams.set("forecast_days", "16");
        const r = await fetch(u, { signal: AbortSignal.timeout(8000), cache: "no-store" });
        const j: any = await r.json();
        if (useForecast && j.hourly?.time) {
          // hora de sortida en hora de Madrid, format "YYYY-MM-DDTHH:00"
          const f = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" }).format(new Date(startMs!));
          const want = f.replace(" ", "T").slice(0, 13) + ":00";
          const i = j.hourly.time.indexOf(want);
          if (i >= 0) {
            return {
              ...base,
              mode: "forecast",
              at: want,
              temperature: j.hourly.temperature_2m[i],
              feels_like: j.hourly.apparent_temperature[i],
              humidity: j.hourly.relative_humidity_2m[i],
              wind_speed: j.hourly.wind_speed_10m[i],
              precip_prob: j.hourly.precipitation_probability?.[i] ?? null,
              condition: conditionFromCode(j.hourly.weather_code[i]),
            };
          }
        }
        const c = j.current;
        return {
          ...base,
          at: c?.time ?? null,
          temperature: c?.temperature_2m ?? null,
          feels_like: c?.apparent_temperature ?? null,
          humidity: c?.relative_humidity_2m ?? null,
          wind_speed: c?.wind_speed_10m ?? null,
          condition: conditionFromCode(c?.weather_code),
        };
      } catch {
        return base;
      }
    })
  );
  cache = { key, at: Date.now(), data: out };
  return out;
}
