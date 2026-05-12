"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/toast";

type Initial = { name: string; email: string; phone: string };

export function ProfileForm({ initial }: { initial: Initial }) {
  return (
    <div className="space-y-4">
      <AvatarSection />
      <InfoSection initial={initial} />
      <PasswordSection />
    </div>
  );
}

function AvatarSection() {
  const [version, setVersion] = useState(Date.now());
  const [hasAvatar, setHasAvatar] = useState(true);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Ảnh vượt quá 4MB");
      e.target.value = "";
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    setLoading(false);
    e.target.value = "";
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Tải ảnh thất bại");
      return;
    }
    setHasAvatar(true);
    setVersion(Date.now());
    toast.success("Đã cập nhật ảnh đại diện");
  }

  async function removeAvatar() {
    if (!confirm("Xoá ảnh đại diện?")) return;
    setLoading(true);
    const res = await fetch("/api/profile/avatar", { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      toast.error("Xoá thất bại");
      return;
    }
    setHasAvatar(false);
    setVersion(Date.now());
    toast.success("Đã xoá ảnh đại diện");
  }

  return (
    <div className="card max-w-xl space-y-3">
      <h2 className="font-semibold">Ảnh đại diện</h2>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden border border-rose-100 bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center text-white text-2xl font-bold">
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/profile/avatar?v=${version}`}
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={() => setHasAvatar(false)}
            />
          ) : (
            <span>👤</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="btn-primary text-sm !py-2 !px-3"
          >
            {loading ? "Đang tải..." : "Đổi ảnh"}
          </button>
          {hasAvatar && (
            <button type="button" onClick={removeAvatar} className="text-xs text-danger underline">
              Xoá ảnh
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPick}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">Chấp nhận JPG/PNG/WEBP, tối đa 4MB.</p>
    </div>
  );
}

function InfoSection({ initial }: { initial: Initial }) {
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
      <h2 className="font-semibold">Thông tin cá nhân</h2>
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

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) return toast.error("Mật khẩu mới tối thiểu 6 ký tự");
    if (next !== confirm) return toast.error("Xác nhận mật khẩu không khớp");
    setLoading(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Đổi mật khẩu thất bại");
      return;
    }
    toast.success("Đã đổi mật khẩu");
    setCurrent(""); setNext(""); setConfirm("");
  }

  return (
    <form onSubmit={submit} className="card space-y-3 max-w-xl">
      <h2 className="font-semibold">Đổi mật khẩu</h2>
      <div>
        <label className="label">Mật khẩu hiện tại</label>
        <input className="input" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <label className="label">Mật khẩu mới</label>
        <input className="input" type="password" required minLength={6} value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div>
        <label className="label">Xác nhận mật khẩu mới</label>
        <input className="input" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <button className="btn-primary" disabled={loading}>
        {loading ? "Đang lưu..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
