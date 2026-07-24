/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:        '#06060C',
        s1:        '#0C0B16',
        s2:        '#121120',
        bd:        '#1C1B2E',
        bd2:       '#272540',
        green:     '#22C55E',
        greenLight:'#4AE885',
        purple:    '#9D5CFF',
        violet:    '#C7A6FF',
        gold:      '#FFBC2E',
        goldLight: '#FFCB57',
        gray:      '#6A6A80',
        gray2:     '#3E3E52',
      },
      fontFamily: {
        display: ['"Manrope"', 'system-ui', 'sans-serif'],
        sans:    ['"Manrope"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        glow:  '0 0 20px rgba(255,255,255,.15)',
        glow2: '0 0 8px rgba(255,255,255,.08)',
      },
    },
  },
  plugins: [],
}
