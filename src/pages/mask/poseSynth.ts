import * as THREE from 'three'

/** Сборка своих клипов из частей готовых (в Mixamo нет присевших подсечки, апперкота и блока как в MK).
 *  Поза = набор треков костей в момент t; ключи клипа — позы, собранные из разных клипов по группам костей. */
type Pose = Map<string, number[]>   // имя трека → значения
const LEG = /(UpLeg|Leg|Foot|Toe)/

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

/** навести кость: повернуть её так, чтобы направление «кость → дочерняя кость» в мире совпало с dir (мир = пространство модели) */
function aimBone(bone: THREE.Object3D, child: THREE.Object3D, dir: THREE.Vector3) {
  bone.updateMatrixWorld(true)
  const a = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld), c = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld)
  const cur = c.sub(a).normalize()
  const dq = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize())
  const pq = new THREE.Quaternion(); bone.parent!.getWorldQuaternion(pq)
  bone.quaternion.premultiply(pq.clone().invert().multiply(dq).multiply(pq))
  bone.updateMatrixWorld(true)
}
function applyPose(root: THREE.Object3D, p: Pose) {
  for (const [k, v] of p) {
    const m = k.match(/^(.*)\.(quaternion|position)$/); if (!m) continue
    const o = root.getObjectByName(m[1]); if (!o) continue
    if (m[2] === 'quaternion') o.quaternion.fromArray(v); else o.position.fromArray(v)
  }
  root.updateMatrixWorld(true)
}
/** присед, правая нога вытянута вперёд под углом deg вниз от горизонтали (как в MK) */
function legOut(root: THREE.Object3D, base: Pose, deg: number, bend: number): Pose {
  applyPose(root, base)
  const f = (n: string) => { let r: THREE.Object3D | null = null; root.traverse(o => { if (!r && (o as THREE.Bone).isBone && o.name.endsWith(n)) r = o }); return r as THREE.Object3D | null }
  const ul = f('RightUpLeg'), lg = f('RightLeg'), ft = f('RightFoot')
  if (!ul || !lg || !ft) return base
  // направление задано в пространстве модели (вперёд = +Z), переводим в мир с учётом поворота модели
  const wq = new THREE.Quaternion(); root.getWorldQuaternion(wq)
  const r = deg * Math.PI / 180, dir = new THREE.Vector3(0, -Math.sin(r), Math.cos(r)).applyQuaternion(wq)
  aimBone(ul, lg, dir)
  aimBone(lg, ft, dir.clone().add(new THREE.Vector3(0, -bend, 0).applyQuaternion(wq)))
  const out: Pose = new Map(base)
  for (const o of [ul, lg]) { const k = [...base.keys()].find(x => x === o.name + '.quaternion'); if (k) out.set(k, o.quaternion.toArray()) }
  return out
}

export function synthClips(clips: THREE.AnimationClip[], root?: THREE.Object3D) {
  const C = Object.fromEntries(clips.map(c => [c.name, c]))
  const need = ['f_crouch', 'f_low', 'f_bblock', 'f_upper']
  if (!need.every(n => C[n])) return
  const crouch = sample(C.f_crouch, 0.5)
  const upperBody = (b: string) => !LEG.test(b) && !/Hips$/.test(b)
  // подсечка из приседа: тело сидит, правая нога выстреливает вдоль пола и описывает круг
  if (root) {
    const lk = (deg: number, bend: number) => legOut(root, crouch, deg, bend)
    // удар ногой из приседа (присед + нога 1): нога выстреливает вперёд вдоль пола, колено в струну
    clips.push(build('f_ckick', [[0, crouch], [0.08, lk(50, 0.9)], [0.18, lk(18, 0)], [0.3, lk(18, 0)], [0.55, crouch]]))
    // подсечка (присед + нога 2): нога вытянута у самого пола, корпус делает полный оборот (вращает FightGame)
    clips.push(build('f_csweep', [[0, crouch], [0.1, lk(40, 0.6)], [0.25, lk(26, 0.05)], [0.75, lk(26, 0.05)], [1.0, crouch]]))
  }
  // тычок рукой из приседа: ноги сидят, руки — джеб
  if (C.f_bjab) { const jb = (t: number) => mix(crouch, sample(C.f_bjab, t), (b: string) => !LEG.test(b) && !/Hips$/.test(b))
    clips.push(build('f_cjab', [[0, crouch], [0.08, jb(0.35)], [0.16, jb(0.45)], [0.24, jb(0.47)], [0.5, crouch]])) }
  // блок в приседе: ноги из приседа, руки и корпус — высокий блок
  const cb = mix(crouch, sample(C.f_bblock, 0.3), upperBody)
  clips.push(build('f_cblock2', [[0, cb], [1, cb]]))
  // апперкот из приседа (как в MK): сидит → замах вниз → взрыв вверх с рукой над головой
  const up = (t: number) => sample(C.f_upper, t)
  clips.push(build('f_cupper', [[0, crouch], [0.14, mix(crouch, up(0.45), upperBody)], [0.3, up(0.6)], [0.4, up(0.64)], [0.75, up(0.85)], [1.0, up(0.95)]]))
}
