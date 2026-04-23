const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";

export function getAccessToken(): string | null {
  return localStorage.getItem("airsafenet_token");
}

export function setAccessToken(token: string) {
  localStorage.setItem("airsafenet_token", token);
}

export function clearAccessToken() {
  localStorage.removeItem("airsafenet_token");
}

type RequestOptions = Omit<RequestInit, "body"> & {
  auth?: boolean;
  body?: unknown; 
};

export async function http<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { auth = false, headers, body, ...rest } = options;

  const finalHeaders = new Headers(headers as HeadersInit ?? {});
  finalHeaders.set("Content-Type", "application/json");

  if (auth) {
    const token = getAccessToken();
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const serializedBody =
    body === undefined || body === null
      ? undefined
      : typeof body === "string"
      ? body
      : JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: serializedBody,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      message = errorBody?.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}