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

type ProgressEntry = {
  id: number;
  client_id: number;
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
  created_at?: string | null;
};
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
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime] = useState(() => Date.now());

  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);

  const activePlans = plans.filter((plan) => plan.status === "active");
  const draftPlans = plans.filter((plan) => plan.status === "draft");
  const nutritionPlans = plans.filter((plan) => plan.category.toLowerCase() === "nutricion");
  const trainingPlans = plans.filter((plan) => plan.category.toLowerCase() === "entrenamiento");
  const averageAdherence = diet.length ? Math.round(diet.reduce((total, entry) => total + entry.adherence_percentage, 0) / diet.length) : 0;
  const lowAdherenceEntries = diet.filter((entry) => entry.adherence_percentage < 70);
  const attentionItems = [
    ...(unreadMessages > 0
      ? [{ id: "messages", title: "Mensajes pendientes", detail: `${unreadMessages} mensajes sin leer`, href: "/messages" }]
      : []),
    ...lowAdherenceEntries.slice(0, 2).map((entry) => ({
      id: `diet-alert-${entry.id}`,
      title: "Adherencia baja",
      detail: `Cliente #${entry.client_id} registro ${entry.adherence_percentage}%`,
      href: `/clients?q=${entry.client_id}`,
    })),
  ];
  const upcomingSessions = sessions
    .filter((session) => session.status === "scheduled" && new Date(session.scheduled_at).getTime() >= currentTime)
    .sort((first, second) => new Date(first.scheduled_at).getTime() - new Date(second.scheduled_at).getTime());
  const sessionsToday = upcomingSessions.filter((session) => {
    const scheduled = new Date(session.scheduled_at);
    const today = new Date(currentTime);
    return scheduled.toDateString() === today.toDateString();
  });
  if (sessionsToday.length > 0) {
    attentionItems.push({
      id: "sessions-today",
      title: "Sesiones de hoy",
      detail: `${sessionsToday.length} sesiones programadas`,
      href: "/sessions?status=scheduled",
    });
  }
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
      const unreadMessagesRequest = apiRequest<{ unread_count: number }>("/messages/unread-count", { token });

      if (user.role === "professional") {
        const [clientsResponse, plansResponse, sessionsResponse, unreadMessagesResponse] = await Promise.all([
          apiRequest<{ clients: AuthUser[] }>("/users/clients", { token }),
          plansRequest,
          sessionsRequest,
          unreadMessagesRequest,
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
        setUnreadMessages(unreadMessagesResponse.unread_count);
        return;
      }

      const [plansResponse, progressResponse, workoutsResponse, dietResponse, sessionsResponse, unreadMessagesResponse] = await Promise.all([
        plansRequest,
        apiRequest<{ progress: ProgressEntry[] }>("/progress", { token }),
        apiRequest<{ workouts: WorkoutEntry[] }>("/workouts", { token }),
        apiRequest<{ diet: DietEntry[] }>("/diet", { token }),
        sessionsRequest,
        unreadMessagesRequest,
      ]);

      setClients([]);
      setPlans(plansResponse.plans);
      setProgress(progressResponse.progress);
      setWorkouts(workoutsResponse.workouts);
      setDiet(dietResponse.diet);
      setSessions(sessionsResponse.sessions);
      setUnreadMessages(unreadMessagesResponse.unread_count);
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
        <FormMessage type="error">Inicia sesión para ver tu panel real.</FormMessage>
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
        <StatCard label="Distribución" value={`${trainingPlans.length}/${nutritionPlans.length}`} detail="Entrenamiento / Nutrición" />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <StatCard label="Adherencia dieta" value={diet.length ? `${averageAdherence}%` : "-"} detail={`${diet.length} registros de dieta`} />
        <StatCard label="Entrenamientos" value={String(workouts.length)} detail="Registros completados" />
        <StatCard label="Próximas sesiones" value={String(upcomingSessions.length)} detail={upcomingSessions[0] ? new Date(upcomingSessions[0].scheduled_at).toLocaleDateString("es-ES") : "Sin sesiones programadas"} />
        <StatCard label="Mensajes pendientes" value={String(unreadMessages)} detail="Sin leer en el chat" />
      </section>

      {user?.role === "client" ? <ClientProgressComparisons progress={progress} diet={diet} workouts={workouts} /> : null}

      <section className="mt-6 rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Requiere atención</h2>
          <span className="text-sm font-semibold text-[#64715f]">{attentionItems.length} alertas activas</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {attentionItems.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todo al dia por ahora.</p> : null}
          {attentionItems.map((item) => (
            <Link key={item.id} href={item.href} className="rounded-md border border-[#ece7dc] p-4 text-sm hover:bg-[#f7f5ef]">
              <p className="font-semibold text-[#18201b]">{item.title}</p>
              <p className="mt-2 text-[#5d6959]">{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{user?.role === "professional" ? "Clientes recientes" : "Tus planes recientes"}</h2>
            <Link href={user?.role === "professional" ? "/clients" : "/training"} className="text-sm font-semibold text-[#c75432]">
              Ver todos
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {user?.role === "professional" && clients.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todavía no hay clientes asignados.</p> : null}
            {user?.role === "professional" ? clients.slice(0, 3).map((client) => (
              <div key={client.id} className="grid gap-3 rounded-md bg-[#f7f5ef] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold">{client.name}</p>
                  <p className="mt-1 text-sm text-[#5d6959]">{client.goal || client.email}</p>
                </div>
                <span className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-[#37513b]">ID #{client.id}</span>
              </div>
            )) : null}
            {user?.role === "client" && plans.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todavía no tienes planes asignados.</p> : null}
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
          <h2 className="text-xl font-semibold">Próximas sesiones</h2>
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
          {activePlans.length === 0 ? <p className="text-sm text-[#5d6959]">No hay planes activos todavía.</p> : null}
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

function ClientProgressComparisons({ progress, diet, workouts }: { progress: ProgressEntry[]; diet: DietEntry[]; workouts: WorkoutEntry[] }) {
  const orderedProgress = [...progress]
    .filter((entry) => entry.created_at)
    .sort((first, second) => new Date(first.created_at ?? 0).getTime() - new Date(second.created_at ?? 0).getTime())
    .slice(-8);
  const orderedDiet = [...diet]
    .filter((entry) => entry.created_at)
    .sort((first, second) => new Date(first.created_at ?? 0).getTime() - new Date(second.created_at ?? 0).getTime())
    .slice(-8);
  const latest = orderedProgress[orderedProgress.length - 1];
  const previous = orderedProgress[orderedProgress.length - 2];
  const workoutMinutes = workouts.reduce((total, entry) => total + (entry.duration_minutes ?? 0), 0);

  return (
    <section className="mt-6 rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Comparativa de progreso</h2>
          <p className="mt-2 text-sm text-[#5d6959]">Evolucion de tus mediciones y registros recientes.</p>
        </div>
        <span className="text-sm font-semibold text-[#64715f]">{orderedProgress.length} mediciones</span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-md bg-[#f7f5ef] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#64715f]">Peso y grasa corporal</p>
              <p className="mt-1 text-xs text-[#5d6959]">Ultimas mediciones registradas por tu profesional</p>
            </div>
            <span className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-[#37513b]">{formatDelta(latest?.weight, previous?.weight, "kg")}</span>
          </div>
          <LineChart
            series={[
              { label: "Peso", color: "#a30000", values: orderedProgress.map((entry) => entry.weight) },
              { label: "Grasa", color: "#c5a059", values: orderedProgress.map((entry) => entry.body_fat) },
            ]}
            labels={orderedProgress.map((entry) => formatShortDate(entry.created_at))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <ComparisonMetric label="Peso actual" value={formatMetric(latest?.weight, "kg")} detail={formatDelta(latest?.weight, previous?.weight, "kg")} />
          <ComparisonMetric label="Grasa corporal" value={formatMetric(latest?.body_fat, "%")} detail={formatDelta(latest?.body_fat, previous?.body_fat, "%")} />
          <ComparisonMetric label="Musculo" value={formatMetric(latest?.muscle_percentage, "%")} detail={formatDelta(latest?.muscle_percentage, previous?.muscle_percentage, "%")} />
          <ComparisonMetric label="Entrenamiento acumulado" value={`${workoutMinutes} min`} detail={`${workouts.length} registros`} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md bg-[#fbfaf7] p-4">
          <p className="text-sm font-semibold text-[#64715f]">Perimetros corporales</p>
          <BarComparison
            items={[
              { label: "Pecho", value: latest?.chest_cm },
              { label: "Cintura", value: latest?.waist_cm },
              { label: "Cadera", value: latest?.hip_cm },
              { label: "Brazo", value: latest?.arm_cm },
              { label: "Muslo", value: latest?.thigh_cm },
            ]}
          />
        </div>
        <div className="rounded-md bg-[#fbfaf7] p-4">
          <p className="text-sm font-semibold text-[#64715f]">Adherencia nutricional</p>
          <MiniBars values={orderedDiet.map((entry) => entry.adherence_percentage)} labels={orderedDiet.map((entry) => formatShortDate(entry.created_at))} />
        </div>
      </div>
    </section>
  );
}

function LineChart({ series, labels }: { series: Array<{ label: string; color: string; values: Array<number | null | undefined> }>; labels: string[] }) {
  const values = series.flatMap((item) => item.values).filter((value): value is number => typeof value === "number");
  if (values.length < 2) {
    return <p className="mt-4 rounded-md bg-white p-4 text-sm text-[#5d6959]">Aun hacen falta al menos dos mediciones para comparar la evolucion.</p>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 360;
  const height = 180;
  const padding = 20;

  return (
    <div className="mt-4 overflow-hidden rounded-md bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label="Grafico de progreso corporal">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ece7dc" strokeWidth="2" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ece7dc" strokeWidth="2" />
        {series.map((item) => {
          const validPoints = item.values
            .map((value, index) => ({ value, index }))
            .filter((point): point is { value: number; index: number } => typeof point.value === "number")
            .map((point) => {
              const x = padding + (point.index / Math.max(item.values.length - 1, 1)) * (width - padding * 2);
              const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
              return { x, y };
            });
          const points = validPoints.map((point) => `${point.x},${point.y}`).join(" ");

          return (
            <g key={item.label}>
              <polyline fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
              {validPoints.map((point, index) => <circle key={`${item.label}-${index}`} cx={point.x} cy={point.y} r="4" fill={item.color} />)}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#64715f]">
        <span>{labels[0] ?? ""}</span>
        <div className="flex gap-3">
          {series.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
        <span>{labels[labels.length - 1] ?? ""}</span>
      </div>
    </div>
  );
}

function BarComparison({ items }: { items: Array<{ label: string; value?: number | null }> }) {
  const max = Math.max(...items.map((item) => item.value ?? 0), 1);

  return (
    <div className="mt-4 grid gap-3">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[72px_1fr_56px] items-center gap-3 text-sm">
          <span className="font-semibold">{item.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-[#ece7dc]">
            <span className="block h-full rounded-full bg-[#37513b]" style={{ width: `${Math.max(((item.value ?? 0) / max) * 100, item.value ? 8 : 0)}%` }} />
          </span>
          <span className="text-right text-[#5d6959]">{formatMetric(item.value, "cm")}</span>
        </div>
      ))}
    </div>
  );
}

function MiniBars({ values, labels }: { values: number[]; labels: string[] }) {
  if (values.length === 0) {
    return <p className="mt-4 rounded-md bg-white p-4 text-sm text-[#5d6959]">Registra comidas desde tu dieta para ver la adherencia.</p>;
  }

  return (
    <div className="mt-4 flex h-44 items-end gap-2 rounded-md bg-white p-3">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex h-full flex-1 flex-col justify-end gap-2">
          <span className="rounded-t-md bg-[#c75432]" style={{ height: `${Math.max(value, 4)}%` }} />
          <span className="truncate text-center text-[10px] text-[#64715f]">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

function ComparisonMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md bg-[#f7f5ef] p-4">
      <p className="text-xs font-semibold text-[#64715f]">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#5d6959]">{detail}</p>
    </div>
  );
}

function formatMetric(value: number | null | undefined, suffix: string) {
  if (value === null || value === undefined) return "-";
  return `${value} ${suffix}`;
}

function formatDelta(current: number | null | undefined, previous: number | null | undefined, suffix: string) {
  if (current === null || current === undefined || previous === null || previous === undefined) return "Sin comparativa";
  const delta = Number((current - previous).toFixed(1));
  if (delta === 0) return `Sin cambios ${suffix}`;
  return `${delta > 0 ? "+" : ""}${delta} ${suffix}`;
}

function formatShortDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(value));
}
