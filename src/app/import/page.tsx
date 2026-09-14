"use client";
import { useState } from "react";
import Nav from "@/components/Nav";

export default function ImportPage() {
  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [fileName, setFileName] = useState("");

  async function handleFile(file: File) {
    setLoading(true);
    setResult(null);
    setFileName(file.name);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const json = await res.json();
    setPreview(json);
    setLoading(false);
  }

  async function confirmImport() {
    setLoading(true);
    const valid = preview.rows.filter((r: any) => r.bib !== null);
    const res = await fetch("/api/import/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: valid }),
    });
    const json = await res.json();
    setResult(json);
    setPreview(null);
    setLoading(false);
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-2 text-xl font-black">Importar corredors des d'Excel</h1>
        <p className="mb-6 text-sm text-slate-400">
          Puja el fitxer .xlsx amb els corredors. El sistema detecta les columnes automàticament
          (dorsal, nom, cognoms, gènere, nacionalitat, equip), encara que els noms no coincideixin
          exactament amb un format estàndard.
        </p>

        <div className="mb-6 flex items-center gap-4">
          <label className="cursor-pointer rounded-lg bg-sky-500 px-5 py-3 font-bold text-black hover:bg-sky-400">
            Seleccionar fitxer .xlsx
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          {fileName && <span className="text-slate-400">{fileName}</span>}
          <a
            href="/api/export"
            className="ml-auto rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            ⬇ Exportar dades actuals a Excel
          </a>
        </div>

        {loading && <p className="text-slate-400">Processant...</p>}

        {result && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-emerald-300">
            Importació completada: {result.created} corredors nous, {result.updated} actualitzats.
            {result.errors?.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-amber-300">
                {result.errors.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {preview && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Full utilitzat: <span className="font-bold text-white">{preview.sheetUsed}</span> ·{" "}
                {preview.rows.length} files detectades
              </p>
              <button
                onClick={confirmImport}
                className="rounded-lg bg-emerald-500 px-5 py-2 font-bold text-black hover:bg-emerald-400"
              >
                ✓ Confirmar importació
              </button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 p-3 text-xs sm:grid-cols-6">
              {Object.entries(preview.detectedColumns).map(([field, col]) => (
                <div key={field}>
                  <div className="text-slate-500">{field}</div>
                  <div className={col ? "font-bold text-emerald-400" : "font-bold text-red-400"}>
                    {(col as string) ?? "no detectat"}
                  </div>
                </div>
              ))}
            </div>

            <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0b0f14] text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2">FILA</th>
                    <th className="px-3 py-2">DORSAL</th>
                    <th className="px-3 py-2">NOM</th>
                    <th className="px-3 py-2">COGNOMS</th>
                    <th className="px-3 py-2">SEXE</th>
                    <th className="px-3 py-2">EQUIP</th>
                    <th className="px-3 py-2">ACCIÓ</th>
                    <th className="px-3 py-2">ERRORS</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r: any) => (
                    <tr
                      key={r.rowIndex}
                      className={`border-t border-white/5 ${r.errors.length ? "bg-red-500/5" : ""}`}
                    >
                      <td className="px-3 py-1.5 text-slate-500">{r.rowIndex}</td>
                      <td className="px-3 py-1.5 font-mono">{r.bib ?? "—"}</td>
                      <td className="px-3 py-1.5">{r.first_name}</td>
                      <td className="px-3 py-1.5">{r.last_name}</td>
                      <td className="px-3 py-1.5">{r.gender}</td>
                      <td className="px-3 py-1.5 text-slate-400">{r.team ?? "—"}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${
                            r.action === "CREATE"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-sky-500/15 text-sky-400"
                          }`}
                        >
                          {r.action === "CREATE" ? "NOU" : "ACTUALITZA"}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-red-400">{r.errors.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
