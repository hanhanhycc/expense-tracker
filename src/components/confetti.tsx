"use client";

import { useEffect, useState } from "react";

const LOTTIE_EMBED = "https://lottie.host/embed/12b5a432-a459-4901-b123-7f684176f7a6/uArLNKNyoB.lottie";

const listeners = new Set<(active: boolean, key: number) => void>();
let activeKey = 0;

export function fireConfetti(durationMs = 2800) {
  if (typeof window === "undefined") return;
  activeKey += 1;
  const myKey = activeKey;
  listeners.forEach((l) => l(true, myKey));
  window.setTimeout(() => {
    if (myKey === activeKey) listeners.forEach((l) => l(false, myKey));
  }, durationMs);
}

export function ConfettiHost() {
  const [state, setState] = useState<{ active: boolean; key: number }>({ active: false, key: 0 });

  useEffect(() => {
    const cb = (active: boolean, key: number) => setState({ active, key });
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  if (!state.active) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
    >
      <iframe
        key={state.key}
        src={LOTTIE_EMBED}
        title="confetti"
        className="border-0"
        style={{ width: "min(95vw, 520px)", height: "min(95vw, 520px)", background: "transparent" }}
        allow="autoplay"
      />
    </div>
  );
}
