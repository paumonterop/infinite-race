export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { pauseRace } from "@/lib/raceEngine";

export async function POST() {
  const race = pauseRace();
  return NextResponse.json(race);
}
