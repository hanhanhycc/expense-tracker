/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // `desktop` chỉ áp dụng cho desktop có chuột thật (pointer fine, ≥1280px).
      screens: {
        desktop: { raw: "(min-width: 1280px) and (pointer: fine)" },
      },
      colors: {
        // Theme-aware tokens (spatial glass 2026) — RGB triple cho /<alpha> modifier
        ink: {
          1: "rgb(var(--ink-1-rgb) / <alpha-value>)",
          2: "rgb(var(--ink-2-rgb) / <alpha-value>)",
          3: "rgb(var(--ink-3-rgb) / <alpha-value>)",
          mute: "rgb(var(--ink-mute-rgb) / <alpha-value>)",
        },
        accent: {
          1: "rgb(var(--accent-1-rgb) / <alpha-value>)",
          2: "rgb(var(--accent-2-rgb) / <alpha-value>)",
          3: "rgb(var(--accent-3-rgb) / <alpha-value>)",
        },
        // Legacy keys — alias để code cũ vẫn chạy
        primary: {
          DEFAULT: "rgb(var(--accent-1-rgb) / <alpha-value>)",
          50: "rgb(var(--accent-1-rgb) / 0.10)",
          100: "rgb(var(--accent-1-rgb) / 0.18)",
          400: "rgb(var(--accent-1-rgb) / <alpha-value>)",
          600: "rgb(var(--accent-1-rgb) / <alpha-value>)",
          700: "rgb(var(--accent-1-rgb) / <alpha-value>)",
        },
        rose: {
          50: "rgb(var(--accent-1-rgb) / 0.08)",
          100: "rgb(var(--accent-1-rgb) / 0.14)",
          200: "rgb(var(--accent-1-rgb) / 0.24)",
        },
        success: {
          DEFAULT: "rgb(var(--success-rgb) / <alpha-value>)",
          50: "rgb(var(--success-rgb) / 0.12)",
        },
        danger: {
          DEFAULT: "rgb(var(--danger-rgb) / <alpha-value>)",
          50: "rgb(var(--danger-rgb) / 0.12)",
        },
        warning: {
          DEFAULT: "rgb(var(--warning-rgb) / <alpha-value>)",
        },
        // Override gray-* to theme-aware ink (auto dark-mode) — KHÔNG đụng logic, chỉ map màu.
        gray: {
          50:  "rgb(var(--ink-1-rgb) / 0.04)",
          100: "rgb(var(--ink-1-rgb) / 0.08)",
          200: "rgb(var(--ink-1-rgb) / 0.14)",
          300: "rgb(var(--ink-mute-rgb) / <alpha-value>)",
          400: "rgb(var(--ink-3-rgb) / <alpha-value>)",
          500: "rgb(var(--ink-3-rgb) / <alpha-value>)",
          600: "rgb(var(--ink-2-rgb) / <alpha-value>)",
          700: "rgb(var(--ink-2-rgb) / <alpha-value>)",
          800: "rgb(var(--ink-1-rgb) / <alpha-value>)",
          900: "rgb(var(--ink-1-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        glass: "var(--glass-shadow)",
        "glass-lg": "var(--glass-shadow-lg)",
      },
      backdropBlur: {
        glass: "36px",
      },
    },
  },
  plugins: [],
};
