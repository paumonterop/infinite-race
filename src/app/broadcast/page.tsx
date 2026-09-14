"use client";
import { Suspense } from "react";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import Panel, { PanelHeader } from "@/components/broadcast/Panel";
import LeaderboardPanel from "@/components/broadcast/LeaderboardPanel";
import EliminatedPanel from "@/components/broadcast/EliminatedPanel";
import LeaderPanel from "@/components/broadcast/LeaderPanel";
import TimerBadge from "@/components/broadcast/TimerBadge";
import { useLive } from "@/lib/client/useLive";
import { useCountdown, alertLevel } from "@/lib/client/useCountdown";

export default function BroadcastMainPage() {
  return (
    <Suspense fallback={null}>
      <BroadcastMainInner />
    </Suspense>
  );
}

function BroadcastMainInner() {
  const { data: state } = useLive<any>("/api/broadcast/state", ["broadcast:changed"], 2000);
  const { data: race } = useLive<any>("/api/race", ["race:changed"], 2000);
  const { data: stats } = useLive<any>("/api/stats", ["runners:changed"], 3000);
  const { data: runners } = useLive<any[]>("/api/runners", ["runners:changed"], 3000);
  const { data: leaderboard } = useLive<any[]>("/api/leaderboard", ["runners:changed"], 3000);
  const remaining = useCountdown(race);

  const view = state?.active_view ?? "leaderboard_general";
  const showTicker = !!state?.ticker_enabled;

  let thresholds = { normal: 600, alert: 300, critical: 60, final: 10 };
  try {
    if (race) thresholds = JSON.parse(race.alert_thresholds);
  } catch {}
  const level = race ? alertLevel(remaining, thresholds) : "normal";

  return (
    <BroadcastFrame>
      {view === "leaderboard_general" && <LeaderboardPanel list={leaderboard} title="GENERAL" />}
      {view === "leaderboard_men" && (
        <LeaderboardPanel list={(leaderboard ?? []).filter((r) => r.gender === "M")} title="MASCULINA" />
      )}
      {view === "leaderboard_women" && (
        <LeaderboardPanel list={(leaderboard ?? []).filter((r) => r.gender === "F")} title="FEMENINA" />
      )}
      {view === "eliminated" && <EliminatedPanel list={leaderboard} />}
      {view === "leader" && <LeaderPanel stats={stats} />}
      {view === "individual" && (
        <IndividualBlock runner={(runners ?? []).find((r) => r.id === state?.selected_runner_id)} />
      )}
      {/* El cronòmetre broadcast és sempre visible, petit, a dalt a la dreta */}
      <TimerBadge race={race} remaining={remaining} level={level} />
      {showTicker && <Ticker />}
    </BroadcastFrame>
  );
}

function IndividualBlock({ runner }: { runner: any }) {
  if (!runner) return null;
  return (
    <Panel>
      <PanelHeader title={`DORSAL ${runner.bib}`} />
      <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
        {runner.first_name} {runner.last_name}
      </div>
      <div style={{ display: "flex", gap: 20, fontSize: 15, fontWeight: 700, opacity: 0.9 }}>
        <span>{runner.laps_completed} VOLTES</span>
        <span>{runner.total_km} KM</span>
        <span>+{runner.total_elevation} M+</span>
      </div>
    </Panel>
  );
}
