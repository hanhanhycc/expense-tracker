"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";

export function FamilyForm({ initial }: { initial: { name: string } }) {
  const [name, setName] = useState(initial.name);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/family", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Lưu thất bại");
      return;
    }
    toast.success("Đã cập nhật tên gia đình");
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 max-w-xl">
      <div>
        <label className="label">Tên gia đình</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <button className="btn-primary" disabled={loading}>
        {loading ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
