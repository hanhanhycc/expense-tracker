"use client";

/**
 * Web Push client helpers — xin permission, register subscription, lưu lên server.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushSetupResult =
  | { status: "subscribed" }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "no-vapid" }
  | { status: "error"; message: string };

/**
 * Idempotent: nếu đã subscribe rồi thì chỉ refresh subscription lên server.
 * Nếu user chưa cấp permission, gọi `Notification.requestPermission()`.
 */
export async function ensurePushSubscription(): Promise<PushSetupResult> {
  if (typeof window === "undefined") return { status: "unsupported" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { status: "unsupported" };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { status: "no-vapid" };

  // Permission
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return { status: "denied" };

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });
    }

    const payload = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: payload.endpoint, keys: payload.keys }),
    });
    if (!res.ok) {
      return { status: "error", message: "Không lưu được subscription" };
    }
    return { status: "subscribed" };
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
}

export async function unsubscribePush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    /* ignore */
  }
}
