/// <reference lib="webworker" />
// Service worker custom — xử lý push event, click notification, update app badge.
// File này được next-pwa inject vào SW chính (xem next.config.mjs customWorkerSrc).

declare const self: ServiceWorkerGlobalScope & {
  navigator: WorkerNavigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
};

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  unreadCount?: number;
  tag?: string;
};

self.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Saving Money";
  const body = payload.body || "Bạn có thông báo mới";
  const url = payload.url || "/notifications";

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url },
        tag: payload.tag || "expense-share",
      });
      if (typeof payload.unreadCount === "number" && typeof self.navigator.setAppBadge === "function") {
        try {
          await self.navigator.setAppBadge(payload.unreadCount);
        } catch {
          /* ignore */
        }
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const url = data?.url || "/notifications";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        // Focus client đang mở nếu URL trùng path
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
