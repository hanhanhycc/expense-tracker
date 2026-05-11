"use client";

import { useEffect, useState } from "react";
import { formatVND, parseMoneyInput } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { useToast } from "@/components/toast";
import { MoneyInput } from "@/components/money-input";
import { fireConfetti } from "@/components/confetti";

type GoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
type GoalVisibility = "PERSONAL" | "SHARED";
type Goal = {
  id: string;
  name: string;
  description: string | null;
  status: GoalStatus;
  visibility: GoalVisibility;
  createdById: string;
  targetAmount: string;
  totalContributed: string;
  progress: number;
  members: { memberId: string; name: string }[];
};
type Contribution = { id: string; memberId: string; memberName: string; amount: string; note: string | null; date: string };
type GoalDetail = Goal & {
  contributions: Contribution[];
  members: { memberId: string; name: string; contributed: number }[];
};
type Member = { id: string; role: "OWNER" | "ADMIN" | "MEMBER"; user: { id: string; name: string } };

export function SavingsClient({
  currentMemberId,
  currentRole,
}: {
  currentMemberId: string;
  currentRole: "OWNER" | "ADMIN" | "MEMBER";
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GoalDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"ALL" | "SHARED" | "PERSONAL">("ALL");

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
    return (
      <GoalDetailView
        goal={detail}
        members={members}
        currentMemberId={currentMemberId}
        currentRole={currentRole}
        onBack={() => { setOpenId(null); setDetail(null); loadGoals(); }}
        onChanged={() => loadDetail(openId)}
        onDeleted={() => { setOpenId(null); setDetail(null); loadGoals(); }}
      />
    );
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

      <div className="flex gap-2">
        {([
          { v: "ALL", label: "Tất cả" },
          { v: "SHARED", label: "🤝 Chung" },
          { v: "PERSONAL", label: "🔒 Cá nhân" },
        ] as const).map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`chip border ${tab === t.v ? "bg-primary text-white border-primary" : "bg-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showCreate && (
        <CreateGoalForm
          members={members}
          currentMemberId={currentMemberId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadGoals(); }}
        />
      )}

      {(() => {
        const filtered = tab === "ALL" ? goals : goals.filter((g) => g.visibility === tab);
        if (filtered.length === 0) {
          return (
            <div className="card text-center py-10 text-gray-500">
              <p className="text-4xl mb-2">🎯</p>
              <p>Chưa có mục tiêu nào.</p>
            </div>
          );
        }
        return (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((g) => (
              <li key={g.id}>
                <button onClick={() => setOpenId(g.id)} className="w-full text-left card hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                    <DonutProgress percent={g.progress} size={84} stroke={10} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">
                        <span className="mr-1">{g.visibility === "PERSONAL" ? "🔒" : "🤝"}</span>
                        {g.name}
                      </p>
                      {g.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{g.description}</p>}
                      <p className="text-sm mt-2">
                        <span className="font-bold text-gray-900">{formatVND(g.totalContributed)}</span>
                        <span className="text-gray-400"> / {formatVND(g.targetAmount)}</span>
                      </p>
                      {g.status !== "ACTIVE" && (
                        <span className="mt-1 inline-block chip bg-gray-100 text-gray-600 text-[10px]">{g.status}</span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        );
      })()}
    </div>
  );
}

function CreateGoalForm({
  members,
  currentMemberId,
  onClose,
  onCreated,
}: {
  members: Member[];
  currentMemberId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [visibility, setVisibility] = useState<GoalVisibility>("SHARED");
  const [memberIds, setMemberIds] = useState<string[]>(members.map((m) => m.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

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
        visibility,
        memberIds: visibility === "PERSONAL" ? [currentMemberId] : memberIds,
      }),
    });
    setLoading(false);
    if (!res.ok) { const msg = (await res.json()).error || "Lỗi"; setError(msg); toast.error(msg); return; }
    toast.success("Đã tạo mục tiêu");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Tạo mục tiêu mới</h2>
        <button type="button" onClick={onClose} className="text-gray-500">✕</button>
      </div>

      <div>
        <label className="label">Loại mục tiêu</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setVisibility("SHARED")}
            className={`btn ${visibility === "SHARED" ? "bg-primary text-white" : "bg-gray-100 text-gray-700"}`}
          >
            🤝 Chung
          </button>
          <button
            type="button"
            onClick={() => setVisibility("PERSONAL")}
            className={`btn ${visibility === "PERSONAL" ? "bg-primary text-white" : "bg-gray-100 text-gray-700"}`}
          >
            🔒 Cá nhân
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {visibility === "PERSONAL"
            ? "Chỉ bạn thấy và đóng góp được."
            : "Cả gia đình thấy. Chỉ thành viên được chia mới đóng góp được."}
        </p>
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
        <MoneyInput className="input" required value={target} onValueChange={setTarget} placeholder="0 ₫" />
      </div>

      {visibility === "SHARED" && (
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
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full" disabled={loading || (visibility === "SHARED" && memberIds.length === 0)}>
        {loading ? "Đang tạo..." : "Tạo mục tiêu"}
      </button>
    </form>
  );
}

function EditGoalForm({
  goal,
  onClose,
  onSaved,
}: {
  goal: GoalDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(goal.name);
  const [description, setDescription] = useState(goal.description ?? "");
  const [target, setTarget] = useState(String(Math.round(Number(goal.targetAmount))));
  const [status, setStatus] = useState<GoalStatus>(goal.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch(`/api/savings/${goal.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        targetAmount: Number(parseMoneyInput(target).toString()),
        status,
      }),
    });
    setLoading(false);
    if (!res.ok) { const msg = (await res.json()).error || "Lỗi"; setError(msg); toast.error(msg); return; }
    toast.success("Đã cập nhật mục tiêu");
    onSaved();
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Sửa mục tiêu</h2>
        <button type="button" onClick={onClose} className="text-gray-500">✕</button>
      </div>
      <div>
        <label className="label">Tên mục tiêu</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Mô tả</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="label">Số tiền mục tiêu</label>
        <MoneyInput className="input" required value={target} onValueChange={setTarget} placeholder="0 ₫" />
      </div>
      <div>
        <label className="label">Trạng thái</label>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)}>
          <option value="ACTIVE">Đang chạy</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="ARCHIVED">Lưu trữ</option>
        </select>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Đang lưu..." : "Lưu thay đổi"}</button>
    </form>
  );
}

