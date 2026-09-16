"use client";
import { useMemo, useState } from "react";
import Nav from "@/components/Nav";
import StatusBadge from "@/components/StatusBadge";
import ConfirmButton from "@/components/ConfirmButton";
import { useLive } from "@/lib/client/useLive";

const STATUSES = ["PENDING", "ACTIVE", "LAP_COMPLETED", "NP", "ELIMINATED", "RETIRED", "DISQUALIFIED"];

export default function RunnersPage() {
  const { data: runners, refetch } = useLive<any[]>("/api/runners", ["runners:changed"], 3000);
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"bib" | "laps">("bib");
  const [editing, setEditing] = useState<any | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    let list = runners ?? [];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          String(r.bib).includes(q) ||
          r.first_name.toLowerCase().includes(q) ||
          r.last_name.toLowerCase().includes(q)
      );
    }
    if (genderFilter !== "ALL") list = list.filter((r) => r.gender === genderFilter);
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    list = [...list].sort((a, b) => (sortBy === "bib" ? a.bib - b.bib : b.laps_completed - a.laps_completed));
    return list;
  }, [runners, query, genderFilter, statusFilter, sortBy]);

  async function saveRunner(payload: any) {
    if (payload.id) {
      await fetch(`/api/runners/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/runners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setEditing(null);
    setAdding(false);
    refetch();
  }

  async function removeRunner(id: string) {
    await fetch(`/api/runners/${id}`, { method: "DELETE" });
    refetch();
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/runners/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    refetch();
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-xl font-black">Corredors ({runners?.length ?? 0})</h1>
          <input
            placeholder="Cerca dorsal o nom"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-sky-500"
          />
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <option value="ALL">Tots els gèneres</option>
            <option value="M">Homes</option>
            <option value="F">Dones</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <option value="ALL">Tots els estats</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <option value="bib">Ordenar per dorsal</option>
            <option value="laps">Ordenar per voltes</option>
          </select>
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg bg-sky-500 px-4 py-2 font-bold text-black hover:bg-sky-400"
          >
            + Afegir corredor
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">DORSAL</th>
                <th className="px-4 py-3">NOM</th>
                <th className="px-4 py-3">SEXE</th>
                <th className="px-4 py-3">EQUIP</th>
                <th className="px-4 py-3">VOLTES</th>
                <th className="px-4 py-3">KM</th>
                <th className="px-4 py-3">ESTAT</th>
                <th className="px-4 py-3 text-right">ACCIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-2 font-mono">{r.bib}</td>
                  <td className="px-4 py-2 font-semibold">
                    {r.first_name} {r.last_name}
                  </td>
                  <td className="px-4 py-2">{r.gender === "F" ? "D" : "H"}</td>
                  <td className="px-4 py-2 text-slate-400">{r.team ?? "—"}</td>
                  <td className="px-4 py-2 mono-num">{r.laps_completed}</td>
                  <td className="px-4 py-2 mono-num">{r.total_km}</td>
                  <td className="px-4 py-2">
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value)}
                      className="rounded border border-white/10 bg-transparent px-1 py-0.5 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option className="bg-[#0b0f14]" key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <span className="ml-2">
                      <StatusBadge status={r.status} />
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(r)}
                        className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
                      >
                        Editar
                      </button>
                      <ConfirmButton
                        onConfirm={() => removeRunner(r.id)}
                        className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        Eliminar
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Cap corredor coincideix amb els filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {(editing || adding) && (
        <RunnerModal
          runner={editing}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSave={saveRunner}
        />
      )}
    </div>
  );
}

function RunnerModal({
  runner,
  onClose,
  onSave,
}: {
  runner: any | null;
  onClose: () => void;
  onSave: (payload: any) => void;
}) {
  const [form, setForm] = useState({
    id: runner?.id,
    bib: runner?.bib ?? "",
    first_name: runner?.first_name ?? "",
    last_name: runner?.last_name ?? "",
    gender: runner?.gender ?? "M",
    nationality: runner?.nationality ?? "",
    team: runner?.team ?? "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f151d] p-6">
        <h2 className="mb-4 text-lg font-black">{runner ? "Editar corredor" : "Afegir corredor"}</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dorsal">
              <input
                type="number"
                value={form.bib}
                onChange={(e) => setForm({ ...form, bib: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Gènere">
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="input"
              >
                <option value="M">Home</option>
                <option value="F">Dona</option>
              </select>
            </Field>
          </div>
          <Field label="Nom">
            <input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Cognoms">
            <input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nacionalitat">
              <input
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Equip">
              <input
                value={form.team}
                onChange={(e) => setForm({ ...form, team: e.target.value })}
                className="input"
              />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 hover:bg-white/10">
            Cancel·lar
          </button>
          <button
            onClick={() => onSave({ ...form, bib: Number(form.bib) })}
            className="rounded-lg bg-sky-500 px-4 py-2 font-bold text-black hover:bg-sky-400"
          >
            Desar
          </button>
        </div>
      </div>
      <style jsx global>{`
        .input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          outline: none;
        }
        .input:focus {
          border-color: #0ea5e9;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-400">{label}</span>
      {children}
    </label>
  );
}
