"use client";
import { useState } from "react";
import TrailNav from "@/components/trail/TrailNav";
import { useLive } from "@/lib/client/useLive";
import type { Program, SceneId } from "@/lib/trail/types";

const SCENES: { id: SceneId; label: string; desc: string }[] = [
  { id: "presentation", label: "Presentació", desc: "Targeta amb nom, km, desnivell i bandera." },
  { id: "presentation_profile", label: "Presentació + perfil", desc: "El títol puja i es revela el perfil amb els punts de control." },
];

export default function BroadcastPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: ev } = useLive<any>(`/api/trail/events/${id}`, ["trail:changed"], 15000);
  const { data: prog, refetch } = useLive<Program>(`/api/trail/events/${id}/program`, ["trail:program"], 3000);

  const [scene, setScene] = useState<SceneId>("presentation_profile");
  const [raceId, setRaceId] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const rid = raceId ?? ev?.races[0]?.id ?? "";
  const race = ev?.races.find((r: any) => r.id === rid);

  async function send(patch: Partial<Program>) {
    await fetch(`/api/trail/events/${id}/program`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    refetch();
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewUrl = `/broadcast/trail/${id}/presentation?race=${rid}${scene === "presentation_profile" ? "&profile=1" : ""}&flag=${ev?.flag ?? "es-ct"}`;

  const urls = [
    { key: "prog", label: "Sortida de programa (vMix/OBS) — mostra el que estigui en antena", url: `${origin}/broadcast/trail/${id}?transparent=1` },
    { key: "tick", label: "Ticker de passos (totes les curses)", url: `${origin}/broadcast/trail/${id}/ticker?transparent=1` },
    ...(ev?.races ?? []).map((r: any) => ({
      key: "t" + r.id,
      label: `Ticker de passos — ${r.name}`,
      url: `${origin}/broadcast/trail/${id}/ticker?race=${r.id}&transparent=1`,
    })),
  ];

  async function copy(key: string, url: string) {
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const onAir = prog?.scene && prog.scene !== "none";
  const onAirRace = ev?.races.find((r: any) => r.id === prog?.race_id)?.name;

  return (
    <div>
      <TrailNav eventId={id} name={ev?.name} />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#101823] to-[#0b0f14] p-4">
          <span className={`rounded px-2.5 py-1 text-xs font-black tracking-widest ${onAir ? "bg-red-600 text-white" : "bg-white/10 text-slate-400"}`}>
            {onAir ? "● EN ANTENA" : "SENSE ESCENA"}
          </span>
          <span className="text-sm text-slate-300">
            {onAir ? `${SCENES.find((s) => s.id === prog!.scene)?.label} · ${onAirRace ?? "—"}` : "Cap escena en pantalla"}
          </span>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={!!prog?.ticker} onChange={(e) => send({ ticker: e.target.checked })} />
            Ticker de passos en antena
          </label>
          <button
            onClick={() => send({ scene: "none" })}
            disabled={!onAir}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20 disabled:opacity-40"
          >
            🧹 Treu l'escena
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-5">
            <div>
              <h2 className="mb-2 text-xs font-bold tracking-widest text-slate-400">CURSA</h2>
              <div className="space-y-1.5">
                {ev?.races.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => setRaceId(r.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-bold ${
                      rid === r.id ? "border-sky-500/60 bg-sky-500/10" : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                    {r.name}
                    {!r.gpx && <span className="ml-auto text-[10px] font-semibold text-amber-400">sense GPX</span>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-xs font-bold tracking-widest text-slate-400">ESCENES</h2>
              <div className="space-y-1.5">
                {SCENES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setScene(s.id);
                      setPreviewKey((k) => k + 1);
                    }}
                    className={`block w-full rounded-lg border px-3 py-2 text-left ${
                      scene === s.id ? "border-sky-500/60 bg-sky-500/10" : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <div className="text-sm font-bold">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.desc}</div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Properament: highlights del GPX, meteo, favorits, fitxes…</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-xs font-bold tracking-widest text-slate-400">PREVISUALITZACIÓ</h2>
              <button onClick={() => setPreviewKey((k) => k + 1)} className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold hover:bg-white/20">
                ↻ Repeteix
              </button>
              <button
                onClick={() => send({ scene, race_id: rid })}
                disabled={!race}
                className="ml-auto rounded-lg bg-red-600 px-6 py-2 text-sm font-black tracking-wide text-white hover:bg-red-500 disabled:opacity-40"
              >
                ▶ POSA EN ANTENA
              </button>
            </div>
            <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black" style={{ aspectRatio: "16 / 9" }}>
              {race && <iframe key={previewKey + previewUrl} src={previewUrl} className="absolute inset-0 h-full w-full border-0" title="preview" />}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10">
          <div className="border-b border-white/10 px-5 py-3 text-xs font-bold tracking-widest text-slate-400">URLS PER A vMIX / OBS (Browser Input 1920×1080)</div>
          <div className="divide-y divide-white/5">
            {urls.map((u) => (
              <div key={u.key} className="flex items-center gap-3 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{u.label}</div>
                  <div className="truncate font-mono text-xs text-slate-500">{u.url}</div>
                </div>
                <button onClick={() => copy(u.key, u.url)} className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20">
                  {copied === u.key ? "Copiat ✓" : "Copia"}
                </button>
              </div>
            ))}
          </div>
          <p className="px-5 py-3 text-xs text-slate-500">
            La plataforma té contrasenya: a vMix/OBS fes servir <span className="font-mono">http://usuari:contrasenya@adreça…</span> a la URL.
          </p>
        </div>
      </main>
    </div>
  );
}
