import { useAuthStore } from "@/stores/auth-store";

const base = "";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${base}${path}`, { ...init, headers, credentials: "include" });
}

export async function refreshAccessToken(): Promise<boolean> {
  const res = await fetch(`${base}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { accessToken: string; user: import("@/stores/auth-store").AuthUser };
  useAuthStore.getState().setSession(data.accessToken, data.user);
  return true;
}
