"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClickOutside } from "@/lib/use-click-outside";

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

/**
 * Set/clear app icon badge khi PWA đã add to home screen.
 * Browser không support hoặc app mở trong tab thường → noop.
 */
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
    /* ignore — browser không support */
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

  // Poll mỗi 60s + refresh khi tab quay lại visible
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

  // Khi mở dropdown thì refresh ngay
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
      /* ignore — đã optimistic update */
    }
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-full hover:bg-rose-50 flex items-center justify-center text-gray-600 hover:text-primary-700 transition"
        aria-label="Thông báo"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center shadow">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden"
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

          <div className="max-h-[min(420px,70vh)] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                Chưa có thông báo nào
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => {
                  const href = n.entity === "transaction" && n.entityId ? `/history` : null;
                  const inner = (
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.readAt ? "bg-gray-200" : "bg-primary"}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm leading-snug ${n.readAt ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                          {n.summary}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</div>
                      </div>
                    </div>
                  );

                  return (
                    <li key={n.id}>
                      {href ? (
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
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
