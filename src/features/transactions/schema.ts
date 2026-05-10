import { z } from "zod";

export const transactionInputSchema = z
  .object({
    id: z.string().optional(),
    amount: z.coerce.number().positive("Số tiền phải > 0"),
    type: z.enum(["INCOME", "EXPENSE"]),
    categoryId: z.string().min(1, "Chọn danh mục"),
    note: z.string().max(500).optional().nullable(),
    date: z.string().min(1, "Chọn ngày"),
    paidById: z.string().min(1),
    visibility: z.enum(["PERSONAL", "SHARED"]).default("PERSONAL"),
    splitType: z.enum(["NONE", "EQUAL", "CUSTOM"]).default("NONE"),
    sharedMemberIds: z.array(z.string()).default([]),
    customShares: z.array(z.object({ memberId: z.string(), amount: z.coerce.number().nonnegative() })).default([]),
  })
  .refine(
    (d) => d.visibility === "PERSONAL" || d.sharedMemberIds.length > 0,
    { message: "Chia sẻ cần chọn ≥ 1 thành viên", path: ["sharedMemberIds"] },
  );

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const transactionFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.string().optional(),
  memberId: z.string().optional(),
  visibility: z.enum(["PERSONAL", "SHARED", "ALL"]).optional(),
  q: z.string().optional(),
});
export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
