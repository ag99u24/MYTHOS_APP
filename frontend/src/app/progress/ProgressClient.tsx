"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { AuthUser, getStoredUser, getToken } from "@/lib/session";

type ProgressEntry = { id: number; client_id: number; weight?: number | null; body_fat?: number | null; mood?: string | null; notes?: string | null; created_at?: string | null };
type WorkoutEntry = { id: number; client_id: number; title: string; workout_type?: string | null; duration_minutes?: number | null; intensity?: string | null; notes?: string | null; created_at?: string | null };
type DietEntry = { id: number; client_id: number; adherence_percentage: number; meals_completed?: number | null; total_meals?: number | null; water_liters?: number | null; notes?: string | null; created_at?: string | null };

export function ProgressClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [clientId, setClientId] = useState("");
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [diet, setDiet] = useState<DietEntry[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);

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
          <ClientTrackingForms isSaving={isSaving} submitJson={submitJson} setProgress={setProgress} setWorkouts={setWorkouts} setDiet={setDiet} />
        )}
      </div>
      <TrackingHistory isLoading={isLoading} progress={progress} workouts={workouts} diet={diet} />
    </section>
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

function TrackingHistory({ isLoading, progress, workouts, diet }: { isLoading: boolean; progress: ProgressEntry[]; workouts: WorkoutEntry[]; diet: DietEntry[] }) {
  return (
    <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Historial</h2>
      <div className="mt-5 grid gap-4">
        {isLoading ? <p className="text-sm text-[#5d6959]">Cargando seguimiento...</p> : null}
        {!isLoading && progress.length === 0 && workouts.length === 0 && diet.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todavia no hay registros.</p> : null}
        {diet.map((entry) => <HistoryCard key={`diet-${entry.id}`} title={`Dieta ${entry.adherence_percentage}%`} meta={`${entry.meals_completed ?? "-"} / ${entry.total_meals ?? "-"} comidas`} date={entry.created_at} notes={entry.notes} />)}
        {workouts.map((entry) => <HistoryCard key={`workout-${entry.id}`} title={entry.title} meta={`${entry.workout_type ?? "Entrenamiento"} · ${entry.duration_minutes ?? "-"} min · ${entry.intensity ?? "-"}`} date={entry.created_at} notes={entry.notes} />)}
        {progress.map((entry) => <HistoryCard key={`progress-${entry.id}`} title="Check-in corporal" meta={`Peso ${entry.weight ?? "-"} kg · Grasa ${entry.body_fat ?? "-"}% · ${entry.mood ?? "-"}`} date={entry.created_at} notes={entry.notes} />)}
      </div>
    </article>
  );
}

function HistoryCard({ title, meta, date, notes }: { title: string; meta: string; date?: string | null; notes?: string | null }) {
  return (
    <div className="rounded-md border border-[#ece7dc] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">{title}</p>
        <span className="text-sm text-[#64715f]">{date ? new Date(date).toLocaleDateString("es-ES") : "Sin fecha"}</span>
      </div>
      <p className="mt-3 text-sm text-[#5d6959]">{meta}</p>
      {notes ? <p className="mt-3 text-sm leading-6 text-[#3d493f]">{notes}</p> : null}
    </div>
  );
}
