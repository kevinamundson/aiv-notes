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
        parchment: "#F7F4EE",
        scripture: "#1A1814",
        "note-ink": "#3D4A3A",
        "note-rule": "#6B7F66",
      },
      fontFamily: {
        scripture: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "serif"],
        note: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      maxWidth: {
        scripture: "66ch",
        note: "36ch",
      },
    },
  },
  plugins: [],
};

export default config;
