// tailwind.config.cjs
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#B51F3A",
        "primary-dark": "#8A162D",
        secondary: "#E0E0E0",
        accent: "#FF6F61",
        "dark-bg": "#1F1F1F",
        "dark-surface": "#2A2A2A",
        "light-surface": "#F5F5F5"
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem"
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)"
      }
    }
  },
  plugins: []
};
