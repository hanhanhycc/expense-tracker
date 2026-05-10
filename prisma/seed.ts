import { PrismaClient, CategoryKind, Role, TxType, Visibility, SplitType, GoalStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Ăn uống", icon: "🍜", color: "#f59e0b" },
  { name: "Nhà cửa", icon: "🏠", color: "#0ea5e9" },
  { name: "Đi lại", icon: "🚗", color: "#6366f1" },
  { name: "Con cái", icon: "👶", color: "#ec4899" },
  { name: "Sức khoẻ", icon: "💊", color: "#10b981" },
  { name: "Mua sắm", icon: "🛍️", color: "#8b5cf6" },
  { name: "Giải trí", icon: "🎬", color: "#f43f5e" },
  { name: "Gia đình / Họ hàng", icon: "👪", color: "#14b8a6" },
  { name: "Học tập", icon: "📚", color: "#3b82f6" },
  { name: "Khác", icon: "📦", color: "#6b7280" },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Lương", icon: "💼", color: "#16a34a" },
  { name: "Thưởng", icon: "🎁", color: "#22c55e" },
  { name: "Kinh doanh", icon: "🏪", color: "#0891b2" },
  { name: "Hoàn tiền", icon: "↩️", color: "#84cc16" },
  { name: "Khác", icon: "💰", color: "#6b7280" },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Wipe demo data nếu seed lại (chỉ user demo)
  await prisma.user.deleteMany({ where: { email: { in: ["owner@demo.local", "member@demo.local"] } } });

  const passwordHash = await bcrypt.hash("demo1234", 12);

  // Tạo family demo
  const family = await prisma.family.create({
    data: { name: "Gia đình Demo" },
  });

  // Seed default categories
  await prisma.category.createMany({
    data: [
      ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, kind: CategoryKind.EXPENSE, isDefault: true, familyId: family.id })),
      ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, kind: CategoryKind.INCOME, isDefault: true, familyId: family.id })),
    ],
  });

  // Tạo 2 users + members
  const owner = await prisma.user.create({
    data: { email: "owner@demo.local", name: "Bố An", passwordHash },
  });
  const member = await prisma.user.create({
    data: { email: "member@demo.local", name: "Mẹ Bình", passwordHash },
  });

  const ownerMember = await prisma.familyMember.create({
    data: { userId: owner.id, familyId: family.id, role: Role.OWNER },
  });
  const memberMember = await prisma.familyMember.create({
    data: { userId: member.id, familyId: family.id, role: Role.MEMBER },
  });

  // Lấy categories
  const cats = await prisma.category.findMany({ where: { familyId: family.id } });
  const catByName = (n: string) => cats.find((c) => c.name === n)!;

  // Seed transactions mẫu (30 giao dịch trong tháng hiện tại)
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const txs = [
    // Thu
    { d: 1, amt: 25_000_000, type: TxType.INCOME, cat: "Lương", note: "Lương tháng", paid: ownerMember.id, vis: Visibility.PERSONAL, by: ownerMember.id },
    { d: 5, amt: 18_000_000, type: TxType.INCOME, cat: "Lương", note: "Lương tháng", paid: memberMember.id, vis: Visibility.PERSONAL, by: memberMember.id },
    // Chi cá nhân
    { d: 2, amt: 150_000, type: TxType.EXPENSE, cat: "Ăn uống", note: "Cà phê sáng", paid: ownerMember.id, vis: Visibility.PERSONAL, by: ownerMember.id },
    { d: 3, amt: 250_000, type: TxType.EXPENSE, cat: "Mua sắm", note: "Áo thun", paid: memberMember.id, vis: Visibility.PERSONAL, by: memberMember.id },
    // Chi chung
    { d: 4, amt: 1_200_000, type: TxType.EXPENSE, cat: "Ăn uống", note: "Đi ăn nhà hàng", paid: ownerMember.id, vis: Visibility.SHARED, by: ownerMember.id, share: [ownerMember.id, memberMember.id] },
    { d: 6, amt: 5_000_000, type: TxType.EXPENSE, cat: "Nhà cửa", note: "Tiền điện nước", paid: memberMember.id, vis: Visibility.SHARED, by: memberMember.id, share: [ownerMember.id, memberMember.id] },
    { d: 7, amt: 800_000, type: TxType.EXPENSE, cat: "Con cái", note: "Sách cho bé", paid: ownerMember.id, vis: Visibility.SHARED, by: ownerMember.id, share: [ownerMember.id, memberMember.id] },
    { d: 8, amt: 350_000, type: TxType.EXPENSE, cat: "Đi lại", note: "Đổ xăng", paid: ownerMember.id, vis: Visibility.PERSONAL, by: ownerMember.id },
    { d: 9, amt: 2_500_000, type: TxType.EXPENSE, cat: "Mua sắm", note: "Đồ siêu thị tuần", paid: memberMember.id, vis: Visibility.SHARED, by: memberMember.id, share: [ownerMember.id, memberMember.id] },
    { d: 10, amt: 450_000, type: TxType.EXPENSE, cat: "Giải trí", note: "Xem phim", paid: ownerMember.id, vis: Visibility.SHARED, by: ownerMember.id, share: [ownerMember.id, memberMember.id] },
    { d: 12, amt: 200_000, type: TxType.EXPENSE, cat: "Sức khoẻ", note: "Thuốc cảm", paid: memberMember.id, vis: Visibility.PERSONAL, by: memberMember.id },
    { d: 14, amt: 3_000_000, type: TxType.EXPENSE, cat: "Học tập", note: "Học phí bé", paid: ownerMember.id, vis: Visibility.SHARED, by: ownerMember.id, share: [ownerMember.id, memberMember.id] },
    { d: 15, amt: 1_500_000, type: TxType.EXPENSE, cat: "Gia đình / Họ hàng", note: "Quà mừng cưới", paid: memberMember.id, vis: Visibility.SHARED, by: memberMember.id, share: [ownerMember.id, memberMember.id] },
  ];

  for (const t of txs) {
    const date = new Date(startOfMonth);
    date.setDate(t.d);
    if (date > today) continue;

    const cat = catByName(t.cat);
    const splitType: SplitType = t.share ? SplitType.EQUAL : SplitType.NONE;

    const created = await prisma.transaction.create({
      data: {
        familyId: family.id,
        amount: t.amt,
        type: t.type,
        categoryId: cat.id,
        note: t.note,
        date,
        createdById: t.by,
        paidById: t.paid,
        visibility: t.vis,
        splitType,
      },
    });

    if (t.share) {
      const per = Math.floor(t.amt / t.share.length);
      const remainder = t.amt - per * t.share.length;
      await prisma.transactionShare.createMany({
        data: t.share.map((mid, i) => ({
          transactionId: created.id,
          memberId: mid,
          amount: i === 0 ? per + remainder : per,
        })),
      });
    }
  }

  // Saving goal demo
  const goal = await prisma.savingGoal.create({
    data: {
      familyId: family.id,
      name: "Du lịch gia đình",
      description: "Đi Đà Lạt cuối năm",
      targetAmount: 20_000_000,
      status: GoalStatus.ACTIVE,
      createdById: ownerMember.id,
      members: {
        create: [
          { memberId: ownerMember.id },
          { memberId: memberMember.id },
        ],
      },
    },
  });

  await prisma.savingContribution.createMany({
    data: [
      { savingGoalId: goal.id, memberId: ownerMember.id, amount: 2_000_000, note: "Góp tháng đầu", date: new Date(today.getFullYear(), today.getMonth(), 5) },
      { savingGoalId: goal.id, memberId: memberMember.id, amount: 1_500_000, note: "Góp tháng đầu", date: new Date(today.getFullYear(), today.getMonth(), 6) },
    ],
  });

  console.log("✅ Seed xong!");
  console.log("   owner@demo.local / demo1234");
  console.log("   member@demo.local / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
