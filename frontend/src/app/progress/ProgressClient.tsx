"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { AuthUser, getStoredUser, getToken } from "@/lib/session";

type ProgressEntry = { id: number; client_id: number; weight?: number | null; body_fat?: number | null; mood?: string | null; notes?: string | null; created_at?: string | null };
type WorkoutEntry = { id: number; client_id: number; title: string; workout_type?: string | null; duration_minutes?: number | null; intensity?: string | null; notes?: string | null; created_at?: string | null };
type DietEntry = { id: number; client_id: number; adherence_percentage: number; meals_completed?: number | null; total_meals?: number | null; water_liters?: number | null; notes?: string | null; created_at?: string | null };
type TrackingKind = "progress" | "workout" | "diet";
type EditingEntry =
  | { kind: "progress"; entry: ProgressEntry }
  | { kind: "workout"; entry: WorkoutEntry }
  | { kind: "diet"; entry: DietEntry };

export function ProgressClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [clientId, setClientId] = useState("");
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [diet, setDiet] = useState<DietEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);
  const latestProgress = progress[0];
  const latestDiet = diet[0];
  const averageDiet = diet.length ? Math.round(diet.reduce((total, entry) => total + entry.adherence_percentage, 0) / diet.length) : 0;
  const totalWorkoutMinutes = workouts.reduce((total, entry) => total + (entry.duration_minutes ?? 0), 0);

  const loadClients = useCallback(async () => {
    if (!token || user?.role !== "professional") return;

    try {
      const response = await apiRequest<{ clients: AuthUser[] }>("/users/clients", { token });
      setClients(response.clients);
      if (!clientId && response.clients[0]) {
        setClientId(String(response.clients[0].id));
      }
    } catch {
      setClients([]);
    }
  }, [clientId, token, user?.role]);

  const loadTracking = useCallback(async () => {
    if (!token) return;
    if (user?.role === "professional" && !clientId) {
      setProgress([]);
      setWorkouts([]);
      setDiet([]);
      return;
    }

    const query = user?.role === "professional" ? `?client_id=${clientId}` : "";
    setIsLoading(true);
    setError("");

    try {
      const [progressResponse, workoutsResponse, dietResponse] = await Promise.all([
        apiRequest<{ progress: ProgressEntry[] }>(`/progress${query}`, { token }),
        apiRequest<{ workouts: WorkoutEntry[] }>(`/workouts${query}`, { token }),
        apiRequest<{ diet: DietEntry[] }>(`/diet${query}`, { token }),
      ]);
      setProgress(progressResponse.progress);
      setWorkouts(workoutsResponse.workouts);
      setDiet(dietResponse.diet);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar el seguimiento.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, token, user?.role]);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (user) void Promise.resolve().then(loadTracking);
  }, [loadTracking, user]);

  useEffect(() => {
    if (user?.role === "professional") void Promise.resolve().then(loadClients);
  }, [loadClients, user?.role]);

  async function submitJson<T>(path: string, body: Record<string, unknown>, onSuccess: (response: T) => void, message: string) {
    if (!token || user?.role !== "client") {
      setError("Solo los clientes pueden registrar seguimiento.");
      return;
    }
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest<T>(path, { method: "POST", token, body });
      onSuccess(response);
      setSuccess(message);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar el registro.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTracking(kind: TrackingKind, id: number, body: Record<string, unknown>) {
    if (!token || user?.role !== "client") {
      setError("Solo los clientes pueden editar seguimiento.");
      return;
    }

    const pathByKind = { progress: "/progress", workout: "/workouts", diet: "/diet" };
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      if (kind === "progress") {
        const response = await apiRequest<{ progress: ProgressEntry }>(`${pathByKind[kind]}/${id}`, { method: "PATCH", token, body });
        setProgress((current) => current.map((entry) => (entry.id === id ? response.progress : entry)));
      }
      if (kind === "workout") {
        const response = await apiRequest<{ workout: WorkoutEntry }>(`${pathByKind[kind]}/${id}`, { method: "PATCH", token, body });
        setWorkouts((current) => current.map((entry) => (entry.id === id ? response.workout : entry)));
      }
      if (kind === "diet") {
        const response = await apiRequest<{ diet: DietEntry }>(`${pathByKind[kind]}/${id}`, { method: "PATCH", token, body });
        setDiet((current) => current.map((entry) => (entry.id === id ? response.diet : entry)));
      }

      setEditingEntry(null);
      setSuccess("Registro actualizado correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo actualizar el registro.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTracking(kind: TrackingKind, id: number) {
    if (!token || user?.role !== "client") {
      setError("Solo los clientes pueden eliminar seguimiento.");
      return;
    }

    const pathByKind = { progress: "/progress", workout: "/workouts", diet: "/diet" };
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ message: string }>(`${pathByKind[kind]}/${id}`, { method: "DELETE", token });
      if (kind === "progress") setProgress((current) => current.filter((entry) => entry.id !== id));
      if (kind === "workout") setWorkouts((current) => current.filter((entry) => entry.id !== id));
      if (kind === "diet") setDiet((current) => current.filter((entry) => entry.id !== id));
      if (editingEntry?.entry.id === id && editingEntry.kind === kind) setEditingEntry(null);
      setSuccess("Registro eliminado correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo eliminar el registro.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="grid gap-6">
        {error ? <FormMessage type="error">{error}</FormMessage> : null}
        {success ? <FormMessage type="success">{success}</FormMessage> : null}
        {user?.role === "professional" ? (
          <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Consultar cliente</h2>
            <div className="mt-5 grid gap-4">
              <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <button className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f]" onClick={loadTracking}>Ver seguimiento</button>
            </div>
          </article>
        ) : (
          <>
            {editingEntry ? (
              <EditTrackingForm editingEntry={editingEntry} isSaving={isSaving} onCancel={() => setEditingEntry(null)} onSave={updateTracking} />
            ) : null}
            <ClientTrackingForms isSaving={isSaving} submitJson={submitJson} setProgress={setProgress} setWorkouts={setWorkouts} setDiet={setDiet} />
          </>
        )}
      </div>
      <TrackingSummary
        averageDiet={averageDiet}
        dietCount={diet.length}
        latestDiet={latestDiet}
        latestProgress={latestProgress}
        totalWorkoutMinutes={totalWorkoutMinutes}
        workoutCount={workouts.length}
      />
      <TrackingHistory
        canManage={user?.role === "client"}
        isLoading={isLoading}
        progress={progress}
        workouts={workouts}
        diet={diet}
        onEdit={setEditingEntry}
        onDelete={deleteTracking}
      />
    </section>
  );
}

