"use client";

import { useState } from "react";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";

type ResetPasswordResponse = {
  message: string;
};

export function ResetPasswordForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await apiRequest<ResetPasswordResponse>("/auth/reset-password", {
        method: "POST",
        body: {
          token: formData.get("token"),
          password: formData.get("password"),
        },
      });

      setSuccess(response.message);
      event.currentTarget.reset();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cambiar la contrasena.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      {success ? <FormMessage type="success">{success}</FormMessage> : null}
      <FormField label="Token" name="token" placeholder="Token recibido por email" />
      <FormField label="Nueva contrasena" name="password" type="password" placeholder="Nueva contrasena" />
      <button
        disabled={isLoading}
        className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Guardando..." : "Cambiar contrasena"}
      </button>
    </form>
  );
}
