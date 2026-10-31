/**
 * Драка: детерминированная симуляция, 60 тиков в секунду, только целые числа.
 * Точно такая же логика есть на сервере (fight_sim.py): сервер переигрывает бой по записи нажатий
 * и сам решает, кто победил, — подделать победу из браузера нельзя.
 * Любая правка здесь = такая же правка в fight_sim.py (иначе бои перестанут сходиться).
 */
export const TPS = 60
export const ROUND_TICKS = 60 * TPS          // раунд 60 с
export const WIN_ROUNDS = 2                  // до двух побед
export const HP = 1000
export const ARENA = 520                     // половина ширины арены, см
export const BODY = 52                       // ширина тела, см (минимальная дистанция между бойцами = 2·BODY)
export const MAX_GAP = 420                   // дальше не разойтись — оба всегда в кадре (как в классических файтингах)
export const START = 130                     // стартовая позиция, см от центра

// кнопки игрока (битовая маска)
export const IN_L = 1, IN_R = 2, IN_BLOCK = 4, IN_P = 8, IN_K = 16, IN_S = 32

export type MoveId = 'jab' | 'cross' | 'hook' | 'upper' | 'low' | 'kick' | 'round' | 'special' | 'combo' | 'throw'
export interface Move { s: number; a: number; r: number; dmg: number; reach: number; stun: number; kd: number; push: number; next?: MoveId }
// s — подготовка, a — активные кадры, r — восстановление (кадры); reach — дальность, см; kd — сбивает с ног
export const MOVES: Record<MoveId, Move> = {
  jab: { s: 5, a: 3, r: 10, dmg: 45, reach: 96, stun: 15, kd: 0, push: 10, next: 'cross' },
  cross: { s: 7, a: 3, r: 13, dmg: 70, reach: 104, stun: 17, kd: 0, push: 14, next: 'hook' },
  hook: { s: 9, a: 3, r: 16, dmg: 90, reach: 94, stun: 19, kd: 0, push: 18, next: 'upper' },
  upper: { s: 12, a: 4, r: 22, dmg: 125, reach: 86, stun: 0, kd: 1, push: 40 },
  low: { s: 8, a: 3, r: 14, dmg: 55, reach: 124, stun: 15, kd: 0, push: 12, next: 'kick' },
  kick: { s: 12, a: 4, r: 20, dmg: 105, reach: 136, stun: 20, kd: 0, push: 22, next: 'round' },
  round: { s: 16, a: 5, r: 26, dmg: 150, reach: 142, stun: 0, kd: 1, push: 50 },
  special: { s: 18, a: 12, r: 28, dmg: 210, reach: 165, stun: 0, kd: 1, push: 70 },
  combo: { s: 6, a: 22, r: 18, dmg: 34, reach: 100, stun: 12, kd: 0, push: 6 },   // серия стража: бьёт каждые 4 кадра активной фазы
  throw: { s: 4, a: 2, r: 20, dmg: 120, reach: 92, stun: 0, kd: 1, push: 60 },      // бросок: блоком не защититься
}
export const COMBO_GAP = 4

export type St = 'idle' | 'fwd' | 'back' | 'atk' | 'block' | 'bstun' | 'hit' | 'down' | 'up' | 'dodge' | 'dash' | 'ko' | 'win'
export interface F {
  x: number; hp: number; st: St; t: number; mv: MoveId | null; hitDone: number; chain: number; meter: number
  dir: number; hitKind: number   // hitKind: 0 лёгкий, 1 в корпус, 2 сильный
}
export interface Ev { k: 'hit' | 'block' | 'whiff' | 'kd' | 'ko' | 'round' | 'start' | 'special' | 'dodge' | 'time'; who: 0 | 1; mv?: MoveId; dmg?: number }
export interface Sim {
  tick: number; rt: number; round: number; wins: [number, number]; pause: number; over: number   // over: 0 идёт, 1 игрок победил, 2 страж
  f: [F, F]; rng: number; prevIn: number; buf: number; bufT: number; tapF: number
  ai: { cd: number; plan: number; read: number; rage: number }
  ev: Ev[]
}

