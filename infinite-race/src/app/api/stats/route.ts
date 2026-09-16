export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { raceStats } from "@/lib/selectors";

export async function GET() {
  return NextResponse.json(raceStats());
}
