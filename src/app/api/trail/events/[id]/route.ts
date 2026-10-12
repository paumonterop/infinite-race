export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { emitUpdate } from "@/lib/io";
import { getEvent, persistTrail, trailStore } from "@/lib/trail/store";
import { eventView } from "@/lib/trail/view";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  return NextResponse.json(eventView(ev));
}

/** body: { name?, flag?, races?: [{ id, name?, color? }] } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  if (typeof b.name === "string" && b.name.trim()) ev.name = b.name.trim();
  if (typeof b.flag === "string") ev.flag = b.flag.replace(/[^a-z0-9-]/gi, "") || undefined;
  if (b.vmix && typeof b.vmix === "object") {
    const map: Record<string, number> = {};
    for (const [k, v] of Object.entries(b.vmix.input_map ?? {})) {
      const n = parseInt(String(v), 10);
      if (!Number.isNaN(n) && n > 0) map[k] = n;
    }
    ev.vmix = { ip: String(b.vmix.ip ?? "").trim(), port: parseInt(String(b.vmix.port ?? "8099"), 10) || 8099, input_map: map };
  }
  if (Array.isArray(b.races)) {
    for (const u of b.races) {
      const r = ev.races.find((x) => x.id === u.id);
      if (!r) continue;
      if (typeof u.color === "string" && /^#[0-9a-f]{6}$/i.test(u.color)) r.color = u.color;
    }
  }
  persistTrail();
  emitUpdate("trail:changed", { id: ev.id });
  return NextResponse.json(eventView(ev));
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const s = trailStore();
  s.events = s.events.filter((e) => e.id !== params.id);
  persistTrail();
  return NextResponse.json({ ok: true });
}
