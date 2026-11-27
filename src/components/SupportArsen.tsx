const tg = (window as any).Telegram?.WebApp
const BOT_URL = 'https://t.me/BazaArsenMark_bot'

/** Блок поддержки автора в «Знаниях Маркаряна»: тёплая карточка с кнопкой официальной подписки. */
export default function SupportArsen() {
  const open = () => { if (tg?.openTelegramLink) tg.openTelegramLink(BOT_URL); else window.open(BOT_URL, '_blank') }
  return (
    <div className="mx-3.5 mt-3 sup-mk anim-up">
      <i className="sup-mk-glow" />
      <div className="relative flex items-start gap-3">
        <span className="sup-mk-ic" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24"><path className="sup-mk-heart" d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" fill="#FF5A1F" /></svg>
        </span>
        <div className="flex-1 min-w-0">
          <b className="block font-display font-semibold text-[17px] leading-snug">Поддержите Арсена Маркаряна</b>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#E7D6C8]">
            Всё, что собрано в этом разделе, — результат многих лет работы Арсена. Официальная подписка на его Базу
            открывает новые эфиры, посты и тренинги раньше всех и напрямую поддерживает автора.
          </p>
        </div>
      </div>
      <button onClick={open} className="sup-mk-btn relative mt-3.5 w-full active:scale-[.98] transition-transform">
        Оформить подписку
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <small className="relative block mt-2 text-center text-[11.5px] text-[#B59A86]">Откроется официальный бот @BazaArsenMark_bot</small>
    </div>
  )
}
