"use client";
import { useMemo } from "react";
import { useLive } from "@/lib/client/useLive";

type TrackPoint = [number, number, number, number | null]; // lat, lon, km, ele

const PANEL_W = 1760;
const PANEL_H = 300;
const CHART_W = 1680;
const CHART_H = 170;
const CHART_TOP = 70;
const CHART_LEFT = 40;

const DOT_COLORS = ["#0EA5E9", "#F59E0B", "#34d399", "#f472b6", "#a78bfa", "#f87171", "#facc15", "#60a5fa"];

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  return arr.filter((_, i) => i % step === 0);
}

function elevationAtKm(points: TrackPoint[], km: number): number {
  if (!points.length) return 0;
  if (km <= points[0][2]) return points[0][3] ?? 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][2] >= km) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const span = p1[2] - p0[2] || 1;
      const t = (km - p0[2]) / span;
      const e0 = p0[3] ?? 0;
      const e1 = p1[3] ?? 0;
      return e0 + (e1 - e0) * t;
    }
  }
  return points[points.length - 1][3] ?? 0;
}

/**
 * Gràfic de perfil de la traça GPX activa (distància x elevació) amb els
 * GPS seleccionats marcats sobre el perfil segons la seva posició actual
 * dins la volta. Dades vives obtingudes via proxy del servidor GPS extern
 * (gps_server.py): /api/gps/track (traça, poc canviant) i
 * /api/gps/sequential (posicions, cada pocs segons).
 */
export default function GpxProfilePanel({ selectedIds = [] }: { selectedIds?: string[] }) {
  const { data: track } = useLive<any>("/api/gps/track", [], 20000);
  const { data: seq } = useLive<any>("/api/gps/sequential", [], 2000);

  const points: TrackPoint[] = useMemo(() => {
    if (!track?.points?.length) return [];
    return downsample<TrackPoint>(track.points, 400);
  }, [track]);

  const oneLapKm: number = track?.one_lap_km || (points.length ? points[points.length - 1][2] : 0);

  const { minEle, maxEle } = useMemo(() => {
    const eles = points.map((p) => p[3]).filter((e): e is number => e != null);
    if (!eles.length) return { minEle: 0, maxEle: 100 };
    return { minEle: Math.min(...eles), maxEle: Math.max(...eles) };
  }, [points]);

  const xForKm = (km: number) => CHART_LEFT + (oneLapKm > 0 ? Math.min(Math.max(km, 0), oneLapKm) / oneLapKm : 0) * CHART_W;
  const yForEle = (ele: number) => {
    const span = maxEle - minEle || 1;
    const t = (ele - minEle) / span;
    return CHART_TOP + CHART_H - t * CHART_H;
  };

  const areaPath = useMemo(() => {
    if (!points.length) return "";
    const first = points[0];
    let d = `M ${xForKm(first[2])} ${CHART_TOP + CHART_H}`;
    for (const p of points) {
      d += ` L ${xForKm(p[2])} ${yForEle(p[3] ?? minEle)}`;
    }
    d += ` L ${xForKm(points[points.length - 1][2])} ${CHART_TOP + CHART_H} Z`;
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, minEle, maxEle, oneLapKm]);

  const activeFilename = track?.active ?? seq?.active_gpx ?? null;
  const runners: any[] = activeFilename && seq?.sequential?.[activeFilename] ? seq.sequential[activeFilename] : [];
  const shown = selectedIds.length > 0 ? runners.filter((r) => selectedIds.includes(r.from)) : runners;

  if (!activeFilename) {
    return (
      <div style={panelStyle}>
        <div style={{ padding: "20px 28px", fontSize: 20, fontWeight: 800, opacity: 0.7 }}>
          Sense traça GPX activa. Configura-la a Configuració → GPS.
        </div>
      </div>
    );
  }

  const isCircular = !!(track?.meta?.circular ?? seq?.gpx_meta?.circular);
  const totalLaps = track?.laps ?? seq?.gpx_meta?.laps ?? 1;

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "18px 28px 0" }}>
        <div style={{ width: 6, height: 22, background: "#0EA5E9", borderRadius: 3 }} />
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.5 }}>PERFIL DE LA CURSA</h1>
        <span style={{ fontSize: 14, opacity: 0.6, fontWeight: 700 }}>
          {activeFilename} · {oneLapKm.toFixed(1)} km{isCircular ? ` · ${totalLaps} voltes` : ""}
        </span>
      </div>

      <svg width={PANEL_W} height={PANEL_H - 40} viewBox={`0 0 ${PANEL_W} ${PANEL_H - 40}`}>
        <defs>
          <linearGradient id="gpxFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line
          x1={CHART_LEFT}
          y1={CHART_TOP + CHART_H}
          x2={CHART_LEFT + CHART_W}
          y2={CHART_TOP + CHART_H}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={2}
        />

        {areaPath && <path d={areaPath} fill="url(#gpxFill)" stroke="#0EA5E9" strokeWidth={3} />}

        {/* km ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const km = f * oneLapKm;
          const x = xForKm(km);
          return (
            <g key={f}>
              <line x1={x} y1={CHART_TOP} x2={x} y2={CHART_TOP + CHART_H} stroke="rgba(255,255,255,0.06)" />
              <text x={x} y={CHART_TOP + CHART_H + 24} fill="#9fb0c3" fontSize={14} fontWeight={700} textAnchor="middle">
                {km.toFixed(1)} km
              </text>
            </g>
          );
        })}

        {/* GPS markers */}
        {shown.map((r, i) => {
          const km = r.km_en_volta ?? 0;
          const x = xForKm(km);
          const ele = elevationAtKm(points, km);
          const y = yForEle(ele);
          const color = DOT_COLORS[i % DOT_COLORS.length];
          const labelUp = i % 2 === 0;
          return (
            <g key={r.from}>
              <line x1={x} y1={y} x2={x} y2={labelUp ? y - 34 : y + 34} stroke={color} strokeWidth={2} />
              <circle cx={x} cy={y} r={8} fill={color} stroke="#05070a" strokeWidth={2} />
              <g transform={`translate(${x}, ${labelUp ? y - 46 : y + 46})`}>
                <rect x={-46} y={-16} width={92} height={26} rx={6} fill="rgba(5,7,10,0.85)" stroke={color} />
                <text x={0} y={2} fill="#fff" fontSize={15} fontWeight={900} textAnchor="middle">
                  {r.display_name}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {shown.length === 0 && (
        <div style={{ padding: "0 28px 16px", fontSize: 14, opacity: 0.6, fontWeight: 700 }}>
          Cap GPS amb senyal a la traça activa ara mateix.
        </div>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  left: 80,
  right: 80,
  bottom: 56,
  width: PANEL_W,
  background: "rgba(8,12,18,0.88)",
  backdropFilter: "blur(6px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
  overflow: "hidden",
};
