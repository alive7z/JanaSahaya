/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 55px -26px rgba(23, 71, 182, 0.28)',
        card: '0 12px 34px -22px rgba(15, 23, 42, 0.28)',
      },
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b0ff',
          500: '#338eff',
          600: '#1b6ef5',
          700: '#1457e1',
          800: '#1747b6',
          900: '#193f8f',
        },
      },
    },
  },
  plugins: [],
};
