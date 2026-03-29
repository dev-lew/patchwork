module.exports = {
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-base-accent-1) / <alpha-value>)",
        base: "rgb(var(--color-base-text) / <alpha-value>)",
        bg: "rgb(var(--color-base-background-1) / <alpha-value>)",
        bgSoft: "rgb(var(--color-base-background-2) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Assistant", "sans-serif"],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
