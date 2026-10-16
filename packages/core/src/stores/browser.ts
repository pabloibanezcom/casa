import type { AuthData } from "home-assistant-js-websocket";
import type { TokenStore } from "../connection";

export function browserTokenStore(key = "casa.ha.tokens"): TokenStore {
  return {
    async load() {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as AuthData) : null;
      } catch {
        return null;
      }
    },
    save(data) {
      try {
        if (data) localStorage.setItem(key, JSON.stringify(data));
        else localStorage.removeItem(key);
      } catch {
        // Private mode / storage disabled: user will just log in again.
      }
    },
  };
}
