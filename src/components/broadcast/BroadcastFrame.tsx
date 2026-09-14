"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function BroadcastFrame({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const transparent = params.get("transparent") === "1";
  const [scale, setScale] = useState(1);

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
