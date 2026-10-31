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
export const BODY = 46                       // половина «тела», см: ближе 92 см бойцы не сходятся (модели не проходят друг в друга)
export const MAX_GAP = 420                   // дальше не разойтись — оба всегда в кадре (как в классических файтингах)
export const START = 130                     // стартовая позиция, см от центра

// кнопки игрока (битовая маска)
export const IN_L = 1, IN_R = 2, IN_BLOCK = 4, IN_P = 8, IN_K = 16, IN_S = 32, IN_U = 64, IN_D = 128, IN_P2 = 256, IN_K2 = 512
/** четыре кнопки ударов, как в MK: передняя/задняя рука, передняя/задняя нога */
const ANYP = IN_P | IN_P2, ANYK = IN_K | IN_K2, ATK = ANYP | ANYK | IN_S
export const JV = 60, GRAV = 3               // прыжок: высота y в четвертях сантиметра (≈150 см, 40 тиков в воздухе)
export const AIR_HIT_Y = 520                 // удар в прыжке достаёт стоящего, когда ниже 130 см

export type MoveId = 'jab' | 'cross' | 'hook' | 'upper' | 'low' | 'kick' | 'round' | 'special' | 'combo' | 'throw'
  | 'elbow' | 'knee' | 'high' | 'spin' | 'cupper' | 'sweep' | 'jkick' | 'jknee' | 'cjab' | 'ckick'
/** h — уровень удара: H верхний (над присевшим проходит мимо), M средний, L нижний (стоячий блок не держит), O сверху/в прыжке (присевший блок не держит)
 *  aa — достаёт противника в воздухе; air — удар в прыжке */
export type Lvl = 'H' | 'M' | 'L' | 'O'
export interface Move { s: number; a: number; r: number; dmg: number; reach: number; stun: number; kd: number; push: number; h: Lvl; aa?: 1; air?: 1; next?: MoveId }
// s — подготовка, a — активные кадры, r — восстановление (кадры); reach — дальность, см; kd — сбивает с ног
export const MOVES: Record<MoveId, Move> = {
  jab: { s: 5, a: 3, r: 10, dmg: 45, reach: 96, stun: 15, kd: 0, push: 4, h: 'H', next: 'cross' },
  cross: { s: 7, a: 3, r: 13, dmg: 70, reach: 104, stun: 17, kd: 0, push: 6, h: 'H', next: 'hook' },
  hook: { s: 9, a: 3, r: 16, dmg: 90, reach: 94, stun: 19, kd: 0, push: 10, h: 'H', next: 'upper' },
  upper: { s: 12, a: 4, r: 22, dmg: 125, reach: 100, stun: 0, kd: 1, push: 40, h: 'M', aa: 1 },
  low: { s: 8, a: 3, r: 14, dmg: 55, reach: 124, stun: 15, kd: 0, push: 4, h: 'L', next: 'kick' },
  kick: { s: 12, a: 4, r: 20, dmg: 105, reach: 136, stun: 20, kd: 0, push: 8, h: 'M', next: 'round' },
  round: { s: 16, a: 5, r: 26, dmg: 150, reach: 142, stun: 0, kd: 1, push: 50, h: 'H', aa: 1 },
  special: { s: 18, a: 12, r: 28, dmg: 210, reach: 165, stun: 0, kd: 1, push: 70, h: 'M', aa: 1 },
  combo: { s: 6, a: 22, r: 18, dmg: 34, reach: 100, stun: 12, kd: 0, push: 6, h: 'H' },   // серия стража: бьёт каждые 4 кадра активной фазы
  throw: { s: 4, a: 2, r: 20, dmg: 120, reach: 98, stun: 0, kd: 1, push: 60, h: 'M' },      // бросок: блоком не защититься
  elbow: { s: 7, a: 3, r: 14, dmg: 85, reach: 96, stun: 20, kd: 0, push: 20, h: 'M' },      // вперёд + рука
  knee: { s: 8, a: 4, r: 16, dmg: 95, reach: 94, stun: 22, kd: 0, push: 24, h: 'M' },       // вперёд + нога вплотную
  high: { s: 11, a: 4, r: 20, dmg: 120, reach: 140, stun: 22, kd: 0, push: 30, h: 'H', aa: 1 },   // вперёд + нога: высокий удар
  spin: { s: 15, a: 4, r: 24, dmg: 140, reach: 132, stun: 0, kd: 1, push: 50, h: 'M' },      // назад + нога: вертушка
  cupper: { s: 10, a: 4, r: 24, dmg: 140, reach: 98, stun: 0, kd: 1, push: 45, h: 'M', aa: 1 },   // присед + рука: апперкот
  sweep: { s: 10, a: 4, r: 22, dmg: 90, reach: 140, stun: 0, kd: 1, push: 30, h: 'L' },     // присед + нога: подсечка
  jkick: { s: 5, a: 9, r: 6, dmg: 110, reach: 125, stun: 22, kd: 0, push: 30, h: 'O', air: 1 },
  jknee: { s: 4, a: 9, r: 6, dmg: 100, reach: 100, stun: 22, kd: 0, push: 24, h: 'O', air: 1 },
  cjab: { s: 4, a: 3, r: 10, dmg: 35, reach: 98, stun: 12, kd: 0, push: 8, h: 'M' },        // присед + рука 1: тычок
  ckick: { s: 6, a: 3, r: 13, dmg: 50, reach: 125, stun: 14, kd: 0, push: 12, h: 'L' },     // присед + нога 1: низкий удар вперёд по ногам
}
export const COMBO_GAP = 4

export type St = 'idle' | 'fwd' | 'back' | 'atk' | 'block' | 'bstun' | 'hit' | 'down' | 'up' | 'dodge' | 'dash' | 'ko' | 'win' | 'crouch' | 'cblock' | 'jump' | 'land'
export interface F {
  x: number; hp: number; st: St; t: number; mv: MoveId | null; hitDone: number; chain: number; meter: number
  dir: number; hitKind: number   // hitKind: 0 лёгкий, 1 в корпус, 2 сильный; при падении: 0 обычное, 3 подсечка, 4 апперкот
  y: number; vy: number; vx: number; air: number; cr: number; jat: number   // прыжок; cr — в приседе; jat — уже бил в этом прыжке
  stn: number; k: number   // stn — длина оглушения (удар/блок, кадры); k — сколько ударов подряд пропущено (снижение урона в серии)
}
/** уровни: 1 — Страж (идеальный бот выигрывает ~5 %), 2 — Призрак (~2 %). mg — заряд спецприёма игрока, ‰; rs — страж восстанавливается в 2^rs раз быстрее */
export const LV = [null,
  { bm: 157, pm: 67, br: 430, bp: 965, rs: 0, cd: 6, cdl: 7, cdh: 14, mg: 1100 },   // страж: ~5 % побед идеального бота
  { bm: 180, pm: 58, br: 520, bp: 985, rs: 0, cd: 4, cdl: 5, cdh: 9, mg: 1100 },   // призрак: ~2 %
  // облегчённые уровни — только для админа (сервер сам решает, кому их дать)
  { bm: 90, pm: 130, br: 80, bp: 550, rs: 0, cd: 12, cdl: 12, cdh: 22, mg: 1100 },
  { bm: 100, pm: 115, br: 120, bp: 650, rs: 0, cd: 10, cdl: 10, cdh: 18, mg: 1100 },
  // бой с другом: всё поровну
  { bm: 100, pm: 100, br: 0, bp: 0, rs: 0, cd: 0, cdl: 1, cdh: 1, mg: 1000 },
] as const
/** управление бойцом в бою с другом (у каждого своё) */
export interface Ctl { prevIn: number; buf: number; bufT: number; tapF: number; lastP: number; read: number }
const mkC = (): Ctl => ({ prevIn: 0, buf: 0, bufT: 0, tapF: 0, lastP: -999, read: 0 })
export interface Ev { k: 'hit' | 'block' | 'whiff' | 'kd' | 'ko' | 'round' | 'start' | 'special' | 'dodge' | 'time' | 'jump' | 'land' | 'boss2' | 'tech'; who: 0 | 1; mv?: MoveId; dmg?: number }
export interface Sim {
  tick: number; rt: number; round: number; wins: [number, number]; pause: number; over: number   // over: 0 идёт, 1 игрок победил, 2 страж
  f: [F, F]; rng: number; prevIn: number; buf: number; bufT: number; tapF: number; lastP: number
  pend: [0 | 1, MoveId][]   // попадания этого тика: применяются после хода обоих — так удары могут встретиться (размен)
  ai: { cd: number; read: number; rage: number }
  lv: number; nextLv: number; ez: number; pvp: number; c: [Ctl, Ctl]   // pvp=1 — бой с другом (оба бойца — люди); ez=1 — облегчённый бой (админ); текущий страж и переход ко второму после победы над первым
  ev: Ev[]
}

const mkF = (x: number, dir: number): F => ({ x, hp: HP, st: 'idle', t: 0, mv: null, hitDone: 0, chain: 0, meter: 0, dir, hitKind: 0, y: 0, vy: 0, vx: 0, air: 0, cr: 0, jat: 0, stn: 0, k: 0 })

export function newSim(seed: number, lv = 1, ez = 0, pvp = 0): Sim {
  return {
    tick: 0, rt: ROUND_TICKS, round: 1, wins: [0, 0], pause: 120, over: 0, lv: lv === 2 ? 2 : 1, nextLv: 0, ez: ez ? 1 : 0, pvp: pvp ? 1 : 0, c: [mkC(), mkC()],
    f: [mkF(-START, 1), mkF(START, -1)], rng: (seed >>> 0) || 0x9e3779b9, prevIn: 0, buf: 0, bufT: 0, tapF: 0, lastP: -999, pend: [],
    ai: { cd: 40, read: 0, rage: 0 }, ev: [{ k: 'round', who: 0 }],
  }
}

/** xorshift32 → 0..999 */
const rnd = (s: Sim) => { let x = s.rng; x ^= (x << 13) >>> 0; x >>>= 0; x ^= x >>> 17; x ^= (x << 5) >>> 0; x >>>= 0; s.rng = x; return x % 1000 }

