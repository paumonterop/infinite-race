"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/lib/client/useLive";
import type { HistResult } from "@/lib/trail/history";
import { SceneProps, TR_KEYFRAMES, raceOf } from "./RaceScenes";
import { Avatar, Pill, STAGE, T, fmtHMS, sexColor, useFitWidth, useSceneAnim } from "./ui";

interface RunnerData {
  runner: {
    bib: string;
    first_name: string;
    last_name: string;
    sex: "M" | "F" | "";
    category: string;
    club: string;
    status: string;
    rank: number | null;
    rank_sex: number | null;
    last_point_name: string | null;
    last_point_km: number | null;
    race_time_s: number | null;
  };
  race: { id: string; name: string; color: string };
  past: HistResult[];
}

const STATUS_CA: Record<string, string> = { REGISTERED: "INSCRIT", RUNNING: "EN CURSA", FINISHED: "ARRIBAT", DNF: "RETIRAT", DNS: "NO SORTIT" };

/** El chyron i la fitxa sempre porten un dorsal triat a mà (no hi ha mode automàtic). */
const useBib = (_eventId: string, bib: string | undefined) => (bib === "auto" ? undefined : bib);

function useRunner(eventId: string, raceId: string | undefined, bib: string | undefined, history: boolean) {
  const { data } = useLive<RunnerData>(
    bib ? `/api/trail/events/${eventId}/runner?race=${raceId ?? ""}&bib=${bib}${history ? "" : "&history=0"}` : "",
    ["trail:changed"],
    history ? 15000 : 4000
  );
  return data && (data as any).runner ? data : null;
}

type Phase = "hidden" | "bar_in" | "avatar_in" | "text_in" | "visible" | "text_out" | "avatar_out" | "bar_out";

/** Fases d'entrada/sortida escalonades (barra -> avatar -> text), com al chyron original. */
function usePhases(isLive: boolean, steps: [Phase, number][], outSteps: [Phase, number][]) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("hidden");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wasVisible = useRef(false);
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
    if (isLive) {
      later(() => {
        setVisible(true);
        wasVisible.current = true;
        setPhase("hidden");
      }, 0);
      steps.forEach(([p, ms]) => later(() => setPhase(p), ms));
    } else if (wasVisible.current) {
      outSteps.forEach(([p, ms]) => later(() => setPhase(p), ms));
      later(() => {
        setPhase("hidden");
        setVisible(false);
        wasVisible.current = false;
      }, outSteps[outSteps.length - 1][1] + 380);
    }
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive]);
  return { visible, phase };
}

