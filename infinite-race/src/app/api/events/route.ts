export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { recentEvents } from "@/lib/selectors";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 150);
  return NextResponse.json(recentEvents(limit));
}
