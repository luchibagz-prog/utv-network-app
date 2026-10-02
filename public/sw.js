const CACHE_NAME = "vuewe-push-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      body: event.data?.text() || "New VUEWE activity.",
    };
  }

  const title = data.title || "VUEWE";
  const eventType = data?.data?.event || data?.event || "";
  const isRealtimeInvite =
    eventType === "audio_call" ||
    eventType === "video_call" ||
    eventType === "walkie";

  const options = {
    body: data.body || "You have new activity on VUEWE.",
    icon: data.icon || "/vuewe-icon.svg",
    badge: data.badge || "/vuewe-badge.svg",
    tag: data.tag || `vuewe-${Date.now()}`,
    renotify: true,
    silent: false,
    timestamp: Date.now(),
    requireInteraction: isRealtimeInvite,
    vibrate: isRealtimeInvite
      ? [240, 90, 240, 90, 420]
      : [120, 55, 120],
    actions: isRealtimeInvite
      ? [
          { action: "open", title: "Open VUEWE" },
          { action: "dismiss", title: "Dismiss" },
        ]
      : [{ action: "open", title: "Open VUEWE" }],
    data: {
      ...(data.data || {}),
      event: eventType,
      url: data.url || data.link || "/activity",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  if (event.action === "dismiss") {
    event.notification.close();
    return;
  }

  event.notification.close();

  const target = new URL(
    event.notification.data?.url || "/activity",
    self.location.origin
  ).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }

        if (clients.openWindow) return clients.openWindow(target);
      })
  );
});
