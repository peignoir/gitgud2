import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#f5d580",
          muted: "#f7e5b5"
        },
        surface: {
          DEFAULT: "#0c1324",
          raised: "rgba(255,255,255,0.08)",
          card: "rgba(10,16,30,0.85)"
        }
      },
      boxShadow: {
        glow: "0 20px 60px rgba(7, 11, 24, 0.65)"
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

