/** @type {import('tailwindcss').Config} */
// «База» — премиальная тёмная тема. Изумруд = действие, золото = Premium/статус, фиолетовый = сообщество/опыт.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:        '#07080A',
        s1:        '#121318',
        s2:        '#1A1C22',
        s3:        '#23252D',
        bd:        '#1E2027',
        bd2:       '#2B2E37',
        fg:        '#F2F4F3',
        green:     '#8A78FF',
        greenLight:'#B3A6FF',
        greenDeep: '#3A22A8',
        ink:       '#FFFFFF',
        purple:    '#7A4DFF',
        violet:    '#B9A8FF',
        indigo:    '#140A45',
        gold:      '#E9C987',
        goldLight: '#F3DDA6',
        gray:      '#A6AAB4',
        gray2:     '#6E727C',
      },
      fontFamily: {
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
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
