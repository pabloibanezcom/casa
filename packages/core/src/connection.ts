import {
  createConnection,
  getAuth,
  type Auth,
  type AuthData,
  type Connection,
} from "home-assistant-js-websocket";

/**
 * Where HA OAuth tokens live. The browser uses localStorage; the Expo app
 * will plug in a SecureStore-backed implementation with the same shape.
 */
export interface TokenStore {
  load(): Promise<AuthData | null | undefined>;
  save(data: AuthData | null): void;
}

export interface ConnectOptions {
  hassUrl: string;
  tokenStore: TokenStore;
  /** Defaults to `${origin}/` in browsers (HA's IndieAuth-style client id). */
  clientId?: string;
  redirectUrl?: string;
}

/**
 * Runs HA's OAuth flow (redirecting to HA's login page if needed) and opens
 * the WebSocket. No long-lived token anywhere: each user signs in with their
 * own HA account and the refresh token stays on their device.
 */
export async function connectToHA(opts: ConnectOptions): Promise<{ auth: Auth; connection: Connection }> {
  const auth = await getAuth({
    hassUrl: opts.hassUrl,
    clientId: opts.clientId,
    redirectUrl: opts.redirectUrl,
    saveTokens: (data) => opts.tokenStore.save(data),
    loadTokens: () => opts.tokenStore.load(),
  });

  clearAuthCallbackParams();

  const connection = await createConnection({ auth });
  return { auth, connection };
}

export async function signOut(auth: Auth, tokenStore: TokenStore) {
  tokenStore.save(null);
  try {
    await auth.revoke();
  } catch {
    // Token may already be invalid; nothing else to do.
  }
}

/** After the OAuth redirect HA leaves ?auth_callback=1&code=… in the URL. */
function clearAuthCallbackParams() {
  if (typeof window === "undefined" || !window.history) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("auth_callback")) return;
  for (const key of ["auth_callback", "code", "state"]) url.searchParams.delete(key);
  window.history.replaceState(null, "", url.toString());
}
