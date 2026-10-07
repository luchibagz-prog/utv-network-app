const CACHE_NAME = "vuewe-push-v6";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("vuewe-push-") &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );

      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      windows.forEach((client) => {
        client.postMessage?.({
          type: "VUEWE_SW_ACTIVATED",
          cache: CACHE_NAME,
        });
      });
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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
  const isCall =
    eventType === "audio_call" ||
    eventType === "video_call";
  const isWalkie = eventType === "walkie";
  const isRealtimeInvite = isCall || isWalkie;

  let openLabel = "Open VUEWE";

  if (isCall) {
    openLabel = eventType === "video_call"
      ? "Open Video Call"
      : "Open Call";
  } else if (isWalkie) {
    openLabel = "Open Walkie";
  } else if (eventType === "message") {
    openLabel = "Open Message";
  } else if (
    eventType === "booking" ||
    eventType === "booking_update"
  ) {
    openLabel = "View Booking";
  } else if (eventType === "gift") {
    openLabel = "Open Wallet";
  }

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
          { action: "open", title: openLabel },
          { action: "dismiss", title: "Dismiss" },
        ]
      : [{ action: "open", title: openLabel }],
    data: {
      ...(data.data || {}),
      event: eventType,
      url: data.url || data.link || "/activity",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
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
    (async () => {
      const windows = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        try {
          await client.navigate(target);
          client.postMessage?.({
            type: "VUEWE_NOTIFICATION_OPEN",
            event: event.notification.data?.event || "",
            url: target,
          });
          return client.focus();
        } catch {}
      }

      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    })()
  );
});
