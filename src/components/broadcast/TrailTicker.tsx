"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/client/socket";
import type { FeedItem } from "@/lib/trail/feed";

const CARD_W = 620;
const GAP = 16;
const SCREEN_W = 1920;
const BASE_SPEED = 110; // px/s amb la cua buida
const MAX_SPEED = 420; // px/s quan la cua s'acumula

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Cinta de passos per control en temps real. Cada pas nou entra a una cua; quan hi ha espai
 * a la dreta de la cinta, el següent de la cua hi entra. Si la cua creix, la cinta accelera.
 */
export default function TrailTicker({ eventId, raceId, backlog = 6 }: { eventId: string; raceId?: string | null; backlog?: number }) {
  const queue = useRef<FeedItem[]>([]);
  const seq = useRef<number | null>(null);
  const cards = useRef<{ el: HTMLDivElement; x: number }[]>([]);
  const pendingX = useRef(SCREEN_W);
  const [pending, setPending] = useState(0);

  // Recepció de passos nous (socket + poll de seguretat)
  useEffect(() => {
    let stop = false;
    const q = raceId ? `&race=${encodeURIComponent(raceId)}` : "";
    const pull = async () => {
      try {
        const url =
          seq.current == null
            ? `/api/trail/events/${eventId}/feed?backlog=${backlog}${q}`
            : `/api/trail/events/${eventId}/feed?since=${seq.current}${q}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || stop) return;
        const d = await res.json();
        seq.current = d.seq;
        if (d.items.length) {
          queue.current.push(...d.items);
          setPending(queue.current.length);
        }
      } catch {
        /* reintent al proper cicle */
      }
    };
    pull();
    const socket = getSocket();
    socket.on("trail:feed", pull);
    const iv = setInterval(pull, 2500);
    return () => {
      stop = true;
      socket.off("trail:feed", pull);
      clearInterval(iv);
    };
  }, [eventId, raceId, backlog]);

  // Animació: mou les targetes i hi afegeix les de la cua
  const [live, setLive] = useState<FeedItem[]>([]);
  const liveRef = useRef<FeedItem[]>([]);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const backlogN = queue.current.length;
      const speed = Math.min(MAX_SPEED, BASE_SPEED + backlogN * 40);
      // desplaça
      for (const c of cards.current) {
        c.x -= speed * dt;
        c.el.style.transform = `translateX(${c.x}px)`;
      }
      // elimina les que han sortit
      if (cards.current.length && cards.current[0].x + CARD_W < -20) {
        cards.current.shift();
        liveRef.current = liveRef.current.slice(1);
        setLive(liveRef.current);
      }
      // entra la següent si hi ha espai a la dreta
      const lastCard = cards.current[cards.current.length - 1];
      const edge = lastCard ? lastCard.x + CARD_W + GAP : 0;
      if (queue.current.length && edge <= SCREEN_W) {
        const item = queue.current.shift()!;
        liveRef.current = [...liveRef.current, item];
        setLive(liveRef.current);
        setPending(queue.current.length);
        pendingX.current = Math.max(SCREEN_W, edge);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Registra l'element DOM de cada targeta nova amb la seva posició inicial
  const register = (el: HTMLDivElement | null, idx: number) => {
    if (!el) return;
    if (cards.current[idx]?.el === el) return;
    cards.current[idx] = { el, x: pendingX.current };
    el.style.transform = `translateX(${pendingX.current}px)`;
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 120,
        overflow: "hidden",
        background: "linear-gradient(90deg,#0b0f14,#111827)",
        borderTop: "3px solid #0EA5E9",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 250,
          zIndex: 3,
          background: "#0EA5E9",
          color: "#05070a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 24px",
          boxShadow: "8px 0 24px rgba(0,0,0,.5)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 30, lineHeight: 1 }}>PASSOS</div>
        <div style={{ fontWeight: 700, fontSize: 18, opacity: 0.75, marginTop: 4 }}>
          {pending > 0 ? `+${pending} en cua` : "EN DIRECTE"}
        </div>
      </div>

      <div style={{ position: "absolute", inset: 0 }}>
        {live.map((it, i) => (
          <div
            key={it.seq}
            ref={(el) => register(el, i)}
            style={{
              position: "absolute",
              top: 12,
              left: 0,
              width: CARD_W,
              height: 92,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "0 20px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: `2px solid ${it.is_finish ? "#facc15" : "rgba(255,255,255,0.1)"}`,
              borderLeft: `10px solid ${it.color}`,
              willChange: "transform",
            }}
          >
            <div style={{ textAlign: "center", minWidth: 78 }}>
              <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>#{it.bib}</div>
              <div style={{ fontSize: 14, fontWeight: 800, opacity: 0.6, marginTop: 2 }}>
                {it.race_name.toUpperCase().slice(0, 12)}
              </div>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {it.name}
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: it.is_finish ? "#facc15" : "#7dd3fc", whiteSpace: "nowrap" }}>
                {it.is_finish ? "🏁 " : "📍 "}
                {it.point_name} · km {it.point_km}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{fmtTime(it.race_time_s)}</div>
              <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.7 }}>
                {it.pos}º{it.pos_sex ? ` · ${it.sex === "F" ? "F" : "M"} ${it.pos_sex}º` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
