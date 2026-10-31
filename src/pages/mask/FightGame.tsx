import { MODEL_V } from '../../api/mask'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { maskApi } from '../../api/mask'
import { buildArena } from './fightWorld'
import { createRunnerSound } from './runnerSound'
import { newSim, step, MOVES, TPS, HP, IN_L, IN_R, IN_BLOCK, IN_P, IN_K, IN_S } from './fightSim'
import type { Sim, InputLog, MoveId, F } from './fightSim'

/** Задание 2: драка со стражем. Бой считает fightSim (то же на сервере), здесь — картинка, звук и управление. */
interface Props { onClose: (done: boolean) => void }
const BASE = import.meta.env.BASE_URL
const tg = (window as any).Telegram?.WebApp
const buzz = (k: 'light' | 'medium' | 'heavy') => { try { tg?.HapticFeedback?.impactOccurred(k) } catch { /* */ } }
const CLIP: Record<MoveId, string> = { jab: 'f_jab', cross: 'f_cross', hook: 'f_hook', upper: 'f_upper', low: 'f_low', kick: 'f_kick', round: 'f_round', special: 'f_special', combo: 'f_combo', throw: 'f_upper' }

interface Rig { root: THREE.Group; mixer: THREE.AnimationMixer; A: Record<string, THREE.AnimationAction>; cur: THREE.AnimationAction | null; key: string }

