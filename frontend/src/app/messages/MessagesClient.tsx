"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { AuthUser, getStoredUser, getToken } from "@/lib/session";

type ChatMessage = {
  id: number;
  professional_id: number;
  client_id: number;
  sender_id: number;
  body: string;
  read_at?: string | null;
  created_at?: string | null;
};

const MAX_MESSAGE_LENGTH = 1000;

export function MessagesClient() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(() => searchParams.get("client_id") ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);
  const selectedClient = clients.find((client) => String(client.id) === selectedClientId);
  const canSendMessage = user?.role !== "professional" || Boolean(selectedClientId);

  const loadClients = useCallback(async () => {
    if (!token || user?.role !== "professional") return;
    try {
      const response = await apiRequest<{ clients: AuthUser[] }>("/users/clients?per_page=100", { token });
      setClients(response.clients);
      if (!selectedClientId && response.clients[0]) setSelectedClientId(String(response.clients[0].id));
    } catch {
      setClients([]);
    }
  }, [selectedClientId, token, user?.role]);

  const loadMessages = useCallback(async () => {
    if (!token || !user) return;
    if (user.role === "professional" && !selectedClientId) {
      setMessages([]);
      return;
    }

    const query = user.role === "professional" ? `?client_id=${selectedClientId}&per_page=100` : "?per_page=100";
    setIsLoading(true);
    setError("");
    try {
      const response = await apiRequest<{ messages: ChatMessage[] }>(`/messages${query}`, { token });
      setMessages(response.messages);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar el chat.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClientId, token, user]);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (user?.role === "professional") void Promise.resolve().then(loadClients);
  }, [loadClients, user?.role]);

  useEffect(() => {
    if (user) void Promise.resolve().then(loadMessages);
  }, [loadMessages, user]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !body.trim() || body.length > MAX_MESSAGE_LENGTH) return;
    if (user?.role === "professional" && !selectedClientId) {
      setError("Selecciona un cliente para enviar el mensaje.");
      return;
    }

    setIsSending(true);
    setError("");
    try {
      const payload = user?.role === "professional" ? { body, client_id: Number(selectedClientId) } : { body };
      const response = await apiRequest<{ message: ChatMessage }>("/messages", { method: "POST", token, body: payload });
      setMessages((current) => [...current, response.message]);
      setBody("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo enviar el mensaje.");
    } finally {
      setIsSending(false);
    }
  }

  function changeClient(value: string) {
    setSelectedClientId(value);
    setMessages([]);
    setBody("");
    setError("");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Conversacion</h2>
        {user?.role === "professional" ? (
          <label className="mt-5 grid gap-2 text-sm font-medium text-[#344036]">
            Cliente
            <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" value={selectedClientId} onChange={(event) => changeClient(event.target.value)}>
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>
        ) : (
          <p className="mt-3 rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Escribe a tu profesional asignado.</p>
        )}
        <button className="mt-4 w-full rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={() => void loadMessages()}>
          Actualizar
        </button>
        <p className="mt-3 rounded-md bg-[#f7f5ef] p-3 text-sm text-[#5d6959]">{messages.length} mensajes en esta conversacion</p>
        {error ? <div className="mt-4"><FormMessage type="error">{error}</FormMessage></div> : null}
      </article>

      <article className="rounded-lg border border-[#d9d4c7] bg-white shadow-sm">
        <div className="border-b border-[#ece7dc] p-5">
          <h2 className="text-xl font-semibold">{selectedClient ? selectedClient.name : "Chat"}</h2>
          <p className="mt-1 text-sm text-[#5d6959]">{selectedClient ? selectedClient.email : user?.role === "professional" ? "Selecciona un cliente para empezar" : "Conversacion activa"}</p>
        </div>
        <div className="grid min-h-[460px] content-end gap-3 p-5">
          {isLoading ? <p className="text-sm text-[#5d6959]">Cargando mensajes...</p> : null}
          {!isLoading && messages.length === 0 ? <p className="rounded-md bg-[#f7f5ef] p-4 text-sm text-[#5d6959]">Todavía no hay mensajes.</p> : null}
          {messages.map((message) => {
            const mine = message.sender_id === user?.id;
            return (
              <div key={message.id} className={`max-w-[78%] rounded-lg px-4 py-3 text-sm leading-6 ${mine ? "ml-auto bg-[#18201b] text-white" : "bg-[#f7f5ef] text-[#18201b]"}`}>
                <p>{message.body}</p>
                <p className={`mt-2 text-xs ${mine ? "text-[#d9d4c7]" : "text-[#64715f]"}`}>
                  {message.created_at ? new Date(message.created_at).toLocaleString("es-ES") : "Ahora"}
                  {mine ? ` - ${message.read_at ? "Leido" : "Enviado"}` : null}
                </p>
              </div>
            );
          })}
        </div>
        <form className="grid gap-3 border-t border-[#ece7dc] p-5 md:grid-cols-[1fr_auto]" onSubmit={handleSend}>
          <div className="grid gap-2">
            <input disabled={!canSendMessage} maxLength={MAX_MESSAGE_LENGTH} className="h-12 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 disabled:opacity-60" placeholder={canSendMessage ? "Escribe un mensaje..." : "Selecciona un cliente para escribir"} value={body} onChange={(event) => setBody(event.target.value)} />
            <p className="text-right text-xs text-[#64715f]">{body.length}/{MAX_MESSAGE_LENGTH}</p>
          </div>
          <button disabled={isSending || !canSendMessage || !body.trim()} className="rounded-md bg-[#18201b] px-5 py-3 font-semibold text-white disabled:opacity-70">
            {isSending ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </article>
    </section>
  );
}
