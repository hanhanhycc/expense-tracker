"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";

type Initial = { name: string; email: string; phone: string };

export function ProfileForm({ initial }: { initial: Initial }) {
  const [form, setForm] = useState<Initial>(initial);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  function update<K extends keyof Initial>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Lưu thất bại");
      return;
    }
    toast.success("Đã lưu thông tin. Đăng xuất & đăng nhập lại nếu đổi email.");
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

      <button className="btn-primary" disabled={loading}>
        {loading ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
