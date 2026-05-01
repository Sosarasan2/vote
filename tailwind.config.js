/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#546E7A",
        "primary-dark": "#3F525B",
        "primary-light": "#78909C",
        bg: "#F4F6F8",
      },
    },
  },
  plugins: [],
};
