import { useCallback, useSyncExternalStore } from "react";
import { callService, type HassEntities, type HassEntity, type HassServiceTarget } from "home-assistant-js-websocket";
import { useHA } from "./HAProvider";

const noopSubscribe = () => () => {};
const EMPTY: HassEntities = {};

/** Re-renders only when this entity changes. */
export function useEntity(entityId: string): HassEntity | undefined {
  const { session } = useHA();
  const store = session?.store;
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    () => store?.getSnapshot()[entityId],
    () => undefined,
  );
}

/** Re-renders on any entity change: use for lists, keep the filtering cheap. */
export function useEntities(): HassEntities {
  const { session } = useHA();
  const store = session?.store;
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    () => store?.getSnapshot() ?? EMPTY,
    () => EMPTY,
  );
}

export function useCallService() {
  const { session } = useHA();
  return useCallback(
    (domain: string, service: string, data?: object, target?: HassServiceTarget) => {
      if (!session) throw new Error("Not connected to Home Assistant");
      return callService(session.connection, domain, service, data, target);
    },
    [session],
  );
}

/** Fresh HA access token, for authenticating against our own backend. */
export function useAccessToken() {
  const { session } = useHA();
  return useCallback(async () => {
    if (!session) throw new Error("Not connected to Home Assistant");
    if (session.auth.expired) await session.auth.refreshAccessToken();
    return session.auth.accessToken;
  }, [session]);
}