const mkF = (x: number, dir: number): F => ({ x, hp: HP, st: 'idle', t: 0, mv: null, hitDone: 0, chain: 0, meter: 0, dir, hitKind: 0 })

export function newSim(seed: number): Sim {
  return {
    tick: 0, rt: ROUND_TICKS, round: 1, wins: [0, 0], pause: 120, over: 0,
    f: [mkF(-START, 1), mkF(START, -1)], rng: (seed >>> 0) || 0x9e3779b9, prevIn: 0, buf: 0, bufT: 0, tapF: 0,
    ai: { cd: 40, plan: 0, read: 0, rage: 0 }, ev: [{ k: 'round', who: 0 }],
  }
}

/** xorshift32 → 0..999 */
const rnd = (s: Sim) => { let x = s.rng; x ^= (x << 13) >>> 0; x >>>= 0; x ^= x >>> 17; x ^= (x << 5) >>> 0; x >>>= 0; s.rng = x; return x % 1000 }

const busy = (f: F) => f.st === 'atk' || f.st === 'dash' || f.st === 'hit' || f.st === 'bstun' || f.st === 'down' || f.st === 'up' || f.st === 'dodge' || f.st === 'ko' || f.st === 'win'
const moveLen = (m: MoveId) => MOVES[m].s + MOVES[m].a + MOVES[m].r

function startMove(s: Sim, i: 0 | 1, m: MoveId) {
  const f = s.f[i]
  if (m === 'special') { if (f.meter < 1000) return false; f.meter = 0; s.ev.push({ k: 'special', who: i }) }
  f.st = 'atk'; f.mv = m; f.t = 0; f.hitDone = 0
  return true
}

function resetRound(s: Sim) {
  s.f = [mkF(-START, 1), mkF(START, -1)]; s.rt = ROUND_TICKS; s.pause = 120; s.ai.cd = 40; s.ai.plan = 0; s.buf = 0; s.bufT = 0
  s.ev.push({ k: 'round', who: 0 })
}

function endRound(s: Sim, winner: 0 | 1) {
  s.wins[winner]++
  s.f[winner].st = 'win'; s.f[winner].t = 0
  if (s.f[1 - winner].st !== 'ko') { s.f[1 - winner].st = 'ko'; s.f[1 - winner].t = 0 }
  if (s.wins[winner] >= WIN_ROUNDS) s.over = winner === 0 ? 1 : 2
  s.pause = -180   // отрицательная пауза = заставка после раунда
}

function damage(s: Sim, ai: 0 | 1, di: 0 | 1, mv: MoveId) {
  const A = s.f[ai], D = s.f[di], M = MOVES[mv]
  const boss = ai === 1
  // страж бьёт сильнее, игрок — слабее (по задумке страж почти непобедим)
  let dmg = boss ? (M.dmg * 10) / 10 : (M.dmg * 11) / 10
  dmg = Math.floor(dmg)
  const blocking = D.st === 'block' || (D.st === 'bstun')
  if (D.st === 'dodge' && D.t < 14) { s.ev.push({ k: 'dodge', who: di }); return }
  // страж «вырывается» из серии ударов: после второго удара цепочки — шанс 30 %
  if (di === 1 && !blocking && (mv === 'cross' || mv === 'hook' || mv === 'upper') && rnd(s) < 220) {
    D.st = 'dodge'; D.t = 0; s.ev.push({ k: 'dodge', who: 1 }); return
  }
  if (blocking && mv !== 'special' && mv !== 'throw') {
    const chip = Math.floor(dmg / 8)
    D.hp = Math.max(0, D.hp - chip); D.st = 'bstun'; D.t = 0; D.hitKind = 0
    D.x -= D.dir * Math.floor(M.push / 2)
    A.meter = Math.min(1000, A.meter + 40); D.meter = Math.min(1000, D.meter + 60)
    s.ev.push({ k: 'block', who: di, mv, dmg: chip })
  } else {
    D.hp = Math.max(0, D.hp - dmg)
    A.meter = Math.min(1000, A.meter + 90); D.meter = Math.min(1000, D.meter + 50)
    D.x -= D.dir * M.push
    if (D.hp <= 0) { D.st = 'ko'; D.t = 0; s.ev.push({ k: 'ko', who: di, mv, dmg }); endRound(s, ai); return }
    if (M.kd) { D.st = 'down'; D.t = 0; s.ev.push({ k: 'kd', who: di, mv, dmg }) }
    else { D.st = 'hit'; D.t = 0; D.hitKind = mv === 'low' || mv === 'kick' || mv === 'combo' ? 1 : mv === 'hook' || mv === 'cross' ? 2 : 0; s.ev.push({ k: 'hit', who: di, mv, dmg }) }
    D.mv = null; D.chain = 0
  }
}

