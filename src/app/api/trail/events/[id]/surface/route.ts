export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/trail/store";
import { startSurface, surfaceState } from "@/lib/trail/surface";

/**
 * GET ?race= -> estat de la superfície (ready/pending/error/none). NOMÉS llegeix: el càlcul (una sola consulta a
 * OpenStreetMap) es dispara en pujar el GPX i es desa al disc.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  const race = ev?.races.find((r) => r.id === req.nextUrl.searchParams.get("race")) ?? ev?.races[0];
  if (!ev || !race) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  return NextResponse.json(surfaceState(ev.id, race.id, race.gpx));
}

/** POST ?race= -> torna a provar el càlcul (només cal si va fallar, o si la cursa no el té). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  const race = ev?.races.find((r) => r.id === req.nextUrl.searchParams.get("race")) ?? ev?.races[0];
  if (!ev || !race?.gpx) return NextResponse.json({ error: "La cursa no té GPX" }, { status: 404 });
  startSurface(ev.id, race.id, race.gpx); // si ja està calculada no fa res
  return NextResponse.json({ status: "pending" });
}