function TrackingSummary({ averageDiet, dietCount, latestDiet, latestProgress, totalWorkoutMinutes, workoutCount }: {
  averageDiet: number;
  dietCount: number;
  latestDiet?: DietEntry;
  latestProgress?: ProgressEntry;
  totalWorkoutMinutes: number;
  workoutCount: number;
}) {
  return (
    <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Resumen</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SummaryMetric label="Peso actual" value={latestProgress?.weight ? `${latestProgress.weight} kg` : "-"} detail={latestProgress?.mood ?? "Sin check-in"} />
        <SummaryMetric label="Dieta promedio" value={dietCount ? `${averageDiet}%` : "-"} detail={latestDiet ? `Ultimo registro ${latestDiet.adherence_percentage}%` : "Sin registros"} />
        <SummaryMetric label="Entrenamientos" value={String(workoutCount)} detail="Registros completados" />
        <SummaryMetric label="Tiempo total" value={`${totalWorkoutMinutes} min`} detail="Minutos registrados" />
      </div>
    </article>
  );
}

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md bg-[#f7f5ef] p-4">
      <p className="text-xs font-semibold text-[#64715f]">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#5d6959]">{detail}</p>
    </div>
  );
}

function ClientTrackingForms({ isSaving, submitJson, setProgress, setWorkouts, setDiet }: {
  isSaving: boolean;
  submitJson: <T>(path: string, body: Record<string, unknown>, onSuccess: (response: T) => void, message: string) => Promise<void>;
  setProgress: React.Dispatch<React.SetStateAction<ProgressEntry[]>>;
  setWorkouts: React.Dispatch<React.SetStateAction<WorkoutEntry[]>>;
  setDiet: React.Dispatch<React.SetStateAction<DietEntry[]>>;
}) {
  return (
    <>
      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Check-in corporal</h2>
        <form className="mt-5 grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void submitJson<{ progress: ProgressEntry }>("/progress", {
            weight: form.get("weight") ? Number(form.get("weight")) : null,
            body_fat: form.get("body_fat") ? Number(form.get("body_fat")) : null,
            mood: form.get("mood"),
            notes: form.get("notes"),
          }, (response) => setProgress((current) => [response.progress, ...current]), "Progreso registrado correctamente.");
          event.currentTarget.reset();
        }}>
          <div className="grid gap-4 md:grid-cols-2">
            <input name="weight" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Peso kg" type="number" step="0.1" />
            <input name="body_fat" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Grasa %" type="number" step="0.1" />
          </div>
          <select name="mood" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" defaultValue="Bien"><option>Excelente</option><option>Bien</option><option>Cansado</option><option>Con molestias</option></select>
          <textarea name="notes" className="min-h-20 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3" placeholder="Notas" />
          <button disabled={isSaving} className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white disabled:opacity-70">Registrar progreso</button>
        </form>
      </article>
      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Entrenamiento realizado</h2>
        <form className="mt-5 grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void submitJson<{ workout: WorkoutEntry }>("/workouts", {
            title: form.get("title"),
            workout_type: form.get("workout_type"),
            duration_minutes: form.get("duration_minutes") ? Number(form.get("duration_minutes")) : null,
            intensity: form.get("intensity"),
            notes: form.get("notes"),
          }, (response) => setWorkouts((current) => [response.workout, ...current]), "Entrenamiento registrado correctamente.");
          event.currentTarget.reset();
        }}>
          <input name="title" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Nombre del entrenamiento" required />
          <div className="grid gap-4 md:grid-cols-3">
            <select name="workout_type" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"><option>Fuerza</option><option>Cardio</option><option>Movilidad</option><option>Mixto</option></select>
            <input name="duration_minutes" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Minutos" type="number" />
            <select name="intensity" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"><option>Baja</option><option>Media</option><option>Alta</option><option>Maxima</option></select>
          </div>
          <textarea name="notes" className="min-h-20 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3" placeholder="Notas del entrenamiento" />
          <button disabled={isSaving} className="rounded-md bg-[#c75432] px-4 py-3 font-semibold text-white disabled:opacity-70">Registrar entrenamiento</button>
        </form>
      </article>
      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Seguimiento de dieta</h2>
        <form className="mt-5 grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void submitJson<{ diet: DietEntry }>("/diet", {
            adherence_percentage: Number(form.get("adherence_percentage")),
            meals_completed: form.get("meals_completed") ? Number(form.get("meals_completed")) : null,
            total_meals: form.get("total_meals") ? Number(form.get("total_meals")) : null,
            water_liters: form.get("water_liters") ? Number(form.get("water_liters")) : null,
            notes: form.get("notes"),
          }, (response) => setDiet((current) => [response.diet, ...current]), "Dieta registrada correctamente.");
          event.currentTarget.reset();
        }}>
          <input name="adherence_percentage" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="% cumplimiento dieta" type="number" min="0" max="100" required />
          <div className="grid gap-4 md:grid-cols-3">
            <input name="meals_completed" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Comidas cumplidas" type="number" />
            <input name="total_meals" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Comidas totales" type="number" />
            <input name="water_liters" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Agua litros" type="number" step="0.1" />
          </div>
          <textarea name="notes" className="min-h-20 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3" placeholder="Notas de dieta" />
          <button disabled={isSaving} className="rounded-md bg-[#37513b] px-4 py-3 font-semibold text-white disabled:opacity-70">Registrar dieta</button>
        </form>
      </article>
    </>
  );
}

