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
    dispose() { try { wind?.stop() } catch { /* */ } ctx?.close() },
  }
}