const lp = (s: Sim) => s.pvp ? LV[5]! : LV[s.lv + (s.ez ? 2 : 0)]!
const busy = (f: F) => f.st === 'atk' || f.st === 'dash' || f.st === 'hit' || f.st === 'bstun' || f.st === 'down' || f.st === 'up' || f.st === 'dodge' || f.st === 'ko' || f.st === 'win' || f.st === 'jump' || f.st === 'land' || f.air === 1
const moveLen = (m: MoveId) => MOVES[m].s + MOVES[m].a + MOVES[m].r
/** длина удара у конкретного бойца: страж восстанавливается вдвое быстрее (его почти не наказать) */
export const lenOf = (i: number, m: MoveId, lv = 1) => i === 1 ? MOVES[m].s + MOVES[m].a + (MOVES[m].r >> LV[lv]!.rs) : moveLen(m)
const low = (f: F) => f.st === 'crouch' || f.st === 'cblock' || ((f.st === 'atk' || f.st === 'bstun') && f.cr === 1)

function startMove(s: Sim, i: 0 | 1, m: MoveId) {
  const f = s.f[i]
  if (m === 'special') { if (f.meter < 1000) return false; f.meter = 0; s.ev.push({ k: 'special', who: i }) }
  f.cr = m === 'cupper' || m === 'sweep' || m === 'cjab' || m === 'ckick' ? 1 : 0
  if (MOVES[m].air) f.jat = 1
  f.st = 'atk'; f.mv = m; f.t = 0; f.hitDone = 0
  return true
}

function jump(s: Sim, i: 0 | 1, dirx: number) {
  const f = s.f[i]
  f.st = 'jump'; f.t = 0; f.air = 1; f.vy = JV; f.vx = dirx * (dirx === f.dir ? 5 : 4); f.cr = 0; f.jat = 0
  s.ev.push({ k: 'jump', who: i })
}

function resetRound(s: Sim) {
  if (s.nextLv) { s.lv = s.nextLv; s.nextLv = 0; s.wins = [0, 0]; s.ev.push({ k: 'boss2', who: 1 }) }
  s.f = [mkF(-START, 1), mkF(START, -1)]; s.rt = ROUND_TICKS; s.pause = 120; s.ai.cd = 40; s.ai.read = 0; s.tapF = 0; s.lastP = -999; s.buf = 0; s.bufT = 0; s.round++; s.c = [mkC(), mkC()]
  s.ev.push({ k: 'round', who: 0 })
}

/** ничья по времени: раунд переигрывается, победа никому не засчитывается */
function drawRound(s: Sim) {
  for (const f of s.f) { f.st = 'idle'; f.t = 0; f.mv = null }
  s.pause = -150
}

function endRound(s: Sim, winner: 0 | 1) {
  s.wins[winner]++
  s.f[winner].st = 'win'; s.f[winner].t = 0
  if (s.f[1 - winner].st !== 'ko') { s.f[1 - winner].st = 'ko'; s.f[1 - winner].t = 0 }
  if (s.wins[winner] >= WIN_ROUNDS) { if (winner === 0 && s.lv === 1 && !s.pvp) s.nextLv = 2; else s.over = winner === 0 ? 1 : 2 }
  s.pause = -180   // отрицательная пауза = заставка после раунда
}

/** достаёт ли удар: верхние проходят над присевшим, по летящему попадают только «противовоздушные» и удары в прыжке */
function connects(A: F, D: F, M: Move) {
  if (D.st === 'down' || D.st === 'up' || D.st === 'ko') return false
  if (D.air) return !!(M.aa || M.air)
  if (M.air && A.y > AIR_HIT_Y) return false
  if (M.h === 'H' && low(D)) return false
  if (M === MOVES.throw && (low(D) || D.st === 'hit' || D.st === 'bstun')) return false   // бросок не берёт присевшего и оглушённого
  return true
}

/** толчок с учётом угла: если защитника уже некуда двигать (стена), отъезжает нападающий */
function shove(D: F, A: F, d: number) {
  D.x -= D.dir * d
  const over = Math.abs(D.x) - ARENA
  if (over > 0) { D.x = D.x > 0 ? ARENA : -ARENA; A.x -= A.dir * over }
}

