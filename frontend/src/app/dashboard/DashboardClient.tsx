"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { StatCard } from "@/components/StatCard";
import { apiRequest } from "@/lib/api";
import { AuthUser, getStoredUser, getToken } from "@/lib/session";

type Plan = {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  professional_id: number;
  client_id: number;
  items: Array<{
    id?: number;
    day: string;
    title: string;
    details?: string | null;
  }>;
};

type ProgressEntry = { id: number; client_id: number; weight?: number | null; body_fat?: number | null; mood?: string | null; created_at?: string | null };
type WorkoutEntry = { id: number; client_id: number; title: string; workout_type?: string | null; duration_minutes?: number | null; intensity?: string | null; created_at?: string | null };
type DietEntry = { id: number; client_id: number; adherence_percentage: number; meals_completed?: number | null; total_meals?: number | null; created_at?: string | null };
type Session = { id: number; title: string; session_type: string; status: string; scheduled_at: string; duration_minutes?: number | null; client_id: number };

export function DashboardClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [diet, setDiet] = useState<DietEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime] = useState(() => Date.now());

  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);

  const activePlans = plans.filter((plan) => plan.status === "active");
  const draftPlans = plans.filter((plan) => plan.status === "draft");
  const nutritionPlans = plans.filter((plan) => plan.category.toLowerCase() === "nutricion");
  const trainingPlans = plans.filter((plan) => plan.category.toLowerCase() === "entrenamiento");
  const averageAdherence = diet.length ? Math.round(diet.reduce((total, entry) => total + entry.adherence_percentage, 0) / diet.length) : 0;
  const upcomingSessions = sessions
    .filter((session) => session.status === "scheduled" && new Date(session.scheduled_at).getTime() >= currentTime)
    .sort((first, second) => new Date(first.scheduled_at).getTime() - new Date(second.scheduled_at).getTime());
  const recentActivity = [
    ...diet.slice(0, 3).map((entry) => ({
      id: `diet-${entry.id}`,
      title: `Dieta ${entry.adherence_percentage}%`,
      detail: `${entry.meals_completed ?? "-"} / ${entry.total_meals ?? "-"} comidas`,
      date: entry.created_at,
    })),
    ...workouts.slice(0, 3).map((entry) => ({
      id: `workout-${entry.id}`,
      title: entry.title,
      detail: `${entry.workout_type ?? "Entrenamiento"} - ${entry.duration_minutes ?? "-"} min`,
      date: entry.created_at,
    })),
    ...progress.slice(0, 3).map((entry) => ({
      id: `progress-${entry.id}`,
      title: "Check-in corporal",
      detail: `Peso ${entry.weight ?? "-"} kg - Grasa ${entry.body_fat ?? "-"}%`,
      date: entry.created_at,
    })),
  ].sort((first, second) => new Date(second.date ?? 0).getTime() - new Date(first.date ?? 0).getTime());

  const loadDashboard = useCallback(async () => {
    if (!token || !user) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const plansRequest = apiRequest<{ plans: Plan[] }>("/plans", { token });
      const sessionsRequest = apiRequest<{ sessions: Session[] }>("/sessions?per_page=100", { token });

      if (user.role === "professional") {
        const [clientsResponse, plansResponse, sessionsResponse] = await Promise.all([
          apiRequest<{ clients: AuthUser[] }>("/users/clients", { token }),
          plansRequest,
          sessionsRequest,
        ]);
        const trackingResponses = await Promise.all(
          clientsResponse.clients.map((client) =>
            Promise.all([
              apiRequest<{ progress: ProgressEntry[] }>(`/progress?client_id=${client.id}`, { token }),
              apiRequest<{ workouts: WorkoutEntry[] }>(`/workouts?client_id=${client.id}`, { token }),
              apiRequest<{ diet: DietEntry[] }>(`/diet?client_id=${client.id}`, { token }),
            ])
          )
        );

        setClients(clientsResponse.clients);
        setPlans(plansResponse.plans);
        setProgress(trackingResponses.flatMap(([progressResponse]) => progressResponse.progress));
        setWorkouts(trackingResponses.flatMap(([, workoutsResponse]) => workoutsResponse.workouts));
        setDiet(trackingResponses.flatMap(([, , dietResponse]) => dietResponse.diet));
        setSessions(sessionsResponse.sessions);
        return;
      }

      const [plansResponse, progressResponse, workoutsResponse, dietResponse, sessionsResponse] = await Promise.all([
        plansRequest,
        apiRequest<{ progress: ProgressEntry[] }>("/progress", { token }),
        apiRequest<{ workouts: WorkoutEntry[] }>("/workouts", { token }),
        apiRequest<{ diet: DietEntry[] }>("/diet", { token }),
        sessionsRequest,
      ]);

      setClients([]);
      setPlans(plansResponse.plans);
      setProgress(progressResponse.progress);
      setWorkouts(workoutsResponse.workouts);
      setDiet(dietResponse.diet);
      setSessions(sessionsResponse.sessions);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar el panel.");
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (token && user) {
      void Promise.resolve().then(loadDashboard);
    }
  }, [loadDashboard, token, user]);

  if (!token) {
    return (
      <section className="rounded-lg border border-[#d9d4c7] bg-white p-6 shadow-sm">
        <FormMessage type="error">Inicia sesion para ver tu panel real.</FormMessage>
      </section>
    );
  }

  return (
    <>
      {error ? (
        <div className="mb-6">
          <FormMessage type="error">{error}</FormMessage>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label={user?.role === "professional" ? "Clientes activos" : "Planes asignados"} value={user?.role === "professional" ? String(clients.length) : String(plans.length)} detail={isLoading ? "Cargando..." : user?.role === "professional" ? "Clientes asignados a tu cuenta" : "Planes creados por tu profesional"} />
        <StatCard label="Planes en curso" value={String(activePlans.length)} detail={`${draftPlans.length} borradores pendientes`} />
        <StatCard label="Distribucion" value={`${trainingPlans.length}/${nutritionPlans.length}`} detail="Entrenamiento / Nutricion" />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <StatCard label="Adherencia dieta" value={diet.length ? `${averageAdherence}%` : "-"} detail={`${diet.length} registros de dieta`} />
        <StatCard label="Entrenamientos" value={String(workouts.length)} detail="Registros completados" />
        <StatCard label="Proximas sesiones" value={String(upcomingSessions.length)} detail={upcomingSessions[0] ? new Date(upcomingSessions[0].scheduled_at).toLocaleDateString("es-ES") : "Sin sesiones programadas"} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{user?.role === "professional" ? "Clientes recientes" : "Tus planes recientes"}</h2>
            <Link href={user?.role === "professional" ? "/clients" : "/plans"} className="text-sm font-semibold text-[#c75432]">
              Ver todos
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {user?.role === "professional" && clients.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todavia no hay clientes asignados.</p> : null}
            {user?.role === "professional" ? clients.slice(0, 3).map((client) => (
              <div key={client.id} className="grid gap-3 rounded-md bg-[#f7f5ef] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold">{client.name}</p>
                  <p className="mt-1 text-sm text-[#5d6959]">{client.goal || client.email}</p>
                </div>
                <span className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-[#37513b]">ID #{client.id}</span>
              </div>
            )) : null}
            {user?.role === "client" && plans.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todavia no tienes planes asignados.</p> : null}
            {user?.role === "client" ? plans.slice(0, 3).map((plan) => (
              <div key={plan.id} className="rounded-md bg-[#f7f5ef] p-4">
                <p className="font-semibold">{plan.title}</p>
                <p className="mt-1 text-sm text-[#5d6959]">{plan.category} - {plan.status}</p>
              </div>
            )) : null}
          </div>
        </article>

        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Actividad reciente</h2>
          <div className="mt-5 grid gap-3">
            {recentActivity.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Registra progreso para ver actividad aqui.</p> : null}
            {recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="rounded-md border border-[#ece7dc] p-4 text-sm leading-6 text-[#3d493f]">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold">{activity.title}</span>
                  <span className="text-xs text-[#64715f]">{activity.date ? new Date(activity.date).toLocaleDateString("es-ES") : "Sin fecha"}</span>
                </div>
                <p className="mt-2 text-[#5d6959]">{activity.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Proximas sesiones</h2>
          <Link href="/sessions" className="text-sm font-semibold text-[#c75432]">
            Ver agenda
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {upcomingSessions.length === 0 ? <p className="text-sm text-[#5d6959]">No hay sesiones programadas.</p> : null}
          {upcomingSessions.slice(0, 3).map((session) => (
            <div key={session.id} className="rounded-md border border-[#ece7dc] p-4">
              <p className="font-semibold">{session.title}</p>
              <p className="mt-1 text-sm text-[#5d6959]">{new Date(session.scheduled_at).toLocaleString("es-ES")}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span>{session.session_type}</span>
                <span className="font-semibold text-[#c75432]">{session.duration_minutes ?? "-"} min</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Planes activos</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {activePlans.length === 0 ? <p className="text-sm text-[#5d6959]">No hay planes activos todavia.</p> : null}
          {activePlans.slice(0, 6).map((plan) => (
            <div key={plan.id} className="rounded-md border border-[#ece7dc] p-4">
              <p className="font-semibold">{plan.title}</p>
              <p className="mt-1 text-sm text-[#5d6959]">Cliente #{plan.client_id}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span>{plan.category}</span>
                <span className="font-semibold text-[#c75432]">{plan.items.length} bloques</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
