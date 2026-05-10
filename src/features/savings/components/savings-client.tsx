"use client";

import { useEffect, useState } from "react";
import { formatVND, parseMoneyInput, formatNumber } from "@/lib/money";
import { formatDate } from "@/lib/date";

type Goal = {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  targetAmount: string;
  totalContributed: string;
  progress: number;
  members: { memberId: string; name: string }[];
};
type GoalDetail = Goal & {
  contributions: { id: string; memberId: string; memberName: string; amount: string; note: string | null; date: string }[];
  members: { memberId: string; name: string; contributed: number }[];
};
type Member = { id: string; user: { id: string; name: string } };

export function SavingsClient({ currentMemberId }: { currentMemberId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GoalDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function loadGoals() {
    const r = await fetch("/api/savings");
    setGoals((await r.json()).items || []);
  }
  async function loadDetail(id: string) {
    const r = await fetch(`/api/savings/${id}`);
    setDetail(await r.json());
  }
  useEffect(() => {
    loadGoals();
    fetch("/api/members").then((r) => r.json()).then((d) => setMembers(d.items || []));
  }, []);
  useEffect(() => { if (openId) loadDetail(openId); }, [openId]);

  if (openId && detail) {
    return <GoalDetailView goal={detail} members={members} currentMemberId={currentMemberId} onBack={() => { setOpenId(null); setDetail(null); loadGoals(); }} onChanged={() => loadDetail(openId)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mục tiêu tiết kiệm</h1>
        <div className="flex gap-2">
          <a href="/api/export/savings" className="btn-ghost text-sm">📤 Export</a>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">+ Tạo mới</button>
        </div>
      </div>

      {showCreate && <CreateGoalForm members={members} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadGoals(); }} />}

      {goals.length === 0 ? (
        <div className="card text-center py-10 text-gray-500">
          <p className="text-4xl mb-2">🎯</p>
          <p>Chưa có mục tiêu nào.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => (
            <li key={g.id}>
              <button onClick={() => setOpenId(g.id)} className="w-full text-left card hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">🎯 {g.name}</p>
                    {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                  </div>
                  <span className="chip bg-primary/10 text-primary">{g.progress.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-primary" style={{ width: `${g.progress}%` }} />
                </div>
                <p className="text-xs text-gray-600">
                  <span className="font-medium">{formatVND(g.totalContributed)}</span> / {formatVND(g.targetAmount)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateGoalForm({ members, onClose, onCreated }: { members: Member[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>(members.map((m) => m.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setMemberIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch("/api/savings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        targetAmount: Number(parseMoneyInput(target).toString()),
        memberIds,
      }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error || "Lỗi"); return; }
    onCreated();
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Tạo mục tiêu mới</h2>
        <button type="button" onClick={onClose} className="text-gray-500">✕</button>
      </div>
      <div>
        <label className="label">Tên mục tiêu</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Vd: Du lịch hè" />
      </div>
      <div>
        <label className="label">Mô tả</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="label">Số tiền mục tiêu</label>
        <input className="input" required inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))} />
        {target && <p className="text-xs text-gray-500 mt-1">{formatNumber(target)} ₫</p>}
      </div>
      <div>
        <label className="label">Thành viên tham gia</label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button key={m.id} type="button" onClick={() => toggle(m.id)} className={`chip border ${memberIds.includes(m.id) ? "bg-primary text-white border-primary" : "bg-white"}`}>
              {m.user.name}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full" disabled={loading || memberIds.length === 0}>
        {loading ? "Đang tạo..." : "Tạo mục tiêu"}
      </button>
    </form>
  );
}

function GoalDetailView({ goal, members, currentMemberId, onBack, onChanged }: {
  goal: GoalDetail; members: Member[]; currentMemberId: string; onBack: () => void; onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memberId, setMemberId] = useState(currentMemberId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch(`/api/savings/${goal.id}/contributions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amount: Number(parseMoneyInput(amount).toString()),
        note: note || null,
        date,
        memberId,
      }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error || "Lỗi"); return; }
    setAmount(""); setNote("");
    onChanged();
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-primary">← Quay lại</button>
      <div className="card">
        <h1 className="text-xl font-bold">🎯 {goal.name}</h1>
        {goal.description && <p className="text-sm text-gray-500 mt-1">{goal.description}</p>}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{formatVND(goal.totalContributed)} / {formatVND(goal.targetAmount)}</span>
            <span>{goal.progress.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${goal.progress}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Còn lại: {formatVND(Number(goal.targetAmount) - Number(goal.totalContributed))}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Đóng góp theo thành viên</h2>
        <ul className="space-y-2">
          {goal.members.map((m) => (
            <li key={m.memberId} className="flex justify-between text-sm">
              <span>{m.name}</span>
              <span className="font-medium">{formatVND(m.contributed)}</span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={submit} className="card space-y-3">
        <h2 className="font-semibold">Thêm đóng góp</h2>
        <div>
          <label className="label">Số tiền</label>
          <input className="input" required inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ngày</label>
            <input type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Người góp</label>
            <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {members.map((m) => <option key={m.id} value={m.id}>{m.user.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Ghi chú</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Đang lưu..." : "Đóng góp"}</button>
      </form>

      <div className="card">
        <h2 className="font-semibold mb-3">Lịch sử đóng góp</h2>
        {goal.contributions.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có đóng góp nào.</p>
        ) : (
          <ul className="divide-y">
            {goal.contributions.map((c) => (
              <li key={c.id} className="py-2 flex justify-between text-sm">
                <div>
                  <p className="font-medium">{c.memberName}</p>
                  <p className="text-xs text-gray-500">{formatDate(c.date)}{c.note ? ` · ${c.note}` : ""}</p>
                </div>
                <span className="font-medium text-success">+{formatVND(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
