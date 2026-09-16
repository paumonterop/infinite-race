export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getRace, updateRaceConfig } from "@/lib/raceEngine";

export async function GET() {
  return NextResponse.json(getRace());
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const race = updateRaceConfig(body);
  return NextResponse.json(race);
}
