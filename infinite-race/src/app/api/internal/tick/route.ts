export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { checkLapExpiry, checkScheduledStart, checkVmixAutoSelect } from "@/lib/raceEngine";

export async function POST() {
  checkScheduledStart();
  checkLapExpiry();
  await checkVmixAutoSelect();
  return NextResponse.json({ ok: true });
}
