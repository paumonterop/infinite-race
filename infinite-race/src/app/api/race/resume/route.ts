export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resumeRace } from "@/lib/raceEngine";

export async function POST() {
  const race = resumeRace();
  return NextResponse.json(race);
}
