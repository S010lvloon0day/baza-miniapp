/** @type {import('tailwindcss').Config} */
// «База» — премиальная тёмная тема. Изумруд = действие, золото = Premium/статус, фиолетовый = сообщество/опыт.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:        '#08100D',
        s1:        '#111C17',
        s2:        '#18251F',
        s3:        '#20302A',
        bd:        '#1D2B24',
        bd2:       '#2A3B33',
        fg:        '#F2F4F3',
        green:     '#17E584',
        greenLight:'#4BF5A8',
        greenDeep: '#0D5C37',
        ink:       '#03200F',
        purple:    '#7657FF',
        violet:    '#B9A8FF',
        indigo:    '#15123A',
        gold:      '#F5C25A',
        goldLight: '#FFE08A',
        gray:      '#A6B8AE',
        gray2:     '#6E8478',
      },
      fontFamily: {
        display: ['"Unbounded"', 'system-ui', 'sans-serif'],
        sans:    ['"Onest"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '20px', tile: '14px', ctl: '12px' },
      boxShadow: {
        glow: 'none', glow2: 'none',
        lift: '0 10px 30px rgba(0,0,0,.45)',
      },
    },
  },
  plugins: [],
}
