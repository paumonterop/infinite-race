"use client";
import Link from "next/link";
import { useState } from "react";
import { BRAND } from "@/lib/brand";
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

export default function HomePage() {
  const { data: events, refetch } = useLive<EventSummary[]>("/api/trail/events", ["trail:changed"], 8000);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
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
          <Link href="/backyard" className="text-sm font-semibold text-slate-400 hover:text-white">
            Backyard / Infinite Race →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-black tracking-tight">Esdeveniments</h1>
        <p className="mt-1 text-slate-400">Crea una cursa de muntanya a partir de LiveTrail i puja'n els GPX.</p>

        <form onSubmit={create} className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:grid-cols-[1fr_2fr_auto]">
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
          <button
            disabled={busy}
            className="self-end rounded-lg bg-sky-500 px-5 py-2.5 font-bold text-black hover:bg-sky-400 disabled:opacity-50"
          >
            {busy ? "Important…" : "Crear cursa"}
          </button>
          {error && <p className="text-sm font-semibold text-red-400 md:col-span-3">{error}</p>}
        </form>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(events ?? []).length === 0 && <p className="text-slate-500">Encara no hi ha cap esdeveniment.</p>}
          {(events ?? []).map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#101823] to-[#0b0f14] p-5 transition hover:border-sky-500/50"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-black">{ev.name}</h2>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-slate-300">TRAIL</span>
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
        <button onClick={() => refetch()} className="sr-only">
          refresh
        </button>
      </main>
    </div>
  );
}
