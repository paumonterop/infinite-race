"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { useLive } from "@/lib/client/useLive";

const PRESETS = [30, 45, 60, 90];

export default function ConfigPage() {
  const { data: race, refetch } = useLive<any>("/api/race", ["race:changed"], 4000);
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (race && !form) {
      const thresholds = JSON.parse(race.alert_thresholds);
      setForm({
        name: race.name,
        lap_minutes: race.lap_duration_seconds / 60,
        distance_per_lap_km: race.distance_per_lap_km,
        elevation_per_lap_m: race.elevation_per_lap_m,
        max_laps: race.max_laps ?? "",
        elimination_rule: race.elimination_rule,
        primary_color: race.primary_color,
        accent_color: race.accent_color,
        alert_normal: thresholds.normal / 60,
        alert_alert: thresholds.alert / 60,
        alert_critical: thresholds.critical,
        alert_final: thresholds.final,
      });
    }
  }, [race]);

  if (!form) {
    return (
      <div>
        <Nav />
        <main className="p-6 text-slate-500">Carregant...</main>
      </div>
    );
  }

  async function save() {
    await fetch("/api/race", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        lap_duration_seconds: Math.round(Number(form.lap_minutes) * 60),
        distance_per_lap_km: Number(form.distance_per_lap_km),
        elevation_per_lap_m: Number(form.elevation_per_lap_m),
        max_laps: form.max_laps ? Number(form.max_laps) : null,
        elimination_rule: form.elimination_rule,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        alert_thresholds: JSON.stringify({
          normal: Math.round(Number(form.alert_normal) * 60),
          alert: Math.round(Number(form.alert_alert) * 60),
          critical: Number(form.alert_critical),
          final: Number(form.alert_final),
        }),
      }),
    });
    setSaved(true);
    refetch();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-4 text-xl font-black">Configuració de la cursa</h1>

        <Section title="General">
          <Field label="Nom de la cursa">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Número màxim de voltes (opcional)">
            <input
              type="number"
              className="input"
              value={form.max_laps}
              onChange={(e) => setForm({ ...form, max_laps: e.target.value })}
              placeholder="Sense límit"
            />
          </Field>
        </Section>

        <Section title="Volta">
          <Field label="Durada de volta (minuts)">
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, lap_minutes: p })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                    Number(form.lap_minutes) === p ? "bg-sky-500 text-black" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {p} min
                </button>
              ))}
              <input
                type="number"
                className="input w-24"
                value={form.lap_minutes}
                onChange={(e) => setForm({ ...form, lap_minutes: e.target.value })}
              />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Distància per volta (km)">
              <input
                type="number"
                step="0.01"
                className="input"
                value={form.distance_per_lap_km}
                onChange={(e) => setForm({ ...form, distance_per_lap_km: e.target.value })}
              />
            </Field>
            <Field label="Desnivell per volta (m)">
              <input
                type="number"
                className="input"
                value={form.elevation_per_lap_m}
                onChange={(e) => setForm({ ...form, elevation_per_lap_m: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Regla per no completar la volta">
            <select
              className="input"
              value={form.elimination_rule}
              onChange={(e) => setForm({ ...form, elimination_rule: e.target.value })}
            >
              <option value="ELIMINATE">Eliminar (Backyard Ultra estàndard)</option>
              <option value="RETIRE">Marcar com a Retirat</option>
              <option value="NONE">No fer res automàticament</option>
            </select>
          </Field>
        </Section>

        <Section title="Llindars del cronòmetre">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Alerta normal→groc (minuts restants)">
              <input
                type="number"
                className="input"
                value={form.alert_normal}
                onChange={(e) => setForm({ ...form, alert_normal: e.target.value })}
              />
            </Field>
            <Field label="Groc→vermell (minuts restants)">
              <input
                type="number"
                className="input"
                value={form.alert_alert}
                onChange={(e) => setForm({ ...form, alert_alert: e.target.value })}
              />
            </Field>
            <Field label="Crític (segons restants)">
              <input
                type="number"
                className="input"
                value={form.alert_critical}
                onChange={(e) => setForm({ ...form, alert_critical: e.target.value })}
              />
            </Field>
            <Field label="Compte enrere final (segons)">
              <input
                type="number"
                className="input"
                value={form.alert_final}
                onChange={(e) => setForm({ ...form, alert_final: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Colors broadcast">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color principal">
              <input
                type="color"
                className="h-10 w-full rounded-lg border border-white/10 bg-transparent"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
              />
            </Field>
            <Field label="Color accent">
              <input
                type="color"
                className="h-10 w-full rounded-lg border border-white/10 bg-transparent"
                value={form.accent_color}
                onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <button onClick={save} className="rounded-lg bg-sky-500 px-6 py-3 font-bold text-black hover:bg-sky-400">
          {saved ? "✓ Desat" : "Desar configuració"}
        </button>
      </main>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-2xl border border-white/10 p-5">
      <h2 className="mb-4 text-xs font-bold tracking-widest text-slate-400">{title.toUpperCase()}</h2>
      <div className="space-y-3">{children}</div>
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
