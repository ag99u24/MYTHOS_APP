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
  access_token: string;
  user: AuthUser;
};

const TOKEN_KEY = "mythos_token";
const USER_KEY = "mythos_user";

export function saveSession(session: AuthResponse) {
  window.localStorage.setItem(TOKEN_KEY, session.access_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
