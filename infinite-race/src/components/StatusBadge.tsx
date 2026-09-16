const STYLES: Record<string, string> = {
  PENDING: "bg-slate-600/30 text-slate-300 border-slate-500/40",
  ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  LAP_COMPLETED: "bg-sky-500/15 text-sky-400 border-sky-500/40",
  ELIMINATED: "bg-red-500/15 text-red-400 border-red-500/40",
  RETIRED: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  DISQUALIFIED: "bg-purple-500/15 text-purple-400 border-purple-500/40",
  NP: "bg-zinc-700/40 text-zinc-400 border-zinc-500/40",
  RUNNING: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  PAUSED: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  SETUP: "bg-slate-600/30 text-slate-300 border-slate-500/40",
  READY: "bg-sky-500/15 text-sky-400 border-sky-500/40",
  FINISHED: "bg-purple-500/15 text-purple-400 border-purple-500/40",
};

const LABELS: Record<string, string> = {
  PENDING: "PENDENT",
  ACTIVE: "ACTIU",
  LAP_COMPLETED: "VOLTA OK",
  ELIMINATED: "ELIMINAT",
  RETIRED: "RETIRAT",
  DISQUALIFIED: "DESQUALIFICAT",
  NP: "NO PRESENTAT",
  RUNNING: "EN CURS",
  PAUSED: "PAUSAT",
  SETUP: "SETUP",
  READY: "LLEST",
  FINISHED: "FINALITZAT",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide ${
        STYLES[status] ?? "bg-slate-600/30 text-slate-300 border-slate-500/40"
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
