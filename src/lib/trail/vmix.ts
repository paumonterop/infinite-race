import net from "net";
import { defaultLabel, rawGps } from "./gps";
import { trailStore } from "./store";
import type { TrailEvent } from "./types";

// Lectura de l'estat de vMix pel seu port TCP (per defecte 8099): la comanda "XML" torna l'input en PROGRAMA i la llista
// d'inputs. Així les escenes de motxilla poden agafar automàticament la que està «punxada» en directe.

export interface VmixInput {
  number: number;
  title: string;
  type: string;
}

export interface VmixStatus {
  configured: boolean;
  connected: boolean;
  error: string | null;
  active_input: number | null;
  active_title: string | null;
  device_id: string | null; // motxilla resolta de l'input en programa
  device_label: string | null;
  bib: string | null; // dorsal assignat a aquella motxilla
  runner_name: string | null;
  inputs: VmixInput[];
  polled_at: string | null;
}

interface Raw {
  connected: boolean;
  error: string | null;
  active: number | null;
  inputs: VmixInput[];
  polled_at: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __vmix_state__: Record<string, Raw> | undefined;
  // eslint-disable-next-line no-var
  var __vmix_busy__: Set<string> | undefined;
}

const state = () => (global.__vmix_state__ ??= {});
const busy = () => (global.__vmix_busy__ ??= new Set());
const TIMEOUT_MS = 2500;
const MIN_POLL_MS = 900;

function attr(s: string, name: string) {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(s);
  return m ? m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";
}

export function parseVmixXml(xml: string): { active: number | null; inputs: VmixInput[] } {
  const a = /<active>\s*(\d+)\s*<\/active>/.exec(xml);
  const inputs: VmixInput[] = [];
  const re = /<input\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const number = parseInt(attr(m[1], "number"), 10);
    if (Number.isNaN(number)) continue;
    inputs.push({ number, title: attr(m[1], "title") || `Input ${number}`, type: attr(m[1], "type") });
  }
  inputs.sort((x, y) => x.number - y.number);
  return { active: a ? parseInt(a[1], 10) : null, inputs };
}

/** Demana "XML" a vMix i espera la resposta "XML <bytes>\r\n<xml>". */
export function fetchVmix(ip: string, port: number): Promise<{ active: number | null; inputs: VmixInput[] }> {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host: ip, port });
    let buf = Buffer.alloc(0);
    let done = false;
    const finish = (err: Error | null, v?: { active: number | null; inputs: VmixInput[] }) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sock.destroy();
      if (err) reject(err);
      else resolve(v!);
    };
    const timer = setTimeout(() => finish(new Error("vMix no respon (temps esgotat)")), TIMEOUT_MS);
    sock.on("connect", () => sock.write("XML\r\n"));
    sock.on("error", (e) => finish(new Error(`No s'ha pogut connectar amb vMix (${(e as any).code ?? e.message})`)));
    sock.on("close", () => finish(new Error("vMix ha tancat la connexió sense resposta")));
    sock.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      // el banner "VERSION OK ..." pot anar abans; busquem la línia "XML <n>"
      const text = buf.toString("latin1");
      const m = /(?:^|\r\n)XML (\d+)\r\n/.exec(text);
      if (!m) return;
      const bodyStart = m.index + m[0].length;
      const n = parseInt(m[1], 10);
      if (buf.length < bodyStart + n) return;
      try {
        finish(null, parseVmixXml(buf.subarray(bodyStart, bodyStart + n).toString("utf8")));
      } catch (e: any) {
        finish(e);
      }
    });
  });
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Traduccions de l'input en programa a motxilla: primer pel mapa configurat; si no, pel nom (títol de l'input ~ etiqueta). */
export function resolveDevice(ev: TrailEvent, active: number | null, title: string | null) {
  if (active == null) return null;
  const map = ev.vmix?.input_map ?? {};
  for (const [id, n] of Object.entries(map)) if (Number(n) === active) return id;
  if (title) {
    const t = norm(title);
    const ids = new Set<string>([...Object.keys(ev.devices), ...Object.keys(map), ...Object.keys(rawGps())]);
    for (const id of Array.from(ids)) {
      const label = norm(ev.devices[id]?.label || defaultLabel(id));
      if (label.length >= 3 && t.includes(label)) return id;
    }
  }
  return null;
}

export function vmixStatus(ev: TrailEvent): VmixStatus {
  const configured = !!ev.vmix?.ip;
  const raw = state()[ev.id];
  const active = raw?.connected ? raw.active : null;
  const title = active != null ? raw?.inputs.find((i) => i.number === active)?.title ?? null : null;
  const dev = resolveDevice(ev, active, title);
  const bib = dev ? ev.devices[dev]?.bib ?? null : null;
  let runnerName: string | null = null;
  if (dev && bib) {
    const race = ev.races.find((r) => r.id === ev.devices[dev]?.race_id) ?? ev.races.find((r) => r.runners.some((x) => x.bib === bib));
    const r = race?.runners.find((x) => x.bib === bib);
    if (r) runnerName = `${r.first_name} ${r.last_name}`.trim();
  }
  return {
    configured,
    connected: !!raw?.connected,
    error: raw?.error ?? null,
    active_input: active,
    active_title: title,
    device_id: dev,
    device_label: dev ? ev.devices[dev]?.label || defaultLabel(dev) : null,
    bib,
    runner_name: runnerName,
    inputs: raw?.inputs ?? [],
    polled_at: raw?.polled_at ?? null,
  };
}

async function pollOne(ev: TrailEvent) {
  const cfg = ev.vmix!;
  try {
    const r = await fetchVmix(cfg.ip, cfg.port || 8099);
    state()[ev.id] = { connected: true, error: null, active: r.active, inputs: r.inputs, polled_at: new Date().toISOString() };
  } catch (e: any) {
    // es conserva l'última llista d'inputs (útil per configurar el mapa mentre vMix no respon)
    const prev = state()[ev.id];
    state()[ev.id] = { connected: false, error: e?.message ?? String(e), active: null, inputs: prev?.inputs ?? [], polled_at: new Date().toISOString() };
  }
}

/** Cridat cada segon pel tick del servidor. */
export function tickVmix() {
  const now = Date.now();
  for (const ev of trailStore().events) {
    if (!ev.vmix?.ip || busy().has(ev.id)) continue;
    const last = state()[ev.id]?.polled_at;
    if (last && now - new Date(last).getTime() < MIN_POLL_MS) continue;
    busy().add(ev.id);
    void pollOne(ev).finally(() => busy().delete(ev.id));
  }
}

/** Prova puntual (botó «Provar connexió» de la configuració). */
export async function testVmix(ip: string, port: number) {
  const r = await fetchVmix(ip, port || 8099);
  return { active: r.active, inputs: r.inputs };
}
