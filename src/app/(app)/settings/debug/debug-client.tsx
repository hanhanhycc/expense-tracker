"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { ensurePushSubscription } from "@/lib/push-client";

type Member = { id: string; user: { id: string; name: string; email: string } };

type TestResult = {
  ok: boolean;
  targetName?: string;
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
  const [members, setMembers] = useState<Member[]>([]);
  const [targetId, setTargetId] = useState<string>(""); // "" = chính tôi
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
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

    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => setMembers(d.items || []))
      .catch(() => undefined);
  }, []);

  async function runTest() {
    setTesting(true);
    setLastResult(null);
    try {
      // Chỉ subscribe nếu gửi cho chính tôi
      if (!targetId) await ensurePushSubscription();

      const payload: Record<string, string> = {};
      if (targetId) payload.memberId = targetId;
      if (title.trim()) payload.title = title.trim();
      if (body.trim()) payload.body = body.trim();

      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as TestResult;
      setLastResult(data);
      if (data.ok) {
        toast.success(
          `Đã gửi tới ${data.targetName ?? "?"} (${data.sent} subscription). Hỏi họ kiểm tra banner.`,
        );
      } else {
        toast.error(data.message || `Gửi thất bại. sent=${data.sent ?? 0} failed=${data.failed ?? 0}`);
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
        <h2 className="font-semibold text-gray-800">🔔 Web Push — gửi test</h2>

        <dl className="text-sm space-y-1.5 pb-2 border-b border-gray-100">
          <div className="flex justify-between">
            <dt className="text-gray-500">Permission trên thiết bị này</dt>
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

        <div className="space-y-3">
          <div>
            <label className="label">Gửi tới</label>
            <select
              className="input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">— Chính tôi (mặc định) —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name} ({m.user.email})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Member được chọn phải đã bật notification trên thiết bị của họ.
            </p>
          </div>

          <div>
            <label className="label">Tiêu đề (tuỳ chọn)</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="🔔 Test thông báo đẩy"
              maxLength={120}
            />
          </div>

          <div>
            <label className="label">Nội dung / memo (tuỳ chọn)</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Nếu thấy banner này tức là web push đang hoạt động."
              maxLength={500}
              rows={3}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Để trống → dùng nội dung mặc định. Tối đa 500 ký tự.
            </p>
          </div>
        </div>

        <button
          onClick={runTest}
          disabled={testing}
          className="btn-primary w-full disabled:opacity-50"
        >
          {testing ? "Đang gửi..." : "🧪 Gửi push test"}
        </button>

        {permission !== "granted" && !targetId && (
          <p className="text-xs text-amber-600">
            {permission === "denied"
              ? "Bạn đã từ chối notification. Khi gửi cho chính tôi, banner sẽ không hiện trên thiết bị này."
              : "Bạn chưa grant permission trên thiết bị này. Nếu gửi cho chính tôi, banner sẽ không hiện."}
          </p>
        )}

        {lastResult && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs space-y-1">
            <p className="font-medium text-gray-700">Kết quả gần nhất:</p>
            <ul className="space-y-0.5 text-gray-600">
              {lastResult.targetName && <li>target: <span className="font-mono">{lastResult.targetName}</span></li>}
              <li>configured: <span className="font-mono">{String(lastResult.configured ?? "?")}</span></li>
              <li>sent: <span className="font-mono">{lastResult.sent ?? 0}</span> (số subscription gửi thành công)</li>
              <li>removed: <span className="font-mono">{lastResult.removed ?? 0}</span> (sub hết hạn đã xoá)</li>
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
