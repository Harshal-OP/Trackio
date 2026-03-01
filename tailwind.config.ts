import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#19e65e",
          50: "#ecfdf2",
          100: "#d1fae0",
          200: "#a6f4c5",
          300: "#6ee7a1",
          400: "#34d67a",
          500: "#19e65e",
          600: "#06c94a",
          700: "#059e3d",
          800: "#087c33",
          900: "#08662c",
          950: "#003916",
        },
        background: {
          light: "#f6f8f6",
          dark: "#112116",
        },
        surface: {
          light: "#ffffff",
          dark: "#1a2e22",
        },
        border: {
          DEFAULT: "#2d4a36",
          light: "#e2e8f0",
        },
      },
      fontFamily: {
        display: ["var(--font-geist)", "sans-serif"],
        sans: ["var(--font-geist)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
