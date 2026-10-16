import { env } from "./env";

/**
 * The browser authenticates with HA via OAuth and sends its HA access token
 * here. We accept a request if HA accepts that token — no separate login.
 * Valid tokens are cached briefly to avoid a round trip to HA per request.
 */
const validTokens = new Map<string, number>();
const CACHE_MS = 60_000;

export async function authorize(req: Request): Promise<Response | null> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return unauthorized();

  const cachedUntil = validTokens.get(token);
  if (cachedUntil && cachedUntil > Date.now()) return null;

  const res = await fetch(`${env().NEXT_PUBLIC_HA_URL}/api/`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);

  if (!res?.ok) {
    validTokens.delete(token);
    return unauthorized();
  }

  validTokens.set(token, Date.now() + CACHE_MS);
  return null;
}

const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });
