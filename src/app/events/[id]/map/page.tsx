"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { Leader } from "@/lib/trail/estimate";
import ElevationProfile from "@/components/trail/ElevationProfile";
import TrailNav from "@/components/trail/TrailNav";
import { useLive } from "@/lib/client/useLive";
import type { GpsPosition } from "@/lib/trail/types";

const TrailMap = dynamic(() => import("@/components/trail/TrailMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-slate-500">Carregant mapa…</div>,
});

export default function MapPage({ params }: { params: { id: string } }) {
  const { data: ev } = useLive<any>(`/api/trail/events/${params.id}`, ["trail:changed"], 15000);
  const { data: gps, refetch } = useLive<GpsPosition[]>(`/api/trail/events/${params.id}/gps`, [], 1500);
  const [focus, setFocus] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<string | null>(null);
  const [hoverPoint, setHoverPoint] = useState<[number, number] | null>(null);
  const [profileOpen, setProfileOpen] = useState(true);
  // quants primers es marquen de cada cursa (0 = cap) i de quina categoria; es recorda al navegador
  const [top, setTop] = useState<Record<string, number>>({});
  const [topSex, setTopSex] = useState<"all" | "M" | "F">("all");
  const storeKey = `gfx-top-${params.id}`;
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(storeKey) ?? "null");
      if (v?.top) setTop(v.top);
      if (v?.sex) setTopSex(v.sex);
    } catch {
      /* sense memòria local: es parteix de zero */
    }
  }, [storeKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify({ top, sex: topSex }));
    } catch {
      /* ignorat */
    }
  }, [top, topSex, storeKey]);
  // ?at=<ISO> reprodueix un instant d'una cursa passada (proves i demostracions)
  const [replayAt, setReplayAt] = useState<string | null>(null);
  useEffect(() => setReplayAt(new URLSearchParams(window.location.search).get("at")), []);
  const selParam = Object.entries(top)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}:${n}`)
    .join(",");
  const { data: leadersData } = useLive<{ races: Record<string, Leader[]> }>(
    selParam ? `/api/trail/events/${params.id}/leaders?sel=${selParam}&sex=${topSex}${replayAt ? `&at=${encodeURIComponent(replayAt)}` : ""}` : "",
    ["trail:changed"],
    2000
  );
  const leaders = selParam && leadersData?.races ? leadersData.races : undefined;

  async function assign(id: string, patch: Record<string, any>) {
    await fetch(`/api/trail/events/${params.id}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    refetch();
  }

  const devices = Array.isArray(gps) ? gps : [];
  const online = devices.filter((d) => d.status === "online").length;

  // cursa de la pestanya activa: la triada o, per defecte, la primera amb GPX
  const races: any[] = ev?.races ?? [];
  const activeId = tab && races.some((r) => r.id === tab) ? tab : (races.find((r) => r.gpx) ?? races[0])?.id ?? null;
  const active = races.find((r) => r.id === activeId);
  const activeDevices = useMemo(() => devices.filter((d) => d.race_id === activeId), [devices, activeId]);

  return (
    <div className="flex h-screen flex-col">
      <TrailNav eventId={params.id} name={ev?.name} />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_380px]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="relative min-h-[40vh] flex-1">
            {ev && <TrailMap races={races} devices={devices} hidden={hidden} focus={focus} focusRaceId={activeId} hoverPoint={hoverPoint} leaders={leaders} />}
          </div>

          {/* Perfil del GPX, amb pestanyes per cursa */}
          <div className="shrink-0 border-t border-white/10 bg-[#0b0f14]">
            <div className="flex items-center gap-1 overflow-x-auto px-3 pt-2">
              <span className="mr-2 text-[10px] font-bold tracking-widest text-slate-500">PERFIL</span>
              {races.length > 1 ? (
                races.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setTab(r.id);
                      setProfileOpen(true);
                    }}
                    className={`flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3 py-1.5 text-sm font-bold ${
                      activeId === r.id ? "border-white/20 bg-white/[0.06] text-white" : "border-transparent text-slate-400 hover:bg-white/5"
                    }`}
                    style={activeId === r.id ? { boxShadow: `inset 0 3px 0 ${r.color}` } : undefined}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                    {r.name}
                    <span className="text-xs font-normal text-slate-500">{r.gpx ? `${r.gpx.total_km} km` : "sense GPX"}</span>
                  </button>
                ))
              ) : (
                active && (
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: active.color }} />
                    {active.name}
                    <span className="text-xs font-normal text-slate-500">{active.gpx ? `${active.gpx.total_km} km` : ""}</span>
                  </span>
                )
              )}
              {active?.gpx && (
                <span className="ml-3 hidden shrink-0 text-xs text-slate-400 md:inline">
                  {active.distance_m ? `${(active.distance_m / 1000).toFixed(1)} km · ` : ""}+{active.elevation_gain ?? Math.round(active.gpx.elevation_gain ?? 0)} m · {(() => { const n = activeDevices.filter((d) => d.status === "online" && d.km != null).length; return `${n} ${n === 1 ? "motxilla" : "motxilles"} en ruta`; })()}
                </span>
              )}
              <button onClick={() => setProfileOpen((o) => !o)} className="ml-auto shrink-0 rounded bg-white/10 px-2 py-0.5 text-xs font-bold hover:bg-white/20" title="Plega o desplega el perfil">
                {profileOpen ? "▾ Plega" : "▴ Desplega"}
              </button>
            </div>
            {profileOpen && active && (
              <div className="border-t border-white/10 bg-white/[0.03] px-2 pb-1">
                <ElevationProfile race={active} devices={activeDevices} leaders={activeId && leaders ? leaders[activeId] : undefined} onHover={setHoverPoint} height={190} />
              </div>
            )}
          </div>
        </div>

        <aside className="min-h-0 overflow-y-auto border-l border-white/10 bg-[#0b0f14] p-4">
          <h2 className="text-xs font-bold tracking-widest text-slate-400">CURSES I PRIMERS</h2>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Marca al mapa i al perfil els primers de cada cursa. La posició és <b>estimada</b> a partir dels passos per control i el desnivell del GPX; el cercle amb vora discontínua és entre controls i el ple, just en un control.
          </p>
          <div className="mt-2 flex gap-1">
            {([["all", "General"], ["M", "Homes"], ["F", "Dones"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setTopSex(v)} className={`flex-1 rounded-md border px-2 py-1 text-xs font-bold ${topSex === v ? "border-sky-500/60 bg-sky-500/10" : "border-white/10 hover:bg-white/5"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-2 space-y-2">
            {races.map((r: any) => (
              <div key={r.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={!hidden[r.id]} onChange={() => setHidden((h) => ({ ...h, [r.id]: !h[r.id] }))} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  <span className="font-semibold">{r.name}</span>
                  <span className="ml-auto text-xs text-slate-500">{r.gpx ? `${r.gpx.total_km} km` : "sense GPX"}</span>
                </label>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="mr-1 text-[10px] font-bold tracking-widest text-slate-500">PRIMERS</span>
                  {[0, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      disabled={!r.gpx}
                      onClick={() => setTop((t) => ({ ...t, [r.id]: n }))}
                      className={`h-7 flex-1 rounded-md border text-xs font-black disabled:opacity-30 ${
                        (top[r.id] ?? 0) === n ? "border-sky-500/60 bg-sky-500/20 text-white" : "border-white/10 text-slate-400 hover:bg-white/5"
                      }`}
                      style={(top[r.id] ?? 0) === n && n > 0 ? { boxShadow: `inset 0 -3px 0 ${r.color}` } : undefined}
                    >
                      {n === 0 ? "Cap" : `Top ${n}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h2 className="mb-2 mt-6 flex items-center text-xs font-bold tracking-widest text-slate-400">
            MOTXILLES GPS
            <span className="ml-auto rounded bg-white/10 px-2 py-0.5 text-slate-300">
              {online}/{devices.length} en línia
            </span>
          </h2>
          {devices.length === 0 && (
            <p className="text-sm text-slate-500">
              Cap motxilla connectada. Les motxilles han d&apos;enviar l&apos;event <code>gps_data</code> per Socket.IO a aquest servidor.
            </p>
          )}
          <div className="space-y-2">
            {devices.map((d) => {
              const race = races.find((r: any) => r.id === d.race_id);
              return (
                <div
                  key={d.id}
                  onClick={() => {
                    if (d.lat != null) setFocus(d.id + ":" + Date.now());
                    if (d.race_id) setTab(d.race_id);
                  }}
                  className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-sky-500/40"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${d.status === "online" ? "bg-emerald-400" : "bg-slate-600"}`} />
                    <span className="font-bold">{d.label}</span>
                    {d.runner_name && (
                      <span className="truncate text-sm text-slate-300">
                        · #{d.bib} {d.runner_name}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-slate-500">{d.speed_kmh != null ? `${d.speed_kmh.toFixed(1)} km/h` : ""}</span>
                  </div>
                  {d.km != null && race?.gpx && (
                    <div className="mt-2">
                      <div className="h-1.5 overflow-hidden rounded bg-white/10">
                        <div className="h-full" style={{ width: `${d.pct}%`, background: race.color }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                        <span>
                          km {d.km} / {race.gpx.total_km}
                        </span>
                        <span>{d.off_route ? "⚠ fora de ruta" : `${d.pct}%`}</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={d.race_id ?? ""}
                      onChange={(e) => assign(d.id, { race_id: e.target.value || null })}
                      className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#0b0f14] px-2 py-1 text-xs"
                    >
                      <option value="">— cursa —</option>
                      {races.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <input
                      defaultValue={d.bib ?? ""}
                      key={d.id + (d.bib ?? "")}
                      placeholder="dorsal"
                      onBlur={(e) => e.target.value !== (d.bib ?? "") && assign(d.id, { bib: e.target.value.trim() || null })}
                      className="w-20 rounded-md border border-white/10 bg-[#0b0f14] px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
