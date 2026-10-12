export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { computeRecords, getHistory } from "@/lib/trail/history";
import { getEvent } from "@/lib/trail/store";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  const race = ev?.races.find((r) => r.id === req.nextUrl.searchParams.get("race")) ?? ev?.races[0];
  if (!ev || !race) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const h = await getHistory(ev, race);
  const dist = race.distance_m ?? (race.gpx ? race.gpx.total_km * 1000 : null);
  return NextResponse.json({ fetched_at: h.fetched_at, editions: h.editions, ...computeRecords(h, dist) });
}
