// casa.pabloibanez.com used to serve Home Assistant, which left its service
// worker (sw-modern.js) installed in browsers. That worker keeps serving a
// stale copy of this app from its cache. Browsers re-check the worker script
// on navigation; this replacement clears every cache, unregisters itself and
// reloads open tabs so they get the live app from the network.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: "window" });
      for (const client of windows) client.navigate(client.url);
    })(),
  );
});
