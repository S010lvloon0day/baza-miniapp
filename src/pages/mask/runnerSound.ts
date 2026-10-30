/** Звуки забега, синтез на WebAudio — без файлов. Контекст создаётся по нажатию «Старт». */
export function createRunnerSound() {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let noise: AudioBuffer | null = null
  let wind: AudioBufferSourceNode | null = null
  let windGain: GainNode | null = null
  let muted = false
  try { muted = localStorage.getItem('mg_mute') === '1' } catch { /* */ }

  const init = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return }
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    ctx = new AC() as AudioContext
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination)
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }

  /** шумовой всплеск через фильтр с огибающей */
  const burst = (o: { dur: number; type: BiquadFilterType; f0: number; f1?: number; q?: number; vol: number; attack?: number; delay?: number }) => {
    if (!ctx || !master || !noise) return
    const t = ctx.currentTime + (o.delay || 0)
    const src = ctx.createBufferSource(); src.buffer = noise
    src.playbackRate.value = 0.8 + Math.random() * 0.4
    const f = ctx.createBiquadFilter(); f.type = o.type; f.Q.value = o.q ?? 1
    f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur)
    const g = ctx.createGain(); const a = o.attack ?? 0.004
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur)
    src.connect(f); f.connect(g); g.connect(master)
    src.start(t, Math.random() * 1.5); src.stop(t + o.dur + 0.05)
  }
  /** низкий удар (тело, приземление) */
  const thump = (freq: number, dur: number, vol: number, delay = 0) => {
    if (!ctx || !master) return
    const t = ctx.currentTime + delay
    const os = ctx.createOscillator(); os.type = 'sine'
    os.frequency.setValueAtTime(freq, t); os.frequency.exponentialRampToValueAtTime(freq * 0.45, t + dur)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    os.connect(g); g.connect(master); os.start(t); os.stop(t + dur + 0.05)
  }

  // ── музыка: ля минор, Am–F–C–G, бочка/малый/хэт, бас, арпеджио с эхом, пэд, мелодия каждые 8 тактов
  const MUSIC_VOL = 0.3
  let musicOn = true
  try { musicOn = localStorage.getItem('mg_music') !== '0' } catch { /* */ }
  let mbus: GainNode | null = null, dly: DelayNode | null = null, timer = 0, step16 = 0, nextT = 0, inten = 0
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
  const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]            // Am F C G
  const MEL = [76, -1, 74, 72, -1, 72, 71, 72, -1, -1, 69, -1, 71, -1, 72, 74,  // 2 такта мотива
    72, -1, 71, 69, -1, 67, 69, -1, 64, -1, -1, -1, 67, -1, 69, -1]
  const buildBus = () => {
    if (!ctx || !master || mbus) return
    mbus = ctx.createGain(); mbus.gain.value = 0
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4
    mbus.connect(comp); comp.connect(master)
    dly = ctx.createDelay(1); dly.delayTime.value = 0.375
    const fb = ctx.createGain(); fb.gain.value = 0.32; const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200
    dly.connect(fb); fb.connect(dl); dl.connect(dly); dly.connect(mbus)
  }
  const tone = (t: number, type: OscillatorType, f: number, dur: number, vol: number, cut: number, o: { det?: number; att?: number; send?: number; glide?: number } = {}) => {
    if (!ctx || !mbus) return
    const os = ctx.createOscillator(); os.type = type; os.frequency.setValueAtTime(f, t); if (o.det) os.detune.value = o.det
    if (o.glide) os.frequency.exponentialRampToValueAtTime(f * o.glide, t + dur)
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; fl.Q.value = 3
    const g = ctx.createGain(); const a = o.att ?? 0.005
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    os.connect(fl); fl.connect(g); g.connect(mbus); if (o.send && dly) { const sg = ctx.createGain(); sg.gain.value = o.send; g.connect(sg); sg.connect(dly) }
    os.start(t); os.stop(t + dur + 0.05)
  }
  const hit = (t: number, type: BiquadFilterType, f: number, dur: number, vol: number) => {
    if (!ctx || !mbus || !noise) return
    const src = ctx.createBufferSource(); src.buffer = noise
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(fl); fl.connect(g); g.connect(mbus); src.start(t, Math.random()); src.stop(t + dur + 0.02)
  }
  const kick = (t: number) => { tone(t, 'sine', 140, 0.32, 0.9, 800, { glide: 0.32 }) }
  const sched = () => {
    if (!ctx) return
    const bpm = 104 + inten * 18, s16 = 60 / bpm / 4
    if (dly) dly.delayTime.setTargetAtTime(s16 * 3, ctx.currentTime, 0.1)
    while (nextT < ctx.currentTime + 0.14) {
      const t = nextT, st = step16 % 16, bar = Math.floor(step16 / 16), ch = CH[bar % 4]
      const bright = 900 + inten * 2400
      if (st % 4 === 0) kick(t)
      if (st === 4 || st === 12) { hit(t, 'bandpass', 1800, 0.18, 0.5); tone(t, 'triangle', 190, 0.1, 0.25, 2000, { glide: 0.6 }) }
      if (st % 2 === 1) hit(t, 'highpass', 7000, 0.04, st % 4 === 3 ? 0.16 : 0.09)
      if (st === 14 && bar % 2 === 1) hit(t, 'highpass', 6000, 0.22, 0.12)
      // бас: восьмые, на слабых — октава
      if (st % 2 === 0) tone(t, 'sawtooth', hz(ch[0] - 24 + (st % 8 === 6 ? 12 : 0)), s16 * 1.8, 0.32, 380 + inten * 500)
      // арпеджио 16-ми вверх-вниз
      const arp = [0, 1, 2, 1, 0, 2, 1, 2][st % 8]
      tone(t, 'square', hz(ch[arp] + 12), s16 * 0.9, 0.06, bright, { send: 0.5 })
      // пэд на каждый такт
      if (st === 0) for (const n of ch) for (const d of [-9, 9]) tone(t, 'sawtooth', hz(n), s16 * 16, 0.035, 1300, { det: d, att: 0.4 })
      // мелодия: такты 4–7 из каждых 8
      if (bar % 8 >= 4) { const n = MEL[((bar % 2) * 16 + st)]; if (n > 0) tone(t, 'triangle', hz(n), s16 * 1.9, 0.14, 3000, { send: 0.35, att: 0.01 }) }
      nextT += s16; step16++
    }
  }

  let stepSide = 0
  return {
    init,
    get muted() { return muted },
    setMuted(m: boolean) {
      muted = m; try { localStorage.setItem('mg_mute', m ? '1' : '0') } catch { /* */ }
      if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05)
    },
    /** шаг кроссовка по асфальту: щелчок подошвы + глухой удар пятки */
    step() {
      stepSide ^= 1
      const p = stepSide ? 1 : 0.92
      thump(95 * p, 0.09, 0.32)
      burst({ dur: 0.07, type: 'bandpass', f0: 1900 * p, q: 1.4, vol: 0.18 })
      burst({ dur: 0.05, type: 'highpass', f0: 4200, vol: 0.05, delay: 0.012 })
    },
    /** толчок и свист воздуха */
    jump() {
      thump(120, 0.12, 0.4)
      burst({ dur: 0.08, type: 'bandpass', f0: 1500, q: 1.2, vol: 0.2 })
      burst({ dur: 0.42, type: 'bandpass', f0: 500, f1: 2600, q: 0.8, vol: 0.12, attack: 0.08, delay: 0.03 })
    },
    land() {
      thump(80, 0.16, 0.55)
      burst({ dur: 0.12, type: 'lowpass', f0: 1400, vol: 0.22 })
      burst({ dur: 0.07, type: 'bandpass', f0: 2200, q: 1.3, vol: 0.1, delay: 0.05 })
    },
    /** кувырок: касание рук, перекат спиной (шорох ткани), выход на ноги */
    roll() {
      burst({ dur: 0.08, type: 'bandpass', f0: 1700, q: 1.5, vol: 0.16 })
      thump(70, 0.22, 0.45, 0.08)
      burst({ dur: 0.45, type: 'bandpass', f0: 900, f1: 500, q: 0.7, vol: 0.16, attack: 0.05, delay: 0.1 })
      burst({ dur: 0.25, type: 'highpass', f0: 3000, vol: 0.05, attack: 0.05, delay: 0.15 })
      thump(100, 0.1, 0.3, 0.5)
    },
    /** смена дорожки — короткий свист */
    swish() { burst({ dur: 0.2, type: 'bandpass', f0: 700, f1: 2000, q: 1.1, vol: 0.09, attack: 0.03 }) },
    crash() {
      thump(60, 0.45, 0.8)
      burst({ dur: 0.35, type: 'lowpass', f0: 2400, f1: 300, vol: 0.4 })
      burst({ dur: 0.6, type: 'bandpass', f0: 3200, f1: 1200, q: 2, vol: 0.12, delay: 0.02 })
      thump(75, 0.25, 0.4, 0.55)
    },
    /** ветер, громкость растёт со скоростью */
    wind(level: number) {
      if (!ctx || !master || !noise) return
      if (!wind) {
        wind = ctx.createBufferSource(); wind.buffer = noise; wind.loop = true
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.5
        windGain = ctx.createGain(); windGain.gain.value = 0
        wind.connect(f); f.connect(windGain); windGain.connect(master); wind.start()
      }
      windGain!.gain.setTargetAtTime(level, ctx.currentTime, 0.3)
    },
    /** фоновая музыка — свой синтвейв-трек, генерируется на лету */
    get musicOn() { return musicOn },
    setMusic(on: boolean) {
      musicOn = on; try { localStorage.setItem('mg_music', on ? '1' : '0') } catch { /* */ }
      if (ctx && mbus) mbus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ctx.currentTime, 0.2)
    },
    musicStart() { init(); if (!ctx || timer) return; buildBus(); step16 = 0; nextT = ctx.currentTime + 0.08; timer = window.setInterval(sched, 25); mbus!.gain.setTargetAtTime(musicOn ? MUSIC_VOL : 0, ctx.currentTime, 0.3) },
    musicStop(fade = 0.6) { if (!ctx || !mbus) return; mbus.gain.setTargetAtTime(0, ctx.currentTime, fade / 3); const t = timer; timer = 0; setTimeout(() => { if (t) clearInterval(t) }, fade * 1000) },
    /** 0..1 — растёт со скоростью: быстрее темп, ярче фильтр */
    musicIntensity(x: number) { inten = Math.max(0, Math.min(1, x)) },
    dispose() { if (timer) clearInterval(timer); try { wind?.stop() } catch { /* */ } ctx?.close() },
  }
}
