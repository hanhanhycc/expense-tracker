"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatVND, parseMoneyInput } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { useToast } from "@/components/toast";
import { MoneyInput } from "@/components/money-input";
import { fireConfetti } from "@/components/confetti";

type GoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED" | "SETTLED";
type GoalVisibility = "PERSONAL" | "SHARED";
type Goal = {
  id: string;
  name: string;
  description: string | null;
  status: GoalStatus;
  visibility: GoalVisibility;
  createdById: string;
  targetAmount: string;
  targetDate: string | null;
  createdAt?: string;
  settledAt?: string | null;
  settledTxId?: string | null;
  totalContributed: string;
  progress: number;
  members: { memberId: string; name: string }[];
};
type Contribution = { id: string; memberId: string; memberName: string; amount: string; note: string | null; date: string };
type GoalDetail = Omit<Goal, "members"> & {
  contributions: Contribution[];
  members: { memberId: string; name: string; contributed: number }[];
};
type Member = { id: string; role: "OWNER" | "ADMIN" | "MEMBER"; user: { id: string; name: string } };

const STATUS_LABEL: Record<GoalStatus, string> = {
  ACTIVE: "Đang chạy",
  COMPLETED: "Hoàn thành",
  ARCHIVED: "Lưu trữ",
  SETTLED: "💰 Đã tất toán",
};

/** Số ngày còn lại đến deadline (âm = đã quá hạn). null nếu không có deadline. */
function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Mức độ khẩn: ok | soon (≤30 ngày) | urgent (≤7 ngày) | overdue (<0). */
function deadlineUrgency(days: number | null): "none" | "ok" | "soon" | "urgent" | "overdue" {
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= 7) return "urgent";
  if (days <= 30) return "soon";
  return "ok";
}

function DeadlineBadge({ targetDate, completed }: { targetDate: string | null; completed?: boolean }) {
  if (!targetDate) return null;
  const days = daysUntil(targetDate);
  const u = deadlineUrgency(days);
  if (completed) {
    return <span className="chip bg-success/10 text-success text-[10px]">✓ Hoàn thành</span>;
  }
  const cls =
    u === "overdue"
      ? "bg-danger/10 text-danger animate-pulse"
      : u === "urgent"
      ? "bg-orange-100 text-orange-700 animate-pulse"
      : u === "soon"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-100 text-gray-600";
  const label =
    u === "overdue"
      ? `Quá hạn ${Math.abs(days!)} ngày`
      : days === 0
      ? "Hôm nay"
      : `Còn ${days} ngày`;
  return <span className={`chip text-[10px] ${cls}`}>⏰ {label}</span>;
}

