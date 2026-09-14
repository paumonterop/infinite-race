export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { simulateLapProgress } from "@/lib/demoData";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rate = typeof body.completionRate === "number" ? body.completionRate : 0.85;
  const ids = simulateLapProgress(rate);
  return NextResponse.json({ completed: ids.length });
}
