"use client";
import { useMemo } from "react";
import { useLive } from "@/lib/client/useLive";
import type { Layer } from "@/lib/trail/scenes";
import type { Analysis } from "@/lib/trail/analysis";
import type { WeatherLoc } from "@/lib/trail/weather";
import type { SurfaceState, SurfaceType } from "@/lib/trail/surface";
import { STAGE, T, gradientColor, useSceneAnim } from "./ui";

export interface SceneProps {
  eventId: string;
  ev: any; // esdeveniment (vista del navegador)
  layer: Layer;
  isLive: boolean;
}

export const raceOf = (ev: any, layer: Layer) => ev?.races.find((r: any) => r.id === layer.race_id) ?? ev?.races[0];

const fmt = (v: number | null | undefined, d = 1) => (v == null ? "—" : Number(v).toFixed(d).replace(".", ","));

export function useAnalysis(eventId: string, raceId: string | undefined) {
  const { data } = useLive<Analysis>(raceId ? `/api/trail/events/${eventId}/analysis?race=${raceId}` : "", ["trail:changed"], 60000);
  return data && !(data as any).error ? data : null;
}

import { checkpointSegments } from "@/lib/trail/segments";
export { checkpointSegments };

/** Perfil d'un tram (km_start..km_end) acolorit per pendent (finestra mòbil). */
export function GradientProfile({ points, from, to, W = 1400, H = 220, stroke = 12, delay = 0.5 }: { points: number[][]; from: number; to: number; W?: number; H?: number; stroke?: number; delay?: number }) {
  const pts = points.filter((p) => p[3] >= from && p[3] <= to).map((p) => ({ ele: p[2], dist: p[3] - from }));
  if (pts.length < 2) return null;
  const len = Math.max(to - from, 0.001);
  const min = Math.min(...pts.map((p) => p.ele));
  const max = Math.max(...pts.map((p) => p.ele));
  const rng = Math.max(max - min, 1);
  const X = (d: number) => (d / len) * W;
  const Y = (e: number) => H - 30 - ((e - min) / rng) * (H - 50);
  const WIN = Math.max(2, Math.round(pts.length / 40));
  const grads = pts.map((_, i) => {
    const a = Math.max(0, i - WIN);
    const b = Math.min(pts.length - 1, i + WIN);
    const dm = (pts[b].dist - pts[a].dist) * 1000;
    return dm > 0 ? ((pts[b].ele - pts[a].ele) / dm) * 100 : 0;
  });
  return (
    <div style={{ width: W, height: H, animation: `trReveal 0.6s cubic-bezier(0.65,0,0.35,1) ${delay}s both` }}>
      <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
        {pts.slice(1).map((p, i) => (
          <line key={i} x1={X(pts[i].dist)} y1={Y(pts[i].ele)} x2={X(p.dist)} y2={Y(p.ele)} stroke={gradientColor((grads[i] + grads[i + 1]) / 2)} strokeWidth={stroke} strokeLinecap="round" />
        ))}
        <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    </div>
  );
}

export const TR_KEYFRAMES = `
  @keyframes trAccentGrow { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
  @keyframes trFadeUp { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes trReveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0% 0 0); } }
  @keyframes trSlideIn { from { transform: translateX(-80px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes trSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-80px); opacity: 0; } }
`;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ minWidth: 160 }}>
      <div style={{ fontWeight: 900, fontSize: 84, color: T.white, lineHeight: 1 }}>{value}</div>
      <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 1.5, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>{label}</div>
    </div>
  );
}

const chip = (accent: string) => ({
  fontWeight: 700,
  fontSize: 26,
  color: T.white,
  background: `${accent}1f`,
  border: `2px solid ${accent}b3`,
  borderRadius: 34,
  padding: "8px 24px",
  whiteSpace: "nowrap" as const,
});

