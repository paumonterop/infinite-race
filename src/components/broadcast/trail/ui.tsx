"use client";
import { CSSProperties, ReactNode, useEffect, useState } from "react";

// Llenguatge visual de les escenes (el mateix que infinite-race / gfx-suite-onon): blau nit, panells translúcids amb
// vora fina, accent, dones en rosa, números tabulars i tipografia gruixuda en majúscules.
export const T = {
  bg: "#0b0f14",
  bgDeep: "#05070a",
  panel: "rgba(8,12,18,0.88)",
  panelStrong: "rgba(8,12,18,0.95)",
  row: "rgba(255,255,255,0.045)",
  line: "rgba(255,255,255,0.08)",
  text: "#e6edf3",
  white: "#ffffff",
  muted: "#94a3b8",
  accent: "#0EA5E9",
  accentSoft: "rgba(14,165,233,0.18)",
  women: "#f472b6",
  amber: "#fbbf24",
  green: "#34d399",
  red: "#f87171",
  redStrong: "#ef4444",
  radiusRow: 10,
  shadow: "0 18px 50px rgba(0,0,0,0.45)",
  font: "ui-sans-serif, system-ui, 'Segoe UI', Roboto, Arial, sans-serif",
};

export const sexColor = (sex: string) => (sex === "F" ? T.women : T.accent);

/** Entrada/sortida d'una escena: `visible` fins que acaba l'animació de sortida; `animated` quan ha d'estar en pantalla. */
export function useSceneAnim(isLive: boolean, outMs = 800) {
  const [visible, setVisible] = useState(false);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    if (isLive) {
      setVisible(true);
      const t = setTimeout(() => setAnimated(true), 30);
      return () => clearTimeout(t);
    }
    setAnimated(false);
    const t = setTimeout(() => setVisible(false), outMs);
    return () => clearTimeout(t);
  }, [isLive, outMs]);
  return { visible, animated };
}

