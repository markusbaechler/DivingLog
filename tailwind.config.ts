import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#eef9ff",
          100: "#d9f0ff",
          200: "#bce4ff",
          300: "#8ed4ff",
          400: "#59baff",
          500: "#329bff",
          600: "#1b7cf5",
          700: "#1463e1",
          800: "#1750b6",
          900: "#19478f",
          950: "#142c57",
        },
      },
    },
  },
  plugins: [],
};

export default config;
