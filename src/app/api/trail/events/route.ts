export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { tenantFromUrl } from "@/lib/trail/livetrail";
import { persistTrail, trailStore } from "@/lib/trail/store";
import { discoverRaces } from "@/lib/trail/sync";
import { eventSummary } from "@/lib/trail/view";
import type { TrailEvent } from "@/lib/trail/types";

export async function GET() {
  return NextResponse.json(trailStore().events.map(eventSummary));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const url = String(body.url ?? "").trim();
    const tenant = tenantFromUrl(url);
    const ev: TrailEvent = {
      id: uuid().slice(0, 8),
      name: String(body.name ?? "").trim() || tenant,
      sport: "trail",
      livetrail: { url, tenant, last_sync: null, last_error: null, last_registrants: null },
      races: [],
      devices: {},
      created_at: new Date().toISOString(),
    };
    await discoverRaces(ev);
    trailStore().events.push(ev);
    persistTrail();
    return NextResponse.json(eventSummary(ev), { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 400 });
  }
}
