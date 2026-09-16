"use client";
import { useMemo, useState } from "react";
import Nav from "@/components/Nav";
import LapClock from "@/components/LapClock";
import { useLive } from "@/lib/client/useLive";

async function post(url: string) {
  await fetch(url, { method: "POST" });
}
async function del(url: string) {
  await fetch(url, { method: "DELETE" });
}

export default function ControlPage() {
  const { data: race } = useLive<any>("/api/race", ["race:changed", "state:update"], 3000);
  const { data: runners, refetch } = useLive<any[]>("/api/runners", ["runners:changed"], 2500);
  const [query, setQuery] = useState("");
  const [justDone, setJustDone] = useState<Record<string, boolean>>({});
  const [bibInput, setBibInput] = useState("");
  const [bibFeedback, setBibFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  const pending = useMemo(
    () =>
      (runners ?? [])
        .filter((r) => r.status === "ACTIVE")
        .filter((r) => {
          if (!query) return true;
          const q = query.toLowerCase();
          return (
            String(r.bib).includes(q) ||
            r.first_name.toLowerCase().includes(q) ||
            r.last_name.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => a.bib - b.bib),
    [runners, query]
  );

  const done = (runners ?? []).filter((r) => r.status === "LAP_COMPLETED");

  const handleComplete = async (id: string) => {
    if (justDone[id]) return; // double-click protection
    setJustDone((s) => ({ ...s, [id]: true }));
    await post(`/api/runners/${id}/lap`);
    refetch();
  };

  const handleBibSubmit = async () => {
    const bib = bibInput.trim();
    if (!bib) return;
    const runner = (runners ?? []).find((r) => String(r.bib) === bib);
    if (!runner) {
      setBibFeedback({ type: "error", message: `Dorsal ${bib} no trobat` });
      setBibInput("");
      return;
    }
    if (runner.status === "LAP_COMPLETED") {
      setBibFeedback({ type: "error", message: `Dorsal ${bib} ja tenia la volta marcada` });
      setBibInput("");
      return;
    }
    if (!["ACTIVE", "PENDING"].includes(runner.status)) {
      setBibFeedback({ type: "error", message: `Dorsal ${bib} no està actiu (${runner.status})` });
      setBibInput("");
      return;
    }
    await handleComplete(runner.id);
    setBibFeedback({
      type: "ok",
      message: `✓ Dorsal ${bib} — ${runner.first_name} ${runner.last_name} marcat`,
    });
    setBibInput("");
  };

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#101823] p-6 sm:flex-row sm:justify-between">
          <LapClock race={race} size="xl" />
          <input
            placeholder="Buscar dorsal o nom..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-lg outline-none focus:border-sky-500 sm:w-64"
          />
        </div>

        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <label className="mb-2 block text-xs font-bold tracking-widest text-emerald-400">
            VOLTA RÀPIDA — ESCRIU EL DORSAL I PREM ENTER
          </label>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <input
              inputMode="numeric"
              autoFocus
              placeholder="Dorsal..."
              value={bibInput}
              onChange={(e) => {
                setBibInput(e.target.value);
                setBibFeedback(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleBibSubmit();
              }}
              className="w-full max-w-xs rounded-lg border-2 border-emerald-500/40 bg-white/5 px-4 py-3 text-2xl font-black outline-none focus:border-emerald-400 sm:w-48"
            />
            {bibFeedback && (
              <span
                className={`text-sm font-bold ${
                  bibFeedback.type === "ok" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {bibFeedback.message}
              </span>
            )}
          </div>
        </div>

        {race?.status !== "RUNNING" && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-amber-300">
            La cursa no està en marxa (estat: {race?.status ?? "..."}). Inicia-la des del Dashboard.
          </div>
        )}

        <h2 className="mb-3 text-sm font-bold tracking-widest text-slate-400">
          PENDENTS DE COMPLETAR VOLTA {race?.current_lap ?? ""} ({pending.length})
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {pending.map((r) => (
            <button
              key={r.id}
              onClick={() => handleComplete(r.id)}
              className="animate-pop-in rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4 text-left transition-transform active:scale-95 hover:bg-emerald-500/20"
            >
              <div className="text-3xl font-black text-emerald-400">#{r.bib}</div>
              <div className="mt-1 truncate text-lg font-bold">
                {r.first_name} {r.last_name}
              </div>
              <div className="text-sm text-slate-400">{r.laps_completed} voltes</div>
              <div className="mt-3 rounded-lg bg-emerald-500 py-2 text-center font-black text-black">
                ✓ VOLTA COMPLETADA
              </div>
            </button>
          ))}
          {pending.length === 0 && (
            <p className="col-span-full py-10 text-center text-slate-500">
              Cap corredor pendent — tothom ha completat la volta.
            </p>
          )}
        </div>

        {done.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 text-sm font-bold tracking-widest text-slate-400">
              JA HAN COMPLETAT ({done.length})
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {done
                .sort((a, b) => a.bib - b.bib)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3"
                  >
                    <div>
                      <div className="font-bold text-sky-300">#{r.bib}</div>
                      <div className="truncate text-sm">{r.first_name}</div>
                    </div>
                    <button
                      onClick={async () => {
                        await del(`/api/runners/${r.id}/lap`);
                        setJustDone((s) => ({ ...s, [r.id]: false }));
                        refetch();
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-red-400"
                      title="Desfer última volta"
                    >
                      ↺ desfer
                    </button>
                  </div>
                ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
