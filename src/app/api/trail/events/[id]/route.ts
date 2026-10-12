export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getEvent, persistTrail, trailStore } from "@/lib/trail/store";
import { eventView } from "@/lib/trail/view";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  return NextResponse.json(eventView(ev));
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const s = trailStore();
  s.events = s.events.filter((e) => e.id !== params.id);
  persistTrail();
  return NextResponse.json({ ok: true });
}