/** Chyron de corredor (tercer inferior): avatar + nom gran + club i dorsal. */
export function RunnerChyronScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const bib = useBib(eventId, layer.bib);
  const d = useRunner(eventId, race?.id, bib, false);
  const { visible, phase } = usePhases(
    isLive && !!d,
    [["bar_in", 30], ["avatar_in", 260], ["text_in", 460], ["visible", 760]],
    [["text_out", 0], ["avatar_out", 220], ["bar_out", 440]]
  );
  const name = d ? `${d.runner.first_name} ${d.runner.last_name}`.trim() : "";
  const fit = useFitWidth(name, { max: 46, min: 20 });
  if (!visible || !d) return null;

  const accent = d.runner.sex === "F" ? T.women : race?.color || T.accent;
  const barOn = phase !== "hidden" && phase !== "bar_out";
  const avatarShown = ["text_in", "visible", "text_out"].includes(phase);
  const textOn = ["text_in", "visible"].includes(phase);

  return (
    <div style={STAGE}>
      <div
        style={{
          position: "absolute",
          bottom: "var(--sb, 48px)",
          left: 48,
          width: 820,
          height: 150,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 30px 0 26px",
          background: T.panelStrong,
          border: `1px solid ${T.line}`,
          borderLeft: `8px solid ${accent}`,
          borderRadius: 18,
          boxShadow: T.shadow,
          opacity: barOn ? 1 : 0,
          transform: barOn ? "translateX(0)" : "translateX(-60px)",
          transition: "opacity 0.3s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ opacity: avatarShown ? 1 : 0, transform: avatarShown ? "scale(1)" : "scale(0.7)", transition: "opacity 0.3s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <Avatar name={name} bib={d.runner.bib} size={104} round={false} color={accent} />
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            justifyContent: "center",
            opacity: textOn ? 1 : 0,
            transform: textOn ? "translateX(0)" : "translateX(14px)",
            transition: "opacity 0.28s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div ref={fit.boxRef} style={{ width: "100%", display: "flex" }}>
            <span ref={fit.textRef} style={{ fontWeight: 900, color: T.white, textTransform: "uppercase", whiteSpace: "nowrap", lineHeight: 1.05, display: "block", letterSpacing: 0.4, fontSize: fit.size }}>
              {name}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span style={{ fontSize: 20, color: T.muted, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {d.runner.club || d.race.name}
            </span>
            <span style={{ marginLeft: "auto", fontWeight: 900, fontSize: 30, color: T.bgDeep, background: accent, borderRadius: 8, padding: "0 14px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              #{d.runner.bib}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const medal = (n: number) => (n === 1 ? "#fbbf24" : n === 2 ? "#C0C0C0" : n === 3 ? "#fb923c" : T.white);

/** Fitxa de corredor: estat a la cursa + els últims resultats a edicions anteriors. */
export function RunnerCardScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const bib = useBib(eventId, layer.bib);
  const d = useRunner(eventId, race?.id, bib, true);
  const { visible, phase } = usePhases(
    isLive && !!d,
    [["bar_in", 30], ["avatar_in", 450], ["text_in", 750], ["visible", 1050]],
    [["text_out", 0], ["avatar_out", 300], ["bar_out", 650]]
  );
  const name = d ? `${d.runner.first_name} ${d.runner.last_name}`.trim() : "";
  const fit = useFitWidth(name, { max: 44, min: 14 });
  if (!visible || !d) return null;

  const r = d.runner;
  const accent = r.sex === "F" ? T.women : d.race.color || T.accent;
  const redOn = phase !== "hidden" && phase !== "bar_out";
  const cardRendered = ["avatar_in", "text_in", "visible", "text_out"].includes(phase);
  const animated = ["text_in", "visible", "text_out"].includes(phase);
  const chips = [d.race.name, r.category, r.sex ? (r.sex === "F" ? "Dona" : "Home") : ""].filter(Boolean);

  return (
    <div style={STAGE}>
      <div
        style={{
          position: "absolute",
          left: 48,
          bottom: "var(--sb, 48px)",
          width: 872,
          boxSizing: "border-box",
          overflow: "hidden",
          background: T.panelStrong,
          border: `1px solid ${T.line}`,
          borderLeft: `10px solid ${accent}`,
          borderRadius: 20,
          boxShadow: T.shadow,
          opacity: redOn ? 1 : 0,
          transform: redOn ? "translateX(0)" : "translateX(-70px)",
          transition: "opacity 0.35s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ display: "flex", gap: 26, padding: "24px 30px 20px 26px", alignItems: "flex-start" }}>
          <div style={{ opacity: cardRendered ? 1 : 0, transition: "opacity 0.4s ease", flexShrink: 0 }}>
            <Avatar name={name} bib={r.bib} size={170} round={false} color={accent} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {cardRendered && (
              <>
                <div style={{ opacity: animated ? 1 : 0, transform: animated ? "translateX(0)" : "translateX(30px)", transition: "opacity 0.35s ease, transform 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
                  <div ref={fit.boxRef} style={{ width: "100%", display: "flex" }}>
                    <span ref={fit.textRef} style={{ fontWeight: 900, fontSize: fit.size, color: T.white, textTransform: "uppercase", letterSpacing: 0.8, lineHeight: 1.05, whiteSpace: "nowrap" }}>
                      {name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, minHeight: 32 }}>
                    <span style={{ fontSize: 22, color: T.muted, textTransform: "uppercase", letterSpacing: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.club}</span>
                    <span style={{ marginLeft: "auto", fontWeight: 900, fontSize: 22, color: accent }}>#{r.bib}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {chips.map((t, i) => (
                    <Pill key={i} color={accent} size={17} style={{ letterSpacing: 1, padding: "2px 14px", border: `1.5px solid ${accent}` }}>
                      {t}
                    </Pill>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {cardRendered && (
          <div style={{ borderTop: `1px solid ${T.line}`, background: "rgba(255,255,255,0.03)", padding: "14px 30px 16px 26px" }}>
            <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: 3, color: T.muted, marginBottom: 8 }}>A LA CURSA · {STATUS_CA[r.status] ?? r.status}</div>
            <div style={{ display: "flex", gap: 28, fontVariantNumeric: "tabular-nums", marginBottom: past(d) ? 14 : 0 }}>
              <Stat label="POSICIÓ" value={r.rank ? `${r.rank}º` : "—"} />
              <Stat label={r.sex === "F" ? "DONES" : "HOMES"} value={r.rank_sex ? `${r.rank_sex}º` : "—"} />
              <Stat label={r.last_point_name ? r.last_point_name.toUpperCase() : "ÚLTIM CONTROL"} value={r.race_time_s != null ? fmtHMS(r.race_time_s) : "—"} />
            </div>
            {past(d) && (
              <>
                <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: 3, color: T.muted, marginBottom: 8 }}>ÚLTIMS RESULTATS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {d.past.slice(0, 3).map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        height: 40,
                        padding: "0 12px 0 6px",
                        borderRadius: 9,
                        background: T.row,
                        border: `1px solid ${T.line}`,
                        opacity: animated ? 1 : 0,
                        transform: animated ? "translateX(0)" : "translateX(20px)",
                        transition: `opacity 0.3s ease ${0.06 + i * 0.07}s, transform 0.3s ease ${0.06 + i * 0.07}s`,
                      }}
                    >
                      <div style={{ width: 38, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)" }}>
                        <span style={{ fontWeight: 900, fontSize: 19, color: medal(p.rank), fontVariantNumeric: "tabular-nums" }}>{p.rank || "—"}</span>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 21, color: T.white, textTransform: "uppercase", letterSpacing: 0.4, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.race_name} {p.year}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 19, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{fmtHMS(p.time_s)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <style>{TR_KEYFRAMES}</style>
    </div>
  );
}

const past = (d: RunnerData) => d.past.length > 0;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontWeight: 900, fontSize: 32, color: T.white, lineHeight: 1 }}>{value}</div>
      <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 2, color: T.muted, marginTop: 4, whiteSpace: "nowrap", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
    </div>
  );
}

export { sexColor };

/** Chyron d'altres: nom + càrrec d'una persona externa (comentarista, convidat…). */
export function OtherChyronScene({ ev, layer, isLive }: SceneProps) {
  const who = ev?.others?.find((o: any) => o.id === layer.other);
  const { visible, animated } = useSceneAnim(isLive && !!who, 800);
  if (!visible || !who) return null;
  return (
    <div style={STAGE}>
      <div
        style={{
          position: "absolute",
          left: 48,
          bottom: "var(--sb, 48px)",
          minWidth: 420,
          maxWidth: 940,
          height: 110,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
          padding: "0 34px 0 26px",
          background: T.panelStrong,
          border: `1px solid ${T.line}`,
          borderLeft: `8px solid ${T.accent}`,
          borderRadius: 18,
          boxShadow: T.shadow,
          opacity: animated ? 1 : 0,
          transform: animated ? "translateX(0)" : "translateX(-60px)",
          transition: "opacity 0.35s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 42, color: T.white, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.05 }}>{who.name}</div>
        <div style={{ fontSize: 24, color: T.accent, textTransform: "uppercase", letterSpacing: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{who.role}</div>
      </div>
    </div>
  );
}