function damage(s: Sim, ai: 0 | 1, di: 0 | 1, mv: MoveId) {
  const A = s.f[ai], D = s.f[di], M = MOVES[mv]
  const boss = ai === 1 && !s.pvp
  // страж бьёт сильнее, игрок — слабее (по задумке страж почти непобедим)
  const P = lp(s)
  let dmg = Math.floor((M.dmg * (boss ? P.bm : P.pm)) / 100)
  const sBlock = D.st === 'block' || (D.st === 'bstun' && D.cr === 0)
  const cBlock = D.st === 'cblock' || (D.st === 'bstun' && D.cr === 1)
  const blocking = !D.air && mv !== 'throw' && ((sBlock && M.h !== 'L') || (cBlock && M.h !== 'O'))
  if (D.st === 'dodge' && D.t < 14) { s.ev.push({ k: 'dodge', who: di }); return }
  // выход из броска (как в MK): игрок нажал руку (без блока) незадолго до захвата
  if (mv === 'throw' && (di === 0 || s.pvp) && s.tick - (s.pvp ? s.c[di].lastP : s.lastP) <= 10) {
    shove(D, A, 40); A.x -= A.dir * 40; s.ev.push({ k: 'tech', who: di }); return
  }
  // страж «вырывается» из серии — только из свободного состояния и за счёт шкалы (как Breakaway в MK)
  if (di === 1 && !s.pvp && !blocking && !D.air && (D.st === 'idle' || D.st === 'fwd' || D.st === 'back') && D.meter >= 300
      && (mv === 'cross' || mv === 'hook' || mv === 'upper') && rnd(s) < P.br) {
    D.meter -= 300; D.st = 'dodge'; D.t = 0; D.cr = 0; s.ev.push({ k: 'dodge', who: 1 }); return
  }
  // сколько кадров нападающему ещё восстанавливаться: от этого считаются оглушение и преимущество
  const rem = Math.max(0, lenOf(s.pvp ? 0 : ai, mv, s.lv) - A.t)
  if (blocking) {
    const chip = mv === 'special' ? dmg >> 3 : 0   // обычные удары в блок урона не наносят, спецприём — чуть-чуть
    D.hp = Math.max(0, D.hp - chip)
    if (D.hp <= 0) { D.st = 'ko'; D.t = 0; s.ev.push({ k: 'ko', who: di, mv, dmg: chip }); endRound(s, ai); return }
    D.cr = cBlock ? 1 : 0; D.st = 'bstun'; D.t = 0; D.hitKind = 0; D.k = 0
    D.stn = mv === 'combo' ? Math.max(6, M.stun - 4) : Math.max(4, rem - 7 - (M.dmg >> 3))   // большинство ударов в блоке «минусовые», тяжёлые можно наказать
    shove(D, A, M.push >> 1)
    A.meter = Math.min(1000, A.meter + (boss ? 40 : Math.floor(40 * P.mg / 1000))); D.meter = Math.min(1000, D.meter + (boss ? Math.floor(60 * P.mg / 1000) : 60))
    if (mv === 'special') A.meter = Math.min(1000, A.meter + 150)   // спецприём в блок — небольшой возврат шкалы
    s.ev.push({ k: 'block', who: di, mv, dmg: chip })
  } else {
    // серия: каждый следующий пропущенный подряд удар слабее на 10 % (до −50 %)
    D.k = D.st === 'hit' || D.st === 'down' ? D.k + 1 : 0
    dmg = Math.floor((dmg * (100 - 10 * Math.min(D.k, 5))) / 100)
    D.hp = Math.max(0, D.hp - dmg)
    A.meter = Math.min(1000, A.meter + (boss ? 90 : Math.floor(90 * P.mg / 1000))); D.meter = Math.min(1000, D.meter + (boss ? Math.floor(50 * P.mg / 1000) : 50))
    shove(D, A, M.push)
    D.cr = 0
    if (D.hp <= 0) { D.st = 'ko'; D.t = 0; s.ev.push({ k: 'ko', who: di, mv, dmg }); endRound(s, ai); return }
    if (M.kd || D.air) {
      D.st = 'down'; D.t = 0; D.hitKind = mv === 'sweep' ? 3 : mv === 'upper' || mv === 'cupper' ? 4 : 0
      if (D.air) { D.vx = -D.dir * 3; if (D.vy < 12) D.vy = 12 }
      s.ev.push({ k: 'kd', who: di, mv, dmg })
    }
    else {
      D.st = 'hit'; D.t = 0; D.stn = mv === 'combo' ? M.stun : Math.max(10, rem + (M.stun >> 2))
      D.hitKind = mv === 'low' || mv === 'kick' || mv === 'combo' || mv === 'knee' || mv === 'ckick' ? 1 : mv === 'hook' || mv === 'cross' || mv === 'high' || mv === 'elbow' ? 2 : 0
      s.ev.push({ k: 'hit', who: di, mv, dmg })
    }
    D.mv = null; D.chain = 0
  }
}

function physics(s: Sim, i: 0 | 1) {
  const f = s.f[i]
  if (!f.air) return
  f.x += f.vx; f.y += f.vy; f.vy -= GRAV
  if (f.y <= 0) {
    f.y = 0; f.vy = 0; f.vx = 0; f.air = 0
    // приземление: короткая заминка (после удара в прыжке — дольше)
    if (f.st === 'jump' || (f.st === 'atk' && f.mv && MOVES[f.mv].air)) { f.stn = f.st === 'atk' ? 5 : 2; f.st = 'land'; f.t = 0; f.mv = null }
    s.ev.push({ k: 'land', who: i })
  }
}

