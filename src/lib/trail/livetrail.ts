const API = "https://api.v3.livetrail.net/api";

/** Treu el tenant d'una URL de LiveTrail v3:
 *  https://traildelbisaura.v3.livetrail.net/es/2026 -> traildelbisaura_2026 */
export function tenantFromUrl(input: string): string {
  const s = input.trim();
  if (/^[a-z0-9]+_\d{4}$/i.test(s)) return s.toLowerCase();
  let u: URL;
  try {
    u = new URL(s.startsWith("http") ? s : `https://${s}`);
  } catch {
    throw new Error("URL de LiveTrail no vàlida");
  }
  const sub = u.hostname.split(".")[0];
  const year = u.pathname.split("/").find((p) => /^\d{4}$/.test(p));
  if (!sub || !year || !u.hostname.includes("livetrail")) {
    throw new Error("No he pogut deduir el tenant. Format esperat: https://<cursa>.v3.livetrail.net/es/<any>");
  }
  return `${sub}_${year}`.toLowerCase();
}

export async function lt<T = any>(
  tenant: string,
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T | null> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const url = `${API}/${path}${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: { accept: "application/json", "X-Tenant": tenant },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`LiveTrail ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export interface LtSummary {
  raceId: string;
  fullname?: string;
  shortname?: string;
  color?: string;
  distance?: number;
  elevationGain?: number;
  startDate?: string;
  status?: string;
}

export async function ltSummaries(tenant: string) {
  const s = await lt<LtSummary[]>(tenant, "events/races/summaries");
  if (!s) throw new Error(`El tenant "${tenant}" no existeix a LiveTrail`);
  return s;
}

export async function ltPassings(tenant: string, raceId: string, pageSize = 1000) {
  const rows: any[] = [];
  for (let page = 0; page < 50; page++) {
    const d = await lt<any>(tenant, `events/passings/${raceId}`, { limit: pageSize, page });
    if (!d?.rows?.length) break;
    rows.push(...d.rows);
    if (rows.length >= (d.total ?? 0) || d.rows.length < pageSize) break;
  }
  return rows;
}
