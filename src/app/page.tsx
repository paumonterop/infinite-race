"use client";
import Link from "next/link";
import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { SPORTS } from "@/lib/sports";
import { useLive } from "@/lib/client/useLive";

interface EventSummary {
  id: string;
  name: string;
  tenant: string;
  last_sync: string | null;
  last_error: string | null;
  races: { id: string; name: string; color: string; start_iso: string | null; status: string; runners: number; has_gpx: boolean }[];
}

function fmtStart(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ca-ES", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const BACKYARD_STATUS: Record<string, string> = {
  SETUP: "Preparació",
  READY: "Llest",
  RUNNING: "En curs",
  PAUSED: "En pausa",
  FINISHED: "Finalitzada",
};

export default function HomePage() {
  const { data: trail } = useLive<EventSummary[]>("/api/trail/events", ["trail:changed"], 8000);
  const { data: race } = useLive<any>("/api/race", ["race:changed"], 5000);
  const { data: stats } = useLive<any>("/api/stats", ["race:changed", "runners:changed"], 5000);

  const [creating, setCreating] = useState<"trail" | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createTrail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/trail/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Error");
    window.location.href = `/events/${json.id}`;
  }

  return (
    <div>
      <header className="border-b border-white/10 bg-[#0b0f14]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-lg font-black tracking-tight text-sky-400">⏱ {BRAND}</span>
          <span className="text-xs font-semibold text-slate-500">Suite de grafismes esportius</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Esdeveniments</h1>
            <p className="mt-1 text-slate-400">Cada esdeveniment té les seves pròpies eines i grafismes segons la modalitat.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCreating(creating === "trail" ? null : "trail")}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-black hover:bg-sky-400"
            >
              + Nou esdeveniment
            </button>
          </div>
        </div>

        {creating && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.values(SPORTS).map((s) => {
                const available = s.id === "trail";
                return (
                  <button
                    key={s.id}
                    disabled={!available}
                    onClick={() => available && setCreating("trail")}
                    title={available ? "" : "Backyard és un únic esdeveniment per ara: ja hi és a la llista"}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      creating === s.id ? "border-sky-500/60 bg-sky-500/10" : "border-white/10"
                    } ${available ? "" : "opacity-40"}`}
                  >
                    <div className="font-bold" style={{ color: s.accent }}>
                      {s.label}
                    </div>
                    <div className="max-w-xs text-xs text-slate-500">{s.tagline}</div>
                  </button>
                );
              })}
              <div className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-slate-600">Més modalitats aviat…</div>
            </div>

            <form onSubmit={createTrail} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
              <label className="text-xs font-bold tracking-widest text-slate-400">
                NOM
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Trail del Bisaura 2026"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b0f14] px-3 py-2 text-base font-normal tracking-normal text-white"
                />
              </label>
              <label className="text-xs font-bold tracking-widest text-slate-400">
                URL DE LIVETRAIL
                <input
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://traildelbisaura.v3.livetrail.net/es/2026"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b0f14] px-3 py-2 text-base font-normal tracking-normal text-white"
                />
              </label>
              <button disabled={busy} className="self-end rounded-lg bg-sky-500 px-5 py-2.5 font-bold text-black hover:bg-sky-400 disabled:opacity-50">
                {busy ? "Important…" : "Crear"}
              </button>
              {error && <p className="text-sm font-semibold text-red-400 md:col-span-3">{error}</p>}
            </form>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Backyard / Infinite Race */}
          <Link
            href="/backyard"
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#101823] to-[#0b0f14] p-5 transition hover:border-sky-500/50"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-black">{race?.name ?? "INFINITE RACE"}</h2>
              <span className="rounded px-2 py-0.5 text-[10px] font-bold tracking-widest" style={{ background: SPORTS.backyard.accent + "33", color: SPORTS.backyard.accent }}>
                {SPORTS.backyard.badge}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">{SPORTS.backyard.tagline}</p>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              <Mini label="ESTAT" value={race ? BACKYARD_STATUS[race.status] ?? race.status : "—"} small />
              <Mini label="VOLTA" value={stats?.currentLap ?? "—"} />
              <Mini label="ACTIUS" value={stats?.active ?? "—"} />
              <Mini label="ELIMINATS" value={stats?.eliminated ?? "—"} />
            </div>
          </Link>

          {/* Trail */}
          {(trail ?? []).map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#101823] to-[#0b0f14] p-5 transition hover:border-sky-500/50"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-black">{ev.name}</h2>
                <span className="rounded px-2 py-0.5 text-[10px] font-bold tracking-widest" style={{ background: SPORTS.trail.accent + "33", color: SPORTS.trail.accent }}>
                  {SPORTS.trail.badge}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {ev.races.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-slate-500">{fmtStart(r.start_iso)}</span>
                    <span className="ml-auto text-slate-400">
                      {r.runners} atl. · {r.has_gpx ? "GPX ✓" : "sense GPX"}
                    </span>
                  </div>
                ))}
              </div>
              {ev.last_error && <p className="mt-3 text-xs text-red-400">⚠ {ev.last_error}</p>}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function Mini({ label, value, small }: { label: string; value: any; small?: boolean }) {
  return (
    <div className="rounded-lg bg-white/5 py-2">
      <div className={`mono-num font-black ${small ? "text-sm leading-7" : "text-xl"}`}>{value}</div>
      <div className="text-[9px] font-bold tracking-widest text-slate-500">{label}</div>
    </div>
  );
}