export function SavingsClient({
  currentMemberId,
  currentRole,
}: {
  currentMemberId: string;
  currentRole: "OWNER" | "ADMIN" | "MEMBER";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("id");
  const setOpenId = (id: string | null) => {
    if (id) router.push(`/savings?id=${id}`);
    else router.push(`/savings`);
  };
  const [goals, setGoals] = useState<Goal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
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
  useEffect(() => {
    if (openId) loadDetail(openId);
    else setDetail(null);
  }, [openId]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Mục tiêu tiết kiệm</h1>
        <div className="flex gap-2 shrink-0">
          <a href="/api/export/savings" className="btn-ghost text-sm whitespace-nowrap">📤 Export</a>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm whitespace-nowrap">+ Tạo mới</button>
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
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
            {filtered.map((g) => (
              <li key={g.id} className="h-full">
                <button onClick={() => setOpenId(g.id)} className="w-full h-full text-left card hover:shadow-md transition">
                  <div className="flex items-start gap-4 h-full">
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
                      <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                        <DeadlineBadge targetDate={g.targetDate} completed={g.status === "COMPLETED" || g.progress >= 100} />
                        {g.status !== "ACTIVE" && (
                          <span className={`chip text-[10px] ${g.status === "SETTLED" ? "bg-success/10 text-success" : "bg-gray-100 text-gray-600"}`}>
                            {STATUS_LABEL[g.status]}
                          </span>
                        )}
                      </div>
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
  const [deadlinePreset, setDeadlinePreset] = useState<"NONE" | "3M" | "6M" | "9M" | "CUSTOM">("NONE");
  const [customDate, setCustomDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  function toggle(id: string) {
    setMemberIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function computeTargetDate(): string | null {
    if (deadlinePreset === "NONE") return null;
    if (deadlinePreset === "CUSTOM") return customDate || null;
    const months = deadlinePreset === "3M" ? 3 : deadlinePreset === "6M" ? 6 : 9;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const targetDate = computeTargetDate();
    if (deadlinePreset === "CUSTOM" && !targetDate) {
      setLoading(false);
      setError("Vui lòng chọn ngày hoàn thành");
      return;
    }
    const res = await fetch("/api/savings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        targetAmount: Number(parseMoneyInput(target).toString()),
        targetDate,
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

      <div>
        <label className="label">Thời gian hoàn thành</label>
        <div className="grid grid-cols-5 gap-2">
          {([
            { v: "NONE", label: "Không hạn" },
            { v: "3M", label: "3 tháng" },
            { v: "6M", label: "6 tháng" },
            { v: "9M", label: "9 tháng" },
            { v: "CUSTOM", label: "Tự chọn" },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setDeadlinePreset(opt.v)}
              className={`chip border text-xs ${deadlinePreset === opt.v ? "bg-primary text-white border-primary" : "bg-white"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {deadlinePreset === "CUSTOM" && (
          <input
            type="date"
            className="input mt-2"
            value={customDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setCustomDate(e.target.value)}
            required
          />
        )}
        {deadlinePreset !== "NONE" && deadlinePreset !== "CUSTOM" && (
          <p className="text-xs text-gray-500 mt-1">
            Hạn chót: {formatDate(computeTargetDate() ?? new Date().toISOString())}
          </p>
        )}
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
  const [hasDeadline, setHasDeadline] = useState<boolean>(!!goal.targetDate);
  const [targetDate, setTargetDate] = useState<string>(goal.targetDate ?? "");
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
        targetDate: hasDeadline ? targetDate || null : null,
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
        <label className="label flex items-center gap-2">
          <input type="checkbox" checked={hasDeadline} onChange={(e) => setHasDeadline(e.target.checked)} />
          Có hạn hoàn thành
        </label>
        {hasDeadline && (
          <input
            type="date"
            className="input mt-1"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            required
          />
        )}
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
  const [showSettle, setShowSettle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editCid, setEditCid] = useState<string | null>(null);
  const toast = useToast();

  const isSettled = goal.status === "SETTLED";

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
                  {!isSettled && (
                    <button onClick={() => setShowEdit(true)} className="text-xs bg-white/80 rounded-full px-2 py-1">✏️</button>
                  )}
                  <button onClick={deleteGoal} className="text-xs bg-white/80 rounded-full px-2 py-1 text-danger">🗑</button>
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-4 flex items-center justify-center" style={{ height: 260 }}>
            <BigGoalRing
              percent={goal.progress}
              size={240}
              stroke={20}
              urgent={
                goal.status === "ACTIVE" &&
                goal.progress < 100 &&
                ["urgent", "overdue"].includes(deadlineUrgency(daysUntil(goal.targetDate)))
              }
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-5xl">🐷</span>
            </div>
          </div>
          {(() => {
            const remain = Number(goal.targetAmount) - Number(goal.totalContributed);
            if (remain <= 0) return null;
            return (
              <div className="mt-3 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary text-white px-4 py-2 shadow-lg">
                  <span className="text-[10px] uppercase tracking-wider opacity-90">Còn lại</span>
                  <span className="text-sm font-extrabold tabular-nums whitespace-nowrap">
                    {formatVND(remain)}
                  </span>
                </div>
              </div>
            );
          })()}

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

          {goal.targetDate && (() => {
            const days = daysUntil(goal.targetDate)!;
            const u = deadlineUrgency(days);
            const completed = goal.status === "COMPLETED" || goal.progress >= 100;
            // Time progress: % thời gian đã trôi qua từ lúc tạo → deadline
            let timePct = 0;
            if (goal.createdAt) {
              const start = new Date(goal.createdAt).getTime();
              const end = new Date(goal.targetDate + "T00:00:00").getTime();
              const now = Date.now();
              if (end > start) timePct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
            }
            const barColor = completed
              ? "bg-success"
              : u === "overdue" || u === "urgent"
              ? "bg-danger"
              : u === "soon"
              ? "bg-amber-500"
              : "bg-primary";
            const label = completed
              ? "✅ Đã hoàn thành mục tiêu"
              : u === "overdue"
              ? `⚠️ Đã quá hạn ${Math.abs(days)} ngày`
              : days === 0
              ? "⏰ Hôm nay là hạn chót!"
              : `⏰ Còn ${days} ngày đến hạn`;
            return (
              <div className={`mt-3 mx-2 rounded-2xl bg-white/70 border border-white/80 p-3 ${(u === "urgent" || u === "overdue") && !completed ? "animate-pulse" : ""}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900">{label}</span>
                  <span className="text-gray-600">{formatDate(goal.targetDate)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white overflow-hidden">
                  <div
                    className={`h-full transition-all ${barColor}`}
                    style={{ width: `${timePct.toFixed(1)}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-gray-600">
                  <span>Thời gian đã trôi qua: {timePct.toFixed(0)}%</span>
                  <span>Tiến độ tiền: {goal.progress.toFixed(0)}%</span>
                </div>
              </div>
            );
          })()}

          {goal.description && <p className="text-xs text-gray-700/80 mt-2 text-center">{goal.description}</p>}
          {goal.status !== "ACTIVE" && (
            <div className="mt-2 text-center">
              <span className={`chip text-[10px] ${isSettled ? "bg-success/15 text-success font-bold" : "bg-white/80 text-gray-700"}`}>
                {STATUS_LABEL[goal.status]}
              </span>
            </div>
          )}
          {canManageGoal && !isSettled && Number(goal.totalContributed) > 0 && !showSettle && (
            <button
              onClick={() => setShowSettle(true)}
              className="mt-4 w-full rounded-2xl bg-white/90 border border-white py-3 text-sm font-extrabold text-primary shadow-lg hover:bg-white transition"
            >
              💰 Tất toán sổ tiết kiệm
            </button>
          )}
        </div>
      )}

      {showSettle && !isSettled && (
        <SettleForm
          goal={goal}
          onClose={() => setShowSettle(false)}
          onSettled={() => { setShowSettle(false); onChanged(); }}
        />
      )}

      {isSettled && (
        <div className="card border-success/30 bg-success/5">
          <p className="text-sm font-bold text-success">
            💰 Đã tất toán{goal.settledAt ? ` ngày ${formatDate(goal.settledAt)}` : ""}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {formatVND(goal.totalContributed)} đã được ghi có vào thu nhập trên dashboard.
          </p>
          {goal.settledTxId && (
            <a href={`/history?txId=${goal.settledTxId}`} className="text-xs text-primary font-medium mt-1 inline-block">
              Xem giao dịch ghi có →
            </a>
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
        {isSettled ? (
          <p className="text-sm text-gray-500">Mục tiêu đã tất toán — không thể thêm đóng góp.</p>
        ) : !canContribute ? (
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
                      <span className={`font-medium ${Number(c.amount) < 0 ? "text-danger" : "text-success"}`}>
                        {Number(c.amount) < 0 ? "" : "+"}{formatVND(c.amount)}
                      </span>
                      {canManageContribution(c) && !isSettled && Number(c.amount) >= 0 && (
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


/**
 * Form tất toán: nhập số tiền rút của từng thành viên (mặc định = toàn bộ phần đã góp).
 * Rút toàn bộ → khoá sổ; rút 1 phần → sổ tiếp tục, phần còn lại trừ tương ứng.
 */
function SettleForm({ goal, onClose, onSettled }: { goal: GoalDetail; onClose: () => void; onSettled: () => void }) {
  // Gộp phần còn lại theo member từ lịch sử đóng góp (kể cả dòng âm do đã rút 1 phần).
  const rows = (() => {
    const map = new Map<string, { memberId: string; name: string; contributed: number }>();
    for (const c of goal.contributions) {
      const cur = map.get(c.memberId) ?? { memberId: c.memberId, name: c.memberName, contributed: 0 };
      cur.contributed += Number(c.amount);
      map.set(c.memberId, cur);
    }
    return Array.from(map.values()).filter((m) => m.contributed > 0);
  })();
  const [amounts, setAmounts] = useState<Record<string, string>>(
    () => Object.fromEntries(rows.map((m) => [m.memberId, String(Math.round(m.contributed))]))
  );
  const [settling, setSettling] = useState(false);
  const toast = useToast();

  const totalAvail = rows.reduce((s, m) => s + Math.round(m.contributed), 0);
  const totalSel = rows.reduce((s, m) => s + Number(amounts[m.memberId] || 0), 0);
  const overRow = rows.find((m) => Number(amounts[m.memberId] || 0) > Math.round(m.contributed));
  const isFull = totalSel === totalAvail;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (overRow || totalSel <= 0) return;
    const msg = isFull
      ? `Tất toán toàn bộ ${formatVND(totalSel)}?\n\nSổ sẽ được khoá lại (không thêm/sửa đóng góp được nữa).`
      : `Tất toán 1 phần ${formatVND(totalSel)}?\n\nSổ vẫn tiếp tục hoạt động, phần đã góp của từng người sẽ trừ tương ứng.`;
    if (!confirm(msg)) return;
    setSettling(true);
    const res = await fetch(`/api/savings/${goal.id}/settle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        withdrawals: rows
          .filter((m) => Number(amounts[m.memberId] || 0) > 0)
          .map((m) => ({ memberId: m.memberId, amount: Number(amounts[m.memberId]) })),
      }),
    });
    setSettling(false);
    if (!res.ok) {
      toast.error((await res.json()).error || "Tất toán thất bại");
      return;
    }
    if (isFull) fireConfetti(2500);
    toast.success(`💰 Đã tất toán ${formatVND(totalSel)} — ghi có vào thu nhập`);
    onSettled();
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">💰 Tất toán sổ tiết kiệm</h2>
        <button type="button" onClick={onClose} className="text-xs text-gray-500">Đóng</button>
      </div>
      <p className="text-xs text-gray-500">
        Nhập số tiền rút của từng thành viên. Mặc định là rút toàn bộ — sửa lại nếu chỉ muốn tất toán 1 phần.
      </p>
      <ul className="space-y-2">
        {rows.map((m) => {
          const over = Number(amounts[m.memberId] || 0) > Math.round(m.contributed);
          return (
            <li key={m.memberId}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{m.name}</span>
                <span className="text-gray-500">Đã góp {formatVND(m.contributed)}</span>
              </div>
              <div className="flex gap-2">
                <MoneyInput
                  className={`input !py-1.5 flex-1 ${over ? "!border-danger" : ""}`}
                  value={amounts[m.memberId] || ""}
                  onValueChange={(v) => setAmounts((a) => ({ ...a, [m.memberId]: v }))}
                  placeholder="0 ₫"
                />
                <button
                  type="button"
                  onClick={() => setAmounts((a) => ({ ...a, [m.memberId]: String(Math.round(m.contributed)) }))}
                  className="text-xs text-primary font-medium shrink-0"
                >
                  Tối đa
                </button>
              </div>
              {over && <p className="text-[11px] text-danger mt-1">Vượt quá phần đã góp</p>}
            </li>
          );
        })}
      </ul>
      <div className="rounded-xl bg-gray-50 border p-3 text-sm flex items-center justify-between">
        <span className="text-gray-600">Tổng ghi có</span>
        <span className="font-bold">{formatVND(totalSel)}</span>
      </div>
      <p className="text-xs text-gray-500">
        {isFull
          ? "Rút toàn bộ — sổ sẽ được khoá sau khi tất toán."
          : "Rút 1 phần — sổ vẫn tiếp tục hoạt động với phần còn lại."}
      </p>
      <button className="btn-primary w-full" disabled={settling || totalSel <= 0 || !!overRow}>
        {settling ? "Đang tất toán..." : `Tất toán ${formatVND(totalSel)}`}
      </button>
    </form>
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

function BigGoalRing({ percent, size = 240, stroke = 20, urgent = false }: { percent: number; size?: number; stroke?: number; urgent?: boolean }) {
  const p = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      className={`-rotate-90 drop-shadow-sm ${urgent ? "animate-pulse" : ""}`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.55)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#ffffff" strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${dash} ${c - dash}`} />
    </svg>
  );
}
