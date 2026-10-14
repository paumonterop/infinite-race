export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/trail/store";

/**
 * Top N d'una cursa i sexe en directe: qui ha arribat més lluny primer i, al mateix control, el més ràpid.
 * time_s = temps de cursa de l'atleta al seu últim control; gap_s = diferència amb el primer al MATEIX control.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  const sp = req.nextUrl.searchParams;
  const race = ev?.races.find((r) => r.id === sp.get("race")) ?? ev?.races[0];
  if (!ev || !race) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const sex = sp.get("sex") === "F" ? "F" : "M";
  const limit = Math.min(50, parseInt(sp.get("limit") ?? "10", 10) || 10);
  const list = race.runners
    .filter((r) => r.sex === sex && r.last_point_km != null && r.status !== "DNF" && r.status !== "DNS")
    .sort((a, b) => b.last_point_km! - a.last_point_km! || (a.race_time_s ?? 0) - (b.race_time_s ?? 0))
    .slice(0, limit);
  const lead = list[0];
  // temps de cursa del primer a cada control: el gap d'un atleta és la diferència amb el primer EN EL SEU ÚLTIM CONTROL
  const leadAt = new Map((lead?.passings ?? []).map((p) => [p.point_id, p.seconds]));
  const rows = list.map((r, i) => ({
    rank: i + 1,
    bib: r.bib,
    name: `${r.first_name} ${r.last_name}`.trim(),
    club: r.club,
    category: r.category,
    point_name: r.last_point_name,
    point_km: r.last_point_km,
    time_s: r.race_time_s,
    gap_s: i > 0 && r.last_point_id != null && leadAt.has(r.last_point_id) ? Math.max(0, (r.race_time_s ?? 0) - leadAt.get(r.last_point_id)!) : null,
    finished: r.status === "FINISHED",
  }));
  return NextResponse.json({ sex, race: { id: race.id, name: race.name, color: race.color }, rows });
}