export default function FightGame({ onClose }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'load' | 'ready' | 'fight' | 'end'>('load')
  const [hud, setHud] = useState({ hp: [HP, HP], meter: [0, 0], wins: [0, 0], time: 60, round: 1, combo: 0 })
  const [banner, setBanner] = useState<{ k: number; text: string; sub?: string; tone?: 'gold' | 'red' | 'white' } | null>(null)
  const [res, setRes] = useState<{ done: boolean; win: boolean; flag?: string | null } | null>(null)
  const [loadPct, setLoadPct] = useState(0)
  const snd = useRef(createRunnerSound({ fight: true }))
  const [muted, setMuted] = useState(snd.current.muted)
  const [music, setMusic] = useState(snd.current.musicOn)
  const api = useRef({ start: () => {}, press: (_b: number, _d: boolean) => {} })
  // на телефоне играем только горизонтально
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth)
  const needRotate = coarse && portrait
  const rotRef = useRef(needRotate); rotRef.current = needRotate
  useEffect(() => {
    const on = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', on); window.addEventListener('orientationchange', on)
    try { tg?.disableVerticalSwipes?.(); tg?.requestFullscreen?.() } catch { /* */ }
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); try { tg?.enableVerticalSwipes?.(); tg?.unlockOrientation?.(); if (tg?.isFullscreen) tg?.exitFullscreen?.() } catch { /* */ } }
  }, [])
  useEffect(() => { if (!needRotate && coarse) { try { tg?.lockOrientation?.() } catch { /* */ } } }, [needRotate, coarse])

  useEffect(() => {
    const el = host.current!
    let alive = true
    const R = new THREE.WebGLRenderer({ antialias: true })
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(R.domElement)
    const S = new THREE.Scene()
    const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; S.environmentIntensity = 0.25
    const arena = buildArena(S)
    const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 600)
    cam.position.set(0, 1.3, 6); cam.lookAt(0, 1.2, 0)
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-2, 6, -5); key.castShadow = true
    key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 4, bottom: -3, near: 1, far: 20 }); key.shadow.camera.updateProjectionMatrix(); key.shadow.bias = -0.0006
    S.add(key)
    const sfx = snd.current

    // искры удара
    const sparkT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!; const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,220,140,0.9)'); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
    const sparks: { s: THREE.Sprite; v: THREE.Vector3; l: number }[] = []
    for (let i = 0; i < 60; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.visible = false; S.add(s); sparks.push({ s, v: new THREE.Vector3(), l: 0 }) }
    let spI = 0
    const burst = (p: THREE.Vector3, n: number, col: number, power = 1) => {
      for (let i = 0; i < n; i++) {
        const sp = sparks[spI++ % sparks.length]; sp.l = 0.25 + Math.random() * 0.25
        sp.s.position.copy(p); sp.s.scale.setScalar(0.12 * power + Math.random() * 0.1); (sp.s.material as THREE.SpriteMaterial).color.setHex(col)
        sp.v.set((Math.random() - 0.5) * 4 * power, Math.random() * 3 * power, (Math.random() - 0.5) * 2); sp.s.visible = true
      }
    }

    // бойцы
    const dl = new DRACOLoader(); dl.setDecoderPath(BASE + 'mask/draco/')
    const gl = new GLTFLoader(); gl.setDRACOLoader(dl)
    const rigs: (Rig | null)[] = [null, null]
    const prog = [0, 0]
    const load = (url: string, i: number) => gl.load(url, g => {
      if (!alive) return
      g.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.frustumCulled = false; m.castShadow = true } })
      const root = new THREE.Group(); root.add(g.scene); S.add(root)
      const mixer = new THREE.AnimationMixer(g.scene); const A: Record<string, THREE.AnimationAction> = {}
      for (const c of g.animations) {
        for (const t of c.tracks) if (/Hips\.position$/.test(t.name)) {   // убрать уход таза в сторону: позицию задаёт симуляция
          const v = t.values; const up = [0, 1, 2].reduce((a, b) => Math.abs(v[b]) > Math.abs(v[a]) ? b : a, 0); const r0 = [v[0], v[1], v[2]]
          for (let k = 0; k < v.length; k += 3) for (let j = 0; j < 3; j++) if (j !== up) v[k + j] = r0[j]
        }
        A[c.name] = mixer.clipAction(c)
      }
      rigs[i] = { root, mixer, A, cur: null, key: '' }
      prog[i] = 1; setLoadPct(Math.round((prog[0] + prog[1]) * 50))
      if (rigs[0] && rigs[1]) { setPhase('ready'); applyPose(true) }
    }, e => { if (e.total) { prog[i] = e.loaded / e.total * 0.95; setLoadPct(Math.round((prog[0] + prog[1]) * 50)) } })
    load(BASE + 'mask/fight_hero.glb?v=' + MODEL_V, 0)
    load(BASE + 'mask/fight_boss.glb?v=' + MODEL_V, 1)

    // ── симуляция
    let sim: Sim = newSim(1)
    let fightId = 0, running = false, acc = 0, inp = 0, log: InputLog = [], lastLogged = -1, combo = 0, comboT = 0, slow = 1, slowT = 0, shake = 0
    let bk = 0
    const say = (text: string, sub?: string, tone?: 'gold' | 'red' | 'white', ms = 1300) => { const k = ++bk; setBanner({ k, text, sub, tone }); setTimeout(() => setBanner(b => b && b.k === k ? null : b), ms) }

    /** состояние бойца → клип и его скорость */
    const want = (f: F, i: number): [string, number, boolean, number?] => {
      switch (f.st) {
        case 'atk': { const m = MOVES[f.mv!]; return [CLIP[f.mv!], (m.s + m.a + m.r) / TPS, true] }
        case 'fwd': return ['f_fwd', 0, false]
        case 'back': return ['f_back', 0, false]
        case 'dash': return ['f_fwd', 0.35, true]
        case 'block': case 'bstun': return ['f_block', 0, false, 0.32]
        case 'hit': return [f.hitKind === 2 ? 'f_hitbig' : f.hitKind === 1 ? 'f_hitbody' : 'f_hit', f.hitKind === 2 ? 22 / TPS : 18 / TPS, true]
        case 'down': return ['f_ko', 70 / TPS * 1.6, true]
        case 'up': return ['f_getup', 50 / TPS, true]
        case 'dodge': return ['f_dodge', 24 / TPS, true]
        case 'ko': return ['f_ko', 2.4, true]
        case 'win': return [i === 1 ? 'f_taunt' : 'f_win', 0, false]
        default: return ['f_idle', 0, false]
      }
    }
    const applyPose = (force = false) => {
      for (const i of [0, 1] as const) {
        const r = rigs[i]; if (!r) continue
        const f = sim.f[i]
        r.root.position.set(f.x / 100, 0, 0); r.root.rotation.y = f.dir > 0 ? Math.PI / 2 : -Math.PI / 2
        const [name, dur, once, hold] = want(f, i)
        const k = `${name}:${f.st}:${f.mv || ''}:${once ? sim.tick - f.t : 0}`
        if (k === r.key && !force) continue
        r.key = k
        const a = r.A[name]; if (!a) continue
        const prev = r.cur
        a.reset(); a.enabled = true
        a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once
        a.timeScale = dur ? Math.max(0.5, Math.min(3, a.getClip().duration / dur)) : 1
        if (hold !== undefined) { a.time = a.getClip().duration * hold; a.timeScale = 0 }
        a.play(); if (prev && prev !== a) prev.crossFadeTo(a, f.st === 'atk' ? 0.06 : 0.12, false); r.cur = a
      }
    }

    const handleEvents = () => {
      for (const e of sim.ev) {
        const tgt = sim.f[e.who], src = sim.f[1 - e.who]
        const hp = new THREE.Vector3((tgt.x + (src.x - tgt.x) * 0.35) / 100, e.mv === 'low' ? 0.6 : e.mv === 'kick' || e.mv === 'round' ? 1.2 : 1.45, 0)
        const pan = Math.max(-0.8, Math.min(0.8, tgt.x / 400))
        if (e.k === 'hit' || e.k === 'kd' || e.k === 'ko') {
          const heavy = e.k !== 'hit' || (e.dmg || 0) > 90
          sfx.hit(heavy ? 2 : (e.dmg || 0) > 50 ? 1 : 0, pan); burst(hp, heavy ? 18 : 9, e.who === 1 ? 0xffd27a : 0xff4a4a, heavy ? 1.4 : 1)
          shake = Math.max(shake, heavy ? 0.12 : 0.05); buzz(heavy ? 'heavy' : 'medium')
          if (e.who === 1) { combo++; comboT = 1.2 } else combo = 0
          if (e.k === 'kd') setTimeout(() => sfx.fall(), 380)
          if (e.k === 'ko') { slow = 0.25; slowT = 1.4; arena.flash(0.8); setTimeout(() => sfx.fall(), 500); say('НОКАУТ', undefined, 'red', 1800) }
        } else if (e.k === 'block') { sfx.block(pan); burst(hp, 5, 0x7fe8ff, 0.7); shake = Math.max(shake, 0.02); buzz('light') }
        else if (e.k === 'whiff') sfx.whoosh(['round', 'kick', 'special', 'upper'].includes(e.mv || ''))
        else if (e.k === 'dodge') sfx.whoosh(false)
        else if (e.k === 'special') { sfx.special(); arena.flash(1); say(e.who === 0 ? 'СПЕЦПРИЁМ!' : 'ЯРОСТЬ СТРАЖА', undefined, 'gold', 900) }
        else if (e.k === 'time') say('ВРЕМЯ!', undefined, 'white', 1500)
        else if (e.k === 'start') { sfx.gong(); say('БОЙ!', undefined, 'gold', 800) }
        else if (e.k === 'round') { const n = sim.wins[0] + sim.wins[1] + 1; setTimeout(() => { if (alive && running) say('РАУНД ' + n, n === 3 ? 'решающий' : undefined, 'white', 1600) }, 300) }
      }
    }

    const finish = async () => {
      running = false
      const win = sim.over === 1
      setTimeout(() => say(win ? 'ТЫ ПОБЕДИЛ' : 'ПОРАЖЕНИЕ', win ? 'страж повержен' : 'страж непобедим… пока', win ? 'gold' : 'red', 2600), 1200)
      sfx.musicStop(2)
      setTimeout(() => setPhase('end'), 2600)
      try { const r = await maskApi.fightFinish(fightId, log, sim.tick); setRes({ done: r.done, win: r.win, flag: r.flag }) }
      catch { setRes({ done: false, win, flag: 'net' }) }
    }

    api.current.start = async () => {
      sfx.init(); sfx.musicStart(); setRes(null)
      let seed = Math.floor(Math.random() * 2 ** 31)
      try { const r = await maskApi.fightStart(); fightId = r.fight_id; seed = r.seed } catch { fightId = 0 }
      if (!alive) return
      sim = newSim(seed); log = []; lastLogged = -1; inp = 0; combo = 0; acc = 0
      running = true; setPhase('fight'); applyPose(true); say('РАУНД 1', undefined, 'white', 1600)
    }
    api.current.press = (b, d) => { inp = d ? (inp | b) : (inp & ~b) }

    const fit = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; R.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix() }
    const ro = new ResizeObserver(fit); ro.observe(el); fit()

    const clock = new THREE.Clock()
    let raf = 0, lastHud = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const rdt = Math.min(0.05, clock.getDelta())
      if (slowT > 0) { slowT -= rdt; if (slowT <= 0) slow = 1 }
      const dt = rdt * slow
      if (running && rotRef.current) { inp = 0 }
      else if (running) {
        acc += dt * TPS
        let n = 0
        while (acc >= 1 && n < 6) {
          if (inp !== lastLogged) { log.push([sim.tick, inp]); lastLogged = inp }
          step(sim, inp); handleEvents(); acc -= 1; n++
          if (sim.over && running) { finish(); break }
        }
        applyPose()
        if (performance.now() - lastHud > 80) {
          lastHud = performance.now()
          if (comboT > 0) comboT -= 0.08; if (comboT <= 0) combo = 0
          setHud({ hp: [sim.f[0].hp, sim.f[1].hp], meter: [sim.f[0].meter, sim.f[1].meter], wins: [...sim.wins], time: Math.ceil(sim.rt / TPS), round: sim.wins[0] + sim.wins[1] + 1, combo: combo > 1 ? combo : 0 })
        }
        sfx.musicIntensity(Math.min(1, (HP * 2 - sim.f[0].hp - sim.f[1].hp) / (HP * 1.3)))
      } else if (rigs[0] && rigs[1] && !sim.over) applyPose()
      for (const r of rigs) r?.mixer.update(dt)
      arena.update(rdt)
      for (const sp of sparks) if (sp.l > 0) { sp.l -= rdt; sp.v.y -= 9 * rdt; sp.s.position.addScaledVector(sp.v, rdt); (sp.s.material as THREE.SpriteMaterial).opacity = Math.min(1, sp.l * 4); if (sp.l <= 0) sp.s.visible = false }
      // камера: следит за серединой, отъезжает при большой дистанции, трясётся от ударов
      const ax = sim.f[0].x / 100, bx = sim.f[1].x / 100, mid = (ax + bx) / 2, gap = Math.abs(bx - ax)
      // вид сбоку, как в классических файтингах: ты слева, страж справа; камера отъезжает, чтобы оба были в кадре
      const portrait = cam.aspect < 1
      const fov = portrait ? 58 : 38; if (Math.abs(cam.fov - fov) > 0.1) { cam.fov = fov; cam.updateProjectionMatrix() }
      const tanH = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * cam.aspect
      const dist = Math.max(portrait ? 4.4 : 4.6, (gap / 2 + (portrait ? 0.75 : 1.2)) / tanH)
      const tx = mid, tz = dist
      cam.position.x += (tx - cam.position.x) * Math.min(1, rdt * 4); cam.position.z += (tz - cam.position.z) * Math.min(1, rdt * 3)
      cam.position.y = (portrait ? 1.3 : 1.2) + (Math.random() - 0.5) * shake; cam.position.x += (Math.random() - 0.5) * shake
      shake = Math.max(0, shake - rdt * 0.6)
      cam.lookAt(cam.position.x, portrait ? 1.28 : 1.12, 0)
      key.position.set(mid - 2, 6, 5); key.target.position.set(mid, 0, 0); key.target.updateMatrixWorld()
      R.render(S, cam)
    }
    tick()

    // клавиатура
    const KM: Record<string, number> = { ArrowLeft: IN_L, KeyA: IN_L, ArrowRight: IN_R, KeyD: IN_R, ArrowDown: IN_BLOCK, KeyS: IN_BLOCK, ShiftLeft: IN_BLOCK, KeyJ: IN_P, KeyK: IN_K, KeyL: IN_S, Space: IN_S }
    const kd = (e: KeyboardEvent) => { const b = KM[e.code]; if (b) { e.preventDefault(); inp |= b } }
    const ku = (e: KeyboardEvent) => { const b = KM[e.code]; if (b) { e.preventDefault(); inp &= ~b } }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    const vis = () => { if (document.hidden) inp = 0 }
    document.addEventListener('visibilitychange', vis)

    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect()
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); document.removeEventListener('visibilitychange', vis)
      S.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose() })
      pm.dispose(); R.dispose(); R.domElement.remove(); sfx.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // кнопки: удержание — через pointer-события (работает и мультитач)
  const Btn = ({ b, label, cls, big }: { b: number; label: string; cls: string; big?: boolean }) => (
    <button
      onPointerDown={e => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); api.current.press(b, true) }}
      onPointerUp={e => { e.preventDefault(); api.current.press(b, false) }}
      onPointerCancel={() => api.current.press(b, false)} onPointerLeave={() => api.current.press(b, false)}
      onContextMenu={e => e.preventDefault()}
      className={`rounded-full grid place-items-center font-display font-bold select-none touch-none active:scale-95 transition-transform ${big ? 'w-[74px] h-[74px] text-[14px]' : 'w-[62px] h-[62px] text-[12.5px]'} ${cls}`}
      style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as any}>{label}</button>
  )
  /** шкала здоровья в стиле файтинга: металлическая рамка, «след урона», имя внутри */
  const Health = ({ v, name, right, wins, meter, meterCol }: { v: number; name: string; right?: boolean; wins: number; meter: number; meterCol: string }) => {
    const pct = Math.max(0, v / HP * 100)
    const col = pct > 50 ? 'from-[#ffe27a] via-[#ffc23d] to-[#ff9a1f]' : pct > 25 ? 'from-[#ffb03d] via-[#ff7a1f] to-[#ff4d1f]' : 'from-[#ff5a4a] via-[#e8222f] to-[#b3101c]'
    return (
      <div className={`flex-1 min-w-0 ${right ? 'items-end' : ''} flex flex-col`}>
        <div className="relative w-full h-[18px] rounded-[3px] p-[2px]" style={{ background: 'linear-gradient(180deg,#d9c38a,#7a6230 45%,#3b2e14)', boxShadow: '0 2px 10px rgba(0,0,0,.6)', transform: right ? 'skewX(18deg)' : 'skewX(-18deg)' }}>
          <div className="relative w-full h-full rounded-[2px] overflow-hidden" style={{ background: 'linear-gradient(180deg,#1b0d10,#0b0507)' }}>
            <div className={`absolute inset-y-0 bg-white/80 transition-[width] duration-700 delay-300 ${right ? 'right-0' : 'left-0'}`} style={{ width: `${pct}%` }} />
            <div className={`absolute inset-y-0 bg-gradient-to-b ${col} transition-[width] duration-100 ${right ? 'right-0' : 'left-0'}`} style={{ width: `${pct}%`, boxShadow: 'inset 0 -4px 6px rgba(0,0,0,.25), inset 0 3px 4px rgba(255,255,255,.35)' }} />
          </div>
        </div>
        <div className={`w-full flex items-center gap-2 mt-1 ${right ? 'flex-row-reverse' : ''}`}>
          <span className="font-display font-black text-[12px] tracking-[.12em] text-white" style={{ textShadow: '0 1px 4px #000, 0 0 10px rgba(0,0,0,.8)' }}>{name}</span>
          <span className={`flex gap-1 ${right ? 'flex-row-reverse' : ''}`}>{[0, 1].map(i => <i key={i} className="w-3 h-3 rounded-full border border-[#d9c38a]" style={{ background: wins > i ? 'radial-gradient(circle at 35% 35%,#fff3c4,#e0a72a 60%,#7a5212)' : 'rgba(0,0,0,.45)' }} />)}</span>
          <div className="flex-1 h-[5px] rounded-full bg-black/55 border border-white/10 overflow-hidden" style={{ maxWidth: 150 }}>
            <div className={`h-full ${right ? 'ml-auto' : ''} ${meterCol} ${meter >= 1000 ? 'animate-pulse' : ''}`} style={{ width: `${meter / 10}%` }} />
          </div>
        </div>
      </div>
    )
  }
  const specReady = hud.meter[0] >= 1000

  return createPortal(
    <div className="fixed inset-0 bg-black select-none" style={{ zIndex: 1000, touchAction: 'none' }}>
      <div ref={host} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(130% 90% at 50% 45%, transparent 55%, rgba(5,2,15,0.6) 100%)' }} />
      {/* верх: здоровье и таймер — у самого края экрана, чтобы не закрывать бойцов */}
      {phase !== 'load' && (
        <div className="absolute top-0 inset-x-0 pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 6px)', paddingLeft: 'calc(env(safe-area-inset-left,0px) + 14px)', paddingRight: 'calc(env(safe-area-inset-right,0px) + 14px)' }}>
          <div className="flex items-start gap-3">
            <Health v={hud.hp[0]} name="ТЫ" wins={hud.wins[0]} meter={hud.meter[0]} meterCol="bg-gradient-to-r from-[#1fb6ff] to-[#34e8ff]" />
            <div className="shrink-0 -mt-[2px] w-[46px] h-[40px] grid place-items-center rounded-[10px]" style={{ background: 'linear-gradient(180deg,#d9c38a,#7a6230 50%,#3b2e14)', padding: 2, boxShadow: '0 3px 12px rgba(0,0,0,.6)' }}>
              <div className="w-full h-full rounded-[8px] grid place-items-center font-display font-black text-[20px] tabular-nums" style={{ background: 'radial-gradient(circle at 50% 30%,#2b1d2e,#0b0507)', color: hud.time <= 10 ? '#ff5a4a' : '#f3e3b0', textShadow: '0 0 8px rgba(255,200,120,.35)' }}>{hud.time}</div>
            </div>
            <Health v={hud.hp[1]} name="СТРАЖ" right wins={hud.wins[1]} meter={hud.meter[1]} meterCol="bg-gradient-to-l from-[#ff3fb4] to-[#ff7ad1]" />
          </div>
          {hud.combo > 1 && phase === 'fight' && <div key={hud.combo} className="mt-6 ml-2 font-display font-black italic text-[26px] text-gold" style={{ animation: 'fgPop .35s ease-out both', textShadow: '0 2px 0 #7a5212, 0 0 18px rgba(255,190,80,.6)' }}>{hud.combo} УДАРА</div>}
        </div>
      )}
      {/* служебные кнопки — внизу по центру, не мешают обзору */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2 z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 10px)' }}>
        <button onClick={() => onClose(!!res?.done)} className="w-9 h-9 rounded-full grid place-items-center text-[14px] bg-black/45 border border-white/15 backdrop-blur">✕</button>
        <button onClick={() => { const m = !muted; snd.current.setMuted(m); setMuted(m) }} className="w-9 h-9 rounded-full grid place-items-center text-[14px] bg-black/45 border border-white/15 backdrop-blur">{muted ? '🔇' : '🔊'}</button>
        <button onClick={() => { const m = !music; snd.current.setMusic(m); setMusic(m) }} className={`w-9 h-9 rounded-full grid place-items-center text-[14px] bg-black/45 border border-white/15 backdrop-blur ${music ? '' : 'opacity-40'}`}>🎵</button>
      </div>

      {banner && <div key={banner.k} className="absolute inset-x-0 top-[26%] grid place-items-center pointer-events-none text-center">
        <div className="font-display font-black italic text-[58px] leading-none tracking-wide" style={{ animation: 'fgBan 1.3s ease-out both', background: banner.tone === 'red' ? 'linear-gradient(180deg,#ffd0c4,#ff3b2f 45%,#7a0d0d)' : banner.tone === 'gold' ? 'linear-gradient(180deg,#fff6d0,#f1c24a 45%,#8a5a12)' : 'linear-gradient(180deg,#ffffff,#c9d4e8 50%,#5a6a88)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 4px 0 rgba(0,0,0,.55)) drop-shadow(0 0 22px rgba(0,0,0,.6))' }}>{banner.text}</div>
        {banner.sub && <div className="mt-2 text-[15px] text-white/80">{banner.sub}</div>}
      </div>}
      <style>{'@keyframes fgBan{0%{transform:scale(2.2);opacity:0;filter:blur(6px)}18%{transform:scale(1);opacity:1;filter:blur(0)}80%{opacity:1}100%{opacity:0;transform:scale(1.04)}}@keyframes fgPop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}.fg-pad{background:radial-gradient(circle at 50% 35%,rgba(60,62,90,.75),rgba(10,10,20,.75));border:2px solid rgba(217,195,138,.55);box-shadow:0 4px 14px rgba(0,0,0,.5),inset 0 2px 6px rgba(255,255,255,.12);color:#f3e3b0;backdrop-filter:blur(6px)}.fg-btn{border:2px solid rgba(255,255,255,.35);box-shadow:0 5px 16px rgba(0,0,0,.55),inset 0 -6px 10px rgba(0,0,0,.35),inset 0 3px 6px rgba(255,255,255,.45);letter-spacing:.06em;text-shadow:0 1px 2px rgba(0,0,0,.45)}.fg-gold{background:radial-gradient(circle at 50% 30%,#fff1b8,#f1b52e 55%,#9a6410);color:#2b1703;text-shadow:none}.fg-pink{background:radial-gradient(circle at 50% 30%,#ffc1e6,#ff3fb4 55%,#8a0f5c);color:#fff}.fg-steel{background:radial-gradient(circle at 50% 30%,#d9e2f2,#6c7a96 55%,#262c3d);color:#fff}.fg-cyan{background:radial-gradient(circle at 50% 30%,#d8fbff,#34e8ff 55%,#0b6c86);color:#03222b;text-shadow:none}.fg-ready{box-shadow:0 0 26px #34e8ff,0 5px 16px rgba(0,0,0,.55);animation:fgGlow 1s ease-in-out infinite}@keyframes fgGlow{50%{transform:scale(1.07)}}'}</style>

      {/* управление */}
      {phase === 'fight' && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 14px)', paddingLeft: 'calc(env(safe-area-inset-left,0px) + 18px)', paddingRight: 'calc(env(safe-area-inset-right,0px) + 18px)' }}>
          <div className="flex gap-2.5 items-end">
            <Btn b={IN_L} label="◀" cls="fg-pad text-[22px]" big />
            <Btn b={IN_R} label="▶" cls="fg-pad text-[22px]" big />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Btn b={IN_S} label="СПЕЦ" cls={specReady ? 'fg-btn fg-cyan fg-ready' : 'fg-btn fg-cyan opacity-45'} />
            <Btn b={IN_BLOCK} label="БЛОК" cls="fg-btn fg-steel" />
            <Btn b={IN_K} label="НОГА" cls="fg-btn fg-pink" big />
            <Btn b={IN_P} label="УДАР" cls="fg-btn fg-gold" big />
          </div>
        </div>
      )}

      {needRotate && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/85 backdrop-blur-sm text-center px-8">
          <div>
            <div className="mx-auto w-14 h-24 rounded-[14px] border-[3px] border-white/80 relative" style={{ animation: 'fgRot 1.8s ease-in-out infinite' }}><i className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-white/70" /></div>
            <div className="font-display font-semibold text-[18px] mt-6">Поверни телефон</div>
            <p className="text-[13.5px] text-gray mt-1.5">Драка идёт в горизонтальном режиме — так видно обоих бойцов{phase === 'fight' ? '. Бой на паузе.' : '.'}</p>
            <button onClick={() => onClose(false)} className="btn-secondary h-11 rounded-[14px] px-5 mt-5 text-[14px]">Выйти</button>
          </div>
          <style>{'@keyframes fgRot{0%,20%{transform:rotate(0)}50%,80%{transform:rotate(-90deg)}100%{transform:rotate(0)}}'}</style>
        </div>
      )}
      {(phase === 'load' || phase === 'ready' || phase === 'end') && (
        <div className="absolute inset-x-0 bottom-0 p-4 flex justify-center" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 14px)' }}>
          <div className="glass rounded-[22px] p-4 text-center w-full max-w-[460px]">
            {phase === 'load' && <div className="py-3"><div className="text-[14px] text-gray mb-2">Загрузка арены… {loadPct}%</div><div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-green" style={{ width: `${loadPct}%` }} /></div></div>}
            {phase === 'ready' && <>
              <div className="font-display font-semibold text-[17px]">Победи стража</div>
              <p className="text-[13px] text-gray mt-1.5">Бой до двух побед. Страж читает каждый удар — бей, когда он открылся после своей атаки.</p>
              <div className="text-[12px] text-gray2 mt-2 text-left grid grid-cols-2 gap-x-3 gap-y-1">
                <span>УДАР ×3 — серия руками</span><span>НОГА ×2 — серия ногами</span>
                <span>◀◀ — отскок назад</span><span>▶▶ — рывок вперёд</span>
                <span>БЛОК — держи (бросок пробивает долгий блок)</span><span>СПЕЦ — когда шкала полна</span>
              </div>
              <p className="text-[11.5px] text-gray2 mt-1.5">На ПК: ← → · J удар · K нога · S/Shift блок · Пробел спец</p>
              <button onClick={() => api.current.start()} className="btn-primary w-full mt-3">В бой</button>
            </>}
            {phase === 'end' && <>
              <div className="font-display font-semibold text-[18px]">{res?.done ? 'Задание выполнено!' : res?.win ? 'Победа!' : 'Страж победил'}</div>
              <p className="text-[13.5px] text-gray mt-1">{res?.flag === 'bad' ? 'Бой не засчитан сервером' : res?.flag === 'net' ? 'Нет связи с сервером — результат не сохранён' : res?.win ? 'Сервер подтвердил победу.' : 'Ищи момент, когда он раскрылся после удара.'}</p>
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
