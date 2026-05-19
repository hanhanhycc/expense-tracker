"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClickOutside } from "@/lib/use-click-outside";
import { ensurePushSubscription } from "@/lib/push-client";
import { SwipeActions } from "@/components/swipe-actions";

type NotificationItem = {
  id: string;
  type: string;
  entity: string;
  entityId: string | null;
  summary: string;
  actorName: string;
  readAt: string | null;
  createdAt: string;
};

type FetchResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

const POLL_MS = 60_000;

type BadgeNavigator = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

function updateAppBadge(count: number) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as BadgeNavigator;
  try {
    if (count > 0 && typeof nav.setAppBadge === "function") {
      void nav.setAppBadge(count).catch(() => {});
    } else if (count === 0 && typeof nav.clearAppBadge === "function") {
      void nav.clearAppBadge().catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  const [enabling, setEnabling] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside({ enabled: open, onClose: () => setOpen(false), ref });

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/notifications?limit=20", { signal, cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as FetchResponse;
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      updateAppBadge(data.unreadCount);
    } catch {
      /* ignore */
    }
  }, []);

  // Mount: nếu permission đã granted thì refresh subscription (idempotent, silent).
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      void ensurePushSubscription();
    }
  }, []);

  // Poll mỗi 60s + refresh khi tab visible
  useEffect(() => {
    const ctrl = new AbortController();
    void fetchData(ctrl.signal);
    const interval = setInterval(() => void fetchData(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchData();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      ctrl.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchData]);

  useEffect(() => {
    if (open) void fetchData();
  }, [open, fetchData]);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setLoading(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      updateAppBadge(0);
    } finally {
      setLoading(false);
    }
  }, [unreadCount]);

  const markOneRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((c) => {
      const next = Math.max(0, c - 1);
      updateAppBadge(next);
      return next;
    });
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    } catch {
      /* ignore */
    }
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    // Optimistic
    const target = items.find((n) => n.id === id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.readAt) {
      setUnreadCount((c) => {
        const next = Math.max(0, c - 1);
        updateAppBadge(next);
        return next;
      });
    }
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    } catch {
      // Rollback nếu lỗi
      if (target) setItems((prev) => [target, ...prev]);
    }
  }, [items]);

  const enablePush = useCallback(async () => {
    setEnabling(true);
    const result = await ensurePushSubscription();
    setEnabling(false);
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }
    if (result.status === "no-vapid") {
      // eslint-disable-next-line no-console
      console.warn("[push] VAPID keys chưa được cấu hình.");
    }
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-ink-1 transition touch-manipulation"
        style={{
          background: "var(--glass-bg-strong)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
        aria-label="Thông báo"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--accent-1), var(--danger))",
              boxShadow: "0 0 0 2px var(--bg-base), 0 0 12px var(--accent-1)",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden"
          style={{
            background: "var(--glass-bg-strong)",
            backdropFilter: "blur(36px) saturate(180%)",
            WebkitBackdropFilter: "blur(36px) saturate(180%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow-lg)",
            color: "var(--ink-1)",
          }}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-gray-800">Thông báo</div>
            <button
              onClick={markAllRead}
              disabled={loading || unreadCount === 0}
              className="text-xs text-primary-700 hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              Đánh dấu đã đọc
            </button>
          </div>

          {pushPermission === "default" && (
            <button
              onClick={enablePush}
              disabled={enabling}
              className="w-full px-4 py-2.5 bg-primary/10 text-primary-700 text-sm font-medium hover:bg-primary/20 disabled:opacity-60 flex items-center justify-center gap-2 border-b"
            >
              <span>🔔</span>
              <span>{enabling ? "Đang bật..." : "Bật thông báo đẩy real-time"}</span>
            </button>
          )}
          {pushPermission === "denied" && (
            <div className="px-4 py-2 bg-amber-50 text-amber-700 text-xs border-b">
              Bạn đã tắt notification. Bật lại trong cài đặt trình duyệt nếu muốn nhận thông báo đẩy.
            </div>
          )}

          <div className="max-h-[min(420px,70vh)] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                Chưa có thông báo nào
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.slice(0, 8).map((n) => {
                  const href =
                    n.entity === "transaction" && n.entityId
                      ? `/history?txId=${encodeURIComponent(n.entityId)}`
                      : null;
                  const inner = (
                    <div className="flex items-start gap-3 bg-white">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.readAt ? "bg-gray-200" : "bg-primary"}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm leading-snug ${n.readAt ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                          {n.summary}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</div>
                      </div>
                    </div>
                  );

                  const linkOrButton = href ? (
                    <Link
                      href={href}
                      onClick={() => {
                        if (!n.readAt) void markOneRead(n.id);
                        setOpen(false);
                      }}
                      className="block px-4 py-3 hover:bg-rose-50"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        if (!n.readAt) void markOneRead(n.id);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-rose-50"
                    >
                      {inner}
                    </button>
                  );

                  return (
                    <li key={n.id}>
                      <SwipeActions
                        actionWidth={64}
                        rightActions={[
                          { label: "Xoá", icon: "🗑", color: "danger", onClick: () => void deleteOne(n.id) },
                        ]}
                      >
                        {linkOrButton}
                      </SwipeActions>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm text-primary-700 hover:bg-rose-50 py-3 font-medium"
            >
              Xem tất cả thông báo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
