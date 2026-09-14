"use client";
import { Suspense } from "react";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import { useLive } from "@/lib/client/useLive";
import { useCountdown, formatHMS, alertLevel } from "@/lib/client/useCountdown";

const LEVEL_COLOR: Record<string, string> = {
  normal: "#0EA5E9",
  alert: "#f59e0b",
  critical: "#ef4444",
  final: "#ef4444",
};

const STATUS_META: Record<string, { text: string; color: string }> = {
  ELIMINATED: { text: "ELIMINAT", color: "#f87171" },
  RETIRED: { text: "RETIRAT", color: "#fbbf24" },
  DISQUALIFIED: { text: "DESQUALIFICAT", color: "#c084fc" },
};

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

  return (
    <BroadcastFrame>
      {view === "leaderboard_general" && <LeaderboardBlock list={leaderboard} title="GENERAL" />}
      {view === "leaderboard_men" && (
        <LeaderboardBlock list={(leaderboard ?? []).filter((r) => r.gender === "M")} title="MASCULINA" />
      )}
      {view === "leaderboard_women" && (
        <LeaderboardBlock list={(leaderboard ?? []).filter((r) => r.gender === "F")} title="FEMENINA" />
      )}
      {view === "eliminated" && <EliminatedBlock list={leaderboard} />}
      {view === "leader" && <LeaderBlock stats={stats} />}
      {view === "individual" && (
        <IndividualBlock runner={(runners ?? []).find((r) => r.id === state?.selected_runner_id)} />
      )}
      {view === "timer" && <TimerBlock race={race} remaining={remaining} />}
      {showTicker && <Ticker />}
    </BroadcastFrame>
  );
}

