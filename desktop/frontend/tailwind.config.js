/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Pink-violet brand palette matching updated app icon
        brand: {
          50:  "#fdf2ff",
          100: "#fae5ff",
          200: "#f3cdff",
          300: "#e9a8ff",
          400: "#d970f8",
          500: "#c54af0",  // primary
          600: "#a828d2",
          700: "#8d1fb0",
          800: "#761e90",
          900: "#621c75",
          950: "#430752",
        },
        surface: {
          900: "#121212",
          800: "#1e1e1e",
          700: "#2a2a2a",
          600: "#383838",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
