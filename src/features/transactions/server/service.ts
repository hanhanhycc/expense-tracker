import { prisma } from "@/lib/db";
import { splitEqualForPayer, sumMoney, toDecimal, validateSplitCustom } from "@/lib/money";
import { Prisma, SplitType, Visibility } from "@prisma/client";
import { deleteReceipt } from "@/lib/upload";
import { notifyShareRecipients } from "@/lib/notify";
import type { TransactionInput, TransactionFilter } from "./schema";

async function getActorSnapshot(memberId: string): Promise<{ memberId: string; name: string } | null> {
  const m = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!m) return null;
  return { memberId: m.id, name: m.user.name };
}

/**
 * Visibility scope cho 1 thành viên:
 * - PERSONAL: chỉ người tạo thấy
 * - SHARED: người tạo + người trả + các member trong `shares` thấy
 */
export function memberScopeFilter(memberId: string): Prisma.TransactionWhereInput {
  return {
    OR: [
      { createdById: memberId },
      { paidById: memberId },
      { shares: { some: { memberId } } },
    ],
  };
}

export async function listTransactions(familyId: string, memberId: string, filter: TransactionFilter = {}) {
  const where: Prisma.TransactionWhereInput = {
    familyId,
    deletedAt: null,
    AND: [memberScopeFilter(memberId)],
  };
  if (filter.categoryId) where.categoryId = filter.categoryId;
  if (filter.accountId) where.accountId = filter.accountId;
  if (filter.from || filter.to) {
    where.date = {};
    if (filter.from) (where.date as Prisma.DateTimeFilter).gte = new Date(filter.from);
    if (filter.to) (where.date as Prisma.DateTimeFilter).lte = new Date(filter.to);
  }
  if (filter.memberId) {
    // Filter thêm theo member (paid/created/share). Vẫn nằm trong scope của session member.
    (where.AND as Prisma.TransactionWhereInput[]).push({
      OR: [
        { paidById: filter.memberId },
        { createdById: filter.memberId },
        { shares: { some: { memberId: filter.memberId } } },
      ],
    });
  }
  if (filter.visibility && filter.visibility !== "ALL") {
    where.visibility = filter.visibility as Visibility;
  }
  if (filter.q) {
    where.note = { contains: filter.q, mode: "insensitive" };
  }

  const limit = filter.limit ?? 50;
  const page = filter.page ?? 1;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
        paidBy: { include: { user: true } },
        createdBy: { include: { user: true } },
        shares: { include: { member: { include: { user: true } } } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);
  return { items, total, page, limit, hasMore: skip + items.length < total };
}

export async function createTransaction(familyId: string, createdById: string, input: TransactionInput) {
  const { sharedMemberIds, customShares, splitType, visibility, amount, paidById, accountId } = input;
  const data: Prisma.TransactionCreateInput = {
    family: { connect: { id: familyId } },
    amount: new Prisma.Decimal(amount),
    type: input.type,
    category: { connect: { id: input.categoryId } },
    account: accountId ? { connect: { id: accountId } } : undefined,
    note: input.note ?? null,
    date: new Date(input.date),
    createdBy: { connect: { id: createdById } },
    paidBy: { connect: { id: input.paidById } },
    visibility,
    splitType,
  };

  let sharesCreate: Prisma.TransactionShareCreateManyTransactionInput[] = [];
  if (visibility === "SHARED" && sharedMemberIds.length > 0) {
    if (splitType === SplitType.EQUAL) {
      sharesCreate = splitEqualForPayer(amount, paidById, sharedMemberIds).map((s) => ({
        memberId: s.memberId,
        amount: new Prisma.Decimal(s.amount),
      }));
    } else if (splitType === SplitType.CUSTOM) {
      if (!validateSplitCustom(amount, customShares.map((c) => c.amount))) {
        throw new Error("Tổng các phần chia phải bằng số tiền giao dịch");
      }
      sharesCreate = customShares.map((c) => ({
        memberId: c.memberId,
        amount: new Prisma.Decimal(c.amount),
      }));
    } else {
      // NONE -> mark mọi member trong shared list, share = 0 (chỉ visibility)
      sharesCreate = sharedMemberIds.map((mid) => ({
        memberId: mid,
        amount: new Prisma.Decimal(0),
      }));
    }
  }

  const created = await prisma.transaction.create({
    data: {
      ...data,
      shares: sharesCreate.length ? { createMany: { data: sharesCreate } } : undefined,
    },
  });

  if (visibility === "SHARED" && sharesCreate.length > 0) {
    const actor = await getActorSnapshot(createdById);
    if (actor) {
      await notifyShareRecipients({
        familyId,
        actor,
        tx: { id: created.id, amount: created.amount.toString(), note: created.note, date: created.date, type: created.type },
        shares: sharesCreate.map((s) => ({ memberId: s.memberId, amount: s.amount.toString() })),
        notifType: "TRANSACTION_SHARED",
      });
    }
  }

  return created;
}

