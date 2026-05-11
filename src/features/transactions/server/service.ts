import { prisma } from "@/lib/db";
import { splitEqual, sumMoney, toDecimal, validateSplitCustom } from "@/lib/money";
import { Prisma, SplitType, Visibility } from "@prisma/client";
import { deleteReceipt } from "@/lib/upload";
import type { TransactionInput, TransactionFilter } from "./schema";

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

  return prisma.transaction.findMany({
    where,
    include: {
      category: true,
      paidBy: { include: { user: true } },
      createdBy: { include: { user: true } },
      shares: { include: { member: { include: { user: true } } } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
}

export async function createTransaction(familyId: string, createdById: string, input: TransactionInput) {
  const { sharedMemberIds, customShares, splitType, visibility, amount } = input;
  const data: Prisma.TransactionCreateInput = {
    family: { connect: { id: familyId } },
    amount: new Prisma.Decimal(amount),
    type: input.type,
    category: { connect: { id: input.categoryId } },
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
      const parts = splitEqual(amount, sharedMemberIds.length);
      sharesCreate = sharedMemberIds.map((mid, i) => ({
        memberId: mid,
        amount: new Prisma.Decimal(parts[i].toString()),
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

  return prisma.transaction.create({
    data: {
      ...data,
      shares: sharesCreate.length ? { createMany: { data: sharesCreate } } : undefined,
    },
  });
}

export async function updateTransaction(familyId: string, memberId: string, id: string, input: TransactionInput) {
  const existing = await prisma.transaction.findFirst({ where: { id, familyId, deletedAt: null } });
  if (!existing) throw new Error("Không tìm thấy giao dịch");
  if (existing.createdById !== memberId) throw new Error("Chỉ người tạo mới được sửa giao dịch này");

  await prisma.transactionShare.deleteMany({ where: { transactionId: id } });

  let sharesCreate: Prisma.TransactionShareCreateManyTransactionInput[] = [];
  if (input.visibility === "SHARED" && input.sharedMemberIds.length > 0) {
    if (input.splitType === SplitType.EQUAL) {
      const parts = splitEqual(input.amount, input.sharedMemberIds.length);
      sharesCreate = input.sharedMemberIds.map((mid, i) => ({ memberId: mid, amount: new Prisma.Decimal(parts[i].toString()) }));
    } else if (input.splitType === SplitType.CUSTOM) {
      if (!validateSplitCustom(input.amount, input.customShares.map((c) => c.amount))) {
        throw new Error("Tổng các phần chia phải bằng số tiền giao dịch");
      }
      sharesCreate = input.customShares.map((c) => ({ memberId: c.memberId, amount: new Prisma.Decimal(c.amount) }));
    } else {
      sharesCreate = input.sharedMemberIds.map((mid) => ({ memberId: mid, amount: new Prisma.Decimal(0) }));
    }
  }

  return prisma.transaction.update({
    where: { id },
    data: {
      amount: new Prisma.Decimal(input.amount),
      type: input.type,
      categoryId: input.categoryId,
      note: input.note ?? null,
      date: new Date(input.date),
      paidById: input.paidById,
      visibility: input.visibility,
      splitType: input.splitType,
      shares: sharesCreate.length ? { createMany: { data: sharesCreate } } : undefined,
    },
  });
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
    select: { amount: true, type: true, visibility: true, categoryId: true, category: { select: { name: true, icon: true, color: true } } },
  });
  const income = sumMoney(txs.filter((t) => t.type === "INCOME").map((t) => t.amount.toString()));
  const expense = sumMoney(txs.filter((t) => t.type === "EXPENSE").map((t) => t.amount.toString()));
  const personalExpense = sumMoney(txs.filter((t) => t.type === "EXPENSE" && t.visibility === "PERSONAL").map((t) => t.amount.toString()));
  const sharedExpense = sumMoney(txs.filter((t) => t.type === "EXPENSE" && t.visibility === "SHARED").map((t) => t.amount.toString()));

  // top categories chi
  const map = new Map<string, { name: string; color: string | null; total: ReturnType<typeof toDecimal> }>();
  for (const t of txs) {
    if (t.type !== "EXPENSE") continue;
    const cur = map.get(t.categoryId) ?? { name: t.category.name, color: t.category.color, total: toDecimal(0) };
    cur.total = cur.total.plus(t.amount.toString());
    map.set(t.categoryId, cur);
  }
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
