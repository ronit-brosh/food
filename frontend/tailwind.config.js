/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-rubik)", "sans-serif"],
        display: ["var(--font-assistant)", "sans-serif"],
      },
      colors: {
        brand: {
          bg:       "#f8f9fa",
          surface:  "#ffffff",
          card:     "#eef4f4",
          border:   "#e2e8f0",
          accent:   "#5F8A8B",
          accent2:  "#8DB4B5",
          text:     "#1e293b",
          muted:    "#64748b",
          gold:     "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
