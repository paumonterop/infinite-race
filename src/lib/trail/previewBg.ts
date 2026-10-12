import type { CSSProperties } from "react";

/** Fons que es veu darrere les escenes a la previsualització i al programa de la consola de broadcast (no afecta la sortida). */
export type PreviewBgMode = "dark" | "green" | "color" | "transparent";
export interface PreviewBg {
  mode: PreviewBgMode;
  color: string; // només per al mode "color"
}

export const GREEN = "#00B140"; // verd croma habitual
export const DEFAULT_PREVIEW_BG: PreviewBg = { mode: "green", color: GREEN };

export const PREVIEW_BG_LABEL: Record<PreviewBgMode, string> = {
  dark: "Fosc",
  green: "Verd croma",
  color: "Color a mida",
  transparent: "Transparent (quadrícula)",
};

export function previewBgOf(ev: { preview_bg?: Partial<PreviewBg> } | null | undefined): PreviewBg {
  const b = ev?.preview_bg;
  const mode: PreviewBgMode = b?.mode && ["dark", "green", "color", "transparent"].includes(b.mode) ? b.mode : DEFAULT_PREVIEW_BG.mode;
  const color = typeof b?.color === "string" && /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : DEFAULT_PREVIEW_BG.color;
  return { mode, color };
}

export function previewBgStyle(bg: PreviewBg): CSSProperties {
  switch (bg.mode) {
    case "dark":
      return { background: "#1b2230" };
    case "green":
      return { background: GREEN };
    case "color":
      return { background: bg.color };
    case "transparent":
      // quadrícula de transparència
      return {
        backgroundColor: "#1b2230",
        backgroundImage: "conic-gradient(#2d3547 25%, transparent 0 50%, #2d3547 0 75%, transparent 0)",
        backgroundSize: "28px 28px",
      };
  }
}
