"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SkeletonList } from "@/components/skeleton";
import { SwipeActions } from "@/components/swipe-actions";
import { useToast } from "@/components/toast";

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

export function NotificationsClient() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const toast = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=100", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items as NotificationItem[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Đánh dấu tất cả là đã đọc khi mở trang (sau khi đã load xong)
  useEffect(() => {
    if (loading || items.length === 0) return;
    const hasUnread = items.some((n) => !n.readAt);
    if (!hasUnread) return;
    setMarking(true);
    fetch("/api/notifications", { method: "PATCH" })
      .then(() => {
        setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
        // Clear PWA badge nếu có
        try {
          const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
          if (typeof nav.clearAppBadge === "function") void nav.clearAppBadge().catch(() => {});
        } catch { /* ignore */ }
      })
      .finally(() => setMarking(false));
  }, [loading, items]);

  function hrefFor(n: NotificationItem): string | null {
    if (n.entity === "transaction" && n.entityId) {
      return `/history?txId=${encodeURIComponent(n.entityId)}`;
    }
    return null;
  }

  const deleteOne = useCallback(
    async (id: string) => {
      const target = items.find((n) => n.id === id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      try {
        const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      } catch {
        toast.error("Xoá thông báo thất bại");
        if (target) setItems((prev) => [target, ...prev]);
      }
    },
    [items, toast],
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Thông báo</h1>
        {marking && <span className="text-xs text-ink-3">Đang đánh dấu đã đọc...</span>}
      </div>

      <div className="card !p-0">
        {loading ? (
          <SkeletonList rows={6} />
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            Chưa có thông báo nào
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((n) => {
              const href = hrefFor(n);
              const inner = (
                <div className="flex items-start gap-3 px-4 py-3 bg-white">
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${n.readAt ? "bg-gray-200" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm leading-snug ${n.readAt ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                      {n.summary}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</div>
                  </div>
                  {href && <span className="text-gray-300 mt-2">›</span>}
                </div>
              );
              const wrapped = href ? (
                <Link href={href} className="block hover:bg-rose-50">
                  {inner}
                </Link>
              ) : (
                <div className="block">{inner}</div>
              );
              return (
                <li key={n.id}>
                  <SwipeActions
                    actionWidth={72}
                    rightActions={[
                      { label: "Xoá", icon: "🗑", color: "danger", onClick: () => void deleteOne(n.id) },
                    ]}
                  >
                    {wrapped}
                  </SwipeActions>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
