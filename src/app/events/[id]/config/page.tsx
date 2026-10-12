"use client";
import { useEffect, useState } from "react";
import TrailNav from "@/components/trail/TrailNav";
import { useLive } from "@/lib/client/useLive";
import { fmtDate } from "@/lib/client/format";

export default function ConfigPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: ev, refetch } = useLive<any>(`/api/trail/events/${id}`, ["trail:changed"], 10000);
  const [name, setName] = useState("");
  const [flag, setFlag] = useState("es-ct");
  const [colors, setColors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ev) return;
    setName((n) => n || ev.name);
    setFlag((f) => (ev.flag ? ev.flag : f));
    setColors((c) => (Object.keys(c).length ? c : Object.fromEntries(ev.races.map((r: any) => [r.id, r.color]))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev?.id]);

  async function save() {
    const res = await fetch(`/api/trail/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, flag, races: Object.entries(colors).map(([rid, color]) => ({ id: rid, color })) }),
    });
    setMsg(res.ok ? "Desat ✓" : "⚠ Error en desar");
    refetch();
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
