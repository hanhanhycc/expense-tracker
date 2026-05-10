"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", familyName: "", inviteCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInvite, setHasInvite] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Đăng ký thất bại");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-bold mb-1">Đăng ký</h1>
      <p className="text-gray-500 text-sm mb-5">Tạo tài khoản miễn phí</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Tên hiển thị</label>
          <input className="input" required value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <label className="label">Mật khẩu</label>
          <input className="input" type="password" required minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)} />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <input id="hasInvite" type="checkbox" checked={hasInvite} onChange={(e) => setHasInvite(e.target.checked)} />
          <label htmlFor="hasInvite">Tôi có mã mời gia nhập gia đình</label>
        </div>

        {hasInvite ? (
          <div>
            <label className="label">Mã mời</label>
            <input className="input" required value={form.inviteCode} onChange={(e) => update("inviteCode", e.target.value.toUpperCase())} />
          </div>
        ) : (
          <div>
            <label className="label">Tên gia đình</label>
            <input className="input" required value={form.familyName} onChange={(e) => update("familyName", e.target.value)} placeholder="Vd: Gia đình An - Bình" />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Đang tạo..." : "Đăng ký"}
        </button>
      </form>
      <p className="text-sm text-center mt-5 text-gray-600">
        Đã có tài khoản?{" "}
        <Link href="/login" className="text-primary font-medium">Đăng nhập</Link>
      </p>
    </div>
  );
}
