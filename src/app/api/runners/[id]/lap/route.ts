export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { completeLap, undoLastLap } from "@/lib/raceEngine";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const runner = completeLap(params.id);
  return NextResponse.json(runner);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const runner = undoLastLap(params.id);
  return NextResponse.json(runner);
}
