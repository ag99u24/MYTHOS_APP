"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { AuthUser, getToken } from "@/lib/session";

type ClientsResponse = {
  clients: AuthUser[];
};

type Plan = {
  id: number;
  title: string;
  category: string;
  status: string;
  client_id: number;
  items: Array<{ id?: number; title: string }>;
};

type ProgressEntry = { id: number; weight?: number | null; body_fat?: number | null; mood?: string | null; created_at?: string | null };
type WorkoutEntry = { id: number; title: string; workout_type?: string | null; duration_minutes?: number | null; intensity?: string | null; created_at?: string | null };
type DietEntry = { id: number; adherence_percentage: number; meals_completed?: number | null; total_meals?: number | null; created_at?: string | null };
type ClientProfile = {
  plans: Plan[];
  progress: ProgressEntry[];
  workouts: WorkoutEntry[];
  diet: DietEntry[];
};

export function ClientsClient() {
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [selectedClient, setSelectedClient] = useState<AuthUser | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [removingClientId, setRemovingClientId] = useState<number | null>(null);

  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);

  const filteredClients = clients.filter((client) => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return client.name.toLowerCase().includes(term) || client.email.toLowerCase().includes(term) || String(client.id).includes(term);
  });

  const loadClients = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiRequest<ClientsResponse>("/users/clients", { token });
      setClients(response.clients);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudieron cargar los clientes.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void Promise.resolve().then(loadClients);
    }
  }, [loadClients, token]);

  async function handleAssignClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Inicia sesion como profesional para asignar clientes.");
      return;
    }

    setIsAssigning(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest<{ client: AuthUser }>("/users/clients", {
        method: "POST",
        body: { email },
        token,
      });

      setClients((current) => [response.client, ...current]);
      setEmail("");
      setSuccess("Cliente asignado correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo asignar el cliente.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRemoveClient(clientId: number) {
    if (!token) {
      setError("Inicia sesion como profesional para desasignar clientes.");
      return;
    }

    setRemovingClientId(clientId);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ message: string }>(`/users/clients/${clientId}`, {
        method: "DELETE",
        token,
      });
      setClients((current) => current.filter((client) => client.id !== clientId));
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
        setClientProfile(null);
      }
      setSuccess("Cliente desasignado correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo desasignar el cliente.");
    } finally {
      setRemovingClientId(null);
    }
  }

  async function handleViewClient(client: AuthUser) {
    if (!token) {
      setError("Inicia sesion como profesional para ver la ficha.");
      return;
    }

    setSelectedClient(client);
    setClientProfile(null);
    setIsProfileLoading(true);
    setError("");

    try {
      const [plansResponse, progressResponse, workoutsResponse, dietResponse] = await Promise.all([
        apiRequest<{ plans: Plan[] }>("/plans", { token }),
        apiRequest<{ progress: ProgressEntry[] }>(`/progress?client_id=${client.id}`, { token }),
        apiRequest<{ workouts: WorkoutEntry[] }>(`/workouts?client_id=${client.id}`, { token }),
        apiRequest<{ diet: DietEntry[] }>(`/diet?client_id=${client.id}`, { token }),
      ]);

      setClientProfile({
        plans: plansResponse.plans.filter((plan) => plan.client_id === client.id),
        progress: progressResponse.progress,
        workouts: workoutsResponse.workouts,
        diet: dietResponse.diet,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar la ficha del cliente.");
    } finally {
      setIsProfileLoading(false);
    }
  }

  if (!token) {
    return (
      <section className="rounded-lg border border-[#d9d4c7] bg-white p-6 shadow-sm">
        <FormMessage type="error">Inicia sesion como profesional para gestionar clientes reales.</FormMessage>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Asignar cliente</h2>
        <p className="mt-2 text-sm leading-6 text-[#5d6959]">
          El cliente debe estar registrado previamente con rol de cliente. Despues podras usar su ID para crear planes.
        </p>

        <form className="mt-5 grid gap-4" onSubmit={handleAssignClient}>
          {error ? <FormMessage type="error">{error}</FormMessage> : null}
          {success ? <FormMessage type="success">{success}</FormMessage> : null}
          <label className="grid gap-2 text-sm font-medium text-[#344036]">
            Email del cliente
            <input
              className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"
              placeholder="cliente@email.com"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button
            disabled={isAssigning}
            className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isAssigning ? "Asignando..." : "Anadir cliente"}
          </button>
        </form>
      </article>

      <article className="rounded-lg border border-[#d9d4c7] bg-white shadow-sm">
        <div className="grid gap-3 border-b border-[#ece7dc] p-5 md:grid-cols-[1fr_160px]">
          <input
            placeholder="Buscar por nombre, email o ID"
            className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={loadClients}>
            Actualizar
          </button>
        </div>

        <div className="grid">
          {isLoading ? <p className="p-5 text-sm text-[#5d6959]">Cargando clientes...</p> : null}
          {!isLoading && filteredClients.length === 0 ? (
            <p className="p-5 text-sm text-[#5d6959]">Todavia no hay clientes asignados.</p>
          ) : null}
          {filteredClients.map((client) => (
            <article key={client.id} className="grid gap-4 border-b border-[#ece7dc] p-5 last:border-b-0 lg:grid-cols-[1.2fr_1fr_120px_120px_130px] lg:items-center">
              <div>
                <p className="font-semibold">{client.name}</p>
                <p className="mt-1 text-sm text-[#5d6959]">{client.email}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#344036]">{client.goal || "Objetivo pendiente"}</p>
                <p className="mt-1 text-sm text-[#64715f]">{client.specialty || "Perfil cliente"}</p>
              </div>
              <span className="w-fit rounded-md bg-[#edf4e9] px-3 py-1 text-sm font-semibold text-[#37513b]">ID #{client.id}</span>
              <button className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={() => void handleViewClient(client)}>
                Ver ficha
              </button>
              <button
                className="rounded-md border border-[#f1b5a4] px-3 py-2 text-sm font-semibold text-[#963519] hover:bg-[#fff4ef] disabled:opacity-60"
                disabled={removingClientId === client.id}
                onClick={() => void handleRemoveClient(client.id)}
              >
                {removingClientId === client.id ? "Quitando..." : "Desasignar"}
              </button>
            </article>
          ))}
        </div>
      </article>

      {selectedClient ? (
        <ClientProfilePanel client={selectedClient} profile={clientProfile} isLoading={isProfileLoading} onClose={() => {
          setSelectedClient(null);
          setClientProfile(null);
        }} />
      ) : null}
    </section>
  );
}

function ClientProfilePanel({ client, profile, isLoading, onClose }: { client: AuthUser; profile: ClientProfile | null; isLoading: boolean; onClose: () => void }) {
  const activePlans = profile?.plans.filter((plan) => plan.status === "active") ?? [];
  const latestDiet = profile?.diet[0];
  const latestWorkout = profile?.workouts[0];
  const latestProgress = profile?.progress[0];

  return (
    <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm xl:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{client.name}</h2>
          <p className="mt-1 text-sm text-[#5d6959]">{client.email}</p>
          <p className="mt-2 text-sm font-semibold text-[#344036]">{client.goal || "Objetivo pendiente"}</p>
        </div>
        <button className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={onClose}>
          Cerrar ficha
        </button>
      </div>

      {isLoading ? <p className="mt-5 rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Cargando ficha...</p> : null}

      {!isLoading && profile ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          <ProfileMetric label="Planes activos" value={String(activePlans.length)} detail={`${profile.plans.length} planes totales`} />
          <ProfileMetric label="Dieta" value={latestDiet ? `${latestDiet.adherence_percentage}%` : "-"} detail={latestDiet ? `${latestDiet.meals_completed ?? "-"} / ${latestDiet.total_meals ?? "-"} comidas` : "Sin registros"} />
          <ProfileMetric label="Entrenamiento" value={latestWorkout ? latestWorkout.title : "-"} detail={latestWorkout ? `${latestWorkout.duration_minutes ?? "-"} min - ${latestWorkout.intensity ?? "-"}` : "Sin registros"} />
          <ProfileMetric label="Check-in" value={latestProgress?.weight ? `${latestProgress.weight} kg` : "-"} detail={latestProgress?.mood ?? "Sin registros"} />
        </div>
      ) : null}

      {!isLoading && profile ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-[#ece7dc] p-4">
            <h3 className="font-semibold">Planes recientes</h3>
            <div className="mt-3 grid gap-2">
              {profile.plans.length === 0 ? <p className="text-sm text-[#5d6959]">No hay planes para este cliente.</p> : null}
              {profile.plans.slice(0, 4).map((plan) => (
                <div key={plan.id} className="rounded-md bg-[#f7f5ef] p-3 text-sm">
                  <p className="font-semibold">{plan.title}</p>
                  <p className="mt-1 text-[#5d6959]">{plan.category} - {plan.status} - {plan.items.length} bloques</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[#ece7dc] p-4">
            <h3 className="font-semibold">Ultima actividad</h3>
            <div className="mt-3 grid gap-2 text-sm">
              <ActivityLine label="Dieta" value={latestDiet ? `${latestDiet.adherence_percentage}% cumplimiento` : "Sin registros"} date={latestDiet?.created_at} />
              <ActivityLine label="Entreno" value={latestWorkout ? latestWorkout.title : "Sin registros"} date={latestWorkout?.created_at} />
              <ActivityLine label="Progreso" value={latestProgress ? `Peso ${latestProgress.weight ?? "-"} kg` : "Sin registros"} date={latestProgress?.created_at} />
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ProfileMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md bg-[#f7f5ef] p-4">
      <p className="text-xs font-semibold text-[#64715f]">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#5d6959]">{detail}</p>
    </div>
  );
}

function ActivityLine({ label, value, date }: { label: string; value: string; date?: string | null }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-[#f7f5ef] p-3 sm:flex-row sm:items-center sm:justify-between">
      <span><span className="font-semibold">{label}:</span> {value}</span>
      <span className="text-xs text-[#64715f]">{date ? new Date(date).toLocaleDateString("es-ES") : "Sin fecha"}</span>
    </div>
  );
}
