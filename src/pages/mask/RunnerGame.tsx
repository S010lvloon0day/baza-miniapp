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

export default function RunnerGame({ model, target, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<'load' | 'ready' | 'run' | 'end'>('load')
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
    el.appendChild(R.domElement)
    const S = new THREE.Scene()
    const pm = new THREE.PMREMGenerator(R)
    S.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
    S.environmentIntensity = 0.35
    const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 500)
    cam.position.set(0, 3.1, -4.6); cam.lookAt(0, 1.2, 6)
    const world = buildWorld(S, LANE)
    const makeObs = obstacleFactory(LANE)
    const build = (k: Kind) => { const g = makeObs(k); S.add(g); return g }
    // камера смотрит вдоль +Z, поэтому экранное «вправо» — это −X мира
    const LX = (l: number) => -l * LANE

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
      g.scene.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).frustumCulled = false })
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
    let air = false, stepT = 0, bestBefore = Infinity
    maskApi.runTop().then(r => { bestBefore = r.my_best }).catch(() => { bestBefore = 0 })
    const sfx = snd.current
    let rand = rnd(1), nextZ = 30
    const speed = () => Math.min(model.v0 + model.a * t, model.vmax)
    const spawn = () => {
      while (nextZ < dist + 70) {
        const r = rand(), lanes = [-1, 0, 1]
        const free = lanes[Math.floor(rand() * 3)]
        if (r < 0.34) {                    // одно препятствие на дорожке
          const l = lanes[Math.floor(rand() * 3)]
          const k: Kind = rand() < 0.5 ? 'low' : 'high'
          obs.push({ g: build(k), lane: l, z: nextZ, kind: k })
        } else if (r < 0.7) {             // две стены, одна дорожка свободна
          for (const l of lanes) if (l !== free) obs.push({ g: build('wall'), lane: l, z: nextZ, kind: 'wall' })
        } else {                           // барьер во всю ширину — прыгать или подныривать
          const k: Kind = rand() < 0.5 ? 'low' : 'high'
          for (const l of lanes) obs.push({ g: build(k), lane: l, z: nextZ, kind: k })
        }
        nextZ += Math.max(9, 16 - t * 0.04) + rand() * 6
      }
    }
    const reset = (seed: number) => {
      for (const o of obs) S.remove(o.g)
      obs = []; rand = rnd(seed); t = 0; dist = 0; lane = 0; x = 0; y = 0; vy = 0; slide = 0; nextZ = 30
    }
    const end = async () => {
      run = false; buzz('heavy'); play('fall', true, 1.2); sfx.crash(); sfx.wind(0); sfx.musicStop(1.5)
      const sc = Math.floor(dist * 10)
      setPhase('end')
      try {
        const r = await maskApi.runFinish(runId, sc); setRes({ score: r.score, done: r.done, flag: r.flag })
        setRec(!r.flag && r.score > 0 && r.score > bestBefore); bestBefore = Math.max(bestBefore, r.score); loadTop()
      }
      catch { setRes({ score: sc, done: false, flag: 'net' }) }
    }

    api.current.start = async () => {
      sfx.init(); sfx.musicStart(); setRec(false)
      setRes(null); setScore(0)
      let seed = Math.floor(Math.random() * 1e9)
      try { const r = await maskApi.runStart(); runId = r.run_id; seed = r.seed } catch { runId = 0 }
      reset(seed); run = true; setPhase('run'); play('run', false, 1)
    }
    api.current.input = k => {
      if (!run) return
      if (k === 'left' && lane > -1) { lane--; buzz('light'); sfx.swish() }
      if (k === 'right' && lane < 1) { lane++; buzz('light'); sfx.swish() }
      if (k === 'up' && y <= 0.001) { vy = 9.2; slide = 0; play('jump', true, 1.45); sfx.jump(); air = true }
      if (k === 'down') { if (y > 0.001) vy = -14; if (slide <= 0) sfx.roll(); slide = 0.75; play('slide', true, 2.0) }
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
        const v = speed(); dist += v * dt
        x += (LX(lane) - x) * Math.min(1, dt * 14)
        vy -= 26 * dt; y = Math.max(0, y + vy * dt); if (y === 0) vy = 0
        if (air && y === 0) { air = false; sfx.land() }
        world.update(v * dt, dt)
        sfx.musicIntensity((v - model.v0) / (model.vmax - model.v0))
        sfx.wind(0.015 + 0.05 * (v - model.v0) / (model.vmax - model.v0))
        if (A.run && cur === A.run && y === 0) { stepT -= dt * A.run.timeScale; if (stepT <= 0) { stepT += 22 / 30 / 2; sfx.step() } } else stepT = 0.05
        if (slide > 0) { slide -= dt; if (slide <= 0 && y === 0) play('run', false, 1) }
        if (y === 0 && vy === 0 && slide <= 0 && cur !== A.run) play('run', false, 1)
        if (A.run) A.run.timeScale = 0.8 + (v - model.v0) / (model.vmax - model.v0) * 0.6
        spawn()
        const hTop = slide > 0 ? 0.95 : 1.8
        for (const o of obs) {
          const rz = o.z - dist
          o.g.position.set(LX(o.lane), 0, rz)
          if (o.lane === lane && Math.abs(rz) < (o.kind === 'wall' ? WALL_HALF + 0.1 : 0.45) && Math.abs(x - LX(lane)) < 0.6) {
            const hit = o.kind === 'wall' || (o.kind === 'low' && y < 0.6) || (o.kind === 'high' && hTop > 1.2 && y < 0.9)
            if (hit) { end(); break }
          }
        }
        obs = obs.filter(o => { if (o.z - dist < -6) { S.remove(o.g); return false } return true })
        if (performance.now() - lastUi > 100) { lastUi = performance.now(); setScore(Math.floor(dist * 10)) }
      }
      if (!run) world.update(0, dt)
      hero.position.set(x, y, 0)
      cam.position.x += (x * 0.5 - cam.position.x) * Math.min(1, dt * 6)
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
      {phase !== 'run' && (
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
