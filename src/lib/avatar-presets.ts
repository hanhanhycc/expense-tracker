// Preset avatar — bộ động vật mặc định. Lưu dưới dạng "preset:<key>" trong User.avatarPath.

export type AnimalPreset = {
  key: string;
  emoji: string;
  label: string;
  bg: string; // hex
};

export const ANIMAL_PRESETS: AnimalPreset[] = [
  { key: "cat", emoji: "🐱", label: "Mèo", bg: "#FFD9E5" },
  { key: "dog", emoji: "🐶", label: "Chó", bg: "#FFE7BA" },
  { key: "fox", emoji: "🦊", label: "Cáo", bg: "#FFD4B8" },
  { key: "bear", emoji: "🐻", label: "Gấu", bg: "#E8D3B5" },
  { key: "panda", emoji: "🐼", label: "Gấu trúc", bg: "#EFEFEF" },
  { key: "rabbit", emoji: "🐰", label: "Thỏ", bg: "#FCE7F3" },
  { key: "tiger", emoji: "🐯", label: "Hổ", bg: "#FED7AA" },
  { key: "lion", emoji: "🦁", label: "Sư tử", bg: "#FEF3C7" },
  { key: "monkey", emoji: "🐵", label: "Khỉ", bg: "#FDE68A" },
  { key: "pig", emoji: "🐷", label: "Heo", bg: "#FCE7F3" },
  { key: "cow", emoji: "🐮", label: "Bò", bg: "#E0F2FE" },
  { key: "frog", emoji: "🐸", label: "Ếch", bg: "#D1FAE5" },
  { key: "chick", emoji: "🐥", label: "Gà con", bg: "#FEF9C3" },
  { key: "penguin", emoji: "🐧", label: "Chim cánh cụt", bg: "#E0E7FF" },
  { key: "koala", emoji: "🐨", label: "Gấu koala", bg: "#E5E7EB" },
  { key: "unicorn", emoji: "🦄", label: "Kỳ lân", bg: "#F3E8FF" },
  { key: "hamster", emoji: "🐹", label: "Chuột hamster", bg: "#FDE68A" },
  { key: "fish", emoji: "🐠", label: "Cá", bg: "#CFFAFE" },
  { key: "octopus", emoji: "🐙", label: "Bạch tuộc", bg: "#FCE7F3" },
  { key: "owl", emoji: "🦉", label: "Cú", bg: "#E7E5E4" },
];

export const PRESET_PREFIX = "preset:";

export function isPresetPath(p: string | null | undefined): boolean {
  return typeof p === "string" && p.startsWith(PRESET_PREFIX);
}

export function getPresetByKey(key: string): AnimalPreset | undefined {
  return ANIMAL_PRESETS.find((a) => a.key === key);
}

export function getPresetFromPath(p: string): AnimalPreset | undefined {
  if (!isPresetPath(p)) return undefined;
  return getPresetByKey(p.slice(PRESET_PREFIX.length));
}

/** Render SVG (string) cho preset avatar — vuông, dùng làm image/svg+xml. */
export function renderPresetSvg(preset: AnimalPreset, size = 256): string {
  const fontSize = Math.round(size * 0.62);
  // emoji cần encode để an toàn trong XML
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="${preset.bg}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-size="${fontSize}"
        font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${preset.emoji}</text>
</svg>`;
}
