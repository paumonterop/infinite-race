export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { defaultLabel } from "@/lib/trail/gps";
import { getEvent, persistTrail } from "@/lib/trail/store";

/** body: { id, label?, race_id?, bib? } — assigna una motxilla a una cursa i/o un dorsal. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  const cur = ev.devices[id] ?? { label: defaultLabel(id), race_id: null, bib: null };
  if ("label" in b) cur.label = String(b.label || defaultLabel(id));
  if ("race_id" in b) cur.race_id = b.race_id || null;
  if ("bib" in b) cur.bib = b.bib ? String(b.bib) : null;
  ev.devices[id] = cur;
  persistTrail();
  return NextResponse.json(cur);
}
