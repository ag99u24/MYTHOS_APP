"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { API_BASE_URL } from "@/lib/api";

type HealthResponse = {
  status: "ok" | "degraded";
  service: string;
  checks?: {
    database?: "ok" | "unavailable";
  };
};

type StatusState = {
  isLoading: boolean;
  health: HealthResponse | null;
  error: string | null;
  checkedAt: string | null;
};

const initialState: StatusState = {
  isLoading: true,
  health: null,
  error: null,
  checkedAt: null,
};

export function StatusClient() {
  const [state, setState] = useState<StatusState>(initialState);

  const loadStatus = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/health`, { cache: "no-store", credentials: "include" });
      const data = (await response.json().catch(() => null)) as HealthResponse | null;

      if (!data) {
        throw new Error("La API no devolvio una respuesta valida.");
      }

      setState({
        isLoading: false,
        health: data,
        error: response.ok ? null : "El servicio respondio, pero necesita revision.",
        checkedAt: new Date().toLocaleString("es-ES"),
      });
    } catch {
      setState({
        isLoading: false,
        health: null,
        error: "No se pudo conectar con el backend.",
        checkedAt: new Date().toLocaleString("es-ES"),
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStatus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadStatus]);

  const apiStatus = state.health?.status ?? "degraded";
  const databaseStatus = state.health?.checks?.database ?? "unavailable";

  return (
    <AppShell title="Estado del sistema" description="Comprueba si la API y la base de datos estan disponibles antes de una demo o despliegue.">
      <div className="grid gap-4 lg:grid-cols-3">
        <StatusCard title="API" value={apiStatus === "ok" ? "Operativa" : "Revisar"} tone={apiStatus === "ok" ? "success" : "warning"} />
        <StatusCard title="Base de datos" value={databaseStatus === "ok" ? "Conectada" : "No disponible"} tone={databaseStatus === "ok" ? "success" : "warning"} />
        <StatusCard title="Ultima comprobacion" value={state.checkedAt ?? "Pendiente"} tone="neutral" />
      </div>

      <section className="mt-6 rounded-md border border-[#d9d4c7] bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Conexion del backend</h2>
            <p className="mt-2 break-all text-sm leading-6 text-[#5d6959]">{API_BASE_URL}/health</p>
          </div>
          <button
            type="button"
            onClick={loadStatus}
            disabled={state.isLoading}
            className="rounded-md bg-[#18201b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2c372f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.isLoading ? "Comprobando" : "Comprobar ahora"}
          </button>
        </div>

        {state.error ? <p className="mt-4 rounded-md bg-[#fff4e8] p-3 text-sm font-semibold text-[#9b4b22]">{state.error}</p> : null}

        {state.health ? (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md bg-[#f7f5ef] p-4">
              <dt className="font-semibold text-[#5d6959]">Servicio</dt>
              <dd className="mt-1 text-[#18201b]">{state.health.service}</dd>
            </div>
            <div className="rounded-md bg-[#f7f5ef] p-4">
              <dt className="font-semibold text-[#5d6959]">Respuesta</dt>
              <dd className="mt-1 text-[#18201b]">{state.health.status}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    </AppShell>
  );
}

function StatusCard({ title, value, tone }: { title: string; value: string; tone: "success" | "warning" | "neutral" }) {
  const toneClasses = {
    success: "border-[#b7d4ad] bg-[#edf4e9] text-[#37513b]",
    warning: "border-[#efc69e] bg-[#fff4e8] text-[#9b4b22]",
    neutral: "border-[#d9d4c7] bg-white text-[#18201b]",
  };

  return (
    <article className={`rounded-md border p-5 ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-3 text-2xl font-semibold tracking-normal">{value}</p>
    </article>
  );
}
