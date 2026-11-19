import BazaMark from './BazaMark'
import Icon from './Icon'

/** «Знания S010lvloon» — авторский раздел: тёмная карточка с живым логотипом, переливающейся рамкой и орбитами. */
export default function FeaturedCard({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="feat anim-up">
      <i className="feat-border" />
      <span className="feat-in">
        <span className="feat-logo">
          <i className="feat-orb o1" /><i className="feat-orb o2" />
          <i className="feat-glow" />
          <BazaMark size={44} animate />
        </span>
        <span className="flex-1 min-w-0">
          <span className="feat-k">АВТОРСКОЕ · ОТ S010</span>
          <b className="feat-t">{title}</b>
          <small className="feat-s">Курсы, публикации и фишки — лично от автора</small>
        </span>
        <span className="feat-go"><Icon name="chevR" size={16} accent="current" /></span>
      </span>
    </button>
  )
}
