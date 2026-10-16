import { subscribeEntities, type Connection, type HassEntities } from "home-assistant-js-websocket";

/**
 * Tiny external store over `subscribeEntities`. Unchanged entities keep their
 * object identity between updates, so components subscribed to a single
 * entity only re-render when that entity changes — important on the wall
 * tablet (Snapdragon 680).
 */
export interface EntityStore {
  getSnapshot(): HassEntities;
  subscribe(listener: () => void): () => void;
  destroy(): void;
}

export function createEntityStore(connection: Connection): EntityStore {
  let entities: HassEntities = {};
  const listeners = new Set<() => void>();

  const unsubscribe = subscribeEntities(connection, (next) => {
    entities = next;
    listeners.forEach((l) => l());
  });

  return {
    getSnapshot: () => entities,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      unsubscribe();
      listeners.clear();
    },
  };
}
