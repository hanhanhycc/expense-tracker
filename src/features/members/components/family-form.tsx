"use client";

import { useState } from "react";

export function FamilyForm({ initial }: { initial: { name: string } }) {
  const [name, setName] = useState(initial.name);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/family", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: data.error || "Lưu thất bại" });
      return;
    }
    setMsg({ type: "ok", text: "Đã cập nhật tên gia đình" });
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 max-w-xl">
      <div>
        <label className="label">Tên gia đình</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
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
