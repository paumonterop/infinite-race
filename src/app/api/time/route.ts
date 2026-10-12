export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

/** Hora del servidor (ms): els cronòmetres no han de dependre del rellotge de l'ordinador de vMix. */
export async function GET() {
  return NextResponse.json({ now: Date.now() });
}
