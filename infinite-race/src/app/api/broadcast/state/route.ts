export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getBroadcastState, updateBroadcastState } from "@/lib/raceEngine";

export async function GET() {
  return NextResponse.json(getBroadcastState());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const state = updateBroadcastState(body);
  return NextResponse.json(state);
}
