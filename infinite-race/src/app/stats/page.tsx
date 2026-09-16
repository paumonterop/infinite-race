"use client";
import Nav from "@/components/Nav";
import { useLive } from "@/lib/client/useLive";

export default function StatsPage() {
  const { data: stats } = useLive<any>("/api/stats", ["runners:changed", "race:changed"], 3000);

  if (!stats) {
    return (
      <div>
        <Nav />
        <main className="p-6 text-slate-500">Carregant...</main>
      </div>
    );
  }

  const maxActive = Math.max(1, ...(stats.activeByLap ?? []).map((r: any) => r.active_count));
  const maxElim = Math.max(1, ...(stats.eliminationsByLap ?? []).map((r: any) => r.count));

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-xl font-black">Estadístiques</h1>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="PARTICIPANTS" value={stats.totalParticipants} />
          <Stat label="HOMES" value={stats.men} />
          <Stat label="DONES" value={stats.women} />
          <Stat label="ACTIUS" value={stats.active} color="text-emerald-400" />
          <Stat label="ELIMINATS" value={stats.eliminated} color="text-red-400" />
          <Stat label="RETIRATS" value={stats.retired} color="text-amber-400" />
          <Stat label="DESQUALIFICATS" value={stats.disqualified} color="text-purple-400" />
          <Stat label="NO PRESENTATS" value={stats.notPresented} color="text-zinc-400" />
          <Stat label="VOLTA ACTUAL" value={stats.currentLap} />
          <Stat label="TOTAL VOLTES" value={stats.totalLaps} />
          <Stat label="KM TOTALS" value={stats.totalKm} />
          <Stat label="DESNIVELL (m)" value={stats.totalElevation} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 p-5">
            <h2 className="mb-2 text-xs font-bold tracking-widest text-slate-400">MILLOR VOLTA</h2>
            {stats.bestLap ? (
              <p>
                <span className="font-black text-emerald-400">
                  #{stats.bestLap.bib} {stats.bestLap.first_name} {stats.bestLap.last_name}
                </span>{" "}
                — volta {stats.bestLap.lap_number} en{" "}
                {Math.floor(stats.bestLap.lap_time_seconds / 60)}m{stats.bestLap.lap_time_seconds % 60}s
              </p>
            ) : (
              <p className="text-slate-500">Encara sense dades</p>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 p-5">
            <h2 className="mb-2 text-xs font-bold tracking-widest text-slate-400">MÉS VOLTES</h2>
            {stats.mostLaps ? (
              <p>
                <span className="font-black text-sky-400">
                  #{stats.mostLaps.bib} {stats.mostLaps.first_name} {stats.mostLaps.last_name}
                </span>{" "}
                — {stats.mostLaps.laps_completed} voltes
              </p>
            ) : (
              <p className="text-slate-500">Encara sense dades</p>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 p-5">
            <h2 className="mb-2 text-xs font-bold tracking-widest text-slate-400">LÍDER MASCULÍ</h2>
            {stats.leaderMale ? (
              <p className="font-black text-sky-400">
                #{stats.leaderMale.bib} {stats.leaderMale.first_name} {stats.leaderMale.last_name} —{" "}
                {stats.leaderMale.laps_completed} voltes
              </p>
            ) : (
              <p className="text-slate-500">—</p>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 p-5">
            <h2 className="mb-2 text-xs font-bold tracking-widest text-slate-400">LÍDER FEMENINA</h2>
            {stats.leaderFemale ? (
              <p className="font-black text-pink-400">
                #{stats.leaderFemale.bib} {stats.leaderFemale.first_name} {stats.leaderFemale.last_name} —{" "}
                {stats.leaderFemale.laps_completed} voltes
              </p>
            ) : (
              <p className="text-slate-500">—</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 p-5">
            <h2 className="mb-4 text-xs font-bold tracking-widest text-slate-400">
              PARTICIPANTS ACTIUS PER VOLTA
            </h2>
            <div className="flex h-40 items-end gap-1">
              {(stats.activeByLap ?? []).map((row: any) => (
                <div key={row.lap_number} className="flex-1 text-center">
                  <div
                    className="mx-auto w-full rounded-t bg-emerald-500"
                    style={{ height: `${(row.active_count / maxActive) * 140}px` }}
                    title={`Volta ${row.lap_number}: ${row.active_count}`}
                  />
                  <span className="text-[9px] text-slate-500">{row.lap_number}</span>
                </div>
              ))}
              {(!stats.activeByLap || stats.activeByLap.length === 0) && (
                <p className="text-slate-500">Sense dades</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 p-5">
            <h2 className="mb-4 text-xs font-bold tracking-widest text-slate-400">ELIMINACIONS PER VOLTA</h2>
            <div className="flex h-40 items-end gap-1">
              {(stats.eliminationsByLap ?? []).map((row: any) => (
                <div key={row.lap_number} className="flex-1 text-center">
                  <div
                    className="mx-auto w-full rounded-t bg-red-500"
                    style={{ height: `${(row.count / maxElim) * 140}px` }}
                    title={`Volta ${row.lap_number}: ${row.count}`}
                  />
                  <span className="text-[9px] text-slate-500">{row.lap_number}</span>
                </div>
              ))}
              {(!stats.eliminationsByLap || stats.eliminationsByLap.length === 0) && (
                <p className="text-slate-500">Sense eliminacions encara</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, color = "text-white" }: { label: string; value: any; color?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
      <div className={`mono-num text-2xl font-black ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] font-bold tracking-widest text-slate-500">{label}</div>
    </div>
  );
}
