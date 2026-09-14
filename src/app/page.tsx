"use client";
import { useState } from "react";
import Nav from "@/components/Nav";
import LapClock from "@/components/LapClock";
import StatusBadge from "@/components/StatusBadge";
import ConfirmButton from "@/components/ConfirmButton";
import { useLive } from "@/lib/client/useLive";

async function post(url: string, body?: any) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export default function DashboardPage() {
  const { data: race } = useLive<any>("/api/race", ["race:changed", "state:update"], 3000);
  const { data: stats } = useLive<any>("/api/stats", ["race:changed", "runners:changed"], 3000);
  const { data: runners } = useLive<any[]>("/api/runners", ["runners:changed"], 3000);
  const [seeding, setSeeding] = useState(false);

  const currentLapRunners = (runners ?? []).filter(
    (r) => r.status === "ACTIVE" || r.status === "LAP_COMPLETED"
  );

  const noRunners = (runners ?? []).length === 0;

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="mb-6 grid items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#101823] to-[#0b0f14] p-6 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{race?.name ?? "INFINITE RACE"}</h1>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={race?.status ?? "SETUP"} />
              <span className="text-xs text-slate-400">
                Durada de volta: {race ? Math.round(race.lap_duration_seconds / 60) : "--"} min
              </span>
            </div>
          </div>

          <LapClock race={race} size="xl" />

          <div className="flex flex-wrap justify-end gap-2">
            {(!race || race.status === "SETUP" || race.status === "READY") && (
              <button
                onClick={() => post("/api/race/start")}
                disabled={noRunners}
                className="rounded-lg bg-emerald-500 px-5 py-3 font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
                title={noRunners ? "Importa o afegeix corredors primer" : ""}
              >
                ▶ START
              </button>
            )}
            {race?.status === "RUNNING" && (
              <button
                onClick={() => post("/api/race/pause")}
                className="rounded-lg bg-amber-500 px-5 py-3 font-bold text-black hover:bg-amber-400"
              >
                ⏸ PAUSE
              </button>
            )}
            {race?.status === "PAUSED" && (
              <button
                onClick={() => post("/api/race/resume")}
                className="rounded-lg bg-emerald-500 px-5 py-3 font-bold text-black hover:bg-emerald-400"
              >
                ▶ RESUME
              </button>
            )}
            {(race?.status === "RUNNING" || race?.status === "PAUSED") && (
              <button
                onClick={() => post("/api/race/next-lap")}
                className="rounded-lg bg-sky-500 px-5 py-3 font-bold text-black hover:bg-sky-400"
              >
                ⏭ NEXT LAP
              </button>
            )}
            {(race?.status === "RUNNING" || race?.status === "PAUSED") && (
              <ConfirmButton
                onConfirm={() => post("/api/race/end")}
                className="rounded-lg bg-purple-600 px-5 py-3 font-bold text-white hover:bg-purple-500"
              >
                ⏹ END RACE
              </ConfirmButton>
            )}
            <ConfirmButton
              onConfirm={() => post("/api/race/reset")}
              className="rounded-lg border border-white/20 px-5 py-3 font-bold text-slate-300 hover:bg-white/10"
            >
              ⟲ RESET
            </ConfirmButton>
          </div>
        </div>

        {noRunners && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-4">
            <div>
              <p className="font-semibold text-sky-300">Encara no hi ha corredors carregats.</p>
              <p className="text-sm text-slate-400">
                Importa el teu Excel a la secció "Importar", o prova el sistema amb dades de demostració.
              </p>
            </div>
            <button
              disabled={seeding}
              onClick={async () => {
                setSeeding(true);
                await post("/api/demo/seed");
                setSeeding(false);
              }}
              className="rounded-lg bg-sky-500 px-4 py-2 font-bold text-black hover:bg-sky-400 disabled:opacity-50"
            >
              {seeding ? "Carregant..." : "Carregar 10H + 10D demo"}
            </button>
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <StatCard label="ACTIUS" value={stats?.active ?? "-"} color="text-emerald-400" />
          <StatCard label="HOMES" value={stats?.men ?? "-"} color="text-sky-400" />
          <StatCard label="DONES" value={stats?.women ?? "-"} color="text-pink-400" />
          <StatCard label="ELIMINATS" value={stats?.eliminated ?? "-"} color="text-red-400" />
          <StatCard label="RETIRATS" value={stats?.retired ?? "-"} color="text-amber-400" />
          <StatCard label="VOLTA ACTUAL" value={stats?.currentLap ?? "-"} color="text-white" />
          <StatCard label="TOTAL VOLTES" value={stats?.totalLaps ?? "-"} color="text-white" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <h2 className="mb-3 text-xs font-bold tracking-widest text-amber-400">LÍDER GENERAL</h2>
            {stats?.leaderMale || stats?.leaderFemale ? (
              (() => {
                const overall = [stats?.leaderMale, stats?.leaderFemale]
                  .filter(Boolean)
                  .sort((a: any, b: any) => b.laps_completed - a.laps_completed)[0];
                return overall ? (
                  <div>
                    <div className="text-3xl font-black">#{overall.bib}</div>
                    <div className="text-lg font-bold">
                      {overall.first_name} {overall.last_name}
                    </div>
                    <div className="text-sm text-slate-400">{overall.laps_completed} VOLTES</div>
                  </div>
                ) : (
                  <p className="text-slate-500">Sense dades encara</p>
                );
              })()
            ) : (
              <p className="text-slate-500">Sense dades encara</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-widest text-slate-400">
                VOLTA ACTUAL — PENDENTS DE COMPLETAR
              </h2>
              <a href="/control" className="text-xs font-bold text-sky-400 hover:underline">
                Obrir pantalla de control →
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentLapRunners.filter((r) => r.status === "ACTIVE").length === 0 && (
                <p className="text-slate-500">Tothom ha completat la volta actual ✓</p>
              )}
              {currentLapRunners
                .filter((r) => r.status === "ACTIVE")
                .map((r) => (
                  <span
                    key={r.id}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold"
                  >
                    #{r.bib} {r.first_name}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <h2 className="text-xs font-bold tracking-widest text-slate-400">CORREDORS</h2>
            <a href="/runners" className="text-xs font-bold text-sky-400 hover:underline">
              Gestió completa →
            </a>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0b0f14] text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">DORSAL</th>
                  <th className="px-4 py-2">CORREDOR</th>
                  <th className="px-4 py-2">SEXE</th>
                  <th className="px-4 py-2">VOLTES</th>
                  <th className="px-4 py-2">ESTAT</th>
                  <th className="px-4 py-2 text-right">ACCIÓ</th>
                </tr>
              </thead>
              <tbody>
                {(runners ?? [])
                  .slice()
                  .sort((a, b) => b.laps_completed - a.laps_completed)
                  .map((r) => (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                      <td className="px-4 py-2 font-mono">{r.bib}</td>
                      <td className="px-4 py-2 font-semibold">
                        {r.first_name} {r.last_name}
                      </td>
                      <td className="px-4 py-2">{r.gender === "F" ? "D" : "H"}</td>
                      <td className="px-4 py-2 mono-num">{r.laps_completed}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        {r.status === "ACTIVE" && race?.status === "RUNNING" && (
                          <button
                            onClick={() => post(`/api/runners/${r.id}/lap`)}
                            className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-bold text-black hover:bg-emerald-400"
                          >
                            +1 VOLTA
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
      <div className={`mono-num text-3xl font-black ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] font-bold tracking-widest text-slate-500">{label}</div>
    </div>
  );
}
