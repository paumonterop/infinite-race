import fs from "fs";
import path from "path";
import type { TrailEvent } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "trail.json");

interface TrailStore {
  events: TrailEvent[];
}

declare global {
  // eslint-disable-next-line no-var
  var __trail_store__: TrailStore | undefined;
}

function load(): TrailStore {
  try {
    if (fs.existsSync(FILE)) {
      const p = JSON.parse(fs.readFileSync(FILE, "utf-8"));
      return { events: Array.isArray(p.events) ? p.events : [] };
    }
  } catch {
    /* fitxer malmès: comencem net */
  }
  return { events: [] };
}

export function trailStore(): TrailStore {
  if (!global.__trail_store__) global.__trail_store__ = load();
  return global.__trail_store__;
}

let timer: NodeJS.Timeout | null = null;
export function persistTrail() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(trailStore()));
  }, 100);
}

export function getEvent(id: string): TrailEvent | undefined {
  return trailStore().events.find((e) => e.id === id);
}
