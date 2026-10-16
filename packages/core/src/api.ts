/**
 * Client for the Next backend (apps/web/app/api). Every request carries the
 * user's current HA access token; the backend validates it against HA, so
 * there is no second login system.
 */
export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string>;
}

export function createApiClient({ baseUrl, getAccessToken }: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init.headers,
        authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}`);
    return res.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