function stepFighter(s: Sim, i: 0 | 1) {
  const f = s.f[i], o = s.f[1 - i]
  f.t++
  physics(s, i)
  if (f.st === 'atk' && f.mv) {
    const M = MOVES[f.mv]
    const dist = Math.abs(o.x - f.x)
    // удар в прыжке (как в MK) держится вытянутым до приземления
    if (f.t > M.s && (f.t <= M.s + M.a || (M.air && f.air))) {
      if (f.mv === 'combo') {
        if ((f.t - M.s) % COMBO_GAP === 1 && dist <= M.reach && connects(f, o, M)) s.pend.push([i, 'combo'])
      } else if (!f.hitDone && dist <= M.reach && connects(f, o, M)) { f.hitDone = 1; s.pend.push([i, f.mv]) }
      if (f.mv === 'special') f.x += f.dir * 6
    }
    if (f.st === 'atk' && f.mv) {
      if (f.t === M.s + M.a && !f.hitDone && f.mv !== 'combo' && !M.air) s.ev.push({ k: 'whiff', who: i, mv: f.mv })
      // после удара игрок остаётся сидеть, если держит «вниз»; страж встаёт (иначе он зацикливался на подсечках из приседа)
      if (f.t >= lenOf(s.pvp ? 0 : i, f.mv, s.lv) && !f.air) { if (i === 1 && !s.pvp) f.cr = 0; f.st = f.cr ? 'crouch' : 'idle'; f.t = 0; f.mv = null }
    }
  } else if (f.st === 'hit') { if (f.t >= f.stn) { f.st = 'idle'; f.t = 0; f.k = 0 } }
  else if (f.st === 'bstun') { if (f.t >= f.stn) { f.st = f.cr ? 'cblock' : 'block'; f.t = 0 } }
  else if (f.st === 'land') { if (f.t >= f.stn) { f.st = 'idle'; f.t = 0 } }
  else if (f.st === 'down') { if (f.t >= 40 && !f.air) { f.st = 'up'; f.t = 0 } }
  else if (f.st === 'up') { if (f.t >= 20) { f.st = 'idle'; f.t = 0; f.k = 0 } }
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
  const f = s.f[0], o = s.f[1]
  const press = inp & ~s.prevIn
  // счётчики двойного нажатия идут всегда (раньше замирали, пока боец был занят)
  if (s.ai.read > 0) s.ai.read++
  if (s.ai.read > 12) s.ai.read = 0
  if (s.tapF > 0) s.tapF++
  if (s.tapF > 12) s.tapF = 0
  if (press & ANYP && !(inp & IN_BLOCK)) s.lastP = s.tick   // для выхода из броска
  if (press & ATK) { s.buf = press & ATK; s.bufT = 10 }
  else if (s.bufT > 0) s.bufT--
  else s.buf = 0
  const toward = f.dir > 0 ? IN_R : IN_L, away = f.dir > 0 ? IN_L : IN_R
  if (f.st === 'atk' && f.mv && s.buf && !f.air) {   // цепочка: следующий удар в окне восстановления после попадания
    const M = MOVES[f.mv], into = f.t - M.s - M.a
    if (f.hitDone && M.next && into >= 0 && into <= 8 && ((s.buf & ANYP && (f.mv === 'jab' || f.mv === 'cross' || f.mv === 'hook')) || (s.buf & ANYK && (f.mv === 'low' || f.mv === 'kick')))) {
      startMove(s, 0, M.next); s.buf = 0; s.bufT = 0; return
    }
  }
  if (f.st === 'jump') {   // в прыжке: один удар рукой или ногой
    if (!f.jat && s.buf & ANYK) { startMove(s, 0, 'jkick'); s.buf = 0 }
    else if (!f.jat && s.buf & ANYP) { startMove(s, 0, 'jknee'); s.buf = 0 }
    return
  }
  if (busy(f)) return
  const dist = Math.abs(o.x - f.x)
  if (s.buf & IN_S && f.meter >= 1000) { startMove(s, 0, 'special'); s.buf = 0; return }
  if (inp & IN_D) {
    if (s.buf & IN_P2) { startMove(s, 0, 'cupper'); s.buf = 0; return }
    if (s.buf & IN_P) { startMove(s, 0, 'cjab'); s.buf = 0; return }
    if (s.buf & IN_K2) { startMove(s, 0, 'sweep'); s.buf = 0; return }
    if (s.buf & IN_K) { startMove(s, 0, 'ckick'); s.buf = 0; return }
    const want: St = inp & IN_BLOCK ? 'cblock' : 'crouch'
    if (f.st !== want) { f.st = want; f.t = 0 }
    f.cr = 1
    return
  }
  f.cr = 0
  if (s.buf & IN_P2) { startMove(s, 0, inp & toward ? 'hook' : inp & away ? 'upper' : 'cross'); s.buf = 0; return }
  if (s.buf & IN_P) { startMove(s, 0, inp & toward ? 'elbow' : inp & away ? 'upper' : 'jab'); s.buf = 0; return }
  if (s.buf & IN_K2) { startMove(s, 0, inp & toward ? 'high' : inp & away ? 'spin' : 'round'); s.buf = 0; return }
  if (s.buf & IN_K) { startMove(s, 0, inp & toward ? (dist <= 100 ? 'knee' : 'kick') : inp & away ? 'spin' : 'low'); s.buf = 0; return }
  if (inp & IN_BLOCK) { if (f.st !== 'block') { f.st = 'block'; f.t = 0 } return }
  if (press & IN_U || (inp & IN_U && (f.st === 'idle' || f.st === 'fwd' || f.st === 'back'))) {
    jump(s, 0, inp & toward ? f.dir : inp & away ? -f.dir : 0); return
  }
  if (inp & toward) {
    if ((press & toward) && s.tapF > 1 && s.tapF < 11) { f.st = 'dash'; f.t = 0; s.tapF = 0 }   // двойное «вперёд» — рывок
    else { f.st = 'fwd'; f.x += f.dir * 4; if (press & toward) s.tapF = 1 }
  }
  else if (inp & away) {
    if ((press & away) && s.ai.read > 1 && s.ai.read < 10) { f.st = 'dodge'; f.t = 0; s.ai.read = 0 }   // двойное «назад» — отскок
    else { f.st = 'back'; f.x -= f.dir * 3; if (press & away) s.ai.read = 1 }
  } else if (f.st === 'fwd' || f.st === 'back' || f.st === 'block' || f.st === 'crouch' || f.st === 'cblock') { f.st = 'idle'; f.t = 0 }
}

