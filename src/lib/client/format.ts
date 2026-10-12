export function fmtTime(s: number | null | undefined) {
  if (s == null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const MONTHS = ["gen.", "febr.", "març", "abr.", "maig", "juny", "jul.", "ag.", "set.", "oct.", "nov.", "des."];
const WEEKDAYS: Record<string, string> = { Mon: "dl.", Tue: "dt.", Wed: "dc.", Thu: "dj.", Fri: "dv.", Sat: "ds.", Sun: "dg." };

// Format determinista (mateix text al servidor i al navegador, sempre a hora de Madrid): evita errors d'hidratació.
function parts(iso: string) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "2-digit",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(new Date(iso))) o[p.type] = p.value;
  return o;
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const o = parts(iso);
  return `${o.day} ${MONTHS[parseInt(o.month, 10) - 1]} ${o.hour}:${o.minute}`;
}

/** Amb dia de la setmana: «ds. 17 oct. 07:30». */
export function fmtStart(iso: string | null | undefined) {
  if (!iso) return "—";
  const o = parts(iso);
  return `${WEEKDAYS[o.weekday] ?? o.weekday} ${o.day} ${MONTHS[parseInt(o.month, 10) - 1]} ${o.hour}:${o.minute}`;
}

export function fmtClock(iso: string | null | undefined) {
  if (!iso) return "—";
  const o = parts(iso);
  return `${o.hour}:${o.minute}:${o.second}`;
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