export function fmtHMS(s: number | null | undefined) {
  if (s == null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Diferència amb el primer: «+3:50» i, a partir d'una hora, «+1:05:12». */
export function fmtGap(s: number) {
  const sec = Math.max(0, Math.round(s));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = String(sec % 60).padStart(2, "0");
  return h > 0 ? `+${h}:${String(m).padStart(2, "0")}:${ss}` : `+${m}:${ss}`;
}

export function initials(name: string) {
  const p = name.replace(/[.]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "";
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
}

const MONO = ["#0EA5E9", "#38bdf8", "#34d399", "#fbbf24", "#c084fc", "#f472b6", "#fb923c", "#22d3ee"];
export function monoColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return MONO[h % MONO.length];
}

/** Avatar amb monograma (no depenem de fotos d'atletes). */
export function Avatar({ name, bib, size = 56, color, round = true }: { name: string; bib?: string; size?: number; color?: string; round?: boolean }) {
  const c = color || monoColor(name || bib || "");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: round ? "50%" : Math.round(size * 0.22),
        flexShrink: 0,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(145deg, ${c}33, ${c}11)`,
        border: `2px solid ${c}`,
        color: c,
        fontFamily: T.font,
        fontWeight: 900,
        fontSize: size * 0.4,
        letterSpacing: 0.5,
      }}
    >
      {initials(name) || (bib ? `#${bib}` : "·")}
    </div>
  );
}

export function Pill({ children, color = T.accent, size = 18, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: T.font,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: 2,
        color,
        border: `2px solid ${color}`,
        borderRadius: 999,
        padding: "2px 14px",
        whiteSpace: "nowrap",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ── Llistes (classificacions, favorits, històric) ──
export const PANEL_WIDTH = 1000;
const ROW_H = 62;
const ROW_GAP = 8;

export function ListPanel({ animated, children, top = 24 }: { animated: boolean; children: ReactNode; top?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        width: 1920,
        height: 1080,
        top: 0,
        left: 0,
        pointerEvents: "none",
        opacity: animated ? 1 : 0,
        transform: animated ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.55s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1)",
        fontFamily: T.font,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: (1920 - PANEL_WIDTH) / 2,
          top,
          width: PANEL_WIDTH,
          boxSizing: "border-box",
          background: T.panel,
          border: `1px solid ${T.line}`,
          borderRadius: 22,
          boxShadow: T.shadow,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ListHeader({ title, badge, accent, right }: { title: string; badge?: string; accent: string; right?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        height: 84,
        padding: "0 26px",
        background: `linear-gradient(90deg, ${accent}2b, rgba(8,12,18,0))`,
        borderBottom: `1px solid ${T.line}`,
      }}
    >
      <div style={{ width: 8, height: 44, background: accent, borderRadius: 4 }} />
      <span style={{ fontWeight: 900, fontSize: 40, color: T.white, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{title}</span>
      {badge && <Pill color={accent} size={22} style={{ padding: "3px 18px" }}>{badge}</Pill>}
      {right && <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 24, color: T.muted, letterSpacing: 1 }}>{right}</span>}
    </div>
  );
}

export function ListFooter({ text }: { text?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: 40,
        marginTop: 6,
        borderTop: `1px solid ${T.line}`,
        background: "rgba(0,0,0,0.28)",
        color: T.muted,
        fontWeight: 800,
        fontSize: 14,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
}

export interface RowData {
  rank: number | string;
  name: string;
  club?: string;
  extra?: string; // text petit abans de la dada principal
  diff?: string; // dada principal a la dreta
}

export function RankRow({ r, index, total, animated, accent }: { r: RowData; index: number; total: number; animated: boolean; accent: string }) {
  const STAGGER = 60;
  const enter = index * STAGGER;
  const exit = (total - 1 - index) * STAGGER;
  const first = Number(r.rank) === 1;
  const slide: CSSProperties = animated
    ? { opacity: 1, transform: "translateX(0px)", transition: `opacity 0.4s ease ${enter}ms, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${enter}ms` }
    : { opacity: 0, transform: "translateX(-26px)", transition: `opacity 0.3s ease ${exit}ms, transform 0.3s cubic-bezier(0.55,0,1,0.45) ${exit}ms` };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        height: ROW_H,
        margin: `0 16px ${ROW_GAP}px`,
        padding: "0 18px 0 10px",
        boxSizing: "border-box",
        borderRadius: T.radiusRow,
        overflow: "hidden",
        background: first ? `linear-gradient(90deg, ${accent}30, rgba(255,255,255,0.03))` : T.row,
        border: `1px solid ${first ? accent : T.line}`,
        ...slide,
      }}
    >
      <div
        style={{
          minWidth: 50,
          padding: "0 10px",
          height: ROW_H - 16,
          flexShrink: 0,
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 32,
          fontVariantNumeric: "tabular-nums",
          background: first ? accent : "rgba(255,255,255,0.08)",
          color: first ? T.bgDeep : T.text,
          transform: animated ? "scale(1)" : "scale(0.6)",
          transition: animated ? `transform 0.35s cubic-bezier(0.34,1.56,0.64,1) ${enter + 80}ms` : `transform 0.25s ease ${exit}ms`,
        }}
      >
        {r.rank}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
        <div style={{ fontWeight: 900, fontSize: 31, color: T.white, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.05 }}>
          {r.name}
        </div>
        {r.club ? (
          <div style={{ fontSize: 16, color: T.muted, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
            {r.club}
          </div>
        ) : null}
      </div>
      {r.extra ? <div style={{ fontSize: 17, color: T.muted, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: 0.5 }}>{r.extra}</div> : null}
      {r.diff ? (
        <div style={{ fontWeight: 900, fontSize: 33, color: first ? T.white : T.text, minWidth: 120, textAlign: "right", letterSpacing: 0.5, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {r.diff}
        </div>
      ) : null}
    </div>
  );
}

/** Color del perfil segons la pendent: verd (baixada) -> groc -> taronja -> vermell (pujada molt dura). */
export function gradientColor(pct: number) {
  const stops = [
    { pct: -8, r: 22, g: 163, b: 74 },
    { pct: -2, r: 134, g: 239, b: 172 },
    { pct: 3, r: 250, g: 204, b: 21 },
    { pct: 8, r: 249, g: 115, b: 22 },
    { pct: 13, r: 239, g: 68, b: 68 },
    { pct: 20, r: 153, g: 27, b: 27 },
  ];
  const last = stops[stops.length - 1];
  if (pct <= stops[0].pct) return `rgb(${stops[0].r},${stops[0].g},${stops[0].b})`;
  if (pct >= last.pct) return `rgb(${last.r},${last.g},${last.b})`;
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i].pct && pct <= stops[i + 1].pct) {
      const t = (pct - stops[i].pct) / (stops[i + 1].pct - stops[i].pct);
      const f = (k: "r" | "g" | "b") => Math.round(stops[i][k] + t * (stops[i + 1][k] - stops[i][k]));
      return `rgb(${f("r")},${f("g")},${f("b")})`;
    }
  }
  return `rgb(${last.r},${last.g},${last.b})`;
}

export const STAGE: CSSProperties = { position: "absolute", top: 0, left: 0, width: 1920, height: 1080, pointerEvents: "none", fontFamily: T.font };

import { useLayoutEffect, useRef } from "react";

/** Mida de lletra d'un text d'una sola línia que s'adapta a l'amplada del contenidor (mesurada, no estimada). */
export function useFitWidth(text: string, { max = 46, min = 18 }: { max?: number; min?: number } = {}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(max);
  useLayoutEffect(() => {
    const box = boxRef.current;
    const el = textRef.current;
    if (!box || !el) return;
    const fit = () => {
      let s = max;
      el.style.fontSize = `${s}px`;
      while (el.scrollWidth > box.clientWidth && s > min) {
        s -= 0.5;
        el.style.fontSize = `${s}px`;
      }
      setSize(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [text, max, min]);
  return { boxRef, textRef, size };
}