/** то же, что player(), но для любого бойца в бою с другом (своё состояние управления) */
function playerPvp(s: Sim, i: 0 | 1, inp: number) {
  const f = s.f[i], o = s.f[1 - i], c = s.c[i]
  const press = inp & ~c.prevIn
  // счётчики двойного нажатия идут всегда (раньше замирали, пока боец был занят)
  if (c.read > 0) c.read++
  if (c.read > 12) c.read = 0
  if (c.tapF > 0) c.tapF++
  if (c.tapF > 12) c.tapF = 0
  if (press & ANYP && !(inp & IN_BLOCK)) c.lastP = s.tick   // для выхода из броска
  if (press & ATK) { c.buf = press & ATK; c.bufT = 10 }
  else if (c.bufT > 0) c.bufT--
  else c.buf = 0
  const toward = f.dir > 0 ? IN_R : IN_L, away = f.dir > 0 ? IN_L : IN_R
  if (f.st === 'atk' && f.mv && c.buf && !f.air) {   // цепочка: следующий удар в окне восстановления после попадания
    const M = MOVES[f.mv], into = f.t - M.s - M.a
    if (f.hitDone && M.next && into >= 0 && into <= 8 && ((c.buf & ANYP && (f.mv === 'jab' || f.mv === 'cross' || f.mv === 'hook')) || (c.buf & ANYK && (f.mv === 'low' || f.mv === 'kick')))) {
      startMove(s, i, M.next); c.buf = 0; c.bufT = 0; return
    }
  }
  if (f.st === 'jump') {   // в прыжке: один удар рукой или ногой
    if (!f.jat && c.buf & ANYK) { startMove(s, i, 'jkick'); c.buf = 0 }
    else if (!f.jat && c.buf & ANYP) { startMove(s, i, 'jknee'); c.buf = 0 }
    return
  }
  if (busy(f)) return
  const dist = Math.abs(o.x - f.x)
  if (c.buf & IN_S && f.meter >= 1000) { startMove(s, i, 'special'); c.buf = 0; return }
  if (inp & IN_D) {
    if (c.buf & IN_P2) { startMove(s, i, 'cupper'); c.buf = 0; return }
    if (c.buf & IN_P) { startMove(s, i, 'cjab'); c.buf = 0; return }
    if (c.buf & IN_K2) { startMove(s, i, 'sweep'); c.buf = 0; return }
    if (c.buf & IN_K) { startMove(s, i, 'ckick'); c.buf = 0; return }
    const want: St = inp & IN_BLOCK ? 'cblock' : 'crouch'
    if (f.st !== want) { f.st = want; f.t = 0 }
    f.cr = 1
    return
  }
  f.cr = 0
  if (c.buf & IN_P2) { startMove(s, i, inp & toward ? 'hook' : inp & away ? 'upper' : 'cross'); c.buf = 0; return }
  if (c.buf & IN_P) { startMove(s, i, inp & toward ? 'elbow' : inp & away ? 'upper' : 'jab'); c.buf = 0; return }
  if (c.buf & IN_K2) { startMove(s, i, inp & toward ? 'high' : inp & away ? 'spin' : 'round'); c.buf = 0; return }
  if (c.buf & IN_K) { startMove(s, i, inp & toward ? (dist <= 100 ? 'knee' : 'kick') : inp & away ? 'spin' : 'low'); c.buf = 0; return }
  if (inp & IN_BLOCK) { if (f.st !== 'block') { f.st = 'block'; f.t = 0 } return }
  if (press & IN_U || (inp & IN_U && (f.st === 'idle' || f.st === 'fwd' || f.st === 'back'))) {
    jump(s, i, inp & toward ? f.dir : inp & away ? -f.dir : 0); return
  }
  if (inp & toward) {
    if ((press & toward) && c.tapF > 1 && c.tapF < 11) { f.st = 'dash'; f.t = 0; c.tapF = 0 }   // двойное «вперёд» — рывок
    else { f.st = 'fwd'; f.x += f.dir * 4; if (press & toward) c.tapF = 1 }
  }
  else if (inp & away) {
    if ((press & away) && c.read > 1 && c.read < 10) { f.st = 'dodge'; f.t = 0; c.read = 0 }   // двойное «назад» — отскок
    else { f.st = 'back'; f.x -= f.dir * 3; if (press & away) c.read = 1 }
  } else if (f.st === 'fwd' || f.st === 'back' || f.st === 'block' || f.st === 'crouch' || f.st === 'cblock') { f.st = 'idle'; f.t = 0 }
}

