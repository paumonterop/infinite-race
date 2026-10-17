"use client";
import { useLive } from "@/lib/client/useLive";
import type { Favorite, HistEdition, HistResult } from "@/lib/trail/history";
import { cornerStyle, isLeft, layoutOf } from "@/lib/trail/layout";
import { ListFooter, ListHeader, ListPanel, Pill, RankRow, T, fmtGap, fmtHMS, useSceneAnim } from "./ui";
import { SceneProps, raceOf } from "./RaceScenes";

const SEX_LABEL = { M: "HOMES", F: "DONES" };

/** Classificació en directe d'una cursa (homes o dones): qui ha arribat més lluny i, al mateix control, el més ràpid. */
export function LeaderboardScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const sex = layer.sex === "F" ? "F" : "M";
  const { data } = useLive<any>(`/api/trail/events/${eventId}/leaderboard?race=${race?.id ?? ""}&sex=${sex}&limit=10`, ["trail:changed"], 3000);
  const { visible, animated } = useSceneAnim(isLive, 700);
  if (!visible || !data?.rows) return null;
  const accent = (race?.color || T.accent);
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
  const accent = (race?.color || T.accent);
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
  return useLive<{ editions: HistEdition[]; record_m: (HistResult & { distance_m: number | null }) | null; record_f: (HistResult & { distance_m: number | null }) | null }>(
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
          r={{ rank: r?.year ?? "—", name: r?.name ?? "Sense dades", club: r?.distance_m ? `${SEX_LABEL[sex]} · ${Math.round(r.distance_m / 1000)} KM` : SEX_LABEL[sex], diff: r ? fmtHMS(r.time_s) : "" }}
          index={i}
          total={2}
          animated={animated}
          accent={(race?.color || T.accent)}
        />
      ))}
      <ListFooter text={(() => { const d = data.record_m?.distance_m ?? data.record_f?.distance_m; return d ? `Edició de recorregut més semblant: ${Math.round(d / 1000)} km` : "Sense edicions anteriors comparables"; })()} />
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
              <div key={sex} style={{ flex: 1, minWidth: 0, borderLeft: `3px solid ${(race?.color || T.accent)}`, paddingLeft: 14 }}>
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

