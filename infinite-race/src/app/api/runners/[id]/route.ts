export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getRunner, updateRunner, deleteRunner } from "@/lib/raceEngine";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const runner = getRunner(params.id);
  if (!runner) return NextResponse.json({ error: "No trobat" }, { status: 404 });
  return NextResponse.json(runner);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const runner = updateRunner(params.id, body);
  return NextResponse.json(runner);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  deleteRunner(params.id);
  return NextResponse.json({ ok: true });
}
