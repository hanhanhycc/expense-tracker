import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), "uploads");

const RECEIPTS_DIR = path.join(UPLOAD_ROOT, "receipts");

export const RECEIPT_MAX_BYTES = 8 * 1024 * 1024; // 8MB

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export function isAllowedReceiptMime(mime: string): boolean {
  return Object.prototype.hasOwnProperty.call(ALLOWED, mime.toLowerCase());
}

export function extForMime(mime: string): string {
  return ALLOWED[mime.toLowerCase()] ?? "bin";
}

export function mimeForExt(ext: string): string {
  const e = ext.toLowerCase().replace(/^\./, "");
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "heic") return "image/heic";
  return "application/octet-stream";
}

async function ensureDir() {
  await mkdir(RECEIPTS_DIR, { recursive: true });
}

export async function saveReceipt(transactionId: string, buf: Buffer, mime: string): Promise<string> {
  await ensureDir();
  const ext = extForMime(mime);
  const filename = `${transactionId}.${ext}`;
  const full = path.join(RECEIPTS_DIR, filename);
  await writeFile(full, buf);
  // Cleanup other extensions for the same id
  for (const e of new Set(Object.values(ALLOWED))) {
    if (e === ext) continue;
    const other = path.join(RECEIPTS_DIR, `${transactionId}.${e}`);
    try { await unlink(other); } catch { /* ignore */ }
  }
  return `receipts/${filename}`;
}

export async function readReceipt(receiptPath: string): Promise<{ buf: Buffer; mime: string } | null> {
  // Hardening: receiptPath must be `receipts/<id>.<ext>` with no traversal
  if (!/^receipts\/[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(receiptPath)) return null;
  const full = path.join(UPLOAD_ROOT, receiptPath);
  try {
    const s = await stat(full);
    if (!s.isFile()) return null;
    const buf = await readFile(full);
    const ext = path.extname(full);
    return { buf, mime: mimeForExt(ext) };
  } catch {
    return null;
  }
}

export async function deleteReceipt(receiptPath: string): Promise<void> {
  if (!/^receipts\/[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(receiptPath)) return;
  const full = path.join(UPLOAD_ROOT, receiptPath);
  try { await unlink(full); } catch { /* ignore */ }
}
