/**
 * Build CSV string từ rows. Tự escape "," và quotes.
 * Trả về có BOM UTF-8 để Excel mở tiếng Việt không lỗi.
 */
export function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  return "\uFEFF" + lines.join("\n");
}
