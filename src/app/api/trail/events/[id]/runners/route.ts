export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/trail/store";

/** Atletes d'una cursa amb tots els passos (?race=<id>). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const race = ev.races.find((r) => r.id === req.nextUrl.searchParams.get("race")) ?? ev.races[0];
  if (!race) return NextResponse.json({ race: null, checkpoints: [], runners: [] });
  return NextResponse.json({ race: { id: race.id, name: race.name, color: race.color }, checkpoints: race.checkpoints, runners: race.runners });
}