function EditTrackingForm({ editingEntry, isSaving, onCancel, onSave }: {
  editingEntry: EditingEntry;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (kind: TrackingKind, id: number, body: Record<string, unknown>) => Promise<void>;
}) {
  const titleByKind = {
    progress: "Editar check-in",
    workout: "Editar entrenamiento",
    diet: "Editar dieta",
  };

  return (
    <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">{titleByKind[editingEntry.kind]}</h2>
      <form className="mt-5 grid gap-4" onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);

        if (editingEntry.kind === "progress") {
          void onSave("progress", editingEntry.entry.id, {
            weight: form.get("weight") ? Number(form.get("weight")) : null,
            body_fat: form.get("body_fat") ? Number(form.get("body_fat")) : null,
            mood: form.get("mood"),
            notes: form.get("notes"),
          });
        }

        if (editingEntry.kind === "workout") {
          void onSave("workout", editingEntry.entry.id, {
            title: form.get("title"),
            workout_type: form.get("workout_type"),
            duration_minutes: form.get("duration_minutes") ? Number(form.get("duration_minutes")) : null,
            intensity: form.get("intensity"),
            notes: form.get("notes"),
          });
        }

        if (editingEntry.kind === "diet") {
          void onSave("diet", editingEntry.entry.id, {
            adherence_percentage: Number(form.get("adherence_percentage")),
            meals_completed: form.get("meals_completed") ? Number(form.get("meals_completed")) : null,
            total_meals: form.get("total_meals") ? Number(form.get("total_meals")) : null,
            water_liters: form.get("water_liters") ? Number(form.get("water_liters")) : null,
            notes: form.get("notes"),
          });
        }
      }}>
        {editingEntry.kind === "progress" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <input name="weight" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Peso kg" type="number" step="0.1" defaultValue={editingEntry.entry.weight ?? ""} />
              <input name="body_fat" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Grasa %" type="number" step="0.1" defaultValue={editingEntry.entry.body_fat ?? ""} />
            </div>
            <select name="mood" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" defaultValue={editingEntry.entry.mood ?? "Bien"}><option>Excelente</option><option>Bien</option><option>Cansado</option><option>Con molestias</option></select>
            <textarea name="notes" className="min-h-20 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3" placeholder="Notas" defaultValue={editingEntry.entry.notes ?? ""} />
          </>
        ) : null}

        {editingEntry.kind === "workout" ? (
          <>
            <input name="title" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Nombre del entrenamiento" defaultValue={editingEntry.entry.title} required />
            <div className="grid gap-4 md:grid-cols-3">
              <select name="workout_type" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" defaultValue={editingEntry.entry.workout_type ?? "Fuerza"}><option>Fuerza</option><option>Cardio</option><option>Movilidad</option><option>Mixto</option></select>
              <input name="duration_minutes" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Minutos" type="number" defaultValue={editingEntry.entry.duration_minutes ?? ""} />
              <select name="intensity" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" defaultValue={editingEntry.entry.intensity ?? "Media"}><option>Baja</option><option>Media</option><option>Alta</option><option>Maxima</option></select>
            </div>
            <textarea name="notes" className="min-h-20 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3" placeholder="Notas del entrenamiento" defaultValue={editingEntry.entry.notes ?? ""} />
          </>
        ) : null}

        {editingEntry.kind === "diet" ? (
          <>
            <input name="adherence_percentage" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="% cumplimiento dieta" type="number" min="0" max="100" defaultValue={editingEntry.entry.adherence_percentage} required />
            <div className="grid gap-4 md:grid-cols-3">
              <input name="meals_completed" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Comidas cumplidas" type="number" defaultValue={editingEntry.entry.meals_completed ?? ""} />
              <input name="total_meals" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Comidas totales" type="number" defaultValue={editingEntry.entry.total_meals ?? ""} />
              <input name="water_liters" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Agua litros" type="number" step="0.1" defaultValue={editingEntry.entry.water_liters ?? ""} />
            </div>
            <textarea name="notes" className="min-h-20 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3" placeholder="Notas de dieta" defaultValue={editingEntry.entry.notes ?? ""} />
          </>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button disabled={isSaving} className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white disabled:opacity-70">
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button type="button" className="rounded-md border border-[#d9d4c7] px-4 py-3 font-semibold hover:bg-[#f7f5ef]" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </article>
  );
}

