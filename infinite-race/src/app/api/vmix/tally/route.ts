export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getRace } from "@/lib/raceEngine";
import { getVmixTally, parseProgramInputs } from "@/lib/vmixClient";

export async function GET() {
  const race = getRace();
  const host = race.vmix_host;
  const port = race.vmix_port || 8099;

  if (!host) {
    return NextResponse.json(
      { error: "NOT_CONFIGURED", message: "Falta configurar la IP del vMix" },
      { status: 400 }
    );
  }

  try {
    const tally = await getVmixTally(host, port);
    const programInputs = parseProgramInputs(tally);
    return NextResponse.json({ tally, programInputs });
  } catch (e: any) {
    const msg = e?.message === "TIMEOUT" ? "Temps d'espera exhaurit connectant amb vMix" : String(e?.message ?? e);
    return NextResponse.json({ error: "UNREACHABLE", message: msg }, { status: 502 });
  }
}
