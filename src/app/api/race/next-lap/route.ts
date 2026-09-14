export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { advanceLap } from "@/lib/raceEngine";

export async function POST() {
  const race = advanceLap("organizer-manual");
  return NextResponse.json(race);
}
