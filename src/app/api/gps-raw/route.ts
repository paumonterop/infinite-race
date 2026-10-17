export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { rawGps } from "@/lib/trail/gps";

/** Dades crues de les motxilles (en memòria). Les consulta una instància local (GPS_UPSTREAM) per reutilitzar els GPS d'aquest servidor. */
export async function GET() {
  return NextResponse.json({ now: Date.now(), gps: rawGps() });
}
