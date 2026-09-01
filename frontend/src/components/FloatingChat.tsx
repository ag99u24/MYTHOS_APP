"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { AuthUser, getStoredUser, getToken } from "@/lib/session";

type ChatMessagePreview = {
  id: number;
  professional_id: number;
  client_id: number;
  sender_id: number;
  body: string;
  created_at?: string | null;
  sender?: AuthUser | null;
};

type UnreadPreviewResponse = {
  unread_count: number;
  message?: ChatMessagePreview | null;
};

function getInitials(name?: string | null) {
  return (name || "M")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function FloatingChat() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [preview, setPreview] = useState<UnreadPreviewResponse | null>(null);
  const [activeMessage, setActiveMessage] = useState<ChatMessagePreview | null>(null);
  const [messages, setMessages] = useState<ChatMessagePreview[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);

  const loadPreview = useCallback(async () => {
    if (!token) return;

    try {
      const response = await apiRequest<UnreadPreviewResponse>("/messages/unread-preview", { token });
      setPreview(response);
      if (response.message) setActiveMessage(response.message);
    } catch {
      setPreview(null);
    }
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (!user) return;
    void Promise.resolve().then(loadPreview);
    const interval = window.setInterval(() => void loadPreview(), 30000);
    return () => window.clearInterval(interval);
  }, [loadPreview, user]);

  const threadMessage = activeMessage ?? preview?.message ?? null;

  const loadThread = useCallback(async () => {
    if (!token || !user || !threadMessage) return;

    const query = user.role === "professional" ? `?client_id=${threadMessage.client_id}&per_page=100` : "?per_page=100";
    setIsLoadingThread(true);
    setError("");

    try {
      const response = await apiRequest<{ messages: ChatMessagePreview[] }>(`/messages${query}`, { token });
      setMessages(response.messages);
      await loadPreview();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar la conversacion.");
    } finally {
      setIsLoadingThread(false);
    }
  }, [loadPreview, threadMessage, token, user]);

  useEffect(() => {
    if (isOpen) void Promise.resolve().then(loadThread);
  }, [isOpen, loadThread]);

  if (!user || !threadMessage) return null;

  const sender = threadMessage.sender;
  const unreadCount = preview?.unread_count ?? 0;
  const chatHref = user.role === "professional" ? `/messages?client_id=${threadMessage.client_id}` : "/messages";

  async function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !threadMessage || !reply.trim()) return;

    setIsSending(true);
    setError("");

    try {
      const body = user?.role === "professional"
        ? { body: reply, client_id: threadMessage.client_id }
        : { body: reply, professional_id: threadMessage.professional_id };
      const response = await apiRequest<{ message: ChatMessagePreview }>("/messages", { method: "POST", token, body });
      setMessages((current) => [...current, response.message]);
      setReply("");
      await loadThread();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo enviar la respuesta.");
    } finally {
      setIsSending(false);
    }
  }

  function handleReplyKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 flex flex-col items-start gap-2 sm:inset-x-auto sm:bottom-5 sm:left-5">
      {isOpen ? (
        <div className="w-full rounded-lg border border-[#d9d4c7] bg-white p-3 text-[#18201b] shadow-2xl sm:w-[340px]">
          <div className="flex items-start gap-2">
            <Avatar user={sender} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">{sender?.name ?? "Nuevo mensaje"}</p>
                {unreadCount > 0 ? <span className="rounded-md bg-[#a30000] px-2 py-1 text-[11px] font-semibold text-white">{unreadCount}</span> : null}
              </div>
              <div className="mt-2 grid max-h-[44vh] min-h-28 gap-2 overflow-y-auto rounded-md bg-[#fbfaf7] p-2 sm:max-h-72">
                {isLoadingThread ? <p className="text-sm text-[#5d6959]">Cargando conversacion...</p> : null}
                {!isLoadingThread && messages.length === 0 ? <MessageBubble message={threadMessage} user={user} /> : null}
                {messages.map((message) => <MessageBubble key={message.id} message={message} user={user} />)}
              </div>
              <form className="mt-2 grid gap-2" onSubmit={handleReply}>
                <textarea
                  maxLength={1000}
                  rows={2}
                  className="min-h-12 resize-none rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-2 text-sm outline-none focus:border-[#c5a059]"
                  placeholder="Responder..."
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={handleReplyKeyDown}
                />
                {error ? <p className="text-xs font-semibold text-[#a30000]">{error}</p> : null}
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button disabled={isSending || !reply.trim()} className="rounded-md bg-[#a30000] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                    {isSending ? "Enviando..." : "Enviar"}
                  </button>
                  <button type="button" className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={() => setIsOpen(false)}>
                    Cerrar
                  </button>
                </div>
              </form>
              <div className="mt-2 flex">
                <Link href={chatHref} className="rounded-md bg-[#18201b] px-4 py-2 text-sm font-semibold text-white" onClick={() => setIsOpen(false)}>
                  Abrir chat
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Abrir mensajes pendientes"
        aria-expanded={isOpen}
        className="relative flex size-14 items-center justify-center rounded-full border-2 border-[#c5a059] bg-[#18201b] text-white shadow-2xl transition hover:scale-105 sm:size-16"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Avatar user={sender} compact />
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-[#a30000] px-2 py-1 text-xs font-bold text-white">{unreadCount}</span> : null}
      </button>
    </div>
  );
}

function MessageBubble({ message, user }: { message: ChatMessagePreview; user: AuthUser }) {
  const mine = message.sender_id === user.id;

  return (
    <div className={`max-w-[88%] rounded-md px-3 py-2 text-xs leading-5 sm:text-sm ${mine ? "ml-auto bg-[#18201b] text-white" : "bg-white text-[#18201b]"}`}>
      <p>{message.body}</p>
      <p className={`mt-1 text-[11px] ${mine ? "text-[#d9d4c7]" : "text-[#64715f]"}`}>
        {message.created_at ? new Date(message.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "Ahora"}
      </p>
    </div>
  );
}

function Avatar({ user, compact = false }: { user?: AuthUser | null; compact?: boolean }) {
  const size = compact ? "size-10 sm:size-12" : "size-9 sm:size-10";

  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt={user.name} className={`${size} shrink-0 rounded-full object-cover`} />;
  }

  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#c5a059] text-sm font-semibold text-[#18201b]`}>
      {getInitials(user?.name)}
    </span>
  );
}
