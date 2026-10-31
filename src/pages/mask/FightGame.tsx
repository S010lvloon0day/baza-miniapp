import { MODEL_V } from '../../api/mask'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { maskApi } from '../../api/mask'
import { buildArena } from './fightWorld'
import { synthClips } from './poseSynth'
import { createRunnerSound } from './runnerSound'
import { newSim, step, MOVES, TPS, HP, IN_L, IN_R, IN_BLOCK, IN_P, IN_K, IN_S, IN_U, IN_D, IN_P2, IN_K2, JV, GRAV, lenOf } from './fightSim'
import type { Sim, InputLog, MoveId, F } from './fightSim'

/** Задание 2: драка со стражем. Бой считает fightSim (то же на сервере), здесь — картинка, звук и управление. */
interface Props { onClose: (done: boolean) => void; pvp?: string; startLv?: 1 | 2 }   // startLv — выбранный соперник (после прохождения этапа)   // pvp — код вызова: бой с другом
const BASE = import.meta.env.BASE_URL
const tg = (window as any).Telegram?.WebApp
const buzz = (k: 'light' | 'medium' | 'heavy') => { try { tg?.HapticFeedback?.impactOccurred(k) } catch { /* */ } }
const CLIP: Record<MoveId, string> = { jab: 'f_bjab', cross: 'f_bcross', hook: 'f_hook', upper: 'f_upper', low: 'f_low', kick: 'f_mkick', round: 'f_mround', special: 'f_special', combo: 'f_combo', throw: 'f_upper',
  elbow: 'f_bhook', knee: 'f_knee', high: 'f_kick', spin: 'f_spin', cupper: 'f_cupper', sweep: 'f_csweep', jkick: 'f_jkick', jknee: 'f_jknee2', cjab: 'f_cjab', ckick: 'f_ckick' }
/** ключевые моменты клипов (секунды): начало замаха → момент удара → возврат в стойку.
 *  Подготовка удара в симуляции растягивается на [начало, удар], остальное — на [удар, возврат]: кулак/нога доходят до цели ровно в кадр попадания */
const KEYS: Record<string, [number, number, number]> = {
  f_jab: [0.5, 0.7, 0.95], f_cross: [0.92, 1.17, 1.45], f_hook: [0.2, 0.42, 0.95], f_upper: [0.3, 0.52, 1.2], f_kick: [0.33, 0.77, 1.3],
  f_low: [0.4, 0.63, 1.1], f_round: [0.75, 1.12, 1.55], f_special: [0.12, 0.5, 1.8], f_combo: [0.62, 0.9, 2.05], f_elbow: [0.48, 0.67, 1.0],
  f_knee: [0.45, 0.65, 1.3], f_spin: [0.5, 0.95, 1.5],
  f_bjab: [0.28, 0.45, 0.8], f_bcross: [0.5, 0.68, 0.95], f_bhook: [0.3, 0.62, 0.95], f_bupperl: [0.4, 0.8, 1.2], f_bupperb: [0.42, 0.75, 1.2],
  f_mkick: [0.35, 0.7, 1.2], f_mround: [0.4, 0.75, 1.3], f_bsweep: [0.3, 0.7, 1.3], f_csweep: [0.03, 0.4, 1.0], f_cupper: [0.03, 0.3, 0.95], f_ckick: [0.02, 0.18, 0.55], f_jknee2: [0.02, 0.22, 0.7], f_cjab: [0.02, 0.16, 0.5], f_sweep: [0.62, 0.9, 1.72], f_jkick: [0.18, 0.45, 0.9], f_jknee: [0.7, 0.95, 1.2],
}
/** отрезки клипов для состояний с известной длительностью */
const SEG: Record<string, [number, number]> = {
  f_jump: [0.72, 1.42], f_ko: [1.05, 3.2], f_sweepfall: [0.75, 2.3], f_getup: [4.0, 5.7], f_blockhit: [0.05, 0.6], f_dodge: [0.9, 2.2],
  f_hit: [0, 1.0], f_bblock: [0.3, 0.55], f_guardhit: [0, 0.3], f_bdodge: [0.4, 1.3], f_hitbig: [0, 1.2], f_hitbody: [0, 1.0], f_hitup: [0.1, 1.5],
}
const AIR_CLIPS = /^f_(jump|jkick|jknee|jknee2)$/

interface Rig { root: THREE.Group; mixer: THREE.AnimationMixer; A: Record<string, THREE.AnimationAction>; cur: THREE.AnimationAction | null; key: string; alt: number }

