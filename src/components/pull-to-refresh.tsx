"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 70;

/**
 * Pull-to-refresh đơn giản cho mobile.
 * Chỉ kích hoạt khi `window.scrollY === 0` lúc bắt đầu chạm.
 */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void; children: React.ReactNode }) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY === 0) {
        const damped = Math.min(120, dy * 0.5);
        setPull(damped);
      }
    }
    async function onTouchEnd() {
      if (startY.current === null) { setPull(0); return; }
      const triggered = pull >= THRESHOLD;
      startY.current = null;
      if (triggered) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try { await onRefresh(); } catch { /* ignore */ }
        setRefreshing(false);
      }
      setPull(0);
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing, onRefresh]);

  const visible = pull > 0 || refreshing;
  const translateY = refreshing ? THRESHOLD * 0.7 : Math.max(0, pull * 0.7);

  return (
    <>
      {visible && (
        <div
          className={`ptr-indicator ${refreshing ? "spin" : ""}`}
          style={{ transform: `translate(-50%, ${translateY - 50}px)` }}
          aria-hidden="true"
        >
          {refreshing ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E64980" strokeWidth="3" strokeLinecap="round">
              <path d="M12 2a10 10 0 1 0 10 10" />
            </svg>
          ) : (
            <span style={{ transform: `rotate(${Math.min(180, (pull / THRESHOLD) * 180)}deg)`, display: "inline-block", color: "#E64980" }}>↓</span>
          )}
        </div>
      )}
      {children}
    </>
  );
}
