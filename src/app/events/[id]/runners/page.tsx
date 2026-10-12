"use client";
import { Fragment, useMemo, useState } from "react";
import TrailNav from "@/components/trail/TrailNav";
import { useLive } from "@/lib/client/useLive";
import { fmtClock, fmtTime, STATUS_COLOR, STATUS_LABEL } from "@/lib/client/format";

export default function RunnersPage({ params }: { params: { id: string } }) {
  const { data: ev } = useLive<any>(`/api/trail/events/${params.id}`, ["trail:changed"], 15000);
  const [raceId, setRaceId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sex, setSex] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const rid = raceId ?? ev?.races[0]?.id ?? "";
  const { data } = useLive<any>(`/api/trail/events/${params.id}/runners?race=${rid}`, ["trail:changed"], 5000);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.runners ?? [])
      .filter((r: any) => (!sex || r.sex === sex) && (!status || r.status === status))
      .filter((r: any) => !s || `${r.bib} ${r.first_name} ${r.last_name} ${r.club} ${r.category}`.toLowerCase().includes(s))
      .sort((a: any, b: any) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || Number(a.bib) - Number(b.bib));
  }, [data, q, sex, status]);

  return (
    <div>
      <TrailNav eventId={params.id} name={ev?.name} />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {ev?.races.map((r: any) => (
            <button
              key={r.id}
              onClick={() => setRaceId(r.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-bold ${
                rid === r.id ? "border-sky-500/60 bg-sky-500/10" : "border-white/10 hover:bg-white/5"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
              {r.name}
              <span className="text-xs font-normal text-slate-500">{r.runners.length}</span>
            </button>
          ))}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per dorsal, nom, club, categoria…"
            className="ml-auto w-80 rounded-lg border border-white/10 bg-[#0b0f14] px-3 py-1.5 text-sm"
          />
          <select value={sex} onChange={(e) => setSex(e.target.value)} className="rounded-lg border border-white/10 bg-[#0b0f14] px-2 py-1.5 text-sm">
            <option value="">Tots els sexes</option>
            <option value="M">Homes</option>
            <option value="F">Dones</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-white/10 bg-[#0b0f14] px-2 py-1.5 text-sm">
            <option value="">Tots els estats</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-white/10">
          <div className="border-b border-white/10 px-5 py-2 text-xs text-slate-500">{list.length} atletes</div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0b0f14] text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">POS</th>
                  <th className="px-4 py-2">DORSAL</th>
                  <th className="px-4 py-2">ATLETA</th>
                  <th className="px-4 py-2">SEXE</th>
                  <th className="px-4 py-2">CAT.</th>
                  <th className="px-4 py-2">CLUB</th>
                  <th className="px-4 py-2">ÚLTIM CONTROL</th>
                  <th className="px-4 py-2">TEMPS</th>
                  <th className="px-4 py-2">ESTAT</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      Sense atletes. Quan LiveTrail publiqui la llista, importa-la des del Dashboard.
                    </td>
                  </tr>
                )}
                {list.map((r: any) => (
                  <Fragment key={r.bib}>
                    <tr onClick={() => setOpen(open === r.bib ? null : r.bib)} className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]">
                      <td className="mono-num px-4 py-2">{r.rank ?? "—"}</td>
                      <td className="px-4 py-2 font-mono">{r.bib}</td>
                      <td className="px-4 py-2 font-semibold">
                        {r.first_name} {r.last_name}
                      </td>
                      <td className="px-4 py-2">{r.sex === "F" ? "D" : r.sex === "M" ? "H" : ""}</td>
                      <td className="px-4 py-2 text-slate-400">{r.category}</td>
                      <td className="px-4 py-2 text-slate-400">{r.club}</td>
                      <td className="px-4 py-2">{r.last_point_name ? `${r.last_point_name} (${r.last_point_km} km)` : "—"}</td>
                      <td className="mono-num px-4 py-2">{fmtTime(r.race_time_s)}</td>
                      <td className={`px-4 py-2 font-semibold ${STATUS_COLOR[r.status] ?? ""}`}>{STATUS_LABEL[r.status] ?? r.status}</td>
                    </tr>
                    {open === r.bib && (
                      <tr className="bg-white/[0.02]">
                        <td colSpan={9} className="px-6 py-3">
                          {r.passings.length === 0 ? (
                            <span className="text-slate-500">Sense passos encara.</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {r.passings.map((p: any) => {
                                const cp = data.checkpoints.find((c: any) => c.id === p.point_id);
                                return (
                                  <div key={p.point_id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                                    <div className="font-bold">{cp?.name ?? p.point_id}</div>
                                    <div className="mono-num text-slate-300">
                                      {fmtTime(p.seconds)} · <span className="text-slate-500">{fmtClock(p.at)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
