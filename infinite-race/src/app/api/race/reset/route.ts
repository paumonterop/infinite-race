export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resetRace } from "@/lib/raceEngine";

export async function POST() {
  const race = resetRace();
  return NextResponse.json(race);
}
