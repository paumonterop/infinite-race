import { NextResponse } from "next/server";

/** Turns a gpsFetch() error into a clean JSON error response with an
 * appropriate status code, so the frontend can show a helpful message. */
export function gpsErrorResponse(e: any) {
  const msg = String(e?.message ?? e);
  if (msg === "NOT_CONFIGURED") {
    return NextResponse.json(
      { error: "NOT_CONFIGURED", message: "El servidor GPS no està configurat (Configuració → GPS)." },
      { status: 400 }
    );
  }
  if (msg === "UNREACHABLE") {
    return NextResponse.json(
      { error: "UNREACHABLE", message: "No s'ha pogut contactar amb el servidor GPS." },
      { status: 502 }
    );
  }
  return NextResponse.json({ error: "GPS_ERROR", message: msg }, { status: 502 });
}
