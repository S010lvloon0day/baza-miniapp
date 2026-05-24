/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:    '#010108',
        s1:    '#09090F',
        s2:    '#0F0E18',
        bd:    '#1A1828',
        bd2:   '#28263A',
        green: '#00FF41',
        purple:'#9D5CFF',
        violet:'#C7A6FF',
        gold:  '#D4D4D4',
        gray:  '#787888',
        gray2: '#48485A',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        sans:    ['"Manrope"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow:  '0 0 24px rgba(0,255,65,.35)',
        glow2: '0 0 10px rgba(0,255,65,.2)',
      },
    },
  },
  plugins: [],
}
