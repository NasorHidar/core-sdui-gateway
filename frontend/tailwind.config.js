/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Banking-neutral palette
        brand: {
          50:  "#eef4ff",
          500: "#2563eb",
          700: "#1d4ed8",
          900: "#0b1d52",
        },
      },
    },
  },
  plugins: [],
};
