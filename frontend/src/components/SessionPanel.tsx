"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { AuthUser, clearSession, getStoredUser } from "@/lib/session";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function SessionPanel({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  async function handleLogout() {
    await apiRequest<{ message: string }>("/auth/logout", { method: "POST" }).catch(() => null);
    clearSession();
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="mt-5 rounded-lg border border-[#d9d4c7] bg-[#f7f5ef] p-3">
        <p className="text-sm font-semibold text-[#344036]">Sesión no iniciada</p>
        <button className="mt-3 w-full rounded-md bg-[#18201b] px-3 py-2 text-sm font-semibold text-white" onClick={() => router.push("/login")}>
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-lg border border-[#d9d4c7] bg-[#f7f5ef] p-3">
      <div className={`flex items-center gap-3 ${compact ? "lg:justify-center" : ""}`}>
        <div className="flex size-10 items-center justify-center rounded-md bg-[#18201b] text-sm font-semibold text-white">
          {getInitials(user.name)}
        </div>
        <div className={`min-w-0 ${compact ? "lg:hidden" : ""}`}>
          <p className="truncate text-sm font-semibold text-[#18201b]">{user.name}</p>
          <p className="truncate text-xs text-[#5d6959]">{user.role === "client" ? "Cliente" : "Profesional"}</p>
        </div>
      </div>
      <button className="mt-3 w-full rounded-md border border-[#d9d4c7] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#fbfaf7]" onClick={handleLogout} title="Cerrar sesion">
        <span className={compact ? "lg:hidden" : ""}>Cerrar sesión</span>
        <span className={compact ? "hidden lg:inline" : "hidden"}>Salir</span>
      </button>
    </div>
  );
}
