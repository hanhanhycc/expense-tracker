"use client";

import { useEffect, useState } from "react";

type Role = "OWNER" | "ADMIN" | "MEMBER";
type Member = { id: string; role: Role; user: { id: string; name: string; email: string } };

export function MembersClient({ canManage, currentMemberId }: { canManage: boolean; currentMemberId: string }) {
  const [items, setItems] = useState<Member[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/members");
    setItems((await r.json()).items || []);
  }
  useEffect(() => { load(); }, []);

  async function genInvite() {
    setLoading(true);
    setErr(null);
    const r = await fetch("/api/invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });
    setLoading(false);
    if (r.ok) {
      const d = await r.json();
      setCode(d.code);
    } else {
      const d = await r.json().catch(() => ({}));
      setErr(d.error || "Không tạo được mã mời");
    }
  }

  async function changeRole(id: string, newRole: "MEMBER" | "ADMIN") {
    setErr(null);
    const r = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.error || "Đổi vai trò thất bại");
      return;
    }
    load();
  }

  async function remove(id: string) {
    if (!confirm("Xoá thành viên này?")) return;
    setErr(null);
    const r = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.error || "Xoá thất bại");
      return;
    }
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

      {err && <p className="text-sm text-danger">{err}</p>}

      <div className="card !p-0">
        <ul className="divide-y">
          {items.map((m) => {
            const isSelf = m.id === currentMemberId;
            const isOwnerRow = m.role === "OWNER";
            const canEditThis = canManage && !isOwnerRow && !isSelf;
            return (
              <li key={m.id} className="p-4 flex flex-col gap-2 desktop:flex-row desktop:items-center desktop:justify-between">
                <div>
                  <p className="font-medium">
                    {m.user.name} {isSelf && <span className="text-xs text-gray-400">(bạn)</span>}
                  </p>
                  <p className="text-xs text-gray-500">{m.user.email}</p>
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
                  {canEditThis && (
                    <button onClick={() => remove(m.id)} className="text-xs text-danger">Xoá</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

