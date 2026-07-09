"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { AuthUser, getToken, saveUser } from "@/lib/session";

type ProfileForm = {
  name: string;
  specialty: string;
  goal: string;
  avatar_url: string;
};

const emptyForm: ProfileForm = {
  name: "",
  specialty: "",
  goal: "",
  avatar_url: "",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const token = useMemo(() => (typeof window !== "undefined" ? getToken() : null), []);

  const loadProfile = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiRequest<{ user: AuthUser }>("/auth/me", { token });
      setUser(response.user);
      setForm({
        name: response.user.name,
        specialty: response.user.specialty ?? "",
        goal: response.user.goal ?? "",
        avatar_url: response.user.avatar_url ?? "",
      });
      saveUser(response.user);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar el perfil.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void Promise.resolve().then(loadProfile);
    }
  }, [loadProfile, token]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Inicia sesion para editar tu perfil.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest<{ user: AuthUser }>("/users/me", {
        method: "PATCH",
        token,
        body: form,
      });

      setUser(response.user);
      saveUser(response.user);
      setSuccess("Perfil actualizado correctamente.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar el perfil.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!token) {
    return (
      <section className="rounded-lg border border-[#d9d4c7] bg-white p-6 shadow-sm">
        <FormMessage type="error">Inicia sesion para ver y editar tu perfil.</FormMessage>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        {isLoading ? <p className="text-sm text-[#5d6959]">Cargando perfil...</p> : null}
        <div className="flex items-center gap-4">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg bg-[#18201b] text-2xl font-semibold text-white">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              initials(user?.name || form.name || "Mythos")
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name || "Perfil Mythos"}</h2>
            <p className="mt-1 text-[#5d6959]">{user?.role === "client" ? "Cliente" : "Profesional"}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 text-sm">
          <div className="rounded-md bg-[#f7f5ef] p-4">
            <p className="font-semibold">Especialidad</p>
            <p className="mt-1 text-[#5d6959]">{user?.specialty || "Pendiente de completar"}</p>
          </div>
          <div className="rounded-md bg-[#f7f5ef] p-4">
            <p className="font-semibold">Objetivo</p>
            <p className="mt-1 text-[#5d6959]">{user?.goal || "Pendiente de completar"}</p>
          </div>
          <div className="rounded-md bg-[#f7f5ef] p-4">
            <p className="font-semibold">Email</p>
            <p className="mt-1 text-[#5d6959]">{user?.email || "No disponible"}</p>
          </div>
        </div>
      </article>

      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Informacion de cuenta</h2>
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          {error ? <FormMessage type="error">{error}</FormMessage> : null}
          {success ? <FormMessage type="success">{success}</FormMessage> : null}
          <label className="grid gap-2 text-sm font-medium">
            Nombre
            <input
              className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Especialidad
            <input
              className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"
              placeholder="Entrenamiento, nutricion, fuerza..."
              value={form.specialty}
              onChange={(event) => updateField("specialty", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Avatar URL
            <input
              className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"
              placeholder="https://..."
              value={form.avatar_url}
              onChange={(event) => updateField("avatar_url", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Objetivo profesional o personal
            <textarea
              className="min-h-28 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3"
              value={form.goal}
              onChange={(event) => updateField("goal", event.target.value)}
            />
          </label>
          <button
            disabled={isSaving}
            className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Guardando..." : "Guardar perfil"}
          </button>
        </form>
      </article>
    </section>
  );
}
