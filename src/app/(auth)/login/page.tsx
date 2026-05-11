"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Email hoặc mật khẩu không đúng");
      return;
    }
    router.push(search.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">Mật khẩu</label>
        <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="card">
      <div className="flex flex-col items-center mb-6">
        <img src="/logo.svg" alt="Saving Money" className="h-24 w-24 mb-3 rounded-3xl shadow-[0_12px_30px_rgba(231,72,128,0.25)]" />
        <h1 className="text-3xl font-extrabold tracking-tight">Save!</h1>
        <p className="text-gray-500 text-sm mt-0.5">your money — đăng nhập để tiếp tục</p>
      </div>
      <Suspense fallback={<div className="text-sm text-gray-500">Đang tải...</div>}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-center mt-5 text-gray-600">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="text-primary font-medium">Đăng ký</Link>
      </p>
    </div>
  );
}
