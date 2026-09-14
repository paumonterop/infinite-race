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

/**
 * Sortida a pantalla completa (1920x1080) amb NOMÉS el cronòmetre,
 * pensada per emetre's tota sola (p. ex. com a font pròpia a vMix)
 * en lloc de com a gràfic superposat.
 */
function FullscreenTimer() {
  const params = useSearchParams();
  const showLabels = params.get("labels") !== "0";
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
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showLabels && (
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: 10, color: "#94a3b8", marginBottom: 10 }}>
            {race?.status === "RUNNING" ? `VOLTA ${race.current_lap}` : race?.status ?? ""}
          </div>
        )}
        <div
          className={flashing ? "animate-flash-crit" : ""}
          style={{
            fontSize: 460,
            fontWeight: 900,
            lineHeight: 1,
            color,
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 0 90px rgba(0,0,0,0.6)",
          }}
        >
          {formatHMS(remaining)}
        </div>
        {showLabels && (
          <div style={{ fontSize: 36, fontWeight: 700, color: "#94a3b8", marginTop: 14 }}>
            SEGÜENT VOLTA {race ? race.current_lap + 1 : ""}
          </div>
        )}
      </div>
    </BroadcastFrame>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FullscreenTimer />
    </Suspense>
  );
}
