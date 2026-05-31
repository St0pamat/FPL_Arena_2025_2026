/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        athletic: ["Oswald", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "fluid-xs": ["clamp(0.75rem, 0.7rem + 0.2vw, 0.8125rem)", { lineHeight: "1.45" }],
        "fluid-sm": ["clamp(0.875rem, 0.82rem + 0.25vw, 0.9375rem)", { lineHeight: "1.5" }],
        "fluid-base": ["clamp(1rem, 0.95rem + 0.3vw, 1.125rem)", { lineHeight: "1.6" }],
        "fluid-lg": ["clamp(1.125rem, 1rem + 0.5vw, 1.375rem)", { lineHeight: "1.45" }],
        "fluid-xl": ["clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)", { lineHeight: "1.35" }],
        "fluid-2xl": ["clamp(1.5rem, 1.25rem + 1vw, 2rem)", { lineHeight: "1.25" }],
        "fluid-3xl": ["clamp(1.875rem, 1.5rem + 1.5vw, 2.75rem)", { lineHeight: "1.15" }],
        "fluid-4xl": ["clamp(2.25rem, 1.75rem + 2vw, 3.5rem)", { lineHeight: "1.1" }],
        "fluid-5xl": ["clamp(2.75rem, 2rem + 3vw, 4.5rem)", { lineHeight: "1.05" }],
        "kpi": ["clamp(1.75rem, 1.4rem + 1.5vw, 2.75rem)", { lineHeight: "1" }],
        "kpi-lg": ["clamp(2.25rem, 1.75rem + 2vw, 3.75rem)", { lineHeight: "1" }],
      },
      maxWidth: {
        app: "90rem",
        "app-wide": "105rem",
        "app-full": "120rem",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
