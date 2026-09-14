"use client";
import { useState } from "react";
import Nav from "@/components/Nav";
import StatusBadge from "@/components/StatusBadge";
import { useLive } from "@/lib/client/useLive";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"GENERAL" | "M" | "F">("GENERAL");
  const url = tab === "GENERAL" ? "/api/leaderboard" : `/api/leaderboard?gender=${tab}`;
  const { data: list } = useLive<any[]>(url, ["runners:changed"], 3000);

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-4 text-xl font-black">Classificacions</h1>
        <div className="mb-4 flex gap-2">
          {(["GENERAL", "M", "F"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 font-bold ${
                tab === t ? "bg-sky-500 text-black" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {t === "GENERAL" ? "GENERAL" : t === "M" ? "MASCULINA" : "FEMENINA"}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">DORSAL</th>
                <th className="px-4 py-3">NOM</th>
                <th className="px-4 py-3">VOLTES</th>
                <th className="px-4 py-3">KM</th>
                <th className="px-4 py-3">ESTAT</th>
              </tr>
            </thead>
            <tbody>
              {(list ?? []).map((r, i) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-4 py-2 font-black text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2 font-mono">{r.bib}</td>
                  <td className="px-4 py-2 font-semibold">
                    {r.first_name} {r.last_name}
                  </td>
                  <td className="px-4 py-2 mono-num font-bold">{r.laps_completed}</td>
                  <td className="px-4 py-2 mono-num">{r.total_km}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
