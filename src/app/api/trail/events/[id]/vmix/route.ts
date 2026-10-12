export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/trail/store";
import { testVmix, vmixStatus } from "@/lib/trail/vmix";

/** Estat de vMix: input en programa i la motxilla / dorsal resolts (l'usen les escenes amb «Automàtic»). */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ev = getEvent(params.id);
  if (!ev) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  return NextResponse.json(vmixStatus(ev));
}

/** Prova de connexió: { ip, port } -> inputs de vMix (sense desar res). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getEvent(params.id)) return NextResponse.json({ error: "No existeix" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await testVmix(String(b.ip ?? "").trim(), parseInt(String(b.port ?? "8099"), 10) || 8099));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 502 });
  }
}
