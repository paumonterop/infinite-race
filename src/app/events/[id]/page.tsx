"use client";
import { useMemo, useState } from "react";
import TrailNav from "@/components/trail/TrailNav";
import { useLive } from "@/lib/client/useLive";

function fmtTime(s: number | null) {
  if (s == null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ca-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABEL: Record<string, string> = {
  REGISTERED: "Inscrit",
  RUNNING: "En cursa",
  FINISHED: "Arribat",
  DNF: "Retirat",
  DNS: "No sortit",
};

export default function EventPage({ params }: { params: { id: string } }) {
  const { data: ev, refetch } = useLive<any>(`/api/trail/events/${params.id}`, ["trail:changed"], 5000);
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const race = useMemo(() => {
    if (!ev) return null;
    return ev.races.find((r: any) => r.id === sel) ?? ev.races[0] ?? null;
  }, [ev, sel]);

  const runners = useMemo(() => {
    if (!race) return [];
    const s = q.trim().toLowerCase();
    return race.runners
      .filter((r: any) => !s || `${r.bib} ${r.first_name} ${r.last_name} ${r.club}`.toLowerCase().includes(s))
      .sort((a: any, b: any) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || Number(a.bib) - Number(b.bib));
  }, [race, q]);

  async function sync(registrants: boolean) {
    setBusy(registrants ? "reg" : "sync");
    setMsg(null);
    const res = await fetch(`/api/trail/events/${params.id}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrants }),
    });
    const j = await res.json();
    setBusy(null);
    setMsg(j.error ? `⚠ ${j.error}` : registrants ? `Inscrits importats: ${j.registrants}` : "Sincronitzat ✓");
    refetch();
  }

  async function upload(raceId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("race", raceId);
    const res = await fetch(`/api/trail/events/${params.id}/gpx`, { method: "POST", body: fd });
    const j = await res.json();
    setMsg(res.ok ? `GPX carregat: ${j.km} km, +${j.gain} m` : `⚠ ${j.error}`);
    refetch();
  }

  async function removeGpx(raceId: string) {
    await fetch(`/api/trail/events/${params.id}/gpx?race=${raceId}`, { method: "DELETE" });
    refetch();
  }

  if (!ev) return <TrailNav eventId={params.id} />;

  return (
    <div>
      <TrailNav eventId={params.id} name={ev.name} />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#101823] to-[#0b0f14] p-5">
          <div className="mr-auto">
            <h1 className="text-2xl font-black tracking-tight">{ev.name}</h1>
            <p className="text-xs text-slate-400">
              LiveTrail: <span className="font-mono">{ev.livetrail.tenant}</span> · última sincronització {fmtDate(ev.livetrail.last_sync)}
              {ev.livetrail.last_registrants && <> · inscrits {fmtDate(ev.livetrail.last_registrants)}</>}
            </p>
            {ev.livetrail.last_error && <p className="mt-1 text-xs font-semibold text-red-400">⚠ {ev.livetrail.last_error}</p>}
            {msg && <p className="mt-1 text-xs font-semibold text-sky-300">{msg}</p>}
          </div>
          <button
            onClick={() => sync(false)}
            disabled={!!busy}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-black hover:bg-sky-400 disabled:opacity-50"
          >
            {busy === "sync" ? "Sincronitzant…" : "↻ Sincronitzar ara"}
          </button>
          <button
            onClick={() => sync(true)}
            disabled={!!busy}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-50"
          >
            {busy === "reg" ? "Important (pot trigar)…" : "⇩ Importar inscrits"}
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {ev.races.map((r: any) => {
            const running = r.runners.filter((x: any) => x.status === "RUNNING").length;
            const fin = r.runners.filter((x: any) => x.status === "FINISHED").length;
            return (
              <div
                key={r.id}
                onClick={() => setSel(r.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  race?.id === r.id ? "border-sky-500/60 bg-sky-500/5" : "border-white/10 bg-white/[0.02] hover:border-white/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
                  <h2 className="font-black">{r.name}</h2>
                  <span className="ml-auto rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-widest">{r.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Sortida {fmtDate(r.start_iso)} · {r.distance_m ? (r.distance_m / 1000).toFixed(1) : "?"} km · +{r.elevation_gain ?? "?"} m
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Stat label="INSCRITS" value={r.runners.length} />
                  <Stat label="EN CURSA" value={running} />
                  <Stat label="ARRIBATS" value={fin} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                  {r.gpx ? (
                    <>
                      <span className="font-semibold text-emerald-400">
                        GPX ✓ {r.gpx.total_km} km · +{r.gpx.elevation_gain} m
                      </span>
                      <button onClick={() => removeGpx(r.id)} className="ml-auto text-slate-500 hover:text-red-400">
                        treure
                      </button>
                    </>
                  ) : (
                    <label className="cursor-pointer rounded-md bg-white/10 px-3 py-1.5 font-bold hover:bg-white/20">
                      Pujar GPX
                      <input type="file" accept=".gpx" hidden onChange={(e) => e.target.files?.[0] && upload(r.id, e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {race && (
          <div className="rounded-2xl border border-white/10">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
              <h2 className="text-xs font-bold tracking-widest text-slate-400">ATLETES — {race.name.toUpperCase()}</h2>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca per dorsal, nom o club…"
                className="ml-auto w-72 rounded-lg border border-white/10 bg-[#0b0f14] px-3 py-1.5 text-sm"
              />
            </div>
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0b0f14] text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2">POS</th>
                    <th className="px-4 py-2">DORSAL</th>
                    <th className="px-4 py-2">ATLETA</th>
                    <th className="px-4 py-2">CAT.</th>
                    <th className="px-4 py-2">CLUB</th>
                    <th className="px-4 py-2">ÚLTIM CONTROL</th>
                    <th className="px-4 py-2">TEMPS</th>
                    <th className="px-4 py-2">ESTAT</th>
                  </tr>
                </thead>
                <tbody>
                  {runners.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                        Sense atletes. Quan LiveTrail publiqui la llista, prem «Importar inscrits».
                      </td>
                    </tr>
                  )}
                  {runners.map((r: any) => (
                    <tr key={r.bib} className="border-t border-white/5 hover:bg-white/[0.03]">
                      <td className="mono-num px-4 py-2">{r.rank ?? "—"}</td>
                      <td className="px-4 py-2 font-mono">{r.bib}</td>
                      <td className="px-4 py-2 font-semibold">
                        {r.first_name} {r.last_name}
                      </td>
                      <td className="px-4 py-2 text-slate-400">{r.category}</td>
                      <td className="px-4 py-2 text-slate-400">{r.club}</td>
                      <td className="px-4 py-2">
                        {r.last_point_name ? `${r.last_point_name} (${r.last_point_km} km)` : "—"}
                      </td>
                      <td className="mono-num px-4 py-2">{fmtTime(r.race_time_s)}</td>
                      <td className="px-4 py-2 text-slate-300">{STATUS_LABEL[r.status] ?? r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/5 py-2">
      <div className="mono-num text-xl font-black">{value}</div>
      <div className="text-[9px] font-bold tracking-widest text-slate-500">{label}</div>
    </div>
  );
}
