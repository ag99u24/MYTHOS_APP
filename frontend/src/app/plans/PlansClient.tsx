"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { AuthUser, getStoredUser, getToken } from "@/lib/session";

type PlanItem = {
  id?: number;
  day: string;
  title: string;
  details?: string | null;
  sort_order?: number;
};

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
  items: PlanItem[];
};

type PlanFormState = {
  title: string;
  description: string;
  category: string;
  status: string;
  client_id: string;
  start_date: string;
  end_date: string;
  item_day: string;
  item_title: string;
  item_details: string;
};

const emptyForm: PlanFormState = {
  title: "",
  description: "",
  category: "Entrenamiento",
  status: "draft",
  client_id: "",
  start_date: "",
  end_date: "",
  item_day: "Lunes",
  item_title: "",
  item_details: "",
};

export function PlansClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);

  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);

  const loadPlans = useCallback(async (activeToken = token) => {
    if (!activeToken) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiRequest<{ plans: Plan[] }>("/plans", { token: activeToken });
      setPlans(response.plans);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudieron cargar los planes.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadClients = useCallback(async (activeToken = token) => {
    if (!activeToken) {
      return;
    }

    try {
      const response = await apiRequest<{ clients: AuthUser[] }>("/users/clients", { token: activeToken });
      setClients(response.clients);
    } catch {
      setClients([]);
    }
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (token) {
      void Promise.resolve().then(() => loadPlans(token));
    }
  }, [loadPlans, token]);

  useEffect(() => {
    if (token && user?.role === "professional") {
      void Promise.resolve().then(() => loadClients(token));
    }
  }, [loadClients, token, user?.role]);

  function updateField(field: keyof PlanFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectPlan(plan: Plan) {
    const firstItem = plan.items[0];
    setSelectedPlan(plan);
    setSuccess("");
    setError("");
    setForm({
      title: plan.title,
      description: plan.description ?? "",
      category: plan.category,
      status: plan.status,
      client_id: String(plan.client_id),
      start_date: plan.start_date ?? "",
      end_date: plan.end_date ?? "",
      item_day: firstItem?.day ?? "Lunes",
      item_title: firstItem?.title ?? "",
      item_details: firstItem?.details ?? "",
    });
  }

  function startNewPlan() {
    setSelectedPlan(null);
    setForm(emptyForm);
    setSuccess("");
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Inicia sesion para gestionar planes.");
      return;
    }

    if (user?.role !== "professional") {
      setError("Solo profesionales pueden crear o editar planes.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      status: form.status,
      client_id: Number(form.client_id),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      items: form.item_title
        ? [
            {
              day: form.item_day,
              title: form.item_title,
              details: form.item_details,
              sort_order: 0,
            },
          ]
        : [],
    };

    try {
      if (selectedPlan) {
        const response = await apiRequest<{ plan: Plan }>(`/plans/${selectedPlan.id}`, {
          method: "PATCH",
          body: payload,
          token,
        });
        setPlans((current) => current.map((plan) => (plan.id === response.plan.id ? response.plan : plan)));
        setSelectedPlan(response.plan);
        setSuccess("Plan actualizado correctamente.");
      } else {
        const response = await apiRequest<{ plan: Plan }>("/plans", {
          method: "POST",
          body: payload,
          token,
        });
        setPlans((current) => [response.plan, ...current]);
        setSelectedPlan(response.plan);
        setSuccess("Plan creado correctamente.");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar el plan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePlan(planId: number) {
    if (!token) {
      setError("Inicia sesion para eliminar planes.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await apiRequest<{ message: string }>(`/plans/${planId}`, {
        method: "DELETE",
        token,
      });
      setPlans((current) => current.filter((plan) => plan.id !== planId));
      if (selectedPlan?.id === planId) {
        startNewPlan();
      }
      setSuccess("Plan eliminado correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo eliminar el plan.");
    }
  }

  if (!token) {
    return (
      <section className="rounded-lg border border-[#d9d4c7] bg-white p-6 shadow-sm">
        <FormMessage type="error">Inicia sesion para gestionar planes reales.</FormMessage>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Listado de planes</h2>
          <button className="rounded-md bg-[#c75432] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a94529]" onClick={startNewPlan}>
            Crear plan
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {isLoading ? <p className="text-sm text-[#5d6959]">Cargando planes...</p> : null}
          {!isLoading && plans.length === 0 ? (
            <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todavia no hay planes creados.</p>
          ) : null}
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-md border border-[#ece7dc] p-4">
              <div className="flex items-start justify-between gap-4">
                <button className="text-left" onClick={() => selectPlan(plan)}>
                  <p className="font-semibold">{plan.title}</p>
                  <p className="mt-1 text-sm text-[#5d6959]">{clientNameById.get(plan.client_id) ?? `Cliente #${plan.client_id}`}</p>
                </button>
                <span className="rounded-md bg-[#f7f5ef] px-3 py-1 text-sm font-semibold">{plan.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-[#5d6959]">
                <span>{plan.category}</span>
                <span>{plan.start_date ?? "Sin fecha"}</span>
                <span>{plan.items.length} bloques</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={() => selectPlan(plan)}>
                  Editar
                </button>
                <button className="rounded-md border border-[#f1b5a4] px-3 py-2 text-sm font-semibold text-[#963519] hover:bg-[#fff4ef]" onClick={() => deletePlan(plan.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      {user?.role === "professional" ? (
      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{selectedPlan ? "Editar plan" : "Crear plan"}</h2>
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          {error ? <FormMessage type="error">{error}</FormMessage> : null}
          {success ? <FormMessage type="success">{success}</FormMessage> : null}
          <input
            className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"
            placeholder="Titulo del plan"
            required
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <select
              className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"
              required
              value={form.client_id}
              onChange={(event) => updateField("client_id", event.target.value)}
            >
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              <option>Entrenamiento</option>
              <option>Nutricion</option>
              <option>Mixto</option>
            </select>
            <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
              <option value="draft">Borrador</option>
              <option value="active">Activo</option>
              <option value="finished">Finalizado</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" type="date" value={form.start_date} onChange={(event) => updateField("start_date", event.target.value)} />
            <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" type="date" value={form.end_date} onChange={(event) => updateField("end_date", event.target.value)} />
          </div>
          <textarea
            className="min-h-24 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3"
            placeholder="Descripcion del plan"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />

          <div className="rounded-md bg-[#f7f5ef] p-4">
            <p className="font-semibold">Primer bloque del plan</p>
            <div className="mt-4 grid gap-4 md:grid-cols-[140px_1fr]">
              <input className="h-11 rounded-md border border-[#d9d4c7] bg-white px-3" placeholder="Dia" value={form.item_day} onChange={(event) => updateField("item_day", event.target.value)} />
              <input className="h-11 rounded-md border border-[#d9d4c7] bg-white px-3" placeholder="Actividad o comida" value={form.item_title} onChange={(event) => updateField("item_title", event.target.value)} />
            </div>
            <textarea
              className="mt-4 min-h-20 w-full rounded-md border border-[#d9d4c7] bg-white px-3 py-3"
              placeholder="Detalles del bloque"
              value={form.item_details}
              onChange={(event) => updateField("item_details", event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button disabled={isSaving} className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f] disabled:cursor-not-allowed disabled:opacity-70">
              {isSaving ? "Guardando..." : selectedPlan ? "Guardar cambios" : "Crear plan"}
            </button>
            <button type="button" className="rounded-md border border-[#d9d4c7] px-4 py-3 font-semibold hover:bg-[#f7f5ef]" onClick={startNewPlan}>
              Limpiar
            </button>
          </div>
        </form>
      </article>
      ) : null}
    </section>
  );
}
