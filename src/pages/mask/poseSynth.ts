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

/** повернуть кость так, чтобы её ось Y (вдоль кости) смотрела по dir, а ось шарнира X — как hinge (без скручивания бедра/голени) */
function orientBone(b: THREE.Object3D, dir: THREE.Vector3, hinge: THREE.Vector3) {
  const y = dir.clone().normalize()
  const x = hinge.clone().sub(y.clone().multiplyScalar(hinge.dot(y))).normalize()
  const z = new THREE.Vector3().crossVectors(x, y).normalize()
  const want = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
  const pq = new THREE.Quaternion(); b.parent!.getWorldQuaternion(pq)
  b.quaternion.copy(pq.invert().multiply(want)); b.updateMatrixWorld(true)
}
/** анатомичный удар ногой из приседа: двухзвенная IK в сагиттальной плоскости.
 *  ang — угол стопы относительно горизонтали (+ вниз), ext — насколько нога вытянута (1 — прямая), lean — отклон корпуса назад, ° */
const LEAN_SIGN = 1
function kickIK(root: THREE.Object3D, base: Pose, ang: number, ext: number, lean: number, side0 = 'Left', support = 1): Pose {
  applyPose(root, base)
  const ul = findBone(root, side0 + 'UpLeg'), lg = findBone(root, side0 + 'Leg'), ft = findBone(root, side0 + 'Foot'), sp = findBone(root, 'Spine')
  if (!ul || !lg || !ft) return base
  const rq = new THREE.Quaternion(); root.getWorldQuaternion(rq)
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(rq), up = new THREE.Vector3(0, 1, 0).applyQuaternion(rq)
  // ось шарнира колена берём из приседа: колено сгибается в ту же сторону, что и в живой позе
  const hinge = new THREE.Vector3(1, 0, 0).applyQuaternion(lg.getWorldQuaternion(new THREE.Quaternion()))
  const P = (o: THREE.Object3D) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)
  // опорная нога: таз опускается, пока заднее колено не встанет на пол; стопа остаётся на месте (двухзвенная IK)
  const other = side0 === 'Left' ? 'Right' : 'Left'
  const ru = findBone(root, other + 'UpLeg'), rl = findBone(root, other + 'Leg'), rf = findBone(root, other + 'Foot'), hips = findBone(root, 'Hips')
  if (ru && rl && rf && hips && support) {
    const floorY = (v: THREE.Vector3) => root.worldToLocal(v.clone()).y
    const footW = P(rf), kneeY = floorY(P(rl)), drop = Math.max(0, kneeY - 0.07) * support
    if (drop > 0) {
      const hw = P(hips); const target = root.localToWorld(root.worldToLocal(hw.clone()).add(new THREE.Vector3(0, -drop, 0)))
      hips.position.copy(hips.parent!.worldToLocal(target)); hips.updateMatrixWorld(true)
      const rh = P(ru), m1 = P(rl).distanceTo(rh), m2 = P(rf).distanceTo(P(rl))
      const kh = new THREE.Vector3(1, 0, 0).applyQuaternion(rl.getWorldQuaternion(new THREE.Quaternion()))
      const dd = Math.min(m1 + m2 - 1e-3, footW.distanceTo(rh)), dirF = footW.clone().sub(rh).normalize()
      const aa = Math.acos(Math.min(1, Math.max(-1, (m1 * m1 + dd * dd - m2 * m2) / (2 * m1 * dd))))
      const ax = new THREE.Vector3().crossVectors(dirF, kh).normalize()
      let kd = dirF.clone().applyAxisAngle(kh, aa); const kd2 = dirF.clone().applyAxisAngle(kh, -aa)
      if (kd2.dot(fwd) > kd.dot(fwd)) kd = kd2   // колено опорной ноги — вперёд-вниз, к полу
      void ax
      const kn = rh.clone().add(kd.multiplyScalar(m1))
      orientBone(ru, kn.clone().sub(rh), kh); orientBone(rl, footW.clone().sub(kn), kh)
    }
  }
  const hip = P(ul), l1 = P(lg).distanceTo(hip), l2 = P(ft).distanceTo(P(lg))
  const r = ang * Math.PI / 180, dir = fwd.clone().multiplyScalar(Math.cos(r)).add(up.clone().multiplyScalar(-Math.sin(r))).normalize()
  const d = Math.max(Math.abs(l1 - l2) + 1e-3, Math.min(l1 + l2 - 1e-3, (l1 + l2) * ext))
  const foot = hip.clone().add(dir.clone().multiplyScalar(d))
  // колено — над линией бедро→стопа (сгиб вверх-вперёд, как у человека)
  const a = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
  const side = new THREE.Vector3().crossVectors(dir, up).normalize()
  const kneeDir = dir.clone().applyAxisAngle(side, a)
  if (kneeDir.dot(up) < dir.dot(up)) kneeDir.copy(dir.clone().applyAxisAngle(side, -a))
  const knee = hip.clone().add(kneeDir.multiplyScalar(l1))
  orientBone(ul, knee.clone().sub(hip), hinge)
  orientBone(lg, foot.clone().sub(knee), hinge)
  // корпус выпрямляется и чуть отклоняется назад, подбородок поднят (вес уходит на опорную ногу)
  const tilt = (b: THREE.Object3D | null, deg: number) => { if (!b || !deg) return
    const q = new THREE.Quaternion().setFromAxisAngle(side, deg * Math.PI / 180)
    const wq = b.getWorldQuaternion(new THREE.Quaternion()), pq = b.parent!.getWorldQuaternion(new THREE.Quaternion())
    b.quaternion.copy(pq.invert().multiply(q.multiply(wq))); b.updateMatrixWorld(true) }
  const sp1 = findBone(root, 'Spine1'), nk = findBone(root, 'Neck'), hd = findBone(root, 'Head')
  tilt(sp, LEAN_SIGN * lean); tilt(sp1, LEAN_SIGN * lean * 0.5); tilt(nk, LEAN_SIGN * lean * 0.4); tilt(hd, LEAN_SIGN * lean * 0.4)
  const out: Pose = new Map(base)
  for (const b of [ul, lg, sp, sp1, nk, hd, ru, rl]) { if (!b) continue; const k = b.name + '.quaternion'; if (base.has(k)) out.set(k, b.quaternion.toArray()) }
  if (hips) { const k = hips.name + '.position'; if (base.has(k)) out.set(k, hips.position.toArray()) }
  return out
}