/** Страж: читает подготовку ударов, ставит верхний или нижний блок, сбивает прыжки и наказывает промахи */
function boss(s: Sim) {
  const f = s.f[1], p = s.f[0], ai = s.ai
  const dist = Math.abs(p.x - f.x)
  const lowHp = f.hp < 350
  ai.rage = lowHp ? 1 : 0
  if (f.st === 'jump') {   // в прыжке: бьёт ногой на снижении
    if (!f.jat && f.vy < 0 && dist <= 135) startMove(s, 1, 'jkick')
    return
  }
  if (f.st === 'block' || f.st === 'cblock' || f.st === 'bstun' || f.st === 'crouch') {
    // держит защиту, пока игрок атакует; сразу после — контратака
    const pAtk = p.st === 'atk' && p.mv && p.t <= MOVES[p.mv].s + MOVES[p.mv].a
    if (f.st !== 'bstun' && !pAtk && !(p.air && dist <= 200)) {
      if (dist <= 100) { startMove(s, 1, f.st === 'crouch' || f.st === 'cblock' ? 'cupper' : rnd(s) < 500 ? 'cross' : 'elbow'); return }
      if (dist <= 140 && (f.st === 'cblock' || f.st === 'crouch')) { startMove(s, 1, 'sweep'); return }
      f.st = 'idle'; f.t = 0; f.cr = 0
    }
    if (f.st === 'block' || f.st === 'cblock' || f.st === 'crouch') {   // подстраивает высоту блока под удар игрока
      const ph = pAtk && p.mv ? MOVES[p.mv].h : ''
      if (ph === 'L' && f.st !== 'cblock') { f.st = 'cblock'; f.cr = 1; f.t = 0 }
      else if ((ph === 'O' || ph === 'M') && f.st === 'crouch') { f.st = ph === 'O' ? 'block' : 'cblock'; f.cr = ph === 'O' ? 0 : 1; f.t = 0 }
      else if (ph === 'O' && f.st === 'cblock') { f.st = 'block'; f.cr = 0; f.t = 0 }
    }
    if (f.st !== 'idle') return
  }
  if (busy(f)) return
  // игрок в прыжке: апперкот навстречу или блок
  if (p.air && p.st !== 'down' && dist <= 190) {
    const r = rnd(s)
    if (dist <= 100 && r < 700 + ai.rage * 100) { startMove(s, 1, 'cupper'); return }
    if (dist <= 140 && p.vy < 0 && r < 450) { startMove(s, 1, 'high'); return }
    if (p.st === 'atk' || r < 850) { f.st = 'block'; f.t = 0; f.cr = 0; return }
  }
  // бросок, если игрок долго стоит в блоке рядом (бросок берёт и присевшего)
  if (p.st === 'block' && p.t > 28 && dist <= MOVES.throw.reach && rnd(s) < 600) { startMove(s, 1, 'throw'); return }
  // защита: видит подготовку удара игрока и ставит нужный блок
  if (p.st === 'atk' && p.mv && !p.air && p.t <= MOVES[p.mv].s + 1 && dist <= MOVES[p.mv].reach + 30) {
    const r = rnd(s), M = MOVES[p.mv]
    const blockP = lp(s).bp + ai.rage * 30       // страж ~96 %, призрак ~98 %
    if (r < blockP) {
      if (M.h === 'L') { f.st = 'cblock'; f.cr = 1 }
      else if (M.h === 'H' && r < 300) { f.st = 'crouch'; f.cr = 1 }   // подныривает под верхний удар
      else { f.st = 'block'; f.cr = 0 }
      f.t = 0; return
    }
    if (r < blockP + 45) { f.st = 'dodge'; f.t = 0; ai.cd = 4; return }
  }
  // удар игрока сверху в прыжке, уже снижается: стоячий блок
  if (p.st === 'atk' && p.mv && MOVES[p.mv].air && dist <= 150 && rnd(s) < 880) { f.st = 'block'; f.t = 0; f.cr = 0; return }
  // наказание: игрок промахнулся или восстанавливается
  if (p.st === 'atk' && p.mv && !p.air && p.t > MOVES[p.mv].s + MOVES[p.mv].a && dist <= 140) {
    const left = moveLen(p.mv) - p.t
    // наказание только тем, что успевает: подготовка удара короче, чем игроку осталось восстанавливаться
    if (left >= 17) { startMove(s, 1, dist <= 98 ? 'cupper' : 'round'); return }
    if (left >= 13) { startMove(s, 1, 'kick'); return }
    if (left >= 6) { startMove(s, 1, 'jab'); return }
  }
  if ((p.st === 'up' && p.t > 12) || p.st === 'hit') { if (dist <= 100) { startMove(s, 1, p.st === 'hit' ? 'hook' : 'combo'); return } }
  if (f.meter >= 1000 && dist <= 160 && p.st !== 'down' && p.st !== 'up' && rnd(s) < 120) { startMove(s, 1, 'special'); return }
  if (ai.cd > 0) { ai.cd--; if (dist > 150) { f.st = 'fwd'; f.x += f.dir * 5 } else if (f.st === 'fwd') { f.st = 'idle'; f.t = 0 } return }
  // нападение
  if (p.st === 'down') { if (dist > 200) { f.st = 'fwd'; f.x += f.dir * 5 } return }
  const r = rnd(s)
  if (dist > 150) { if (dist < 260 && r < 120) { jump(s, 1, f.dir); return } f.st = 'fwd'; f.x += f.dir * 5; return }
  const pLow = p.st === 'crouch' || p.st === 'cblock'
  if (pLow) {   // игрок сидит: прыжок с ударом сверху, бросок или подсечка
    if (r < 300 && dist >= 90) jump(s, 1, f.dir)
    else if (r < 750) startMove(s, 1, dist <= 100 ? 'knee' : 'kick')   // средние удары: сидячий блок их держит, просто присед — нет
    else startMove(s, 1, 'sweep')
  } else if (dist <= 100) {
    if (p.st === 'block') { if (r < 300) startMove(s, 1, 'low'); else if (r < 480) startMove(s, 1, 'sweep'); else if (r < 600) { f.st = 'back'; f.x -= f.dir * 5; ai.cd = 10; return } else startMove(s, 1, 'combo') }
    else if (r < 220) startMove(s, 1, 'jab')
    else if (r < 420) startMove(s, 1, 'combo')
    else if (r < 560) startMove(s, 1, 'elbow')
    else if (r < 680) startMove(s, 1, 'knee')
    else if (r < 800) startMove(s, 1, 'upper')
    else startMove(s, 1, 'hook')
  } else if (dist <= 124) {
    if (r < 350) startMove(s, 1, 'kick'); else if (r < 600) startMove(s, 1, 'low'); else if (r < 800) startMove(s, 1, 'sweep'); else startMove(s, 1, 'spin')
  } else if (dist <= 136) {
    if (r < 450) startMove(s, 1, 'kick'); else if (r < 750) startMove(s, 1, 'high'); else startMove(s, 1, 'sweep')
  } else {
    if (r < 350) startMove(s, 1, 'round'); else if (r < 550) startMove(s, 1, 'high'); else { f.st = 'fwd'; f.x += f.dir * 5 }
  }
  ai.cd = lp(s).cd + (rnd(s) % (lowHp ? lp(s).cdl : lp(s).cdh))
}

