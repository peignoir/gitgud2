import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4263EB", // open-color indigo 7
          muted: "#BAC8FF", // indigo 3
          ink: "#1C275B" // deep indigo
        },
        surface: {
          DEFAULT: "#F8F9FA", // gray 0
          card: "#FFFFFF",
          panel: "#F1F3F5", // gray 1
          accent: "#DBE4FF", // indigo 1
          border: "#CED4DA" // gray 4
        },
        ink: {
          DEFAULT: "#101828",
          subtle: "#475467",
          muted: "#667085"
        },
        accent: {
          orange: "#FF8A1D",
          teal: "#2AD1A3"
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

