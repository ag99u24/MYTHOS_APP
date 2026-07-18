"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";

type ResetPasswordResponse = {
  message: string;
};

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
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
          token,
          password: formData.get("password"),
        },
      });

      setSuccess(response.message);
      event.currentTarget.reset();
      setToken("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cambiar la contraseña.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      {success ? <FormMessage type="success">{success}</FormMessage> : null}
      <label className="grid gap-2 text-sm font-medium text-[#344036]">
        Token
        <input
          name="token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Token recibido por email"
          required
          className="h-12 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 text-base text-[#18201b] placeholder:text-[#9a9488]"
        />
      </label>
      <FormField label="Nueva contraseña" name="password" type="password" placeholder="Nueva contraseña" />
      <button
        disabled={isLoading}
        className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
