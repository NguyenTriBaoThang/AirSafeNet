const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001";

export function getAccessToken(): string | null {
  return localStorage.getItem("airsafenet_token");
}

export function setAccessToken(token: string) {
  localStorage.setItem("airsafenet_token", token);
}

export function clearAccessToken() {
  localStorage.removeItem("airsafenet_token");
}

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export async function http<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { auth = false, headers, ...rest } = options;

  const finalHeaders = new Headers(headers ?? {});
  finalHeaders.set("Content-Type", "application/json");

  if (auth) {
    const token = getAccessToken();
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
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