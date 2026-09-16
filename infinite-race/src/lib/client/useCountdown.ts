"use client";
import { useEffect, useState } from "react";

interface RaceLike {
  status: string;
  current_lap_ends_at: string | null;
  paused_remaining_seconds: number | null;
  lap_duration_seconds: number;
}

/** Computes remaining seconds for the current lap from real timestamps so that
 * all clients (and page refreshes) agree exactly, regardless of setInterval drift. */
export function useCountdown(race: RaceLike | null | undefined) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!race) return;
    const compute = () => {
      if (race.status === "PAUSED") {
        setRemaining(race.paused_remaining_seconds ?? race.lap_duration_seconds);
        return;
      }
      if (race.status !== "RUNNING" || !race.current_lap_ends_at) {
        setRemaining(race.lap_duration_seconds);
        return;
      }
      const ends = new Date(race.current_lap_ends_at).getTime();
      const diff = Math.max(0, Math.round((ends - Date.now()) / 1000));
      setRemaining(diff);
    };
    compute();
    const id = setInterval(compute, 250);
    return () => clearInterval(id);
  }, [race?.status, race?.current_lap_ends_at, race?.paused_remaining_seconds, race?.lap_duration_seconds]);

  return remaining;
}

export function formatHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function alertLevel(
  remaining: number,
  thresholds: { normal: number; alert: number; critical: number; final: number }
): "normal" | "alert" | "critical" | "final" {
  if (remaining <= thresholds.final) return "final";
  if (remaining <= thresholds.critical) return "critical";
  if (remaining <= thresholds.alert) return "alert";
  return "normal";
}
