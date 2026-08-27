import { clearSession } from "@/lib/session";

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000/api";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, "");
const COOKIE_SESSION_TOKEN = "cookie-session";
const PUBLIC_AUTH_PATHS = new Set(["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"]);

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getFallbackMessage(status: number) {
  if (status === 401) return "Tu sesión ha caducado. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permisos para realizar esta acción.";
  if (status === 404) return "No se encontró el recurso solicitado.";
  if (status >= 500) return "El servidor no está disponible ahora mismo. Inténtalo de nuevo en unos minutos.";
  return "No se pudo completar la solicitud.";
}

function redirectToLoginAfterExpiredSession(path: string) {
  if (typeof window === "undefined") return false;

  const endpoint = path.split("?")[0];
  if (PUBLIC_AUTH_PATHS.has(endpoint) || window.location.pathname === "/login") return false;

  clearSession();

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ expired: "1" });
  if (currentPath) params.set("next", currentPath);

  window.location.assign(`/login?${params.toString()}`);
  return true;
}

function waitForRedirect<T>() {
  return new Promise<T>(() => undefined);
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.token && options.token !== COOKIE_SESSION_TOKEN ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisa que la API esté activa.", 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && redirectToLoginAfterExpiredSession(path)) {
      return waitForRedirect<T>();
    }

    throw new ApiError(data.message ?? getFallbackMessage(response.status), response.status);
  }

  return data as T;
}
