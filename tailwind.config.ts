import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f1115",
        foreground: "#f5f6f7",
        graphite: {
          50: "#f4f5f6",
          100: "#e3e5e8",
          200: "#c7ccd2",
          300: "#a3aab4",
          400: "#768190",
          500: "#5a6574",
          600: "#4d5663",
          700: "#414852",
          800: "#363c45",
          900: "#1f2329",
          950: "#161a1f",
        },
        emerald: {
          450: "#10b981",
          550: "#059669",
          650: "#047857",
          750: "#065f46",
          850: "#064e3b",
          950: "#022c22",
        },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 10px 30px -10px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
