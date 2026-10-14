/**
 * Catàleg d'escenes d'un esdeveniment de trail. Cada escena ocupa una ZONA de pantalla: dues escenes de la mateixa
 * zona no poden coexistir (la nova substitueix l'anterior), les de zones diferents sí (p. ex. classificació + cronòmetre
 * + dials de motxilla), com feia l'autopilot de gfx-suite-onon.
 */
export type Slot = "main" | "lower" | "chrono" | "tag" | "mini" | "gauge_speed" | "gauge_gradient";

export type Need = "race" | "sex" | "bib" | "segment" | "device" | "point" | "other" | "position";

export type SceneId =
  | "presentation_profile"
  | "highlights_stats"
  | "highlights_climb"
  | "highlights_descent"
  | "highlights_surface"
  | "profile_leaders"
  | "weather"
  | "checkpoint"
  | "runner_chyron"
  | "runner_card"
  | "chyron_other"
  | "leaderboard"
  | "position_tag"
  | "leaderboard_mini"
  | "race_stats"
  | "favorites"
  | "history_record"
  | "history_winners"
  | "segment_info"
  | "segment_profile"
  | "chrono"
  | "chrono_all"
  | "gps_speed"
  | "gps_gradient";

export interface SceneDef {
  id: SceneId;
  label: string;
  desc: string;
  group: string;
  slot: Slot;
  needs: Need[];
}

export const SCENES: SceneDef[] = [
  { id: "presentation_profile", label: "Presentació de la cursa", desc: "Targeta amb nom, km, desnivell i bandera; puja i es revela el perfil amb els controls.", group: "Presentació", slot: "main", needs: ["race"] },
  { id: "highlights_stats", label: "Fitxa tècnica", desc: "Distància, desnivell i línia de controls.", group: "Cursa", slot: "main", needs: ["race"] },
  { id: "highlights_climb", label: "La pujada més dura", desc: "Perfil acolorit per pendent del tram més dur.", group: "Cursa", slot: "main", needs: ["race"] },
  { id: "highlights_descent", label: "La gran baixada", desc: "Perfil acolorit del tram de més baixada.", group: "Cursa", slot: "main", needs: ["race"] },
  { id: "highlights_surface", label: "Superfícies", desc: "Tipus de terreny del recorregut (OpenStreetMap).", group: "Cursa", slot: "main", needs: ["race"] },
  { id: "profile_leaders", label: "Perfil amb els primers", desc: "Perfil de la cursa amb el top 3 d'homes i dones al seu punt.", group: "Cursa", slot: "lower", needs: ["race"] },
  { id: "weather", label: "Meteo", desc: "Previsió a sortida, cim i meta (Open-Meteo).", group: "Cursa", slot: "lower", needs: ["race"] },
  { id: "checkpoint", label: "Punt de pas", desc: "Nom del control, km i altitud.", group: "Cursa", slot: "lower", needs: ["race", "point"] },
  { id: "runner_chyron", label: "Chyron de corredor", desc: "Tercer inferior amb nom, club i dorsal.", group: "Atletes", slot: "lower", needs: ["race", "bib"] },
  { id: "runner_card", label: "Fitxa de corredor", desc: "Nom, estat a la cursa i últims resultats.", group: "Atletes", slot: "lower", needs: ["race", "bib"] },
  { id: "chyron_other", label: "Chyron d'altres", desc: "Nom i càrrec d'una persona externa (comentarista, convidat…).", group: "Altres", slot: "lower", needs: ["other"] },
  { id: "leaderboard", label: "Classificació", desc: "Top 10 d'homes o dones en directe.", group: "Classificacions", slot: "main", needs: ["race", "sex"] },
  { id: "position_tag", label: "Posició (1r–5è)", desc: "Etiqueta «1r HOME · cursa» amb qui hi és ara.", group: "Classificacions", slot: "tag", needs: ["race", "sex", "position"] },
  { id: "leaderboard_mini", label: "Classificació petita (top 5)", desc: "Top 5 en un racó de la pantalla (baix a la dreta).", group: "Classificacions", slot: "mini", needs: ["race", "sex"] },
  { id: "race_stats", label: "Estadístiques de la cursa", desc: "Inscrits, en cursa, arribats i quants han passat per cada control.", group: "Estadístiques", slot: "main", needs: ["race"] },
  { id: "favorites", label: "Top 10 favorits", desc: "Els millors de les edicions anteriors.", group: "Classificacions", slot: "main", needs: ["race", "sex"] },
  { id: "history_record", label: "Rècord de la cursa", desc: "Rècord d'homes i dones amb l'any.", group: "Històric", slot: "main", needs: ["race"] },
  { id: "history_winners", label: "Guanyadors per edició", desc: "Qui va guanyar cada any.", group: "Històric", slot: "main", needs: ["race"] },
  { id: "segment_info", label: "Segment: info", desc: "Perfil de la cursa amb el tram ressaltat.", group: "Segments", slot: "lower", needs: ["race", "segment"] },
  { id: "segment_profile", label: "Segment: perfil per pendents", desc: "Perfil del tram acolorit per pendent.", group: "Segments", slot: "lower", needs: ["race", "segment"] },
  { id: "chrono", label: "Cronòmetre", desc: "Temps de cursa d'una cursa.", group: "Cronòmetres", slot: "chrono", needs: ["race"] },
  { id: "chrono_all", label: "Cronòmetres (les 3)", desc: "Els temps de totes les curses alhora.", group: "Cronòmetres", slot: "chrono", needs: [] },
  { id: "gps_speed", label: "Velocitat motxilla", desc: "Dial de velocitat d'una motxilla GPS.", group: "Motxilles", slot: "gauge_speed", needs: ["device"] },
  { id: "gps_gradient", label: "Pendent motxilla", desc: "Dial de pendent d'una motxilla GPS.", group: "Motxilles", slot: "gauge_gradient", needs: ["device"] },
];

export const SCENE_BY_ID: Record<string, SceneDef> = Object.fromEntries(SCENES.map((s) => [s.id, s]));

/** Una escena en antena amb els seus paràmetres. */
export interface Layer {
  scene: SceneId;
  race_id: string | null;
  sex?: "M" | "F";
  bib?: string;
  from_km?: number;
  to_km?: number;
  label?: string; // nom del segment
  device?: string; // id de motxilla
  point?: number; // id de control
  other?: string; // id de persona externa (chyron d'altres)
  position?: number; // posició 1-5 (etiqueta de posició)
}

export interface Program {
  layers: Partial<Record<Slot, Layer>>;
  ticker: boolean;
  updated_at: string;
}

export const EMPTY_PROGRAM = (): Program => ({ layers: {}, ticker: false, updated_at: new Date().toISOString() });
