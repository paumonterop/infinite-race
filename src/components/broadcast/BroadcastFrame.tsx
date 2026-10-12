"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Llenç 1920x1080 escalat a la finestra. TRANSPARENT per defecte (vMix/OBS); ?transparent=0 posa un fons fosc per
 * mirar-les al navegador.
 */
export default function BroadcastFrame({ children, transparentDefault = true }: { children: React.ReactNode; transparentDefault?: boolean }) {
  const params = useSearchParams();
  const p = params.get("transparent");
  const transparent = p == null ? transparentDefault : p === "1";
  const [scale, setScale] = useState(1);

  // El fons fosc global (html/body) també s'ha de treure, si no a vMix/OBS no és transparent de debò.
  useEffect(() => {
    if (!transparent) return;
    document.documentElement.classList.add("bc-transparent");
    return () => document.documentElement.classList.remove("bc-transparent");
  }, [transparent]);

  useEffect(() => {
    const fit = () => {
      const sx = window.innerWidth / 1920;
      const sy = window.innerHeight / 1080;
      setScale(Math.min(sx, sy));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: transparent ? "transparent" : "#05070a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 1920,
          height: 1080,
          flexShrink: 0, // sense això el llenç s'encongeix dins el flex i l'escalat el descentra
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          position: "relative",
          background: transparent ? "transparent" : "linear-gradient(160deg,#0b0f14,#05070a)",
          fontFamily: "ui-sans-serif, system-ui, Arial, sans-serif",
          color: "#fff",
        }}
      >
        {children}
      </div>
    </div>
  );
}
