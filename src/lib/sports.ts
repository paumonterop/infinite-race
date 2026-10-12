/**
 * Registre de modalitats de la suite. Cada modalitat defineix com es presenta i quines seccions té un
 * esdeveniment d'aquest tipus (cada esdeveniment té les seves pròpies eines i grafismes).
 * Per afegir-ne una de nova: una entrada aquí + les seves pàgines sota /events/<id>/... (o la seva ruta pròpia).
 */
export type SportId = "trail" | "backyard";

export interface SportSection {
  href: string;
  label: string;
}

export interface SportDef {
  id: SportId;
  label: string;
  tagline: string;
  badge: string; // text curt per a les targetes
  accent: string;
  sections: (base: string) => SportSection[];
}

export const SPORTS: Record<SportId, SportDef> = {
  trail: {
    id: "trail",
    label: "Cursa de muntanya",
    tagline: "Curses amb LiveTrail, GPX, motxilles GPS i passos per control.",
    badge: "TRAIL",
    accent: "#fc5a00",
    sections: (base) => [
      { href: base, label: "Dashboard" },
      { href: `${base}/runners`, label: "Corredors" },
      { href: `${base}/stats`, label: "Estadístiques" },
      { href: `${base}/map`, label: "Mapa GPS" },
      { href: `${base}/broadcast`, label: "Broadcast" },
      { href: `${base}/config`, label: "Configuració" },
    ],
  },
  backyard: {
    id: "backyard",
    label: "Backyard / Infinite Race",
    tagline: "Voltes per hora amb eliminació, control de volta i classificació.",
    badge: "BACKYARD",
    accent: "#0EA5E9",
    sections: () => [
      { href: "/backyard", label: "Dashboard" },
      { href: "/control", label: "Control de Volta" },
      { href: "/runners", label: "Corredors" },
      { href: "/leaderboard", label: "Classificacions" },
      { href: "/stats", label: "Estadístiques" },
      { href: "/import", label: "Importar" },
      { href: "/broadcast-control", label: "Broadcast" },
      { href: "/config", label: "Configuració" },
    ],
  },
};
