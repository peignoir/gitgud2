import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2ad1a3",
          muted: "#c1f4e4"
        },
        surface: {
          DEFAULT: "#edf1f8",
          card: "#ffffff",
          accent: "#e2e9ff"
        }
      },
      boxShadow: {
        glow: "0 35px 70px rgba(21, 41, 92, 0.15)"
      },
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          '"Inter"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "sans-serif"
        ]
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;

