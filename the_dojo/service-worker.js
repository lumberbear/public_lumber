const CACHE_PREFIX = "the-dojo-";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(retireServiceWorker());
});

async function retireServiceWorker() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => caches.delete(key))
  );

  await self.clients.claim();
  await self.registration.unregister();

  const windows = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window"
  });

  await Promise.all(windows.map((client) => {
    if (client.url.includes("/the_dojo/") && "navigate" in client) {
      return client.navigate(client.url);
    }
    return Promise.resolve();
  }));
}
