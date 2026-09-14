export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { endRace } from "@/lib/raceEngine";

export async function POST() {
  const race = endRace();
  return NextResponse.json(race);
}