function stepFighter(s: Sim, i: 0 | 1) {
  const f = s.f[i], o = s.f[1 - i]
  f.t++
  if (f.st === 'atk' && f.mv) {
    const M = MOVES[f.mv]
    const dist = Math.abs(o.x - f.x)
    if (f.t > M.s && f.t <= M.s + M.a) {
      if (f.mv === 'combo') {
        if ((f.t - M.s) % COMBO_GAP === 1 && dist <= M.reach && o.st !== 'down' && o.st !== 'ko') damage(s, i, (1 - i) as 0 | 1, 'combo')
      } else if (!f.hitDone && dist <= M.reach && o.st !== 'down' && o.st !== 'up' && o.st !== 'ko') { f.hitDone = 1; damage(s, i, (1 - i) as 0 | 1, f.mv) }
      if (f.mv === 'special') f.x += f.dir * 6
    }
    if (f.t === M.s + M.a && !f.hitDone && f.mv !== 'combo') s.ev.push({ k: 'whiff', who: i, mv: f.mv })
    if (f.t >= moveLen(f.mv)) { f.st = 'idle'; f.t = 0; f.mv = null }
  } else if (f.st === 'hit') { if (f.t >= (f.hitKind === 2 ? 22 : 18)) { f.st = 'idle'; f.t = 0 } }
  else if (f.st === 'bstun') { if (f.t >= 10) { f.st = s.f[i].st === 'bstun' ? 'block' : f.st; f.t = 0 } }
  else if (f.st === 'down') { if (f.t >= 70) { f.st = 'up'; f.t = 0 } }
  else if (f.st === 'up') { if (f.t >= 50) { f.st = 'idle'; f.t = 0 } }
  else if (f.st === 'dodge') { f.x -= f.dir * (f.t < 12 ? 9 : 0); if (f.t >= 24) { f.st = 'idle'; f.t = 0 } }
  else if (f.st === 'dash') { f.x += f.dir * 13; if (f.t >= 9) { f.st = 'idle'; f.t = 0 } }
}

function separate(s: Sim) {
  const [a, b] = s.f
  for (const f of s.f) f.x = Math.max(-ARENA, Math.min(ARENA, f.x))
  const gap = b.x - a.x
  if (gap < 2 * BODY) { const push = 2 * BODY - gap; const pa = push >> 1; a.x -= pa; b.x += push - pa
    if (a.x < -ARENA) { b.x += -ARENA - a.x; a.x = -ARENA } if (b.x > ARENA) { a.x -= b.x - ARENA; b.x = ARENA } }
  const g2 = b.x - a.x
  if (g2 > MAX_GAP) { const ex = g2 - MAX_GAP; const ea = ex >> 1; a.x += ea; b.x -= ex - ea }
}

