"use client";
import { useLive } from "@/lib/client/useLive";
import type { Favorite, HistEdition, HistResult } from "@/lib/trail/history";
import { ListFooter, ListHeader, ListPanel, Pill, RankRow, T, fmtGap, fmtHMS, sexColor, useSceneAnim } from "./ui";
import { SceneProps, raceOf } from "./RaceScenes";

const SEX_LABEL = { M: "HOMES", F: "DONES" };

/** Classificació en directe d'una cursa (homes o dones): qui ha arribat més lluny i, al mateix control, el més ràpid. */
export function LeaderboardScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const sex = layer.sex === "F" ? "F" : "M";
  const { data } = useLive<any>(`/api/trail/events/${eventId}/leaderboard?race=${race?.id ?? ""}&sex=${sex}&limit=10`, ["trail:changed"], 3000);
  const { visible, animated } = useSceneAnim(isLive, 700);
  if (!visible || !data?.rows) return null;
  const accent = sexColor(sex);
  const rows = data.rows.map((r: any) => ({
    rank: r.rank,
    name: r.name,
    club: r.club,
    extra: r.finished ? "ARRIBADA" : r.point_name ? `${r.point_name}${r.point_km != null ? ` · km ${r.point_km}` : ""}` : "",
    diff: r.rank === 1 || r.gap_s == null ? fmtHMS(r.time_s) : fmtGap(r.gap_s),
  }));
  return (
    <ListPanel animated={animated}>
      <ListHeader title={race?.name ?? "Classificació"} badge={SEX_LABEL[sex]} accent={accent} right="EN DIRECTE" />
      <div style={{ height: 14 }} />
      {rows.length === 0 ? (
        <div style={{ padding: "30px 40px 36px", color: T.muted, fontSize: 28, textAlign: "center" }}>Encara no hi ha cap pas per control.</div>
      ) : (
        rows.map((r: any, i: number) => <RankRow key={r.rank + r.name} r={r} index={i} total={rows.length} animated={animated} accent={accent} />)
      )}
      <ListFooter text={race?.color ? undefined : undefined} />
    </ListPanel>
  );
}

/** Top 10 favorits: els millors de les edicions anteriors (inscrits primer; si no n'hi ha, els millors històrics). */
export function FavoritesScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const sex = layer.sex === "F" ? "F" : "M";
  const { data } = useLive<{ rows: Favorite[] }>(`/api/trail/events/${eventId}/favorites?race=${race?.id ?? ""}&sex=${sex}`, [], 5 * 60_000);
  const { visible, animated } = useSceneAnim(isLive, 700);
  if (!visible || !data?.rows) return null;
  const accent = sexColor(sex);
  const rows = data.rows.map((f) => ({
    rank: f.rank,
    name: f.name,
    club: f.club,
    extra: f.note,
    diff: f.bib ? `#${f.bib}` : "",
  }));
  return (
    <ListPanel animated={animated}>
      <ListHeader title="Top 10 favorits" badge={SEX_LABEL[sex]} accent={accent} right={race?.name?.toUpperCase()} />
      <div style={{ height: 14 }} />
      {rows.length === 0 ? (
        <div style={{ padding: "30px 40px 36px", color: T.muted, fontSize: 28, textAlign: "center" }}>Sense dades d&apos;edicions anteriors.</div>
      ) : (
        rows.map((r) => <RankRow key={r.rank + r.name} r={r} index={r.rank - 1} total={rows.length} animated={animated} accent={accent} />)
      )}
      <ListFooter text="Millor resultat a edicions anteriors" />
    </ListPanel>
  );
}

function useHistory(eventId: string, raceId: string | undefined) {
  return useLive<{ editions: HistEdition[]; record_m: HistResult | null; record_f: HistResult | null }>(
    `/api/trail/events/${eventId}/history?race=${raceId ?? ""}`,
    [],
    10 * 60_000
  );
}

/** Rècord de la cursa (homes i dones) amb l'any. */
export function HistoryRecordScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const { data } = useHistory(eventId, race?.id);
  const { visible, animated } = useSceneAnim(isLive, 700);
  if (!visible || !data) return null;
  const accent = race?.color || T.accent;
  const rec = [
    { sex: "M" as const, r: data.record_m },
    { sex: "F" as const, r: data.record_f },
  ];
  return (
    <ListPanel animated={animated} top={260}>
      <ListHeader title="Rècord de la cursa" accent={accent} right={race?.name?.toUpperCase()} />
      <div style={{ height: 14 }} />
      {rec.map(({ sex, r }, i) => (
        <RankRow
          key={sex}
          r={{ rank: r?.year ?? "—", name: r?.name ?? "Sense dades", club: SEX_LABEL[sex], diff: r ? fmtHMS(r.time_s) : "" }}
          index={i}
          total={2}
          animated={animated}
          accent={sexColor(sex)}
        />
      ))}
      <ListFooter text="Edicions de recorregut comparable" />
    </ListPanel>
  );
}

