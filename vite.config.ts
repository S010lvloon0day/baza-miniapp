import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.VITE_BASE_PATH || '/baza-miniapp/'

export default defineConfig({
  base,
  build: {
    outDir: 'docs',
  },
  plugins: [react()],
})