/** решение игрока по нажатиям (с буфером: удар, нажатый чуть раньше конца анимации, выполнится сразу после) */
function player(s: Sim, inp: number) {
  const f = s.f[0]
  const press = inp & ~s.prevIn
  if (press & (IN_P | IN_K | IN_S)) { s.buf = press & (IN_P | IN_K | IN_S); s.bufT = 10 }
  else if (s.bufT > 0) s.bufT--
  else s.buf = 0
  if (f.st === 'atk' && f.mv && s.buf) {   // цепочка: следующий удар в окне восстановления после попадания
    const M = MOVES[f.mv], into = f.t - M.s - M.a
    if (f.hitDone && M.next && into >= 0 && into <= 8 && ((s.buf & IN_P && ['jab', 'cross', 'hook'].includes(f.mv)) || (s.buf & IN_K && ['low', 'kick'].includes(f.mv)))) {
      startMove(s, 0, M.next); s.buf = 0; s.bufT = 0; return
    }
  }
  if (busy(f)) return
  if (s.buf & IN_S && f.meter >= 1000) { startMove(s, 0, 'special'); s.buf = 0; return }
  if (s.buf & IN_P) { startMove(s, 0, 'jab'); s.buf = 0; return }
  if (s.buf & IN_K) { startMove(s, 0, 'low'); s.buf = 0; return }
  if (inp & IN_BLOCK) { if (f.st !== 'block') { f.st = 'block'; f.t = 0 } return }
  const toward = f.dir > 0 ? IN_R : IN_L, away = f.dir > 0 ? IN_L : IN_R
  if (inp & toward) {
    if ((press & toward) && s.tapF > 0 && s.tapF < 10) { f.st = 'dash'; f.t = 0; s.tapF = 0 }   // двойное «вперёд» — рывок
    else { f.st = 'fwd'; f.x += f.dir * 4; if (press & toward) s.tapF = 1 }
  }
  else if (inp & away) {
    if ((press & away) && s.ai.read > 0 && s.ai.read < 9) { f.st = 'dodge'; f.t = 0; s.ai.read = 0 }   // двойное «назад» — отскок
    else { f.st = 'back'; f.x -= f.dir * 3 }
    s.ai.read = press & away ? 1 : s.ai.read
  } else if (f.st === 'fwd' || f.st === 'back' || f.st === 'block') { f.st = 'idle'; f.t = 0 }
  if (s.ai.read > 0) s.ai.read++
  if (s.ai.read > 12) s.ai.read = 0
  if (s.tapF > 0) s.tapF++
  if (s.tapF > 12) s.tapF = 0
}

