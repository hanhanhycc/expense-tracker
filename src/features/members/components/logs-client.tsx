"use client";

import { useEffect, useState } from "react";

type LogItem = {
  id: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
};

const ENTITY_LABEL: Record<string, string> = {
  saving_goal: "Mục tiêu",
  contribution: "Đóng góp",
  member: "Thành viên",
  invite: "Mã mời",
  family: "Gia đình",
  profile: "Hồ sơ",
};

const ACTION_STYLE: Record<string, string> = {
  CREATE: "bg-success/10 text-success",
  UPDATE: "bg-primary/10 text-primary",
  DELETE: "bg-danger/10 text-danger",
  INVITE: "bg-yellow-100 text-yellow-800",
  ROLE_CHANGE: "bg-purple-100 text-purple-800",
};

const ENTITY_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "saving_goal", label: "Mục tiêu" },
  { value: "contribution", label: "Đóng góp" },
  { value: "member", label: "Thành viên" },
  { value: "invite", label: "Mã mời" },
  { value: "family", label: "Gia đình" },
  { value: "profile", label: "Hồ sơ" },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LogsClient() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [entity, setEntity] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function load(reset = false) {
    setLoading(true);
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    if (!reset && cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/logs?${params.toString()}`);
    const data = await res.json();
    setItems((cur) => (reset ? data.items : [...cur, ...data.items]));
    setCursor(data.nextCursor);
    setDone(!data.nextCursor);
    setLoading(false);
  }

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setDone(false);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setEntity(f.value)}
            className={`chip border ${entity === f.value ? "bg-primary text-white border-primary" : "bg-white"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 && !loading ? (
        <div className="card text-center py-10 text-gray-500">
          <p className="text-4xl mb-2">📝</p>
          <p>Chưa có hoạt động nào.</p>
        </div>
      ) : (
        <ul className="card !p-0 divide-y">
          {items.map((it) => (
            <li key={it.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{it.actorName}</span>{" "}
                    <span className="text-gray-700">— {it.summary}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatDateTime(it.createdAt)}</p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <span className={`chip ${ACTION_STYLE[it.action] || "bg-gray-100 text-gray-700"}`}>
                    {it.action}
                  </span>
                  <span className="text-[10px] text-gray-400">{ENTITY_LABEL[it.entity] || it.entity}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!done && items.length > 0 && (
        <button
          onClick={() => load(false)}
          disabled={loading}
          className="btn-ghost w-full text-sm"
        >
          {loading ? "Đang tải..." : "Tải thêm"}
        </button>
      )}
    </div>
  );
}
