"use client";
import { useMemo } from "react";
import { useLive } from "@/lib/client/useLive";
import type { Leader } from "@/lib/trail/estimate";
import { SceneProps, raceOf } from "./RaceScenes";
import { STAGE, T, useSceneAnim } from "./ui";

// Perfil de la cursa amb els 3 primers homes i les 3 primeres dones (portat de PerfilScene de gfx-suite-onon, amb el
// disseny nou). Les posicions són les de /leaders: GPS de LiveTrail, previsió de LiveTrail o estimació pròpia.

const W = 1824; // amplada interior de la targeta (1920 - 2 × 48)
const H = 300; // alçada del dibuix
const MX = 28;
const Y_TOP = 138; // sota aquesta línia no hi pot haver etiquetes: és la zona del perfil
const Y_BOTTOM = H - 36; // base del perfil (sota hi van els noms dels controls)
const LABEL_H = 30;

const ORD = ["", "1r", "2n", "3r"];

const shortName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full.toUpperCase();
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`.toUpperCase();
};

interface Marker {
  key: string;
  x: number;
  dotY: number;
  color: string;
  rank: number;
  text: string;
  origin: Leader["origin"];
  w: number;
  top: number;
}

/** Col·loca les etiquetes d'esquerra a dreta apilant-les cap amunt quan se solapen. */
function layout(markers: Omit<Marker, "top">[]): Marker[] {
  const sorted = [...markers].sort((a, b) => a.x - b.x);
  const placed: Marker[] = [];
  for (const m of sorted) {
    let top = m.dotY - 56;
    for (let attempt = 0; attempt < 6; attempt++) {
      const overlaps = placed.some((p) => m.x + m.w / 2 > p.x - p.w / 2 - 6 && m.x - m.w / 2 < p.x + p.w / 2 + 6 && top + LABEL_H > p.top - 4 && top < p.top + LABEL_H + 4);
      if (!overlaps) break;
      top -= LABEL_H + 8;
    }
    placed.push({ ...m, top: Math.max(6, top) });
  }
  return placed;
}

export function ProfileLeadersScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const { visible, animated } = useSceneAnim(isLive, 950);
  const q = (sex: "M" | "F") => `/api/trail/events/${eventId}/leaders?sel=${race?.id ?? ""}:3&sex=${sex}`;
  const { data: men } = useLive<{ races: Record<string, Leader[]> }>(race ? q("M") : "", ["trail:changed"], 2000);
  const { data: women } = useLive<{ races: Record<string, Leader[]> }>(race ? q("F") : "", ["trail:changed"], 2000);

  const track: number[][] = useMemo(() => (race?.gpx?.track ?? []).filter((p: number[]) => p[3] != null && !Number.isNaN(p[3])), [race]);

  if (!visible || !race || track.length < 2) return null;

  const total: number = race.gpx.total_km;
  const accent: string = race.color || T.accent;
  let min = Infinity;
  let max = -Infinity;
  for (const p of track) {
    min = Math.min(min, p[3]);
    max = Math.max(max, p[3]);
  }
  const rng = Math.max(max - min, 1);
  const X = (km: number) => MX + (km / total) * (W - 2 * MX);
  const Y = (ele: number) => Y_BOTTOM - ((ele - min) / rng) * (Y_BOTTOM - Y_TOP);
  const eleAt = (km: number) => {
    let best = track[0];
    for (const p of track) if (Math.abs(p[2] - km) < Math.abs(best[2] - km)) best = p;
    return best[3];
  };

  const line = track.map((p) => `${X(p[2]).toFixed(1)},${Y(p[3]).toFixed(1)}`).join(" ");
  const area = `${X(0)},${Y_BOTTOM} ${line} ${X(total)},${Y_BOTTOM}`;

  const lm: Leader[] = (men?.races?.[race.id] ?? []).slice(0, 3);
  const lf: Leader[] = (women?.races?.[race.id] ?? []).slice(0, 3);
  const raw: Omit<Marker, "top">[] = [
    ...lm.map((l) => ({ l, color: T.accent, sx: "M" })),
    ...lf.map((l) => ({ l, color: T.women, sx: "F" })),
  ].map(({ l, color, sx }) => {
    const text = `${ORD[l.rank] ?? l.rank} ${shortName(l.name)}`;
    return { key: `${sx}${l.bib}`, x: X(l.km), dotY: Y(eleAt(l.km)), color, rank: l.rank, text, origin: l.origin, w: 28 + text.length * 9.6 };
  });
  const markers = layout(raw);

  // controls: nom només si hi cap
  const cps: { id: number; name: string; km: number }[] = race.checkpoints;
  let lastEnd = -Infinity;

  return (
    <div style={{ ...STAGE, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 48,
          right: 48,
          bottom: "var(--sb, 48px)",
          borderRadius: 18,
          overflow: "hidden",
          background: T.panelStrong,
          border: `1px solid ${T.line}`,
          boxShadow: T.shadow,
          transform: animated ? "translateY(0)" : "translateY(130%)",
          transition: "transform 0.85s cubic-bezier(0.22, 0.61, 0.36, 1)",
        }}
      >
        {/* capçalera */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, height: 58, padding: "0 24px", borderBottom: `1px solid ${T.line}`, background: `linear-gradient(90deg, ${accent}2e, rgba(8,12,18,0))` }}>
          <div style={{ width: 7, height: 32, background: accent, borderRadius: 4 }} />
          <span style={{ fontWeight: 900, fontSize: 30, color: T.white, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{race.name}</span>
          <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 2, color: T.accent, border: `2px solid ${T.accent}`, borderRadius: 999, padding: "2px 14px" }}>TOP 3 HOMES</span>
          <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 2, color: T.women, border: `2px solid ${T.women}`, borderRadius: 999, padding: "2px 14px" }}>TOP 3 DONES</span>
          <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 22, color: T.muted, letterSpacing: 1, fontVariantNumeric: "tabular-nums" }}>
            {String(race.distance_m ? (race.distance_m / 1000).toFixed(1) : total.toFixed(1)).replace(".", ",")} KM · +{Math.round(race.elevation_gain ?? 0)} M
          </span>
        </div>

        <svg width={W} height={H} style={{ display: "block" }}>
          <defs>
            <linearGradient id="pl-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
              <stop offset="100%" stopColor={T.bg} stopOpacity="0.92" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#pl-fill)" />
          <polyline points={line} fill="none" stroke={accent} strokeWidth="3" strokeLinejoin="round" />
          <line x1={MX} x2={W - MX} y1={Y_BOTTOM} y2={Y_BOTTOM} stroke="rgba(255,255,255,0.18)" />

          {/* controls */}
          {cps.map((c) => {
            const x = X(c.km);
            const half = c.name.length * 3.6 + 4;
            const fits = x - half > lastEnd + 6;
            if (fits) lastEnd = x + half;
            return (
              <g key={c.id}>
                <line x1={x} x2={x} y1={Y_BOTTOM} y2={Y_BOTTOM + 8} stroke="rgba(255,255,255,0.6)" />
                {fits && (
                  <text x={x} y={H - 10} textAnchor="middle" fontSize="15" fontWeight="700" fill="rgba(255,255,255,0.75)">
                    {c.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* els primers: punt al perfil + etiqueta amb línia discontínua */}
          {markers.map((m) => (
            <g key={m.key} style={{ transition: "opacity .4s", opacity: animated ? 1 : 0 }}>
              <line x1={m.x} x2={m.x} y1={m.top + LABEL_H} y2={m.dotY - 9} stroke={m.color} strokeWidth="2" strokeDasharray="5 3" />
              {m.origin === "gps" && <circle cx={m.x} cy={m.dotY} r="15" fill="none" stroke="#34d399" strokeOpacity="0.65" strokeWidth="3" />}
              <circle cx={m.x} cy={m.dotY} r="10" fill={m.color} stroke="#fff" strokeWidth="3" strokeDasharray={m.origin === "livetrail" ? "4 3" : m.origin === "model" ? "1.5 3" : undefined} />
              <rect x={m.x - m.w / 2} y={m.top} width={m.w} height={LABEL_H} rx="7" fill={m.color} stroke={m.rank === 1 ? T.amber : "none"} strokeWidth="2.5" />
              <text x={m.x} y={m.top + 21} textAnchor="middle" fontSize="17" fontWeight="900" fill="#05070a" letterSpacing="0.4">
                {m.text}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
