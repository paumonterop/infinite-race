export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/trail/analysis";
import { getEvent } from "@/lib/trail/store";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  const race = ev?.races.find((r) => r.id === req.nextUrl.searchParams.get("race")) ?? ev?.races[0];
  if (!ev || !race) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const a = analyze(race);
  if (!a) return NextResponse.json({ error: "La cursa no té GPX amb elevació" }, { status: 404 });
  return NextResponse.json(a);
}
