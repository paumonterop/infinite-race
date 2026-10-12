export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { positionsFor } from "@/lib/trail/gps";
import { getEvent } from "@/lib/trail/store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  return NextResponse.json(positionsFor(ev));
}
