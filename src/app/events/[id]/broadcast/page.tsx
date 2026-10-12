"use client";
import { useEffect, useMemo, useState } from "react";
import TrailNav from "@/components/trail/TrailNav";
import { checkpointSegments } from "@/components/broadcast/trail/RaceScenes";
import { useLive } from "@/lib/client/useLive";
import type { Analysis } from "@/lib/trail/analysis";
import { Layer, Program, SCENES, SCENE_BY_ID, SceneId, Slot } from "@/lib/trail/scenes";
import type { GpsPosition } from "@/lib/trail/types";

const SLOT_LABEL: Record<Slot, string> = {
  main: "Centre",
  lower: "Inferior",
  chrono: "Cronòmetre",
  tag: "Etiqueta",
  mini: "Classif. petita",
  gauge_speed: "Velocitat",
  gauge_gradient: "Pendent",
};

const GROUPS = Array.from(new Set(SCENES.map((s) => s.group)));

/**
 * Consola de broadcast: tot a una sola pantalla, sense scroll de pàgina.
 *   esquerra: catàleg d'escenes · centre: previsualització + paràmetres + «posa en antena» · dreta: programa (el que surt)
 */
export default function BroadcastPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: ev } = useLive<any>(`/api/trail/events/${id}`, ["trail:changed"], 15000);
  const { data: prog, refetch } = useLive<Program>(`/api/trail/events/${id}/program`, ["trail:program"], 3000);
  const { data: gps } = useLive<GpsPosition[]>(`/api/trail/events/${id}/gps`, [], 3000);

  const [sceneId, setSceneId] = useState<SceneId>("presentation_profile");
  const [raceId, setRaceId] = useState<string | null>(null);
  const [sex, setSex] = useState<"M" | "F">("M");
  const [bib, setBib] = useState("");
  const [q, setQ] = useState("");
  const [device, setDevice] = useState("");
  const [point, setPoint] = useState<number | null>(null);
  const [other, setOther] = useState("");
  const [position, setPosition] = useState(1);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [segIdx, setSegIdx] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [programKey, setProgramKey] = useState(0);
  const [showUrls, setShowUrls] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const def = SCENE_BY_ID[sceneId];
  const rid = raceId ?? ev?.races[0]?.id ?? "";
  const race = ev?.races.find((r: any) => r.id === rid);

  const { data: analysis } = useLive<Analysis>(def.needs.includes("segment") && rid ? `/api/trail/events/${id}/analysis?race=${rid}` : "", [], 60000);
  const segments = useMemo(() => (analysis && !(analysis as any).error ? checkpointSegments(analysis) : []), [analysis]);

  useEffect(() => {
    const s = segments[segIdx];
    if (s) {
      setFrom(String(s.km_start));
      setTo(String(s.km_end));
    }
  }, [segments, segIdx]);

  useEffect(() => {
    setBib("");
    setPoint(null);
    setSegIdx(0);
  }, [rid]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s || !race) return [];
    return race.runners.filter((r: any) => r.bib.startsWith(s) || `${r.first_name} ${r.last_name}`.toLowerCase().includes(s)).slice(0, 6);
  }, [q, race]);

  const layer: Layer = useMemo(() => {
    const l: Layer = { scene: sceneId, race_id: def.needs.includes("race") ? rid : null };
    if (def.needs.includes("sex")) l.sex = sex;
    if (def.needs.includes("bib")) l.bib = bib;
    if (def.needs.includes("segment")) {
      l.from_km = parseFloat(from);
      l.to_km = parseFloat(to);
      l.label = segments[segIdx]?.name ?? `Km ${from}–${to}`;
    }
    if (def.needs.includes("device")) l.device = device;
    if (def.needs.includes("point") && point != null) l.point = point;
    if (def.needs.includes("other")) l.other = other;
    if (def.needs.includes("position")) l.position = position;
    return l;
  }, [sceneId, def, rid, sex, bib, from, to, segments, segIdx, device, point, other, position]);

  const ready =
    (!def.needs.includes("bib") || !!bib) &&
    (!def.needs.includes("device") || !!device) &&
    (!def.needs.includes("point") || point != null) &&
    (!def.needs.includes("other") || !!other) &&
    (!def.needs.includes("segment") || parseFloat(to) > parseFloat(from));

  const previewUrl = useMemo(() => {
    const u = new URLSearchParams({ scene: layer.scene, transparent: "0" });
    if (layer.race_id) u.set("race", layer.race_id);
    if (layer.sex) u.set("sex", layer.sex);
    if (layer.bib) u.set("bib", layer.bib);
    if (layer.from_km != null && !Number.isNaN(layer.from_km)) u.set("from", String(layer.from_km));
    if (layer.to_km != null && !Number.isNaN(layer.to_km)) u.set("to", String(layer.to_km));
    if (layer.label) u.set("label", layer.label);
    if (layer.device) u.set("device", layer.device);
    if (layer.point != null) u.set("point", String(layer.point));
    if (layer.other) u.set("other", layer.other);
    if (layer.position != null) u.set("pos", String(layer.position));
    return `/broadcast/trail/${id}/scene?${u}`;
  }, [layer, id]);

  async function post(body: any) {
    await fetch(`/api/trail/events/${id}/program`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    refetch();
  }
  async function addOther() {
    if (!newName.trim()) return;
    const r = await fetch(`/api/trail/events/${id}/others`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, role: newRole }) });
    const list = await r.json();
    const added = Array.isArray(list) ? list.find((o: any) => o.name === newName.trim()) : null;
    setNewName("");
    setNewRole("");
    if (added) setOther(added.id);
  }
  async function removeOther(oid: string) {
    await fetch(`/api/trail/events/${id}/others?id=${encodeURIComponent(oid)}`, { method: "DELETE" });
    if (other === oid) setOther("");
  }

  const urls = [
    { key: "prog", label: "Sortida de programa (vMix/OBS) — mostra el que estigui en antena", url: `${origin}/broadcast/trail/${id}` },
    { key: "tick", label: "Ticker de passos (totes les curses)", url: `${origin}/broadcast/trail/${id}/ticker` },
    ...(ev?.races ?? []).map((r: any) => ({ key: "t" + r.id, label: `Ticker de passos — ${r.name}`, url: `${origin}/broadcast/trail/${id}/ticker?race=${r.id}` })),
  ];
  async function copy(key: string, url: string) {
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const active = (Object.entries(prog?.layers ?? {}) as [Slot, Layer][]).filter(([, l]) => !!l);
  const onAir = active.length > 0 || !!prog?.ticker;
  const inp = "rounded-md border border-white/10 bg-[#0b0f14] px-2 py-1 text-sm";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TrailNav eventId={id} name={ev?.name} />
      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[270px_minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Catàleg d'escenes ── */}
        <aside className="min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2">
          {GROUPS.map((g) => (
            <div key={g} className="mb-2">
              <h2 className="mb-1 px-1 text-[10px] font-bold tracking-widest text-slate-500">{g.toUpperCase()}</h2>
              <div className="space-y-1">
                {SCENES.filter((s) => s.group === g).map((s) => {
                  const air = active.some(([, l]) => l.scene === s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSceneId(s.id);
                        setPreviewKey((k) => k + 1);
                      }}
                      title={s.desc}
                      className={`flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-[13px] font-bold ${
                        sceneId === s.id ? "border-sky-500/60 bg-sky-500/10" : "border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <span className="truncate">{s.label}</span>
                      {air && <span className="ml-auto rounded bg-red-600 px-1.5 text-[9px] font-black tracking-widest">ANTENA</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* ── Previsualització + paràmetres ── */}
        <section className="flex min-h-0 min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold tracking-widest text-slate-400">PREVISUALITZACIÓ</h2>
            <span className="truncate text-sm font-black">{def.label}</span>
            <span className="hidden truncate text-[11px] text-slate-500 xl:inline">· zona: {SLOT_LABEL[def.slot]}</span>
            <button onClick={() => setPreviewKey((k) => k + 1)} className="ml-auto rounded bg-white/10 px-2 py-0.5 text-xs font-bold hover:bg-white/20">
              ↻ Repeteix
            </button>
          </div>
          <div className="relative w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#1b2230]" style={{ aspectRatio: "16 / 9" }}>
            {race && ready && <iframe key={previewKey + previewUrl} src={previewUrl} className="absolute inset-0 h-full w-full border-0" title="preview" />}
            {!ready && <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-slate-500">Completa els paràmetres per veure la previsualització</div>}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
            {def.needs.includes("race") && (
              <Row label="CURSA">
                {ev?.races.map((r: any) => (
                  <button key={r.id} onClick={() => setRaceId(r.id)} className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-bold ${rid === r.id ? "border-sky-500/60 bg-sky-500/10" : "border-white/10 hover:bg-white/5"}`}>
                    <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                    {r.name}
                  </button>
                ))}
              </Row>
            )}
            {def.needs.includes("sex") && (
              <Row label="CATEGORIA">
                {(["M", "F"] as const).map((s) => (
                  <button key={s} onClick={() => setSex(s)} className={`rounded-md border px-3 py-1 text-sm font-bold ${sex === s ? "border-sky-500/60 bg-sky-500/10" : "border-white/10 hover:bg-white/5"}`}>
                    {s === "M" ? "Homes" : "Dones"}
                  </button>
                ))}
              </Row>
            )}
            {def.needs.includes("position") && (
              <Row label="POSICIÓ">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setPosition(n)} className={`h-8 w-10 rounded-md border text-sm font-black ${position === n ? "border-sky-500/60 bg-sky-500/10" : "border-white/10 hover:bg-white/5"}`}>
                    {n}
                  </button>
                ))}
              </Row>
            )}
            {def.needs.includes("bib") && (
              <Row label="DORSAL">
                <div className="relative flex items-center gap-1">
                  <input
                    value={bib ? `#${bib}` : q}
                    onChange={(e) => {
                      setBib("");
                      setQ(e.target.value.replace(/^#/, ""));
                    }}
                    placeholder="Dorsal o nom…"
                    className={`${inp} w-48`}
                  />
                  {matches.length > 0 && !bib && (
                    <div className="absolute bottom-full z-20 mb-1 w-72 rounded-lg border border-white/10 bg-[#0b0f14] shadow-xl">
                      {matches.map((r: any) => (
                        <button
                          key={r.bib}
                          onClick={() => {
                            setBib(r.bib);
                            setQ("");
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/10"
                        >
                          <span className="font-mono text-slate-400">#{r.bib}</span>
                          <span className="font-semibold">
                            {r.first_name} {r.last_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Row>
            )}
            {def.needs.includes("segment") && (
              <Row label="SEGMENT">
                <select value={segIdx} onChange={(e) => setSegIdx(parseInt(e.target.value, 10))} className={`${inp} max-w-[260px]`}>
                  {segments.length === 0 && <option>(cal GPX)</option>}
                  {segments.map((s, i) => (
                    <option key={i} value={i}>
                      {s.name} · km {s.km_start}–{s.km_end}
                    </option>
                  ))}
                </select>
                <input value={from} onChange={(e) => setFrom(e.target.value)} className={`${inp} w-16`} title="km inici" />
                <span className="text-slate-500">–</span>
                <input value={to} onChange={(e) => setTo(e.target.value)} className={`${inp} w-16`} title="km final" />
              </Row>
            )}
            {def.needs.includes("device") && (
              <Row label="MOTXILLA">
                <select value={device} onChange={(e) => setDevice(e.target.value)} className={inp}>
                  <option value="">— tria —</option>
                  <option value="auto">🎥 Automàtic (la que és en programa a vMix)</option>
                  {(Array.isArray(gps) ? gps : []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                      {d.runner_name ? ` · ${d.runner_name}` : ""} {d.status === "online" ? "●" : "○"}
                    </option>
                  ))}
                </select>
              </Row>
            )}
            {def.needs.includes("point") && (
              <Row label="CONTROL">
                <select value={point ?? ""} onChange={(e) => setPoint(e.target.value === "" ? null : parseInt(e.target.value, 10))} className={inp}>
                  <option value="">— tria —</option>
                  {race?.checkpoints.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · km {c.km}
                    </option>
                  ))}
                </select>
              </Row>
            )}
            {def.needs.includes("other") && (
              <Row label="PERSONA">
                <div className="flex flex-wrap items-center gap-1">
                  {(ev?.others ?? []).map((o: any) => (
                    <span key={o.id} className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm ${other === o.id ? "border-sky-500/60 bg-sky-500/10" : "border-white/10"}`}>
                      <button onClick={() => setOther(o.id)} className="font-bold">
                        {o.name} <span className="font-normal text-slate-400">· {o.role}</span>
                      </button>
                      <button onClick={() => removeOther(o.id)} className="text-xs text-slate-500 hover:text-red-400" title="Esborra de la llista">
                        ✕
                      </button>
                    </span>
                  ))}
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom" className={`${inp} w-32`} />
                  <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Càrrec" className={`${inp} w-36`} />
                  <button onClick={addOther} disabled={!newName.trim()} className="rounded-md bg-white/10 px-2.5 py-1 text-sm font-bold hover:bg-white/20 disabled:opacity-40">
                    + Afegeix
                  </button>
                </div>
              </Row>
            )}
            {def.needs.length === 0 && <p className="text-xs text-slate-500">Aquesta escena no necessita paràmetres.</p>}
          </div>

          <button
            onClick={() => post({ layer })}
            disabled={!ready}
            className="shrink-0 rounded-lg bg-red-600 py-3 text-base font-black tracking-wide text-white hover:bg-red-500 disabled:opacity-40"
          >
            ▶ POSA EN ANTENA
          </button>
        </section>

        {/* ── Programa (el que surt de debò) ── */}
        <section className="flex min-h-0 min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={`rounded px-2.5 py-0.5 text-xs font-black tracking-widest ${onAir ? "bg-red-600 text-white" : "bg-white/10 text-slate-400"}`}>{onAir ? "● PROGRAMA" : "PROGRAMA · buit"}</span>
            <button onClick={() => setProgramKey((k) => k + 1)} className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold hover:bg-white/20" title="Recarrega la vista del programa">
              ↻
            </button>
            <button onClick={() => setShowUrls((v) => !v)} className="ml-auto rounded bg-white/10 px-2.5 py-0.5 text-xs font-bold hover:bg-white/20">
              URLs vMix / OBS
            </button>
          </div>
          <div className="relative w-full shrink-0 overflow-hidden rounded-xl border border-red-500/40 bg-[#1b2230]" style={{ aspectRatio: "16 / 9" }}>
            <iframe key={programKey} src={`/broadcast/trail/${id}?transparent=0`} className="absolute inset-0 h-full w-full border-0" title="programa" />
            {showUrls && (
              <div className="absolute inset-0 z-10 overflow-y-auto bg-[#0b0f14]/97 p-3">
                <div className="mb-2 flex items-center">
                  <span className="text-xs font-bold tracking-widest text-slate-400">URLS PER A vMIX / OBS (Browser Input 1920×1080)</span>
                  <button onClick={() => setShowUrls(false)} className="ml-auto rounded bg-white/10 px-2 py-0.5 text-xs font-bold hover:bg-white/20">
                    ✕
                  </button>
                </div>
                <div className="space-y-1.5">
                  {urls.map((u) => (
                    <div key={u.key} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold">{u.label}</div>
                        <div className="truncate font-mono text-[11px] text-slate-500">{u.url}</div>
                      </div>
                      <button onClick={() => copy(u.key, u.url)} className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold hover:bg-white/20">
                        {copied === u.key ? "Copiat ✓" : "Copia"}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Totes les sortides són transparents i no demanen contrasenya (afegeix <span className="font-mono">?transparent=0</span> per veure-les amb fons fosc al navegador).
                </p>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
            {active.length === 0 && <p className="text-sm text-slate-500">Cap escena en antena.</p>}
            {active.map(([slot, l]) => (
              <div key={slot} className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-sm">
                <span className="w-20 shrink-0 text-[10px] font-bold tracking-widest text-red-300">{SLOT_LABEL[slot].toUpperCase()}</span>
                <span className="min-w-0 flex-1 truncate">
                  <b>{SCENE_BY_ID[l.scene]?.label}</b>
                  <span className="text-slate-400">
                    {l.race_id ? ` · ${ev?.races.find((r: any) => r.id === l.race_id)?.name ?? ""}` : ""}
                    {l.sex ? ` · ${l.sex === "F" ? "Dones" : "Homes"}` : ""}
                    {l.position ? ` · posició ${l.position}` : ""}
                    {l.bib ? ` · ${l.bib === "auto" ? "auto" : `#${l.bib}`}` : ""}
                    {l.device ? ` · ${l.device === "auto" ? "auto" : l.device}` : ""}
                    {l.other ? ` · ${ev?.others?.find((o: any) => o.id === l.other)?.name ?? ""}` : ""}
                  </span>
                </span>
                <button onClick={() => post({ clear: slot })} className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold hover:bg-red-600">
                  Treu
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={!!prog?.ticker} onChange={(e) => post({ ticker: e.target.checked })} />
                Ticker de passos
              </label>
              <button onClick={() => post({ clear: "all" })} disabled={!active.length} className="ml-auto rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20 disabled:opacity-40">
                🧹 Neteja-ho tot
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-20 shrink-0 text-[10px] font-bold tracking-widest text-slate-500">{label}</div>
      <div className="flex min-w-0 flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}
