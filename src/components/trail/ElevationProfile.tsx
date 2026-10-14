"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Leader } from "@/lib/trail/estimate";

export interface ProfileDevice {
  id: string;
  label: string;
  km: number | null;
  bib: string | null;
  runner_name: string | null;
  status: "online" | "offline";
  off_route: boolean;
}

interface Props {
  race: { id: string; name: string; color: string; gpx: { total_km: number; track: number[][] } | null; checkpoints: { id: number; name: string; km: number }[] };
  devices: ProfileDevice[];
  /** Primers de la cursa (posició estimada) */
  leaders?: Leader[];
  /** Posició (lat, lon) del punt del perfil sota el ratolí, per mostrar-lo al mapa; null en sortir. */
  onHover?: (p: [number, number] | null) => void;
  height?: number;
}

const M = { l: 46, r: 16, t: 30, b: 26 };

/** Perfil d'elevació d'una cursa (GPX): controls, motxilles al seu km i cursor lligat al mapa. */
export default function ElevationProfile({ race, devices, leaders = [], onHover, height = 190 }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  const [hover, setHover] = useState<{ km: number; ele: number; grad: number } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(300, el.clientWidth)));
    ro.observe(el);
    setW(Math.max(300, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const pts = useMemo(() => (race.gpx?.track ?? []).filter((p) => p[3] != null && !Number.isNaN(p[3])), [race.gpx]);

  const geo = useMemo(() => {
    if (!race.gpx || pts.length < 2) return null;
    const total = race.gpx.total_km;
    let min = Infinity;
    let max = -Infinity;
    for (const p of pts) {
      min = Math.min(min, p[3]);
      max = Math.max(max, p[3]);
    }
    // marge visual i valors rodons als eixos
    const lo = Math.floor((min - 10) / 50) * 50;
    const hi = Math.ceil((max + 10) / 50) * 50;
    return { total, lo, hi };
  }, [race.gpx, pts]);

  if (!geo) {
    return (
      <div ref={wrap} className="grid place-items-center text-sm text-slate-500" style={{ height }}>
        Aquesta cursa no té GPX amb elevació.
      </div>
    );
  }

  const { total, lo, hi } = geo;
  const iw = w - M.l - M.r;
  const ih = height - M.t - M.b;
  const X = (km: number) => M.l + (km / total) * iw;
  const Y = (e: number) => M.t + (1 - (e - lo) / (hi - lo || 1)) * ih;

  const area =
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${X(p[2]).toFixed(1)} ${Y(p[3]).toFixed(1)}`).join(" ") + ` L${X(pts[pts.length - 1][2]).toFixed(1)} ${M.t + ih} L${X(0)} ${M.t + ih} Z`;
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${X(p[2]).toFixed(1)} ${Y(p[3]).toFixed(1)}`).join(" ");

  const nearest = (km: number) => {
    let a = 0;
    let b = pts.length - 1;
    while (b - a > 1) {
      const m = (a + b) >> 1;
      if (pts[m][2] < km) a = m;
      else b = m;
    }
    return Math.abs(pts[a][2] - km) <= Math.abs(pts[b][2] - km) ? a : b;
  };
  const eleAt = (km: number) => pts[nearest(km)][3];

  const kmStep = total > 40 ? 5 : total > 20 ? 2 : 1;
  const kmTicks: number[] = [];
  for (let k = 0; k <= total + 0.001; k += kmStep) kmTicks.push(k);
  const eleTicks: number[] = [];
  const eStep = hi - lo > 1200 ? 400 : hi - lo > 600 ? 200 : 100;
  for (let e = Math.ceil(lo / eStep) * eStep; e <= hi; e += eStep) eleTicks.push(e);

  const onMove = (ev: React.MouseEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const km = Math.min(total, Math.max(0, ((ev.clientX - r.left - M.l) / iw) * total));
    const i = nearest(km);
    const a = pts[Math.max(0, i - 4)];
    const b = pts[Math.min(pts.length - 1, i + 4)];
    const dm = (b[2] - a[2]) * 1000;
    setHover({ km: pts[i][2], ele: pts[i][3], grad: dm > 0 ? ((b[3] - a[3]) / dm) * 100 : 0 });
    onHover?.([pts[i][0], pts[i][1]]);
  };
  const onLeave = () => {
    setHover(null);
    onHover?.(null);
  };

  const gid = `ep-${race.id}`;
  // etiquetes de controls en dues files per no solapar-se
  const cps = [...race.checkpoints].sort((a, b) => a.km - b.km);

  return (
    <div ref={wrap} style={{ height }} className="relative w-full select-none">
      <svg width={w} height={height} onMouseMove={onMove} onMouseLeave={onLeave} style={{ display: "block" }}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={race.color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={race.color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* graella */}
        {eleTicks.map((e) => (
          <g key={e}>
            <line x1={M.l} x2={w - M.r} y1={Y(e)} y2={Y(e)} stroke="rgba(255,255,255,0.08)" />
            <text x={M.l - 6} y={Y(e) + 3} textAnchor="end" fontSize="10" fill="#64748b">
              {e} m
            </text>
          </g>
        ))}
        {kmTicks.map((k) => (
          <g key={k}>
            <line x1={X(k)} x2={X(k)} y1={M.t + ih} y2={M.t + ih + 4} stroke="#475569" />
            <text x={X(k)} y={height - 8} textAnchor="middle" fontSize="10" fill="#64748b">
              {k}
            </text>
          </g>
        ))}
        <text x={w - M.r} y={height - 8} textAnchor="end" fontSize="10" fill="#475569">
          km
        </text>

        {/* perfil */}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={race.color} strokeWidth="2" strokeLinejoin="round" />

        {/* controls: el punt sempre; el nom només si hi cap (sense solapar-se amb l'anterior) */}
        {(() => {
          let lastEnd = -Infinity;
          let row = 0;
          return cps.map((c) => {
            const x = X(c.km);
            const y = Y(eleAt(c.km));
            const half = c.name.length * 2.9 + 4; // amplada aproximada de l'etiqueta
            const fits = x - half > lastEnd + 4;
            if (fits) {
              lastEnd = x + half;
              row = 1 - row;
            }
            return (
              <g key={c.id}>
                {fits && <line x1={x} x2={x} y1={M.t - 4 - row * 12} y2={y} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" />}
                <circle cx={x} cy={y} r="4" fill="#0b0f14" stroke="#fff" strokeWidth="2" />
                {fits && (
                  <text x={x} y={M.t - 7 - row * 12} textAnchor="middle" fontSize="10" fontWeight="700" fill="#e2e8f0">
                    {c.name}
                  </text>
                )}
              </g>
            );
          });
        })()}

        {/* motxilles en línia assignades a aquesta cursa */}
        {devices
          .filter((d) => d.km != null && d.status === "online")
          .map((d) => {
            const x = X(d.km!);
            const y = Y(eleAt(d.km!));
            const text = d.bib ? `#${d.bib}` : d.label;
            return (
              <g key={d.id}>
                <circle cx={x} cy={y} r="6.5" fill={d.off_route ? "#ef4444" : "#fff"} stroke={race.color} strokeWidth="3" />
                <rect x={x - text.length * 3.4 - 5} y={y - 26} width={text.length * 6.8 + 10} height="15" rx="4" fill="#0b0f14" stroke={race.color} />
                <text x={x} y={y - 15} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">
                  {text}
                </text>
              </g>
            );
          })}

        {/* primers de la cursa (estimats): cercle amb la posició; vora discontínua = entre controls */}
        {leaders.map((l) => {
          const x = X(l.km);
          const y = Y(eleAt(l.km));
          return (
            <g key={l.bib}>
              {l.origin === "gps" && <circle cx={x} cy={y} r="14" fill="none" stroke="#34d399" strokeOpacity="0.6" strokeWidth="3" />}
              <circle cx={x} cy={y} r="10" fill={race.color} stroke="#fff" strokeWidth={l.origin === "gps" ? 3 : 2} strokeDasharray={l.origin === "livetrail" ? "3 2" : l.origin === "model" && l.estimated ? "1 2" : undefined} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill="#0b0f14">
                {l.rank}
              </text>
              <title>{`${l.rank}º #${l.bib} ${l.name} · km ${l.km.toFixed(1)} · ${l.origin === "gps" ? "GPS" : l.origin === "livetrail" ? "previsió de LiveTrail" : "estimació pròpia"}`}</title>
            </g>
          );
        })}

        {/* cursor */}
        {hover && (
          <g pointerEvents="none">
            <line x1={X(hover.km)} x2={X(hover.km)} y1={M.t} y2={M.t + ih} stroke="#fff" strokeOpacity="0.7" />
            <circle cx={X(hover.km)} cy={Y(hover.ele)} r="4.5" fill={race.color} stroke="#fff" strokeWidth="2" />
          </g>
        )}
        <rect x={M.l} y={M.t} width={iw} height={ih} fill="transparent" />
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute top-1 rounded-md border border-white/15 bg-[#0b0f14]/95 px-2 py-1 text-[11px] font-semibold text-slate-100"
          style={{ left: Math.min(w - 170, Math.max(M.l, X(hover.km) + 10)) }}
        >
          km {hover.km.toFixed(1).replace(".", ",")} · {Math.round(hover.ele)} m · {hover.grad > 0 ? "+" : ""}
          {hover.grad.toFixed(1).replace(".", ",")}%
        </div>
      )}
    </div>
  );
}
