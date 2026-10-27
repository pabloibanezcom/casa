import { useEffect, useState, useSyncExternalStore } from "react";

/** Current time, re-rendering on each minute boundary. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = setTimeout(tick, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return now;
}

const noop = () => () => {};

/** False during SSR and hydration, true afterwards. Use it to keep build-time text (like the date) off screen. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
