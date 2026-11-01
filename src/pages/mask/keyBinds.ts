/** Клавиши драки на ПК: можно переназначить в настройках, хранятся на этом устройстве. */
import { IN_L, IN_R, IN_U, IN_D, IN_BLOCK, IN_P, IN_P2, IN_K, IN_K2, IN_S } from './fightSim'

export const ACTIONS = [
  { id: 'l', label: 'Влево', bit: IN_L }, { id: 'r', label: 'Вправо', bit: IN_R }, { id: 'u', label: 'Прыжок', bit: IN_U }, { id: 'd', label: 'Присед', bit: IN_D },
  { id: 'b', label: 'Блок', bit: IN_BLOCK }, { id: 'p', label: 'Рука 1', bit: IN_P }, { id: 'p2', label: 'Рука 2', bit: IN_P2 },
  { id: 'k', label: 'Нога 1', bit: IN_K }, { id: 'k2', label: 'Нога 2', bit: IN_K2 }, { id: 's', label: 'Спецприём', bit: IN_S },
] as const
export type ActId = typeof ACTIONS[number]['id']
export type Binds = Record<ActId, [string, string]>   // две клавиши на действие (вторая — запасная)

export const DEFAULT_BINDS: Binds = {
  l: ['ArrowLeft', 'KeyA'], r: ['ArrowRight', 'KeyD'], u: ['ArrowUp', 'KeyW'], d: ['ArrowDown', 'KeyS'], b: ['ShiftLeft', 'KeyO'],
  p: ['KeyU', ''], p2: ['KeyI', ''], k: ['KeyJ', ''], k2: ['KeyK', ''], s: ['KeyL', 'Space'],
}
const KEY = 'mg_keys'
export function loadBinds(): Binds {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v && typeof v === 'object') {
      const out = { ...DEFAULT_BINDS }
      for (const a of ACTIONS) { const x = v[a.id]; if (Array.isArray(x) && x.length === 2 && x.every(k => typeof k === 'string' && k.length < 32)) out[a.id] = [x[0], x[1]] }
      return out
    }
  } catch { /* */ }
  return { ...DEFAULT_BINDS }
}
export function saveBinds(b: Binds) { try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* */ } }
export function keyMap(b: Binds): Record<string, number> {
  const m: Record<string, number> = {}
  for (const a of ACTIONS) for (const k of b[a.id]) if (k) m[k] = (m[k] || 0) | a.bit
  return m
}
/** назначить клавишу: если она уже занята другим действием — там снимается */
export function assign(b: Binds, id: ActId, slot: 0 | 1, code: string): Binds {
  const out = Object.fromEntries(ACTIONS.map(a => [a.id, [...b[a.id]] as [string, string]])) as Binds
  for (const a of ACTIONS) for (const i of [0, 1] as const) if (out[a.id][i] === code) out[a.id][i] = ''
  out[id][slot] = code
  return out
}
const NAMES: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Пробел', ShiftLeft: 'Shift', ShiftRight: 'Shift П', ControlLeft: 'Ctrl', ControlRight: 'Ctrl П',
  AltLeft: 'Alt', AltRight: 'Alt П', Enter: 'Enter', Tab: 'Tab', CapsLock: 'Caps', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' }
export function keyName(code: string): string {
  if (!code) return '—'
  if (NAMES[code]) return NAMES[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6)
  return code
}
