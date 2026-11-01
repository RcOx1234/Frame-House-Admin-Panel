/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: { colors: { canvas: 'rgb(var(--canvas) / <alpha-value>)', surface: 'rgb(var(--surface) / <alpha-value>)', ink: 'rgb(var(--ink) / <alpha-value>)', muted: 'rgb(var(--muted) / <alpha-value>)', line: 'rgb(var(--line) / <alpha-value>)', brand: '#D61E2B', brandsoft: 'rgb(var(--brand-soft) / <alpha-value>)' } },
  },
  plugins: [],
};
