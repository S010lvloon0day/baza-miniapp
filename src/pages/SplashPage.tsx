import { motion } from 'framer-motion'
import BazaMark from '../components/BazaMark'
import Icon from '../components/Icon'

export default function SplashPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 text-center bg-bg overflow-hidden"
      style={{ background: 'radial-gradient(80% 45% at 50% 32%, rgba(23,229,132,.16), transparent 70%), radial-gradient(70% 40% at 50% 85%, rgba(118,87,255,.12), transparent 70%), #08100D' }}>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-[96px] h-[96px] rounded-[28px] flex items-center justify-center mb-7"
        style={{ background: 'linear-gradient(160deg, #0F2A1E, #0B1712)', border: '1px solid rgba(255,255,255,.11)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 18px 40px rgba(0,0,0,.45)' }}
      >
        <BazaMark size={50} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
        className="font-display font-semibold text-[28px] leading-tight"
      >
        База знаний
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        className="text-[14.5px] text-gray leading-relaxed mt-2.5 max-w-[280px]"
        style={{ textWrap: 'balance' } as React.CSSProperties}
      >
        Курсы и материалы по информационной безопасности от S010lvloon
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        onClick={onStart}
        className="btn-primary w-full max-w-[300px] mt-10 h-[52px]"
      >
        Начать <Icon name="arrowR" size={18} strokeWidth={2} />
      </motion.button>
    </div>
  )
}
