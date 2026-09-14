"use client";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import BroadcastPreview from "@/components/broadcast/BroadcastPreview";
import { useLive } from "@/lib/client/useLive";

const VIEWS = [
  { id: "leaderboard_general", label: "CLASSIFICACIÓ GENERAL" },
  { id: "leaderboard_men", label: "CLASSIFICACIÓ HOMES" },
  { id: "leaderboard_women", label: "CLASSIFICACIÓ DONES" },
  { id: "eliminated", label: "ELIMINATS" },
  { id: "leader", label: "LÍDER" },
  { id: "individual", label: "CORREDOR INDIVIDUAL" },
  { id: "timer", label: "CRONÒMETRE" },
];

function routeFor(view: string, opts: { ticker: boolean; bib?: string }) {
  const t = opts.ticker ? 1 : 0;
  switch (view) {
    case "leaderboard_general":
      return `/broadcast/leaderboard?view=general&ticker=${t}`;
    case "leaderboard_men":
      return `/broadcast/leaderboard?view=men&ticker=${t}`;
    case "leaderboard_women":
      return `/broadcast/leaderboard?view=women&ticker=${t}`;
    case "eliminated":
      return `/broadcast/eliminated?ticker=${t}`;
    case "leader":
      return `/broadcast/leader?ticker=${t}`;
    case "individual":
      return `/broadcast/individual?ticker=${t}${opts.bib ? `&bib=${opts.bib}` : ""}`;
    case "timer":
      return `/broadcast/timer?ticker=${t}`;
    default:
      return `/broadcast/leaderboard?view=general&ticker=${t}`;
  }
}

