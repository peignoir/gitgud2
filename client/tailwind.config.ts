import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          body: "var(--bg-body)",
          surface: "var(--bg-surface)",
          "surface-soft": "var(--bg-surface-soft)",
        },
        border: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        brand: {
          primary: "var(--brand-primary)",
          "primary-soft": "var(--brand-primary-soft)",
        },
        accent: {
          blue: "var(--accent-blue)",
          purple: "var(--accent-purple)",
          yellow: "var(--accent-yellow)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        status: {
          success: "var(--status-success)",
          warning: "var(--status-warning)",
          danger: "var(--status-danger)",
          info: "var(--status-info)",
        }
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Segoe UI"',
          "sans-serif"
        ],
        mono: [
          '"SF Mono"',
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace"
        ]
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    // Safelist specific dynamic classes used in OnboardingWizard
    'text-brand-primary',
    'text-accent-blue',
    'text-accent-purple',
    'text-accent-yellow',
    'text-status-danger',
    'text-status-success',
    'text-status-warning',
    'border-brand-primary',
    'border-accent-blue',
    'border-accent-purple',
    'border-accent-yellow',
    'border-status-danger',
    'border-status-success',
    'bg-brand-primary',
    'bg-accent-blue',
    'bg-accent-purple',
    'bg-accent-yellow',
    'bg-status-danger',
    'bg-status-success'
  ]
};

export default config;
