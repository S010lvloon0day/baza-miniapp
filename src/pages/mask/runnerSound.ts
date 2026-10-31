/**
 * Звук забега.
 *  · эффекты — настоящие записи (Kenney, CC0): шаги по бетону, шорох одежды, удары тела и металла;
 *  · музыка — свой трек, синтез на лету: ударные, бас с сабом, арпеджио в стерео, пэд, супер-со лид,
 *    ревербератор и «качающий» сайдчейн от бочки; темп и энергия растут со скоростью бега.
 * Контекст создаётся по нажатию «Старт» (иначе мобильные браузеры не дают звук).
 */
const BASE = import.meta.env.BASE_URL + 'mask/sfx/'
const SAMPLES: Record<string, number> = { step: 6, thud: 5, land: 3, metal: 3, punch: 5, cloth: 4, belt: 2, ok: 2, sel: 1, go: 1, drop: 1, hitm: 5, blk: 5, bell: 1, mlt: 3, hl: 6, hm: 8, hh: 8, bk: 5 }

export function createRunnerSound(opt: { fight?: boolean } = {}) {
  const FIGHT = !!opt.fight
  let ctx: AudioContext | null = null
  let master: GainNode | null = null, sfxBus: GainNode | null = null, musBus: GainNode | null = null, duck: GainNode | null = null
  let verb: ConvolverNode | null = null, verbIn: GainNode | null = null
  let noise: AudioBuffer | null = null
  const buf: Record<string, AudioBuffer[]> = {}
  let muted = false, musicOn = true
  try { muted = localStorage.getItem('mg_mute') === '1'; musicOn = localStorage.getItem('mg_music') !== '0' } catch { /* */ }

  // ── iOS / Telegram: «разблокировка» звука жестом и режим медиа (играет и в беззвучном режиме)
  let htmlAudio: HTMLAudioElement | null = null
  const silentWav = () => {
    const n = 4410, b = new ArrayBuffer(44 + n * 2), v = new DataView(b)
    const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true)
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }))
  }
  const unlock = () => {
    try { const as = (navigator as any).audioSession; if (as) as.type = 'playback' } catch { /* */ }
    try {
      if (!htmlAudio) { htmlAudio = new Audio(silentWav()); htmlAudio.loop = true; (htmlAudio as any).playsInline = true; htmlAudio.volume = 0.01 }
      htmlAudio.play().catch(() => {})
    } catch { /* */ }
    if (ctx) {
      if (ctx.state !== 'running') ctx.resume().catch(() => {})
      try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0) } catch { /* */ }
    }
  }
  let armed = false
  const arm = () => {
    if (armed) return; armed = true
    const h = () => { if (ctx && ctx.state !== 'running') unlock() }
    for (const ev of ['touchend', 'pointerup', 'keydown']) window.addEventListener(ev, h, { passive: true })
    document.addEventListener('visibilitychange', () => { if (!document.hidden) h() })
  }

  /** импульс ревербератора: затухающий стерео-шум */
  const impulse = (sec: number, decay: number) => {
    const sr = ctx!.sampleRate, len = Math.floor(sr * sec), b = ctx!.createBuffer(2, len, sr)
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) }
    return b
  }
  const loadSamples = () => {
    for (const [k, n] of Object.entries(SAMPLES)) for (let i = 0; i < n; i++) {
      fetch(BASE + k + i + '.mp3').then(r => r.arrayBuffer()).then(a => new Promise<AudioBuffer>((res, rej) => { const pr = ctx!.decodeAudioData(a, res, rej) as unknown as Promise<AudioBuffer> | undefined; pr?.catch?.(rej) }))
        .then(b => { (buf[k] ||= [])[i] = b }).catch(() => {})
    }
  }
  const init = () => {
    if (ctx) { unlock(); return }
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    ctx = new AC({ latencyHint: 'interactive' }) as AudioContext
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2
    master.connect(comp); comp.connect(ctx.destination)
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master)
    duck = ctx.createGain(); duck.connect(master)
    musBus = ctx.createGain(); musBus.gain.value = 0; musBus.connect(duck)
    verb = ctx.createConvolver(); verb.buffer = impulse(2.4, 3.2)
    verbIn = ctx.createGain(); verbIn.gain.value = 1
    const vOut = ctx.createGain(); vOut.gain.value = 0.32
    verbIn.connect(verb); verb.connect(vOut); vOut.connect(duck)
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    loadSamples(); unlock(); arm()
  }

  // ── эффекты из записей
  const last: Record<string, number> = {}
  const play = (k: string, o: { vol?: number; rate?: number; jitter?: number; pan?: number; delay?: number; verb?: number } = {}) => {
    if (!ctx || !sfxBus) return false
    const list = buf[k]?.filter(Boolean); if (!list?.length) return false
    let i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === last[k]) i = (i + 1) % list.length; last[k] = i
    const t = ctx.currentTime + (o.delay || 0)
    const s = ctx.createBufferSource(); s.buffer = list[i]
    s.playbackRate.value = (o.rate ?? 1) * (1 + ((Math.random() * 2 - 1) * (o.jitter ?? 0.06)))
    const g = ctx.createGain(); g.gain.value = o.vol ?? 1
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null
    s.connect(g); if (p) { p.pan.value = o.pan ?? 0; g.connect(p); p.connect(sfxBus) } else g.connect(sfxBus)
    if (o.verb && verbIn) { const vg = ctx.createGain(); vg.gain.value = o.verb; g.connect(vg); vg.connect(verbIn) }
    s.start(t); return true
  }
  /** синтетический «вжух» воздуха — дополняет записи */
  const air = (dur: number, f0: number, f1: number, vol: number, delay = 0) => {
    if (!ctx || !sfxBus || !noise) return
    const t = ctx.currentTime + delay
    const src = ctx.createBufferSource(); src.buffer = noise
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t, Math.random()); src.stop(t + dur + 0.05)
  }

  // ── музыка
  const MUSIC_VOL = 0.42
  let timer = 0, step16 = 0, nextT = 0, inten = 0, bars = 0
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
  // две четырёхтактовые прогрессии: Am–F–C–G и Am–F–G–Em
  // забег: Am–F–C–G; драка: Dm–B♭–Gm–A (мрачнее и напряжённее)
  const PROG = FIGHT
    ? [[[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]], [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]]]
    : [[[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]]]
  const MEL_FIGHT = [
    [74, -1, 74, 77, -1, 76, 74, -1, 73, -1, 74, -1, 69, -1, -1, -1],
    [70, -1, 70, 74, -1, 72, 70, -1, 69, -1, 70, 72, -1, 74, -1, -1],
    [67, -1, 70, 74, -1, 79, 77, -1, 76, -1, 74, -1, 72, -1, 70, -1],
    [69, -1, 73, 76, -1, 79, -1, 77, 76, -1, 73, -1, 69, -1, -1, -1],
  ]
  const MEL = [
    [76, -1, 74, 76, -1, 79, -1, 76, 74, -1, 72, -1, 74, -1, 72, 71],
    [72, -1, -1, 69, -1, 72, 74, -1, 76, -1, -1, -1, 74, -1, 72, -1],
    [74, -1, 72, 74, -1, 76, -1, 79, 81, -1, 79, -1, 76, -1, 74, -1],
    [71, -1, 72, -1, 74, -1, 71, -1, 67, -1, -1, -1, 69, -1, 71, -1],
  ]
  const voice = (t: number, type: OscillatorType, f: number, dur: number, vol: number, o: { cut?: number; cutEnd?: number; q?: number; det?: number; att?: number; rel?: number; pan?: number; rv?: number; glide?: number } = {}) => {
    if (!ctx || !musBus) return
    const os = ctx.createOscillator(); os.type = type; os.frequency.setValueAtTime(f, t); if (o.det) os.detune.value = o.det
    if (o.glide) os.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.glide), t + Math.min(dur, 0.12))
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = o.q ?? 1
    fl.frequency.setValueAtTime(o.cut ?? 8000, t); if (o.cutEnd) fl.frequency.exponentialRampToValueAtTime(o.cutEnd, t + dur)
    const g = ctx.createGain(); const a = o.att ?? 0.004, r = o.rel ?? dur
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + r)
    os.connect(fl); fl.connect(g)
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null
    if (p) { p.pan.value = o.pan ?? 0; g.connect(p); p.connect(musBus) } else g.connect(musBus)
    if (o.rv && verbIn) { const s = ctx.createGain(); s.gain.value = o.rv; g.connect(s); s.connect(verbIn) }
    os.start(t); os.stop(t + a + r + 0.05)
  }
  const nz = (t: number, type: BiquadFilterType, f: number, dur: number, vol: number, o: { q?: number; pan?: number; rv?: number } = {}) => {
    if (!ctx || !musBus || !noise) return
    const s = ctx.createBufferSource(); s.buffer = noise
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = o.q ?? 0.8
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(fl); fl.connect(g)
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null
    if (p) { p.pan.value = o.pan ?? 0; g.connect(p); p.connect(musBus) } else g.connect(musBus)
    if (o.rv && verbIn) { const sg = ctx.createGain(); sg.gain.value = o.rv; g.connect(sg); sg.connect(verbIn) }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02)
  }
  const kick = (t: number) => {
    voice(t, 'sine', 160, 0.42, 1.0, { glide: 0.28, att: 0.002, rel: 0.4 })
    nz(t, 'highpass', 3500, 0.012, 0.25)
    // сайдчейн: музыка «приседает» на каждую бочку
    if (duck && ctx) { duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(0.45, t); duck.gain.linearRampToValueAtTime(1, t + 0.22) }
  }
  const sched = () => {
    if (!ctx) return
    const bpm = FIGHT ? 126 + inten * 14 : 104 + inten * 24, s16 = 60 / bpm / 4
    while (nextT < ctx.currentTime + 0.15) {
      const t = nextT, st = step16 % 16, bar = Math.floor(step16 / 16)
      const prog = PROG[Math.floor(bar / 4) % 2], ch = prog[bar % 4]
      const intro = bar < 4, lvl = intro ? 0 : inten < 0.35 ? 1 : 2      // 0 — вступление, 1 — грув, 2 — «дроп»
      const bright = 700 + inten * 3200
      // ударные
      if (!intro) {
        if (st % 4 === 0) kick(t)
        if (st === 4 || st === 12) { nz(t, 'bandpass', 1900, 0.2, 0.55, { q: 0.7, rv: 0.35 }); voice(t, 'triangle', 200, 0.12, 0.35, { glide: 0.55 }) }
        if (st % 2 === 1) nz(t, 'highpass', 8000, st % 4 === 3 ? 0.07 : 0.035, st % 4 === 3 ? 0.2 : 0.11, { pan: st % 4 === 3 ? 0.25 : -0.25 })
        if (lvl === 2 && st % 2 === 0 && st % 4 !== 0) nz(t, 'highpass', 9500, 0.03, 0.08, { pan: 0.4 })
        if (st === 15 && bar % 4 === 3) for (let k = 0; k < 4; k++) nz(t + k * s16 / 4, 'bandpass', 1500 + k * 300, 0.08, 0.25 + k * 0.06, { rv: 0.3 })
      } else if (st === 0 && bar === 3) nz(t, 'bandpass', 600, s16 * 16, 0.12, { q: 0.4 })   // нарастающий шум перед входом
      // бас: сабовая синусоида + пила с фильтром
      if (!intro && st % 2 === 0) {
        const n = ch[0] - 24 + (st % 8 === 6 ? 12 : 0)
        voice(t, 'sawtooth', hz(n), s16 * 1.6, 0.26, { cut: 300 + inten * 900, cutEnd: 160, q: 4, rel: s16 * 1.6 })
        voice(t, 'sine', hz(n - 12), s16 * 1.8, 0.4, { rel: s16 * 1.8 })
      }
      // арпеджио в стерео, вверх-вниз по аккорду
      const arpN = [0, 1, 2, 1, 2, 0, 1, 2][st % 8]
      voice(t, 'square', hz(ch[arpN] + 12), s16 * 0.8, intro ? 0.05 : 0.055, { cut: bright, cutEnd: bright * 0.5, q: 2, pan: st % 2 ? 0.45 : -0.45, rv: 0.35, rel: s16 * 0.8 })
      // пэд: широкие расстроенные пилы
      if (st === 0) for (const n of ch) for (const d of [-12, 0, 12]) voice(t, 'sawtooth', hz(n), s16 * 16, 0.022, { det: d, cut: 900 + inten * 1500, att: 0.5, rel: s16 * 15, pan: d / 20, rv: 0.6 })
      // лид-мелодия (супер-со из трёх голосов) — в «дропе» и через каждые 8 тактов в груве
      if (lvl === 2 || (lvl === 1 && bar % 8 >= 4)) {
        const n = (FIGHT ? MEL_FIGHT : MEL)[bar % 4][st]
        if (n > 0) for (const d of [-14, 0, 14]) voice(t, 'sawtooth', hz(n), s16 * 2, 0.04, { det: d, cut: 2600 + inten * 2000, cutEnd: 1400, att: 0.008, rel: s16 * 2.2, pan: d / 30, rv: 0.5 })
      }
      nextT += s16; step16++
      if (st === 15) bars++
    }
  }

  // ── ветер (растёт со скоростью)
  let wind: AudioBufferSourceNode | null = null, windGain: GainNode | null = null, windF: BiquadFilterNode | null = null

  let stepSide = 0
  return {
    init,
    get muted() { return muted },
    setMuted(m: boolean) {
      muted = m; try { localStorage.setItem('mg_mute', m ? '1' : '0') } catch { /* */ }
      if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05)
    },
    step() {
      stepSide ^= 1
      // шаги: записи Fantozzi (OpenGameArt, CC0), смягчены — без резких верхов, с плотным низом
      if (!play('step', { vol: 0.034, jitter: 0.04, pan: stepSide ? 0.1 : -0.1 })) air(0.06, 1800, 1200, 0.1)
    },
    jump() {
      play('step', { vol: 0.075, rate: 0.85 })
      play('cloth', { vol: 0.55, delay: 0.02, rate: 1.1 })
      air(0.38, 450, 2400, 0.07, 0.03)
    },
    land() {
      play('land', { vol: 0.75, rate: 0.95 })
      play('step', { vol: 0.055, delay: 0.06 })
    },
    roll() {
      play('cloth', { vol: 0.7, rate: 0.9 })
      play('thud', { vol: 0.6, delay: 0.12, rate: 1.05 })
      play('belt', { vol: 0.35, delay: 0.22 })
      play('cloth', { vol: 0.5, delay: 0.32, rate: 1.15 })
      play('step', { vol: 0.06, delay: 0.55 })
    },
    swish() { play('cloth', { vol: 0.32, rate: 1.35, jitter: 0.1 }); air(0.18, 800, 2200, 0.05) },
    crash() {
      play('metal', { vol: 0.9, verb: 0.4 })
      play('punch', { vol: 0.8, delay: 0.01 })
      play('thud', { vol: 0.85, delay: 0.45, rate: 0.9 })
      play('cloth', { vol: 0.4, delay: 0.5 })
    },
    /** драка: удар по цели (сила 0..2), блок, промах, падение, гонг раунда */
    hit(power: number, pan = 0) {
      // настоящие записи ударов (OpenGameArt, CC0): лёгкий / средний / тяжёлый
      if (power >= 2) { play('hh', { vol: 1, pan, verb: 0.18, jitter: 0.04 }); play('thud', { vol: 0.35, delay: 0.015, pan, rate: 0.8 }) }
      else if (power === 1) play('hm', { vol: 0.95, pan, verb: 0.1, jitter: 0.05 })
      else play('hl', { vol: 0.85, pan, jitter: 0.06 })
    },
    block(pan = 0) { play('bk', { vol: 0.8, pan, jitter: 0.05 }); play('hl', { vol: 0.35, pan, rate: 0.8 }) },
    whoosh(heavy = false) { play('cloth', { vol: heavy ? 0.6 : 0.4, rate: heavy ? 0.85 : 1.35, jitter: 0.12 }); air(heavy ? 0.3 : 0.18, heavy ? 500 : 900, heavy ? 1800 : 2600, heavy ? 0.08 : 0.05) },
    fall() { play('thud', { vol: 1, rate: 0.85, verb: 0.3 }); play('land', { vol: 0.7, delay: 0.08 }); play('cloth', { vol: 0.5, delay: 0.04 }) },
    gong() { play('bell', { vol: 0.9, verb: 0.6 }) },
    special() { play('metal', { vol: 0.6, rate: 0.7, verb: 0.6 }); air(0.6, 300, 3000, 0.12) },
    /** интерфейс: отсчёт, старт, рекорд */
    ui(k: 'tick' | 'go' | 'record') {
      if (k === 'tick') play('sel', { vol: 0.6 })
      if (k === 'go') play('go', { vol: 0.7 })
      if (k === 'record') { play('ok', { vol: 0.8 }); play('ok', { vol: 0.5, delay: 0.18, rate: 1.26 }) }
    },
    wind(level: number) {
      if (!ctx || !sfxBus || !noise) return
      if (!wind) {
        wind = ctx.createBufferSource(); wind.buffer = noise; wind.loop = true
        windF = ctx.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 380; windF.Q.value = 0.6
        windGain = ctx.createGain(); windGain.gain.value = 0
        wind.connect(windF); windF.connect(windGain); windGain.connect(sfxBus); wind.start()
      }
      windGain!.gain.setTargetAtTime(level, ctx.currentTime, 0.3)
      windF!.frequency.setTargetAtTime(320 + level * 6000, ctx.currentTime, 0.4)
    },
    get musicOn() { return musicOn },
    setMusic(on: boolean) {
      musicOn = on; try { localStorage.setItem('mg_music', on ? '1' : '0') } catch { /* */ }
      if (ctx && musBus) musBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ctx.currentTime, 0.2)
    },
    musicStart() {
      init(); if (!ctx || !musBus) return
      if (timer) clearInterval(timer)
      step16 = 0; bars = 0; nextT = ctx.currentTime + 0.06; timer = window.setInterval(sched, 25)
      musBus.gain.cancelScheduledValues(ctx.currentTime); musBus.gain.setTargetAtTime(musicOn ? MUSIC_VOL : 0, ctx.currentTime, 0.15)
    },
    musicStop(fade = 0.6) {
      if (!ctx || !musBus) return
      musBus.gain.setTargetAtTime(0, ctx.currentTime, fade / 3)
      const t = timer; timer = 0; setTimeout(() => { if (t) clearInterval(t) }, fade * 1000 + 200)
    },
    musicIntensity(x: number) { inten = Math.max(0, Math.min(1, x)) },
    dispose() { if (timer) clearInterval(timer); try { wind?.stop() } catch { /* */ } try { htmlAudio?.pause() } catch { /* */ } ctx?.close() },
  }
}
