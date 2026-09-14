export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getRunners } from "@/lib/raceEngine";

export async function GET() {
  const runners = getRunners();
  const data = runners.map((r) => ({
    "nº Dorsal": r.bib,
    Corredor: r.first_name,
    Apellidos: r.last_name,
    Genero: r.gender === "F" ? "MUJER" : "HOMBRE",
    Nacionalidad: r.nationality ?? "",
    Equipo: r.team ?? "",
    Estado: r.status,
    Vueltas: r.laps_completed,
    Km: r.total_km,
    Desnivel: r.total_elevation,
    "Ultima Volta": r.last_lap_at ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CORREDORS");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="infinite_race_export.xlsx"`,
    },
  });
}
