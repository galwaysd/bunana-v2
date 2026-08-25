/**
 * Same-origin browser API helpers.
 *
 * Protected browser writes are authenticated by an HttpOnly test-access
 * cookie. Client code must never read or transmit a public API secret.
 */

export function jsonHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...extra,
  };
}

type ApiErrorPayload = { code?: string };

export function handleTestAccessRequired(
  status: number,
  payload: ApiErrorPayload
): boolean {
  if (status !== 401 || payload.code !== "TEST_ACCESS_REQUIRED") return false;
  if (typeof window === "undefined") return true;

  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(`/enter?returnTo=${encodeURIComponent(returnTo)}`);
  return true;
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiErrorPayload;
  handleTestAccessRequired(response.status, payload);
  return payload;
}

export async function apiPost<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: jsonHeaders(),
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  return readApiResponse<T>(response);
}

export async function apiPut<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  const response = await fetch(url, {
    method: "PUT",
    headers: jsonHeaders(),
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  return readApiResponse<T>(response);
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin" });
  return response.json();
}
