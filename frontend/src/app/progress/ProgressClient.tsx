"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { AuthUser, getStoredUser, getToken } from "@/lib/session";

type ProgressEntry = {
  id: number;
  client_id: number;
  measured_by_id?: number | null;
  weight?: number | null;
  body_fat?: number | null;
  muscle_percentage?: number | null;
  visceral_fat?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  arm_cm?: number | null;
  thigh_cm?: number | null;
  mood?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type MeasurementFormState = {
  weight: string;
  body_fat: string;
  muscle_percentage: string;
  visceral_fat: string;
  chest_cm: string;
  waist_cm: string;
  hip_cm: string;
  arm_cm: string;
  thigh_cm: string;
  mood: string;
  notes: string;
};

const emptyForm: MeasurementFormState = {
  weight: "",
  body_fat: "",
  muscle_percentage: "",
  visceral_fat: "",
  chest_cm: "",
  waist_cm: "",
  hip_cm: "",
  arm_cm: "",
  thigh_cm: "",
  mood: "Bien",
  notes: "",
};

const numericFields: Array<keyof Omit<MeasurementFormState, "mood" | "notes">> = [
  "weight",
  "body_fat",
  "muscle_percentage",
  "visceral_fat",
  "chest_cm",
  "waist_cm",
  "hip_cm",
  "arm_cm",
  "thigh_cm",
];

export function ProgressClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [clientId, setClientId] = useState("");
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<ProgressEntry | null>(null);
  const [form, setForm] = useState<MeasurementFormState>(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);
  const selectedClient = clients.find((client) => String(client.id) === clientId);
  const latest = progress[0];

  const loadClients = useCallback(async () => {
    if (!token) return;

    try {
      const response = await apiRequest<{ clients: AuthUser[] }>("/users/clients?per_page=100", { token });
      setClients(response.clients);
      if (!clientId && response.clients[0]) setClientId(String(response.clients[0].id));
    } catch {
      setClients([]);
    }
  }, [clientId, token]);

  const loadMeasurements = useCallback(async () => {
    if (!token || !clientId) {
      setProgress([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiRequest<{ progress: ProgressEntry[] }>(`/progress?client_id=${clientId}`, { token });
      setProgress(response.progress);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudieron cargar las mediciones.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (user?.role === "professional") void Promise.resolve().then(loadClients);
  }, [loadClients, user?.role]);

  useEffect(() => {
    if (user?.role === "professional") void Promise.resolve().then(loadMeasurements);
  }, [loadMeasurements, user?.role]);

  function updateField(field: keyof MeasurementFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildPayload() {
    const payload: Record<string, unknown> = {
      client_id: Number(clientId),
      mood: form.mood,
      notes: form.notes || null,
    };

    numericFields.forEach((field) => {
      payload[field] = form[field] ? Number(form[field]) : null;
    });

    return payload;
  }

  function startEdit(entry: ProgressEntry) {
    setEditingEntry(entry);
    setSuccess("");
    setError("");
    setForm({
      weight: entry.weight?.toString() ?? "",
      body_fat: entry.body_fat?.toString() ?? "",
      muscle_percentage: entry.muscle_percentage?.toString() ?? "",
      visceral_fat: entry.visceral_fat?.toString() ?? "",
      chest_cm: entry.chest_cm?.toString() ?? "",
      waist_cm: entry.waist_cm?.toString() ?? "",
      hip_cm: entry.hip_cm?.toString() ?? "",
      arm_cm: entry.arm_cm?.toString() ?? "",
      thigh_cm: entry.thigh_cm?.toString() ?? "",
      mood: entry.mood ?? "Bien",
      notes: entry.notes ?? "",
    });
  }

  function resetForm() {
    setEditingEntry(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !clientId) {
      setError("Selecciona un cliente antes de registrar mediciones.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingEntry) {
        const response = await apiRequest<{ progress: ProgressEntry }>(`/progress/${editingEntry.id}`, { method: "PATCH", token, body: buildPayload() });
        setProgress((current) => current.map((entry) => (entry.id === response.progress.id ? response.progress : entry)));
        setSuccess("Medicion actualizada correctamente.");
      } else {
        const response = await apiRequest<{ progress: ProgressEntry }>("/progress", { method: "POST", token, body: buildPayload() });
        setProgress((current) => [response.progress, ...current]);
        setSuccess("Medicion registrada correctamente.");
      }
      resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar la medicion.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMeasurement(entryId: number) {
    if (!token) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ message: string }>(`/progress/${entryId}`, { method: "DELETE", token });
      setProgress((current) => current.filter((entry) => entry.id !== entryId));
      if (editingEntry?.id === entryId) resetForm();
      setSuccess("Medicion eliminada correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo eliminar la medicion.");
    } finally {
      setIsSaving(false);
    }
  }

  if (user?.role === "client") {
    return (
      <section className="rounded-lg border border-[#d9d4c7] bg-white p-6 shadow-sm">
        <FormMessage type="error">Esta pagina esta reservada para profesionales.</FormMessage>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-6">
        {error ? <FormMessage type="error">{error}</FormMessage> : null}
        {success ? <FormMessage type="success">{success}</FormMessage> : null}

        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Cliente</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
            <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" value={clientId} onChange={(event) => { setClientId(event.target.value); resetForm(); }}>
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} - {client.email}
                </option>
              ))}
            </select>
            <button className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f]" onClick={loadMeasurements}>
              Ver mediciones
            </button>
          </div>
        </article>

        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{editingEntry ? "Editar medicion" : "Registrar medicion corporal"}</h2>
          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <MeasurementInput label="Peso kg" value={form.weight} onChange={(value) => updateField("weight", value)} />
              <MeasurementInput label="Grasa %" value={form.body_fat} onChange={(value) => updateField("body_fat", value)} />
              <MeasurementInput label="Musculo %" value={form.muscle_percentage} onChange={(value) => updateField("muscle_percentage", value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <MeasurementInput label="Grasa visceral" value={form.visceral_fat} onChange={(value) => updateField("visceral_fat", value)} />
              <MeasurementInput label="Pecho cm" value={form.chest_cm} onChange={(value) => updateField("chest_cm", value)} />
              <MeasurementInput label="Cintura cm" value={form.waist_cm} onChange={(value) => updateField("waist_cm", value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <MeasurementInput label="Cadera cm" value={form.hip_cm} onChange={(value) => updateField("hip_cm", value)} />
              <MeasurementInput label="Brazo cm" value={form.arm_cm} onChange={(value) => updateField("arm_cm", value)} />
              <MeasurementInput label="Muslo cm" value={form.thigh_cm} onChange={(value) => updateField("thigh_cm", value)} />
            </div>
            <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" value={form.mood} onChange={(event) => updateField("mood", event.target.value)}>
              <option>Excelente</option>
              <option>Bien</option>
              <option>Cansado</option>
              <option>Con molestias</option>
            </select>
            <textarea className="min-h-24 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3" placeholder="Notas de evaluacion, postura, energia, recomendaciones..." value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button disabled={isSaving || !clientId} className="rounded-md bg-[#a30000] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
                {isSaving ? "Guardando..." : editingEntry ? "Guardar cambios" : "Registrar medicion"}
              </button>
              <button type="button" className="rounded-md border border-[#d9d4c7] px-4 py-3 font-semibold hover:bg-[#f7f5ef]" onClick={resetForm}>
                Limpiar
              </button>
            </div>
          </form>
        </article>
      </div>

      <div className="grid gap-6">
        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Resumen corporal</h2>
          <p className="mt-2 text-sm text-[#5d6959]">{selectedClient ? selectedClient.name : "Selecciona un cliente para revisar sus mediciones."}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryMetric label="Peso actual" value={formatValue(latest?.weight, "kg")} />
            <SummaryMetric label="Grasa corporal" value={formatValue(latest?.body_fat, "%")} />
            <SummaryMetric label="Musculo" value={formatValue(latest?.muscle_percentage, "%")} />
            <SummaryMetric label="Cintura" value={formatValue(latest?.waist_cm, "cm")} />
          </div>
        </article>

        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Historial de mediciones</h2>
          <div className="mt-5 grid gap-3">
            {isLoading ? <p className="text-sm text-[#5d6959]">Cargando mediciones...</p> : null}
            {!isLoading && progress.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todavia no hay mediciones para este cliente.</p> : null}
            {progress.map((entry) => (
              <div key={entry.id} className="rounded-md border border-[#ece7dc] bg-[#fbfaf7] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#a30000]">{formatDate(entry.created_at)}</p>
                    <h3 className="mt-1 text-lg font-semibold">{formatValue(entry.weight, "kg")} · {entry.mood ?? "Sin estado"}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-md border border-[#d9d4c7] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={() => startEdit(entry)}>
                      Editar
                    </button>
                    <button className="rounded-md border border-[#f1b5a4] bg-white px-3 py-2 text-sm font-semibold text-[#963519] hover:bg-[#fff4ef]" onClick={() => void deleteMeasurement(entry.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#5d6959] sm:grid-cols-3">
                  <span>Grasa: {formatValue(entry.body_fat, "%")}</span>
                  <span>Musculo: {formatValue(entry.muscle_percentage, "%")}</span>
                  <span>Visceral: {formatValue(entry.visceral_fat, "")}</span>
                  <span>Pecho: {formatValue(entry.chest_cm, "cm")}</span>
                  <span>Cintura: {formatValue(entry.waist_cm, "cm")}</span>
                  <span>Cadera: {formatValue(entry.hip_cm, "cm")}</span>
                  <span>Brazo: {formatValue(entry.arm_cm, "cm")}</span>
                  <span>Muslo: {formatValue(entry.thigh_cm, "cm")}</span>
                </div>
                {entry.notes ? <p className="mt-3 whitespace-pre-line rounded-md bg-white p-3 text-sm leading-6 text-[#3d493f]">{entry.notes}</p> : null}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function MeasurementInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#3d493f]">
      {label}
      <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 font-normal" type="number" min="0" step="0.1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f5ef] p-4">
      <p className="text-xs font-semibold text-[#64715f]">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatValue(value: number | null | undefined, suffix: string) {
  if (value === null || value === undefined) return "-";
  return `${value}${suffix ? ` ${suffix}` : ""}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