/** боксёрский блок: обе руки подняты, кулаки у лица, предплечья закрывают голову, локти вниз (двухзвенная IK рук) */
function guardPose(root: THREE.Object3D, base: Pose, tight = 1): Pose {
  applyPose(root, base)
  const rq = new THREE.Quaternion(); root.getWorldQuaternion(rq)
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(rq), up = new THREE.Vector3(0, 1, 0).applyQuaternion(rq), lat = new THREE.Vector3(1, 0, 0).applyQuaternion(rq)
  const P = (o: THREE.Object3D) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)
  const head = findBone(root, 'Head'); if (!head) return base
  const out: Pose = new Map(base)
  for (const sd of ['Left', 'Right']) {
    const sh = findBone(root, sd + 'Arm'), fa = findBone(root, sd + 'ForeArm'), hd = findBone(root, sd + 'Hand'); if (!sh || !fa || !hd) continue
    const S0 = P(sh), l1 = P(fa).distanceTo(S0), l2 = P(hd).distanceTo(P(fa))
    const sgn = Math.sign(lat.dot(S0.clone().sub(P(head)))) || (sd === 'Left' ? 1 : -1)
    // кулак — перед лицом, чуть в сторону своего плеча, на уровне глаз/скулы
    const T = P(head).add(fwd.clone().multiplyScalar(0.2 * tight + 0.08)).add(lat.clone().multiplyScalar(sgn * 0.08)).add(up.clone().multiplyScalar(0.04))   // кулаки перед лицом, не внутри маски
    const pole = up.clone().multiplyScalar(-1).add(lat.clone().multiplyScalar(sgn * 0.35)).add(fwd.clone().multiplyScalar(0.25)).normalize()   // локоть вниз и чуть наружу
    const dv = T.clone().sub(S0); const d = Math.min(l1 + l2 - 1e-3, Math.max(Math.abs(l1 - l2) + 1e-3, dv.length())); const dir = dv.normalize()
    const a = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
    const n = new THREE.Vector3().crossVectors(dir, pole).normalize()
    let ed = dir.clone().applyAxisAngle(n, -a); if (ed.dot(pole) < dir.clone().applyAxisAngle(n, a).dot(pole)) ed = dir.clone().applyAxisAngle(n, a)
    const E = S0.clone().add(ed.multiplyScalar(l1)), H = S0.clone().add(dir.clone().multiplyScalar(d))
    const xA = new THREE.Vector3(1, 0, 0).applyQuaternion(sh.getWorldQuaternion(new THREE.Quaternion()))
    orientBone(sh, E.clone().sub(S0), xA)
    const xF = new THREE.Vector3(1, 0, 0).applyQuaternion(fa.getWorldQuaternion(new THREE.Quaternion()))
    orientBone(fa, H.clone().sub(E), xF)
    for (const b of [sh, fa]) { const k = b.name + '.quaternion'; if (base.has(k)) out.set(k, b.quaternion.toArray()) }
  }
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
  if (root) {
    // удар ногой из приседа (присед + нога 1): бьёт передняя нога (опорная задняя остаётся на колене), как в MK:
    // колено подтягивается → пятка выстреливает вперёд у пола → обратно; корпус чуть назад
    const ik = (ang: number, ext: number, lean: number) => kickIK(root, crouch, ang, ext, lean)
    clips.push(build('f_ckick', [[0, crouch], [0.09, ik(14, 0.6, 8)], [0.18, ik(24, 0.97, 18)], [0.3, ik(24, 0.97, 18)], [0.42, ik(18, 0.65, 8)], [0.58, crouch]]))
    // подсечка (присед + нога 2): нога вытянута у самого пола, корпус делает полный оборот (вращает FightGame)
    // подсечка (присед + нога 2): передняя нога вытянута низко над полом, корпус делает полный оборот (вращает FightGame)
    clips.push(build('f_csweep', [[0, crouch], [0.1, ik(25, 0.7, 8)], [0.25, ik(24, 0.98, 14)], [0.75, ik(24, 0.98, 14)], [0.88, ik(25, 0.7, 8)], [1.0, crouch]]))
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
  // боксёрский блок стоя и в приседе (кулаки у лица), удар в блок — руки чуть прижимаются
  if (root && C.f_idle) {
    const st = sample(C.f_idle, 0.3)
    const g = guardPose(root, st), g2 = guardPose(root, st, 0.6)
    clips.push(build('f_guard', [[0, g], [1, g]]))
    clips.push(build('f_guardhit', [[0, g], [0.06, g2], [0.3, g]]))
    const cg = guardPose(root, crouch)
    clips.push(build('f_cguard', [[0, cg], [1, cg]]))
  }
  // блок в приседе: ноги из приседа, руки и корпус — высокий блок
  const cb = mix(crouch, sample(C.f_bblock, 0.3), upperBody)
  clips.push(build('f_cblock2', [[0, cb], [1, cb]]))
  // апперкот из приседа (как в MK): сидит → замах вниз → взрыв вверх с рукой над головой
  const up = (t: number) => sample(C.f_upper, t)
  clips.push(build('f_cupper', [[0, crouch], [0.14, mix(crouch, up(0.45), upperBody)], [0.3, up(0.53)], [0.4, up(0.57)], [0.75, up(0.8)], [1.0, crouch]]))
}
