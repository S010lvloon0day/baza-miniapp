import { useEffect, useRef } from 'react'
import LAND from './landDots.json'

/** Вращающийся глобус из точек-континентов с метками разделов и дугами между ними.
 *  Останавливается, когда ушёл с экрана или мини-апп свёрнут; на слабых телефонах рисует реже. */

const W = 390, H = 330, CX = 195, CY = 150, R = 118, D = Math.PI / 180
const SPOTS: [number, number][] = [[55.7, 37.6], [37.8, -122.4], [35.7, 139.7], [-23.5, -46.6], [51.5, -0.1], [1.3, 103.8], [-33.9, 18.4], [28.6, 77.2]]
const ARCS: [number, number][] = [[0, 2], [0, 4], [4, 1], [1, 3], [2, 5], [5, 7], [7, 0], [3, 6], [6, 7]]
const TILT = 20 * D, ROLL = -14 * D
const cT = Math.cos(TILT), sT = Math.sin(TILT), cR = Math.cos(ROLL), sR = Math.sin(ROLL)
type V3 = [number, number, number]

function P(lat: number, lon: number, rot: number, k = 1): V3 {
  const f = lat * D, l = lon * D + rot, cf = Math.cos(f)
  const x = cf * Math.sin(l), y0 = Math.sin(f), z0 = cf * Math.cos(l)
  const y = y0 * cT - z0 * sT, z = y0 * sT + z0 * cT
  const kk = k * R
  return [CX + (x * cR - y * sR) * kk, CY - (x * sR + y * cR) * kk, z]
}
function col(x: number, a: number) {
  const u = Math.max(0, Math.min(1, (x - (CX - R)) / (2 * R)))
  const A = [0, 240, 224], B = [61, 139, 255], C = [200, 80, 255]
  const [p, q, w] = u < 0.5 ? [A, B, u * 2] : [B, C, (u - 0.5) * 2]
  return `rgba(${Math.round(p[0] + (q[0] - p[0]) * w)},${Math.round(p[1] + (q[1] - p[1]) * w)},${Math.round(p[2] + (q[2] - p[2]) * w)},${a})`
}
const vec = (la: number, lo: number): V3 => { const f = la * D, l = lo * D; return [Math.cos(f) * Math.sin(l), Math.sin(f), Math.cos(f) * Math.cos(l)] }
function slerp(a: V3, b: V3, t: number): V3 {
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), o = Math.acos(d), so = Math.sin(o) || 1
  const p = Math.sin((1 - t) * o) / so, q = Math.sin(t * o) / so
  return [a[0] * p + b[0] * q, a[1] * p + b[1] * q, a[2] * p + b[2] * q]
}
const PV = (v: V3, rot: number, k: number) => P(Math.asin(v[1]) / D, Math.atan2(v[0], v[2]) / D, rot, k)

