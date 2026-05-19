"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "sm_install_dismissed_at";
const NEVER_KEY = "sm_install_never_at";
const DISMISS_DAYS = 7;
const NEVER_DAYS = 10;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): "ios" | "android" | "desktop" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes("mac") && "ontouchend" in document)) {
    return "ios";
  }
  if (/android/.test(ua)) return "android";
  if (/win|mac|linux/.test(ua)) return "desktop";
  return "other";
}

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  if (!iOS) return false;
  // Loại CriOS (Chrome iOS), FxiOS (Firefox iOS), v.v.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isSafari;
}

function dismissedRecently(): boolean {
  try {
    const never = localStorage.getItem(NEVER_KEY);
    if (never) {
      const ts = Number(never);
      if (ts && Date.now() - ts < NEVER_DAYS * 24 * 60 * 60 * 1000) return true;
      // Hết hạn → xoá
      localStorage.removeItem(NEVER_KEY);
    }
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const ts = Number(v);
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [platform, setPlatform] = useState<ReturnType<typeof detectPlatform>>("other");

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return;
    const p = detectPlatform();
    setPlatform(p);

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS không có beforeinstallprompt → tự bật banner sau 1.5s
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (p === "ios" && isIOSSafari()) {
      iosTimer = setTimeout(() => setShow(true), 1500);
    }

    function onInstalled() {
      setShow(false);
      setIosOpen(false);
    }
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setShow(false);
    setIosOpen(false);
  }

  function never() {
    try {
      localStorage.setItem(NEVER_KEY, String(Date.now()));
    } catch {}
    setShow(false);
    setIosOpen(false);
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setShow(false);
      return;
    }
    if (platform === "ios") setIosOpen(true);
  }

  if (!show) return null;

  return (
    <>
      <div className="fixed bottom-24 left-3 right-3 z-40 desktop:bottom-6 desktop:left-auto desktop:right-6 desktop:max-w-sm">
        <div className="card-strong p-4 flex items-start gap-3">
          <img src="/logo.svg" alt="" className="h-10 w-10 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Cài Saving Money</p>
            <p className="text-gray-600 text-xs mt-0.5">
              {platform === "ios"
                ? "Thêm vào màn hình chính để dùng như app native."
                : "Cài đặt ứng dụng để dùng nhanh hơn, kể cả khi không có mạng."}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={install} className="btn-primary !py-1.5 !px-3 text-xs">
                {platform === "ios" ? "Hướng dẫn cài" : "Cài đặt"}
              </button>
              <button onClick={dismiss} className="btn-ghost !py-1.5 !px-3 text-xs">
                Để sau
              </button>
              <button onClick={never} className="!py-1.5 !px-3 text-xs text-gray-400 hover:text-gray-600 underline">
                Không nhắc trong 10 ngày
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Đóng"
            className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 p-1"
          >
            ✕
          </button>
        </div>
      </div>

      {iosOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={dismiss}>
          <div
            className="card-strong p-5 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <img src="/logo.svg" alt="" className="h-12 w-12" />
              <div>
                <p className="font-semibold">Cài Saving Money trên iPhone/iPad</p>
                <p className="text-xs text-gray-600">3 bước cực nhanh trong Safari</p>
              </div>
            </div>
            <ol className="text-sm space-y-2.5 text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>
                  Bấm nút <span className="font-semibold">Chia sẻ</span>{" "}
                  <span className="inline-block align-middle">⬆️</span> ở thanh dưới (hoặc trên cùng nếu là iPad).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>
                  Chọn <span className="font-semibold">Thêm vào MH chính</span>{" "}
                  <span className="inline-block align-middle">➕</span>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>
                  Bấm <span className="font-semibold">Thêm</span> ở góc phải.
                </span>
              </li>
            </ol>
            <button onClick={dismiss} className="btn-primary w-full mt-4">
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
