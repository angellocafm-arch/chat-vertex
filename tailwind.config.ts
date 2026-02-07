import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vertex: {
          dark: "#0a0a0a",
          darker: "#050505",
          accent: "#6366f1",
          green: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
