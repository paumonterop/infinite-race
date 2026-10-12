"use client";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Redueix la mida de lletra d'un element de text fins que hi càpiga (mesura scrollHeight vs clientHeight).
 * L'element ha de tenir un clamp de línies via CSS (display:-webkit-box + WebkitLineClamp + overflow:hidden).
 */
export function useAutoFit(text: string, { max = 52, min = 16 }: { max?: number; min?: number } = {}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      let size = max;
      el.style.fontSize = `${size}px`;
      while (size > min && el.scrollHeight > el.clientHeight + 1) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
      setFontSize(size);
    };
    measure();
    let ro: ResizeObserver | undefined;
    if (el.parentElement && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el.parentElement);
    }
    return () => ro?.disconnect();
  }, [text, max, min]);

  return { ref, fontSize };
}
