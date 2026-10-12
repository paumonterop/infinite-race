"use client";
import { useMemo } from "react";
import { SceneProps, TR_KEYFRAMES, raceOf, useAnalysis } from "./RaceScenes";
import { STAGE, T, gradientColor, useSceneAnim } from "./ui";

function eleAt(points: number[][], km: number) {
  if (km <= points[0][3]) return points[0][2];
  for (let i = 1; i < points.length; i++) {
    if (points[i][3] >= km) {
      const a = points[i - 1];
      const b = points[i];
      const t = b[3] === a[3] ? 0 : (km - a[3]) / (b[3] - a[3]);
      return a[2] + t * (b[2] - a[2]);
    }
  }
  return points[points.length - 1][2];
}

const slideCard = (slid: boolean): React.CSSProperties => ({
  transform: slid ? "translateY(0)" : "translateY(130%)",
  transition: "transform 0.85s cubic-bezier(0.22, 0.61, 0.36, 1)",
});

const cardBase = (width: number): React.CSSProperties => ({
  position: "absolute",
  bottom: "var(--sb, 48px)",
  left: 48,
  width,
  boxSizing: "border-box",
  overflow: "hidden",
  background: T.panelStrong,
  border: `1px solid ${T.line}`,
  borderRadius: 18,
  boxShadow: T.shadow,
});

function Header({ title, tag, accent, h = 60 }: { title: string; tag: string; accent: string; h?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, height: h, padding: "0 20px", borderBottom: `1px solid ${T.line}`, background: `linear-gradient(90deg, ${accent}2e, rgba(8,12,18,0))` }}>
      <div style={{ width: 6, height: h - 32, background: accent, borderRadius: 3 }} />
      <span style={{ fontWeight: 900, fontSize: 26, color: T.white, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      <span style={{ marginLeft: "auto", fontWeight: 900, fontSize: 14, letterSpacing: 2, color: accent, border: `2px solid ${accent}`, borderRadius: 999, padding: "2px 12px", whiteSpace: "nowrap" }}>{tag}</span>
    </div>
  );
}

