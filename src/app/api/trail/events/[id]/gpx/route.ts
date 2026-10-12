export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { emitUpdate } from "@/lib/io";
import { parseGpx } from "@/lib/trail/gpx";
import { getEvent, persistTrail } from "@/lib/trail/store";
import { startSurface } from "@/lib/trail/surface";

/** multipart: file (GPX) + race (id de la cursa). DELETE ?race=<id> treu el GPX. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const form = await req.formData();
  const file = form.get("file");
  const race = ev.races.find((r) => r.id === String(form.get("race")));
  if (!race) return NextResponse.json({ error: "Cursa desconeguda" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el fitxer" }, { status: 400 });
  try {
    race.gpx = parseGpx(await file.text(), file.name);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  persistTrail();
  // Una sola consulta a OpenStreetMap per GPX: es fa ara, en carregar-lo (i es desa; si el mateix GPX ja hi és, no es repeteix).
  startSurface(ev.id, race.id, race.gpx);
  emitUpdate("trail:changed", { id: ev.id });
  return NextResponse.json({ ok: true, km: race.gpx.total_km, gain: race.gpx.elevation_gain });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  const race = ev?.races.find((r) => r.id === req.nextUrl.searchParams.get("race"));
  if (!ev || !race) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  race.gpx = null;
  persistTrail();
  emitUpdate("trail:changed", { id: ev.id });
  return NextResponse.json({ ok: true });
}
