import BazaMark from './BazaMark'
import MarkMark from './MarkMark'
import Icon from './Icon'

/** «Знания S010lvloon» — авторский раздел: тёмная карточка с живым логотипом, переливающейся рамкой и орбитами. */
/** variant="mk" — «Знания Маркаряна»: тёплая гамма, свой знак-вершина. */
export default function FeaturedCard({ title, onClick, variant }: { title: string; onClick: () => void; variant?: 'mk' }) {
  const mk = variant === 'mk'
  return (
    <button onClick={onClick} className={`feat anim-up${mk ? ' feat-mk' : ''}`}>
      <i className="feat-border" />
      <span className="feat-in">
        <span className="feat-logo">
          <i className="feat-orb o1" /><i className="feat-orb o2" />
          <i className="feat-glow" />
          {mk ? <MarkMark size={46} /> : <BazaMark size={44} animate />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="feat-k">{mk ? 'СИСТЕМА · АРСЕН МАРКАРЯН' : 'АВТОРСКОЕ · ОТ S010'}</span>
          <b className="feat-t">{title}</b>
          <small className="feat-s">{mk ? 'Курсы TR, эфиры 1–208, подкасты и письма — по смыслу' : 'Курсы, публикации и фишки — лично от автора'}</small>
        </span>
        <span className="feat-go"><Icon name="chevR" size={16} accent="current" /></span>
      </span>
    </button>
  )
}
