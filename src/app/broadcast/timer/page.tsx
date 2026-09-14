"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import { useLive } from "@/lib/client/useLive";
import { useCountdown, formatHMS, alertLevel } from "@/lib/client/useCountdown";

const LEVEL_COLOR: Record<string, string> = {
  normal: "#0EA5E9",
  alert: "#f59e0b",
  critical: "#ef4444",
  final: "#ef4444",
};

function TimerOverlay() {
  const params = useSearchParams();
  const bare = params.get("bare") === "1";
  const { data: race } = useLive<any>("/api/race", ["race:changed"], 2000);
  const remaining = useCountdown(race);

  let thresholds = { normal: 600, alert: 300, critical: 60, final: 10 };
  try {
    if (race) thresholds = JSON.parse(race.alert_thresholds);
  } catch {}
  const level = race ? alertLevel(remaining, thresholds) : "normal";
  const color = LEVEL_COLOR[level];
  const flashing = level === "final";

  return (
    <BroadcastFrame>
      <div
        style={{
          position: "absolute",
          top: bare ? "50%" : 70,
          left: "50%",
          transform: bare ? "translate(-50%,-50%)" : "translateX(-50%)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 6, color: "#94a3b8" }}>
          {race?.status === "RUNNING" ? `LAP ${race.current_lap}` : race?.status ?? ""}
        </div>
        <div
          className={flashing ? "animate-flash-crit" : ""}
          style={{
            fontSize: 220,
            fontWeight: 900,
            lineHeight: 1,
            color,
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 0 60px rgba(0,0,0,0.6)",
          }}
        >
          {formatHMS(remaining)}
        </div>
        {!bare && (
          <div style={{ fontSize: 26, fontWeight: 700, color: "#94a3b8", marginTop: 10 }}>
            NEXT LAP {race ? race.current_lap + 1 : ""}
          </div>
        )}
      </div>
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
