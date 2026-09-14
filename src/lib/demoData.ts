import { createRunner, getRunners, completeLap } from "./raceEngine";

const MEN: [string, string][] = [
  ["Joan", "Bofill"],
  ["Quique", "Quintero"],
  ["Pere", "Garcia"],
  ["Marc", "Soler"],
  ["Xavier", "Puig"],
  ["Albert", "Riera"],
  ["Oriol", "Vidal"],
  ["Ferran", "Costa"],
  ["Jordi", "Serra"],
  ["David", "Roca"],
];

const WOMEN: [string, string][] = [
  ["Blanca", "Carralero"],
  ["Maria", "Lopez"],
  ["Anna", "Marti"],
  ["Laura", "Puig"],
  ["Nuria", "Vila"],
  ["Marta", "Sole"],
  ["Elena", "Ferrer"],
  ["Carla", "Pons"],
  ["Judit", "Camps"],
  ["Sara", "Bosch"],
];

const TEAMS = ["Team Aran", "Trail Pirineus", "Ultra Val d'Aran", "Runners BCN", null];
const NATIONS = ["ESPAÑA", "FRANCIA", "ANDORRA", "PORTUGAL"];

export function seedDemoRunners() {
  const existing = getRunners();
  if (existing.length > 0) return existing;

  let bib = 1;
  MEN.forEach(([first, last], i) => {
    createRunner({
      bib: bib++,
      first_name: first,
      last_name: last,
      gender: "M",
      nationality: NATIONS[i % NATIONS.length],
      team: TEAMS[i % TEAMS.length] ?? undefined,
    });
  });
  WOMEN.forEach(([first, last], i) => {
    createRunner({
      bib: bib++,
      first_name: first,
      last_name: last,
      gender: "F",
      nationality: NATIONS[i % NATIONS.length],
      team: TEAMS[i % TEAMS.length] ?? undefined,
    });
  });
  return getRunners();
}

/** Randomly complete laps for some active runners and occasionally leave some behind (demo mode helper). */
export function simulateLapProgress(completionRate = 0.85) {
  const runners = getRunners().filter((r) => r.status === "ACTIVE");
  const results: string[] = [];
  for (const r of runners) {
    if (Math.random() < completionRate) {
      completeLap(r.id, "demo-simulator");
      results.push(r.id);
    }
  }
  return results;
}
