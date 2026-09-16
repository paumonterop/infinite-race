export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { gpsFetch } from "@/lib/gpsClient";
import { gpsErrorResponse } from "@/lib/gpsError";

export async function GET() {
  try {
    const data = await gpsFetch("/api/gps/devices");
    return NextResponse.json(data);
  } catch (e: any) {
    return gpsErrorResponse(e);
  }
}
