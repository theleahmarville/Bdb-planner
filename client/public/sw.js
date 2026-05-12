// BDB Planner — Service Worker for Push Notifications
const APP_NAME = "Be Do Become";
const ICON = "/icon-192.png";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// ── Push event ────────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: APP_NAME, body: event.data ? event.data.text() : "" };
  }

  const title = data.title || APP_NAME;
  const options = {
    body: data.body || "",
    icon: data.icon || ICON,
    badge: data.badge || ICON,
    tag: data.tag || "bdb-notification",
    data: { url: data.url || "/" },
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
