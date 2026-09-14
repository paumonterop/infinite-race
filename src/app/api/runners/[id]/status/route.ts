export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { setRunnerStatus, getRunner } from "@/lib/raceEngine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { status } = await req.json();
  setRunnerStatus(params.id, status);
  return NextResponse.json(getRunner(params.id));
}
