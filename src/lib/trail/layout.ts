import type { CSSProperties } from "react";

/** Posició i mida a pantalla d'escenes petites (cronòmetres, etiqueta de posició). Codi pur (client i servidor). */
export type Corner = "tl" | "tr" | "bl" | "br";
export interface LayoutCfg {
  corner: Corner;
  scale: number; // 0.5 .. 1.5
  /** marge horitzontal (px) des del costat de la cantonada; per defecte 48 */
  x?: number;
  /** marge vertical (px) des de dalt/baix de la cantonada; per defecte 40 (dalt) o 48 (baix) */
  y?: number;
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
  const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : undefined);
  return { corner, scale, x: num(c?.x, 1920), y: num(c?.y, 1080) };
}

export const isLeft = (c: Corner) => c[1] === "l";

/** Estil de contenidor ancorat a la cantonada triada, amb marges X/Y opcionals (les de baix respecten el ticker amb --sb). */
export function cornerStyle(cfg: LayoutCfg): CSSProperties {
  const top = cfg.corner[0] === "t";
  const left = isLeft(cfg.corner);
  const x = cfg.x ?? 48;
  let v: number | string;
  if (top) v = cfg.y ?? 40;
  else v = cfg.y == null ? "var(--sb, 48px)" : `calc(var(--sb, 48px) - 48px + ${cfg.y}px)`;
  return {
    position: "absolute",
    [top ? "top" : "bottom"]: v,
    [left ? "left" : "right"]: x,
    transform: cfg.scale === 1 ? undefined : `scale(${cfg.scale})`,
    transformOrigin: `${top ? "top" : "bottom"} ${left ? "left" : "right"}`,
  };
}
