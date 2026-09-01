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
  meal_type?: string | null;
  consumed_date?: string | null;
  consumed_food?: string | null;
  adherence_percentage: number;
  quantity_g?: number | null;
  calories_kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  notes?: string | null;
  created_at?: string | null;
};

type NutritionProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  nutrition?: {
    calories_kcal_100g?: number;
    protein_g_100g?: number;
    carbs_g_100g?: number;
    fat_g_100g?: number;
    sugars_g_100g?: number;
    salt_g_100g?: number;
  };
};

type MealDraftItem = {
  product: NutritionProduct;
  quantity_g: number;
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
  const [dietEntries, setDietEntries] = useState<DietEntry[]>([]);
  const [foodSearchByItem, setFoodSearchByItem] = useState<Record<number, string>>({});
  const [foodResultsByItem, setFoodResultsByItem] = useState<Record<number, NutritionProduct[]>>({});
  const [selectedFoodByItem, setSelectedFoodByItem] = useState<Record<number, NutritionProduct>>({});
  const [mealDraftByItem, setMealDraftByItem] = useState<Record<number, MealDraftItem[]>>({});
  const [isSearchingFood, setIsSearchingFood] = useState<number | null>(null);

  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);
  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);
  const isClient = user?.role === "client";
  const readablePlan = selectedPlan ?? (user?.role === "client" ? plans[0] ?? null : null);
  const dietEntriesByItem = useMemo(() => {
    const grouped = new Map<number, DietEntry[]>();
    dietEntries.forEach((entry) => {
      if (!entry.plan_item_id) return;
      grouped.set(entry.plan_item_id, [...(grouped.get(entry.plan_item_id) ?? []), entry]);
    });
    return grouped;
  }, [dietEntries]);

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

  const loadDietEntries = useCallback(async (activeToken = token) => {
    if (!activeToken || user?.role !== "client") return;

    try {
      const response = await apiRequest<{ diet: DietEntry[] }>("/diet?per_page=100", { token: activeToken });
      setDietEntries(response.diet);
    } catch {
      setDietEntries([]);
    }
  }, [token, user?.role]);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (token) void Promise.resolve().then(() => loadPlans(token));
  }, [loadPlans, token]);

  useEffect(() => {
    if (token && user?.role === "professional") void Promise.resolve().then(() => loadClients(token));
  }, [loadClients, token, user?.role]);

  useEffect(() => {
    if (token && user?.role === "client") void Promise.resolve().then(() => loadDietEntries(token));
  }, [loadDietEntries, token, user?.role]);

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

    const targetForm = event.currentTarget;
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
      targetForm.reset();
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

    const targetForm = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    const mealItems = item.id ? mealDraftByItem[item.id] ?? [] : [];
    const totals = calculateMealTotals(mealItems);
    if (mealItems.length === 0) {
      setError("Agrega al menos un alimento a la comida antes de registrarla.");
      return;
    }
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
          consumed_food: mealItems.map((mealItem) => `${mealItem.product.product_name} (${mealItem.quantity_g}g)`).join(", "),
          meal_type: formData.get("meal_type"),
          consumed_date: formData.get("consumed_date"),
          product_code: mealItems.map((mealItem) => mealItem.product.code).filter(Boolean).join(", ") || null,
          brand: mealItems.map((mealItem) => mealItem.product.brands).filter(Boolean).join(", ") || null,
          quantity_g: totals.quantity_g,
          calories_kcal: totals.calories_kcal,
          protein_g: totals.protein_g,
          carbs_g: totals.carbs_g,
          fat_g: totals.fat_g,
          sugars_g: totals.sugars_g,
          salt_g: totals.salt_g,
          meals_completed: 1,
          total_meals: readablePlan?.items.length ?? null,
          notes: String(formData.get("notes") || "") || null,
        },
      });
      targetForm.reset();
      if (item.id) {
        setFoodSearchByItem((current) => ({ ...current, [item.id as number]: "" }));
        setFoodResultsByItem((current) => ({ ...current, [item.id as number]: [] }));
        setSelectedFoodByItem((current) => {
          const next = { ...current };
          delete next[item.id as number];
          return next;
        });
        setMealDraftByItem((current) => ({ ...current, [item.id as number]: [] }));
      }
      await loadDietEntries(token);
      setSuccess("Comida registrada correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo registrar la comida.");
    } finally {
      setTrackingItemId(null);
    }
  }

  async function searchFood(itemId: number) {
    const query = foodSearchByItem[itemId]?.trim();
    if (!token || !query || query.length < 2) {
      setError("Escribe al menos 2 caracteres para buscar un alimento.");
      return;
    }

    setIsSearchingFood(itemId);
    setError("");

    try {
      const response = await apiRequest<{ products: NutritionProduct[] }>(`/nutrition/search?q=${encodeURIComponent(query)}`, { token });
      setFoodResultsByItem((current) => ({ ...current, [itemId]: response.products ?? [] }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo buscar el alimento.");
    } finally {
      setIsSearchingFood(null);
    }
  }

  function addFoodToMeal(itemId: number, quantityValue: FormDataEntryValue | null) {
    const selectedFood = selectedFoodByItem[itemId];
    const quantity = Number(quantityValue);
    if (!selectedFood) {
      setError("Selecciona un alimento de la lista antes de agregarlo.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Indica una cantidad valida en gramos.");
      return;
    }

    setError("");
    setMealDraftByItem((current) => ({
      ...current,
      [itemId]: [...(current[itemId] ?? []), { product: selectedFood, quantity_g: quantity }],
    }));
    setSelectedFoodByItem((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setFoodSearchByItem((current) => ({ ...current, [itemId]: "" }));
    setFoodResultsByItem((current) => ({ ...current, [itemId]: [] }));
  }

  function removeFoodFromMeal(itemId: number, index: number) {
    setMealDraftByItem((current) => ({
      ...current,
      [itemId]: (current[itemId] ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
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
                          <div className="grid gap-3 sm:grid-cols-2">
                            <select name="meal_type" className="h-10 rounded-md border border-[#d9d4c7] px-3 text-sm" defaultValue="comida">
                              <option value="desayuno">Desayuno</option>
                              <option value="comida">Comida</option>
                              <option value="cena">Cena</option>
                              <option value="agregados">Agregados</option>
                            </select>
                            <input name="consumed_date" className="h-10 rounded-md border border-[#d9d4c7] px-3 text-sm" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                          </div>
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input
                              name="consumed_food"
                              className="h-10 rounded-md border border-[#d9d4c7] px-3 text-sm"
                              placeholder="Buscar alimento: pechuga de pollo..."
                              required
                              value={item.id ? foodSearchByItem[item.id] ?? "" : ""}
                              onChange={(event) => item.id ? setFoodSearchByItem((current) => ({ ...current, [item.id as number]: event.target.value })) : undefined}
                            />
                            <button type="button" className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={() => item.id ? void searchFood(item.id) : undefined}>
                              {isSearchingFood === item.id ? "Buscando..." : "Buscar"}
                            </button>
                          </div>
                          {item.id && foodResultsByItem[item.id]?.length ? (
                            <div className="grid max-h-44 gap-2 overflow-y-auto rounded-md bg-[#fbfaf7] p-2">
                              {foodResultsByItem[item.id].slice(0, 5).map((product) => (
                                <button
                                  type="button"
                                  key={product.code || product.product_name}
                                  className={`rounded-md border p-3 text-left text-sm hover:bg-white ${selectedFoodByItem[item.id as number]?.code === product.code ? "border-[#a30000] bg-white" : "border-[#ece7dc]"}`}
                                  onClick={() => {
                                    setSelectedFoodByItem((current) => ({ ...current, [item.id as number]: product }));
                                    setFoodSearchByItem((current) => ({ ...current, [item.id as number]: product.product_name ?? "" }));
                                  }}
                                >
                                  <span className="font-semibold">{product.product_name}</span>
                                  <span className="mt-1 block text-xs text-[#5d6959]">
                                    {product.brands || "Marca no disponible"} · {formatMacro(product.nutrition?.calories_kcal_100g)} kcal / 100g · P {formatMacro(product.nutrition?.protein_g_100g)}g
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input name="draft_quantity_g" className="h-10 rounded-md border border-[#d9d4c7] px-3 text-sm" placeholder="Cantidad del alimento en gramos" type="number" min="1" step="1" />
                            <button
                              type="button"
                              className="rounded-md bg-[#18201b] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2c372f]"
                              onClick={(event) => {
                                const form = event.currentTarget.form;
                                const quantityInput = form?.elements.namedItem("draft_quantity_g") as HTMLInputElement | null;
                                if (item.id) addFoodToMeal(item.id, quantityInput?.value ?? null);
                                if (quantityInput) quantityInput.value = "";
                              }}
                            >
                              Añadir alimento
                            </button>
                          </div>
                          {item.id ? (
                            <MealDraftList
                              items={mealDraftByItem[item.id] ?? []}
                              onRemove={(index) => removeFoodFromMeal(item.id as number, index)}
                            />
                          ) : null}
                          <textarea name="notes" className="min-h-16 rounded-md border border-[#d9d4c7] px-3 py-2 text-sm" placeholder="Notas o sensaciones" />
                          <p className="text-xs leading-5 text-[#64715f]">Mythos calculara la adherencia comparando tu registro con la comida recomendada.</p>
                          <button className="w-fit rounded-md bg-[#37513b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" disabled={trackingItemId === item.id}>
                            {trackingItemId === item.id ? "Guardando..." : "Guardar comida"}
                          </button>
                          {item.id ? <MealLogList entries={dietEntriesByItem.get(item.id) ?? []} /> : null}
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

function MealLogList({ entries }: { entries: DietEntry[] }) {
  if (entries.length === 0) {
    return <p className="rounded-md bg-[#fbfaf7] p-3 text-xs text-[#64715f]">Aun no hay comidas ingeridas registradas para este bloque.</p>;
  }

  const groupedByDate = entries.reduce<Record<string, DietEntry[]>>((groups, entry) => {
    const dateKey = entry.consumed_date ?? entry.created_at?.slice(0, 10) ?? "Sin fecha";
    groups[dateKey] = [...(groups[dateKey] ?? []), entry];
    return groups;
  }, {});

  return (
    <div className="grid gap-3 border-t border-[#ece7dc] pt-3">
      <p className="text-sm font-semibold">Comidas ingeridas</p>
      {Object.entries(groupedByDate).map(([date, dateEntries]) => (
        <div key={date} className="rounded-md bg-[#fbfaf7] p-3">
          <p className="text-xs font-semibold uppercase text-[#a30000]">{formatFoodDate(date)}</p>
          <div className="mt-2 grid gap-2">
            {dateEntries.map((entry) => (
              <div key={entry.id} className="rounded-md border border-[#ece7dc] bg-white p-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{entry.consumed_food}</p>
                    <p className="mt-1 text-xs text-[#64715f]">{formatMealType(entry.meal_type)} · {formatMacro(entry.quantity_g)} g · Adherencia {entry.adherence_percentage}%</p>
                  </div>
                  <span className="rounded-md bg-[#f7f5ef] px-2 py-1 text-xs font-semibold text-[#37513b]">{formatMacro(entry.calories_kcal)} kcal</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#5d6959]">
                  <span>P {formatMacro(entry.protein_g)}g</span>
                  <span>C {formatMacro(entry.carbs_g)}g</span>
                  <span>G {formatMacro(entry.fat_g)}g</span>
                </div>
                {entry.notes ? <p className="mt-2 text-xs leading-5 text-[#3d493f]">{entry.notes}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MealDraftList({ items, onRemove }: { items: MealDraftItem[]; onRemove: (index: number) => void }) {
  if (items.length === 0) {
    return <p className="rounded-md bg-[#fbfaf7] p-3 text-xs text-[#64715f]">Agrega varios alimentos y luego registra la comida completa.</p>;
  }

  const totals = calculateMealTotals(items);

  return (
    <div className="grid gap-3 rounded-md bg-[#fbfaf7] p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold">Comida preparada</p>
        <span className="text-xs font-semibold text-[#37513b]">{items.length} alimentos · {formatMacro(totals.calories_kcal)} kcal</span>
      </div>
      <div className="grid gap-2">
        {items.map((item, index) => (
          <div key={`${item.product.code || item.product.product_name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-[#ece7dc] bg-white p-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold">{item.product.product_name}</p>
              <p className="text-xs text-[#64715f]">{item.quantity_g}g · {formatMacro(calculateFoodMacro(item.product.nutrition?.calories_kcal_100g, item.quantity_g))} kcal</p>
            </div>
            <button type="button" className="rounded-md border border-[#f1b5a4] px-2 py-1 text-xs font-semibold text-[#963519] hover:bg-[#fff4ef]" onClick={() => onRemove(index)}>
              Quitar
            </button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-[#5d6959]">
        <span>P {formatMacro(totals.protein_g)}g</span>
        <span>C {formatMacro(totals.carbs_g)}g</span>
        <span>G {formatMacro(totals.fat_g)}g</span>
      </div>
    </div>
  );
}

function calculateFoodMacro(valuePer100g?: number, quantityG?: number) {
  if (typeof valuePer100g !== "number" || typeof quantityG !== "number") return null;
  return Number(((valuePer100g * quantityG) / 100).toFixed(2));
}

function calculateMealTotals(items: MealDraftItem[]) {
  return items.reduce(
    (totals, item) => ({
      quantity_g: totals.quantity_g + item.quantity_g,
      calories_kcal: totals.calories_kcal + (calculateFoodMacro(item.product.nutrition?.calories_kcal_100g, item.quantity_g) ?? 0),
      protein_g: totals.protein_g + (calculateFoodMacro(item.product.nutrition?.protein_g_100g, item.quantity_g) ?? 0),
      carbs_g: totals.carbs_g + (calculateFoodMacro(item.product.nutrition?.carbs_g_100g, item.quantity_g) ?? 0),
      fat_g: totals.fat_g + (calculateFoodMacro(item.product.nutrition?.fat_g_100g, item.quantity_g) ?? 0),
      sugars_g: totals.sugars_g + (calculateFoodMacro(item.product.nutrition?.sugars_g_100g, item.quantity_g) ?? 0),
      salt_g: totals.salt_g + (calculateFoodMacro(item.product.nutrition?.salt_g_100g, item.quantity_g) ?? 0),
    }),
    { quantity_g: 0, calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugars_g: 0, salt_g: 0 }
  );
}

function formatMacro(value?: number | null) {
  if (typeof value !== "number") return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMealType(value?: string | null) {
  const labels: Record<string, string> = {
    desayuno: "Desayuno",
    comida: "Comida",
    cena: "Cena",
    agregados: "Agregados",
  };
  return labels[value ?? ""] ?? "Agregados";
}

function formatFoodDate(value: string) {
  if (value === "Sin fecha") return value;
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
