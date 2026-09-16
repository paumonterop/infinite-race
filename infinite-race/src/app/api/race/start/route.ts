export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { startRace } from "@/lib/raceEngine";

export async function POST() {
  const race = startRace();
  return NextResponse.json(race);
}
