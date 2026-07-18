"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { AuthResponse, saveSession } from "@/lib/session";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const session = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: {
          name: formData.get("name"),
          email: formData.get("email"),
          role: formData.get("role"),
          password: formData.get("password"),
        },
      });

      saveSession(session);
      router.push(nextPath);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo crear la cuenta.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      <FormField label="Nombre" name="name" placeholder="Alex Garcia" />
      <FormField label="Email" name="email" type="email" placeholder="tu@email.com" />
      <label className="grid gap-2 text-sm font-medium text-[#344036]">
        Tipo de cuenta
        <select name="role" className="h-12 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 text-base">
          <option value="professional">Profesional</option>
          <option value="client">Cliente</option>
        </select>
      </label>
      <FormField label="Contraseña" name="password" type="password" placeholder="Mínimo 8 caracteres" />
      <button
        disabled={isLoading}
        className="rounded-md bg-[#18201b] px-4 py-3 text-center font-semibold text-white hover:bg-[#2c372f] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
