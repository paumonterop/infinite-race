export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { emitUpdate } from "@/lib/io";
import { getEvent, persistTrail } from "@/lib/trail/store";
import type { Program, SceneId } from "@/lib/trail/types";

const SCENES: SceneId[] = ["none", "presentation", "presentation_profile"];

function current(ev: NonNullable<ReturnType<typeof getEvent>>): Program {
  return ev.program ?? { scene: "none", race_id: null, ticker: false, updated_at: new Date().toISOString() };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  return NextResponse.json(current(ev));
}

/** body: { scene?, race_id?, ticker? } — canvia el que hi ha en antena. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const p = current(ev);
  if (b.scene !== undefined) {
    if (!SCENES.includes(b.scene)) return NextResponse.json({ error: "Escena desconeguda" }, { status: 400 });
    p.scene = b.scene;
  }
  if (b.race_id !== undefined) {
    if (b.race_id !== null && !ev.races.some((r) => r.id === b.race_id)) {
      return NextResponse.json({ error: "Cursa desconeguda" }, { status: 400 });
    }
    p.race_id = b.race_id;
  }
  if (typeof b.ticker === "boolean") p.ticker = b.ticker;
  p.updated_at = new Date().toISOString();
  ev.program = p;
  persistTrail();
  emitUpdate("trail:program", { id: ev.id });
  return NextResponse.json(p);
}
