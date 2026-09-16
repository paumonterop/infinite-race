"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { useLive } from "@/lib/client/useLive";

const PRESETS = [30, 45, 60, 90];

// datetime-local inputs work with "yyyy-MM-ddTHH:mm" in the browser's local time,
// so we convert to/from the ISO string stored on the race record.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function ConfigPage() {
  const { data: race, refetch } = useLive<any>("/api/race", ["race:changed"], 4000);
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [gpsDevices, setGpsDevices] = useState<any[] | null>(null);
  const [gpsStatus, setGpsStatus] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [vmixStatus, setVmixStatus] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [vmixLoading, setVmixLoading] = useState(false);

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
        auto_start_enabled: !!race.auto_start_enabled,
        scheduled_start_local: isoToLocalInput(race.scheduled_start_at),
        gps_server_url: race.gps_server_url ?? "",
        gps_selected_ids: Array.isArray(race.gps_selected_ids) ? race.gps_selected_ids : [],
        vmix_host: race.vmix_host ?? "",
        vmix_port: race.vmix_port ?? 8099,
        vmix_auto_select: !!race.vmix_auto_select,
        vmix_gps_map: race.vmix_gps_map ?? {},
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
        auto_start_enabled: !!form.auto_start_enabled,
        scheduled_start_at: form.auto_start_enabled ? localInputToIso(form.scheduled_start_local) : null,
        gps_server_url: form.gps_server_url ? form.gps_server_url.trim() : null,
        gps_selected_ids: form.gps_selected_ids ?? [],
        vmix_host: form.vmix_host ? form.vmix_host.trim() : null,
        vmix_port: Number(form.vmix_port) || 8099,
        vmix_auto_select: !!form.vmix_auto_select,
        vmix_gps_map: form.vmix_gps_map ?? {},
      }),
    });
    setSaved(true);
    refetch();
    setTimeout(() => setSaved(false), 2000);
  }

  async function loadGpsDevices() {
    setGpsLoading(true);
    setGpsStatus(null);
    // Guardem primer la URL, si ha canviat, perquè el proxy del servidor la faci servir.
    await fetch("/api/race", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gps_server_url: form.gps_server_url ? form.gps_server_url.trim() : null }),
    });
    try {
      const res = await fetch("/api/gps/devices", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setGpsStatus({ type: "error", message: json.message || "Error connectant amb el servidor GPS" });
        setGpsDevices(null);
      } else {
        setGpsDevices(json.devices ?? []);
        setGpsStatus({ type: "ok", message: `${json.devices?.length ?? 0} dispositius trobats` });
      }
    } catch (e: any) {
      setGpsStatus({ type: "error", message: "Error de connexió: " + e.message });
      setGpsDevices(null);
    } finally {
      setGpsLoading(false);
      refetch();
    }
  }

  function toggleGpsDevice(gpsId: string) {
    const current: string[] = form.gps_selected_ids ?? [];
    const next = current.includes(gpsId) ? current.filter((id) => id !== gpsId) : [...current, gpsId];
    setForm({ ...form, gps_selected_ids: next });
  }

  async function testVmixConnection() {
    setVmixLoading(true);
    setVmixStatus(null);
    // Guardem primer host/port perquè el proxy del servidor els faci servir.
    await fetch("/api/race", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vmix_host: form.vmix_host ? form.vmix_host.trim() : null,
        vmix_port: Number(form.vmix_port) || 8099,
      }),
    });
    try {
      const res = await fetch("/api/vmix/tally", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setVmixStatus({ type: "error", message: json.message || "Error connectant amb vMix" });
      } else {
        const inputs = json.programInputs?.length ? json.programInputs.join(", ") : "cap";
        setVmixStatus({ type: "ok", message: `Connectat ✓ — input(s) en PROGRAM ara mateix: ${inputs}` });
      }
    } catch (e: any) {
      setVmixStatus({ type: "error", message: "Error de connexió: " + e.message });
    } finally {
      setVmixLoading(false);
      refetch();
    }
  }

  function setVmixInputFor(gpsId: string, value: string) {
    const map = { ...(form.vmix_gps_map ?? {}) };
    if (!value) {
      delete map[gpsId];
    } else {
      map[gpsId] = Number(value);
    }
    setForm({ ...form, vmix_gps_map: map });
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

        <Section title="Inici de la cursa">
          <Field label="Mode d'inici">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, auto_start_enabled: false })}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  !form.auto_start_enabled ? "bg-sky-500 text-black" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                Manual (prement START)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, auto_start_enabled: true })}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  form.auto_start_enabled ? "bg-sky-500 text-black" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                Programat (hora concreta)
              </button>
            </div>
          </Field>
          {form.auto_start_enabled && (
            <Field label="Data i hora d'inici">
              <input
                type="datetime-local"
                className="input"
                value={form.scheduled_start_local}
                onChange={(e) => setForm({ ...form, scheduled_start_local: e.target.value })}
              />
              <p className="mt-2 text-xs text-slate-500">
                Quan arribi aquesta hora, la cursa arrencarà sola (cal que ja hi hagi corredors
                carregats). Igualment sempre pots prémer START manualment abans si cal.
              </p>
            </Field>
          )}
          {!form.auto_start_enabled && (
            <p className="text-xs text-slate-500">
              La cursa només s'iniciarà quan premis el botó START al Dashboard.
            </p>
          )}
        </Section>

        <Section title="GPS / Perfil de la cursa">
          <Field label="URL del servidor GPS (gps_server.py)">
            <input
              className="input"
              placeholder="http://10.147.17.5:10009"
              value={form.gps_server_url}
              onChange={(e) => setForm({ ...form, gps_server_url: e.target.value })}
            />
          </Field>
          <p className="text-xs text-slate-500">
            El GPX i les voltes/traça circular es gestionen des de{" "}
            <code className="rounded bg-white/10 px-1">{form.gps_server_url || "http://IP:PORT"}/ui</code>.
            Aquí només cal indicar la URL del servidor i triar quins GPS es mostren al gràfic de
            perfil de la retransmissió.
          </p>

          <button
            type="button"
            onClick={loadGpsDevices}
            disabled={gpsLoading || !form.gps_server_url}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20 disabled:opacity-40"
          >
            {gpsLoading ? "Connectant..." : "Desar URL i actualitzar dispositius"}
          </button>
          {gpsStatus && (
            <p className={`text-xs font-bold ${gpsStatus.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {gpsStatus.message}
            </p>
          )}

          {gpsDevices && gpsDevices.length > 0 && (
            <div className="mt-2">
              <span className="mb-2 block text-xs font-semibold text-slate-400">
                GPS a mostrar al perfil (cap seleccionat = es mostren tots)
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {gpsDevices.map((d) => {
                  const checked = (form.gps_selected_ids ?? []).includes(d.gps_id);
                  return (
                    <label
                      key={d.gps_id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        checked ? "border-sky-500 bg-sky-500/10" : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleGpsDevice(d.gps_id)} />
                      <span className="font-bold">{d.display_name}</span>
                      <span
                        className={`ml-auto h-2 w-2 rounded-full ${
                          d.status === "online" ? "bg-emerald-400" : "bg-slate-600"
                        }`}
                        title={d.status}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </Section>

        <Section title="vMix — selecció automàtica de GPS">
          <p className="text-xs text-slate-500">
            Connecta amb l'API TCP de vMix (Settings → General → activar API a vMix) per detectar
            automàticament quin input està en PROGRAM i mostrar al perfil el GPS del corredor
            corresponent, segons la relació que estableixis a sota.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="IP del vMix">
                <input
                  className="input"
                  placeholder="192.168.1.50"
                  value={form.vmix_host}
                  onChange={(e) => setForm({ ...form, vmix_host: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Port TCP">
              <input
                type="number"
                className="input"
                placeholder="8099"
                value={form.vmix_port}
                onChange={(e) => setForm({ ...form, vmix_port: e.target.value })}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={testVmixConnection}
            disabled={vmixLoading || !form.vmix_host}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20 disabled:opacity-40"
          >
            {vmixLoading ? "Connectant..." : "Desar i provar connexió"}
          </button>
          {vmixStatus && (
            <p className={`text-xs font-bold ${vmixStatus.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {vmixStatus.message}
            </p>
          )}

          <Field label="Activació">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, vmix_auto_select: false })}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  !form.vmix_auto_select ? "bg-sky-500 text-black" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                Manual (tries els GPS a la secció GPS)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, vmix_auto_select: true })}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  form.vmix_auto_select ? "bg-sky-500 text-black" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                Automàtic (segueix el PROGRAM de vMix)
              </button>
            </div>
          </Field>

          {gpsDevices && gpsDevices.length > 0 ? (
            <div className="mt-2">
              <span className="mb-2 block text-xs font-semibold text-slate-400">
                Relació GPS ↔ input de vMix (deixa en blanc si aquest GPS no té una càmera fixa)
              </span>
              <div className="space-y-2">
                {gpsDevices.map((d) => (
                  <div
                    key={d.gps_id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
                  >
                    <span className="w-24 font-bold">{d.display_name}</span>
                    <span className="text-xs text-slate-500">input vMix nº</span>
                    <input
                      type="number"
                      min={1}
                      className="input w-24"
                      placeholder="—"
                      value={form.vmix_gps_map?.[d.gps_id] ?? ""}
                      onChange={(e) => setVmixInputFor(d.gps_id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Ves a la secció «GPS / Perfil de la cursa» i prem «Actualitzar dispositius» per poder
              relacionar cada GPS amb el seu input de vMix.
            </p>
          )}
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
