"use client";
import { Suspense } from "react";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import TimerBadge from "@/components/broadcast/TimerBadge";
import { useLive } from "@/lib/client/useLive";
import { useCountdown, alertLevel } from "@/lib/client/useCountdown";

function TimerOverlay() {
  const { data: race } = useLive<any>("/api/race", ["race:changed"], 2000);
  const remaining = useCountdown(race);

  let thresholds = { normal: 600, alert: 300, critical: 60, final: 10 };
  try {
    if (race) thresholds = JSON.parse(race.alert_thresholds);
  } catch {}
  const level = race ? alertLevel(remaining, thresholds) : "normal";

  return (
    <BroadcastFrame>
      <TimerBadge race={race} remaining={remaining} level={level} />
    </BroadcastFrame>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TimerOverlay />
    </Suspense>
  );
}
