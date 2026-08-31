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
  const [isOpen, setIsOpen] = useState(false);
  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);

  const loadPreview = useCallback(async () => {
    if (!token) return;

    try {
      const response = await apiRequest<UnreadPreviewResponse>("/messages/unread-preview", { token });
      setPreview(response);
      if (!response.message) setIsOpen(false);
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

  if (!user || !preview?.message || preview.unread_count === 0) return null;

  const sender = preview.message.sender;
  const chatHref = user.role === "professional" ? `/messages?client_id=${preview.message.client_id}` : "/messages";

  return (
    <div className="fixed bottom-5 left-5 z-40 flex max-w-[calc(100vw-2.5rem)] flex-col items-start gap-3">
      {isOpen ? (
        <div className="w-[min(360px,calc(100vw-2.5rem))] rounded-lg border border-[#d9d4c7] bg-white p-4 text-[#18201b] shadow-2xl">
          <div className="flex items-start gap-3">
            <Avatar user={sender} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-semibold">{sender?.name ?? "Nuevo mensaje"}</p>
                <span className="rounded-md bg-[#a30000] px-2 py-1 text-xs font-semibold text-white">{preview.unread_count}</span>
              </div>
              <p className="mt-2 max-h-[72px] overflow-hidden text-sm leading-6 text-[#5d6959]">{preview.message.body}</p>
              <div className="mt-4 flex gap-2">
                <Link href={chatHref} className="rounded-md bg-[#18201b] px-4 py-2 text-sm font-semibold text-white" onClick={() => setIsOpen(false)}>
                  Abrir chat
                </Link>
                <button className="rounded-md border border-[#d9d4c7] px-4 py-2 text-sm font-semibold hover:bg-[#f7f5ef]" onClick={() => setIsOpen(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Abrir mensajes pendientes"
        aria-expanded={isOpen}
        className="relative flex size-16 items-center justify-center rounded-full border-2 border-[#c5a059] bg-[#18201b] text-white shadow-2xl transition hover:scale-105"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Avatar user={sender} compact />
        <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-[#a30000] px-2 py-1 text-xs font-bold text-white">{preview.unread_count}</span>
      </button>
    </div>
  );
}

function Avatar({ user, compact = false }: { user?: AuthUser | null; compact?: boolean }) {
  const size = compact ? "size-12" : "size-11";

  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt={user.name} className={`${size} shrink-0 rounded-full object-cover`} />;
  }

  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[#c5a059] text-sm font-semibold text-[#18201b]`}>
      {getInitials(user?.name)}
    </span>
  );
}
