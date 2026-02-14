/**
 * API Client - Centralized fetch wrapper with auth support
 */

const API_BASE = "/api";

let authToken: string | null = localStorage.getItem("auth_token");

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("auth_token", token);
  else localStorage.removeItem("auth_token");
}

export function getAuthToken() {
  return authToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    // Failed to fetch = network error (server unreachable, CORS, etc.)
    const msg = err?.message || String(err);
    if (msg.includes("fetch") || msg.includes("NetworkError") || msg.includes("Failed")) {
      throw new Error("فشل الاتصال بالخادم. تأكد من تشغيل التطبيق بـ: pnpm dev");
    }
    throw err;
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`استجابة غير صحيحة من الخادم (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.error || `خطأ: ${res.status}`);
  }

  return data;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: any) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: any) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};
