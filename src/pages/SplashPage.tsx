import { motion } from 'framer-motion'
import Logo from '../components/Logo'

export default function SplashPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 text-center gap-0 bg-bg overflow-hidden">
      <div className="absolute inset-x-[-90px] top-[-150px] h-[360px] rounded-full bg-[radial-gradient(circle,rgba(157,92,255,.24),transparent_62%)] blur-2xl" />
      <div className="absolute inset-x-8 bottom-16 h-px bg-gradient-to-r from-transparent via-violet/50 to-transparent" />
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
        className="relative text-[30px] font-bold tracking-widest mb-1.5"
      >
        <span className="text-green">S010</span>lvloon
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="relative text-[10px] font-mono tracking-[2px] text-green/60 mb-6"
      >
        // информационная безопасность
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
        className="relative w-full max-w-[280px] py-4 bg-green text-bg font-bold text-[13px] font-mono tracking-[3px] uppercase rounded-sm flex items-center justify-center gap-3"
        style={{ boxShadow: '0 0 24px rgba(0,255,65,.4), 0 0 60px rgba(0,255,65,.12)' }}
      >
        ./НАЧАТЬ <span className="blink">_</span>
      </motion.button>
    </div>
  )
}
