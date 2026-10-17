"use client";
import { useEffect, useState } from "react";
import TrailNav from "@/components/trail/TrailNav";
import { useLive } from "@/lib/client/useLive";
import { fmtDate } from "@/lib/client/format";
import { KNOWN_DEVICE_IDS, defaultLabel } from "@/lib/trail/devices";
import { DEFAULT_TICKER_SPEED } from "@/components/broadcast/TrailTicker";
import { DEFAULT_PREVIEW_BG, GREEN, PREVIEW_BG_LABEL, PreviewBg, PreviewBgMode, previewBgOf, previewBgStyle } from "@/lib/trail/previewBg";
import { CORNER_LABEL, Corner, DEFAULT_LAYOUT, LAYOUT_LABEL, LayoutCfg, LayoutKey, layoutOf } from "@/lib/trail/layout";
import type { GpsPosition } from "@/lib/trail/types";
import type { VmixStatus } from "@/lib/trail/vmix";

export default function ConfigPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: ev, refetch } = useLive<any>(`/api/trail/events/${id}`, ["trail:changed"], 10000);
  const [name, setName] = useState("");
  const [flag, setFlag] = useState("es-ct");
  const [colors, setColors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [vip, setVip] = useState("");
  const [vport, setVport] = useState("8099");
  const [vmap, setVmap] = useState<Record<string, string>>({});
  const [vtest, setVtest] = useState<string | null>(null);
  const [layout, setLayout] = useState<Record<LayoutKey, LayoutCfg>>(DEFAULT_LAYOUT);
  const [pbg, setPbg] = useState<PreviewBg>(DEFAULT_PREVIEW_BG);
  const [tspeed, setTspeed] = useState<number>(DEFAULT_TICKER_SPEED);
  const { data: gps } = useLive<GpsPosition[]>(`/api/trail/events/${id}/gps`, [], 5000);
  const { data: vstat } = useLive<VmixStatus>(`/api/trail/events/${id}/vmix`, [], 2000);

  useEffect(() => {
    if (!ev) return;
    setName((n) => n || ev.name);
    setFlag((f) => (ev.flag ? ev.flag : f));
    setColors((c) => (Object.keys(c).length ? c : Object.fromEntries(ev.races.map((r: any) => [r.id, r.color]))));
    setLayout({ chrono: layoutOf(ev, "chrono"), tag: layoutOf(ev, "tag"), mini: layoutOf(ev, "mini") });
    setPbg(previewBgOf(ev));
    setTspeed(ev.ticker_speed ?? DEFAULT_TICKER_SPEED);
    setVip((v) => v || ev.vmix?.ip || "");
    setVport((v) => (ev.vmix?.port ? String(ev.vmix.port) : v));
    setVmap((m) => (Object.keys(m).length ? m : Object.fromEntries(Object.entries(ev.vmix?.input_map ?? {}).map(([k, n]) => [k, String(n)]))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev?.id]);

  async function save() {
    const res = await fetch(`/api/trail/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        flag,
        races: Object.entries(colors).map(([rid, color]) => ({ id: rid, color })),
        vmix: { ip: vip, port: vport, input_map: vmap },
        layout: { chrono: layout.chrono },
        preview_bg: pbg,
        ticker_speed: tspeed,
      }),
    });
    setMsg(res.ok ? "Desat ✓" : "⚠ Error en desar");
    refetch();
  }

  async function testVmix() {
    setVtest("Provant…");
    const res = await fetch(`/api/trail/events/${id}/vmix`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip: vip, port: vport }) });
    const j = await res.json();
    setVtest(res.ok ? `Connectat ✓ · ${j.inputs.length} inputs · en programa: ${j.inputs.find((i: any) => i.number === j.active)?.title ?? j.active}` : `⚠ ${j.error}`);
  }

  async function upload(raceId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("race", raceId);
    const res = await fetch(`/api/trail/events/${id}/gpx`, { method: "POST", body: fd });
    const j = await res.json();
    setMsg(res.ok ? `GPX carregat: ${j.km} km, +${j.gain} m` : `⚠ ${j.error}`);
    refetch();
  }

  async function removeGpx(raceId: string) {
    await fetch(`/api/trail/events/${id}/gpx?race=${raceId}`, { method: "DELETE" });
    refetch();
  }

  async function del() {
    if (!confirm(`Segur que vols esborrar l'esdeveniment «${ev.name}»? Es perden atletes, GPX i configuració.`)) return;
    await fetch(`/api/trail/events/${id}`, { method: "DELETE" });
    window.location.href = "/";
  }

  if (!ev) return <TrailNav eventId={id} />;

  return (
    <div>
      <TrailNav eventId={id} name={ev.name} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {msg && <p className="text-sm font-semibold text-sky-300">{msg}</p>}

        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="mb-3 text-xs font-bold tracking-widest text-slate-400">GENERAL</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="NOM DE L'ESDEVENIMENT">
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0b0f14] px-3 py-2" />
            </Field>
            <Field label="BANDERA DE LES ESCENES (fitxer a /flags)">
              <div className="flex items-center gap-3">
                <input value={flag} onChange={(e) => setFlag(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0b0f14] px-3 py-2 font-mono" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/flags/${flag}.svg`} alt="" className="h-8 w-12 rounded object-cover" onError={(e) => (e.currentTarget.style.opacity = "0.2")} />
              </div>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="mb-3 text-xs font-bold tracking-widest text-slate-400">LIVETRAIL</h2>
          <p className="text-sm text-slate-300">
            Tenant: <span className="font-mono">{ev.livetrail.tenant}</span>
          </p>
          <p className="mt-1 break-all text-xs text-slate-500">{ev.livetrail.url}</p>
          <p className="mt-2 text-xs text-slate-400">
            Última sincronització: {fmtDate(ev.livetrail.last_sync)} · inscrits: {fmtDate(ev.livetrail.last_registrants)}
          </p>
          {ev.livetrail.last_error && <p className="mt-1 text-xs font-semibold text-red-400">⚠ {ev.livetrail.last_error}</p>}
        </section>

        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="mb-1 text-xs font-bold tracking-widest text-slate-400">FONS DE LA PREVISUALITZACIÓ</h2>
          <p className="mb-3 text-xs text-slate-500">
            El que es veu darrere de les escenes a la consola de Broadcast (previsualització i programa). La sortida real per a vMix/OBS sempre és transparent.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(PREVIEW_BG_LABEL) as PreviewBgMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setPbg((b) => ({ ...b, mode: m }))}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${pbg.mode === m ? "border-sky-500/60 bg-sky-500/10" : "border-white/10 hover:bg-white/5"}`}
              >
                <span className="h-5 w-8 rounded border border-white/20" style={previewBgStyle({ mode: m, color: pbg.color })} />
                {PREVIEW_BG_LABEL[m]}
              </button>
            ))}
            {pbg.mode === "color" && (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="color" value={pbg.color} onChange={(e) => setPbg((b) => ({ ...b, color: e.target.value }))} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent" />
                <span className="font-mono text-xs text-slate-400">{pbg.color}</span>
                <button onClick={() => setPbg((b) => ({ ...b, color: GREEN }))} className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold hover:bg-white/20">
                  verd croma
                </button>
              </label>
            )}
          </div>
          <div className="mt-3 aspect-video w-72 overflow-hidden rounded-lg border border-white/10" style={previewBgStyle(pbg)}>
            <div className="m-3 inline-block rounded-md bg-[#0b0f14] px-3 py-1.5 text-sm font-black">Exemple d&apos;escena</div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="mb-1 text-xs font-bold tracking-widest text-slate-400">VELOCITAT DEL TICKER DE PASSOS</h2>
          <p className="mb-3 text-xs text-slate-500">Píxels per segon de la cinta (per defecte {DEFAULT_TICKER_SPEED}). Es desa amb «Desar» i s&apos;aplica a l&apos;antena en uns segons.</p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">lent</span>
            <input type="range" min={20} max={300} step={5} value={tspeed} onChange={(e) => setTspeed(parseInt(e.target.value, 10))} className="w-72" />
            <span className="text-xs text-slate-500">ràpid</span>
            <span className="w-20 font-mono text-sm font-bold">{tspeed} px/s</span>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="mb-1 text-xs font-bold tracking-widest text-slate-400">POSICIÓ DEL CRONÒMETRE</h2>
          <p className="mb-3 text-xs text-slate-500">
            Per defecte a dalt a la dreta. Tria la cantonada de referència i els marges X (des del costat) i Y (des de dalt/baix) en píxels sobre una pantalla de 1920×1080. Es desa amb «Desar».
          </p>
          <div className="flex flex-wrap items-start gap-6">
            <div className="relative aspect-video w-64 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#0b0f14]">
              {(["tl", "tr", "bl", "br"] as Corner[]).map((c) => (
                <button
                  key={c}
                  title={CORNER_LABEL[c]}
                  onClick={() => setLayout((l) => ({ ...l, chrono: { ...l.chrono, corner: c } }))}
                  className={`absolute h-[18%] w-[26%] rounded border text-[10px] font-bold ${c[0] === "t" ? "top-1" : "bottom-1"} ${c[1] === "l" ? "left-1" : "right-1"} ${
                    layout.chrono.corner === c ? "border-sky-400 bg-sky-500/40 text-white" : "border-white/15 bg-white/5 text-slate-500 hover:bg-white/10"
                  }`}
                >
                  {layout.chrono.corner === c ? "●" : ""}
                </button>
              ))}
              <div
                className="pointer-events-none absolute rounded-sm bg-amber-400/80"
                style={{
                  width: "18%",
                  height: "9%",
                  [layout.chrono.corner[0] === "t" ? "top" : "bottom"]: `${((layout.chrono.y ?? (layout.chrono.corner[0] === "t" ? 40 : 48)) / 1080) * 100}%`,
                  [layout.chrono.corner[1] === "l" ? "left" : "right"]: `${((layout.chrono.x ?? 48) / 1920) * 100}%`,
                }}
                title="Posició aproximada del cronòmetre"
              />
            </div>
            <div className="grid gap-3 text-sm">
              <label className="flex items-center gap-3">
                <span className="w-28 text-xs font-bold tracking-widest text-slate-400">X (px)</span>
                <input
                  type="number"
                  min={0}
                  max={1920}
                  value={layout.chrono.x ?? 48}
                  onChange={(e) => setLayout((l) => ({ ...l, chrono: { ...l.chrono, x: Math.max(0, Math.min(1920, parseInt(e.target.value || "0", 10))) } }))}
                  className="w-28 rounded-md border border-white/10 bg-[#0b0f14] px-2 py-1"
                />
                <span className="text-xs text-slate-500">des del costat {layout.chrono.corner[1] === "l" ? "esquerre" : "dret"}</span>
              </label>
              <label className="flex items-center gap-3">
                <span className="w-28 text-xs font-bold tracking-widest text-slate-400">Y (px)</span>
                <input
                  type="number"
                  min={0}
                  max={1080}
                  value={layout.chrono.y ?? (layout.chrono.corner[0] === "t" ? 40 : 48)}
                  onChange={(e) => setLayout((l) => ({ ...l, chrono: { ...l.chrono, y: Math.max(0, Math.min(1080, parseInt(e.target.value || "0", 10))) } }))}
                  className="w-28 rounded-md border border-white/10 bg-[#0b0f14] px-2 py-1"
                />
                <span className="text-xs text-slate-500">des de {layout.chrono.corner[0] === "t" ? "dalt" : "baix"}</span>
              </label>
              <label className="flex items-center gap-3">
                <span className="w-28 text-xs font-bold tracking-widest text-slate-400">MIDA</span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  step={5}
                  value={Math.round(layout.chrono.scale * 100)}
                  onChange={(e) => setLayout((l) => ({ ...l, chrono: { ...l.chrono, scale: parseInt(e.target.value, 10) / 100 } }))}
                  className="w-40"
                />
                <span className="w-12 font-mono text-slate-300">{Math.round(layout.chrono.scale * 100)}%</span>
              </label>
              <button onClick={() => setLayout((l) => ({ ...l, chrono: { ...DEFAULT_LAYOUT.chrono } }))} className="w-fit rounded-md bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/20">
                Restableix (dalt a la dreta)
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="mb-1 text-xs font-bold tracking-widest text-slate-400">vMIX (MOTXILLA AUTOMÀTICA)</h2>
          <p className="mb-3 text-xs text-slate-500">
            El servidor llegeix quin input té vMix en programa i els dials de velocitat i de pendent amb «Automàtic» segueixen aquella motxilla (el chyron i la fitxa de corredor es trien sempre a mà).
            Les entrades que no són una motxilla (anuncis, càmeres…) simplement no mostren res.
          </p>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Field label="IP DE vMIX">
              <input value={vip} onChange={(e) => setVip(e.target.value)} placeholder="192.168.100.20" className="w-48 rounded-lg border border-white/10 bg-[#0b0f14] px-3 py-2 font-mono" />
            </Field>
            <Field label="PORT TCP">
              <input value={vport} onChange={(e) => setVport(e.target.value)} className="w-24 rounded-lg border border-white/10 bg-[#0b0f14] px-3 py-2 font-mono" />
            </Field>
            <button onClick={testVmix} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold hover:bg-white/10">
              Provar connexió
            </button>
            {vtest && <span className="text-xs font-semibold text-sky-300">{vtest}</span>}
          </div>
          <div className="mb-3 rounded-lg bg-white/[0.03] p-3 text-sm">
            <span className={vstat?.connected ? "font-bold text-emerald-400" : "font-bold text-slate-500"}>{vstat?.connected ? "● Connectat" : vstat?.configured ? "○ Sense connexió" : "○ Sense configurar (desa-ho primer)"}</span>
            {vstat?.connected && (
              <span className="ml-3 text-slate-300">
                En programa: <b>{vstat.active_title ?? vstat.active_input}</b>
                {vstat.device_id ? (
                  <>
                    {" "}→ motxilla <b>{vstat.device_label}</b>
                    {vstat.runner_name ? ` · ${vstat.runner_name} (#${vstat.bib})` : vstat.bib ? ` · #${vstat.bib}` : ""}
                  </>
                ) : (
                  <span className="text-slate-500"> → no és cap motxilla</span>
                )}
              </span>
            )}
            {vstat?.error && <span className="ml-3 text-xs text-red-400">⚠ {vstat.error}</span>}
          </div>
          <div className="text-[10px] font-bold tracking-widest text-slate-500">
            MAPA MOTXILLA → INPUT DE vMIX (opcional: si el títol de l&apos;input conté el nom de la motxilla, p. ex. «BBX 03», es reconeix sol)
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {Array.from(new Set([...KNOWN_DEVICE_IDS, ...(Array.isArray(gps) ? gps.map((d) => d.id) : []), ...Object.keys(ev.devices ?? {}), ...Object.keys(vmap)])).map((did) => {
              const g = Array.isArray(gps) ? gps.find((d) => d.id === did) : undefined;
              const inputs = vstat?.inputs ?? [];
              const cur = vmap[did] ?? "";
              const live = vstat?.device_id === did;
              return (
                <div key={did} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${live ? "bg-red-500/10 ring-1 ring-red-500/40" : "bg-white/[0.03]"}`}>
                  <span className={`h-2 w-2 rounded-full ${g?.status === "online" ? "bg-emerald-400" : "bg-slate-600"}`} title={g?.status === "online" ? "en línia" : "sense senyal"} />
                  <span className="w-16 font-bold">{g?.label ?? defaultLabel(did)}</span>
                  <span className="truncate font-mono text-xs text-slate-500">{did}</span>
                  {live && <span className="rounded bg-red-600 px-1.5 text-[9px] font-black tracking-widest">EN PROGRAMA</span>}
                  {inputs.length > 0 ? (
                    <select
                      value={cur}
                      onChange={(e) => setVmap((m) => ({ ...m, [did]: e.target.value }))}
                      className="ml-auto max-w-[190px] rounded-md border border-white/10 bg-[#0b0f14] px-2 py-1 text-sm"
                    >
                      <option value="">— auto (pel títol) —</option>
                      {inputs.map((i) => (
                        <option key={i.number} value={String(i.number)}>
                          {i.number} · {i.title}
                        </option>
                      ))}
                      {cur && !inputs.some((i) => String(i.number) === cur) && <option value={cur}>{cur} (no existeix)</option>}
                    </select>
                  ) : (
                    <input value={cur} onChange={(e) => setVmap((m) => ({ ...m, [did]: e.target.value }))} placeholder="n.º input" className="ml-auto w-24 rounded-md border border-white/10 bg-[#0b0f14] px-2 py-1 text-center text-sm" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Després de posar IP i port, prem «Desar» i, un cop connectat, cada motxilla es pot lligar a un input triant-lo de la llista. L&apos;input en programa ara mateix es marca en vermell.
          </p>
          {vstat && vstat.inputs.length > 0 && (
            <details className="mt-3 text-xs text-slate-400">
              <summary className="cursor-pointer font-semibold">Inputs de vMix ({vstat.inputs.length})</summary>
              <div className="mt-2 grid gap-1 md:grid-cols-3">
                {vstat.inputs.map((i) => (
                  <div key={i.number}>
                    <span className="font-mono text-slate-500">{i.number}</span> {i.title}
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="mb-3 text-xs font-bold tracking-widest text-slate-400">CURSES, COLORS I GPX</h2>
          <div className="space-y-3">
            {ev.races.map((r: any) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                <input
                  type="color"
                  value={colors[r.id] ?? r.color}
                  onChange={(e) => setColors((c) => ({ ...c, [r.id]: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
                />
                <div className="mr-auto">
                  <div className="font-bold">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    {r.id} · {r.distance_m ? (r.distance_m / 1000).toFixed(1) : "?"} km · +{r.elevation_gain ?? "?"} m · {r.checkpoints.length} controls
                  </div>
                </div>
                {r.gpx ? (
                  <>
                    <span className="text-xs font-semibold text-emerald-400">
                      GPX ✓ {r.gpx.file_name} · {r.gpx.total_km} km · +{r.gpx.elevation_gain} m
                    </span>
                    <button onClick={() => removeGpx(r.id)} className="text-xs text-slate-500 hover:text-red-400">
                      treure
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer rounded-md bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20">
                    Pujar GPX
                    <input type="file" accept=".gpx" hidden onChange={(e) => e.target.files?.[0] && upload(r.id, e.target.files[0])} />
                  </label>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button onClick={save} className="rounded-lg bg-sky-500 px-6 py-2.5 font-bold text-black hover:bg-sky-400">
            Desar
          </button>
          <button onClick={del} className="ml-auto rounded-lg border border-red-500/40 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10">
            Esborrar esdeveniment
          </button>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold tracking-widest text-slate-400">
      {label}
      <div className="mt-1 font-normal tracking-normal text-white">{children}</div>
    </label>
  );
}
