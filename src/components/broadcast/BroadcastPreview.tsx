"use client";
import { useEffect, useRef, useState } from "react";

export default function BroadcastPreview({
  src,
  label,
  accent = "#0EA5E9",
  badge,
}: {
  src: string;
  label: string;
  accent?: string;
  badge?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1920);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);



  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest" style={{ color: accent }}>
          {label}
        </span>
        {badge && (
          <span
            className="rounded px-2 py-0.5 text-[10px] font-black"
            style={{ background: accent, color: "#05070a" }}
          >
            {badge}
          </span>
        )}
      </div>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border-2"
        style={{ borderColor: accent, aspectRatio: "16/9", background: "#05070a" }}
      >
        <iframe
          src={src}
          title={label}
          style={{
            width: 1920,
            height: 1080,
            border: "none",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
