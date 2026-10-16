import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ERR_INVALID_AUTH, type Auth, type Connection } from "home-assistant-js-websocket";
import { connectToHA, signOut as revoke, type TokenStore } from "../connection";
import { createEntityStore, type EntityStore } from "../entity-store";
import { fetchRegistries, resolveEntityArea, type Registries } from "../registries";

export type HAStatus = "connecting" | "connected" | "reconnecting" | "error";

interface Session {
  auth: Auth;
  connection: Connection;
  store: EntityStore;
  registries: Registries;
  entityAreas: Map<string, string>;
}

interface HAContextValue {
  status: HAStatus;
  error: string | null;
  session: Session | null;
  signOut(): Promise<void>;
}

const HAContext = createContext<HAContextValue | null>(null);

/**
 * One connection per app lifetime, shared across renders. Kept at module level
 * so React StrictMode's double effect doesn't redeem the OAuth code twice.
 */
const sessions = new Map<string, Promise<Session>>();

function getSession(hassUrl: string, tokenStore: TokenStore) {
  let pending = sessions.get(hassUrl);
  if (!pending) {
    pending = (async () => {
      const { auth, connection } = await connectToHA({ hassUrl, tokenStore });
      const store = createEntityStore(connection);
      const registries = await fetchRegistries(connection);
      return { auth, connection, store, registries, entityAreas: resolveEntityArea(registries) };
    })();
    pending.catch(() => sessions.delete(hassUrl));
    sessions.set(hassUrl, pending);
  }
  return pending;
}

export function HAProvider({
  hassUrl,
  tokenStore,
  children,
}: {
  hassUrl: string;
  tokenStore: TokenStore;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<HAStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;

    getSession(hassUrl, tokenStore)
      .then((s) => {
        if (!active) return;
        setSession(s);
        setStatus("connected");
        s.connection.addEventListener("ready", () => active && setStatus("connected"));
        s.connection.addEventListener("disconnected", () => active && setStatus("reconnecting"));
        s.connection.addEventListener("reconnect-error", () => active && setStatus("error"));
      })
      .catch((err) => {
        if (!active) return;
        if (err === ERR_INVALID_AUTH) {
          // Refresh token revoked or expired: start the login flow again.
          tokenStore.save(null);
          window.location.reload();
          return;
        }
        setError(typeof err === "number" ? `HA error ${err}` : String(err));
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [hassUrl, tokenStore]);

  const value: HAContextValue = {
    status,
    error,
    session,
    async signOut() {
      if (session) await revoke(session.auth, tokenStore);
      sessions.delete(hassUrl);
      window.location.reload();
    },
  };

  return <HAContext.Provider value={value}>{children}</HAContext.Provider>;
}

export function useHA() {
  const ctx = useContext(HAContext);
  if (!ctx) throw new Error("useHA must be used inside <HAProvider>");
  return ctx;
}
