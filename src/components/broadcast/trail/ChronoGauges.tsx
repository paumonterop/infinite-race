"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/lib/client/useLive";
import type { GpsPosition } from "@/lib/trail/types";
import type { VmixStatus } from "@/lib/trail/vmix";
import { cornerStyle, isLeft, layoutOf } from "@/lib/trail/layout";
import { SceneProps, raceOf } from "./RaceScenes";
import { STAGE, T, useSceneAnim } from "./ui";

/** Diferència (ms) entre el rellotge del servidor i el del navegador, perquè els cronòmetres no depenguin de l'hora del PC. */
export function useServerOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let stop = false;
    const sync = async () => {
      try {
        const t0 = Date.now();
        const r = await fetch("/api/time", { cache: "no-store" });
        const j = await r.json();
        const t1 = Date.now();
        if (!stop) setOffset(j.now - (t0 + t1) / 2);
      } catch {
        /* es manté el valor anterior */
      }
    };
    sync();
    const iv = setInterval(sync, 5 * 60_000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);
  return offset;
}

function useNow(offset: number) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(iv);
  }, [offset]);
  return now;
}

/** Text del cronòmetre d'una cursa: temps transcorregut des de la sortida (00:00:00 fins que surt). */
/** hh:mm:ss amb hores de dues xifres (00:12:05). */
function hhmmss(total: number) {
  const s = Math.max(0, Math.floor(total));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

function clockText(startIso: string | null, now: number) {
  if (!startIso) return { text: "--:--:--", before: false };
  const diff = Math.floor((now - new Date(startIso).getTime()) / 1000);
  // abans de la sortida es queda a 00:00:00 (sense compte enrere)
  return { text: hhmmss(diff < 0 ? 0 : diff), before: false };
}

function Clock({ show, text, label, color, before, fromLeft = false }: { show: boolean; text: string; label?: string; color: string; before?: boolean; fromLeft?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        height: 64,
        borderRadius: 14,
        overflow: "hidden",
        boxSizing: "border-box",
        background: T.panelStrong,
        border: `1px solid ${T.line}`,
        boxShadow: T.shadow,
        transform: show ? "translateX(0)" : `translateX(${fromLeft ? "-130%" : "130%"})`,
        opacity: show ? 1 : 0,
        transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease",
      }}
    >
      <div style={{ width: 62, display: "flex", alignItems: "center", justifyContent: "center", background: color, flexShrink: 0 }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#05070a" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l3 2M9 2h6" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px", minWidth: 200 }}>
        {label ? <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: T.muted, textTransform: "uppercase", lineHeight: 1 }}>{before ? `${label} · SORTIDA EN` : label}</span> : null}
        <span style={{ fontSize: 40, fontWeight: 900, color: before ? T.amber : T.white, letterSpacing: 1, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, whiteSpace: "nowrap" }}>
          {text}
        </span>
      </div>
    </div>
  );
}

/** Cronòmetre d'una cursa (cantonada superior esquerra). */
export function ChronoScene({ ev, layer, isLive }: SceneProps) {
  const cfg = layoutOf(ev, "chrono");
  const race = raceOf(ev, layer);
  const offset = useServerOffset();
  const now = useNow(offset);
  const { visible, animated } = useSceneAnim(isLive, 900);
  if (!visible || !race) return null;
  const c = clockText(race.start_iso, now);
  return (
    <div style={STAGE}>
      <div style={cornerStyle(cfg)}>
        <Clock show={animated} text={c.text} before={c.before} label={race.name} color={race.color || T.accent} fromLeft={isLeft(cfg.corner)} />
      </div>
    </div>
  );
}

