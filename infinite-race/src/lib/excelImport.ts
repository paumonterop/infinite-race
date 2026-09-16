import * as XLSX from "xlsx";

export interface ParsedRunnerRow {
  rowIndex: number;
  bib: number | null;
  first_name: string;
  last_name: string;
  gender: "M" | "F";
  nationality: string | null;
  team: string | null;
  laps_completed: number;
  errors: string[];
}

export interface ParseResult {
  sheetUsed: string;
  detectedColumns: Record<string, string | null>;
  rows: ParsedRunnerRow[];
}

// Aliases (lowercased, accent-insensitive) used to detect each logical field.
const ALIASES: Record<string, string[]> = {
  bib: ["dorsal", "no dorsal", "n dorsal", "bib", "num", "numero", "nº dorsal"],
  first_name: ["corredor", "nombre", "nom", "name", "first name", "firstname"],
  last_name: ["apellidos", "cognoms", "apellido", "cognom", "last name", "lastname", "surname"],
  gender: ["genero", "gènere", "genere", "sexo", "sexe", "gender", "sex"],
  nationality: ["nacionalidad", "nacionalitat", "nationality", "pais", "país"],
  team: ["equipo", "equip", "team", "club"],
  laps: ["vueltas", "voltes", "laps"],
  km: ["km", "kms", "kilometros", "kilometres"],
  elevation: ["desnivel", "desnivell", "elevation", "d+"],
};

function normalize(s: any): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function matchColumn(header: string, keys: string[]): boolean {
  const h = normalize(header);
  return keys.some((k) => h === k || h.includes(k));
}

function detectHeaderRow(rows: any[][]): number {
  // Look through first 6 rows for the row that best matches known headers.
  let best = 0;
  let bestScore = -1;
  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    const row = rows[r] || [];
    let score = 0;
    for (const cell of row) {
      const norm = normalize(cell);
      if (!norm) continue;
      for (const keys of Object.values(ALIASES)) {
        if (matchColumn(norm, keys)) {
          score++;
          break;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

export function parseWorkbook(buffer: Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Prefer a sheet literally called "ORDEN DORSAL" (or similar), else the first sheet.
  const preferredNames = ["orden dorsal", "dorsal", "corredores", "runners", "participants"];
  const sheetName =
    wb.SheetNames.find((n) => preferredNames.includes(normalize(n))) ?? wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });

  const headerRowIdx = detectHeaderRow(raw);
  const headerRow = raw[headerRowIdx] || [];

  const colIndex: Record<string, number> = {};
  headerRow.forEach((cell: any, idx: number) => {
    const norm = normalize(cell);
    if (!norm) return;
    for (const [field, keys] of Object.entries(ALIASES)) {
      if (colIndex[field] === undefined && matchColumn(norm, keys)) {
        colIndex[field] = idx;
      }
    }
  });

  const detectedColumns: Record<string, string | null> = {};
  for (const field of Object.keys(ALIASES)) {
    detectedColumns[field] =
      colIndex[field] !== undefined ? String(headerRow[colIndex[field]]) : null;
  }

  const dataRows = raw.slice(headerRowIdx + 1);
  const rows: ParsedRunnerRow[] = [];

  dataRows.forEach((row, i) => {
    if (!row || row.every((c) => c === null || c === "")) return;

    const errors: string[] = [];
    const bibRaw = colIndex.bib !== undefined ? row[colIndex.bib] : null;
    const bib = bibRaw !== null && bibRaw !== "" && !isNaN(Number(bibRaw)) ? Math.trunc(Number(bibRaw)) : null;
    if (bib === null) errors.push("Dorsal no identificat o invàlid");

    const first_name = colIndex.first_name !== undefined ? String(row[colIndex.first_name] ?? "").trim() : "";
    const last_name = colIndex.last_name !== undefined ? String(row[colIndex.last_name] ?? "").trim() : "";
    if (!first_name && !last_name) errors.push("Nom no identificat");

    const genderRaw = normalize(colIndex.gender !== undefined ? row[colIndex.gender] : "");
    let gender: "M" | "F" = "M";
    if (["mujer", "dona", "d", "f", "femenino", "femeni", "woman", "w"].includes(genderRaw)) gender = "F";
    else if (["hombre", "home", "h", "m", "masculino", "masculi", "man"].includes(genderRaw)) gender = "M";

    const nationality = colIndex.nationality !== undefined ? String(row[colIndex.nationality] ?? "").trim() || null : null;
    const team = colIndex.team !== undefined ? String(row[colIndex.team] ?? "").trim() || null : null;
    const lapsRaw = colIndex.laps !== undefined ? row[colIndex.laps] : 0;
    const laps_completed = lapsRaw && !isNaN(Number(lapsRaw)) ? Math.trunc(Number(lapsRaw)) : 0;

    rows.push({
      rowIndex: headerRowIdx + 2 + i,
      bib,
      first_name,
      last_name,
      gender,
      nationality,
      team,
      laps_completed,
      errors,
    });
  });

  // Detect duplicate bibs within the file itself.
  const seen = new Map<number, number>();
  rows.forEach((r) => {
    if (r.bib === null) return;
    seen.set(r.bib, (seen.get(r.bib) ?? 0) + 1);
  });
  rows.forEach((r) => {
    if (r.bib !== null && (seen.get(r.bib) ?? 0) > 1) {
      r.errors.push("Dorsal duplicat dins del fitxer");
    }
  });

  return { sheetUsed: sheetName, detectedColumns, rows };
}
