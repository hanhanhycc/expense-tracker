/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // `desktop` chỉ áp dụng cho desktop có chuột thật (pointer fine, ≥1280px).
      // → Mọi thiết bị touch (mobile, iPad Pro, touch monitor) sẽ dùng layout mobile-first.
      screens: {
        desktop: { raw: "(min-width: 1280px) and (pointer: fine)" },
      },
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          50: "#eff6ff",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        success: { DEFAULT: "#16a34a", 50: "#f0fdf4" },
        danger: { DEFAULT: "#dc2626", 50: "#fef2f2" },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
