"use client";

import { useRef, useState, type ReactNode } from "react";

type Action = {
  label: string;
  icon?: string;
  color: "primary" | "danger" | "gray";
  onClick: () => void;
};

const colorMap: Record<Action["color"], string> = {
  primary: "bg-primary text-white",
  danger: "bg-danger text-white",
  gray: "bg-gray-500 text-white",
};

/**
 * Swipe trái để lộ các nút action ở phải (giống iOS Mail).
 * Touch + chuột (drag) đều OK. Bấm ra ngoài hoặc swipe phải để đóng.
 */
export function SwipeActions({
  children,
  rightActions = [],
  actionWidth = 72,
}: {
  children: ReactNode;
  rightActions?: Action[];
  actionWidth?: number;
}) {
  const maxOpen = rightActions.length * actionWidth;
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(false);

  function begin(x: number) {
    startX.current = x;
    startOffset.current = open ? -maxOpen : 0;
    dragging.current = true;
    moved.current = false;
  }
  function move(x: number) {
    if (!dragging.current || startX.current === null) return;
    const dx = x - startX.current;
    if (Math.abs(dx) > 4) moved.current = true;
    let next = startOffset.current + dx;
    if (next > 0) next = 0;
    if (next < -maxOpen) next = -maxOpen + (next + maxOpen) * 0.2; // resist
    setOffset(next);
  }
  function end() {
    if (!dragging.current) return;
    dragging.current = false;
    const threshold = maxOpen / 2;
    const shouldOpen = -offset > threshold;
    setOpen(shouldOpen);
    setOffset(shouldOpen ? -maxOpen : 0);
    startX.current = null;
  }

  function close() {
    setOpen(false);
    setOffset(0);
  }

  if (rightActions.length === 0) return <>{children}</>;

  return (
    <div className="relative overflow-hidden touch-pan-y select-none">
      {/* Action layer (right) */}
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: maxOpen }}
        aria-hidden={!open}
      >
        {rightActions.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { a.onClick(); close(); }}
            className={`h-full flex flex-col items-center justify-center gap-0.5 text-xs font-bold ${colorMap[a.color]}`}
            style={{ width: actionWidth }}
          >
            {a.icon && <span className="text-base leading-none">{a.icon}</span>}
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Content (slides) */}
      <div
        className="relative bg-white"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? "none" : "transform 200ms ease",
        }}
        onTouchStart={(e) => begin(e.touches[0].clientX)}
        onTouchMove={(e) => move(e.touches[0].clientX)}
        onTouchEnd={end}
        onMouseDown={(e) => begin(e.clientX)}
        onMouseMove={(e) => { if (dragging.current) move(e.clientX); }}
        onMouseUp={end}
        onMouseLeave={end}
        onClickCapture={(e) => {
          // Nếu vừa swipe (đã di chuyển), nuốt click để không trigger handler con.
          if (moved.current) {
            e.stopPropagation();
            e.preventDefault();
            moved.current = false;
          } else if (open) {
            e.stopPropagation();
            e.preventDefault();
            close();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
