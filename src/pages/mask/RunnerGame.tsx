import { MODEL_V } from '../../api/mask'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { maskApi } from '../../api/mask'
import type { RunTop } from '../../api/mask'
import { buildWorld, obstacleFactory, loadDecor, WALL_HALF } from './runnerWorld'
import { createRunnerSound } from './runnerSound'

/** Задание 1: бег по трём дорожкам. Скорость v(t)=min(v0+a·t, vmax) — та же модель на сервере. */
interface Props { model: { v0: number; a: number; vmax: number }; target: number; onClose: (done: boolean) => void }
type Kind = 'low' | 'high' | 'wall'
interface Obs { g: THREE.Group; lane: number; z: number; kind: Kind }

const BASE = import.meta.env.BASE_URL
const LANE = 1.7
const tg = (window as any).Telegram?.WebApp
const buzz = (k: 'light' | 'heavy') => { try { tg?.HapticFeedback?.impactOccurred(k) } catch { /* */ } }
const rnd = (seed: number) => { let x = seed >>> 0 || 7; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296 } }

export default function RunnerGame({ model, target: target0, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [score, setScore] = useState(0)
  const [kmh, setKmh] = useState(0)
  const [target, setTarget] = useState(target0)
  const [count, setCount] = useState<string | null>(null)
  const [toastM, setToastM] = useState<{ k: number; text: string } | null>(null)
  const [phase, setPhase] = useState<'load' | 'ready' | 'count' | 'run' | 'end'>('load')
  const [res, setRes] = useState<{ score: number; done: boolean; flag?: string | null } | null>(null)
  const api = useRef({ start: () => {}, input: (_k: 'up' | 'down' | 'left' | 'right') => {} })
  const snd = useRef(createRunnerSound())
  const [muted, setMuted] = useState(snd.current.muted)
  const [music, setMusic] = useState(snd.current.musicOn)
  const [top, setTop] = useState<RunTop | null>(null)
  const [rec, setRec] = useState(false)
  const loadTop = () => maskApi.runTop().then(setTop).catch(() => {})
  useEffect(() => { loadTop() }, [])

  useEffect(() => {
    const el = host.current!
    let alive = true
    const R = new THREE.WebGLRenderer({ antialias: true })
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    R.outputColorSpace = THREE.SRGBColorSpace
    R.toneMapping = THREE.ACESFilmicToneMapping
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(R.domElement)
    const S = new THREE.Scene()
    const pm = new THREE.PMREMGenerator(R)
    S.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
    S.environmentIntensity = 0.35
    const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 500)
    cam.position.set(0, 3.1, -4.6); cam.lookAt(0, 1.2, 6)
    const world = buildWorld(S, LANE)
    const makeObs = obstacleFactory(LANE)
    const build = (k: Kind) => { const g = makeObs(k); g.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true }); S.add(g); return g }
    // камера смотрит вдоль +Z, поэтому экранное «вправо» — это −X мира
    const LX = (l: number) => -l * LANE
    S.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && (m.geometry as any)?.type === 'PlaneGeometry') m.receiveShadow = true })
    // тени только вокруг героя: маленькая карта ездит вместе с ним
    const shSun = new THREE.DirectionalLight(0xffb27a, 1.7); shSun.castShadow = true
    // основное солнце мира отдаёт часть яркости этому, иначе тень почти не видна
    S.traverse(o => { const l = o as THREE.DirectionalLight; if (l.isDirectionalLight && l.color.getHex() === 0xffb27a) l.intensity = 0.7 })
    shSun.shadow.mapSize.set(1024, 1024); Object.assign(shSun.shadow.camera, { left: -5, right: 5, top: 6, bottom: -4, near: 1, far: 40 })
    shSun.shadow.camera.updateProjectionMatrix(); shSun.shadow.bias = -0.0008; shSun.shadow.normalBias = 0.02; S.add(shSun); S.add(shSun.target)
    // линии скорости
    const SL = 70, slPos = new Float32Array(SL * 6), slG = new THREE.BufferGeometry(); slG.setAttribute('position', new THREE.BufferAttribute(slPos, 3))
    const slM = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false })
    const speedLines = new THREE.LineSegments(slG, slM); speedLines.frustumCulled = false; S.add(speedLines)
    const slSeed = () => { const a = Math.random() * Math.PI * 2, r = 2.6 + Math.random() * 3; return [Math.cos(a) * r, 1.6 + Math.sin(a) * r * 0.7] }
    for (let i = 0; i < SL; i++) { const [lx, ly] = slSeed(); const z = Math.random() * 40; slPos.set([lx, Math.max(0.2, ly), z, lx, Math.max(0.2, ly), z + 1.5], i * 6) }
    // пыль из-под ног
    const dustT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!; const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(225,205,180,0.75)'); g.addColorStop(1, 'rgba(225,205,180,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
    const dust: { s: THREE.Sprite; life: number; vx: number; vy: number; vz: number }[] = []
    for (let i = 0; i < 28; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustT, transparent: true, depthWrite: false, opacity: 0 })); sp.visible = false; S.add(sp); dust.push({ s: sp, life: 0, vx: 0, vy: 0, vz: 0 }) }
    let dustI = 0
    const puff = (n: number, power = 1) => {
      for (let i = 0; i < n; i++) {
        const d = dust[dustI++ % dust.length]; d.life = 0.6 + Math.random() * 0.4
        d.s.position.set(x + (Math.random() - 0.5) * 0.5, y + 0.1, (Math.random() - 0.5) * 0.4); d.s.scale.setScalar(0.3 * power)
        d.vx = (Math.random() - 0.5) * 1.6 * power; d.vy = 0.4 + Math.random() * 0.8 * power; d.vz = -1.5 - Math.random() * 2; d.s.visible = true
      }
    }

    // ── персонаж
    const hero = new THREE.Group(); S.add(hero)
    let mixer: THREE.AnimationMixer | null = null
    const A: Record<string, THREE.AnimationAction> = {}
    let cur: THREE.AnimationAction | null = null
    const play = (n: string, once = false, ts = 1) => {
      const a = A[n]; if (!a) return
      if (a === cur && !once) { a.timeScale = ts; return }
      a.reset(); a.timeScale = ts
      a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once
      cur?.fadeOut(0.12); a.fadeIn(0.12).play(); cur = a
    }
    const dl = new DRACOLoader(); dl.setDecoderPath(BASE + 'mask/draco/')
    const gl = new GLTFLoader(); gl.setDRACOLoader(dl)
    loadDecor(BASE + 'mask/decor/', gl).then(lib => { if (!alive) return; world.applyDecor(lib); makeObs.setLib(lib) })
    gl.load(BASE + 'mask/public.glb?v=' + MODEL_V, g => {
      if (!alive) return
      g.scene.traverse(o => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).frustumCulled = false; (o as THREE.Mesh).castShadow = true } })
      hero.add(g.scene)
      mixer = new THREE.AnimationMixer(g.scene)
      for (const c of g.animations) {
        // прыжок/подкат/падение у Mixamo уезжают вперёд — оставляем только вертикаль
        for (const t of c.tracks) if (/Hips\.position$/.test(t.name)) {
          // вертикальная ось — та, где у таза больше всего смещение покоя (высота таза)
          const v = t.values; const up = [0, 1, 2].reduce((a, b) => Math.abs(v[b]) > Math.abs(v[a]) ? b : a, 0)
          const r0 = [v[0], v[1], v[2]]
          for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) if (k !== up) v[i + k] = r0[k]
        }
        A[c.name] = mixer.clipAction(c)
      }
      play('idle'); setPhase('ready')
    })

    // ── состояние забега
    let run = false, t = 0, dist = 0, lane = 0, x = 0, y = 0, vy = 0, slide = 0, runId = 0
    let obs: Obs[] = []
    let air = false, stepT = 0, bestBefore = Infinity, mile = 0
    maskApi.runTop().then(r => { bestBefore = r.my_best }).catch(() => { bestBefore = 0 })
    const sfx = snd.current
    let rand = rnd(1), nextZ = 30
    const speed = () => Math.min(model.v0 + model.a * t, model.vmax)
    // сложность растёт всё время: d = 0 на старте → 1 к ~1,5 мин (и скорость при этом не останавливается)
    const KN = 30   // нормировка «насколько быстро» для эффектов и музыки
    const spawn = () => {
      while (nextZ < dist + 90) {
        const vv = speed(), d = Math.min(1, t / 95), lanes = [-1, 0, 1]
        const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]
        const lk = (): Kind => rand() < 0.5 ? 'low' : 'high'
        const add = (l: number, k: Kind, dz = 0) => obs.push({ g: build(k), lane: l, z: nextZ + dz, kind: k })
        const free = pick(lanes)
        // веса узоров: простые уходят, сложные приходят
        const w = [1.1 - d * 1.1, 1, 0.8 - d * 0.3, 0.25 + d * 1.5, 0.1 + d * 1.6, d * 1.3, d * 1.2]
        let r = rand() * w.reduce((x, y) => x + y), p = 0
        while (r > w[p]) { r -= w[p]; p++ }
        let extra = 0
        if (p === 0) add(pick(lanes), lk())                                              // одно препятствие
        else if (p === 1) { for (const l of lanes) if (l !== free) add(l, 'wall') }    // две стены, проход один
        else if (p === 2) { const k = lk(); for (const l of lanes) add(l, k) }          // барьер во всю ширину
        else if (p === 3) { for (const l of lanes) add(l, l === free ? lk() : 'wall') } // проход есть, но в нём ещё барьер
        else if (p === 4) {                                                            // зигзаг: стены заставляют перестраиваться дважды
          const l1 = pick(lanes), l2 = pick(lanes.filter(x => x !== l1)), gap = Math.max(8, vv * (0.62 - d * 0.12))
          for (const l of lanes) if (l !== l1) add(l, 'wall')
          for (const l of lanes) if (l !== l2) add(l, 'wall', gap)
          extra = gap
        } else if (p === 6) {                                                          // связка: низкий барьер, сразу за ним высокий — прыжок, в воздухе вниз
          const gap = Math.max(7, vv * 0.45)
          for (const l of lanes) add(l, 'low')
          for (const l of lanes) add(l, 'high', gap)
          extra = gap
        } else {                                                                       // коридор: длинный ряд контейнеров + барьеры в проходе
          const gap = Math.max(7, vv * 0.4)
          for (let i = 0; i < 3; i++) { for (const l of lanes) if (l !== free) add(l, 'wall', i * gap) }
          add(free, lk(), gap * 1.5); extra = gap * 2
        }
        // промежуток во времени сокращается: ~1,0 с на старте → ~0,6 с к концу
        const react = Math.max(0.44, 0.95 - d * 0.51)
        nextZ += extra + Math.max(10, vv * react) + rand() * vv * (0.35 - d * 0.27)
      }
    }
    const reset = (seed: number) => {
      for (const o of obs) S.remove(o.g)
      obs = []; rand = rnd(seed); t = 0; dist = 0; lane = 0; x = 0; y = 0; vy = 0; slide = 0; nextZ = 30; mile = 0
    }
    const end = async () => {
      run = false; buzz('heavy'); play('fall', true, 1.2); sfx.crash(); sfx.wind(0); sfx.musicStop(1.5)
      const sc = Math.floor(dist * 10)
      setPhase('end')
      try {
        const r = await maskApi.runFinish(runId, sc); setRes({ score: r.score, done: r.done, flag: r.flag })
        const nr = !r.flag && r.score > 0 && r.score > bestBefore; setRec(nr); if (nr) sfx.ui('record'); bestBefore = Math.max(bestBefore, r.score); loadTop()
      }
      catch { setRes({ score: sc, done: false, flag: 'net' }) }
    }

    api.current.start = async () => {
      sfx.init(); sfx.musicStart(); setRec(false)
      setRes(null); setScore(0)
      let seed = Math.floor(Math.random() * 1e9)
      try { const r = await maskApi.runStart(); runId = r.run_id; seed = r.seed; if (r.target) setTarget(r.target) } catch { runId = 0 }
      reset(seed); setPhase('count')
      for (const c of ['3', '2', '1']) { setCount(c); sfx.ui('tick'); buzz('light'); await new Promise(r => setTimeout(r, 650)); if (!alive) return }
      setCount('Вперёд!'); sfx.ui('go'); buzz('heavy'); setTimeout(() => setCount(null), 600)
      run = true; setPhase('run'); play('run', false, 1)
    }
    api.current.input = k => {
      if (!run) return
      if (k === 'left' && lane > -1) { lane--; buzz('light'); sfx.swish() }
      if (k === 'right' && lane < 1) { lane++; buzz('light'); sfx.swish() }
      if (k === 'up' && y <= 0.001) { vy = 9.2; slide = 0; play('jump', true, 1.45); sfx.jump(); air = true }
      if (k === 'down') { if (y > 0.001) vy = -14; if (slide <= 0) { sfx.roll(); puff(5, 1.2) } slide = 0.75; play('slide', true, 2.0) }
    }

    const fit = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1
      R.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(fit); ro.observe(el); fit()

    const clock = new THREE.Clock()
    let raf = 0, lastUi = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, clock.getDelta())
      mixer?.update(dt)
      if (run) {
        t += dt
        const v = speed(); const dPrev = dist; dist += v * dt
        x += (LX(lane) - x) * Math.min(1, dt * 14)
        vy -= 26 * dt; y = Math.max(0, y + vy * dt); if (y === 0) vy = 0
        if (air && y === 0) { air = false; sfx.land(); puff(7, 1.3); buzz('light') }
        world.update(v * dt, dt)
        const kk = Math.min(1, (v - model.v0) / KN)
        sfx.musicIntensity(kk)
        sfx.wind(0.015 + 0.05 * kk)
        if (A.run && cur === A.run && y === 0) { stepT -= dt * A.run.timeScale; if (stepT <= 0) { stepT += 22 / 30 / 2; sfx.step(); if (Math.random() < 0.5) puff(1, 0.7) } } else stepT = 0.05
        if (slide > 0) { slide -= dt; if (slide <= 0 && y === 0) play('run', false, 1) }
        if (y === 0 && vy === 0 && slide <= 0 && cur !== A.run) play('run', false, 1)
        if (A.run) A.run.timeScale = 0.8 + Math.min(1.2, (v - model.v0) / KN) * 0.6
        spawn()
        const hTop = slide > 0 ? 0.95 : 1.8
        for (const o of obs) {
          const rz = o.z - dist
          o.g.position.set(LX(o.lane), 0, rz)
          const hz = o.kind === 'wall' ? WALL_HALF + 0.1 : 0.45, rzP = o.z - dPrev
          // «сквозная» проверка: за кадр на большой скорости можно пролететь препятствие насквозь
          if (o.lane === lane && rz < hz && rzP > -hz && Math.abs(x - LX(lane)) < 0.6) {
            const hit = o.kind === 'wall' || (o.kind === 'low' && y < 0.6) || (o.kind === 'high' && hTop > 1.2 && y < 0.9)
            if (hit) { end(); break }
          }
        }
        obs = obs.filter(o => { if (o.z - dist < -6) { S.remove(o.g); return false } return true })
        const sc = Math.floor(dist * 10)
        if (sc >= (mile + 1) * 10000) { mile++; setToastM({ k: mile, text: (mile * 10000).toLocaleString('ru-RU') + '!' }); sfx.ui('record'); buzz('heavy'); setTimeout(() => setToastM(m => m && m.k === mile ? null : m), 1400) }
        if (performance.now() - lastUi > 100) { lastUi = performance.now(); setScore(sc); setKmh(Math.round(v * 3.6)) }
      }
      if (!run) world.update(0, dt)
      hero.position.set(x, y, 0)
      hero.rotation.z += (((LX(lane) - x) * -0.18) - hero.rotation.z) * Math.min(1, dt * 10)   // наклон в повороте
      // ощущение скорости: шире угол, камера чуть дальше, лёгкая тряска, линии
      const k = run ? Math.min(1, Math.max(0, (speed() - model.v0) / KN)) : 0
      const fov = 55 + k * 16; if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix() }
      const shake = run ? k * 0.035 : 0
      cam.position.x += (x * 0.5 - cam.position.x) * Math.min(1, dt * 6) + (Math.random() - 0.5) * shake
      cam.position.y = 3.1 + (Math.random() - 0.5) * shake
      cam.position.z = -4.6 - k * 0.5
      cam.lookAt(cam.position.x * 0.6, 1.2, 6)
      shSun.position.set(x - 3, 9, 14); shSun.target.position.set(x, 0, 2)
      slM.opacity += ((run ? Math.max(0, k - 0.15) * 0.55 : 0) - slM.opacity) * Math.min(1, dt * 3)
      if (slM.opacity > 0.01) {
        const v = run ? speed() : 0
        for (let i = 0; i < SL; i++) {
          let z = slPos[i * 6 + 2] - v * dt * 1.6
          if (z < -5) { const [lx, ly] = slSeed(); z += 45; slPos[i * 6] = slPos[i * 6 + 3] = lx + x; slPos[i * 6 + 1] = slPos[i * 6 + 4] = Math.max(0.2, ly) }
          slPos[i * 6 + 2] = z; slPos[i * 6 + 5] = z + 1 + k * 3
        }
        slG.attributes.position.needsUpdate = true
      }
      for (const d of dust) if (d.life > 0) {
        d.life -= dt; d.s.position.x += d.vx * dt; d.s.position.y += d.vy * dt; d.s.position.z += d.vz * dt; d.vy *= 0.95
        d.s.scale.multiplyScalar(1 + dt * 2.2); (d.s.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.min(0.55, d.life))
        if (d.life <= 0) d.s.visible = false
      }
      R.render(S, cam)
    }
    tick()

    // ── управление: свайпы и клавиатура
    let sx = 0, sy = 0
    const ts = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { api.current.input('up'); return }
      if (Math.abs(dx) > Math.abs(dy)) api.current.input(dx > 0 ? 'right' : 'left')
      else api.current.input(dy < 0 ? 'up' : 'down')
    }
    const kd = (e: KeyboardEvent) => {
      const m: Record<string, 'up' | 'down' | 'left' | 'right'> = { ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }
      if (m[e.code]) { e.preventDefault(); api.current.input(m[e.code]) }
    }
    el.addEventListener('touchstart', ts, { passive: true }); el.addEventListener('touchend', te)
    window.addEventListener('keydown', kd)
    const vis = () => { if (document.hidden && run) end() }
    document.addEventListener('visibilitychange', vis)

    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect()
      el.removeEventListener('touchstart', ts); el.removeEventListener('touchend', te)
      window.removeEventListener('keydown', kd); document.removeEventListener('visibilitychange', vis)
      S.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose() })
      pm.dispose(); R.dispose(); R.domElement.remove(); sfx.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pct = Math.min(100, (score / target) * 100)
  return createPortal(
    <div className="fixed inset-0 bg-bg select-none" style={{ zIndex: 1000 }}>
      <div ref={host} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 90% at 50% 55%, transparent 60%, rgba(10,6,20,0.45) 100%)' }} />
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center gap-3" style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 12px)' }}>
        <button onClick={() => onClose(!!res?.done)} className="glass w-10 h-10 rounded-full grid place-items-center text-[18px]">✕</button>
        <button onClick={() => { const m = !muted; snd.current.setMuted(m); setMuted(m) }} className="glass w-10 h-10 rounded-full grid place-items-center text-[17px]" aria-label="звук">{muted ? '🔇' : '🔊'}</button>
        <button onClick={() => { const m = !music; snd.current.setMusic(m); setMusic(m) }} className={`glass w-10 h-10 rounded-full grid place-items-center text-[17px] ${music ? '' : 'opacity-40'}`} aria-label="музыка">🎵</button>
        <div className="glass flex-1 rounded-full h-10 px-4 flex items-center gap-3">
          <b className="font-display tabular-nums text-[16px] w-[74px]">{score.toLocaleString('ru-RU')}</b>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-green" style={{ width: `${pct}%` }} /></div>
          <span className="text-[12px] text-gray tabular-nums">{(target / 1000).toFixed(0)}k</span>
        </div>
      </div>
      {phase === 'run' && <div className="absolute right-3 glass rounded-full px-3 h-7 flex items-center text-[12px] tabular-nums" style={{ top: 'calc(env(safe-area-inset-top,0px) + 62px)' }}><b className="text-[14px] mr-1">{kmh}</b> км/ч</div>}
      {count && <div key={count} className="absolute inset-0 grid place-items-center pointer-events-none"><div className="font-display font-bold text-white text-[84px] drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]" style={{ animation: 'mgCount .65s ease-out both' }}>{count}</div></div>}
      {toastM && <div key={toastM.k} className="absolute inset-x-0 top-[24%] grid place-items-center pointer-events-none"><div className="font-display font-bold text-gold text-[46px] drop-shadow-[0_4px_18px_rgba(0,0,0,0.5)]" style={{ animation: 'mgPop 1.4s ease-out both' }}>{toastM.text}</div></div>}
      <style>{'@keyframes mgCount{0%{transform:scale(1.8);opacity:0}30%{transform:scale(1);opacity:1}100%{transform:scale(.9);opacity:.85}}@keyframes mgPop{0%{transform:scale(.4);opacity:0}25%{transform:scale(1.15);opacity:1}60%{transform:scale(1);opacity:1}100%{transform:scale(1);opacity:0}}'}</style>
      {(phase === 'load' || phase === 'ready' || phase === 'end') && (
        <div className="absolute inset-x-0 bottom-0 p-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 18px)' }}>
          <div className="glass rounded-[22px] p-4 text-center">
            {phase === 'load' && <div className="text-[14px] text-gray py-3">Загрузка…</div>}
            {phase === 'ready' && <>
              <div className="font-display font-semibold text-[16px]">Беги до {target.toLocaleString('ru-RU')}</div>
              <p className="text-[13px] text-gray mt-1.5">Свайп вверх или тап — прыжок, вниз — подкат, влево/вправо — дорожка. На ПК — стрелки.</p>
              <p className="text-[12px] text-gray2 mt-1">Жёлтое — перепрыгни, фиолетовое — подныривай, красное — обеги.</p>
              <Records top={top} />
              <button onClick={() => api.current.start()} className="btn-primary w-full mt-3">Старт</button>
            </>}
            {phase === 'end' && <>
              <div className="font-display font-semibold text-[18px]">{res?.done ? 'Задание выполнено!' : 'Упал'}</div>
              <p className="text-[14px] text-gray mt-1">Счёт: {(res?.score ?? score).toLocaleString('ru-RU')}{res?.flag === 'too_fast' ? ' — забег не засчитан' : ''}</p>
              {rec && <p className="text-[14px] text-gold font-semibold mt-1">🏆 Новый личный рекорд!</p>}
              <Records top={top} />
              <div className="flex gap-2 mt-3">
                {!res?.done && <button onClick={() => api.current.start()} className="btn-primary flex-1">Ещё раз</button>}
                <button onClick={() => onClose(!!res?.done)} className="btn-secondary flex-1 h-12 rounded-[16px]">{res?.done ? 'Дальше' : 'Выйти'}</button>
              </div>
            </>}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

function Records({ top }: { top: RunTop | null }) {
  if (!top) return null
  const medal = ['🥇', '🥈', '🥉']
  return (
    <div className="mt-3 text-left">
      <div className="flex items-center justify-between mb-1.5">
        <b className="text-[13px]">Рекорды забега</b>
        {top.my_best > 0 && <span className="text-[12px] text-gray">мой: <b className="text-white tabular-nums">{top.my_best.toLocaleString('ru-RU')}</b>{top.my_pos ? ` · ${top.my_pos} место` : ''}</span>}
      </div>
      {top.top.length === 0 ? <p className="text-[12.5px] text-gray2">Пока никто не бежал — стань первым.</p> : (
        <div className="max-h-[132px] overflow-y-auto rounded-[14px] bg-white/[.04]">
          {top.top.map(r => (
            <div key={r.rank} className={`flex items-center gap-2 px-3 py-[5px] text-[13px] ${r.is_me ? 'text-green' : ''}`}>
              <span className="w-6 text-center">{medal[r.rank - 1] ?? r.rank}</span>
              <span className="flex-1 truncate">{r.name}{r.is_me ? ' (ты)' : ''}</span>
              <b className="tabular-nums">{r.score.toLocaleString('ru-RU')}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