/** Etiqueta de posició (petita): «1r HOME · El Putu Trail» amb qui hi és ara a sota. Cantonada i mida a Configuració. */
export function PositionTagScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const sex = layer.sex === "F" ? "F" : "M";
  const pos = Math.min(5, Math.max(1, layer.position ?? 1));
  const cfg = layoutOf(ev, "tag");
  const { data } = useLive<any>(`/api/trail/events/${eventId}/leaderboard?race=${race?.id ?? ""}&sex=${sex}&limit=5`, ["trail:changed"], 3000);
  const { visible, animated } = useSceneAnim(isLive, 800);
  if (!visible || !race) return null;
  const who = data?.rows?.[pos - 1];
  const accent = race.color || (race?.color || T.accent);
  const dx = isLeft(cfg.corner) ? -80 : 80;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: 1920, height: 1080, pointerEvents: "none", fontFamily: T.font }}>
      <div style={cornerStyle(cfg)}>
        <div
          style={{
            maxWidth: 620,
            boxSizing: "border-box",
            borderRadius: 12,
            overflow: "hidden",
            background: T.panelStrong,
            border: `1px solid ${T.line}`,
            boxShadow: T.shadow,
            opacity: animated ? 1 : 0,
            transform: animated ? "translateX(0)" : `translateX(${dx}px)`,
            transition: "opacity 0.35s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 66, padding: "0 12px", background: accent, color: T.bgDeep, fontWeight: 900, fontSize: 36, lineHeight: 1, letterSpacing: -1 }}>
              {ORDINAL[pos]}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 16px 8px 13px", minWidth: 0 }}>
              <span style={{ fontWeight: 900, fontSize: 24, color: (race?.color || T.accent), letterSpacing: 1.5 }}>{sex === "F" ? "DONA" : "HOME"}</span>
              <span style={{ fontWeight: 900, fontSize: 20, color: T.muted }}>·</span>
              <span style={{ fontWeight: 900, fontSize: 24, color: T.white, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" }}>{race.name}</span>
            </div>
          </div>
          {who && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 14px", borderTop: `1px solid ${T.line}`, background: "rgba(255,255,255,0.03)" }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: T.white, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{who.name}</span>
              <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 14, color: T.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>#{who.bib}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Classificació petita (màx. top 5) per a un racó de la pantalla; per defecte baix a la dreta. S'aparta si hi ha dials de motxilla. */
export function MiniLeaderboardScene({ eventId, ev, layer, isLive }: SceneProps) {
  const race = raceOf(ev, layer);
  const sex = layer.sex === "F" ? "F" : "M";
  const cfg = layoutOf(ev, "mini");
  const atPoint = layer.scene === "leaderboard_point_mini" && layer.point != null;
  const { data } = useLive<any>(`/api/trail/events/${eventId}/leaderboard?race=${race?.id ?? ""}&sex=${sex}&limit=5${atPoint ? `&point=${layer.point}` : ""}`, ["trail:changed"], 3000);
  const cp = atPoint ? race?.checkpoints?.find((c: any) => c.id === layer.point) : null;
  const { visible, animated } = useSceneAnim(isLive, 800);
  if (!visible || !race) return null;
  const accent = (race?.color || T.accent);
  const rows: any[] = (data?.rows ?? []).slice(0, 5);
  const dx = isLeft(cfg.corner) ? -60 : 60;
  const style = { ...cornerStyle(cfg) };
  // els dials de motxilla viuen a baix a la dreta: la classificació s'aparta cap a l'esquerra
  if (cfg.corner === "br") style.right = "calc(48px + var(--gw, 0px))";
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: 1920, height: 1080, pointerEvents: "none", fontFamily: T.font }}>
      <div style={style}>
        <div
          style={{
            width: 470,
            boxSizing: "border-box",
            borderRadius: 14,
            overflow: "hidden",
            background: T.panelStrong,
            border: `1px solid ${T.line}`,
            boxShadow: T.shadow,
            opacity: animated ? 1 : 0,
            transform: animated ? "translateX(0)" : `translateX(${dx}px)`,
            transition: "opacity 0.35s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", background: `linear-gradient(90deg, ${accent}2b, rgba(8,12,18,0))`, borderBottom: `1px solid ${T.line}` }}>
            <div style={{ width: 5, height: 20, background: accent, borderRadius: 3 }} />
            <span style={{ fontWeight: 900, fontSize: 18, color: T.white, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cp ? cp.name : race.name}</span>
            {cp && (
              <span style={{ fontWeight: 800, fontSize: 14, color: T.muted, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                KM {String(cp.km).replace(".", ",")}
              </span>
            )}
            <span style={{ marginLeft: "auto", fontWeight: 900, fontSize: 12, letterSpacing: 2, color: accent, border: `1.5px solid ${accent}`, borderRadius: 999, padding: "1px 9px" }}>{SEX_LABEL[sex]}</span>
          </div>
          {rows.length === 0 && <div style={{ padding: "10px 14px", color: T.muted, fontSize: 16 }}>{cp ? "Encara no hi ha passat ningú." : "Encara no hi ha cap pas per control."}</div>}
          {rows.map((r, i) => (
            <div
              key={r.bib}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                height: 38,
                padding: "0 12px 0 8px",
                borderTop: i ? `1px solid ${T.line}` : "none",
                background: i === 0 ? `${accent}1f` : "transparent",
                opacity: animated ? 1 : 0,
                transform: animated ? "translateX(0)" : `translateX(${dx / 2}px)`,
                transition: `opacity 0.35s ease ${i * 60}ms, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms`,
              }}
            >
              <span style={{ width: 26, textAlign: "center", fontWeight: 900, fontSize: 20, color: i === 0 ? accent : T.muted, fontVariantNumeric: "tabular-nums" }}>{r.rank}</span>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 19, color: T.white, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
              <span style={{ fontWeight: 900, fontSize: 19, color: i === 0 ? T.white : T.text, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {i === 0 || r.gap_s == null ? fmtHMS(r.time_s) : fmtGap(r.gap_s)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Estadístiques d'una cursa: com van els inscrits i quants han passat per cada control. */
export function RaceStatsScene({ eventId, ev, layer, isLive }: SceneProps) {
  const base = raceOf(ev, layer);
  // dades fresques (l'esdeveniment del programa es refresca poc): es llegeix la cursa en directe
  const { data: live } = useLive<any>(`/api/trail/events/${eventId}?lite=1`, ["trail:changed"], 5000);
  const race = live?.races?.find((r: any) => r.id === base?.id) ?? base;
  const { visible, animated } = useSceneAnim(isLive, 700);
  if (!visible || !race) return null;
  const accent = race.color || T.accent;
  const rs: any[] = race.runners ?? [];
  const total = rs.length;
  const count = (st: string) => rs.filter((r) => r.status === st).length;
  const started = rs.filter((r) => r.last_point_km != null).length;
  const kpis = [
    { label: "INSCRITS", value: total, color: T.white },
    { label: "EN CURSA", value: count("RUNNING"), color: T.green },
    { label: "ARRIBATS", value: count("FINISHED"), color: T.accent },
    { label: "RETIRATS", value: count("DNF"), color: T.red },
  ];
  const rows = [
    { name: "Sortida", km: 0, passed: started },
    ...race.checkpoints.map((c: any) => ({
      name: c.name,
      km: c.km,
      passed: rs.filter((r) => r.last_point_km != null && r.last_point_km >= c.km - 0.01).length,
    })),
  ];
  const denom = Math.max(total, 1);
  return (
    <ListPanel animated={animated}>
      <ListHeader title="Estadístiques" accent={accent} right={race.name.toUpperCase()} badge="EN DIRECTE" />
      <div style={{ display: "flex", gap: 12, padding: "16px 16px 6px" }}>
        {kpis.map((k, i) => (
          <div
            key={k.label}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 0 8px",
              borderRadius: 12,
              background: T.row,
              border: `1px solid ${T.line}`,
              opacity: animated ? 1 : 0,
              transform: animated ? "translateY(0)" : "translateY(14px)",
              transition: `opacity 0.4s ease ${i * 70}ms, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 70}ms`,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 46, lineHeight: 1, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 2, color: T.muted, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 16px 0" }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 3, color: T.muted, margin: "6px 4px 8px" }}>QUANTS HAN PASSAT PER CADA CONTROL</div>
        {rows.map((r, i) => {
          const pct = Math.round((r.passed / denom) * 100);
          return (
            <div
              key={r.name + i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                height: 46,
                marginBottom: 6,
                padding: "0 14px",
                borderRadius: 10,
                background: T.row,
                border: `1px solid ${T.line}`,
                opacity: animated ? 1 : 0,
                transform: animated ? "translateX(0)" : "translateX(-24px)",
                transition: `opacity 0.4s ease ${150 + i * 55}ms, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${150 + i * 55}ms`,
              }}
            >
              <span style={{ width: 250, fontWeight: 900, fontSize: 24, color: T.white, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
              <span style={{ width: 90, fontWeight: 700, fontSize: 18, color: T.muted, fontVariantNumeric: "tabular-nums" }}>km {String(r.km).replace(".", ",")}</span>
              <div style={{ flex: 1, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: animated ? `${pct}%` : "0%", height: "100%", background: accent, borderRadius: 8, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${300 + i * 55}ms` }} />
              </div>
              <span style={{ width: 150, textAlign: "right", fontWeight: 900, fontSize: 24, color: T.white, fontVariantNumeric: "tabular-nums" }}>
                {r.passed}
                <span style={{ fontWeight: 700, fontSize: 17, color: T.muted }}> / {total}</span>
              </span>
              <span style={{ width: 64, textAlign: "right", fontWeight: 800, fontSize: 20, color: accent, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
            </div>
          );
        })}
      </div>
      <ListFooter text="Segons l'últim control registrat de cada atleta" />
    </ListPanel>
  );
}
