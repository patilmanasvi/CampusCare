// tailwind.config.cjs
// Brand tokens for the DY Patil / RAIT look. `bg-primary` and `bg-primary-dark`
// still work exactly as before; the numbered shades are new.
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#B51F3A',
          dark: '#8A162D',
          50: '#FDF2F4',
          100: '#FAE1E6',
          200: '#F3BCC7',
          300: '#E88A9C',
          400: '#D4566E',
          500: '#B51F3A',
          600: '#9E1A33',
          700: '#8A162D',
          800: '#6B1123',
          900: '#4D0C19',
        },
        secondary: '#E0E0E0',
        accent: '#F07B75',
        'dark-bg': '#1A1A1C',
        'dark-surface': '#242427',
        'dark-raised': '#2E2E32',
        'dark-border': '#3A3A3F',
        'light-surface': '#F5F5F6',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
        pop: '0 10px 30px -8px rgba(16,24,40,0.25)',
      },
    },
  },
  plugins: [],
};
