import { CategoryKind, type PrismaClient } from "@prisma/client";

export type CatNode = {
  name: string;
  icon: string;
  color?: string;
  children?: { name: string; icon: string }[];
};

export const DEFAULT_EXPENSE_TREE: CatNode[] = [
  {
    name: "Ăn uống", icon: "🍽️", color: "#f59e0b",
    children: [
      { name: "Đi chợ/siêu thị", icon: "🛒" },
      { name: "Ăn tiệm", icon: "🍴" },
      { name: "Cafe", icon: "☕" },
      { name: "Ăn sáng", icon: "🍩" },
      { name: "Ăn trưa", icon: "🍜" },
      { name: "Ăn tối", icon: "🥘" },
    ],
  },
  {
    name: "Dịch vụ sinh hoạt", icon: "🏡", color: "#0ea5e9",
    children: [
      { name: "Điện", icon: "⚡" },
      { name: "Nước", icon: "💧" },
      { name: "Internet", icon: "📶" },
      { name: "Gas", icon: "🔥" },
      { name: "Truyền hình", icon: "📺" },
      { name: "Điện thoại di động", icon: "📱" },
      { name: "Điện thoại cố định", icon: "📞" },
      { name: "Người giúp việc", icon: "🧹" },
    ],
  },
  {
    name: "Đi lại", icon: "📍", color: "#6366f1",
    children: [
      { name: "Xăng xe", icon: "⛽" },
      { name: "Bảo hiểm xe", icon: "🛡️" },
      { name: "Sửa xe", icon: "🔧" },
      { name: "Gửi xe", icon: "🅿️" },
      { name: "Rửa xe", icon: "🚿" },
      { name: "Taxi/thuê xe", icon: "🚕" },
    ],
  },
  {
    name: "Con cái", icon: "👶", color: "#ec4899",
    children: [
      { name: "Học phí", icon: "🎓" },
      { name: "Trông trẻ", icon: "📚" },
      { name: "Sữa", icon: "🥛" },
      { name: "Đồ chơi", icon: "🧸" },
      { name: "Tiền tiêu vặt", icon: "💰" },
    ],
  },
  {
    name: "Trang phục", icon: "👔", color: "#3b82f6",
    children: [
      { name: "Quần áo", icon: "👕" },
      { name: "Giày dép", icon: "👟" },
      { name: "Phụ kiện khác", icon: "👜" },
    ],
  },
  {
    name: "Hiếu hỉ", icon: "🕯️", color: "#14b8a6",
    children: [
      { name: "Cưới xin", icon: "💍" },
      { name: "Ma chay", icon: "🪷" },
      { name: "Thăm hỏi", icon: "🤒" },
      { name: "Biếu tặng", icon: "🎁" },
    ],
  },
  {
    name: "Sức khoẻ", icon: "❤️", color: "#10b981",
    children: [
      { name: "Khám chữa bệnh", icon: "🩺" },
      { name: "Thuốc men", icon: "💊" },
      { name: "Thể thao", icon: "⚽" },
    ],
  },
  {
    name: "Nhà cửa", icon: "🏠", color: "#0ea5e9",
    children: [
      { name: "Mua sắm đồ đạc", icon: "🛋️" },
      { name: "Thế chấp", icon: "🏘️" },
      { name: "Thuê nhà", icon: "🔑" },
    ],
  },
  {
    name: "Hưởng thụ", icon: "🌴", color: "#f43f5e",
    children: [
      { name: "Vui chơi giải trí", icon: "🎵" },
      { name: "Du lịch", icon: "🗺️" },
      { name: "Làm đẹp", icon: "💆" },
      { name: "Phim ảnh ca nhạc", icon: "🎬" },
      { name: "Mỹ phẩm", icon: "💄" },
    ],
  },
  {
    name: "Phát triển bản thân", icon: "🎓", color: "#8b5cf6",
    children: [
      { name: "Học hành", icon: "📝" },
      { name: "Giao lưu, quan hệ", icon: "🤝" },
    ],
  },
  {
    name: "Ngân hàng", icon: "🏦", color: "#475569",
    children: [
      { name: "Phí chuyển khoản", icon: "💱" },
      { name: "Phí thẻ", icon: "💳" },
    ],
  },
  {
    name: "Khác", icon: "📦", color: "#6b7280",
    children: [],
  },
];

export const DEFAULT_INCOME_TREE: CatNode[] = [
  {
    name: "Thu nhập", icon: "💰", color: "#16a34a",
    children: [
      { name: "Lương", icon: "💼" },
      { name: "Thưởng", icon: "🎁" },
      { name: "Kinh doanh", icon: "🏪" },
      { name: "Đầu tư", icon: "📈" },
      { name: "Hoàn tiền", icon: "↩️" },
      { name: "Khác", icon: "💵" },
    ],
  },
];

/**
 * Seed danh mục mặc định cho family — idempotent.
 * Skip nếu name + parentId + kind đã tồn tại.
 */
export async function seedDefaultCategoriesForFamily(
  client: PrismaClient,
  familyId: string,
): Promise<void> {
  for (const tree of [
    { kind: CategoryKind.EXPENSE, list: DEFAULT_EXPENSE_TREE },
    { kind: CategoryKind.INCOME, list: DEFAULT_INCOME_TREE },
  ]) {
    let sortOrder = 0;
    for (const group of tree.list) {
      const existingParent = await client.category.findFirst({
        where: { familyId, kind: tree.kind, name: group.name, parentId: null },
      });
      let parentId: string;
      if (existingParent) {
        parentId = existingParent.id;
      } else {
        const created = await client.category.create({
          data: {
            familyId,
            kind: tree.kind,
            name: group.name,
            icon: group.icon,
            color: group.color,
            isDefault: true,
            isEnabled: true,
            sortOrder: sortOrder++,
            parentId: null,
          },
        });
        parentId = created.id;
      }

      let childSort = 0;
      for (const child of group.children ?? []) {
        const exists = await client.category.findFirst({
          where: { familyId, kind: tree.kind, name: child.name, parentId },
        });
        if (exists) continue;
        await client.category.create({
          data: {
            familyId,
            kind: tree.kind,
            name: child.name,
            icon: child.icon,
            color: group.color,
            isDefault: true,
            isEnabled: true,
            sortOrder: childSort++,
            parentId,
          },
        });
      }
    }
  }
}
