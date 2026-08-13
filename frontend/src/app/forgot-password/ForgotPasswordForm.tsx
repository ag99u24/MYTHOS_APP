"use client";

import { useState } from "react";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";

type ForgotPasswordResponse = {
  message: string;
  reset_token?: string;
};

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setResetToken("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
        method: "POST",
        body: {
          email: formData.get("email"),
        },
      });

      setSuccess(response.message);
      if (response.reset_token) {
        setResetToken(response.reset_token);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo solicitar el enlace.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      {success ? <FormMessage type="success">{success}</FormMessage> : null}
      {resetToken ? (
        <p className="rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-2 text-sm text-[#5d6959]">
          Token temporal de desarrollo: <span className="font-semibold text-[#18201b]">{resetToken}</span>
        </p>
      ) : null}
      <FormField label="Email" name="email" type="email" placeholder="tu@email.com" />
      <button
        disabled={isLoading}
        className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Enviando..." : "Enviar enlace"}
      </button>
    </form>
  );
}