const SURFACE_COLORS: Record<SurfaceType, string> = {
  Road: "#9aa1b0",
  "Forestry road": "#c9a45a",
  Trail: "#7fbf6a",
  "Hiking trail": "#4fa38a",
  "Mountain trail": "#a06fd0",
  Unknown: "#3a3f4b",
};
const SURFACE_LABELS_CA: Record<SurfaceType, string> = {
  Road: "Asfalt / carretera",
  "Forestry road": "Pista forestal",
  Trail: "Corriol",
  "Hiking trail": "Camí de senderisme",
  "Mountain trail": "Camí de muntanya",
  Unknown: "Sense dades",
};
const SURFACE_ORDER: SurfaceType[] = ["Road", "Forestry road", "Trail", "Hiking trail", "Mountain trail", "Unknown"];

/** Highlights de la cursa: fitxa tècnica / pujada més dura / gran baixada (a partir de l'anàlisi del GPX). */
export function HighlightsScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const a = useAnalysis(eventId, race?.id);
  const { visible, animated } = useSceneAnim(isLive, 600);
  const accent = race?.color || T.accent;
  const slide = layer.scene === "highlights_climb" ? "climb" : layer.scene === "highlights_descent" ? "descent" : layer.scene === "highlights_surface" ? "surface" : "stats";
  const { data: surface } = useLive<SurfaceState>(slide === "surface" && race ? `/api/trail/events/${eventId}/surface?race=${race.id}` : "", [], 15000);

  const segs = useMemo(() => (a ? checkpointSegments(a) : []), [a]);
  const climb = useMemo(() => segs.filter((s) => s.type === "UPHILL").sort((x, y) => y.gain_m - x.gain_m)[0], [segs]);
  const descent = useMemo(() => segs.filter((s) => s.type === "DOWNHILL").sort((x, y) => y.loss_m - x.loss_m)[0], [segs]);

  if (!visible || !a) return null;

  const title = slide === "stats" ? "FITXA TÈCNICA" : slide === "climb" ? "LA PUJADA MÉS DURA" : slide === "descent" ? "LA GRAN BAIXADA" : "TIPUS DE TERRENY";
  const seg = slide === "climb" ? climb : descent;

  let body: React.ReactNode = null;
  if (slide === "stats") {
    const cps = [...a.checkpoints].sort((x, y) => x.km_on_track - y.km_on_track);
    const totalKm = Math.max(a.distance_km, cps[cps.length - 1]?.km_on_track ?? 0, 0.001);
    body = (
      <>
        <div style={{ display: "flex", gap: 56, flexWrap: "wrap", marginBottom: 36 }}>
          <Stat value={fmt(a.distance_km, 1)} label="DISTÀNCIA (KM)" />
          <Stat value={fmt(a.elevation_gain_m, 0)} label="DESNIVELL + (M)" />
          <Stat value={fmt(a.max_elevation_m, 0)} label="ALTITUD MÀXIMA (M)" />
        </div>
        {cps.length > 0 && (
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", width: 1600, paddingTop: 14 }}>
            <div style={{ position: "absolute", top: 5, left: 6, right: 6, height: 2, background: "rgba(255,255,255,0.3)", animation: "trReveal 2.6s linear 0.5s both" }} />
            {cps.map((c, i) => {
              const delay = 0.5 + Math.min(Math.max(c.km_on_track / totalKm, 0), 1) * 2.6;
              return (
                <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 110, maxWidth: 210, animation: `trFadeUp 0.4s ease-out ${delay}s both` }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: accent, border: "2px solid rgba(255,255,255,0.9)", marginBottom: 10 }} />
                  <div style={{ fontWeight: 900, fontSize: 34, color: T.white, lineHeight: 1 }}>{fmt(c.km_on_track, 1)} KM</div>
                  <div style={{ fontWeight: 600, fontSize: 24, color: "rgba(255,255,255,0.65)", textAlign: "center", marginTop: 4, lineHeight: 1.2 }}>{c.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  } else if (slide === "surface") {
    if (!surface || surface.status !== "ready") {
      const msg = !surface || surface.status === "pending" ? "Calculant superfícies…" : surface.status === "error" ? `Superfícies no disponibles (${surface.error})` : "Sense dades de superfície";
      body = <div style={{ fontSize: 26, color: "rgba(255,255,255,0.6)" }}>{msg}</div>;
    } else {
      const dist = surface.distribution_km;
      const entries = SURFACE_ORDER.filter((k) => dist[k] > 0);
      body = (
        <>
          <div style={{ display: "flex", height: 44, borderRadius: 8, overflow: "hidden", width: 1400, maxWidth: "100%", marginBottom: 24, animation: "trReveal 0.6s cubic-bezier(0.65,0,0.35,1) 0.5s both" }}>
            {entries.map((k) => (
              <div key={k} style={{ flex: dist[k], background: SURFACE_COLORS[k] }} />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 30px" }}>
            {entries.map((k) => (
              <span key={k} style={{ ...chip(accent), fontSize: 30 }}>
                <span style={{ color: SURFACE_COLORS[k] }}>●</span> {SURFACE_LABELS_CA[k]} · {String(dist[k]).replace(".", ",")} KM
              </span>
            ))}
          </div>
        </>
      );
    }
  } else if (!seg) {
    body = <div style={{ fontSize: 22, color: "rgba(255,255,255,0.6)" }}>Sense dades</div>;
  } else {
    const len = Math.max(seg.km_end - seg.km_start, 0.01);
    const avg = seg.type === "UPHILL" ? (seg.gain_m / (len * 1000)) * 100 : -(seg.loss_m / (len * 1000)) * 100;
    body = (
      <>
        <div style={{ fontWeight: 600, fontSize: 22, letterSpacing: 0.5, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>{seg.name}</div>
        <div style={{ fontWeight: 900, fontSize: 72, color: T.white, lineHeight: 1, marginBottom: 18 }}>
          KM {seg.km_start}–{seg.km_end}
        </div>
        <GradientProfile points={a.points} from={seg.km_start} to={seg.km_end} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
          <span style={chip(accent)}>LLARGADA {fmt(len, 1)} KM</span>
          {seg.type === "UPHILL" ? <span style={chip(accent)}>DESNIVELL + {seg.gain_m} M</span> : <span style={chip(accent)}>DESNIVELL − {seg.loss_m} M</span>}
          <span style={chip(accent)}>PENDENT MITJÀ {avg > 0 ? "+" : ""}{fmt(avg, 1)}%</span>
        </div>
      </>
    );
  }

  return (
    <div style={{ ...STAGE, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(5,7,10,0.35) 45%, rgba(5,7,10,0.88) 78%, rgba(5,7,10,0.95) 100%)",
          opacity: animated ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      />
      <div key={layer.scene} style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", alignItems: "stretch", padding: "0 0 calc(84px + var(--sb, 48px) - 48px) 130px", opacity: animated ? 1 : 0, transition: "opacity 0.4s ease" }}>
        <div style={{ width: 7, background: accent, marginRight: 34, flexShrink: 0, transformOrigin: "bottom", animation: "trAccentGrow 0.5s cubic-bezier(0.22,1,0.36,1) both" }} />
        <div style={{ maxWidth: 1700 }}>
          <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: 4, color: accent, marginBottom: 6, animation: "trFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.05s both" }}>
            ANÀLISI DE LA CURSA · {race?.name?.toUpperCase()}
          </div>
          <div style={{ fontWeight: 900, fontSize: 58, letterSpacing: 1, color: T.white, textTransform: "uppercase", marginBottom: 30, lineHeight: 1.05, animation: "trFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.12s both" }}>{title}</div>
          <div style={{ animation: "trFadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.22s both" }}>{body}</div>
        </div>
      </div>
      <style>{TR_KEYFRAMES}</style>
    </div>
  );
}

// ── Meteo ──
const ICON: Record<string, string> = { sunny: "☀️", cloudy: "⛅", rain: "🌧️", showers: "🌦️", snow: "❄️", storm: "⛈️", fog: "🌫️" };
const CONDITION_CA: Record<string, string> = { sunny: "Assolellat", cloudy: "Ennuvolat", rain: "Pluja", showers: "Ruixats", snow: "Neu", storm: "Tempesta", fog: "Boira" };

export function WeatherScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const { data } = useLive<WeatherLoc[]>(`/api/trail/events/${eventId}/weather?race=${race?.id ?? ""}`, [], 5 * 60_000);
  const { visible } = useSceneAnim(isLive, 900);
  if (!visible || !data || !Array.isArray(data) || data.length === 0) return null;
  const forecast = data[0].mode === "forecast";
  const anim = (d = 0) => (isLive ? `trSlideIn 0.55s cubic-bezier(0.22,1,0.36,1) ${d}s both` : `trSlideOut 0.45s ease-in ${d}s both`);
  const accent = race?.color || T.accent;
  const hour = data[0].at ? data[0].at.slice(11, 16) : "";

  return (
    <div style={STAGE}>
      <div
        style={{
          position: "absolute",
          left: 48,
          bottom: "var(--sb, 48px)",
          width: 820,
          boxSizing: "border-box",
          overflow: "hidden",
          background: T.panelStrong,
          border: `1px solid ${T.line}`,
          borderRadius: 18,
          boxShadow: T.shadow,
          animation: anim(0.05),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, height: 64, padding: "0 20px", background: `linear-gradient(90deg, ${accent}2e, rgba(8,12,18,0))`, borderBottom: `1px solid ${T.line}` }}>
          <div style={{ width: 6, height: 30, background: accent, borderRadius: 3 }} />
          <span style={{ fontWeight: 900, fontSize: 30, color: T.white, textTransform: "uppercase", letterSpacing: 0.5 }}>Meteo</span>
          <span style={{ marginLeft: "auto", fontWeight: 900, fontSize: 14, letterSpacing: 2, color: accent, border: `2px solid ${accent}`, borderRadius: 999, padding: "2px 12px" }}>
            {forecast ? `PREVISIÓ ${hour}` : "ARA"}
          </span>
        </div>
        {data.map((l, i) => (
          <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 18, height: 92, padding: "0 22px", borderTop: i ? `1px solid ${T.line}` : "none", animation: anim(0.15 + i * 0.1) }}>
            <span style={{ fontSize: 52, width: 64, textAlign: "center" }}>{ICON[l.condition] ?? "⛅"}</span>
            <div style={{ minWidth: 0, width: 230 }}>
              <div style={{ fontWeight: 900, fontSize: 28, color: T.white, textTransform: "uppercase", lineHeight: 1 }}>{l.name}</div>
              <div style={{ fontSize: 16, color: T.muted, marginTop: 4 }}>
                {CONDITION_CA[l.condition]}
                {l.ele != null ? ` · ${l.ele} m` : ""}
              </div>
            </div>
            <span style={{ fontWeight: 900, fontSize: 56, color: T.white, fontVariantNumeric: "tabular-nums", minWidth: 110 }}>
              {l.temperature != null ? `${Math.round(l.temperature)}º` : "—"}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, fontWeight: 800, fontSize: 22, color: T.text, fontVariantNumeric: "tabular-nums" }}>
              <span>💨 {l.wind_speed != null ? `${Math.round(l.wind_speed)} km/h` : "—"}</span>
              {l.precip_prob != null && <span style={{ color: T.muted }}>☔ {Math.round(l.precip_prob)}%</span>}
            </div>
          </div>
        ))}
      </div>
      <style>{TR_KEYFRAMES}</style>
    </div>
  );
}
