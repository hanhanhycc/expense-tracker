"use client";

/**
 * Tiny haptic helper. No-op nếu trình duyệt không hỗ trợ Vibration API.
 */
type Pattern = "light" | "medium" | "heavy" | "success" | "error" | "selection";

const patterns: Record<Pattern, number | number[]> = {
  light: 10,
  medium: 18,
  heavy: 30,
  selection: 8,
  success: [10, 40, 20],
  error: [40, 30, 40],
};

export function haptic(p: Pattern = "light") {
  if (typeof navigator === "undefined") return;
  const n = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof n.vibrate === "function") {
    try { n.vibrate(patterns[p]); } catch { /* ignore */ }
  }
}
