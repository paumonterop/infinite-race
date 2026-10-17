"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAutoFit } from "@/lib/client/useAutoFit";

// Escena de presentació de cursa (portada de gfx-suite-onon, RacePresentationScene):
//  1. surt la targeta de títol (nom de la cursa + distància i desnivell + bandera)
//  2. si showProfile: el títol puja, es revela el perfil i van apareixent els punts de control d'esquerra a dreta.

const W = 1500;
const H = 250;
const LABEL_Y_TOP = -44;
const LABEL_H = 34;
const LABEL_PAD = 6;
const TITLE_CENTER_TOP = 420;
const TITLE_DOCKED_TOP = 150;
const PROFILE_TOP = 600;
const T_MOVE_UP = 1150;
const T_PROFILE_IN = 1750;
const T_POINTS_IN = 2550;
const T_OUT = 900;

const T = {
  bg: "#0b0f14",
  panelStrong: "rgba(8,12,18,0.95)",
  line: "rgba(255,255,255,0.08)",
  white: "#ffffff",
  shadow: "0 18px 50px rgba(0,0,0,0.45)",
  font: "ui-sans-serif, system-ui, 'Segoe UI', Roboto, Arial, sans-serif",
};

export interface PresentationRace {
  name: string;
  color: string;
  distance_m: number | null;
  elevation_gain: number | null;
  gpx: { total_km: number; track: number[][] } | null;
  checkpoints: { name: string; km: number }[]; // km sobre la traça (GPX)
}

interface Props {
  race: PresentationRace;
  eventName?: string;
  isLive: boolean;
  showProfile: boolean;
  flag?: string; // fitxer a /public/flags (sense extensió), p. ex. "es-ct"
  accent?: string; // per defecte, el color de la cursa a LiveTrail
}

const fmtKm = (m: number | null, fallback?: number) => {
  const km = m != null ? m / 1000 : fallback;
  return km == null ? "" : `${km.toFixed(1).replace(".", ",")} km`;
};