/** Guanyadors (home i dona) de cada edició anterior. */
export function HistoryWinnersScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const { data } = useHistory(eventId, race?.id);
  const { visible, animated } = useSceneAnim(isLive, 700);
  if (!visible || !data) return null;
  const accent = race?.color || T.accent;
  const eds = data.editions.slice(0, 5);
  return (
    <ListPanel animated={animated} top={150}>
      <ListHeader title="Guanyadors" accent={accent} right={race?.name?.toUpperCase()} />
      <div style={{ height: 14 }} />
      {eds.length === 0 && <div style={{ padding: "30px 40px 36px", color: T.muted, fontSize: 28, textAlign: "center" }}>Sense edicions anteriors.</div>}
      {eds.map((e, i) => {
        const enter = i * 70;
        return (
          <div
            key={e.year}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              height: 92,
              margin: "0 16px 8px",
              padding: "0 18px",
              borderRadius: 10,
              background: T.row,
              border: `1px solid ${T.line}`,
              opacity: animated ? 1 : 0,
              transform: animated ? "translateX(0)" : "translateX(-26px)",
              transition: `opacity 0.4s ease ${enter}ms, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${enter}ms`,
            }}
          >
            <div style={{ width: 96, fontWeight: 900, fontSize: 38, color: accent, fontVariantNumeric: "tabular-nums" }}>{e.year}</div>
            {([["M", e.winner_m], ["F", e.winner_f]] as const).map(([sex, w]) => (
              <div key={sex} style={{ flex: 1, minWidth: 0, borderLeft: `3px solid ${sexColor(sex)}`, paddingLeft: 14 }}>
                <div style={{ fontWeight: 900, fontSize: 25, color: T.white, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w?.name ?? "—"}</div>
                <div style={{ fontWeight: 800, fontSize: 22, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{w ? fmtHMS(w.time_s) : ""}</div>
              </div>
            ))}
          </div>
        );
      })}
      <ListFooter text={eds.length ? `${eds[0].distance_m ? (eds[0].distance_m / 1000).toFixed(0) : ""} km aprox. · classificació final` : ""} />
    </ListPanel>
  );
}

// Pill es reexporta per evitar avisos d'importació no usada a bundlers estrictes.
export { Pill };

const ORDINAL: Record<number, string> = { 1: "1r", 2: "2n", 3: "3r", 4: "4t", 5: "5è" };

/** Etiqueta de posició (cantonada superior dreta): «1r HOME · El Putu Trail» amb qui hi és ara a sota. */
export function PositionTagScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const sex = layer.sex === "F" ? "F" : "M";
  const pos = Math.min(5, Math.max(1, layer.position ?? 1));
  const { data } = useLive<any>(`/api/trail/events/${eventId}/leaderboard?race=${race?.id ?? ""}&sex=${sex}&limit=5`, ["trail:changed"], 3000);
  const { visible, animated } = useSceneAnim(isLive, 800);
  if (!visible || !race) return null;
  const who = data?.rows?.[pos - 1];
  const accent = race.color || sexColor(sex);
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: 1920, height: 1080, pointerEvents: "none", fontFamily: T.font }}>
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 48,
          maxWidth: 900,
          boxSizing: "border-box",
          borderRadius: 18,
          overflow: "hidden",
          background: T.panelStrong,
          border: `1px solid ${T.line}`,
          boxShadow: T.shadow,
          opacity: animated ? 1 : 0,
          transform: animated ? "translateX(0)" : "translateX(80px)",
          transition: "opacity 0.35s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 120, padding: "0 22px", background: accent, color: T.bgDeep, fontWeight: 900, fontSize: 64, lineHeight: 1, letterSpacing: -1 }}>
            {ORDINAL[pos]}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 28px 14px 24px", minWidth: 0 }}>
            <span style={{ fontWeight: 900, fontSize: 42, color: sexColor(sex), letterSpacing: 2 }}>{sex === "F" ? "DONA" : "HOME"}</span>
            <span style={{ fontWeight: 900, fontSize: 36, color: T.muted }}>·</span>
            <span style={{ fontWeight: 900, fontSize: 42, color: T.white, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{race.name}</span>
          </div>
        </div>
        {who && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 24px", borderTop: `1px solid ${T.line}`, background: "rgba(255,255,255,0.03)" }}>
            <span style={{ fontWeight: 900, fontSize: 22, color: T.white, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{who.name}</span>
            <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 20, color: T.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>#{who.bib}</span>
          </div>
        )}
      </div>
    </div>
  );
}
