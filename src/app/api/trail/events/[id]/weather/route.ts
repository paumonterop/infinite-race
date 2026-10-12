export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/trail/store";
import { getWeather } from "@/lib/trail/weather";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  return NextResponse.json(await getWeather(ev, req.nextUrl.searchParams.get("race")));
}