function LeaderboardBlock({ list, title }: { list: any[] | null; title: string }) {
  const top = (list ?? []).slice(0, 12);
  return (
    <div style={{ padding: "70px 90px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 36 }}>
        <div style={{ width: 10, height: 64, background: "#0EA5E9", borderRadius: 4 }} />
        <h1 style={{ fontSize: 64, fontWeight: 900 }}>CLASSIFICACIÓ</h1>
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#0EA5E9",
            border: "3px solid #0EA5E9",
            borderRadius: 999,
            padding: "6px 26px",
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {top.map((r, i) => (
          <div
            key={r.id}
            className="animate-pop-in"
            style={{
              display: "grid",
              gridTemplateColumns: "90px 130px 1fr 220px",
              alignItems: "center",
              background: i === 0 ? "rgba(14,165,233,0.18)" : "rgba(255,255,255,0.04)",
              border: i === 0 ? "2px solid #0EA5E9" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "14px 28px",
            }}
          >
            <span style={{ fontSize: 40, fontWeight: 900, color: i === 0 ? "#0EA5E9" : "#94a3b8" }}>{i + 1}</span>
            <span style={{ fontSize: 34, fontWeight: 800, opacity: 0.7 }}>#{r.bib}</span>
            <span style={{ fontSize: 38, fontWeight: 800 }}>
              {r.first_name} {r.last_name}
            </span>
            <span style={{ fontSize: 40, fontWeight: 900, textAlign: "right" }}>
              {r.laps_completed} <span style={{ fontSize: 22, opacity: 0.6 }}>LAPS</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EliminatedBlock({ list }: { list: any[] | null }) {
  const filtered = (list ?? []).filter((r) => ["ELIMINATED", "RETIRED", "DISQUALIFIED"].includes(r.status));
  return (
    <div style={{ padding: "70px 90px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 36 }}>
        <div style={{ width: 10, height: 64, background: "#f87171", borderRadius: 4 }} />
        <h1 style={{ fontSize: 64, fontWeight: 900 }}>FORA DE CURSA</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {filtered.slice(0, 16).map((r) => {
          const meta = STATUS_META[r.status] ?? { text: r.status, color: "#94a3b8" };
          return (
            <div
              key={r.id}
              className="animate-pop-in"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${meta.color}55`,
                borderRadius: 14,
                padding: "16px 26px",
              }}
            >
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, opacity: 0.6 }}>#{r.bib}</div>
                <div style={{ fontSize: 32, fontWeight: 800 }}>
                  {r.first_name} {r.last_name}
                </div>
                <div style={{ fontSize: 18, opacity: 0.6 }}>{r.laps_completed} LAPS</div>
              </div>
              <span
                style={{
                  color: meta.color,
                  border: `2px solid ${meta.color}`,
                  borderRadius: 999,
                  padding: "6px 18px",
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                {meta.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeaderBlock({ stats }: { stats: any }) {
  return (
    <div style={{ padding: "80px 90px", display: "flex", flexDirection: "column", height: "100%" }}>
      <h1 style={{ fontSize: 60, fontWeight: 900, marginBottom: 40 }}>LEADERS</h1>
      <div style={{ display: "flex", gap: 30 }}>
        {stats?.leaderMale && (
          <div
            className="animate-pop-in"
            style={{ flex: 1, background: "linear-gradient(160deg,#0EA5E922,transparent)", border: "2px solid #0EA5E9", borderRadius: 24, padding: "40px 44px" }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 3, color: "#0EA5E9" }}>LÍDER MASCULÍ</div>
            <div style={{ fontSize: 100, fontWeight: 900, lineHeight: 1, margin: "18px 0" }}>#{stats.leaderMale.bib}</div>
            <div style={{ fontSize: 42, fontWeight: 800 }}>{stats.leaderMale.first_name} {stats.leaderMale.last_name}</div>
            <div style={{ fontSize: 30, opacity: 0.75, marginTop: 10 }}>{stats.leaderMale.laps_completed} LAPS · {stats.leaderMale.total_km} KM</div>
          </div>
        )}
        {stats?.leaderFemale && (
          <div
            className="animate-pop-in"
            style={{ flex: 1, background: "linear-gradient(160deg,#f472b622,transparent)", border: "2px solid #f472b6", borderRadius: 24, padding: "40px 44px" }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 3, color: "#f472b6" }}>LÍDER FEMENINA</div>
            <div style={{ fontSize: 100, fontWeight: 900, lineHeight: 1, margin: "18px 0" }}>#{stats.leaderFemale.bib}</div>
            <div style={{ fontSize: 42, fontWeight: 800 }}>{stats.leaderFemale.first_name} {stats.leaderFemale.last_name}</div>
            <div style={{ fontSize: 30, opacity: 0.75, marginTop: 10 }}>{stats.leaderFemale.laps_completed} LAPS · {stats.leaderFemale.total_km} KM</div>
          </div>
        )}
      </div>
    </div>
  );
}

function IndividualBlock({ runner }: { runner: any }) {
  if (!runner) return <p style={{ position: "absolute", top: 60, left: 90, fontSize: 30, opacity: 0.5 }}>Cap corredor seleccionat</p>;
  return (
    <div
      className="animate-pop-in"
      style={{
        position: "absolute",
        left: 90,
        bottom: 190,
        background: "rgba(11,15,20,0.85)",
        border: "2px solid #0EA5E9",
        borderRadius: 20,
        padding: "30px 50px",
        minWidth: 620,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, color: "#0EA5E9", letterSpacing: 2 }}>DORSAL {runner.bib}</div>
      <div style={{ fontSize: 56, fontWeight: 900, margin: "8px 0" }}>{runner.first_name} {runner.last_name}</div>
      <div style={{ display: "flex", gap: 40, fontSize: 30, fontWeight: 700, opacity: 0.9 }}>
        <span>{runner.laps_completed} LAPS</span>
        <span>{runner.total_km} KM</span>
        <span>+{runner.total_elevation} M+</span>
      </div>
    </div>
  );
}

function TimerBlock({ race, remaining }: { race: any; remaining: number }) {
  let thresholds = { normal: 600, alert: 300, critical: 60, final: 10 };
  try {
    if (race) thresholds = JSON.parse(race.alert_thresholds);
  } catch {}
  const level = race ? alertLevel(remaining, thresholds) : "normal";
  const color = LEVEL_COLOR[level];
  return (
    <div style={{ position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
      <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 6, color: "#94a3b8" }}>
        {race?.status === "RUNNING" ? `LAP ${race.current_lap}` : race?.status ?? ""}
      </div>
      <div
        className={level === "final" ? "animate-flash-crit" : ""}
        style={{ fontSize: 220, fontWeight: 900, lineHeight: 1, color, fontVariantNumeric: "tabular-nums" }}
      >
        {formatHMS(remaining)}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#94a3b8", marginTop: 10 }}>
        NEXT LAP {race ? race.current_lap + 1 : ""}
      </div>
    </div>
  );
}
