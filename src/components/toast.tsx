"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; text: string };

type ToastApi = {
  show: (text: string, type?: ToastType) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Fallback an toàn nếu component dùng ngoài Provider
    return {
      show: (t) => console.warn("[toast]", t),
      success: (t) => console.warn("[toast.success]", t),
      error: (t) => console.warn("[toast.error]", t),
      info: (t) => console.warn("[toast.info]", t),
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setItems((s) => s.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (text: string, type: ToastType = "info") => {
      const id = Date.now() + Math.random();
      setItems((s) => [...s, { id, text, type }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove],
  );

  const api: ToastApi = {
    show,
    success: (t) => show(t, "success"),
    error: (t) => show(t, "error"),
    info: (t) => show(t, "info"),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-[92%] max-w-sm">
        {items.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10);
    return () => clearTimeout(t);
  }, []);

  const gradient =
    toast.type === "success"
      ? "linear-gradient(135deg, var(--success), #0EA5C0)"
      : toast.type === "error"
        ? "linear-gradient(135deg, var(--danger), #FF2D55)"
        : "linear-gradient(135deg, var(--accent-1), var(--accent-2))";

  const icon = toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ";

  return (
    <div
      className={`pointer-events-auto text-white rounded-2xl px-4 py-3 text-sm flex items-start gap-3 transition-all duration-200 ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
      style={{
        background: gradient,
        boxShadow: "0 14px 40px -8px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.18) inset",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
      role="status"
    >
      <span className="font-bold">{icon}</span>
      <span className="flex-1">{toast.text}</span>
      <button onClick={onClose} aria-label="Đóng" className="opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}