function TrackingHistory({ canManage, isLoading, progress, workouts, diet, onEdit, onDelete }: {
  canManage: boolean;
  isLoading: boolean;
  progress: ProgressEntry[];
  workouts: WorkoutEntry[];
  diet: DietEntry[];
  onEdit: (editingEntry: EditingEntry) => void;
  onDelete: (kind: TrackingKind, id: number) => Promise<void>;
}) {
  const [kindFilter, setKindFilter] = useState<TrackingKind | "all">("all");
  const timeline = [
    ...diet.map((entry) => ({
      id: `diet-${entry.id}`,
      kind: "diet" as const,
      entry,
      label: "Dieta",
      title: `Dieta ${entry.adherence_percentage}%`,
      meta: `${entry.meals_completed ?? "-"} / ${entry.total_meals ?? "-"} comidas`,
      date: entry.created_at,
      notes: entry.notes,
    })),
    ...workouts.map((entry) => ({
      id: `workout-${entry.id}`,
      kind: "workout" as const,
      entry,
      label: "Entreno",
      title: entry.title,
      meta: `${entry.workout_type ?? "Entrenamiento"} - ${entry.duration_minutes ?? "-"} min - ${entry.intensity ?? "-"}`,
      date: entry.created_at,
      notes: entry.notes,
    })),
    ...progress.map((entry) => ({
      id: `progress-${entry.id}`,
      kind: "progress" as const,
      entry,
      label: "Check-in",
      title: "Check-in corporal",
      meta: `Peso ${entry.weight ?? "-"} kg - Grasa ${entry.body_fat ?? "-"}% - ${entry.mood ?? "-"}`,
      date: entry.created_at,
      notes: entry.notes,
    })),
  ].sort((first, second) => new Date(second.date ?? 0).getTime() - new Date(first.date ?? 0).getTime());
  const filteredTimeline = kindFilter === "all" ? timeline : timeline.filter((item) => item.kind === kindFilter);

  return (
    <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Historial</h2>
          <p className="mt-1 text-sm text-[#64715f]">{filteredTimeline.length} registros visibles</p>
        </div>
        <select className="h-10 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 text-sm" value={kindFilter} onChange={(event) => setKindFilter(event.target.value as TrackingKind | "all")}>
          <option value="all">Todo</option>
          <option value="diet">Dieta</option>
          <option value="workout">Entrenos</option>
          <option value="progress">Check-ins</option>
        </select>
      </div>
      <div className="mt-5 grid gap-4">
        {isLoading ? <p className="text-sm text-[#5d6959]">Cargando seguimiento...</p> : null}
        {!isLoading && timeline.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todavía no hay registros.</p> : null}
        {!isLoading && timeline.length > 0 && filteredTimeline.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">No hay registros para este filtro.</p> : null}
        {filteredTimeline.map((item) => <HistoryCard key={item.id} canManage={canManage} label={item.label} title={item.title} meta={item.meta} date={item.date} notes={item.notes} onEdit={() => onEdit({ kind: item.kind, entry: item.entry } as EditingEntry)} onDelete={() => void onDelete(item.kind, item.entry.id)} />)}
      </div>
    </article>
  );
}

function HistoryCard({ canManage, label, title, meta, date, notes, onEdit, onDelete }: { canManage: boolean; label: string; title: string; meta: string; date?: string | null; notes?: string | null; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-md border border-[#ece7dc] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[#f7f5ef] px-2 py-1 text-xs font-semibold text-[#64715f]">{label}</span>
          <p className="font-semibold">{title}</p>
        </div>
        <span className="text-sm text-[#64715f]">{date ? new Date(date).toLocaleDateString("es-ES") : "Sin fecha"}</span>
      </div>
      <p className="mt-3 text-sm text-[#5d6959]">{meta}</p>
      {notes ? <p className="mt-3 text-sm leading-6 text-[#3d493f]">{notes}</p> : null}
      {canManage ? (
        <div className="mt-4 flex gap-2">
          <button className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={onEdit}>
            Editar
          </button>
          <button className="rounded-md border border-[#f1b5a4] px-3 py-2 text-sm font-semibold text-[#963519] hover:bg-[#fff4ef]" onClick={onDelete}>
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}
