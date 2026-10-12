import type { TrailEvent } from "./types";

export interface Other {
  id: string;
  name: string;
  role: string;
}

/** Persones externes que poden sortir amb chyron (comentaristes, convidats, organització…). */
export const DEFAULT_OTHERS: Other[] = [{ id: "albert-jorquera", name: "Albert Jorquera", role: "Comentarista" }];

export const othersOf = (ev: TrailEvent): Other[] => ev.others ?? DEFAULT_OTHERS;
