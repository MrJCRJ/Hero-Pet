/**
 * Cliente HTTP para chamadas à API.
 * Usado pelos hooks TanStack Query.
 *
 * Genéricos: T indica o tipo esperado da resposta JSON.
 * Ex.: apiGet<Entity[]>("/api/v1/entities") retorna Promise<Entity[]>
 */

type FetchInit = Parameters<typeof fetch>[1];

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
};

export async function apiGet<T>(path: string, init?: FetchInit): Promise<T> {
  const url = path.startsWith("/") ? `${getBaseUrl()}${path}` : path;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  init?: FetchInit
): Promise<T> {
  const url = path.startsWith("/") ? `${getBaseUrl()}${path}` : path;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  init?: FetchInit
): Promise<T> {
  const url = path.startsWith("/") ? `${getBaseUrl()}${path}` : path;
  const res = await fetch(url, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(path: string, init?: FetchInit): Promise<void> {
  const url = path.startsWith("/") ? `${getBaseUrl()}${path}` : path;
  const res = await fetch(url, { method: "DELETE", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
}