export async function updateTransaction(familyId: string, memberId: string, id: string, input: TransactionInput) {
  const existing = await prisma.transaction.findFirst({
    where: { id, familyId, deletedAt: null },
    include: { shares: { select: { memberId: true, amount: true } } },
  });
  if (!existing) throw new Error("Không tìm thấy giao dịch");
  if (existing.createdById !== memberId) throw new Error("Chỉ người tạo mới được sửa giao dịch này");

  await prisma.transactionShare.deleteMany({ where: { transactionId: id } });

  let sharesCreate: Prisma.TransactionShareCreateManyTransactionInput[] = [];
  if (input.visibility === "SHARED" && input.sharedMemberIds.length > 0) {
    if (input.splitType === SplitType.EQUAL) {
      sharesCreate = splitEqualForPayer(input.amount, input.paidById, input.sharedMemberIds).map((s) => ({
        memberId: s.memberId,
        amount: new Prisma.Decimal(s.amount),
      }));
    } else if (input.splitType === SplitType.CUSTOM) {
      if (!validateSplitCustom(input.amount, input.customShares.map((c) => c.amount))) {
        throw new Error("Tổng các phần chia phải bằng số tiền giao dịch");
      }
      sharesCreate = input.customShares.map((c) => ({ memberId: c.memberId, amount: new Prisma.Decimal(c.amount) }));
    } else {
      sharesCreate = input.sharedMemberIds.map((mid) => ({ memberId: mid, amount: new Prisma.Decimal(0) }));
    }
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      amount: new Prisma.Decimal(input.amount),
      type: input.type,
      categoryId: input.categoryId,
      accountId: input.accountId || null,
      note: input.note ?? null,
      date: new Date(input.date),
      paidById: input.paidById,
      visibility: input.visibility,
      splitType: input.splitType,
      shares: sharesCreate.length ? { createMany: { data: sharesCreate } } : undefined,
    },
  });

  // Thông báo cho member mới được thêm vào share; khi share cũ đổi số tiền cũng notify.
  if (input.visibility === "SHARED" && sharesCreate.length > 0) {
    const oldMap = new Map(existing.shares.map((s) => [s.memberId, s.amount.toString()]));
    const newOrChanged = sharesCreate.filter((s) => {
      const prev = oldMap.get(s.memberId);
      if (prev == null) return true; // member mới
      return prev !== s.amount.toString(); // share đổi số tiền
    });
    if (newOrChanged.length > 0) {
      const actor = await getActorSnapshot(memberId);
      if (actor) {
        await notifyShareRecipients({
          familyId,
          actor,
          tx: { id: updated.id, amount: updated.amount.toString(), note: updated.note, date: updated.date, type: updated.type },
          shares: newOrChanged.map((s) => ({ memberId: s.memberId, amount: s.amount.toString() })),
          notifType: "TRANSACTION_SHARE_UPDATED",
        });
      }
    }
  }

  return updated;
}

export async function softDeleteTransaction(familyId: string, memberId: string, id: string) {
  const tx = await prisma.transaction.findFirst({ where: { id, familyId, deletedAt: null }, select: { receiptPath: true, createdById: true } });
  if (!tx) throw new Error("Không tìm thấy giao dịch");
  if (tx.createdById !== memberId) throw new Error("Chỉ người tạo mới được xoá giao dịch này");
  if (tx.receiptPath) {
    try { await deleteReceipt(tx.receiptPath); } catch { /* ignore */ }
  }
  await prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date(), receiptPath: null },
  });
}

export async function monthSummary(familyId: string, memberId: string, from: Date, to: Date) {
  const txs = await prisma.transaction.findMany({
    where: {
      familyId,
      deletedAt: null,
      date: { gte: from, lte: to },
      AND: [memberScopeFilter(memberId)],
    },
    select: {
      amount: true,
      type: true,
      visibility: true,
      categoryId: true,
      createdById: true,
      paidById: true,
      shares: { select: { memberId: true, amount: true } },
      category: { select: { name: true, icon: true, color: true } },
    },
  });

  /**
   * Phần thuộc về `memberId` trong giao dịch:
   * - PERSONAL: full amount nếu là người tạo, ngược lại 0.
   * - SHARED: số tiền trong shares của member (0 nếu không có).
   * Tránh tình huống ai trả ai chia đều bị log full amount.
   */
  function memberPart(t: (typeof txs)[number]): string {
    if (t.visibility === "PERSONAL") {
      return t.createdById === memberId ? t.amount.toString() : "0";
    }
    const s = t.shares.find((x) => x.memberId === memberId);
    if (s) return s.amount.toString();
    if (t.paidById === memberId) {
      const totalShared = t.shares.reduce((acc, x) => acc.plus(x.amount.toString()), toDecimal(0));
      const residual = toDecimal(t.amount.toString()).minus(totalShared);
      return residual.greaterThan(0) ? residual.toString() : "0";
    }
    return "0";
  }

  const incomeParts: string[] = [];
  const expenseParts: string[] = [];
  const personalExpenseParts: string[] = [];
  const sharedExpenseParts: string[] = [];
  const map = new Map<string, { name: string; color: string | null; total: ReturnType<typeof toDecimal> }>();

  for (const t of txs) {
    const part = memberPart(t);
    if (part === "0") continue;
    if (t.type === "INCOME") {
      incomeParts.push(part);
    } else {
      expenseParts.push(part);
      if (t.visibility === "PERSONAL") personalExpenseParts.push(part);
      else sharedExpenseParts.push(part);
      const cur = map.get(t.categoryId) ?? { name: t.category.name, color: t.category.color, total: toDecimal(0) };
      cur.total = cur.total.plus(part);
      map.set(t.categoryId, cur);
    }
  }

  const income = sumMoney(incomeParts);
  const expense = sumMoney(expenseParts);
  const personalExpense = sumMoney(personalExpenseParts);
  const sharedExpense = sumMoney(sharedExpenseParts);

  const topCategories = Array.from(map.entries())
    .map(([id, v]) => ({ id, name: v.name, color: v.color, total: v.total.toString() }))
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5);

  return {
    income: income.toString(),
    expense: expense.toString(),
    personalExpense: personalExpense.toString(),
    sharedExpense: sharedExpense.toString(),
    balance: income.minus(expense).toString(),
    topCategories,
  };
}
