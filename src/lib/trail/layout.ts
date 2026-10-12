import type { CSSProperties } from "react";

/** Posició i mida a pantalla d'escenes petites (cronòmetres, etiqueta de posició). Codi pur (client i servidor). */
export type Corner = "tl" | "tr" | "bl" | "br";
export interface LayoutCfg {
  corner: Corner;
  scale: number; // 0.5 .. 1.5
}
export type LayoutKey = "chrono" | "tag" | "mini";

export const DEFAULT_LAYOUT: Record<LayoutKey, LayoutCfg> = {
  chrono: { corner: "tr", scale: 1 },
  tag: { corner: "tl", scale: 1 },
  mini: { corner: "br", scale: 1 },
};

export const LAYOUT_LABEL: Record<LayoutKey, string> = { chrono: "Cronòmetres", tag: "Etiqueta de posició", mini: "Classificació petita" };

export const CORNER_LABEL: Record<Corner, string> = { tl: "Dalt esquerra", tr: "Dalt dreta", bl: "Baix esquerra", br: "Baix dreta" };

export function layoutOf(ev: { layout?: Partial<Record<LayoutKey, Partial<LayoutCfg>>> } | null | undefined, key: LayoutKey): LayoutCfg {
  const c = ev?.layout?.[key];
  const corner = c?.corner && ["tl", "tr", "bl", "br"].includes(c.corner) ? c.corner : DEFAULT_LAYOUT[key].corner;
  const scale = typeof c?.scale === "number" && c.scale >= 0.5 && c.scale <= 1.5 ? c.scale : DEFAULT_LAYOUT[key].scale;
  return { corner, scale };
}

export const isLeft = (c: Corner) => c[1] === "l";

/** Estil de contenidor ancorat a la cantonada triada (les de baix respecten el ticker amb --sb). */
export function cornerStyle(cfg: LayoutCfg): CSSProperties {
  const top = cfg.corner[0] === "t";
  const left = isLeft(cfg.corner);
  return {
    position: "absolute",
    [top ? "top" : "bottom"]: top ? 40 : "var(--sb, 48px)",
    [left ? "left" : "right"]: 48,
    transform: cfg.scale === 1 ? undefined : `scale(${cfg.scale})`,
    transformOrigin: `${top ? "top" : "bottom"} ${left ? "left" : "right"}`,
  };
}
