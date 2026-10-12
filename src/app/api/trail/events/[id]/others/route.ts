export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { emitUpdate } from "@/lib/io";
import { Other, othersOf } from "@/lib/trail/others";
import { getEvent, persistTrail } from "@/lib/trail/store";

const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  return NextResponse.json(othersOf(ev));
}

/** body: { name, role } afegeix una persona externa (o actualitza el càrrec si ja hi és). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim();
  const role = String(b.role ?? "").trim();
  if (!name) return NextResponse.json({ error: "Falta el nom" }, { status: 400 });
  const list: Other[] = [...othersOf(ev)];
  const id = slug(name) || `p${list.length + 1}`;
  const i = list.findIndex((o) => o.id === id);
  if (i >= 0) list[i] = { id, name, role };
  else list.push({ id, name, role });
  ev.others = list;
  persistTrail();
  emitUpdate("trail:changed", { id: ev.id });
  return NextResponse.json(list);
}

/** ?id=<id> esborra una persona de la llista. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  ev.others = othersOf(ev).filter((o) => o.id !== req.nextUrl.searchParams.get("id"));
  persistTrail();
  emitUpdate("trail:changed", { id: ev.id });
  return NextResponse.json(ev.others);
}
