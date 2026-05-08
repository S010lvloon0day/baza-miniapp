/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:    '#08070D',
        s1:    '#12101A',
        s2:    '#1B1728',
        bd:    '#262033',
        bd2:   '#3A314A',
        green: '#9D5CFF',
        purple:'#9D5CFF',
        violet:'#C7A6FF',
        gold:  '#F3C77A',
        gray:  '#A9A3B8',
        gray2: '#6F6680',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow:  '0 0 24px rgba(157,92,255,.42)',
        glow2: '0 0 10px rgba(199,166,255,.28)',
      },
    },
  },
  plugins: [],
}
