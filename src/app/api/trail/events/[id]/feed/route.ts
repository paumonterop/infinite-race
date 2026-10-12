export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { readFeed } from "@/lib/trail/feed";
import { getEvent } from "@/lib/trail/store";

/** ?since=<seq> torna els passos nous; sense `since` torna els últims `backlog` (per defecte 0). ?race=<id> filtra. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getEvent(params.id)) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const sp = req.nextUrl.searchParams;
  const since = sp.get("since");
  const backlog = Math.min(100, parseInt(sp.get("backlog") ?? "0", 10) || 0);
  return NextResponse.json(readFeed(params.id, since == null ? null : parseInt(since, 10) || 0, backlog, sp.get("race")));
}
