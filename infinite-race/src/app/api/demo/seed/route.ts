export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { seedDemoRunners } from "@/lib/demoData";

export async function POST() {
  const runners = seedDemoRunners();
  return NextResponse.json({ count: runners.length, runners });
}
