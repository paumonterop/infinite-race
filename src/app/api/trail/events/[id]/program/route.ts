export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { emitUpdate } from "@/lib/io";
import { EMPTY_PROGRAM, Layer, Program, SCENE_BY_ID, Slot } from "@/lib/trail/scenes";
import { getEvent, persistTrail } from "@/lib/trail/store";
import type { TrailEvent } from "@/lib/trail/types";

/** Programa actual (migra el format antic d'una sola escena). */
function current(ev: TrailEvent): Program {
  const p: any = ev.program;
  if (!p || !p.layers) {
    const fresh = EMPTY_PROGRAM();
    if (p?.ticker) fresh.ticker = true;
    ev.program = fresh;
  }
  return ev.program!;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  return NextResponse.json({ ...current(ev), server_now: Date.now() });
}

/**
 * body: { layer?: Layer }  posa una escena en antena (substitueix la de la seva zona)
 *       { clear?: Slot | "all" }  treu una zona o tot
 *       { ticker?: boolean }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const p = current(ev);

  if (b.layer) {
    const l = b.layer as Layer;
    const def = SCENE_BY_ID[l.scene];
    if (!def) return NextResponse.json({ error: "Escena desconeguda" }, { status: 400 });
    if (l.race_id && !ev.races.some((r) => r.id === l.race_id)) return NextResponse.json({ error: "Cursa desconeguda" }, { status: 400 });
    p.layers[def.slot] = l;
  }
  if (b.clear) {
    if (b.clear === "all") p.layers = {};
    else delete p.layers[b.clear as Slot];
  }
  if (typeof b.ticker === "boolean") p.ticker = b.ticker;
  p.updated_at = new Date().toISOString();
  persistTrail();
  emitUpdate("trail:program", { id: ev.id });
  return NextResponse.json({ ...p, server_now: Date.now() });
}
