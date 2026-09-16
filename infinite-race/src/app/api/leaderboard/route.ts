export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { leaderboardGeneral, leaderboardByGender } from "@/lib/selectors";

export async function GET(req: NextRequest) {
  const gender = req.nextUrl.searchParams.get("gender");
  if (gender === "M" || gender === "F") {
    return NextResponse.json(leaderboardByGender(gender));
  }
  return NextResponse.json(leaderboardGeneral());
}
