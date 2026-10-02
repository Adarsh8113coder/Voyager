/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#05070d',
          900: '#0a0e1a',
          800: '#111827',
        },
        cyan: {
          glow: '#5ee7ff',
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(94, 231, 255, 0.25)',
      }
    },
  },
  plugins: [],
}
