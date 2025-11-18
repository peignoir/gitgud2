import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2ad1a3",
          muted: "#c1f4e4",
          ink: "#103b2f"
        },
        surface: {
          DEFAULT: "#e9eef7",
          card: "#ffffff",
          panel: "#f9fbff",
          accent: "#e3ebff",
          border: "#d7deed"
        },
        ink: {
          DEFAULT: "#0f172a",
          subtle: "#475467",
          muted: "#667085"
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

