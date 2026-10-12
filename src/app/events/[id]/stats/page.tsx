"use client";
import { useMemo } from "react";
import TrailNav from "@/components/trail/TrailNav";
import { useLive } from "@/lib/client/useLive";
import { fmtTime } from "@/lib/client/format";

export default function StatsPage({ params }: { params: { id: string } }) {
  const { data: ev } = useLive<any>(`/api/trail/events/${params.id}`, ["trail:changed"], 5000);

  return (
    <div>
      <TrailNav eventId={params.id} name={ev?.name} />
      <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-6">
        {ev?.races.map((r: any) => (
          <RaceStats key={r.id} race={r} />
        ))}
      </main>
    </div>
  );
}

function RaceStats({ race }: { race: any }) {
  const s = useMemo(() => {
    const rs: any[] = race.runners;
    const count = (f: (r: any) => boolean) => rs.filter(f).length;
    const cats: Record<string, { n: number; fin: number }> = {};
    for (const r of rs) {
      const k = r.category || "—";
      cats[k] ??= { n: 0, fin: 0 };
      cats[k].n++;
      if (r.status === "FINISHED") cats[k].fin++;
    }
    const fin = rs.filter((r) => r.status === "FINISHED" && r.race_time_s != null);
    const best = (sex: string) => fin.filter((r) => r.sex === sex).sort((a, b) => a.race_time_s - b.race_time_s).slice(0, 3);
    const avg = fin.length ? Math.round(fin.reduce((a, r) => a + r.race_time_s, 0) / fin.length) : null;
    // quants han passat cada control (per l'últim control assolit; no se salta cap control)
    const perCp = race.checkpoints.map((c: any) => ({
      ...c,
      passed: rs.filter((r) => r.last_point_km != null && r.last_point_km >= c.km - 0.01).length,
    }));
    return {
      total: rs.length,
      men: count((r) => r.sex === "M"),
      women: count((r) => r.sex === "F"),
      running: count((r) => r.status === "RUNNING"),
      finished: fin.length,
      dnf: count((r) => r.status === "DNF"),
      dns: count((r) => r.status === "DNS"),
      cats: Object.entries(cats).sort((a, b) => b[1].n - a[1].n),
      bestM: best("M"),
      bestF: best("F"),
      avg,
      perCp,
    };
  }, [race]);

  const maxPassed = Math.max(1, s.total);

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: race.color }} />
        <h2 className="text-xl font-black">{race.name}</h2>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Card label="INSCRITS" value={s.total} />
        <Card label="HOMES" value={s.men} color="text-sky-400" />
        <Card label="DONES" value={s.women} color="text-pink-400" />
        <Card label="EN CURSA" value={s.running} color="text-emerald-400" />
        <Card label="ARRIBATS" value={s.finished} color="text-sky-400" />
        <Card label="RETIRATS" value={s.dnf} color="text-red-400" />
        <Card label="NO SORTITS" value={s.dns} color="text-amber-400" />
        <Card label="TEMPS MIG" value={fmtTime(s.avg)} small />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 p-4 lg:col-span-2">
          <h3 className="mb-3 text-xs font-bold tracking-widest text-slate-400">PASSOS PER CONTROL</h3>
          {s.perCp.length === 0 && <p className="text-sm text-slate-500">Sense controls.</p>}
          <div className="space-y-2">
            {s.perCp.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 truncate font-semibold">{c.name}</span>
                <span className="w-16 shrink-0 text-xs text-slate-500">km {c.km}</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-white/10">
                  <div className="h-full" style={{ width: `${(c.passed / maxPassed) * 100}%`, background: race.color }} />
                </div>
                <span className="mono-num w-14 text-right font-bold">{c.passed}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 p-4">
            <h3 className="mb-2 text-xs font-bold tracking-widest text-slate-400">MILLORS TEMPS</h3>
            <Best title="Homes" list={s.bestM} color="text-sky-400" />
            <Best title="Dones" list={s.bestF} color="text-pink-400" />
          </div>
          <div className="rounded-2xl border border-white/10 p-4">
            <h3 className="mb-2 text-xs font-bold tracking-widest text-slate-400">CATEGORIES</h3>
            <div className="max-h-56 space-y-1 overflow-y-auto text-sm">
              {s.cats.length === 0 && <p className="text-slate-500">—</p>}
              {s.cats.map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="font-semibold">{k}</span>
                  <span className="mono-num text-slate-400">
                    {v.n} <span className="text-slate-600">· {v.fin} arr.</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({ label, value, color = "text-white", small }: { label: string; value: any; color?: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
      <div className={`mono-num font-black ${small ? "text-xl" : "text-3xl"} ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] font-bold tracking-widest text-slate-500">{label}</div>
    </div>
  );
}

function Best({ title, list, color }: { title: string; list: any[]; color: string }) {
  return (
    <div className="mb-2">
      <div className={`text-xs font-bold ${color}`}>{title}</div>
      {list.length === 0 && <div className="text-sm text-slate-500">—</div>}
      {list.map((r, i) => (
        <div key={r.bib} className="flex items-center gap-2 text-sm">
          <span className="w-4 text-slate-500">{i + 1}</span>
          <span className="truncate font-semibold">
            {r.first_name} {r.last_name}
          </span>
          <span className="mono-num ml-auto">{fmtTime(r.race_time_s)}</span>
        </div>
      ))}
    </div>
  );
}
