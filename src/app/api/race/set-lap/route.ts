export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { setCurrentLapNumber, getRace } from "@/lib/raceEngine";

export async function POST(req: NextRequest) {
  const { lapNumber } = await req.json();
  setCurrentLapNumber(Number(lapNumber));
  return NextResponse.json(getRace());
}
