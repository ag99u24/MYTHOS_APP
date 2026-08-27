"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { PaginationControls, PaginationMeta } from "@/components/PaginationControls";
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

type PlansResponse = {
  plans: Plan[];
  meta?: PaginationMeta;
};

type WorkoutEntry = {
  id: number;
  plan_item_id?: number | null;
  sets_completed?: number | null;
  reps_completed?: number | null;
};

type DietEntry = {
  id: number;
  plan_item_id?: number | null;
  consumed_food?: string | null;
};

type PlanFormState = {
  title: string;
  description: string;
  category: string;
  status: string;
  client_id: string;
  start_date: string;
  end_date: string;
  items: Array<{
    day: string;
    title: string;
    details: string;
  }>;
};

type PlanMode = "all" | "training" | "nutrition";

type PlansClientProps = {
  mode?: PlanMode;
};

const modeConfig = {
  all: {
    category: "",
    listTitle: "Listado de planes",
    clientListTitle: "Mis planes",
    clientIntro: "Consulta los planes que tu profesional ha preparado para ti.",
    clientDetailTitle: "Detalle del plan",
    emptyText: "Todavia no hay planes creados.",
    createButton: "Crear plan",
    formTitle: "Crear plan",
    editTitle: "Editar plan",
    successCreated: "Plan creado correctamente.",
    blockTitle: "Bloques del plan",
    addBlock: "Anadir bloque",
    itemPlaceholder: "Actividad o comida",
    detailsPlaceholder: "Detalles del bloque",
    descriptionPlaceholder: "Descripcion del plan",
  },
  training: {
    category: "Entrenamiento",
    listTitle: "Planes de entrenamiento",
    clientListTitle: "Mis entrenamientos",
    clientIntro: "Consulta tus rutinas, sesiones y ejercicios asignados.",
    clientDetailTitle: "Entrenamiento asignado",
    emptyText: "Todavia no hay entrenamientos asignados.",
    createButton: "Agregar entrenamiento",
    formTitle: "Agregar entrenamiento",
    editTitle: "Editar entrenamiento",
    successCreated: "Entrenamiento asignado correctamente.",
    blockTitle: "Sesiones y ejercicios",
    addBlock: "Anadir sesion",
    itemPlaceholder: "Ejercicio o sesion",
    detailsPlaceholder: "Series, repeticiones, descanso, intensidad...",
    descriptionPlaceholder: "Objetivo del entrenamiento",
  },
  nutrition: {
    category: "Nutricion",
    listTitle: "Planes de nutricion",
    clientListTitle: "Mi dieta",
    clientIntro: "Consulta tus comidas, pautas y recomendaciones nutricionales.",
    clientDetailTitle: "Dieta asignada",
    emptyText: "Todavia no hay planes de nutricion asignados.",
    createButton: "Agregar dieta",
    formTitle: "Agregar dieta",
    editTitle: "Editar nutricion",
    successCreated: "Nutricion asignada correctamente.",
    blockTitle: "Comidas y pautas",
    addBlock: "Anadir comida",
    itemPlaceholder: "Comida o pauta",
    detailsPlaceholder: "Alimentos, cantidades, macros o recomendaciones...",
    descriptionPlaceholder: "Objetivo nutricional",
  },
} satisfies Record<PlanMode, Record<string, string>>;

const emptyForm: PlanFormState = {
  title: "",
  description: "",
  category: "Entrenamiento",
  status: "draft",
  client_id: "",
  start_date: "",
  end_date: "",
  items: [{ day: "Lunes", title: "", details: "" }],
};

