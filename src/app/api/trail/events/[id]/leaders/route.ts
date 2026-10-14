export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_OPTS, leadersOf } from "@/lib/trail/estimate";
import { leadersLive } from "@/lib/trail/ltlive";
import { getEvent } from "@/lib/trail/store";

/**
 * Primers de cada cursa amb la posició estimada ara (lectura pública).
 *   ?sel=trail:5,mitja:3,curta:10   (n màxim 10; 0 o absent = cap)
 *   &sex=all|M|F
 *   &at=<ISO>   només per reproduir una cursa passada (usa el model propi, no LiveTrail)
 *   &src=model  força el model propi (sense consultar LiveTrail)
 *   &w=0.6&f=1  paràmetres del model (només per calibrar)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const sp = req.nextUrl.searchParams;
  const sex = sp.get("sex") === "M" ? "M" : sp.get("sex") === "F" ? "F" : "all";
  const at = sp.get("at") ? new Date(sp.get("at")!).getTime() : NaN;
  const replay = !Number.isNaN(at);
  const now = replay ? at : Date.now();
  const modelOnly = replay || sp.get("src") === "model";
  const num = (k: string, d: number, lo: number, hi: number) => {
    const v = parseFloat(sp.get(k) ?? "");
    return Number.isFinite(v) && v >= lo && v <= hi ? v : d;
  };
  const opts = { wLast: num("w", DEFAULT_OPTS.wLast, 0, 1), fatigue: num("f", DEFAULT_OPTS.fatigue, 0.5, 1.2) };
  const sel = new Map<string, number>();
  for (const part of (sp.get("sel") ?? "").split(",")) {
    const [id, n] = part.split(":");
    const v = Math.min(10, parseInt(n, 10) || 0);
    if (id && v > 0) sel.set(id, v);
  }
  const races: Record<string, ReturnType<typeof leadersOf>> = {};
  for (const r of ev.races) {
    const n = sel.get(r.id);
    if (n) races[r.id] = modelOnly ? leadersOf(r, n, sex, now, opts) : await leadersLive(ev, r, n, sex, opts);
  }
  return NextResponse.json({ now, sex, races });
}
