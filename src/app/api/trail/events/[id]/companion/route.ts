export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { analyze } from "@/lib/trail/analysis";
import { positionsFor } from "@/lib/trail/gps";
import { othersOf } from "@/lib/trail/others";
import { EMPTY_PROGRAM, SCENES } from "@/lib/trail/scenes";
import { checkpointSegments } from "@/lib/trail/segments";
import { getEvent } from "@/lib/trail/store";
import { vmixStatus } from "@/lib/trail/vmix";

/**
 * Estat complet per al mòdul de Bitfocus Companion (una sola crida, lectura pública):
 * catàleg d'escenes, curses amb controls i trams de segment, persones externes, motxilles, programa i vMix.
 */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const program = ev.program?.layers ? ev.program : EMPTY_PROGRAM();
  const vm = vmixStatus(ev);
  return NextResponse.json({
    event: { id: ev.id, name: ev.name },
    scenes: SCENES,
    races: ev.races.map((r) => {
      const a = analyze(r);
      return {
        id: r.id,
        name: r.name,
        color: r.color,
        status: r.status,
        checkpoints: r.checkpoints.map((c) => ({ id: c.id, name: c.name, km: c.km })),
        segments: a ? checkpointSegments(a).map((s) => ({ from_km: s.km_start, to_km: s.km_end, from: s.from, to: s.to, name: s.name })) : [],
        runners: r.runners.length,
      };
    }),
    others: othersOf(ev),
    devices: positionsFor(ev).map((d) => ({ id: d.id, label: d.label, status: d.status, race_id: d.race_id, bib: d.bib })),
    program: { layers: program.layers, ticker: program.ticker, updated_at: program.updated_at },
    vmix: {
      configured: vm.configured,
      connected: vm.connected,
      active_input: vm.active_input,
      active_title: vm.active_title,
      device_id: vm.device_id,
      device_label: vm.device_label,
      bib: vm.bib,
      runner_name: vm.runner_name,
    },
    server_now: Date.now(),
  });
}