export default function Globe({ labels }: { labels: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const labelsRef = useRef(labels)
  labelsRef.current = labels

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const c = cv.getContext('2d')
    if (!c) return
    const land = LAND as number[]
    const lowEnd = (navigator.hardwareConcurrency || 8) <= 4
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2)
    cv.width = W * dpr; cv.height = H * dpr
    const stars = Array.from({ length: lowEnd ? 40 : 70 }, () => [Math.random() * W, Math.random() * H, Math.random() * 0.8 + 0.3, Math.random() * 6.28, Math.random() * 1.5 + 0.5])
    let rot = -0.4, vel = 0, drag = false, lx = 0, raf = 0, visible = true, last = performance.now(), lastDraw = 0
    const auto = 0.16, frameGap = lowEnd ? 1000 / 30 : 0

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
    }
    const orbit = (front: boolean, T: number) => {
      const rx = 178, ry = 46, a = -18 * D, ca = Math.cos(a), sa = Math.sin(a)
      const st = front ? 0 : Math.PI, en = front ? Math.PI : 2 * Math.PI
      c.beginPath()
      for (let t = st; t <= en + 0.001; t += 0.05) {
        const ex = Math.cos(t) * rx, ey = Math.sin(t) * ry, x = CX + ex * ca - ey * sa, y = CY + ex * sa + ey * ca
        if (t === st) c.moveTo(x, y); else c.lineTo(x, y)
      }
      const g = c.createLinearGradient(CX - rx, 0, CX + rx, 0), al = front ? 0.9 : 0.25
      g.addColorStop(0, `rgba(61,255,200,${al})`); g.addColorStop(0.5, `rgba(61,139,255,${al})`); g.addColorStop(1, `rgba(180,92,255,${al})`)
      c.strokeStyle = g; c.lineWidth = front ? 1.3 : 1; c.stroke()
      const ts = (T * 0.55) % (2 * Math.PI)
      if ((ts < Math.PI) !== front) return
      for (let j = 14; j >= 0; j--) {
        const tt = ts - j * 0.03, ex = Math.cos(tt) * rx, ey = Math.sin(tt) * ry
        c.beginPath(); c.arc(CX + ex * ca - ey * sa, CY + ex * sa + ey * ca, j ? 2.2 * (1 - j / 15) : 4.6, 0, 7)
        c.fillStyle = j ? `rgba(0,240,224,${0.5 * (1 - j / 15)})` : '#fff'; c.fill()
      }
    }

    const draw = (T: number) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H)
      for (const s of stars) { c.beginPath(); c.arc(s[0], s[1], s[2], 0, 7); c.fillStyle = `rgba(255,255,255,${0.12 + 0.38 * (0.5 + 0.5 * Math.sin(T * s[4] + s[3]))})`; c.fill() }
      orbit(false, T)
      const g = c.createRadialGradient(CX - 40, CY - 52, 6, CX, CY, R)
      g.addColorStop(0, 'rgba(207,255,242,.42)'); g.addColorStop(0.45, 'rgba(40,90,255,.28)'); g.addColorStop(1, 'rgba(8,12,24,.55)')
      c.beginPath(); c.arc(CX, CY, R, 0, 7); c.fillStyle = g; c.fill()
      for (let i = 0; i < land.length; i += 2) {
        const p = P(land[i], land[i + 1], rot)
        if (p[2] < 0) { c.fillStyle = col(p[0], 0.1); c.fillRect(p[0] - 0.6, p[1] - 0.6, 1.2, 1.2) }
      }
      c.lineWidth = 0.7; c.strokeStyle = 'rgba(160,200,255,.13)'
      for (let lo = 0; lo < 360; lo += 30) {
        c.beginPath(); let pen = false
        for (let la = -90; la <= 90; la += 6) { const p = P(la, lo, rot); if (p[2] > 0) { if (pen) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); pen = true } else pen = false }
        c.stroke()
      }
      for (let la = -60; la <= 60; la += 30) {
        c.beginPath(); let pen = false
        for (let lo = 0; lo <= 360; lo += 6) { const p = P(la, lo, rot); if (p[2] > 0) { if (pen) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); pen = true } else pen = false }
        c.stroke()
      }
      for (let i = 0; i < land.length; i += 2) {
        const p = P(land[i], land[i + 1], rot)
        if (p[2] > 0) { c.beginPath(); c.arc(p[0], p[1], 0.55 + 1.05 * p[2], 0, 7); c.fillStyle = col(p[0], 0.45 + 0.55 * p[2]); c.fill() }
      }
      const rg = c.createLinearGradient(CX - R, CY - R, CX + R, CY + R)
      rg.addColorStop(0, 'rgba(61,255,200,.95)'); rg.addColorStop(0.5, 'rgba(61,139,255,.7)'); rg.addColorStop(1, 'rgba(180,92,255,.9)')
      c.beginPath(); c.arc(CX, CY, R, 0, 7); c.strokeStyle = rg; c.lineWidth = 1.4; c.stroke()
      const sg = c.createRadialGradient(CX - 48, CY - 62, 0, CX - 48, CY - 62, 90)
      sg.addColorStop(0, 'rgba(255,255,255,.20)'); sg.addColorStop(1, 'rgba(255,255,255,0)')
      c.beginPath(); c.arc(CX, CY, R, 0, 7); c.fillStyle = sg; c.fill()

      ARCS.forEach(([ai, bi], a) => {
        const va = vec(...SPOTS[ai]), vb = vec(...SPOTS[bi]), head = (T * 0.22 + a * 0.37) % 1.6, N = 36
        let prev: { p: V3; v: boolean } | null = null
        for (let k = 0; k <= N; k++) {
          const u = k / N, pp = PV(slerp(va, vb, u), rot, 1 + 0.3 * Math.sin(Math.PI * u))
          const dx = pp[0] - CX, dy = pp[1] - CY, vis = pp[2] > 0 || dx * dx + dy * dy > R * R
          if (prev && vis && prev.v) {
            const near = head - u
            const al = near > 0 && near < 0.35 ? 0.14 + 0.86 * (1 - near / 0.35) : 0.14
            c.beginPath(); c.moveTo(prev.p[0], prev.p[1]); c.lineTo(pp[0], pp[1]); c.strokeStyle = col(pp[0], al); c.lineWidth = al > 0.3 ? 1.8 : 1; c.stroke()
            if (near > 0 && near < 1 / N + 0.001) {
              c.beginPath(); c.arc(pp[0], pp[1], 2.6, 0, 7); c.fillStyle = '#fff'; c.fill()
              c.beginPath(); c.arc(pp[0], pp[1], 7, 0, 7); c.fillStyle = col(pp[0], 0.3); c.fill()
            }
          }
          prev = { p: pp, v: vis }
        }
      })

      const names = labelsRef.current
      const boxes: [number, number, number, number][] = []
      SPOTS.forEach(([la, lo], m) => {
        const p = P(la, lo, rot), z = p[2]
        if (z <= 0.02) return
        const ph = (T * 0.7 + m * 0.31) % 1
        c.beginPath(); c.arc(p[0], p[1], 3 + 16 * ph, 0, 7); c.strokeStyle = col(p[0], (1 - ph) * 0.8 * z); c.lineWidth = 1.2; c.stroke()
        c.beginPath(); c.arc(p[0], p[1], 7, 0, 7); c.fillStyle = col(p[0], 0.3 * z); c.fill()
        c.beginPath(); c.arc(p[0], p[1], 2.8, 0, 7); c.fillStyle = `rgba(255,255,255,${z})`; c.fill()
        const name = names[m]
        const al = Math.max(0, Math.min(1, (z - 0.5) / 0.22))
        if (!name || al <= 0 || p[1] >= CY + 52 || p[1] < 76) return
        const side = p[0] < CX ? -1 : 1, lx2 = p[0] + side * 16, ly2 = p[1] - 18
        c.globalAlpha = al
        c.font = '700 11px Inter,system-ui,sans-serif'
        const t = name.length > 16 ? name.slice(0, 15) + '…' : name
        const bw = c.measureText(t).width + 18, bh = 22
        const bx = Math.max(18, Math.min(372 - bw, side > 0 ? lx2 : lx2 - bw)), by = ly2 - bh / 2 - (1 - al) * 5
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(lx2, ly2); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 0.8; c.stroke()
        if (boxes.some(([x, y, w, h]) => bx < x + w + 4 && bx + bw + 4 > x && by < y + h + 3 && by + bh + 3 > y)) { c.globalAlpha = 1; return }
        boxes.push([bx, by, bw, bh])
        rr(bx, by, bw, bh, 11); c.fillStyle = 'rgba(9,11,16,.78)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1; c.stroke()
        c.textBaseline = 'middle'; c.fillStyle = '#F4F5F7'; c.fillText(t, bx + 9, by + bh / 2 + 0.5)
        c.globalAlpha = 1
      })
      orbit(true, T)
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible || document.hidden) { last = now; return }
      if (frameGap && now - lastDraw < frameGap) return
      lastDraw = now
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (!drag) { rot += (auto + vel) * dt; vel *= Math.pow(0.05, dt) }
      draw(now / 1000)
    }
    if (reduce) draw(0); else raf = requestAnimationFrame(frame)

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(cv)
    const scale = () => cv.getBoundingClientRect().width / W || 1
    const down = (e: PointerEvent) => { drag = true; lx = e.clientX; vel = 0; cv.setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => { if (!drag) return; const dx = (e.clientX - lx) / scale(); lx = e.clientX; rot += dx * 0.008; vel = dx * 0.5; if (reduce) draw(0) }
    const up = () => { drag = false }
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move)
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up)
    return () => {
      cancelAnimationFrame(raf); io.disconnect()
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up)
    }
  }, [])

  return <canvas ref={ref} className="globe-cv" style={{ width: '100%', aspectRatio: `${W} / ${H}`, touchAction: 'pan-y' }} />
}
