"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";
import LeaderboardPanel from "@/components/broadcast/LeaderboardPanel";
import { useLive } from "@/lib/client/useLive";

function LeaderboardOverlay() {
  const params = useSearchParams();
  const view = params.get("view") ?? "general";
  const showTicker = params.get("ticker") !== "0";
  const url =
    view === "men" ? "/api/leaderboard?gender=M" : view === "women" ? "/api/leaderboard?gender=F" : "/api/leaderboard";
  const { data: list } = useLive<any[]>(url, ["runners:changed"], 3000);
  const title = view === "men" ? "MASCULINA" : view === "women" ? "FEMENINA" : "GENERAL";

  return (
    <BroadcastFrame>
      <LeaderboardPanel list={list} title={title} />
      {showTicker && <Ticker />}
    </BroadcastFrame>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LeaderboardOverlay />
    </Suspense>
  );
}