function EditContributionRow({
  goalId,
  contribution,
  onSaved,
  onCancel,
}: {
  goalId: string;
  contribution: Contribution;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(Math.round(Number(contribution.amount))));
  const [note, setNote] = useState(contribution.note ?? "");
  const [date, setDate] = useState(contribution.date.slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function save() {
    setLoading(true); setError(null);
    const res = await fetch(`/api/savings/${goalId}/contributions/${contribution.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amount: Number(parseMoneyInput(amount).toString()),
        note: note || null,
        date,
      }),
    });
    setLoading(false);
    if (!res.ok) { const msg = (await res.json()).error || "Lỗi"; setError(msg); toast.error(msg); return; }
    toast.success("Đã cập nhật đóng góp");
    onSaved();
  }

  return (
    <div className="py-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <MoneyInput className="input !py-1.5" value={amount} onValueChange={setAmount} placeholder="0 ₫" />
        <input type="date" className="input !py-1.5" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <input className="input !py-1.5" placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={loading} className="btn-primary !py-1.5 !px-3 text-xs">{loading ? "..." : "Lưu"}</button>
        <button onClick={onCancel} className="btn-ghost !py-1.5 !px-3 text-xs">Huỷ</button>
      </div>
    </div>
  );
}

function GoalDetailView({
  goal,
  members,
  currentMemberId,
  currentRole,
  onBack,
  onChanged,
  onDeleted,
}: {
  goal: GoalDetail;
  members: Member[];
  currentMemberId: string;
  currentRole: "OWNER" | "ADMIN" | "MEMBER";
  onBack: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memberId, setMemberId] = useState(currentMemberId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editCid, setEditCid] = useState<string | null>(null);
  const toast = useToast();

  const canManageGoal =
    currentRole === "OWNER" || currentRole === "ADMIN" || currentMemberId === goal.createdById;

  // Quyền đóng góp:
  // - PERSONAL: chỉ chủ goal
  // - SHARED: phải là member được chia
  const sharedMemberIds = new Set(goal.members.map((m) => m.memberId));
  const canContribute =
    goal.visibility === "PERSONAL"
      ? currentMemberId === goal.createdById
      : sharedMemberIds.has(currentMemberId);

  // Danh sách người được phép chọn ở dropdown "Người góp"
  const contributableMembers =
    goal.visibility === "PERSONAL"
      ? members.filter((m) => m.id === currentMemberId)
      : members.filter((m) => sharedMemberIds.has(m.id));

  function canManageContribution(c: Contribution) {
    if (goal.visibility === "PERSONAL") {
      return currentMemberId === goal.createdById;
    }
    return (
      currentRole === "OWNER" ||
      currentRole === "ADMIN" ||
      currentMemberId === c.memberId ||
      currentMemberId === goal.createdById
    );
  }

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
    if (!res.ok) { const msg = (await res.json()).error || "Lỗi"; setError(msg); toast.error(msg); return; }
    toast.success("Đã thêm đóng góp");
    // Pháo hoa khi đóng góp này khiến mục tiêu hoàn thành
    const before = Number(goal.totalContributed);
    const target = Number(goal.targetAmount);
    const after = before + Number(parseMoneyInput(amount).toString());
    if (target > 0 && before < target && after >= target) {
      fireConfetti(3500);
      toast.success(`🎉 Hoàn thành mục tiêu "${goal.name}"!`);
    }
    setAmount(""); setNote("");
    onChanged();
  }

  async function deleteGoal() {
    if (!confirm(`Xoá mục tiêu "${goal.name}"? Các đóng góp sẽ giữ lại nhưng mục tiêu bị ẩn.`)) return;
    const res = await fetch(`/api/savings/${goal.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error((await res.json()).error || "Xoá thất bại");
      return;
    }
    toast.success("Đã xoá mục tiêu");
    onDeleted();
  }

  async function deleteContribution(c: Contribution) {
    if (!confirm(`Xoá đóng góp ${formatVND(c.amount)} của ${c.memberName}?`)) return;
    const res = await fetch(`/api/savings/${goal.id}/contributions/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error((await res.json()).error || "Xoá thất bại");
      return;
    }
    toast.success("Đã xoá đóng góp");
    onChanged();
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-primary">← Quay lại</button>

      {showEdit ? (
        <EditGoalForm
          goal={goal}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onChanged(); }}
        />
      ) : (
        <div className="rounded-3xl p-6 border border-rose-200 shadow-[0_12px_40px_rgba(231,72,128,0.18)] relative overflow-hidden"
             style={{ background: "linear-gradient(135deg,#FFD9E5 0%,#FFC2D4 100%)" }}>
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 truncate">{goal.name}</h1>
              <p className="text-xs text-gray-700/70 mt-1">
                {goal.visibility === "PERSONAL" ? "🔒 Cá nhân" : "🤝 Chung gia đình"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-full bg-white/70 border border-white text-xs font-bold text-gray-900">
                {formatVND(goal.targetAmount)}
              </span>
              {canManageGoal && (
                <div className="flex flex-col gap-1">
                  <button onClick={() => setShowEdit(true)} className="text-xs bg-white/80 rounded-full px-2 py-1">✏️</button>
                  <button onClick={deleteGoal} className="text-xs bg-white/80 rounded-full px-2 py-1 text-danger">🗑</button>
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-4 flex items-center justify-center" style={{ height: 260 }}>
            <BigGoalRing percent={goal.progress} size={240} stroke={20} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-5xl">🐷</span>
            </div>
            {(() => {
              const remain = Number(goal.targetAmount) - Number(goal.totalContributed);
              if (remain <= 0) return null;
              return (
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 max-w-[45%] rounded-2xl bg-primary text-white px-3 py-2 shadow-lg text-center">
                  <p className="text-[10px] uppercase tracking-wider opacity-90 leading-none">Còn lại</p>
                  <p className="text-sm font-extrabold mt-1 tabular-nums leading-none whitespace-nowrap">
                    {formatVND(remain)}
                  </p>
                </div>
              );
            })()}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-extrabold text-gray-900">{goal.progress.toFixed(0)}%</span>
              <span className="text-gray-700">Đã tiết kiệm</span>
            </div>
            <div className="flex-1 h-px bg-white/70 mx-2" />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-extrabold text-gray-900">{(100 - goal.progress).toFixed(0)}%</span>
              <span className="text-gray-700">Còn lại</span>
            </div>
          </div>

          <div className="mt-3 text-center text-xs text-gray-700">
            <span className="font-semibold text-gray-900">{formatVND(goal.totalContributed)}</span>
            <span className="text-gray-600"> / {formatVND(goal.targetAmount)}</span>
          </div>

          {goal.description && <p className="text-xs text-gray-700/80 mt-2 text-center">{goal.description}</p>}
          {goal.status !== "ACTIVE" && (
            <div className="mt-2 text-center">
              <span className="chip bg-white/80 text-gray-700 text-[10px]">{goal.status}</span>
            </div>
          )}
        </div>
      )}

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
        {!canContribute ? (
          <p className="text-sm text-gray-500">
            Bạn không nằm trong danh sách thành viên được chia mục tiêu này nên không thể đóng góp.
          </p>
        ) : (
          <>
            <div>
              <label className="label">Số tiền</label>
              <MoneyInput className="input" required value={amount} onValueChange={setAmount} placeholder="0 ₫" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Ngày</label>
                <input type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Người góp</label>
                <select
                  className="input"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  disabled={goal.visibility === "PERSONAL"}
                >
                  {contributableMembers.map((m) => <option key={m.id} value={m.id}>{m.user.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Ghi chú</label>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>{loading ? "Đang lưu..." : "Đóng góp"}</button>
          </>
        )}
      </form>

      <div className="card">
        <h2 className="font-semibold mb-3">Lịch sử đóng góp</h2>
        {goal.contributions.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có đóng góp nào.</p>
        ) : (
          <ul className="divide-y">
            {goal.contributions.map((c) => (
              <li key={c.id} className="py-2">
                {editCid === c.id ? (
                  <EditContributionRow
                    goalId={goal.id}
                    contribution={c}
                    onSaved={() => { setEditCid(null); onChanged(); }}
                    onCancel={() => setEditCid(null)}
                  />
                ) : (
                  <div className="flex justify-between items-center text-sm gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{c.memberName}</p>
                      <p className="text-xs text-gray-500">{formatDate(c.date)}{c.note ? ` · ${c.note}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium text-success">+{formatVND(c.amount)}</span>
                      {canManageContribution(c) && (
                        <>
                          <button onClick={() => setEditCid(c.id)} className="text-xs text-primary">Sửa</button>
                          <button onClick={() => deleteContribution(c)} className="text-xs text-danger">Xoá</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


function DonutProgress({ percent, size = 84, stroke = 10, showLabel = true }: { percent: number; size?: number; stroke?: number; showLabel?: boolean }) {
  const p = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;
  const gradId = `grad-${size}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F783A8" />
            <stop offset="100%" stopColor="#E64980" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#FFE4EC" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-extrabold text-primary-700" style={{ fontSize: size * 0.22 }}>{p.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}

function BigGoalRing({ percent, size = 240, stroke = 20 }: { percent: number; size?: number; stroke?: number }) {
  const p = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90 drop-shadow-sm">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.55)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#ffffff" strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${dash} ${c - dash}`} />
    </svg>
  );
}
