const CACHE_NAME = "utv-push-v1";

self.addEventListener(
  "install",
  () => {
    self.skipWaiting();
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      self.clients.claim()
    );
  }
);

self.addEventListener(
  "push",
  (event) => {
    let data = {};

    try {
      data =
        event.data
          ? event.data.json()
          : {};
    } catch {
      data = {
        body:
          event.data?.text() ||
          "New UTV activity.",
      };
    }

    const title =
      data.title || "UTV";

    const options = {
      body:
        data.body ||
        "You have new activity on UTV.",
      icon:
        data.icon ||
        "/utv-logo.png",
      badge:
        data.badge ||
        "/utv-logo.png",
      tag:
        data.tag ||
        `utv-${Date.now()}`,
      renotify: true,
      vibrate: [
        110,
        55,
        110,
      ],
      data: {
        url:
          data.url ||
          "/activity",
      },
    };

    event.waitUntil(
      self.registration.showNotification(
        title,
        options
      )
    );
  }
);

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const target =
      new URL(
        event.notification
          .data?.url ||
          "/activity",
        self.location.origin
      ).href;

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((windows) => {
          for (const client of windows) {
            if ("focus" in client) {
              client.navigate(target);
              return client.focus();
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(
              target
            );
          }
        })
    );
  }
);
