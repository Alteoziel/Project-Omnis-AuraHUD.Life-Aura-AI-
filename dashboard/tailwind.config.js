/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c1222",
        slatepanel: "#141c2e",
        signal: "#3d9a7a",
        alert: "#c45c4a",
        warn: "#c9a227",
        mist: "#9aa8c0",
      },
      fontFamily: {
        display: [
          "ui-rounded",
          "Avenir Next",
          "Segoe UI",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
