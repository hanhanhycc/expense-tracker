import { format, parseISO } from "date-fns";

export const DATE_FMT = "dd/MM/yyyy";

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, DATE_FMT);
}

export function toDateInputValue(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "yyyy-MM-dd");
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
