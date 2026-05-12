"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";

type Role = "OWNER" | "ADMIN" | "MEMBER";
type Member = { id: string; role: Role; user: { id: string; name: string; email: string } };

export function MembersClient({
  canManage,
  currentMemberId,
  currentRole,
}: {
  canManage: boolean;
  currentMemberId: string;
  currentRole: Role;
}) {
  const [items, setItems] = useState<Member[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [loading, setLoading] = useState(false);
  const [pwdMember, setPwdMember] = useState<Member | null>(null);
  const toast = useToast();

  async function load() {
    const r = await fetch("/api/members");
    setItems((await r.json()).items || []);
  }
  useEffect(() => { load(); }, []);

  async function genInvite() {
    setLoading(true);
    const r = await fetch("/api/invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });
    setLoading(false);
    if (r.ok) {
      const d = await r.json();
      setCode(d.code);
      toast.success("Đã tạo mã mời");
    } else {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error || "Không tạo được mã mời");
    }
  }

  async function changeRole(id: string, newRole: "MEMBER" | "ADMIN") {
    const r = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error || "Đổi vai trò thất bại");
      return;
    }
    toast.success("Đã đổi vai trò");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Xoá thành viên này?")) return;
    const r = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error || "Xoá thất bại");
      return;
    }
    toast.success("Đã xoá thành viên");
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Thành viên gia đình</h1>

      {canManage && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Mời thành viên mới</h2>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label">Vai trò</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")}>
                <option value="MEMBER">Thành viên</option>
                <option value="ADMIN">Quản trị</option>
              </select>
            </div>
            <button onClick={genInvite} className="btn-primary" disabled={loading}>Tạo mã mời</button>
          </div>
          {code && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-xs text-gray-600 mb-1">Mã mời (hết hạn sau 7 ngày, dùng 1 lần):</p>
              <p className="text-2xl font-mono font-bold text-primary tracking-widest">{code}</p>
              <p className="text-xs text-gray-500 mt-2">Gửi mã này cho người được mời. Họ nhập khi đăng ký.</p>
            </div>
          )}
        </div>
      )}

      <div className="card !p-0">
        <ul className="divide-y">
          {items.map((m) => {
            const isSelf = m.id === currentMemberId;
            const isOwnerRow = m.role === "OWNER";
            const canEditThis = canManage && !isOwnerRow && !isSelf;
            // Quy tắc đổi mật khẩu:
            // - OWNER: được đổi cho mọi người trừ chính mình
            // - ADMIN: chỉ được đổi cho MEMBER (không đụng OWNER/ADMIN khác)
            const canResetPwd =
              !isSelf &&
              ((currentRole === "OWNER" && m.role !== "OWNER") ||
                (currentRole === "ADMIN" && m.role === "MEMBER"));
            return (
              <li key={m.id} className="p-4 flex flex-col gap-2 desktop:flex-row desktop:items-center desktop:justify-between">
                <div className="flex items-center gap-3">
                  <MemberAvatar member={m} />
                  <div>
                    <p className="font-medium">
                      {m.user.name} {isSelf && <span className="text-xs text-gray-400">(bạn)</span>}
                    </p>
                    <p className="text-xs text-gray-500">{m.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {canEditThis ? (
                    <select
                      className="input !py-1.5 !w-auto text-xs"
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value as "MEMBER" | "ADMIN")}
                    >
                      <option value="MEMBER">Thành viên</option>
                      <option value="ADMIN">Quản trị</option>
                    </select>
                  ) : (
                    <span className={`chip ${m.role === "OWNER" ? "bg-yellow-100 text-yellow-800" : m.role === "ADMIN" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"}`}>
                      {m.role}
                    </span>
                  )}
                  {canResetPwd && (
                    <button onClick={() => setPwdMember(m)} className="text-xs text-primary">
                      🔑 Đổi MK
                    </button>
                  )}
                  {canEditThis && (
                    <button onClick={() => remove(m.id)} className="text-xs text-danger">Xoá</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {pwdMember && (
        <ResetPasswordModal
          member={pwdMember}
          onClose={() => setPwdMember(null)}
          onSaved={() => setPwdMember(null)}
        />
      )}
    </div>
  );
}

function MemberAvatar({ member }: { member: Member }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-700 text-white font-bold flex items-center justify-center">
        {member.user.name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/members/${member.id}/avatar`}
      alt={member.user.name}
      className="w-10 h-10 rounded-full object-cover border border-rose-100"
      onError={() => setError(true)}
    />
  );
}

function ResetPasswordModal({
  member,
  onClose,
  onSaved,
}: {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Mật khẩu tối thiểu 6 ký tự");
    if (pwd !== confirm) return toast.error("Xác nhận mật khẩu không khớp");
    setLoading(true);
    const res = await fetch(`/api/members/${member.id}/password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newPassword: pwd }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Đặt lại thất bại");
      return;
    }
    toast.success(`Đã đặt lại mật khẩu cho ${member.user.name}`);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 shadow-xl"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Đặt lại mật khẩu</h2>
          <button type="button" onClick={onClose} className="text-gray-500">✕</button>
        </div>
        <p className="text-xs text-gray-600">
          Cho thành viên: <span className="font-medium text-gray-900">{member.user.name}</span>
        </p>
        <div>
          <label className="label">Mật khẩu mới</label>
          <input className="input" type="password" required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </div>
        <div>
          <label className="label">Xác nhận mật khẩu</label>
          <input className="input" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <p className="text-xs text-gray-500">
          Sau khi đặt lại, hãy thông báo mật khẩu mới cho thành viên qua kênh riêng tư.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Huỷ</button>
          <button className="btn-primary flex-1" disabled={loading}>
            {loading ? "Đang lưu..." : "Đặt lại"}
          </button>
        </div>
      </form>
    </div>
  );
}

