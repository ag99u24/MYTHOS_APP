"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { PaginationControls, PaginationMeta } from "@/components/PaginationControls";
import { apiRequest } from "@/lib/api";
import { AuthUser, getStoredUser, getToken } from "@/lib/session";

type Session = {
  id: number;
  title: string;
  session_type: string;
  status: string;
  scheduled_at: string;
  duration_minutes?: number | null;
  meeting_url?: string | null;
  notes?: string | null;
  client_id: number;
};

type SessionForm = {
  title: string;
  client_id: string;
  session_type: string;
  status: string;
  scheduled_at: string;
  duration_minutes: string;
  meeting_url: string;
  notes: string;
};

const emptyForm: SessionForm = {
  title: "",
  client_id: "",
  session_type: "Revision",
  status: "scheduled",
  scheduled_at: "",
  duration_minutes: "45",
  meeting_url: "",
  notes: "",
};

const statusLabels: Record<string, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
};

const statusStyles: Record<string, string> = {
  scheduled: "bg-[#f7f5ef] text-[#37513b]",
  completed: "bg-[#edf7ef] text-[#2f6d3a]",
  cancelled: "bg-[#fff4ef] text-[#963519]",
};

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function SessionsClient() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("client_id") ?? "";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState(initialClientId);
  const [form, setForm] = useState<SessionForm>(() => ({ ...emptyForm, client_id: initialClientId }));
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);
  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);

  const loadSessions = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "10" });
      if (statusFilter) {
        params.set("status", statusFilter);
      }
      if (clientFilter && user?.role === "professional") {
        params.set("client_id", clientFilter);
      }
      const response = await apiRequest<{ sessions: Session[]; meta?: PaginationMeta }>(`/sessions?${params.toString()}`, { token });
      setSessions(response.sessions);
      setMeta(response.meta ?? null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar la agenda.");
    } finally {
      setIsLoading(false);
    }
  }, [clientFilter, page, statusFilter, token, user]);

  const loadClients = useCallback(async () => {
    if (!token || user?.role !== "professional") return;
    try {
      const response = await apiRequest<{ clients: AuthUser[] }>("/users/clients?per_page=100", { token });
      setClients(response.clients);
    } catch {
      setClients([]);
    }
  }, [token, user?.role]);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (token) void Promise.resolve().then(loadSessions);
  }, [loadSessions, token]);

  useEffect(() => {
    if (user?.role === "professional") void Promise.resolve().then(loadClients);
  }, [loadClients, user?.role]);

  function updateField(field: keyof SessionForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(session: Session) {
    setSelectedSession(session);
    setForm({
      title: session.title,
      client_id: String(session.client_id),
      session_type: session.session_type,
      status: session.status,
      scheduled_at: toDatetimeLocal(session.scheduled_at),
      duration_minutes: session.duration_minutes ? String(session.duration_minutes) : "",
      meeting_url: session.meeting_url ?? "",
      notes: session.notes ?? "",
    });
    setError("");
    setSuccess("");
  }

  function resetForm() {
    setSelectedSession(null);
    setForm({ ...emptyForm, client_id: clientFilter });
    setError("");
    setSuccess("");
  }

  function changeStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function changeClientFilter(value: string) {
    setClientFilter(value);
    setPage(1);
    if (!selectedSession) {
      setForm((current) => ({ ...current, client_id: value }));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || user?.role !== "professional") {
      setError("Solo profesionales pueden gestionar sesiones.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");
    const payload = {
      title: form.title,
      client_id: Number(form.client_id),
      session_type: form.session_type,
      status: form.status,
      scheduled_at: form.scheduled_at,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      meeting_url: form.meeting_url || null,
      notes: form.notes || null,
    };

    try {
      if (selectedSession) {
        const response = await apiRequest<{ session: Session }>(`/sessions/${selectedSession.id}`, { method: "PATCH", token, body: payload });
        setSessions((current) => current.map((session) => (session.id === response.session.id ? response.session : session)));
        setSelectedSession(response.session);
        setSuccess("Sesión actualizada correctamente.");
      } else {
        const response = await apiRequest<{ session: Session }>("/sessions", { method: "POST", token, body: payload });
        setSessions((current) => [response.session, ...current]);
        setPage(1);
        setSelectedSession(response.session);
        setSuccess("Sesión creada correctamente.");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar la sesión.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSession(sessionId: number) {
    if (!token) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ message: string }>(`/sessions/${sessionId}`, { method: "DELETE", token });
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      if (selectedSession?.id === sessionId) resetForm();
      setSuccess("Sesión eliminada correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo eliminar la sesión.");
    }
  }

  async function updateSessionStatus(sessionId: number, status: "scheduled" | "completed" | "cancelled") {
    if (!token || user?.role !== "professional") return;
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest<{ session: Session }>(`/sessions/${sessionId}`, { method: "PATCH", token, body: { status } });
      setSessions((current) => current.map((session) => (session.id === response.session.id ? response.session : session)));
      setSelectedSession((current) => (current?.id === response.session.id ? response.session : current));
      setSuccess("Estado de sesión actualizado.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo actualizar el estado.");
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      {user?.role === "professional" ? (
        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{selectedSession ? "Editar sesión" : "Crear sesión"}</h2>
          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            {error ? <FormMessage type="error">{error}</FormMessage> : null}
            {success ? <FormMessage type="success">{success}</FormMessage> : null}
            <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="Titulo" required value={form.title} onChange={(event) => updateField("title", event.target.value)} />
            <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" required value={form.client_id} onChange={(event) => updateField("client_id", event.target.value)}>
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" value={form.session_type} onChange={(event) => updateField("session_type", event.target.value)}>
                <option>Revision</option>
                <option>Entrenamiento</option>
                <option>Nutrición</option>
                <option>Llamada</option>
              </select>
              <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value="scheduled">Programada</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" type="datetime-local" required value={form.scheduled_at} onChange={(event) => updateField("scheduled_at", event.target.value)} />
              <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" type="number" placeholder="Duracion min" value={form.duration_minutes} onChange={(event) => updateField("duration_minutes", event.target.value)} />
            </div>
            <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" placeholder="URL de reunion" value={form.meeting_url} onChange={(event) => updateField("meeting_url", event.target.value)} />
            <textarea className="min-h-24 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3" placeholder="Notas" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button disabled={isSaving} className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white disabled:opacity-70">{isSaving ? "Guardando..." : "Guardar sesión"}</button>
              <button type="button" className="rounded-md border border-[#d9d4c7] px-4 py-3 font-semibold hover:bg-[#f7f5ef]" onClick={resetForm}>Limpiar</button>
            </div>
          </form>
        </article>
      ) : null}

      <article className="rounded-lg border border-[#d9d4c7] bg-white shadow-sm">
        <div className="grid gap-4 border-b border-[#ece7dc] p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <h2 className="text-xl font-semibold">Sesiones</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {user?.role === "professional" ? (
              <select className="h-10 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 text-sm" value={clientFilter} onChange={(event) => changeClientFilter(event.target.value)}>
                <option value="">Todos los clientes</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            ) : null}
            <select className="h-10 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 text-sm" value={statusFilter} onChange={(event) => changeStatusFilter(event.target.value)}>
              <option value="">Todas</option>
              <option value="scheduled">Programadas</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
          {user?.role !== "professional" && error ? <div className="mt-4"><FormMessage type="error">{error}</FormMessage></div> : null}
        </div>
        <div className="grid">
          {isLoading ? <p className="p-5 text-sm text-[#5d6959]">Cargando agenda...</p> : null}
          {!isLoading && sessions.length === 0 ? <p className="p-5 text-sm text-[#5d6959]">Todavía no hay sesiones programadas.</p> : null}
          {sessions.map((session) => (
            <div key={session.id} className="grid gap-4 border-b border-[#ece7dc] p-5 last:border-b-0 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-semibold">{session.title}</p>
                <p className="mt-1 text-sm text-[#5d6959]">{new Date(session.scheduled_at).toLocaleString("es-ES")} - {session.duration_minutes ?? "-"} min</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#64715f]">
                  <span>{clientNameById.get(session.client_id) ?? `Cliente #${session.client_id}`}</span>
                  <span>{session.session_type}</span>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusStyles[session.status] ?? statusStyles.scheduled}`}>{statusLabels[session.status] ?? session.status}</span>
                </div>
                {session.meeting_url ? <a className="mt-2 inline-flex text-sm font-semibold text-[#c75432]" href={session.meeting_url} target="_blank">Abrir reunion</a> : null}
              </div>
              {user?.role === "professional" ? (
                <div className="flex flex-wrap gap-2">
                  {session.status !== "completed" ? (
                    <button className="rounded-md border border-[#b8d9bd] px-3 py-2 text-sm font-semibold text-[#2f6d3a] hover:bg-[#edf7ef]" onClick={() => void updateSessionStatus(session.id, "completed")}>Completar</button>
                  ) : null}
                  {session.status !== "cancelled" ? (
                    <button className="rounded-md border border-[#f1b5a4] px-3 py-2 text-sm font-semibold text-[#963519] hover:bg-[#fff4ef]" onClick={() => void updateSessionStatus(session.id, "cancelled")}>Cancelar</button>
                  ) : null}
                  {session.status !== "scheduled" ? (
                    <button className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={() => void updateSessionStatus(session.id, "scheduled")}>Reabrir</button>
                  ) : null}
                  <button className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={() => startEdit(session)}>Editar</button>
                  <button className="rounded-md border border-[#f1b5a4] px-3 py-2 text-sm font-semibold text-[#963519] hover:bg-[#fff4ef]" onClick={() => void deleteSession(session.id)}>Eliminar</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <PaginationControls meta={meta} isLoading={isLoading} onPageChange={setPage} />
      </article>
    </section>
  );
}
