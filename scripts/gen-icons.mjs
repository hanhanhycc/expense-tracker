// Render PNG icons từ public/logo.svg
// Chạy: pnpm icons:gen
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "public");
const src = path.join(root, "logo.svg");

const targets = [
  { size: 192, out: "icons/icon-192.png", maskable: false },
  { size: 512, out: "icons/icon-512.png", maskable: false },
  { size: 192, out: "icons/icon-192-maskable.png", maskable: true },
  { size: 512, out: "icons/icon-512-maskable.png", maskable: true },
  { size: 180, out: "icons/apple-touch-icon.png", maskable: false },
  { size: 32, out: "icons/favicon-32.png", maskable: false },
  { size: 16, out: "icons/favicon-16.png", maskable: false },
];

async function main() {
  const svg = await fs.readFile(src);

  for (const t of targets) {
    const outPath = path.join(root, t.out);
    await fs.mkdir(path.dirname(outPath), { recursive: true });

    if (t.maskable) {
      // Maskable: nội dung phải nằm trong safe zone (~80% trung tâm).
      // Nền coral solid để khớp brand, thu nhỏ logo còn 80%.
      const inner = Math.round(t.size * 0.8);
      const innerPng = await sharp(svg, { density: 384 })
        .resize(inner, inner)
        .png()
        .toBuffer();

      await sharp({
        create: {
          width: t.size,
          height: t.size,
          channels: 4,
          background: { r: 247, g: 131, b: 168, alpha: 1 },
        },
      })
        .composite([{ input: innerPng, gravity: "center" }])
        .png()
        .toFile(outPath);
    } else {
      await sharp(svg, { density: 384 })
        .resize(t.size, t.size)
        .png()
        .toFile(outPath);
    }
    console.log("✓", t.out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
