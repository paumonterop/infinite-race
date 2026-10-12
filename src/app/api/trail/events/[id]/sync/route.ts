export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/trail/store";
import { importRegistrants, syncEvent } from "@/lib/trail/sync";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  await syncEvent(ev);
  let registrants: number | undefined;
  if (body.registrants) registrants = await importRegistrants(ev);
  return NextResponse.json({ ok: true, error: ev.livetrail.last_error, registrants });
}
