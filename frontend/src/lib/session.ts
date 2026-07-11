export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "professional" | "client";
  specialty?: string | null;
  goal?: string | null;
  avatar_url?: string | null;
};

export type AuthResponse = {
  access_token?: string;
  user: AuthUser;
};

const TOKEN_KEY = "mythos_token";
const USER_KEY = "mythos_user";
const COOKIE_SESSION_TOKEN = "cookie-session";

export function saveSession(session: AuthResponse) {
  window.localStorage.removeItem(TOKEN_KEY);
  saveUser(session.user);
}

export function saveUser(user: AuthUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY) ?? (getStoredUser() ? COOKIE_SESSION_TOKEN : null);
}

export function getStoredUser() {
  const storedUser = window.localStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