export function PlansClient({ mode = "all" }: PlansClientProps) {
  const config = modeConfig[mode];
  const fixedCategory = config.category;
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("client_id") ?? "";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansMeta, setPlansMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(fixedCategory);
  const [clientFilter, setClientFilter] = useState(initialClientId);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormState>(() => ({ ...emptyForm, category: fixedCategory || emptyForm.category, client_id: initialClientId }));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trackingItemId, setTrackingItemId] = useState<number | null>(null);

  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);
  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);
  const isClient = user?.role === "client";
  const readablePlan = selectedPlan ?? (user?.role === "client" ? plans[0] ?? null : null);

  const loadPlans = useCallback(async (activeToken = token) => {
    if (!activeToken) return;

    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ page: String(page), per_page: "10" });
      const activeCategory = fixedCategory || categoryFilter;
      if (statusFilter) params.set("status", statusFilter);
      if (activeCategory) params.set("category", activeCategory);
      if (clientFilter && user?.role === "professional") params.set("client_id", clientFilter);

      const response = await apiRequest<PlansResponse>(`/plans?${params.toString()}`, { token: activeToken });
      setPlans(response.plans);
      setPlansMeta(response.meta ?? null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudieron cargar los planes.");
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, clientFilter, fixedCategory, page, statusFilter, token, user]);

  const loadClients = useCallback(async (activeToken = token) => {
    if (!activeToken) return;

    try {
      const response = await apiRequest<{ clients: AuthUser[] }>("/users/clients?per_page=100", { token: activeToken });
      setClients(response.clients);
    } catch {
      setClients([]);
    }
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (token) void Promise.resolve().then(() => loadPlans(token));
  }, [loadPlans, token]);

  useEffect(() => {
    if (token && user?.role === "professional") void Promise.resolve().then(() => loadClients(token));
  }, [loadClients, token, user?.role]);

  function updateField(field: keyof PlanFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectPlan(plan: Plan) {
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
      items: plan.items.length
        ? plan.items.map((item) => ({ day: item.day, title: item.title, details: item.details ?? "" }))
        : [{ day: "Lunes", title: "", details: "" }],
    });
  }

  function startNewPlan() {
    setSelectedPlan(null);
    setForm({ ...emptyForm, category: fixedCategory || emptyForm.category, client_id: clientFilter, items: [{ day: "Lunes", title: "", details: "" }] });
    setSuccess("");
    setError("");
  }

  function updateItem(index: number, field: "day" | "title" | "details", value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, { day: "General", title: "", details: "" }] }));
  }

  function removeItem(index: number) {
    setForm((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((_, itemIndex) => itemIndex !== index) : current.items,
    }));
  }

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
    if (setter === setClientFilter && !selectedPlan) {
      setForm((current) => ({ ...current, client_id: value }));
    }
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

    const planItems = form.items
      .filter((item) => item.title.trim())
      .map((item, index) => ({
        day: item.day || "General",
        title: item.title.trim(),
        details: item.details,
        sort_order: index,
      }));

    if (!form.client_id) {
      setError("Selecciona el cliente al que quieres asignar este plan.");
      setIsSaving(false);
      return;
    }

    if (planItems.length === 0) {
      setError(`Anade al menos un bloque en ${config.blockTitle.toLowerCase()}.`);
      setIsSaving(false);
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      category: fixedCategory || form.category,
      status: form.status,
      client_id: Number(form.client_id),
      start_date: form.start_date || null,
      end_date: null,
      items: planItems,
    };

    try {
      if (selectedPlan) {
        const response = await apiRequest<{ plan: Plan }>(`/plans/${selectedPlan.id}`, { method: "PATCH", body: payload, token });
        setPlans((current) => current.map((plan) => (plan.id === response.plan.id ? response.plan : plan)));
        setSelectedPlan(response.plan);
        setSuccess("Plan actualizado correctamente.");
        await loadPlans(token);
      } else {
        const response = await apiRequest<{ plan: Plan }>("/plans", { method: "POST", body: payload, token });
        setPlans((current) => [response.plan, ...current]);
        setPage(1);
        setSelectedPlan(response.plan);
        setSuccess(config.successCreated);
        await loadPlans(token);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar el plan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleWorkoutTracking(event: React.FormEvent<HTMLFormElement>, item: PlanItem) {
    event.preventDefault();
    if (!token || !item.id) return;

    const formData = new FormData(event.currentTarget);
    setTrackingItemId(item.id);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ workout: WorkoutEntry }>("/workouts", {
        method: "POST",
        token,
        body: {
          plan_item_id: item.id,
          title: item.title,
          workout_type: "Plan asignado",
          sets_completed: formData.get("sets_completed") ? Number(formData.get("sets_completed")) : null,
          reps_completed: formData.get("reps_completed") ? Number(formData.get("reps_completed")) : null,
          intensity: String(formData.get("intensity") || "") || null,
          notes: String(formData.get("notes") || "") || null,
        },
      });
      event.currentTarget.reset();
      setSuccess("Entrenamiento registrado correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo registrar el entrenamiento.");
    } finally {
      setTrackingItemId(null);
    }
  }

  async function handleDietTracking(event: React.FormEvent<HTMLFormElement>, item: PlanItem) {
    event.preventDefault();
    if (!token || !item.id) return;

    const formData = new FormData(event.currentTarget);
    setTrackingItemId(item.id);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ diet: DietEntry }>("/diet", {
        method: "POST",
        token,
        body: {
          plan_item_id: item.id,
          recommended_meal: item.title,
          consumed_food: String(formData.get("consumed_food") || ""),
          adherence_percentage: formData.get("adherence_percentage") ? Number(formData.get("adherence_percentage")) : 100,
          meals_completed: formData.get("consumed_food") ? 1 : null,
          total_meals: readablePlan?.items.length ?? null,
          water_liters: formData.get("water_liters") ? Number(formData.get("water_liters")) : null,
          notes: String(formData.get("notes") || "") || null,
        },
      });
      event.currentTarget.reset();
      setSuccess("Comida registrada correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo registrar la comida.");
    } finally {
      setTrackingItemId(null);
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
      await apiRequest<{ message: string }>(`/plans/${planId}`, { method: "DELETE", token });
      setPlans((current) => current.filter((plan) => plan.id !== planId));
      if (selectedPlan?.id === planId) startNewPlan();
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
    <section className={`grid gap-6 ${isClient ? "xl:grid-cols-[0.82fr_1.18fr]" : "xl:grid-cols-[0.95fr_1.05fr]"}`}>
      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{isClient ? config.clientListTitle : config.listTitle}</h2>
            {isClient ? <p className="mt-2 text-sm leading-6 text-[#5d6959]">{config.clientIntro}</p> : null}
          </div>
          {user?.role === "professional" ? (
            <button className="rounded-md bg-[#a30000] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8b0000]" onClick={startNewPlan}>
              {config.createButton}
            </button>
          ) : null}
        </div>

        <div className={`mt-4 grid gap-3 ${fixedCategory ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          <select className="h-10 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 text-sm" value={statusFilter} onChange={(event) => updateFilter(setStatusFilter, event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="active">Activos</option>
            <option value="finished">Finalizados</option>
          </select>
          {!fixedCategory ? (
            <select className="h-10 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 text-sm" value={categoryFilter} onChange={(event) => updateFilter(setCategoryFilter, event.target.value)}>
              <option value="">Todas las categorias</option>
              <option value="Entrenamiento">Entrenamiento</option>
              <option value="Nutricion">Nutricion</option>
              <option value="Mixto">Mixto</option>
            </select>
          ) : null}
          {user?.role === "professional" ? (
            <select className="h-10 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 text-sm" value={clientFilter} onChange={(event) => updateFilter(setClientFilter, event.target.value)}>
              <option value="">Todos los clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3">
          {isLoading ? <p className="text-sm text-[#5d6959]">Cargando planes...</p> : null}
          {!isLoading && plans.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">{config.emptyText}</p> : null}
          {plans.map((plan) => (
            <div key={plan.id} className={`rounded-md border p-4 ${isClient && readablePlan?.id === plan.id ? "border-[#c5a059] bg-[#fbfaf7]" : "border-[#ece7dc]"}`}>
              <div className="flex items-start justify-between gap-4">
                <button className="text-left" onClick={() => selectPlan(plan)}>
                  <p className="font-semibold">{plan.title}</p>
                  <p className="mt-1 text-sm text-[#5d6959]">
                    {isClient ? "Asignado por tu profesional" : clientNameById.get(plan.client_id) ?? `Cliente #${plan.client_id}`}
                  </p>
                </button>
                <span className="rounded-md bg-[#f7f5ef] px-3 py-1 text-sm font-semibold">{plan.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-[#5d6959]">
                <span>{plan.category}</span>
                <span>{plan.start_date ?? "Sin fecha"}</span>
                <span>{plan.items.length} bloques</span>
              </div>
              {user?.role === "professional" ? (
                <div className="mt-4 flex gap-2">
                  <button className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={() => selectPlan(plan)}>
                    Editar
                  </button>
                  <button className="rounded-md border border-[#f1b5a4] px-3 py-2 text-sm font-semibold text-[#963519] hover:bg-[#fff4ef]" onClick={() => deletePlan(plan.id)}>
                    Eliminar
                  </button>
                </div>
              ) : (
                <button className="mt-4 rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-white" onClick={() => selectPlan(plan)}>
                  Ver detalle
                </button>
              )}
            </div>
          ))}
        </div>
        <PaginationControls meta={plansMeta} isLoading={isLoading} onPageChange={setPage} />
      </article>

      {user?.role === "professional" ? (
        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{selectedPlan ? config.editTitle : config.formTitle}</h2>
          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            {error ? <FormMessage type="error">{error}</FormMessage> : null}
            {success ? <FormMessage type="success">{success}</FormMessage> : null}
            <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Titulo del plan" required value={form.title} onChange={(event) => updateField("title", event.target.value)} />

            <div className={`grid gap-4 ${fixedCategory ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" required value={form.client_id} onChange={(event) => updateField("client_id", event.target.value)}>
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.email}
                  </option>
                ))}
              </select>
              {!fixedCategory ? (
                <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" value={form.category} onChange={(event) => updateField("category", event.target.value)}>
                  <option>Entrenamiento</option>
                  <option>Nutricion</option>
                  <option>Mixto</option>
                </select>
              ) : null}
              <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="finished">Finalizado</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-[#3d493f]" htmlFor="plan-start-date">Inicio del plan</label>
              <input id="plan-start-date" className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" type="date" value={form.start_date} onChange={(event) => updateField("start_date", event.target.value)} />
            </div>
            <textarea className="min-h-24 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3" placeholder={config.descriptionPlaceholder} value={form.description} onChange={(event) => updateField("description", event.target.value)} />

            <div className="rounded-md bg-[#f7f5ef] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold">{config.blockTitle}</p>
                <button type="button" className="rounded-md border border-[#d9d4c7] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#fbfaf7]" onClick={addItem}>
                  {config.addBlock}
                </button>
              </div>
              <div className="mt-4 grid gap-4">
                {form.items.map((item, index) => (
                  <div key={`${item.day}-${index}`} className="rounded-md border border-[#d9d4c7] bg-white p-4">
                    <div className="grid gap-4 md:grid-cols-[140px_1fr_auto]">
                      <input className="h-11 rounded-md border border-[#d9d4c7] px-3" placeholder="Dia" value={item.day} onChange={(event) => updateItem(index, "day", event.target.value)} />
                      <input className="h-11 rounded-md border border-[#d9d4c7] px-3" placeholder={config.itemPlaceholder} value={item.title} onChange={(event) => updateItem(index, "title", event.target.value)} />
                      <button type="button" className="rounded-md border border-[#f1b5a4] px-3 py-2 text-sm font-semibold text-[#963519] hover:bg-[#fff4ef] disabled:opacity-50" disabled={form.items.length === 1} onClick={() => removeItem(index)}>
                        Quitar
                      </button>
                    </div>
                    <textarea className="mt-4 min-h-20 w-full rounded-md border border-[#d9d4c7] px-3 py-3" placeholder={config.detailsPlaceholder} value={item.details} onChange={(event) => updateItem(index, "details", event.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button disabled={isSaving} className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f] disabled:cursor-not-allowed disabled:opacity-70">
                {isSaving ? "Guardando..." : selectedPlan ? "Guardar cambios" : config.createButton}
              </button>
              <button type="button" className="rounded-md border border-[#d9d4c7] px-4 py-3 font-semibold hover:bg-[#f7f5ef]" onClick={startNewPlan}>
                Limpiar
              </button>
            </div>
          </form>
        </article>
      ) : (
        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          {readablePlan ? (
            <>
              <div className="flex flex-col gap-3 border-b border-[#ece7dc] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#a30000]">{config.clientDetailTitle}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{readablePlan.title}</h2>
                  {readablePlan.description ? <p className="mt-3 leading-7 text-[#4f5d75]">{readablePlan.description}</p> : null}
                </div>
                <span className="rounded-md bg-[#f7f5ef] px-3 py-1 text-sm font-semibold">{readablePlan.status}</span>
              </div>

              {error ? <div className="mt-4"><FormMessage type="error">{error}</FormMessage></div> : null}
              {success ? <div className="mt-4"><FormMessage type="success">{success}</FormMessage></div> : null}

              <div className="mt-4 grid gap-3 text-sm text-[#5d6959] sm:grid-cols-2">
                <div className="rounded-md bg-[#f7f5ef] p-3">
                  <p className="font-semibold text-[#18201b]">Inicio</p>
                  <p className="mt-1">{readablePlan.start_date ?? "Sin fecha"}</p>
                </div>
                <div className="rounded-md bg-[#f7f5ef] p-3">
                  <p className="font-semibold text-[#18201b]">Contenido</p>
                  <p className="mt-1">{readablePlan.items.length} bloques</p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold">{config.blockTitle}</h3>
                <div className="mt-4 grid gap-3">
                  {readablePlan.items.length === 0 ? (
                    <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Este plan aun no tiene bloques detallados.</p>
                  ) : null}
                  {readablePlan.items.map((item, index) => (
                    <div key={item.id ?? `${item.day}-${index}`} className="rounded-md border border-[#ece7dc] bg-[#fbfaf7] p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#a30000]">{item.day}</p>
                          <h4 className="mt-1 text-lg font-semibold">{item.title}</h4>
                        </div>
                        <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-[#4f5d75]">Bloque {index + 1}</span>
                      </div>
                      {item.details ? <p className="mt-3 whitespace-pre-line leading-7 text-[#3d493f]">{item.details}</p> : null}
                      {readablePlan.category === "Entrenamiento" ? (
                        <form className="mt-4 grid gap-3 rounded-md border border-[#d9d4c7] bg-white p-3" onSubmit={(event) => handleWorkoutTracking(event, item)}>
                          <p className="text-sm font-semibold">Registrar progreso</p>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <input name="sets_completed" className="h-10 rounded-md border border-[#d9d4c7] px-3 text-sm" placeholder="Series hechas" type="number" min="0" />
                            <input name="reps_completed" className="h-10 rounded-md border border-[#d9d4c7] px-3 text-sm" placeholder="Repeticiones hechas" type="number" min="0" />
                            <select name="intensity" className="h-10 rounded-md border border-[#d9d4c7] px-3 text-sm" defaultValue="">
                              <option value="">Intensidad</option>
                              <option value="Suave">Suave</option>
                              <option value="Media">Media</option>
                              <option value="Alta">Alta</option>
                            </select>
                          </div>
                          <textarea name="notes" className="min-h-16 rounded-md border border-[#d9d4c7] px-3 py-2 text-sm" placeholder="Notas del entrenamiento" />
                          <button className="w-fit rounded-md bg-[#37513b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" disabled={trackingItemId === item.id}>
                            {trackingItemId === item.id ? "Guardando..." : "Guardar progreso"}
                          </button>
                        </form>
                      ) : null}
                      {readablePlan.category === "Nutricion" ? (
                        <form className="mt-4 grid gap-3 rounded-md border border-[#d9d4c7] bg-white p-3" onSubmit={(event) => handleDietTracking(event, item)}>
                          <p className="text-sm font-semibold">Registrar lo comido</p>
                          <textarea name="consumed_food" className="min-h-20 rounded-md border border-[#d9d4c7] px-3 py-2 text-sm" placeholder="Escribe lo que comiste en esta comida" required />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input name="adherence_percentage" className="h-10 rounded-md border border-[#d9d4c7] px-3 text-sm" placeholder="% cumplido" type="number" min="0" max="100" defaultValue={100} />
                            <input name="water_liters" className="h-10 rounded-md border border-[#d9d4c7] px-3 text-sm" placeholder="Agua en litros" type="number" min="0" step="0.1" />
                          </div>
                          <textarea name="notes" className="min-h-16 rounded-md border border-[#d9d4c7] px-3 py-2 text-sm" placeholder="Notas o sensaciones" />
                          <button className="w-fit rounded-md bg-[#37513b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" disabled={trackingItemId === item.id}>
                            {trackingItemId === item.id ? "Guardando..." : "Guardar comida"}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-md bg-[#f7f5ef] p-5 text-sm text-[#5d6959]">
              Selecciona un plan para ver todos sus detalles.
            </div>
          )}
        </article>
      )}
    </section>
  );
}
