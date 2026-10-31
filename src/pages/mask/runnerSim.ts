/**
 * Забег — детерминированная симуляция (60 тиков/с). Её же переигрывает сервер (runner_sim.py — точная копия),
 * поэтому порядок арифметики здесь и там должен совпадать до операции. Никакого Math.random и переменного dt.
 */
export const RTPS = 60
export const DT = 1 / 60
export const LANE = 1.7
export const WALL_HALF = 1.3   // половина длины контейнера вдоль дороги
export type Kind = 'low' | 'high' | 'wall'
export interface RObs { id: number; lane: number; z: number; kind: Kind }
export interface RModel { v0: number; a: number; vmax: number }
/** нажатия: 1 влево, 2 вправо, 3 прыжок, 4 вниз (подкат) */
export type RIn = 0 | 1 | 2 | 3 | 4
export interface RSim {
  m: RModel; rng: number; tick: number; t: number; dist: number; lane: number; x: number; y: number; vy: number
  slide: number; air: number; nextZ: number; obs: RObs[]; nid: number; dead: number; ev: string[]
}

export const LX = (l: number) => -l * LANE
const rand = (s: RSim) => { let x = s.rng; x = (x ^ (x << 13)) >>> 0; x = (x ^ (x >>> 17)) >>> 0; x = (x ^ (x << 5)) >>> 0; s.rng = x; return x / 4294967296 }
const speed = (s: RSim) => Math.min(s.m.v0 + s.m.a * s.t, s.m.vmax)
export const runScore = (s: RSim) => Math.floor(s.dist * 10)

export function newRun(seed: number, m: RModel): RSim {
  return { m, rng: (seed >>> 0) || 7, tick: 0, t: 0, dist: 0, lane: 0, x: 0, y: 0, vy: 0, slide: 0, air: 0, nextZ: 30, obs: [], nid: 0, dead: 0, ev: [] }
}

function spawn(s: RSim) {
  while (s.nextZ < s.dist + 90) {
    const vv = speed(s), d = Math.min(1, s.t / 95), lanes = [-1, 0, 1]
    const pick = (a: number[]) => a[Math.floor(rand(s) * a.length)]
    const lk = (): Kind => rand(s) < 0.5 ? 'low' : 'high'
    const add = (l: number, k: Kind, dz: number) => { s.obs.push({ id: ++s.nid, lane: l, z: s.nextZ + dz, kind: k }) }
    const free = pick(lanes)
    // веса узоров: простые уходят, сложные приходят
    const w = [1.1 - d * 1.1, 1, 0.8 - d * 0.3, 0.25 + d * 1.5, 0.1 + d * 1.6, d * 1.3, d * 1.2]
    let tot = 0; for (const q of w) tot += q
    let r = rand(s) * tot, p = 0
    while (r > w[p]) { r -= w[p]; p++ }
    let extra = 0
    if (p === 0) add(pick(lanes), lk(), 0)                                                  // одно препятствие
    else if (p === 1) { for (const l of lanes) if (l !== free) add(l, 'wall', 0) }        // две стены, проход один
    else if (p === 2) { const k = lk(); for (const l of lanes) add(l, k, 0) }              // барьер во всю ширину
    else if (p === 3) { for (const l of lanes) add(l, l === free ? lk() : 'wall', 0) }     // проход есть, но в нём ещё барьер
    else if (p === 4) {                                                                    // зигзаг
      const l1 = pick(lanes), l2 = pick(lanes.filter(x => x !== l1)), gap = Math.max(8, vv * (0.62 - d * 0.12))
      for (const l of lanes) if (l !== l1) add(l, 'wall', 0)
      for (const l of lanes) if (l !== l2) add(l, 'wall', gap)
      extra = gap
    } else if (p === 6) {                                                                  // низкий, сразу за ним высокий
      const gap = Math.max(7, vv * 0.45)
      for (const l of lanes) add(l, 'low', 0)
      for (const l of lanes) add(l, 'high', gap)
      extra = gap
    } else {                                                                               // коридор из контейнеров
      const gap = Math.max(7, vv * 0.4)
      for (let i = 0; i < 3; i++) { for (const l of lanes) if (l !== free) add(l, 'wall', i * gap) }
      add(free, lk(), gap * 1.5); extra = gap * 2
    }
    const react = Math.max(0.44, 0.95 - d * 0.51)
    s.nextZ += extra + Math.max(10, vv * react) + rand(s) * vv * (0.35 - d * 0.27)
  }
}

/** один тик забега; inp — нажатие на этом тике (не больше одного) */
export function runStep(s: RSim, inp: RIn) {
  s.ev = []
  if (s.dead) return
  s.tick++
  if (inp === 1 && s.lane > -1) { s.lane--; s.ev.push('lane') }
  else if (inp === 2 && s.lane < 1) { s.lane++; s.ev.push('lane') }
  else if (inp === 3 && s.y <= 0.001) { s.vy = 9.2; s.slide = 0; s.air = 1; s.ev.push('jump') }
  else if (inp === 4) { if (s.y > 0.001) s.vy = -14; if (s.slide <= 0) s.ev.push('roll'); s.slide = 0.75; s.ev.push('slide') }
  s.t += DT
  const v = speed(s), dPrev = s.dist
  s.dist += v * DT
  s.x += (LX(s.lane) - s.x) * Math.min(1, DT * 14)
  s.vy -= 26 * DT
  s.y = Math.max(0, s.y + s.vy * DT)
  if (s.y === 0) s.vy = 0
  if (s.air && s.y === 0) { s.air = 0; s.ev.push('land') }
  if (s.slide > 0) { s.slide -= DT; if (s.slide <= 0) s.ev.push('slideEnd') }
  spawn(s)
  const hTop = s.slide > 0 ? 0.95 : 1.8
  for (const o of s.obs) {
    const rz = o.z - s.dist, rzP = o.z - dPrev
    const hz = o.kind === 'wall' ? WALL_HALF + 0.1 : 0.45
    // «сквозная» проверка: за тик на большой скорости можно пролететь препятствие насквозь
    if (o.lane === s.lane && rz < hz && rzP > -hz && Math.abs(s.x - LX(s.lane)) < 0.6) {
      const hit = o.kind === 'wall' || (o.kind === 'low' && s.y < 0.6) || (o.kind === 'high' && hTop > 1.2 && s.y < 0.9)
      if (hit) { s.dead = 1; s.ev.push('crash'); break }
    }
  }
  s.obs = s.obs.filter(o => o.z - s.dist >= -6)
}

/** запись нажатий: [тик, нажатие]; тик — номер шага, на котором нажатие применяется (s.tick до шага) */
export type RunLog = [number, number][]
export function replayRun(seed: number, m: RModel, log: RunLog, endTick: number): RSim {
  const s = newRun(seed, m); let li = 0
  while (!s.dead && s.tick < endTick) {
    let inp: RIn = 0
    if (li < log.length && log[li][0] <= s.tick) { inp = (log[li][1] | 0) as RIn; li++ }
    runStep(s, inp)
  }
  return s
}