/** Segment: perfil de tota la cursa amb el tram ressaltat + distància i pendent mitjà. */
export function SegmentInfoScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const a = useAnalysis(eventId, race?.id);
  const { visible, animated } = useSceneAnim(isLive, 950);
  const kmIn = layer.from_km ?? 0;
  const kmOut = layer.to_km ?? 0;

  const calc = useMemo(() => {
    if (!a || kmOut <= kmIn) return null;
    const dist = kmOut - kmIn;
    const slope = ((eleAt(a.points, kmOut) - eleAt(a.points, kmIn)) / (dist * 1000)) * 100;
    return { dist, slope };
  }, [a, kmIn, kmOut]);

  if (!visible || !a) return null;
  const accent = race?.color || T.accent;
  const W = 705;
  const H = 125;
  const total = a.distance_km;
  const min = a.min_elevation_m;
  const rng = a.max_elevation_m - min || 1;
  const X = (km: number) => (km / total) * W;
  const Y = (e: number) => H - 8 - ((e - min) / rng) * (H - 22);
  const all = a.points.map((p) => `${X(p[3])},${Y(p[2])}`);
  const seg = a.points.filter((p) => p[3] >= kmIn && p[3] <= kmOut);
  const segLine = seg.map((p) => `${X(p[3])},${Y(p[2])}`);

  return (
    <div style={{ ...STAGE, overflow: "hidden" }}>
      <div style={{ ...cardBase(W), ...slideCard(animated) }}>
        <Header title={layer.label || "Segment"} tag={calc ? `${calc.dist.toFixed(1).replace(".", ",")} KM` : "SEGMENT"} accent={accent} />
        <svg width={W} height={H} style={{ display: "block" }}>
          <defs>
            <linearGradient id="seg-bg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1a2432" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0b0f14" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="seg-hi" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.85" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <polygon points={`0,${H} ${all.join(" ")} ${W},${H}`} fill="url(#seg-bg)" />
          {seg.length > 1 && <polygon points={`${X(kmIn)},${H} ${segLine.join(" ")} ${X(kmOut)},${H}`} fill="url(#seg-hi)" />}
          <polyline points={all.join(" ")} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinejoin="round" />
          {seg.length > 1 && <polyline points={segLine.join(" ")} fill="none" stroke={accent} strokeWidth="3" strokeLinejoin="round" />}
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 20, height: 62, padding: "0 20px", boxSizing: "border-box", borderTop: `1px solid ${T.line}`, background: "rgba(255,255,255,0.03)" }}>
          <Pair label="DISTÀNCIA" value={calc ? `${calc.dist.toFixed(1).replace(".", ",")} KM` : "???"} />
          <div style={{ width: 1, height: 36, background: T.line }} />
          <Pair label="PENDENT MIG" value={calc ? `${calc.slope >= 0 ? "+" : ""}${calc.slope.toFixed(1).replace(".", ",")} %` : "???"} />
        </div>
      </div>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 12, whiteSpace: "nowrap" }}>
      <span style={{ fontWeight: 900, color: T.muted, letterSpacing: 1.5, fontSize: 17 }}>{label}</span>
      <span style={{ fontWeight: 900, color: T.white, fontSize: 28, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

/** Segment: perfil del tram acolorit per pendents, amb marques cada km. */
export function SegmentProfileScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const a = useAnalysis(eventId, race?.id);
  const { visible, animated } = useSceneAnim(isLive, 950);
  const kmIn = layer.from_km ?? 0;
  const kmOut = layer.to_km ?? 0;
  if (!visible || !a || kmOut <= kmIn) return null;

  const accent = race?.color || T.accent;
  const W = 830;
  const H = 170;
  const len = kmOut - kmIn;
  const pts = a.points.filter((p) => p[3] >= kmIn && p[3] <= kmOut).map((p) => ({ ele: p[2], d: p[3] - kmIn }));
  if (pts.length < 2) return null;
  const min = Math.min(...pts.map((p) => p.ele));
  const max = Math.max(...pts.map((p) => p.ele));
  const rng = max - min || 1;
  const X = (d: number) => (d / len) * W;
  const Y = (e: number) => H - 4 - ((e - min) / rng) * (H - 24);
  const WIN = Math.max(2, Math.round(pts.length / 40));
  const grads = pts.map((_, i) => {
    const s = Math.max(0, i - WIN);
    const e = Math.min(pts.length - 1, i + WIN);
    const dm = (pts[e].d - pts[s].d) * 1000;
    return dm > 0 ? ((pts[e].ele - pts[s].ele) / dm) * 100 : 0;
  });
  const eleHere = (d: number) => {
    for (let i = 1; i < pts.length; i++) if (pts[i].d >= d) return pts[i - 1].ele + ((d - pts[i - 1].d) / (pts[i].d - pts[i - 1].d || 1)) * (pts[i].ele - pts[i - 1].ele);
    return pts[pts.length - 1].ele;
  };
  const totalKm = Math.max(1, Math.ceil(len));

  return (
    <div style={{ ...STAGE, overflow: "hidden" }}>
      <div style={{ ...cardBase(W), ...slideCard(animated) }}>
        <Header title={layer.label || "Perfil del segment"} tag={`${len.toFixed(1).replace(".", ",")} KM`} accent={accent} h={56} />
        <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
          {pts.slice(1).map((p, i) => (
            <line key={i} x1={X(pts[i].d)} y1={Y(pts[i].ele)} x2={X(p.d)} y2={Y(p.ele)} stroke={gradientColor((grads[i] + grads[i + 1]) / 2)} strokeWidth="10" strokeLinecap="round" />
          ))}
          {Array.from({ length: totalKm - 1 }, (_, i) => i + 1)
            .filter((k) => k < len)
            .map((k) => (
              <line key={k} x1={X(k)} y1={Y(eleHere(k))} x2={X(k)} y2={H} stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeDasharray="2,5" />
            ))}
          <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </svg>
        <div style={{ position: "relative", width: W, height: 48, background: "rgba(0,0,0,0.35)", borderTop: `1px solid ${T.line}`, boxSizing: "border-box" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontWeight: 900, fontSize: 20, color: accent, letterSpacing: 2 }}>KM</span>
          {Array.from({ length: totalKm }, (_, k) => k + 1)
            .filter((k) => k <= len + 0.01)
            .map((k) => (
              <span key={k} style={{ position: "absolute", left: X(k), top: "50%", transform: "translate(-50%, -50%)", fontWeight: 800, fontSize: 22, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                {k}
              </span>
            ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 34, padding: "0 20px", boxSizing: "border-box", borderTop: `1px solid ${T.line}` }}>
          <span style={{ fontWeight: 900, fontSize: 14, color: T.muted, letterSpacing: 3 }}>PERFIL PER PENDENTS</span>
          <span style={{ fontWeight: 800, fontSize: 13, color: T.muted, letterSpacing: 1 }}>
            km {kmIn.toFixed(1).replace(".", ",")} – {kmOut.toFixed(1).replace(".", ",")}
          </span>
        </div>
      </div>
      <style>{TR_KEYFRAMES}</style>
    </div>
  );
}

/** Punt de pas: nom del control gran + cursa, km i altitud. */
export function CheckpointScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const a = useAnalysis(eventId, race?.id);
  const { visible, animated } = useSceneAnim(isLive, 900);
  const cp = race?.checkpoints.find((c: any) => c.id === layer.point);
  if (!visible || !cp) return null;
  const accent = race?.color || T.accent;
  const placed = a?.checkpoints.find((c) => c.name === cp.name);
  const alt = cp.altitude ?? placed?.ele ?? null;
  return (
    <div style={STAGE}>
      <div
        style={{
          position: "absolute",
          left: 48,
          bottom: "var(--sb, 48px)",
          height: 150,
          minWidth: 560,
          maxWidth: 940,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "stretch",
          borderRadius: 18,
          overflow: "hidden",
          background: T.panelStrong,
          border: `1px solid ${T.line}`,
          boxShadow: T.shadow,
          opacity: animated ? 1 : 0,
          transform: animated ? "translateX(0)" : "translateX(-80px)",
          transition: "opacity 0.35s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ width: 120, background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#05070a" opacity="0.8">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, padding: "0 36px 0 30px", minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: 3, color: accent, textTransform: "uppercase" }}>Punt de pas</div>
          <div style={{ fontWeight: 900, fontSize: 56, color: T.white, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cp.name}</div>
          <div style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 24, fontWeight: 800, color: T.muted, letterSpacing: 1.2, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            <span>{race?.name}</span>
            <span style={{ color: T.white }}>KM {String(cp.km).replace(".", ",")}</span>
            {alt != null && <span>{Math.round(alt)} M</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