export default function FightGame({ onClose, pvp, startLv }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'load' | 'ready' | 'fight' | 'end'>('load')
  const [hud, setHud] = useState({ hp: [HP, HP], meter: [0, 0], wins: [0, 0], lv: 1, time: 60, round: 1, combo: 0 })
  const [banner, setBanner] = useState<{ k: number; text: string; sub?: string; tone?: 'gold' | 'red' | 'white' } | null>(null)
  const [res, setRes] = useState<{ done: boolean; win: boolean; flag?: string | null } | null>(null)
  // бой с другом: имена, моя сторона, состояние связи
  const [pv, setPv] = useState<{ names: [string, string]; side: 0 | 1; st: 'conn' | 'wait' | 'fight' | 'left' | 'lag' | 'gone' | 'err' } | null>(pvp ? { names: ['', ''], side: 0, st: 'conn' } : null)
  const [loadPct, setLoadPct] = useState(0)
  const snd = useRef(createRunnerSound({ fight: true }))
  const [muted, setMuted] = useState(snd.current.muted)
  const [music, setMusic] = useState(snd.current.musicOn)
  const padRef = useRef(0)
  const ckpt = useRef<number>(startLv ?? 1)   // с какого босса начинать: Страж побеждён — дальше сразу Призрак
  const api = useRef({ start: () => {}, press: (_b: number, _d: boolean) => {}, dir: (_m: number) => {} })
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
    const rigs: (Rig | null)[] = [null, null, null]   // герой, страж, призрак (второй босс)
    const prog = [0, 0, 0]
    const pct = () => setLoadPct(Math.round((prog[0] + prog[1] + prog[2]) / 3 * 100))
    const load = (url: string, i: number) => gl.load(url, g => {
      if (!alive) return
      g.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.frustumCulled = false; m.castShadow = true } })
      const root = new THREE.Group(); root.add(g.scene); S.add(root)
      const mixer = new THREE.AnimationMixer(g.scene); const A: Record<string, THREE.AnimationAction> = {}
      for (const c of g.animations) {
        for (const t of c.tracks) if (/Hips\.position$/.test(t.name)) {   // убрать уход таза в сторону: позицию задаёт симуляция
          const v = t.values; const up = [0, 1, 2].reduce((a, b) => Math.abs(v[b]) > Math.abs(v[a]) ? b : a, 0); const r0 = [v[0], v[1], v[2]]
          const air = AIR_CLIPS.test(c.name)   // в прыжке высоту задаёт симуляция
          for (let k = 0; k < v.length; k += 3) for (let j = 0; j < 3; j++) if (j !== up || air) v[k + j] = r0[j]
        }
      }
      // у Призрака свой скелет (длинные руки): из клипов берём только повороты и положение таза
      if (i === 2) for (const c of g.animations) c.tracks = c.tracks.filter(t => !/\.position$/.test(t.name) || /Hips\.position$/.test(t.name))
      synthClips(g.animations, g.scene)
      for (const c of g.animations) A[c.name] = mixer.clipAction(c)
      rigs[i] = { root, mixer, A, cur: null, key: '', alt: 0 }
      prog[i] = 1; pct(); if (i === 2) root.visible = false
      if (rigs[0] && rigs[1] && rigs[2]) { setPhase('ready'); applyPose(true); if (pvp) startPvp() }
    }, e => { if (e.total) { prog[i] = e.loaded / e.total * 0.95; pct() } })
    load(BASE + 'mask/fight_hero.glb?v=' + MODEL_V, 0)
    load(BASE + 'mask/fight_boss.glb?v=' + MODEL_V, 1)
    load(BASE + 'mask/fight_boss2.glb?v=' + MODEL_V, 2)
    const two = () => !!pvp || sim.lv === 2   // правый боец — модель Призрака (у неё все клипы героя)
    const rigOf = (i: number) => i === 0 ? rigs[0] : rigs[two() ? 2 : 1]

    // ── симуляция
    let sim: Sim = newSim(1)
    let fightId = 0, running = false, acc = 0, inp = 0, log: InputLog = [], lastLogged = -1, combo = 0, comboT = 0, slow = 1, slowT = 0, shake = 0
    let bk = 0, b2T = -1e9
    const say = (text: string, sub?: string, tone?: 'gold' | 'red' | 'white', ms = 1300) => { const k = ++bk; setBanner({ k, text, sub, tone }); setTimeout(() => setBanner(b => b && b.k === k ? null : b), ms) }

    /** состояние бойца → клип; p — положение в клипе (секунды) или null, если клип просто крутится */
    const AIRT = Math.round(2 * JV / GRAV)
    const want = (f: F, i: number, fr: number): [string, number | null, boolean] => {
      const T = f.t + fr
      const seg = (n: string, len: number): [string, number, boolean] => { const g = SEG[n]; return [n, g[0] + (g[1] - g[0]) * Math.min(1, T / len), true] }
      switch (f.st) {
        case 'atk': {
          const m = MOVES[f.mv!], n = CLIP[f.mv!], k = KEYS[n], len = lenOf(pvp ? 0 : i, f.mv!, sim.lv)
          if (!k) return [n, null, true]
          // замах с разгоном → удар держится в активных кадрах (как «стоп-кадр» в MK) → спокойный возврат в стойку
          const ease = (u: number) => u * u * (1.6 - 0.6 * u)
          const act = Math.min(m.a, 6), hold = (k[2] - k[1]) * 0.12
          const tt = T <= m.s ? k[0] + (k[1] - k[0]) * ease(T / m.s)
            : T <= m.s + act ? k[1] + hold * ((T - m.s) / act)
            : k[1] + hold + (k[2] - k[1] - hold) * Math.min(1, (T - m.s - act) / Math.max(1, len - m.s - act))
          return [n, tt, true]
        }
        case 'fwd': return ['f_fwd', null, false]
        case 'back': return ['f_back', null, false]
        case 'dash': return ['f_fwd', null, false]
        case 'crouch': return ['f_crouchg', null, false]
        case 'cblock': return ['f_cguard', 0.5, true]
        case 'block': return ['f_guard', 0.5, true]
        case 'bstun': return f.cr ? ['f_cguard', 0.5, true] : seg('f_guardhit', Math.max(6, f.stn))
        case 'land': return ['f_crouchg', null, false]
        case 'jump': { const g = SEG.f_jump, up = f.air ? Math.min(1, (JV - f.vy) / (2 * JV)) : 1; return ['f_jump', g[0] + (g[1] - g[0]) * up, true] }
        case 'hit': return f.hitKind === 2 ? seg(rigOf(i)!.alt ? 'f_hitup' : 'f_hitbig', Math.max(10, f.stn)) : seg(f.hitKind === 1 ? 'f_hitbody' : 'f_hit', Math.max(10, f.stn))
        case 'down': return seg(f.hitKind === 3 ? 'f_sweepfall' : 'f_ko', 40)
        case 'up': return seg('f_getup', 20)
        case 'dodge': return seg('f_bdodge', 24)
        case 'ko': return seg(f.hitKind === 3 ? 'f_sweepfall' : 'f_ko', 90)
        case 'win': return [i === 1 && !pvp ? 'f_taunt' : 'f_win', null, false]
        default: return ['f_idle', null, false]
      }
    }
    void AIRT
    const applyPose = (force = false) => {
      const fr = Math.min(0.99, Math.max(0, acc))
      for (const i of [0, 1] as const) {
        const r = rigOf(i); if (!r) continue
        if (i === 1) { const o = rigs[two() ? 1 : 2]; if (o) o.root.visible = false; r.root.visible = true }
        const f = sim.f[i]
        r.root.position.set(f.x / 100, f.y / 400, 0); r.root.rotation.y = f.dir > 0 ? Math.PI / 2 : -Math.PI / 2
        const [name, pt, once] = want(f, i, running ? fr : 0)
        const k = `${name}:${f.st}:${f.mv || ''}:${once ? sim.tick - f.t : 0}`
        const a = r.A[name]; if (!a) continue
        if (k !== r.key || force) {
          if (f.st === 'hit' && k !== r.key) r.alt ^= 1
          r.key = k
          const prev = r.cur
          a.reset(); a.enabled = true
          a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once
          a.timeScale = pt === null ? 1 : 0
          a.play(); if (prev && prev !== a) prev.crossFadeTo(a, f.st === 'atk' ? 0.07 : f.st === 'crouch' || f.st === 'cblock' ? 0.1 : 0.14, false); r.cur = a
        }
        if (pt !== null) a.time = Math.min(a.getClip().duration - 0.001, Math.max(0, pt))
        if (name === 'f_csweep' && pt !== null) {   // подсечка: полный оборот корпуса, нога метёт по полу перед собой
          const u = Math.min(1, Math.max(0, (pt - 0.05) / 0.35)); r.root.rotation.y += f.dir * Math.PI * 2 * (u * u * (3 - 2 * u))
        }
      }
    }

    const handleEvents = () => {
      for (const e of sim.ev) {
        const tgt = sim.f[e.who], src = sim.f[1 - e.who]
        const hp = new THREE.Vector3((tgt.x + (src.x - tgt.x) * 0.35) / 100, e.mv === 'low' || e.mv === 'sweep' ? 0.35 : e.mv === 'kick' || e.mv === 'round' || e.mv === 'spin' || e.mv === 'knee' ? 1.15 : e.mv === 'jkick' || e.mv === 'jknee' ? 1.3 : 1.45, 0)
        const pan = Math.max(-0.8, Math.min(0.8, tgt.x / 400))
        if (e.k === 'hit' || e.k === 'kd' || e.k === 'ko') {
          if (e.k !== 'ko') { slow = 0.08; slowT = Math.max(slowT, e.k === 'kd' || (e.dmg || 0) > 90 ? 0.11 : 0.065) }   // стоп-кадр удара
          const heavy = e.k !== 'hit' || (e.dmg || 0) > 90
          sfx.hit(heavy ? 2 : (e.dmg || 0) > 50 ? 1 : 0, pan); burst(hp, heavy ? 18 : 9, e.who === 1 ? 0xffd27a : 0xff4a4a, heavy ? 1.4 : 1)
          shake = Math.max(shake, heavy ? 0.12 : 0.05); buzz(heavy ? 'heavy' : 'medium')
          if (e.who === 1 - me) { combo++; comboT = 1.2 } else combo = 0
          if (e.k === 'kd') setTimeout(() => sfx.fall(), 380)
          if (e.k === 'ko') { slow = 0.25; slowT = 1.4; arena.flash(0.8); setTimeout(() => sfx.fall(), 500); say('НОКАУТ', undefined, 'red', 1800) }
        } else if (e.k === 'block') { sfx.block(pan); burst(hp, 5, 0x7fe8ff, 0.7); shake = Math.max(shake, 0.02); buzz('light') }
        else if (e.k === 'whiff') sfx.whoosh(['round', 'kick', 'special', 'upper'].includes(e.mv || ''))
        else if (e.k === 'dodge') sfx.whoosh(false)
        else if (e.k === 'tech') { sfx.block(pan); say('ВЫРВАЛСЯ!', undefined, 'gold', 700) }
        else if (e.k === 'jump') sfx.jump()
        else if (e.k === 'land') sfx.land()
        else if (e.k === 'special') { sfx.special(); arena.flash(1); say(pvp || e.who === 0 ? 'СПЕЦПРИЁМ!' : 'ЯРОСТЬ СТРАЖА', undefined, 'gold', 900) }
        else if (e.k === 'time') say('ВРЕМЯ!', undefined, 'white', 1500)
        else if (e.k === 'start') { sfx.gong(); say('БОЙ!', undefined, 'gold', 800) }
        else if (e.k === 'boss2') { arena.flash(1); sfx.gong(); say('ВТОРОЙ БОСС', 'Призрак: его ещё никто не победил', 'red', 2600); b2T = performance.now(); for (const r of rigs) if (r) r.key = '' }
        else if (e.k === 'round') { const n = sim.wins[0] + sim.wins[1] + 1; setTimeout(() => { if (alive && running) say('РАУНД ' + n, n === 3 ? 'счёт 1 : 1 — решающий' : n === 2 ? `счёт ${sim.wins[0]} : ${sim.wins[1]}` : sim.lv === 2 ? 'против Призрака' : undefined, 'white', 1600) }, performance.now() - b2T < 500 ? 2900 : 300) }
      }
    }

    const finish = async () => {
      running = false
      if (pvp) {   // бой с другом не засчитывается — только итог на экране
        const win = sim.over === me + 1
        say(win ? 'ТЫ ПОБЕДИЛ' : 'ПОРАЖЕНИЕ', win ? 'друг повержен' : 'в следующий раз повезёт', win ? 'gold' : 'red', 2600)
        sfx.musicStop(2); try { ws?.close() } catch { /* */ }
        setTimeout(() => { setRes({ done: false, win }); setPhase('end') }, 2600)
        return
      }
      const win = sim.over === 1
      if (sim.lv === 2) ckpt.current = 2
      setTimeout(() => say(win ? 'ТЫ ПОБЕДИЛ' : 'ПОРАЖЕНИЕ', win ? 'оба босса повержены' : sim.lv === 2 ? 'призрак непобедим… пока' : 'страж непобедим… пока', win ? 'gold' : 'red', 2600), 1200)
      sfx.musicStop(2)
      setTimeout(() => setPhase('end'), 2600)
      try { const r = await maskApi.fightFinish(fightId, log, sim.tick); setRes({ done: r.done, win: r.win, flag: r.flag }) }
      catch { setRes({ done: false, win, flag: 'net' }) }
    }

    api.current.start = async () => {
      if (pvp) return
      sfx.init(); sfx.musicStart(); setRes(null)
      let seed = Math.floor(Math.random() * 2 ** 31)
      let lv = ckpt.current, ez = 0
      try { const r = await maskApi.fightStart(ckpt.current); fightId = r.fight_id; seed = r.seed; lv = r.lv ?? lv; ez = r.ez ? 1 : 0 } catch (e) { fightId = 0; if ((e as { message?: string })?.message === 'daily_limit') { sfx.musicStop(0.5); const tgA = (window as any).Telegram?.WebApp; const m = 'На сегодня попытки закончились (99 в сутки). Новые — после полуночи по Москве.'; if (tgA?.showAlert) tgA.showAlert(m); else window.alert(m); return } }
      if (!alive) return
      sim = newSim(seed, lv, ez); (window as unknown as { __fs: unknown }).__fs = () => sim; log = []; lastLogged = -1; inp = 0; combo = 0; acc = 0
      running = true; setPhase('fight'); applyPose(true); say('РАУНД 1', undefined, 'white', 1600)
    }
    // ── бой с другом: lockstep — шаг симуляции выполняется, когда известны нажатия обоих на этот тик
    let ws: WebSocket | null = null, me: 0 | 1 = 0
    const DELAY = 6   // задержка ввода в тиках (100 мс) — прячет пинг
    const qIn: [Map<number, number>, Map<number, number>] = [new Map(), new Map()]
    let outBuf: [number, number][] = [], waitT = 0
    const startPvp = async () => {
      try {
        const j = await maskApi.pvpJoin(pvp!)
        if (!alive) return
        me = j.side
        ws = new WebSocket(maskApi.pvpWsUrl(j.ticket))
        ws.onmessage = ev => {
          let d: any; try { d = JSON.parse(ev.data) } catch { return }
          if (d.type === 'wait') setPv(p => p && { ...p, st: 'wait' })
          else if (d.type === 'start') {
            me = d.side
            sim = newSim(d.seed, 1, 0, 1); (window as unknown as { __fs: unknown }).__fs = () => sim
            for (const q of qIn) { q.clear(); for (let t = 0; t < DELAY; t++) q.set(t, 0) }
            outBuf = []; inp = 0; combo = 0; acc = 0; waitT = 0
            sfx.init(); sfx.musicStart()
            setPv({ names: [String(d.names?.[0] || 'Игрок'), String(d.names?.[1] || 'Игрок')], side: me, st: 'fight' })
            running = true; setPhase('fight'); applyPose(true); say('РАУНД 1', undefined, 'white', 1600)
          } else if (d.type === 'left') {
            if (running && !sim.over) { running = false; setPv(p => p && { ...p, st: 'left' }); say('СОПЕРНИК ВЫШЕЛ', undefined, 'white', 2200); setTimeout(() => { setRes({ done: false, win: true }); setPhase('end') }, 2200) }
          } else if (Array.isArray(d.i)) {
            for (const x of d.i) if (Array.isArray(x) && typeof x[0] === 'number') qIn[1 - me].set(x[0], (x[1] | 0) & 0xffff)
          }
        }
        ws.onclose = () => {
          if (!alive || sim.over) return
          const was = running; running = false
          setPv(p => p && p.st !== 'left' ? { ...p, st: was ? 'gone' : 'err' } : p)
          if (was) { setRes({ done: false, win: false }); setPhase('end') }
        }
      } catch (e) {
        setPv(p => p && { ...p, st: (e as { message?: string })?.message === 'gone' || (e as { message?: string })?.message === 'taken' ? 'gone' : 'err' })
      }
    }
    /** один шаг боя с другом; false — ждём нажатия соперника */
    const pvpStep = () => {
      const k = sim.tick
      if (!qIn[me].has(k + DELAY)) { qIn[me].set(k + DELAY, inp); outBuf.push([k + DELAY, inp]) }
      if (!qIn[1 - me].has(k)) return false
      const a = qIn[0].get(k)!, b = qIn[1].get(k)!
      qIn[0].delete(k - 120); qIn[1].delete(k - 120)
      step(sim, a, b); return true
    }
    ;(window as unknown as { __pvd: unknown }).__pvd = () => ({ me, tick: sim.tick, q0: [...qIn[0].keys()].slice(-4), q1: [...qIn[1].keys()].slice(-4), waitT, running, acc, ws: ws?.readyState, out: outBuf.length })
    // отправка пачкой не чаще ~30 раз в секунду (на мониторах 144 Гц иначе слишком много сообщений)
    let lastFlush = 0
    const flushPvp = (force = false) => {
      const t = performance.now()
      if (outBuf.length && ws && ws.readyState === 1 && (force || t - lastFlush >= 30 || outBuf.length >= 4)) { for (let j = 0; j < outBuf.length; j += 100) ws.send(JSON.stringify({ i: outBuf.slice(j, j + 100) })); outBuf = []; lastFlush = t }
    }
    /** бой с другом считается по своему таймеру, а не по кадрам: свёрнутое окно (rAF замирает) не останавливает соперника */
    let pumpT = performance.now()
    const pump = () => {
      if (!pvp || !running) { pumpT = performance.now(); return }
      const now = performance.now(), rdt = Math.min(1, (now - pumpT) / 1000); pumpT = now
      if (rotRef.current) inp = 0   // в бою с другом паузы нет: пока телефон повёрнут, боец стоит
      acc += rdt * (document.hidden ? 1 : slow) * TPS
      let n = 0
      while (acc >= 1 && n < 90) {
        if (!pvpStep()) { acc = Math.min(acc, 2); waitT += rdt; break }
        if (waitT > 0.6) setPv(p => p && p.st === 'lag' ? { ...p, st: 'fight' } : p)
        waitT = 0
        handleEvents(); acc -= 1; n++
        if (sim.over && running) { flushPvp(true); finish(); break }
      }
      flushPvp()
      if (waitT > 0.6) setPv(p => p && p.st === 'fight' ? { ...p, st: 'lag' } : p)
      if (waitT > 20) { running = false; setPv(p => p && { ...p, st: 'gone' }); setRes({ done: false, win: false }); setPhase('end'); try { ws?.close() } catch { /* */ } }
    }
    const pumpI = pvp ? window.setInterval(pump, 8) : 0

    api.current.press = (b, d) => { inp = d ? (inp | b) : (inp & ~b) }
    api.current.dir = m => { inp = (inp & ~(IN_L | IN_R | IN_U | IN_D)) | m }

    const fit = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; R.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix() }
    const ro = new ResizeObserver(fit); ro.observe(el); fit()

    const clock = new THREE.Clock()
    let raf = 0, lastHud = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const rdt = Math.min(0.05, clock.getDelta())
      if (slowT > 0) { slowT -= rdt; if (slowT <= 0) slow = 1 }
      const dt = rdt * slow
      if (running && rotRef.current && !pvp) { inp = 0 }
      else if (running) {
        if (pvp) pump()
        else {
          acc += dt * TPS
          let n = 0
          while (acc >= 1 && n < 6) {
            if (inp !== lastLogged) { log.push([sim.tick, inp]); lastLogged = inp }
            step(sim, inp)
            handleEvents(); acc -= 1; n++
            if (sim.over && running) { finish(); break }
          }
        }
        applyPose()
        if (performance.now() - lastHud > 80) {
          lastHud = performance.now()
          if (comboT > 0) comboT -= 0.08; if (comboT <= 0) combo = 0
          setHud({ hp: [sim.f[0].hp, sim.f[1].hp], meter: [sim.f[0].meter, sim.f[1].meter], wins: [...sim.wins], lv: sim.lv, time: Math.ceil(sim.rt / TPS), round: sim.wins[0] + sim.wins[1] + 1, combo: combo > 1 ? combo : 0 })
        }
        sfx.musicIntensity(Math.min(1, (HP * 2 - sim.f[0].hp - sim.f[1].hp) / (HP * 1.3)))
      } else if (rigs[0] && rigs[1] && rigs[2] && !sim.over) applyPose()
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
    const KM: Record<string, number> = { ArrowLeft: IN_L, KeyA: IN_L, ArrowRight: IN_R, KeyD: IN_R, ArrowUp: IN_U, KeyW: IN_U, ArrowDown: IN_D, KeyS: IN_D, ShiftLeft: IN_BLOCK, KeyO: IN_BLOCK, KeyU: IN_P, KeyI: IN_P2, KeyJ: IN_K, KeyK: IN_K2, KeyL: IN_S, Space: IN_S }
    const kd = (e: KeyboardEvent) => { const b = KM[e.code]; if (b) { e.preventDefault(); inp |= b } }
    const ku = (e: KeyboardEvent) => { const b = KM[e.code]; if (b) { e.preventDefault(); inp &= ~b } }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    const vis = () => { if (document.hidden) inp = 0 }
    document.addEventListener('visibilitychange', vis)

    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); window.clearInterval(pumpI); try { ws?.close() } catch { /* */ }
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); document.removeEventListener('visibilitychange', vis)
      S.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose() })
      pm.dispose(); R.dispose(); R.domElement.remove(); sfx.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // кнопки: удержание — через pointer-события (работает и мультитач)
  const Btn = ({ b, label, cls, big, icon }: { b: number; label: string; cls: string; big?: boolean; icon?: 'fist' | 'kick' | 'shield' | 'bolt' | 'l' | 'r' }) => (
    <button
      onPointerDown={e => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); api.current.press(b, true) }}
      onPointerUp={e => { e.preventDefault(); api.current.press(b, false) }}
      onPointerCancel={() => api.current.press(b, false)} onPointerLeave={() => api.current.press(b, false)}
      onContextMenu={e => e.preventDefault()}
      className={`fg-key ${big ? 'is-big' : ''} ${cls}`} aria-label={label}
      style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as any}>{icon && <Ico k={icon} />}{label && <span>{label}</span>}</button>
  )
  /** Шкала здоровья в духе MK11: стальная рамка с золотой кромкой, золотая заливка, красный след урона, медальон бойца */
  const Health = ({ v, name, right, wins, meter, hue }: { v: number; name: string; right?: boolean; wins: number; meter: number; hue: 'c' | 'm' }) => {
    const pct = Math.max(0, v / HP * 100), low = pct <= 25
    return (
      <div className={`mk-side ${right ? 'is-r' : ''} ${low ? 'is-low' : ''}`} style={{ ['--hp' as any]: `${pct}%` }}>
        <div className="mk-medal"><span>{hue === 'c' ? <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 3l9 16H3z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /><path d="M12 9.5l4 7.5H8z" fill="currentColor" /></svg> : <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 12c2.5-4.5 5.5-6.5 9-6.5s6.5 2 9 6.5c-2.5 4.5-5.5 6.5-9 6.5S5.5 16.5 3 12z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>}</span></div>
        <div className="mk-col">
          <div className="mk-bar">
            <div className="mk-well">
              <div className="mk-trail" />
              <div className="mk-fill" />
              <div className="mk-gloss" />
            </div>
          </div>
          <div className="mk-meta">
            <span className="mk-name">{name}</span>
            <span className="mk-wins">{[0, 1].map(i => <i key={i} className={wins > i ? 'on' : ''} />)}</span>
            <span className={`mk-meter ${hue === 'c' ? 'c' : 'm'}`}><b style={{ width: `${meter / 10}%` }} className={meter >= 1000 ? 'full' : ''} /></span>
          </div>
        </div>
      </div>
    )
  }
  const Ico = ({ k }: { k: 'fist' | 'kick' | 'shield' | 'bolt' | 'l' | 'r' }) => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {k === 'fist' && <><path d="M7 11V7.5a1.5 1.5 0 0 1 3 0V11" /><path d="M10 10V6.5a1.5 1.5 0 0 1 3 0V10" /><path d="M13 10V7a1.5 1.5 0 0 1 3 0v3.5" /><path d="M16 10.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1.5A5.5 5.5 0 0 1 6 14.5V12a1.5 1.5 0 0 1 3 0" /></>}
      {k === 'kick' && <path d="M7 3h4.5v8.5l6.6 3.3c1.1.55 1.9 1.6 1.9 2.8V19H5v-3.2l2-2.8z" fill="currentColor" stroke="none" />}
      {k === 'shield' && <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />}
      {k === 'bolt' && <path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none" />}
      {k === 'l' && <path d="M15 5l-7 7 7 7" />}
      {k === 'r' && <path d="M9 5l7 7-7 7" />}
    </svg>
  )
  const mySide = pv?.side ?? 0
  const specReady = hud.meter[mySide] >= 1000
  const nm = (i: 0 | 1) => pv ? (i === mySide ? 'ТЫ' : (pv.names[i] || 'ДРУГ').toUpperCase().slice(0, 12)) : i === 0 ? 'ТЫ' : hud.lv === 2 ? 'ПРИЗРАК' : 'СТРАЖ'
  /** крестовина: одним пальцем 8 направлений (вверх — прыжок, вниз — присед), можно скользить не отрывая */
  const DPad = () => {
    const upd = (e: React.PointerEvent<HTMLDivElement>, on: boolean) => {
      const el = e.currentTarget, r = el.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5
      let m = 0
      if (on) { if (dx < -0.16) m |= IN_L; if (dx > 0.16) m |= IN_R; if (dy < -0.16) m |= IN_U; if (dy > 0.16) m |= IN_D }
      const d = padRef.current
      if (m !== d) {
        padRef.current = m; api.current.dir(m); if (m & ~d) buzz('light')
        el.querySelectorAll<HTMLElement>('.fg-pad-a').forEach(n => n.classList.toggle('on', !!(m & Number(n.dataset.b))))
      }
    }
    const arm = (b: number, cls: string, path: string) => <span data-b={b} className={`fg-pad-a ${cls}`}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg></span>
    return (
      <div className="fg-pad" onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); upd(e, true) }}
        onPointerMove={e => { if (padRef.current || e.buttons) upd(e, true) }} onPointerUp={e => upd(e, false)} onPointerCancel={e => upd(e, false)}>
        {arm(IN_U, 'u', 'M5 15l7-7 7 7')}{arm(IN_L, 'l', 'M15 5l-7 7 7 7')}{arm(IN_R, 'r', 'M9 5l7 7-7 7')}{arm(IN_D, 'd', 'M5 9l7 7 7-7')}
        <i className="fg-pad-c" />
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 bg-black select-none" style={{ zIndex: 1000, touchAction: 'none' }}>
      <div ref={host} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(130% 90% at 50% 45%, transparent 55%, rgba(5,2,15,0.6) 100%)' }} />
      {/* верх: здоровье и таймер — у самого края экрана, чтобы не закрывать бойцов */}
      {phase !== 'load' && (
        <div className="absolute top-0 inset-x-0 pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 6px)', paddingLeft: 'calc(env(safe-area-inset-left,0px) + 14px)', paddingRight: 'calc(env(safe-area-inset-right,0px) + 14px)' }}>
          <div className="flex items-start gap-1.5">
            <Health v={hud.hp[0]} name={nm(0)} wins={hud.wins[0]} meter={hud.meter[0]} hue="c" />
            <div className={`mk-timer ${hud.time <= 10 ? 'is-hot' : ''}`}><span>{hud.time}</span></div>
            <Health v={hud.hp[1]} name={nm(1)} right wins={hud.wins[1]} meter={hud.meter[1]} hue="m" />
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

      {pv && phase === 'fight' && pv.st === 'lag' && <div className="absolute top-[18%] inset-x-0 grid place-items-center pointer-events-none"><div className="glass rounded-[14px] px-4 py-2.5 text-center text-[13.5px]">Соперник не отвечает…<div className="text-[12px] text-gray mt-0.5">слабая связь или он свернул игру — ждём до 20 секунд</div></div></div>}
      {banner && <div key={banner.k} className="absolute inset-x-0 top-[26%] grid place-items-center pointer-events-none text-center">
        <div className="font-display font-black italic text-[58px] leading-none tracking-wide" style={{ animation: 'fgBan 1.3s ease-out both', background: banner.tone === 'red' ? 'linear-gradient(180deg,#ffd0c4,#ff3b2f 45%,#7a0d0d)' : banner.tone === 'gold' ? 'linear-gradient(180deg,#fff6d0,#f1c24a 45%,#8a5a12)' : 'linear-gradient(180deg,#ffffff,#c9d4e8 50%,#5a6a88)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 4px 0 rgba(0,0,0,.55)) drop-shadow(0 0 22px rgba(0,0,0,.6))' }}>{banner.text}</div>
        {banner.sub && <div className="mt-2 text-[15px] text-white/80">{banner.sub}</div>}
      </div>}
      <style>{'@keyframes fgBan{0%{transform:scale(2.2);opacity:0;filter:blur(6px)}18%{transform:scale(1);opacity:1;filter:blur(0)}80%{opacity:1}100%{opacity:0;transform:scale(1.04)}}@keyframes fgPop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}:root{--fg-c:#34E8FF;--fg-m:#FF3FB4;--fg-y:#FFD23F;--fg-ink:#0A0716}.mk-side{flex:1;min-width:0;display:flex;align-items:flex-start;gap:6px}.mk-side.is-r{flex-direction:row-reverse}.mk-col{flex:1;min-width:0;display:flex;flex-direction:column}.mk-medal{flex-shrink:0;width:40px;height:40px;border-radius:50%;padding:2px;margin-top:-2px;background:conic-gradient(from 210deg,#f6e2a2,#8a6a2a,#2a2014,#b08a3c,#f6e2a2);box-shadow:0 3px 10px rgba(0,0,0,.7)}.mk-medal span{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 40% 30%,#4a4652,#16141a 70%);color:#e8d28f;box-shadow:inset 0 2px 4px rgba(255,255,255,.15),inset 0 -3px 6px rgba(0,0,0,.6)}.mk-bar{position:relative;height:22px;padding:2px;clip-path:polygon(0 0,100% 0,calc(100% - 16px) 100%,0 100%);background:linear-gradient(180deg,#e9d18a 0,#7b5f27 2px,#3a3d46 3px,#1b1c22 55%,#0c0c10 100%)}.mk-side.is-r .mk-bar{clip-path:polygon(0 0,100% 0,100% 100%,16px 100%)}.mk-well{position:relative;height:100%;clip-path:inherit;background:linear-gradient(180deg,#2a0608,#120203);box-shadow:inset 0 2px 4px rgba(0,0,0,.8)}.mk-trail,.mk-fill{position:absolute;top:0;bottom:0;left:0;width:var(--hp)}.mk-side.is-r .mk-trail,.mk-side.is-r .mk-fill{left:auto;right:0}.mk-trail{background:linear-gradient(180deg,#ff6a5a,#c4121c 55%,#6e0408);transition:width .9s cubic-bezier(.3,.7,.2,1) .45s}.mk-fill{background:linear-gradient(180deg,#fffbe0 0%,#ffe36a 18%,#ffc21f 48%,#e58a06 78%,#9c5300 100%);box-shadow:2px 0 8px rgba(255,190,40,.55);transition:width .09s linear}.mk-side.is-r .mk-fill{box-shadow:-2px 0 8px rgba(255,190,40,.55)}.mk-gloss{position:absolute;left:0;right:0;top:0;height:42%;background:linear-gradient(180deg,rgba(255,255,255,.45),rgba(255,255,255,0));pointer-events:none}.mk-side.is-low .mk-fill{background:linear-gradient(180deg,#ffe0d8 0%,#ff7a5a 22%,#e8321f 55%,#8a0a0a 100%);animation:mkPulse .6s ease-in-out infinite}@keyframes mkPulse{50%{filter:brightness(1.35)}}.mk-meta{display:flex;align-items:center;gap:8px;margin-top:3px;padding:0 3px}.mk-side.is-r .mk-meta{flex-direction:row-reverse}.mk-name{font-family:Unbounded,system-ui,sans-serif;font-weight:700;font-size:12px;letter-spacing:.16em;color:#f4efe2;text-shadow:0 1px 0 #000,0 0 8px rgba(0,0,0,.9)}.mk-wins{display:flex;gap:4px}.mk-side.is-r .mk-wins{flex-direction:row-reverse}.mk-wins i{width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#3a3a44,#101014);box-shadow:inset 0 0 0 1.5px #8a6a2a}.mk-wins i.on{background:radial-gradient(circle at 40% 35%,#fff3c0,#e3a824 55%,#7a4e0c);box-shadow:inset 0 0 0 1.5px #f6e2a2,0 0 8px rgba(255,200,80,.7)}.mk-meter{flex:1;max-width:130px;height:6px;background:#0d0d12;box-shadow:inset 0 0 0 1px rgba(233,209,138,.35);display:flex;overflow:hidden}.mk-side.is-r .mk-meter{justify-content:flex-end}.mk-meter b{display:block;height:100%}.mk-meter.c b{background:linear-gradient(180deg,#bff6ff,#2fb8e8 60%,#0a5e80)}.mk-meter.m b{background:linear-gradient(180deg,#ffd0ec,#e63aa0 60%,#7a0c4e)}.mk-meter b.full{animation:mkPulse .7s ease-in-out infinite}.mk-timer{flex-shrink:0;width:50px;height:50px;margin-top:-4px;border-radius:50%;padding:3px;background:conic-gradient(from 0deg,#f6e2a2,#8a6a2a,#2a2014,#b08a3c,#f6e2a2,#8a6a2a,#2a2014,#b08a3c,#f6e2a2);box-shadow:0 4px 14px rgba(0,0,0,.75)}.mk-timer span{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 30%,#3d3a44,#121116 70%);box-shadow:inset 0 0 0 2px #1a1a1f,inset 0 3px 6px rgba(255,255,255,.12);font-family:Unbounded,system-ui,sans-serif;font-weight:800;font-size:19px;color:#f4efe2;font-variant-numeric:tabular-nums;text-shadow:0 1px 0 #000}.mk-timer.is-hot span{color:#ff5a4a;animation:mkPulse .5s steps(2) infinite}.fg-key{position:relative;display:grid;place-items:center;align-content:center;gap:1px;width:62px;height:62px;clip-path:polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%);color:#fff;font-family:Unbounded,system-ui,sans-serif;font-weight:700;font-size:10.5px;touch-action:none;user-select:none;transition:transform .06s,filter .06s;background:var(--kbg);box-shadow:inset 0 0 0 2px var(--kc)}.fg-key.is-big{width:80px;height:76px;font-size:11.5px}.fg-key svg{width:24px;height:24px}.fg-key.is-big svg{width:30px;height:30px}.fg-key::after{content:\"\";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.28),transparent 45%);pointer-events:none}.fg-key:active{transform:scale(.93);filter:brightness(1.35) drop-shadow(0 0 14px var(--kc))}.k-punch{--kc:var(--fg-y);--kbg:linear-gradient(180deg,rgba(255,210,63,.55),rgba(120,80,0,.6));color:#fff6d6}.k-kick{--kc:var(--fg-m);--kbg:linear-gradient(180deg,rgba(255,63,180,.55),rgba(110,10,70,.6))}.k-block{--kc:rgba(200,215,255,.8);--kbg:linear-gradient(180deg,rgba(150,165,210,.45),rgba(20,24,44,.7))}.k-spec{--kc:var(--fg-c);--kbg:linear-gradient(180deg,rgba(52,232,255,.5),rgba(4,70,90,.65))}.k-spec.is-off{opacity:.4;filter:saturate(.3)}.k-spec.is-ready{animation:fgReady 1s ease-in-out infinite}@keyframes fgReady{50%{filter:brightness(1.5) drop-shadow(0 0 16px var(--fg-c))}}.fg-cluster4{display:grid;grid-template-columns:auto auto;gap:3px 4px;justify-items:center;align-items:end}.fg-key.is-sm{width:52px;height:48px;font-size:9.5px}.fg-key.is-sm svg{width:19px;height:19px}.k-alt{filter:saturate(1.35) brightness(1.08)}.k-alt::before{content:\"\";position:absolute;right:13px;top:9px;width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.8}.fg-cluster{display:grid;grid-template-columns:auto auto;gap:4px 2px;align-items:end;justify-items:center}.fg-cluster .k-spec{transform:translate(10px,8px)}.fg-cluster .k-block{transform:translate(-4px,8px)}.fg-rocker{display:flex;gap:2px;padding:4px;clip-path:polygon(12% 0,88% 0,100% 50%,88% 100%,12% 100%,0 50%);background:rgba(10,7,22,.55);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}.fg-pad{position:relative;width:150px;height:150px;touch-action:none;user-select:none;border-radius:50%;background:radial-gradient(circle,rgba(20,18,30,.55) 0,rgba(10,8,20,.45) 62%,transparent 64%)}.fg-pad-a{position:absolute;width:52px;height:52px;display:grid;place-items:center;color:var(--fg-c);background:linear-gradient(180deg,rgba(40,44,80,.75),rgba(10,8,24,.85));box-shadow:inset 0 0 0 1.5px rgba(52,232,255,.45);border-radius:10px;transition:transform .05s,filter .05s;pointer-events:none}.fg-pad-a.u{left:49px;top:4px}.fg-pad-a.d{left:49px;bottom:4px}.fg-pad-a.l{left:4px;top:49px}.fg-pad-a.r{right:4px;top:49px}.fg-pad-a.on{filter:brightness(1.6) drop-shadow(0 0 10px var(--fg-c));transform:scale(.94)}.fg-pad-c{position:absolute;left:61px;top:61px;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#3a3a48,#111018);box-shadow:inset 0 0 0 1.5px rgba(233,209,138,.4);pointer-events:none}.fg-dir{--kc:rgba(52,232,255,.55);--kbg:linear-gradient(180deg,rgba(40,44,80,.7),rgba(10,8,24,.8));color:var(--fg-c)}@media (prefers-reduced-motion:reduce){.k-spec.is-ready,.mk-meter b.full,.mk-side.is-low .mk-fill{animation:none}}'}</style>

      {/* управление */}
      {phase === 'fight' && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 14px)', paddingLeft: 'calc(env(safe-area-inset-left,0px) + 18px)', paddingRight: 'calc(env(safe-area-inset-right,0px) + 18px)' }}>
          {DPad()}
          <div className="fg-cluster4">
            <Btn b={IN_S} label="Спец" icon="bolt" cls={`k-spec is-sm ${specReady ? 'is-ready' : 'is-off'}`} />
            <Btn b={IN_BLOCK} label="Блок" icon="shield" cls="k-block is-sm" />
            <Btn b={IN_P} label="Рука 1" icon="fist" cls="k-punch" />
            <Btn b={IN_P2} label="Рука 2" icon="fist" cls="k-punch k-alt" />
            <Btn b={IN_K} label="Нога 1" icon="kick" cls="k-kick" />
            <Btn b={IN_K2} label="Нога 2" icon="kick" cls="k-kick k-alt" />
          </div>
        </div>
      )}

      {needRotate && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/85 backdrop-blur-sm text-center px-8">
          <div>
            <div className="mx-auto w-14 h-24 rounded-[14px] border-[3px] border-white/80 relative" style={{ animation: 'fgRot 1.8s ease-in-out infinite' }}><i className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-white/70" /></div>
            <div className="font-display font-semibold text-[18px] mt-6">Поверни телефон</div>
            <p className="text-[13.5px] text-gray mt-1.5">Драка идёт в горизонтальном режиме — так видно обоих бойцов{phase === 'fight' ? (pvp ? '. Бой с другом не останавливается!' : '. Бой на паузе.') : '.'}</p>
            <button onClick={() => onClose(false)} className="btn-secondary h-11 rounded-[14px] px-5 mt-5 text-[14px]">Выйти</button>
          </div>
          <style>{'@keyframes fgRot{0%,20%{transform:rotate(0)}50%,80%{transform:rotate(-90deg)}100%{transform:rotate(0)}}'}</style>
        </div>
      )}
      {(phase === 'load' || phase === 'ready' || phase === 'end') && (
        <div className="absolute inset-x-0 bottom-0 p-4 flex justify-center" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 14px)' }}>
          <div className="glass rounded-[22px] p-4 text-center w-full max-w-[460px]">
            {phase === 'load' && <div className="py-3"><div className="text-[14px] text-gray mb-2">Загрузка арены… {loadPct}%</div><div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-green" style={{ width: `${loadPct}%` }} /></div></div>}
            {phase === 'ready' && pv && <>
              <div className="font-display font-semibold text-[17px]">Бой с другом</div>
              <p className="text-[13.5px] text-gray mt-1.5">{pv.st === 'conn' ? 'Подключаемся…' : pv.st === 'wait' ? 'Ждём, пока соперник откроет вызов. Не закрывай экран.' : pv.st === 'gone' ? 'Вызов уже недействителен — создай новый.' : pv.st === 'err' ? 'Не удалось подключиться. Попробуй ещё раз.' : 'Начинаем…'}</p>
              <p className="text-[12px] text-gray2 mt-1.5">Бой до двух побед. На прохождение этапа и приз не влияет.</p>
              <button onClick={() => onClose(false)} className="btn-secondary w-full h-11 rounded-[14px] mt-3">Выйти</button>
            </>}
            {phase === 'ready' && !pv && <>
              <div className="font-display font-semibold text-[17px]">Победи стража и призрака</div>
              <p className="text-[13px] text-gray mt-1.5">Два босса подряд, каждый бой до двух побед. Страж читает каждый удар — бей, когда он открылся после атаки. Победишь его — выйдет Призрак, он ещё сильнее.</p>
              <div className="text-[12px] text-gray2 mt-2 text-left grid grid-cols-2 gap-x-3 gap-y-1">
                <span>Рука 1 — джеб (серия ×3), ▶ локоть, ◀ апперкот</span><span>Рука 2 — кросс, ▶ хук, ◀ апперкот</span>
                <span>Нога 1 — низкий удар (серия), ▶ колено / удар ногой</span><span>Нога 2 — круговой, ▶ хай-кик, ◀ вертушка</span>
                <span>▼ + Рука 1 — тычок, ▼ + Рука 2 — апперкот</span><span>▼ + Нога 1 — удар по ногам, ▼ + Нога 2 — подсечка</span>
                <span>▲ — прыжок, в воздухе рука или нога</span><span>Блок — верх и середина, ▼ + Блок — низ</span>
                <span>◀◀ отскок · ▶▶ рывок · бросок сбрасывается нажатием руки</span><span>Спец — когда шкала полна</span>
              </div>
              <p className="text-[11.5px] text-gray2 mt-1.5">На ПК: ← → ↑ ↓ · U/I руки · J/K ноги · Shift/O блок · Пробел спец</p>
              <button onClick={() => api.current.start()} className="btn-primary w-full mt-3">В бой</button>
            </>}
            {phase === 'end' && pv && <>
              <div className="font-display font-semibold text-[18px]">{pv.st === 'left' ? 'Соперник вышел' : pv.st === 'gone' ? 'Связь потеряна' : res?.win ? 'Победа!' : 'Поражение'}</div>
              <p className="text-[13.5px] text-gray mt-1">Бой с другом не засчитывается в задание — это тренировка.</p>
              <button onClick={() => onClose(false)} className="btn-secondary w-full h-12 rounded-[16px] mt-3">Выйти</button>
            </>}
            {phase === 'end' && !pv && <>
              <div className="font-display font-semibold text-[18px]">{res?.done ? 'Задание выполнено!' : res?.win ? 'Победа!' : ckpt.current === 2 ? 'Призрак победил' : 'Страж победил'}</div>
              <p className="text-[13.5px] text-gray mt-1">{res?.flag === 'bad' ? 'Бой не засчитан сервером' : res?.flag === 'net' ? 'Нет связи с сервером — результат не сохранён' : res?.win ? 'Сервер подтвердил победу.' : 'Ищи момент, когда он раскрылся после удара.'}</p>
              <div className="flex gap-2 mt-3">
                {!res?.done && <button onClick={() => api.current.start()} className="btn-primary flex-1">{ckpt.current === 2 ? 'Снова с Призраком' : 'Ещё раз'}</button>}
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
