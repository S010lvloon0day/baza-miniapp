import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Logo from '../components/Logo'

function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const W = canvas.width
    const H = canvas.height
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01100110マミムメモヤユヨラリルレロ'
    const fs   = 11
    const cols = Math.floor(W / fs)
    const drops = Array.from({ length: cols }, () => Math.random() * -(H / fs))

    const id = setInterval(() => {
      ctx.fillStyle = 'rgba(6,6,12,.08)'
      ctx.fillRect(0, 0, W, H)
      ctx.font = `${fs}px "JetBrains Mono", monospace`
      for (let i = 0; i < cols; i++) {
        const y = drops[i] * fs
        if (y > 0 && y < H + fs) {
          const a = (0.03 + Math.random() * 0.11).toFixed(2)
          ctx.fillStyle = `rgba(255,255,255,${a})`
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, y)
        }
        if (y > H && Math.random() > 0.975) drops[i] = -Math.floor(Math.random() * 22)
        else drops[i] += 0.38
      }
    }, 60)
    return () => clearInterval(id)
  }, [])
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />
}

export default function SplashPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 text-center gap-0 bg-bg overflow-hidden">
      <MatrixRain />
      <div className="scanline" />

      {/* Top gradient fade */}
      <div className="absolute inset-x-0 top-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(6,6,12,1), transparent)' }} />
      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(6,6,12,1), transparent)' }} />
      {/* Center radial glow */}
      <div className="absolute inset-x-[-60px] top-[-100px] h-[280px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,.04), transparent 65%)' }} />
      {/* Bottom separator */}
      <div className="absolute inset-x-8 bottom-16 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent)' }} />

      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative mb-8"
      >
        <Logo size={128} glow />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="relative text-[32px] font-bold tracking-widest mb-1"
      >
        <span className="glitch-text text-white">S010</span><span className="text-gold">lvloon</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="relative text-[10px] font-mono tracking-[2px] text-gray2 mb-8"
      >
        // ИНФОРМАЦИОННАЯ БЕЗОПАСНОСТЬ
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="relative text-[13px] text-gray leading-relaxed mb-12 max-w-[260px]"
      >
        Обучаем. Повышаем осведомлённость.<br />Укрепляем защиту систем.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="relative w-full max-w-[280px] py-4 bg-white text-bg font-bold text-[13px] font-mono tracking-[3px] uppercase rounded-sm flex items-center justify-center gap-2 active:bg-gold"
        style={{ boxShadow: '0 0 24px rgba(255,255,255,.2), 0 0 60px rgba(255,255,255,.06)' }}
      >
        ВОЙТИ В СИСТЕМУ <span className="blink text-[16px] font-light">_</span>
      </motion.button>
    </div>
  )
}
