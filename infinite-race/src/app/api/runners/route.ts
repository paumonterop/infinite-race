export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getRunners, createRunner, getRunnerByBib } from "@/lib/raceEngine";

export async function GET() {
  return NextResponse.json(getRunners());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.bib) {
    return NextResponse.json({ error: "Dorsal requerit" }, { status: 400 });
  }
  if (getRunnerByBib(Number(body.bib))) {
    return NextResponse.json({ error: "Ja existeix un corredor amb aquest dorsal" }, { status: 409 });
  }
  const runner = createRunner({ ...body, bib: Number(body.bib) });
  return NextResponse.json(runner, { status: 201 });
}