/** Страж: читает подготовку ударов, почти всегда защищается и наказывает промахи */
function boss(s: Sim) {
  const f = s.f[1], p = s.f[0], ai = s.ai
  const dist = Math.abs(p.x - f.x)
  const lowHp = f.hp < 350
  ai.rage = lowHp ? 1 : 0
  if (f.st === 'block' || f.st === 'bstun') {
    // держит блок, пока игрок атакует; сразу после — контратака
    if (f.st === 'block' && !(p.st === 'atk' && p.mv && p.t <= MOVES[p.mv].s + MOVES[p.mv].a)) {
      if (dist <= 105) { startMove(s, 1, rnd(s) < 500 ? 'cross' : 'hook'); return }
      f.st = 'idle'; f.t = 0
    }
    if (f.st === 'block') return
  }
  if (busy(f)) return
  // бросок, если игрок долго стоит в блоке рядом
  if (p.st === 'block' && p.t > 50 && dist <= MOVES.throw.reach && rnd(s) < 600) { startMove(s, 1, 'throw'); return }
  // защита: видит подготовку удара игрока
  if (p.st === 'atk' && p.mv && p.t <= MOVES[p.mv].s + 1 && dist <= MOVES[p.mv].reach + 30) {
    const r = rnd(s)
    const blockP = 850 + ai.rage * 50       // ~88–93 % блок
    if (r < blockP) { f.st = 'block'; f.t = 0; return }
    if (r < blockP + 45) { f.st = 'dodge'; f.t = 0; ai.cd = 4; return }
  }
  // наказание: игрок промахнулся или восстанавливается
  if (p.st === 'atk' && p.mv && p.t > MOVES[p.mv].s + MOVES[p.mv].a && dist <= 140) {
    const left = moveLen(p.mv) - p.t
    startMove(s, 1, left > 14 ? 'round' : left > 9 ? 'kick' : 'jab'); return
  }
  if ((p.st === 'up' && p.t > 40) || p.st === 'hit') { if (dist <= 100) { startMove(s, 1, p.st === 'hit' ? 'hook' : 'combo'); return } }
  if (f.meter >= 1000 && dist <= 160 && p.st !== 'down' && p.st !== 'up' && rnd(s) < 120) { startMove(s, 1, 'special'); return }
  if (ai.cd > 0) { ai.cd--; if (dist > 150) { f.st = 'fwd'; f.x += f.dir * 5 } else if (f.st === 'fwd') { f.st = 'idle'; f.t = 0 } return }
  // нападение
  if (p.st === 'down') { if (dist > 200) { f.st = 'fwd'; f.x += f.dir * 5 } return }
  if (dist > 150) { f.st = 'fwd'; f.x += f.dir * 5; return }
  const r = rnd(s)
  if (dist <= 100) {
    if (p.st === 'block') { if (r < 450) startMove(s, 1, 'low'); else if (r < 600) { f.st = 'back'; f.x -= f.dir * 30; ai.cd = 8 } else startMove(s, 1, 'combo') }
    else if (r < 300) startMove(s, 1, 'jab')
    else if (r < 560) startMove(s, 1, 'combo')
    else if (r < 760) startMove(s, 1, 'upper')
    else startMove(s, 1, 'hook')
  } else if (dist <= 124) {
    if (r < 500) startMove(s, 1, 'kick'); else if (r < 800) startMove(s, 1, 'low'); else startMove(s, 1, 'round')
  } else if (dist <= 136) {
    if (r < 600) startMove(s, 1, 'kick'); else startMove(s, 1, 'round')
  } else {
    if (r < 450) startMove(s, 1, 'round'); else { f.st = 'fwd'; f.x += f.dir * 8 }
  }
  ai.cd = 6 + (rnd(s) % (lowHp ? 8 : 16))
}

/** один тик симуляции; inp — кнопки игрока на этом тике */
export function step(s: Sim, inp: number) {
  s.ev = []
  s.tick++
  if (s.over) { for (const i of [0, 1] as const) s.f[i].t++; return }
  if (s.pause > 0) { s.pause--; if (s.pause === 0) s.ev.push({ k: 'start', who: 0 }); s.prevIn = inp; return }
  if (s.pause < 0) { s.pause++; for (const i of [0, 1] as const) s.f[i].t++; if (s.pause === 0) resetRound(s); s.prevIn = inp; return }
  player(s, inp)
  boss(s)
  stepFighter(s, 0); if (s.pause < 0) { s.prevIn = inp; return }
  stepFighter(s, 1); if (s.pause < 0) { s.prevIn = inp; return }
  for (const f of s.f) if (f.st === 'fwd' || f.st === 'back' || f.st === 'idle' || f.st === 'block') f.t = f.st === 'block' ? f.t + 1 : f.t
  separate(s)
  s.rt--
  if (s.rt <= 0) { s.ev.push({ k: 'time', who: 0 }); endRound(s, s.f[0].hp > s.f[1].hp ? 0 : 1) }
  s.prevIn = inp
}

/** запись нажатий: [тик, маска] при каждом изменении */
export type InputLog = [number, number][]
export function replay(seed: number, log: InputLog, maxTicks = 60 * 60 * 8): Sim {
  const s = newSim(seed); let li = 0, cur = 0
  while (!s.over && s.tick < maxTicks) { while (li < log.length && log[li][0] <= s.tick) { cur = log[li][1]; li++ } step(s, cur) }
  return s
}
