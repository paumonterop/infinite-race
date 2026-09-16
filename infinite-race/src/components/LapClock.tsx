"use client";
import { useCountdown, formatHMS, alertLevel } from "@/lib/client/useCountdown";

const LEVEL_CLASS: Record<string, string> = {
  normal: "text-sky-400",
  alert: "text-amber-400",
  critical: "text-red-500",
  final: "text-red-500 animate-flash-crit",
};

export default function LapClock({
  race,
  size = "lg",
}: {
  race: any;
  size?: "lg" | "xl";
}) {
  const remaining = useCountdown(race);
  if (!race) return null;
  let thresholds = { normal: 600, alert: 300, critical: 60, final: 10 };
  try {
    thresholds = JSON.parse(race.alert_thresholds);
  } catch {}
  const level = alertLevel(remaining, thresholds);
  const laptxt = race.status === "SETUP" ? "—" : `LAP ${race.current_lap}`;

  return (
    <div className="text-center">
      <div className="text-sm font-semibold tracking-[0.3em] text-slate-400">{laptxt}</div>
      <div
        className={`mono-num font-black leading-none ${LEVEL_CLASS[level]} ${
          size === "xl" ? "text-[7rem]" : "text-6xl"
        }`}
      >
        {formatHMS(remaining)}
      </div>
    </div>
  );
}
