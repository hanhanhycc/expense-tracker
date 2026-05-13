"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { ensurePushSubscription } from "@/lib/push-client";

type TestResult = {
  ok: boolean;
  sent?: number;
  removed?: number;
  failed?: number;
  configured?: boolean;
  errors?: string[];
  message?: string;
};

export function DebugClient() {
  const toast = useToast();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => setSubscribed(false));
    }
  }, []);

  async function runTest() {
    setTesting(true);
    setLastResult(null);
    try {
      // Đảm bảo có subscription trước
      await ensurePushSubscription();
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as TestResult;
      setLastResult(data);
      if (data.ok) {
        toast.success(`Đã gửi tới ${data.sent} subscription. Kiểm tra banner notification trên thiết bị.`);
      } else {
        toast.error(data.message || "Gửi push thất bại");
      }
    } catch (e) {
      toast.error("Lỗi gọi API");
      setLastResult({ ok: false, message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  }

  const permissionLabel: Record<string, { text: string; color: string }> = {
    granted: { text: "✅ Đã cho phép", color: "text-success" },
    denied: { text: "❌ Đã từ chối", color: "text-danger" },
    default: { text: "⚠️ Chưa hỏi", color: "text-amber-600" },
    unsupported: { text: "❌ Browser không hỗ trợ", color: "text-gray-500" },
  };

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h2 className="font-semibold text-gray-800">🔔 Web Push</h2>

        <dl className="text-sm space-y-1.5">
          <div className="flex justify-between">
            <dt className="text-gray-500">Trạng thái permission</dt>
            <dd className={permissionLabel[permission]?.color || ""}>
              {permissionLabel[permission]?.text || permission}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Subscription trên thiết bị này</dt>
            <dd>
              {subscribed === null ? "..." : subscribed ? "✅ Đã đăng ký" : "⚠️ Chưa đăng ký"}
            </dd>
          </div>
        </dl>

        <button
          onClick={runTest}
          disabled={testing || permission !== "granted"}
          className="btn-primary w-full disabled:opacity-50"
        >
          {testing ? "Đang gửi..." : "🧪 Gửi push test tới chính tôi"}
        </button>

        {permission !== "granted" && (
          <p className="text-xs text-amber-600">
            {permission === "denied"
              ? "Bạn đã từ chối notification. Bật lại trong cài đặt trình duyệt/PWA trước khi test."
              : "Cần grant permission. Mở chuông notification ở thanh trên cùng và bấm \"Bật thông báo đẩy\" trước."}
          </p>
        )}

        {lastResult && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs space-y-1">
            <p className="font-medium text-gray-700">Kết quả gần nhất:</p>
            <ul className="space-y-0.5 text-gray-600">
              <li>configured: <span className="font-mono">{String(lastResult.configured ?? "?")}</span></li>
              <li>sent: <span className="font-mono">{lastResult.sent ?? 0}</span></li>
              <li>removed: <span className="font-mono">{lastResult.removed ?? 0}</span> (subscription hết hạn đã xoá)</li>
              <li>failed: <span className="font-mono">{lastResult.failed ?? 0}</span></li>
              {lastResult.message && <li className="text-danger">message: {lastResult.message}</li>}
              {lastResult.errors && lastResult.errors.length > 0 && (
                <li className="text-danger">errors:
                  <ul className="ml-3 list-disc">
                    {lastResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </li>
              )}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
