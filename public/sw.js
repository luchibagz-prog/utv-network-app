const CACHE_NAME = "utv-shell-v7a";
const SHELL = ["/", "/feed", "/activity", "/notifications", "/messages", "/settings", "/utv-logo.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/feed")))
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data?.text() || "New UTV activity." }; }

  const target = data.link || data.url || "/notifications";

  event.waitUntil(
    self.registration.showNotification(data.title || "UTV", {
      body: data.body || "You have new activity on UTV.",
      icon: data.icon || "/utv-logo.png",
      badge: data.badge || "/utv-logo.png",
      tag: data.tag || `utv-${Date.now()}`,
      renotify: true,
      vibrate: [120, 55, 120],
      data: { url: target },
      actions: [
        { action: "open", title: "Open UTV" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(target) : undefined;
    })
  );
});
