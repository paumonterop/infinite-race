"use client";
import { Suspense } from "react";
import BroadcastFrame from "@/components/broadcast/BroadcastFrame";
import Ticker from "@/components/broadcast/Ticker";

function TickerPage() {
  return (
    <BroadcastFrame>
      <Ticker />
    </BroadcastFrame>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TickerPage />
    </Suspense>
  );
}
