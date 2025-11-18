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
        surface: "#05060a"
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

