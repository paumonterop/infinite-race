"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "./socket";

export function useLive<T>(url: string, events: string[] = ["state:update"], pollMs = 4000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (mounted.current) {
        setData(json);
        setError(null);
      }
    } catch (e: any) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    mounted.current = true;
    refetch();
    const socket = getSocket();
    const handler = () => refetch();
    events.forEach((ev) => socket.on(ev, handler));
    const interval = setInterval(refetch, pollMs);
    return () => {
      mounted.current = false;
      events.forEach((ev) => socket.off(ev, handler));
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { data, loading, error, refetch };
}
