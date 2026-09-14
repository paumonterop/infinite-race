"use client";

/**
 * Contenidor compacte per als gràfics de broadcast (classificació, líder,
 * eliminats...). Es col·loca a la banda esquerra i ocupa només una part
 * de la pantalla perquè la resta quedi lliure per a la imatge/vídeo,
 * seguint l'estètica d'un graphics package de retransmissió esportiva.
 */
export default function Panel({
  children,
  top = 56,
  width = 560,
  maxHeight = 900,
}: {
  children: React.ReactNode;
  top?: number;
  width?: number;
  maxHeight?: number;
}) {
  return (
    <div
      className="animate-pop-in"
      style={{
        position: "absolute",
        left: 40,
        top,
        width,
        maxHeight,
        overflow: "hidden",
        background: "rgba(8,12,18,0.88)",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
        padding: "22px 26px",
      }}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  badge,
  accent = "#0EA5E9",
}: {
  title: string;
  badge?: string;
  accent?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <div style={{ width: 6, height: 26, background: accent, borderRadius: 3 }} />
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: 0.5 }}>{title}</h1>
      {badge && (
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: accent,
            border: `2px solid ${accent}`,
            borderRadius: 999,
            padding: "2px 12px",
            marginLeft: 2,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
