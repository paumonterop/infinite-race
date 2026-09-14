export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createRunner, updateRunner, getRunnerByBib, logEvent } from "@/lib/raceEngine";
import { emitUpdate } from "@/lib/io";

export async function POST(req: NextRequest) {
  const { rows } = await req.json();
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (row.bib === null || row.bib === undefined) {
      errors.push(`Fila ${row.rowIndex}: sense dorsal, ignorada`);
      continue;
    }
    const existing = getRunnerByBib(Number(row.bib));
    try {
      if (existing) {
        updateRunner(existing.id, {
          first_name: row.first_name,
          last_name: row.last_name,
          gender: row.gender,
          nationality: row.nationality,
          team: row.team,
        });
        updated++;
      } else {
        createRunner({
          bib: Number(row.bib),
          first_name: row.first_name,
          last_name: row.last_name,
          gender: row.gender,
          nationality: row.nationality,
          team: row.team,
        });
        created++;
      }
    } catch (e: any) {
      errors.push(`Dorsal ${row.bib}: ${e.message}`);
    }
  }

  logEvent("IMPORT_COMPLETED", { message: `Importació: ${created} nous, ${updated} actualitzats` });
  emitUpdate("runners:changed");

  return NextResponse.json({ created, updated, errors });
}
