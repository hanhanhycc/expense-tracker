/**
 * Scan transactions để tìm dữ liệu không nhất quán có thể làm dashboard tính sai:
 *
 *  1) PERSONAL nhưng vẫn còn shares (rác sót lại khi đổi SHARED → PERSONAL ở phiên bản cũ).
 *  2) SHARED nhưng KHÔNG có shares (form lỗi).
 *  3) SHARED có share row với memberId = paidById (khiến memberPart trả 0 cho payer thay vì residual).
 *  4) SHARED có sum(shares) > amount (over-split).
 *
 * Chạy:  npm run scan:tx          (dry-run, chỉ in)
 *        npm run scan:tx -- --fix (xoá rác + đặt PERSONAL nếu SHARED không có member khác payer)
 */
import { prisma } from "../src/lib/db";
import { Prisma } from "@prisma/client";

const FIX = process.argv.includes("--fix");

async function main() {
  const all = await prisma.transaction.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      familyId: true,
      amount: true,
      visibility: true,
      splitType: true,
      paidById: true,
      createdById: true,
      note: true,
      date: true,
      shares: { select: { id: true, memberId: true, amount: true } },
    },
  });

  const personalWithShares: typeof all = [];
  const sharedWithoutShares: typeof all = [];
  const sharedWithPayerShare: typeof all = [];
  const sharedOverSplit: typeof all = [];

  for (const t of all) {
    if (t.visibility === "PERSONAL" && t.shares.length > 0) {
      personalWithShares.push(t);
    }
    if (t.visibility === "SHARED") {
      if (t.shares.length === 0) {
        sharedWithoutShares.push(t);
      }
      if (t.shares.some((s) => s.memberId === t.paidById)) {
        sharedWithPayerShare.push(t);
      }
      const sum = t.shares.reduce((acc, s) => acc.plus(s.amount), new Prisma.Decimal(0));
      if (sum.greaterThan(t.amount)) {
        sharedOverSplit.push(t);
      }
    }
  }

  console.log(`Tổng giao dịch (chưa xoá): ${all.length}`);
  console.log(`(1) PERSONAL có shares sót:           ${personalWithShares.length}`);
  console.log(`(2) SHARED không có shares:           ${sharedWithoutShares.length}`);
  console.log(`(3) SHARED có share row của payer:    ${sharedWithPayerShare.length}`);
  console.log(`(4) SHARED bị over-split (sum>amount):${sharedOverSplit.length}`);

  function printList(label: string, list: typeof all) {
    if (list.length === 0) return;
    console.log(`\n── ${label} ──`);
    for (const t of list) {
      console.log(
        `  ${t.id}  amount=${t.amount.toString()}  paidBy=${t.paidById}  vis=${t.visibility}  split=${t.splitType}  shares=${t.shares
          .map((s) => `${s.memberId}=${s.amount.toString()}`)
          .join(",")}`,
      );
    }
  }

  printList("PERSONAL có shares", personalWithShares);
  printList("SHARED không shares", sharedWithoutShares);
  printList("SHARED có payer share", sharedWithPayerShare);
  printList("SHARED over-split", sharedOverSplit);

  if (!FIX) {
    console.log(`\nDry-run. Thêm "-- --fix" để áp dụng sửa.`);
    return;
  }

  console.log(`\n▶︎ Bắt đầu fix...`);

  // (1) PERSONAL có shares → xoá shares (giao dịch là cá nhân thì không có chia).
  if (personalWithShares.length > 0) {
    const ids = personalWithShares.map((t) => t.id);
    const r = await prisma.transactionShare.deleteMany({ where: { transactionId: { in: ids } } });
    console.log(`(1) Xoá ${r.count} share row khỏi ${ids.length} giao dịch PERSONAL.`);
  }

  // (3) SHARED có payer share (amount=0 hoặc bất kỳ) → xoá row của payer.
  //     Vì payer giữ residual = amount - sum(non-payer shares), không cần row riêng.
  for (const t of sharedWithPayerShare) {
    const r = await prisma.transactionShare.deleteMany({
      where: { transactionId: t.id, memberId: t.paidById },
    });
    console.log(`(3) ${t.id}: xoá ${r.count} payer share row.`);
  }

  // (2) SHARED không có shares → không có ai khác share thật sự → coi như PERSONAL.
  for (const t of sharedWithoutShares) {
    await prisma.transaction.update({
      where: { id: t.id },
      data: { visibility: "PERSONAL", splitType: "NONE" },
    });
    console.log(`(2) ${t.id}: chuyển về PERSONAL/NONE (không có member nào share).`);
  }

  // (4) Over-split: cảnh báo, không tự fix vì không biết ý người dùng.
  if (sharedOverSplit.length > 0) {
    console.log(
      `(4) ⚠️  ${sharedOverSplit.length} giao dịch bị over-split — cần sửa thủ công trong app (số chia > số tiền).`,
    );
  }

  console.log(`\n✓ Hoàn tất.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
