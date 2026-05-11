"use client";

import { useState } from "react";

type Initial = { name: string; email: string; phone: string };

export function ProfileForm({ initial }: { initial: Initial }) {
  const [form, setForm] = useState<Initial>(initial);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function update<K extends keyof Initial>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: data.error || "Lưu thất bại" });
      return;
    }
    setMsg({ type: "ok", text: "Đã lưu thông tin. Đăng xuất & đăng nhập lại nếu đổi email." });
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 max-w-xl">
      <div>
        <label className="label">Tên hiển thị</label>
        <input className="input" required value={form.name} onChange={(e) => update("name", e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
      </div>
      <div>
        <label className="label">Số điện thoại</label>
        <input
          className="input"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="Vd: 0901234567"
        />
      </div>

      {msg && (
        <p className={`text-sm ${msg.type === "ok" ? "text-success" : "text-danger"}`}>{msg.text}</p>
      )}

      <button className="btn-primary" disabled={loading}>
        {loading ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
