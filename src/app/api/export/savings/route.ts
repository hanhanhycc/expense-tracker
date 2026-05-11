import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCSV } from "@/lib/csv";
import { formatDate } from "@/lib/date";
import { Visibility } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.familyId) return new Response("Unauthorized", { status: 401 });

  const items = await prisma.savingContribution.findMany({
    where: {
      savingGoal: {
        familyId: session.user.familyId,
        deletedAt: null,
        OR: [
          { visibility: Visibility.SHARED },
          { visibility: Visibility.PERSONAL, createdById: session.user.memberId },
        ],
      },
    },
    include: { savingGoal: true, member: { include: { user: true } } },
    orderBy: { date: "desc" },
  });

  const headers = ["Ngày", "Mục tiêu", "Thành viên", "Số tiền", "Ghi chú"];
  const rows = items.map((c) => [
    formatDate(c.date),
    c.savingGoal.name,
    c.member.user.name,
    c.amount.toString(),
    c.note ?? "",
  ]);

  const csv = toCSV(headers, rows);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="savings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
