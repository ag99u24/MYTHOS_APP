"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { AuthResponse, saveSession } from "@/lib/session";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const sessionExpired = searchParams.get("expired") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function fillDemo(role: "professional" | "client") {
    setError("");

    if (role === "professional") {
      setEmail("coach@mythos.demo");
      setPassword("password123");
      return;
    }

    setEmail("cliente@mythos.demo");
    setPassword("password123");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const session = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      saveSession(session);
      router.push(nextPath);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo iniciar sesion.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-4" method="post" onSubmit={handleSubmit}>
      {sessionExpired && !error ? <FormMessage type="success">Tu sesión caducó. Inicia sesión de nuevo para continuar.</FormMessage> : null}
      {error ? <FormMessage type="error">{error}</FormMessage> : null}

      <div className="grid gap-3 rounded-md border border-[#d9d4c7] bg-[#f7f5ef] p-3 sm:grid-cols-2">
        <button type="button" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#18201b] hover:bg-[#edf4e9]" onClick={() => fillDemo("professional")}>
          Demo profesional
        </button>
        <button type="button" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#18201b] hover:bg-[#edf4e9]" onClick={() => fillDemo("client")}>
          Demo cliente
        </button>
      </div>

      <FormField label="Email" name="email" type="email" placeholder="tu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} />
      <FormField label="Contrasena" name="password" type="password" placeholder="Tu contrasena" value={password} onChange={(event) => setPassword(event.target.value)} />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-[#5d6959]">
          <input type="checkbox" className="size-4 rounded border-[#d9d4c7]" />
          Recordarme
        </label>
        <Link href="/forgot-password" className="font-semibold text-[#c75432]">
          Recuperar contrasena
        </Link>
      </div>
      <button
        disabled={isLoading}
        className="rounded-md bg-[#18201b] px-4 py-3 text-center font-semibold text-white hover:bg-[#2c372f] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Entrando..." : "Entrar al panel"}
      </button>
    </form>
  );
}
