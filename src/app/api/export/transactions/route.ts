import { auth } from "@/lib/auth";
import { listTransactions } from "@/features/transactions/server/service";
import { transactionFilterSchema } from "@/features/transactions/schema";
import { toCSV } from "@/lib/csv";
import { formatDate } from "@/lib/date";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.familyId) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const parsed = transactionFilterSchema.safeParse(Object.fromEntries(url.searchParams));
  const filter = parsed.success ? parsed.data : {};
  const items = await listTransactions(session.user.familyId, session.user.memberId, filter);

  const headers = ["Ngày", "Loại", "Số tiền", "Danh mục", "Người trả", "Người tạo", "Hiển thị", "Cách chia", "Ghi chú", "Người chia"];
  const rows = items.map((t) => [
    formatDate(t.date),
    t.type === "INCOME" ? "Thu" : "Chi",
    t.amount.toString(),
    t.category.name,
    t.paidBy.user.name,
    t.createdBy.user.name,
    t.visibility === "SHARED" ? "Chung" : "Cá nhân",
    t.splitType,
    t.note ?? "",
    t.shares.map((s) => `${s.member.user.name}:${s.amount.toString()}`).join("; "),
  ]);

  const csv = toCSV(headers, rows);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
