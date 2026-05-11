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
          DEFAULT: "#F783A8",
          50: "#FFF0F6",
          100: "#FFDEEB",
          400: "#FAA2C1",
          600: "#F783A8",
          700: "#E64980",
        },
        rose: {
          50: "#FFF5F8",
          100: "#FFE4EC",
          200: "#FFCEDC",
        },
        success: { DEFAULT: "#16a34a", 50: "#f0fdf4" },
        danger: { DEFAULT: "#E64980", 50: "#FFF0F6" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
