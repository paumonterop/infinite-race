export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { athleteHistory, getHistory } from "@/lib/trail/history";
import { getEvent } from "@/lib/trail/store";

/** Atleta d'una cursa (?race=&bib=) amb els seus resultats a edicions anteriors (history=0 per ometre'ls). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  const sp = req.nextUrl.searchParams;
  const race = ev?.races.find((r) => r.id === sp.get("race")) ?? ev?.races[0];
  const runner = race?.runners.find((r) => r.bib === sp.get("bib"));
  if (!ev || !race || !runner) return NextResponse.json({ error: "Atleta no trobat" }, { status: 404 });
  const { passings, ...rest } = runner;
  let past: any[] = [];
  if (sp.get("history") !== "0") {
    const h = await getHistory(ev, race).catch(() => null);
    if (h) past = athleteHistory(h, runner.first_name, runner.last_name).slice(0, 5);
  }
  return NextResponse.json({
    runner: { ...rest, passings_count: passings.length },
    race: { id: race.id, name: race.name, color: race.color },
    past,
  });
}
