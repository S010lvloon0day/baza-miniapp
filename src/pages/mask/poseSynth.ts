import * as THREE from 'three'

/** Сборка своих клипов из частей готовых (в Mixamo нет присевших подсечки, апперкота и блока как в MK).
 *  Поза = набор треков костей в момент t; ключи клипа — позы, собранные из разных клипов по группам костей. */
type Pose = Map<string, number[]>   // имя трека → значения
const LEG = /(UpLeg|Leg|Foot|Toe)/
const R_LEG = /Right(UpLeg|Leg|Foot|Toe)/

function sample(c: THREE.AnimationClip, t: number): Pose {
  const p: Pose = new Map()
  for (const tr of c.tracks) {
    const it = tr.createInterpolant(); const v = it.evaluate(Math.min(c.duration, Math.max(0, t)))
    p.set(tr.name, Array.from(v as ArrayLike<number>))
  }
  return p
}
const bone = (track: string) => track.replace(/\.(quaternion|position|scale)$/, '')
/** взять базу и заменить кости, подходящие под re, из другой позы */
function mix(base: Pose, over: Pose, re: RegExp | ((b: string) => boolean)): Pose {
  const out: Pose = new Map(base)
  const f = typeof re === 'function' ? re : (b: string) => re.test(b)
  for (const [k, v] of over) if (f(bone(k)) && !(/Hips\.position$/.test(k))) out.set(k, v)
  return out
}
function build(name: string, keys: [number, Pose][]): THREE.AnimationClip {
  const names = [...keys[0][1].keys()]
  const times = keys.map(k => k[0])
  const tracks: THREE.KeyframeTrack[] = []
  for (const n of names) {
    const vals: number[] = []
    for (const [, p] of keys) vals.push(...(p.get(n) || keys[0][1].get(n)!))
    if (n.endsWith('.quaternion')) tracks.push(new THREE.QuaternionKeyframeTrack(n, times, vals))
    else if (n.endsWith('.position')) tracks.push(new THREE.VectorKeyframeTrack(n, times, vals))
  }
  return new THREE.AnimationClip(name, times[times.length - 1], tracks)
}

export function synthClips(clips: THREE.AnimationClip[]) {
  const C = Object.fromEntries(clips.map(c => [c.name, c]))
  const need = ['f_crouch', 'f_low', 'f_bblock', 'f_upper']
  if (!need.every(n => C[n])) return
  const crouch = sample(C.f_crouch, 0.5)
  const upperBody = (b: string) => !LEG.test(b) && !/Hips$/.test(b)
  // подсечка из приседа: тело сидит, правая нога выстреливает вдоль пола и описывает круг
  const sw = (t: number) => mix(crouch, sample(C.f_low, t), R_LEG)
  // нога вытянута назад вдоль пола, а разворот корпуса на 360° делает FightGame (корень бойца) — нога проходит перед собой, как в MK
  clips.push(build('f_csweep', [[0, crouch], [0.14, sw(0.5)], [0.7, sw(0.5)], [1.0, crouch]]))
  // блок в приседе: ноги из приседа, руки и корпус — высокий блок
  const cb = mix(crouch, sample(C.f_bblock, 0.3), upperBody)
  clips.push(build('f_cblock2', [[0, cb], [1, cb]]))
  // апперкот из приседа (как в MK): сидит → замах вниз → взрыв вверх с рукой над головой
  const up = (t: number) => sample(C.f_upper, t)
  clips.push(build('f_cupper', [[0, crouch], [0.14, mix(crouch, up(0.45), upperBody)], [0.3, up(0.6)], [0.4, up(0.64)], [0.75, up(0.85)], [1.0, up(0.95)]]))
}