/** один тик симуляции; inp — кнопки игрока на этом тике */
export function step(s: Sim, inp: number, inp2 = 0) {
  if (s.pvp) return stepPvp(s, inp, inp2)
  s.ev = []
  s.tick++
  if (s.over) { for (const i of [0, 1] as const) s.f[i].t++; return }
  if (s.pause > 0) { s.pause--; if (s.pause === 0) s.ev.push({ k: 'start', who: 0 }); s.prevIn = inp; return }
  if (s.pause < 0) { s.pause++; for (const i of [0, 1] as const) { s.f[i].t++; physics(s, i) } if (s.pause === 0) resetRound(s); s.prevIn = inp; return }
  player(s, inp)
  boss(s)
  s.pend = []
  stepFighter(s, 0)
  stepFighter(s, 1)
  for (const [i, mv] of s.pend) { if (s.pause < 0) break; damage(s, i, (1 - i) as 0 | 1, mv) }
  if (s.pause < 0) { s.prevIn = inp; return }
  separate(s)
  s.rt--
  if (s.rt <= 0) { s.ev.push({ k: 'time', who: 0 }); if (s.f[0].hp === s.f[1].hp) drawRound(s); else endRound(s, s.f[0].hp > s.f[1].hp ? 0 : 1) }
  s.prevIn = inp
}

/** тик боя с другом: inp — левый боец, inp2 — правый */
function stepPvp(s: Sim, inp: number, inp2: number) {
  s.ev = []
  s.tick++
  const keep = () => { s.c[0].prevIn = inp; s.c[1].prevIn = inp2 }
  if (s.over) { for (const i of [0, 1] as const) s.f[i].t++; return }
  if (s.pause > 0) { s.pause--; if (s.pause === 0) s.ev.push({ k: 'start', who: 0 }); keep(); return }
  if (s.pause < 0) { s.pause++; for (const i of [0, 1] as const) { s.f[i].t++; physics(s, i) } if (s.pause === 0) resetRound(s); keep(); return }
  playerPvp(s, 0, inp)
  playerPvp(s, 1, inp2)
  s.pend = []
  stepFighter(s, 0)
  stepFighter(s, 1)
  for (const [i, mv] of s.pend) { if (s.pause < 0) break; damage(s, i, (1 - i) as 0 | 1, mv) }
  if (s.pause < 0) { keep(); return }
  separate(s)
  s.rt--
  if (s.rt <= 0) { s.ev.push({ k: 'time', who: 0 }); if (s.f[0].hp === s.f[1].hp) drawRound(s); else endRound(s, s.f[0].hp > s.f[1].hp ? 0 : 1) }
  keep()
}

/** запись нажатий: [тик, маска] при каждом изменении */
export type InputLog = [number, number][]
export function replay(seed: number, log: InputLog, maxTicks = 60 * 60 * 16, lv = 1, ez = 0): Sim {
  const s = newSim(seed, lv, ez); let li = 0, cur = 0
  while (!s.over && s.tick < maxTicks) { while (li < log.length && log[li][0] <= s.tick) { cur = log[li][1]; li++ } step(s, cur) }
  return s
}
