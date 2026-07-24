import { motion } from 'framer-motion'
import BazaMark from '../components/BazaMark'

export default function SplashPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 text-center gap-0 bg-bg overflow-hidden">
      {/* Top gradient fade */}
      <div className="absolute inset-x-0 top-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(6,6,12,1), transparent)' }} />
      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(6,6,12,1), transparent)' }} />
      {/* Center radial glow */}
      <div className="absolute inset-x-[-60px] top-[-100px] h-[280px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,197,94,.18), transparent 65%)' }} />
      {/* Bottom separator */}
      <div className="absolute inset-x-8 bottom-16 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent)' }} />

      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative mb-8"
      >
        <div
          className="w-[104px] h-[104px] rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, rgba(34,197,94,.22), rgba(34,197,94,.03) 65%, transparent)', boxShadow: '0 0 40px rgba(34,197,94,.35)' }}
        >
          <BazaMark size={52} color="#4AE885" glow />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="relative text-[32px] font-bold tracking-widest mb-1"
      >
        <span className="text-white">S010</span><span className="text-gold">lvloon</span>
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