export default function BroadcastControlPage() {
  const { data: state, refetch } = useLive<any>("/api/broadcast/state", ["broadcast:changed"], 3000);
  const { data: runners } = useLive<any[]>("/api/runners", ["runners:changed"], 5000);
  const [query, setQuery] = useState("");
  const [simRate, setSimRate] = useState(0.85);

  // PREVIEW (not yet on air) state — independent from the live broadcast_state.
  const [previewView, setPreviewView] = useState("leaderboard_general");
  const [previewBib, setPreviewBib] = useState("");
  const [previewTicker, setPreviewTicker] = useState(true);
  const [justTaken, setJustTaken] = useState(false);

  useEffect(() => {
    if (state && previewBib === "" && state.selected_runner_id) {
      const r = (runners ?? []).find((x) => x.id === state.selected_runner_id);
      if (r) setPreviewBib(String(r.bib));
    }
  }, [state, runners]);

  const matches = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return (runners ?? [])
      .filter((r) => String(r.bib).includes(q) || r.first_name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [runners, query]);

  async function setView(view: string) {
    await fetch("/api/broadcast/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active_view: view }),
    });
    refetch();
  }

  async function toggleLiveTicker() {
    await fetch("/api/broadcast/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker_enabled: state?.ticker_enabled ? 0 : 1 }),
    });
    refetch();
  }

  async function selectRunnerLive(id: string) {
    await fetch("/api/broadcast/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active_view: "individual", selected_runner_id: id }),
    });
    setQuery("");
    refetch();
  }

  async function takeToAir() {
    let selectedRunnerId: string | undefined;
    if (previewView === "individual" && previewBib) {
      const r = (runners ?? []).find((x) => String(x.bib) === previewBib.trim());
      selectedRunnerId = r?.id;
    }
    await fetch("/api/broadcast/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        active_view: previewView,
        ticker_enabled: previewTicker ? 1 : 0,
        ...(selectedRunnerId ? { selected_runner_id: selectedRunnerId } : {}),
      }),
    });
    setJustTaken(true);
    setTimeout(() => setJustTaken(false), 1200);
    refetch();
  }

  const programSrc = "/broadcast"; // always reflects the real live broadcast_state
  const previewSrc = routeFor(previewView, { ticker: previewTicker, bib: previewBib || undefined });

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-2 text-xl font-black">Control de gràfics Broadcast</h1>
        <p className="mb-6 text-sm text-slate-400">
          Prepara el gràfic a <span className="font-bold text-sky-400">PREVIEW</span>, comprova'l, i quan
          estigui llest prem <span className="font-bold text-emerald-400">TAKE TO AIR</span> per enviar-lo a{" "}
          <code className="rounded bg-white/10 px-1">/broadcast</code> (el que veu vMix en directe).
        </p>

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <div>
            <BroadcastPreview src={programSrc} label="🔴 PROGRAM — EN DIRECTE (vMix)" accent="#ef4444" />
            <p className="mt-2 text-xs text-slate-500">
              Això és exactament el que hi ha ara a <code>/broadcast</code>.
            </p>
          </div>
          <div>
            <BroadcastPreview
              src={previewSrc}
              label="🔵 PREVIEW — encara no en directe"
              accent="#0EA5E9"
              badge={justTaken ? "ENVIAT ✓" : undefined}
            />
            <button
              onClick={takeToAir}
              className="mt-3 w-full rounded-lg bg-emerald-500 py-3 text-lg font-black text-black hover:bg-emerald-400"
            >
              ▶ TAKE TO AIR
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setPreviewView(v.id)}
              className={`rounded-xl border p-4 text-left font-bold transition-colors ${
                previewView === v.id
                  ? "border-sky-500 bg-sky-500/20 text-sky-300"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/10"
              }`}
            >
              {v.label}
              {state?.active_view === v.id && (
                <span className="ml-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                  LIVE
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-slate-400">TICKER AL PREVIEW</span>
            <button
              onClick={() => setPreviewTicker((v) => !v)}
              className={`rounded-lg px-4 py-2 font-bold ${
                previewTicker ? "bg-sky-500 text-black" : "bg-white/10 text-slate-400"
              }`}
            >
              {previewTicker ? "ON" : "OFF"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-slate-400">TICKER EN DIRECTE</span>
            <button
              onClick={toggleLiveTicker}
              className={`rounded-lg px-4 py-2 font-bold ${
                state?.ticker_enabled ? "bg-emerald-500 text-black" : "bg-white/10 text-slate-400"
              }`}
            >
              {state?.ticker_enabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 p-4">
          <h2 className="mb-2 text-xs font-bold tracking-widest text-slate-400">
            CORREDOR INDIVIDUAL — PREVIEW
          </h2>
          <input
            value={previewBib}
            onChange={(e) => setPreviewBib(e.target.value)}
            placeholder="Número de dorsal (per al preview de corredor individual)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 outline-none focus:border-sky-500"
          />

          <h3 className="mb-2 mt-4 text-xs font-bold tracking-widest text-slate-500">
            O ENVIAR DIRECTAMENT A DIRECTE (sense preview)
          </h3>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Dorsal o nom..."
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 outline-none focus:border-sky-500"
          />
          {matches.length > 0 && (
            <div className="mt-2 space-y-1">
              {matches.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectRunnerLive(r.id)}
                  className="block w-full rounded-lg bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                >
                  #{r.bib} — {r.first_name} {r.last_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
          <h2 className="mb-2 text-xs font-bold tracking-widest text-purple-300">
            DEMO MODE — SIMULADOR
          </h2>
          <p className="mb-3 text-sm text-slate-400">
            Simula que els corredors actius completen la volta actual (útil per provar el sistema
            sencer sense esperar una cursa real).
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={simRate}
              onChange={(e) => setSimRate(Number(e.target.value))}
            />
            <span className="w-16 text-sm">{Math.round(simRate * 100)}%</span>
            <button
              onClick={() =>
                fetch("/api/demo/simulate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ completionRate: simRate }),
                })
              }
              className="rounded-lg bg-purple-500 px-4 py-2 font-bold text-black hover:bg-purple-400"
            >
              Simular voltes ara
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <h2 className="mb-2 text-xs font-bold tracking-widest text-slate-400">URLs PER A vMix</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <code className="text-sky-400">/broadcast</code> — overlay actiu (PROGRAM, el que ha
              d'afegir-se a vMix)
            </li>
            <li>
              <code className="text-slate-400">/broadcast/ticker</code> — ticker independent
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

