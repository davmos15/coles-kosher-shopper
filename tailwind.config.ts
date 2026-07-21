import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        paper: "#f5f7f3",
        card: "#ffffff",
        ink: "#1b201c",
        grocer: "#2f6b4b",
        grocerDark: "#234f38",
        amber: "#b5751a",
        line: "#e3e6df",
        muted: "#6a6f68",
      },
    },
  },
  plugins: [],
};
export default config;
