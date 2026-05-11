"use client";

import { useEffect } from "react";

type Args = {
  enabled: boolean;
  onClose: () => void;
  ref: React.RefObject<HTMLElement | null>;
};

export function useClickOutside({ enabled, onClose, ref }: Args) {
  useEffect(() => {
    if (!enabled) return;
    function handlePointer(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [enabled, onClose, ref]);
}
