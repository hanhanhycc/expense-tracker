"use client";

import { useEffect, useState } from "react";

type Member = { id: string; role: "OWNER" | "ADMIN" | "MEMBER"; user: { id: string; name: string; email: string } };

export function MembersClient({ canManage, currentMemberId }: { canManage: boolean; currentMemberId: string }) {
  const [items, setItems] = useState<Member[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [loading, setLoading] = useState(false);

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
    }
  }

  async function remove(id: string) {
    if (!confirm("Xoá thành viên này?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
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
          {items.map((m) => (
            <li key={m.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{m.user.name} {m.id === currentMemberId && <span className="text-xs text-gray-400">(bạn)</span>}</p>
                <p className="text-xs text-gray-500">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`chip ${m.role === "OWNER" ? "bg-yellow-100 text-yellow-800" : m.role === "ADMIN" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"}`}>
                  {m.role}
                </span>
                {canManage && m.role !== "OWNER" && m.id !== currentMemberId && (
                  <button onClick={() => remove(m.id)} className="text-xs text-danger">Xoá</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
