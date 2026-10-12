export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { tickTrail } from "@/lib/trail/sync";
import { tickVmix } from "@/lib/trail/vmix";

export async function POST() {
  tickTrail();
  tickVmix();
  return NextResponse.json({ ok: true });
}
