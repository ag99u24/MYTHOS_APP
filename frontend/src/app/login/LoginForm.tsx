"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { AuthResponse, saveSession } from "@/lib/session";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const session = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: {
          email: formData.get("email"),
          password: formData.get("password"),
        },
      });

      saveSession(session);
      router.push("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo iniciar sesion.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      <FormField label="Email" name="email" type="email" placeholder="tu@email.com" />
      <FormField label="Contrasena" name="password" type="password" placeholder="Tu contrasena" />
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
