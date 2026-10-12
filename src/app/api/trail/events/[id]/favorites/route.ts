export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { favorites, getHistory } from "@/lib/trail/history";
import { getEvent } from "@/lib/trail/store";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  const sp = req.nextUrl.searchParams;
  const race = ev?.races.find((r) => r.id === sp.get("race")) ?? ev?.races[0];
  if (!ev || !race) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const sex = sp.get("sex") === "F" ? "F" : "M";
  const h = await getHistory(ev, race);
  return NextResponse.json({ sex, rows: favorites(h, race.runners, sex, 10), registered: race.runners.length });
}
