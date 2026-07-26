import { useEffect, useState } from 'react'

/** Подписка на CSS-медиазапрос без ресайз-слушателей и лишних перерисовок. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Курс раскрывается в две колонки на экранах от 900px — обычно это ПК. */
export const useIsWide = () => useMediaQuery('(min-width: 900px)')
