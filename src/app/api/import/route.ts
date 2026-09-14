export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { parseWorkbook } from "@/lib/excelImport";
import { getRunnerByBib } from "@/lib/raceEngine";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Cap fitxer rebut" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseWorkbook(buffer);

  const rowsWithStatus = parsed.rows.map((r) => {
    const existing = r.bib !== null ? getRunnerByBib(r.bib) : undefined;
    return {
      ...r,
      action: existing ? "UPDATE" : "CREATE",
      existingId: existing?.id ?? null,
    };
  });

  return NextResponse.json({
    sheetUsed: parsed.sheetUsed,
    detectedColumns: parsed.detectedColumns,
    rows: rowsWithStatus,
  });
}