/** Els cronòmetres de totes les curses alhora (apilats). */
export function ChronoAllScene({ ev, isLive }: SceneProps) {
  const cfg = layoutOf(ev, "chrono");
  const offset = useServerOffset();
  const now = useNow(offset);
  const { visible, animated } = useSceneAnim(isLive, 900);
  if (!visible || !ev) return null;
  return (
    <div style={STAGE}>
      <div style={{ ...cornerStyle(cfg), display: "flex", flexDirection: "column", alignItems: isLeft(cfg.corner) ? "flex-start" : "flex-end", gap: 10 }}>
        {ev.races.map((r: any, i: number) => {
          const c = clockText(r.start_iso, now);
          return (
            <div key={r.id} style={{ transition: `transform 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms` }}>
              <Clock show={animated} text={c.text} before={c.before} label={r.name} color={r.color || T.accent} fromLeft={isLeft(cfg.corner)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dials de motxilla ──
export const GAUGE_W = 132;

function GaugeCard({ show, name, accent, ratio, value, unit, right = 48, bottom = "var(--sb, 48px)" }: { show: boolean; name: string; accent: string; ratio: number; value: string; unit: string; right?: number; bottom?: number | string }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const ARC = C * 0.75;
  const r = Math.max(0, Math.min(1, ratio || 0));
  return (
    <div
      style={{
        position: "absolute",
        right,
        bottom,
        width: GAUGE_W,
        boxSizing: "border-box",
        padding: 8,
        background: T.panelStrong,
        border: `1px solid ${T.line}`,
        borderTop: `3px solid ${accent}`,
        borderRadius: 14,
        boxShadow: T.shadow,
        textAlign: "center",
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1), right 0.5s ease",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 11, letterSpacing: 1, color: T.muted, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
      <div style={{ position: "relative", width: 112, height: 112, margin: "2px auto 0" }}>
        <svg width="112" height="112" viewBox="0 0 112 112" style={{ position: "absolute", inset: 0 }}>
          <g transform="rotate(135 56 56)" fill="none" strokeWidth="9" strokeLinecap="round">
            <circle cx="56" cy="56" r={R} stroke="rgba(255,255,255,0.12)" strokeDasharray={`${ARC} ${C}`} />
            <circle cx="56" cy="56" r={R} stroke={accent} strokeDasharray={`${Math.max(0.5, ARC * r)} ${C}`} style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.6s ease" }} />
          </g>
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 4, fontWeight: 900, fontSize: value.length > 3 ? 30 : 42, color: T.white, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>
          {value}
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: 15, color: T.white, opacity: 0.85, marginTop: -14, letterSpacing: 1 }}>{unit}</div>
    </div>
  );
}

/** Motxilla de l'escena: la triada o, amb "auto", la de l'input que vMix té ara en programa (cap si no és una motxilla). */
function useResolvedDevice(eventId: string, layer: { device?: string }) {
  const auto = layer.device === "auto";
  const { data: vm } = useLive<VmixStatus>(auto ? `/api/trail/events/${eventId}/vmix` : "", [], 1000);
  return auto ? (vm && !(vm as any).error ? vm.device_id ?? undefined : undefined) : layer.device;
}

function useDevice(eventId: string, id: string | undefined) {
  const { data } = useLive<GpsPosition[]>(id ? `/api/trail/events/${eventId}/gps` : "", [], 1500);
  return Array.isArray(data) ? data.find((d) => d.id === id) ?? null : null;
}

/** Mitjana mòbil de les últimes mostres per suavitzar el dial. */
function useSmoothed(value: number | null | undefined, len = 5) {
  const buf = useRef<number[]>([]);
  const [v, setV] = useState(0);
  useEffect(() => {
    buf.current.push(value ?? 0);
    if (buf.current.length > len) buf.current.shift();
    setV(buf.current.reduce((a, b) => a + b, 0) / buf.current.length);
  }, [value, len]);
  return v;
}

const deviceName = (d: GpsPosition | null, layer: { device?: string }) => d?.runner_name || d?.label || (layer.device === "auto" ? "" : layer.device) || "";

/** Dial de velocitat d'una motxilla (km/h). */
export function GpsSpeedScene({ eventId, layer, isLive }: SceneProps) {
  const id = useResolvedDevice(eventId, layer);
  const d = useDevice(eventId, id);
  const speed = useSmoothed(d?.status === "online" ? d.speed_kmh : 0);
  const { visible, animated } = useSceneAnim(isLive && !!id, 700);
  if (!visible) return null;
  const MAX = 30;
  const ratio = speed / MAX;
  const accent = ratio < 0.5 ? T.green : ratio < 0.7 ? T.amber : ratio < 0.85 ? "#f59e0b" : T.redStrong;
  return (
    <div style={STAGE}>
      <GaugeCard show={animated} name={deviceName(d, layer)} accent={accent} ratio={ratio} value={speed.toFixed(0)} unit="km/h" />
    </div>
  );
}

/** Dial de pendent d'una motxilla (%), segons el perfil del GPX a la seva posició. `shift`: es desplaça si hi ha el de velocitat. */
export function GpsGradientScene({ eventId, layer, isLive, shift }: SceneProps & { shift?: boolean }) {
  const id = useResolvedDevice(eventId, layer);
  const d = useDevice(eventId, id);
  const g = useSmoothed(d?.status === "online" ? d.gradient_pct : 0);
  const { visible, animated } = useSceneAnim(isLive && !!id, 700);
  if (!visible) return null;
  const MAX = 15;
  const abs = Math.abs(g);
  const flat = abs <= 0.5;
  const up = g > 0.5;
  const accent = flat ? "rgba(255,255,255,0.65)" : up ? "#f59e0b" : "#22d3ee";
  return (
    <div style={STAGE}>
      <GaugeCard
        show={animated}
        name={deviceName(d, layer)}
        accent={accent}
        ratio={Math.min(abs, MAX) / MAX}
        value={`${flat ? "" : up ? "+" : "−"}${abs.toFixed(0)}`}
        unit={flat ? "% pla" : up ? "% pujada" : "% baixada"}
        right={shift ? 48 + GAUGE_W + 12 : 48}
      />
    </div>
  );
}
