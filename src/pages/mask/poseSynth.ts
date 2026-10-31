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
const findBone = (root: THREE.Object3D, n: string) => { let r: THREE.Object3D | null = null; root.traverse(o => { if (!r && (o as THREE.Bone).isBone && o.name.endsWith(n)) r = o }); return r as THREE.Object3D | null }
/** нога из живого удара (мокап), пересаженная на присед: у бедра, голени и стопы сохраняется их поворот в мире,
 *  поэтому колено гнётся естественно (не «ломается»), а нога бьёт вперёд, на соперника */
function legWorld(root: THREE.Object3D, base: Pose, kick: Pose, deg?: number, straight = 0.7, side = 'Right'): Pose {
  const names = ['UpLeg', 'Leg', 'Foot', 'ToeBase'].map(n => side + n)
  applyPose(root, kick)
  const rq = new THREE.Quaternion(); root.getWorldQuaternion(rq); const rqi = rq.clone().invert()
  const want = names.map(n => { const b = findBone(root, n); if (!b) return null; const q = new THREE.Quaternion(); b.getWorldQuaternion(q); return rqi.clone().multiply(q) })
  applyPose(root, base)
  const out: Pose = new Map(base)
  names.forEach((n, i) => {
    const b = findBone(root, n), w = want[i]; if (!b || !w) return
    const pq = new THREE.Quaternion(); b.parent!.getWorldQuaternion(pq)
    b.quaternion.copy(rqi.clone().multiply(pq).invert().multiply(w)); b.updateMatrixWorld(true)
    const k = b.name + '.quaternion'; if (base.has(k)) out.set(k, b.quaternion.toArray())
  })
  if (deg !== undefined) {   // довернуть всю ногу (колено сохраняет естественный изгиб), чтобы стопа ушла далеко вперёд у пола
    const ul = findBone(root, side + 'UpLeg'), lg = findBone(root, side + 'Leg'), ft = findBone(root, side + 'Foot')
    if (ul && lg && ft) {
      const r = deg * Math.PI / 180, dir = new THREE.Vector3(0, -Math.sin(r), Math.cos(r)).applyQuaternion(rq)
      // колено почти в струну: голень продолжает бедро с небольшим (как в MK) изгибом
      const th = new THREE.Vector3().setFromMatrixPosition(lg.matrixWorld).sub(new THREE.Vector3().setFromMatrixPosition(ul.matrixWorld)).normalize()
      const shin = new THREE.Vector3().setFromMatrixPosition(ft.matrixWorld).sub(new THREE.Vector3().setFromMatrixPosition(lg.matrixWorld)).normalize()
      aimBone(lg, ft, th.clone().lerp(shin, 1 - straight).normalize())
      aimBone(ul, ft, dir)
      for (const b of [ul, lg]) { const k = b.name + '.quaternion'; if (base.has(k)) out.set(k, b.quaternion.toArray()) }
    }
  }
  return out
}

/** поднять колено: бедро наводится вперёд и вверх на deg градусов над горизонталью, голень висит как была */
function kneeUp(root: THREE.Object3D, p: Pose, deg: number, side = 'Right'): Pose {
  applyPose(root, p)
  const ul = findBone(root, side + 'UpLeg'), lg = findBone(root, side + 'Leg'); if (!ul || !lg) return p
  const rq = new THREE.Quaternion(); root.getWorldQuaternion(rq)
  const r = deg * Math.PI / 180
  aimBone(ul, lg, new THREE.Vector3(0, Math.sin(r), Math.cos(r)).applyQuaternion(rq))
  const out: Pose = new Map(p); const k = ul.name + '.quaternion'; if (p.has(k)) out.set(k, ul.quaternion.toArray())
  return out
}

export function synthClips(clips: THREE.AnimationClip[], root?: THREE.Object3D) {
  const C = Object.fromEntries(clips.map(c => [c.name, c]))
  const need = ['f_crouch', 'f_low', 'f_bblock', 'f_upper']
  if (!need.every(n => C[n])) return
  // присед с нормальной стойкой рук (кулаки перед лицом), а не как в исходном клипе
  const crouch0 = sample(C.f_crouch, 0.5)
  const crouch = C.f_idle ? mix(crouch0, sample(C.f_idle, 0.3), (b: string) => !LEG.test(b) && !/Hips$/.test(b)) : crouch0
  clips.push(build('f_crouchg', [[0, crouch], [1, crouch]]))
  const upperBody = (b: string) => !LEG.test(b) && !/Hips$/.test(b)
  // подсечка из приседа: тело сидит, правая нога выстреливает вдоль пола и описывает круг
  if (root) {
    const lk = (t: number, deg?: number, st = 0.7) => legWorld(root, crouch, sample(C.f_low, t), deg, st)
    // удар ногой из приседа (присед + нога 1): колено подтянуто → нога выстреливает далеко вперёд у пола → обратно
    clips.push(build('f_ckick', [[0, crouch], [0.09, kneeUp(root, crouch, 25)], [0.18, lk(0.63, 8, 0.85)], [0.3, lk(0.65, 8, 0.85)], [0.42, lk(0.55, 40, 0.2)], [0.58, crouch]]))
    // подсечка (присед + нога 2): нога вытянута у самого пола, корпус делает полный оборот (вращает FightGame)
    clips.push(build('f_csweep', [[0, crouch], [0.1, lk(0.5, 45, 0.2)], [0.25, lk(0.64, 9, 0.95)], [0.75, lk(0.64, 9, 0.95)], [0.88, lk(0.55, 40, 0.2)], [1.0, crouch]]))
  }
  if (root && C.f_jump && C.f_knee) {
    const air = sample(C.f_jump, 1.05)
    const kn = (t: number) => { const k = sample(C.f_knee, t); return legWorld(root, legWorld(root, air, k, undefined, 0.7, 'Left'), k) }
    const hi = (t: number) => kneeUp(root, kn(t), 28, 'Left')
    clips.push(build('f_jknee2', [[0, air], [0.12, kn(0.55)], [0.22, hi(0.68)], [0.6, hi(0.7)], [0.8, air]]))
  }
  // тычок рукой из приседа: ноги сидят, руки — джеб
  const jsrc = C.f_bcross ?? C.f_bjab
  if (jsrc) { const jb = (t: number) => mix(crouch, sample(jsrc, t), (b: string) => !LEG.test(b) && !/Hips$/.test(b))
    const k = jsrc === C.f_bcross ? [0.55, 0.68] : [0.35, 0.45]
    clips.push(build('f_cjab', [[0, crouch], [0.08, jb(k[0])], [0.16, jb(k[1])], [0.24, jb(k[1] + 0.02)], [0.5, crouch]])) }
  // блок в приседе: ноги из приседа, руки и корпус — высокий блок
  const cb = mix(crouch, sample(C.f_bblock, 0.3), upperBody)
  clips.push(build('f_cblock2', [[0, cb], [1, cb]]))
  // апперкот из приседа (как в MK): сидит → замах вниз → взрыв вверх с рукой над головой
  const up = (t: number) => sample(C.f_upper, t)
  clips.push(build('f_cupper', [[0, crouch], [0.14, mix(crouch, up(0.45), upperBody)], [0.3, up(0.53)], [0.4, up(0.57)], [0.75, up(0.8)], [1.0, crouch]]))
}
