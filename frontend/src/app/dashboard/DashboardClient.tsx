"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { StatCard } from "@/components/StatCard";
import { apiRequest } from "@/lib/api";
import { AuthUser, getToken } from "@/lib/session";

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

export function DashboardClient() {
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);

  const activePlans = plans.filter((plan) => plan.status === "active");
  const draftPlans = plans.filter((plan) => plan.status === "draft");
  const nutritionPlans = plans.filter((plan) => plan.category.toLowerCase() === "nutricion");
  const trainingPlans = plans.filter((plan) => plan.category.toLowerCase() === "entrenamiento");

  const loadDashboard = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [clientsResponse, plansResponse] = await Promise.all([
        apiRequest<{ clients: AuthUser[] }>("/users/clients", { token }),
        apiRequest<{ plans: Plan[] }>("/plans", { token }),
      ]);

      setClients(clientsResponse.clients);
      setPlans(plansResponse.plans);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar el panel.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void Promise.resolve().then(loadDashboard);
    }
  }, [loadDashboard, token]);

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
        <StatCard label="Clientes activos" value={String(clients.length)} detail={isLoading ? "Cargando..." : "Clientes asignados a tu cuenta"} />
        <StatCard label="Planes en curso" value={String(activePlans.length)} detail={`${draftPlans.length} borradores pendientes`} />
        <StatCard label="Distribucion" value={`${trainingPlans.length}/${nutritionPlans.length}`} detail="Entrenamiento / Nutricion" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Clientes recientes</h2>
            <Link href="/clients" className="text-sm font-semibold text-[#c75432]">
              Ver todos
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {clients.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todavia no hay clientes asignados.</p> : null}
            {clients.slice(0, 3).map((client) => (
              <div key={client.id} className="grid gap-3 rounded-md bg-[#f7f5ef] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold">{client.name}</p>
                  <p className="mt-1 text-sm text-[#5d6959]">{client.goal || client.email}</p>
                </div>
                <span className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-[#37513b]">ID #{client.id}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Actividad reciente</h2>
          <div className="mt-5 grid gap-3">
            {plans.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Crea tu primer plan para ver actividad aqui.</p> : null}
            {plans.slice(0, 3).map((plan) => (
              <div key={plan.id} className="rounded-md border border-[#ece7dc] p-4 text-sm leading-6 text-[#3d493f]">
                <span className="font-semibold">{plan.title}</span> para cliente #{plan.client_id}
              </div>
            ))}
          </div>
        </article>
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
