import { z } from "zod";

// month: "YYYY-MM"
export const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Tháng phải có định dạng YYYY-MM");

export const budgetScopeSchema = z.enum(["PERSONAL", "SHARED"]);
export type BudgetScopeInput = z.infer<typeof budgetScopeSchema>;

export const budgetUpsertSchema = z.object({
  categoryId: z.string().min(1),
  month: monthSchema,
  amount: z.coerce.number().nonnegative(),
  scope: budgetScopeSchema,
});
export type BudgetUpsertInput = z.infer<typeof budgetUpsertSchema>;