export default function TrailPresentation({ race, eventName, isLive, showProfile, flag = "es-ct", accent }: Props) {
  const ACCENT = accent || race.color || "#0EA5E9";
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"title" | "moving" | "profile" | "points">("title");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    clear();
    if (isLive) {
      setVisible(true);
      setPhase("title");
      if (showProfile) {
        timers.current.push(setTimeout(() => setPhase("moving"), T_MOVE_UP));
        timers.current.push(setTimeout(() => setPhase("profile"), T_PROFILE_IN));
        timers.current.push(setTimeout(() => setPhase("points"), T_POINTS_IN));
      }
    } else {
      timers.current.push(
        setTimeout(() => {
          setVisible(false);
          setPhase("title");
        }, T_OUT)
      );
    }
    return clear;
  }, [isLive, showProfile]);

  const distLabel = fmtKm(race.distance_m, race.gpx?.total_km);
  const gainLabel = race.elevation_gain != null ? `${Math.round(race.elevation_gain)} m+` : "";
  const nameFit = useAutoFit(race.name, { max: 52, min: 22 });

  // ── Perfil ──
  const prof = useMemo(() => {
    const track = race.gpx?.track.filter((p) => p[3] != null && !Number.isNaN(p[3]));
    if (!track || track.length < 2) return null;
    const total = race.gpx!.total_km;
    let min = Infinity;
    let max = -Infinity;
    for (const p of track) {
      min = Math.min(min, p[3]);
      max = Math.max(max, p[3]);
    }
    const yOf = (ele: number) => H - ((ele - min) / (max - min || 1)) * H;
    const d =
      track.map((p, i) => `${i === 0 ? "M" : "L"} ${((p[2] / total) * W).toFixed(1)} ${yOf(p[3]).toFixed(1)}`).join(" ") +
      ` L ${W} ${H} L 0 ${H} Z`;
    const eleAtKm = (km: number) => {
      let best = track[0];
      for (const p of track) if (Math.abs(p[2] - km) < Math.abs(best[2] - km)) best = p;
      return best[3];
    };
    return { d, total, yOf, eleAtKm };
  }, [race.gpx]);

  const controls = useMemo(() => {
    if (!prof) return [];
    const ROWS = 3;
    const SPACING = LABEL_H + 50;
    const pts = race.checkpoints.map((c) => {
      const x = Math.min(Math.max((c.km / prof.total) * W, 0), W);
      const labelWidth = Math.max(90, c.name.length * 15 + 36);
      return { x, y: prof.yOf(prof.eleAtKm(c.km)), labelX: x, labelWidth, name: c.name, labelY: LABEL_Y_TOP, km: c.km };
    });
    pts.sort((a, b) => a.x - b.x);
    const ranges: [number, number][][] = Array.from({ length: ROWS }, () => []);
    for (const p of pts) {
      const half = p.labelWidth / 2 + LABEL_PAD;
      p.labelX = Math.min(Math.max(p.x, p.labelWidth / 2), W - p.labelWidth / 2);
      let row = ROWS - 1;
      for (let r = 0; r < ROWS; r++) {
        if (!ranges[r].some(([l, rr]) => p.labelX + half > l && p.labelX - half < rr)) {
          row = r;
          break;
        }
      }
      ranges[row].push([p.labelX - half, p.labelX + half]);
      p.labelY = LABEL_Y_TOP - row * SPACING;
    }
    return pts;
  }, [prof, race.checkpoints]);

  if (!visible) return null;

  const anim = (delay = 0) =>
    isLive
      ? `racePresentIn 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}s both`
      : `racePresentOut 0.45s ease-in ${delay}s both`;
  const docked = showProfile && phase !== "title";
  const revealed = phase === "profile" || phase === "points";

  return (
    <div style={{ position: "absolute", inset: 0, width: 1920, height: 1080, pointerEvents: "none", fontFamily: T.font }}>
      <div
        style={{
          position: "absolute",
          top: docked ? TITLE_DOCKED_TOP : TITLE_CENTER_TOP,
          left: "50%",
          width: "fit-content",
          transform: "translateX(-50%)",
          transition: showProfile ? "top 0.6s cubic-bezier(0.65,0,0.35,1)" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            minWidth: 980,
            maxWidth: 1500,
            overflow: "hidden",
            background: T.panelStrong,
            border: `1px solid ${T.line}`,
            borderRadius: 24,
            boxShadow: T.shadow,
            animation: anim(0.05),
          }}
        >
          <div
            style={{
              width: 12,
              background: ACCENT,
              flexShrink: 0,
              transformOrigin: "center",
              animation: isLive ? "accentLineIn 0.4s ease-out both" : "accentLineOut 0.3s ease-in both",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, padding: "30px 44px", flex: 1, minWidth: 0 }}>
            <div style={{ minHeight: 28, color: ACCENT, fontWeight: 900, fontSize: 24, letterSpacing: "0.3em", textTransform: "uppercase" }}>
              {eventName}
            </div>
            <span
              ref={nameFit.ref}
              style={{
                fontSize: nameFit.fontSize,
                fontWeight: 900,
                lineHeight: 1.05,
                color: T.white,
                textTransform: "uppercase",
                letterSpacing: 1,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {race.name}
            </span>
            <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
              {[distLabel, gainLabel].filter(Boolean).map((line) => (
                <span
                  key={line}
                  style={{
                    fontWeight: 900,
                    fontSize: 30,
                    color: ACCENT,
                    border: `2px solid ${ACCENT}`,
                    borderRadius: 999,
                    padding: "4px 22px",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {line}
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              width: 230,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 22,
              background: "rgba(255,255,255,0.04)",
              borderLeft: `1px solid ${T.line}`,
              animation: anim(0.25),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/flags/${flag}.svg`}
              alt=""
              style={{ width: "100%", height: "auto", maxHeight: 150, objectFit: "contain", borderRadius: 8, display: "block" }}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith("/flags/es.svg")) img.src = "/flags/es.svg";
                else img.style.opacity = "0";
              }}
            />
          </div>
        </div>
      </div>

      {showProfile && prof && (
        <>
          <div
            style={{
              position: "absolute",
              top: PROFILE_TOP,
              left: "50%",
              width: W,
              height: H,
              transform: "translateX(-50%)",
              clipPath: revealed ? "inset(-200px 0% 0 0)" : "inset(-200px 100% 0 0)",
              transition: "clip-path 0.8s cubic-bezier(0.65,0,0.35,1)",
            }}
          >
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" overflow="visible">
              <defs>
                <linearGradient id="race-profile-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={T.bg} stopOpacity="0.92" />
                </linearGradient>
              </defs>
              <path d={prof.d} fill="url(#race-profile-fill)" stroke={ACCENT} strokeWidth="3" strokeLinejoin="round" />
            </svg>
          </div>

          {phase === "points" && (
            <svg
              style={{ position: "absolute", top: PROFILE_TOP, left: "50%", width: W, height: H, transform: "translateX(-50%)", overflow: "visible" }}
              viewBox={`0 0 ${W} ${H}`}
            >
              {/* rètol de la fila de punts quilomètrics */}
              <text x={-16} y={H + 40} textAnchor="end" fill={ACCENT} fontSize="22" fontWeight="900" letterSpacing="3" fontFamily={T.font} style={{ opacity: 0.9 }}>
                KM
              </text>
              {(() => {
                // punt quilomètric de cada control sota la línia base; només s'omet si dos punts són tan a prop que se solaparien
                let lastEnd = -Infinity;
                return controls.map((pt, i) => {
                  const txt = pt.km.toFixed(1).replace(".", ",");
                  const half = txt.length * 8.2 + 3;
                  const show = pt.x - half > lastEnd + 4;
                  if (show) lastEnd = pt.x + half;
                  return (
                    <g key={"km" + pt.name + i} style={{ opacity: 0, animation: `pointFadeIn 0.4s ease-out ${i * 0.15}s forwards` }}>
                      <line x1={pt.x} y1={H} x2={pt.x} y2={H + 12} stroke={T.white} strokeWidth="2" opacity="0.6" />
                      {show && (
                        <text x={pt.x} y={H + 40} textAnchor="middle" fill={T.white} fontSize="29" fontWeight="800" fontFamily={T.font} style={{ fontVariantNumeric: "tabular-nums" }}>
                          {txt}
                        </text>
                      )}
                    </g>
                  );
                });
              })()}
              {controls.map((pt, i) => (
                <g key={pt.name + i} style={{ opacity: 0, animation: `pointFadeIn 0.4s ease-out ${i * 0.15}s forwards` }}>
                  <line x1={pt.x} y1={pt.y} x2={pt.x} y2={pt.labelY + LABEL_H} stroke={T.white} strokeWidth="2" opacity="0.55" />
                  <circle cx={pt.x} cy={pt.y} r="8" fill={T.bg} stroke={T.white} strokeWidth="3" />
                  <rect x={pt.labelX - pt.labelWidth / 2} y={pt.labelY} width={pt.labelWidth} height={LABEL_H} fill={T.panelStrong} stroke={ACCENT} strokeWidth="2" rx="8" />
                  <text x={pt.labelX} y={pt.labelY + LABEL_H - 8} textAnchor="middle" fill={T.white} fontSize="26" fontWeight="800" fontFamily={T.font}>
                    {pt.name}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </>
      )}

      <style>{`
        @keyframes racePresentIn { from { transform: translateX(-80px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes racePresentOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-80px); opacity: 0; } }
        @keyframes accentLineIn { from { transform: scaleY(0.2); opacity: 0.4; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes accentLineOut { from { transform: scaleY(1); opacity: 1; } to { transform: scaleY(0.2); opacity: 0; } }
        @keyframes pointFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
