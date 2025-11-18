import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#5B5FFB",
          muted: "#C7C9FF",
          ink: "#0F172A"
        },
        surface: {
          DEFAULT: "#F7F3EC",
          card: "#FFFFFF",
          panel: "#F1EAE1",
          accent: "#E2ECFF",
          border: "#E2DAD0"
        },
        ink: {
          DEFAULT: "#1D2939",
          subtle: "#475467",
          muted: "#667085"
        },
        accent: {
          orange: "#D97A35",
          teal: "#18B69B",
          purple: "#A855F7",
          lime: "#5EEAD4"
        }
      },
      boxShadow: {
        glow: "0 35px 70px rgba(15, 23, 42, 0.2)",
        card: "0 20px 45px rgba(15, 23, 42, 0.08)"
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

