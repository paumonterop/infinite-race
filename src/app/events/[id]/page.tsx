"use client";
import { useState } from "react";
import TrailNav from "@/components/trail/TrailNav";
import { useLive } from "@/lib/client/useLive";
import { fmtClock, fmtDate, fmtTime } from "@/lib/client/format";

export default function DashboardPage({ params }: { params: { id: string } }) {
  const { data: ev, refetch } = useLive<any>(`/api/trail/events/${params.id}`, ["trail:changed"], 5000);
  const { data: feed } = useLive<{ items: any[] }>(
    `/api/trail/events/${params.id}/feed?backlog=14`,
    ["trail:feed"],
    4000
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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

  if (!ev) return <TrailNav eventId={params.id} />;
  const recent = [...(feed?.items ?? [])].reverse();

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

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {ev.races.map((r: any) => {
            const c = (s: string) => r.runners.filter((x: any) => x.status === s).length;
            const top = r.runners.filter((x: any) => x.rank).sort((a: any, b: any) => a.rank - b.rank).slice(0, 3);
            return (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
                  <h2 className="font-black">{r.name}</h2>
                  <span className="ml-auto rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-widest">{r.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Sortida {fmtDate(r.start_iso)} · {r.distance_m ? (r.distance_m / 1000).toFixed(1) : "?"} km · +{r.elevation_gain ?? "?"} m
                  {!r.gpx && <span className="ml-2 font-semibold text-amber-400">sense GPX</span>}
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <Stat label="INSCRITS" value={r.runners.length} />
                  <Stat label="EN CURSA" value={c("RUNNING")} color="text-emerald-400" />
                  <Stat label="ARRIBATS" value={c("FINISHED")} color="text-sky-400" />
                  <Stat label="RETIRATS" value={c("DNF")} color="text-red-400" />
                </div>
                <div className="mt-3 space-y-1">
                  <div className="text-[10px] font-bold tracking-widest text-slate-500">LÍDERS</div>
                  {top.length === 0 && <p className="text-sm text-slate-500">Sense dades encara</p>}
                  {top.map((x: any) => (
                    <div key={x.bib} className="flex items-center gap-2 text-sm">
                      <span className="mono-num w-5 font-black text-slate-400">{x.rank}</span>
                      <span className="font-mono text-slate-400">#{x.bib}</span>
                      <span className="truncate font-semibold">
                        {x.first_name} {x.last_name}
                      </span>
                      <span className="mono-num ml-auto text-slate-300">{fmtTime(x.race_time_s)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <h2 className="text-xs font-bold tracking-widest text-slate-400">ÚLTIMS PASSOS PER CONTROL</h2>
            <a href={`/events/${params.id}/broadcast`} className="text-xs font-bold text-sky-400 hover:underline">
              Obrir broadcast →
            </a>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-6 text-center text-slate-500">Encara no hi ha cap pas. Apareixeran aquí en directe durant la cursa.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {recent.map((it) => (
                  <tr key={it.seq} className="border-t border-white/5">
                    <td className="px-4 py-2">
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: it.color }} />
                      <span className="text-slate-400">{it.race_name}</span>
                    </td>
                    <td className="px-4 py-2 font-mono">#{it.bib}</td>
                    <td className="px-4 py-2 font-semibold">{it.name}</td>
                    <td className="px-4 py-2">
                      {it.is_finish ? "🏁 " : ""}
                      {it.point_name} <span className="text-slate-500">km {it.point_km}</span>
                    </td>
                    <td className="mono-num px-4 py-2">{fmtTime(it.race_time_s)}</td>
                    <td className="mono-num px-4 py-2 text-slate-400">{it.pos}º</td>
                    <td className="mono-num px-4 py-2 text-right text-slate-500">{fmtClock(it.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, color = "text-white" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg bg-white/5 py-2">
      <div className={`mono-num text-xl font-black ${color}`}>{value}</div>
      <div className="text-[9px] font-bold tracking-widest text-slate-500">{label}</div>
    </div>
  );
}
