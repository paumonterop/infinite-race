export function fmtTime(s: number | null | undefined) {
  if (s == null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ca-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtClock(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ca-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const STATUS_LABEL: Record<string, string> = {
  REGISTERED: "Inscrit",
  RUNNING: "En cursa",
  FINISHED: "Arribat",
  DNF: "Retirat",
  DNS: "No sortit",
};

export const STATUS_COLOR: Record<string, string> = {
  REGISTERED: "text-slate-400",
  RUNNING: "text-emerald-400",
  FINISHED: "text-sky-400",
  DNF: "text-red-400",
  DNS: "text-amber-400",
};
