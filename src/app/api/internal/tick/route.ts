export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { checkLapExpiry } from "@/lib/raceEngine";

export async function POST() {
  checkLapExpiry();
  return NextResponse.json({ ok: true });
}
