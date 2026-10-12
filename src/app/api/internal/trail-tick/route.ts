export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { tickTrail } from "@/lib/trail/sync";

export async function POST() {
  tickTrail();
  return NextResponse.json({ ok: true });
}
