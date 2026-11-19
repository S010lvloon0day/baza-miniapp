import { useEffect, useRef } from 'react'
import LAND from './landDots.json'

/** Вращающийся глобус из точек-континентов с метками разделов и дугами между ними.
 *  Без выделения памяти в кадре (нет пауз сборщика мусора), статичные слои нарисованы один раз,
 *  сфера обновляется через кадр, движущиеся точки — каждый кадр. Пауза вне экрана и в свёрнутом приложении. */

const W = 390, H = 330, CX = 195, CY = 150, R = 118, D = Math.PI / 180
const SPOTS: [number, number][] = [[55.7, 37.6], [37.8, -122.4], [35.7, 139.7], [-23.5, -46.6], [51.5, -0.1], [1.3, 103.8], [-33.9, 18.4], [28.6, 77.2]]
const ARCS: [number, number][] = [[0, 2], [0, 4], [4, 1], [1, 3], [2, 5], [5, 7], [7, 0], [3, 6], [6, 7]]
const TILT = 20 * D, ROLL = -14 * D
const cT = Math.cos(TILT), sT = Math.sin(TILT), cR = Math.cos(ROLL), sR = Math.sin(ROLL)
const ORX = 178, ORY = 46, OA = -18 * D, OCA = Math.cos(OA), OSA = Math.sin(OA)
const NB = 16, NA = 12 // цветовые корзины по X и уровни прозрачности

function rgbAt(u: number): [number, number, number] {
  const A = [0, 240, 224], B = [61, 139, 255], C = [200, 80, 255]
  const [p, q, w] = u < 0.5 ? [A, B, u * 2] : [B, C, (u - 0.5) * 2]
  return [Math.round(p[0] + (q[0] - p[0]) * w), Math.round(p[1] + (q[1] - p[1]) * w), Math.round(p[2] + (q[2] - p[2]) * w)]
}
// таблица готовых строк цвета: [корзина X][уровень прозрачности]
const LUT: string[][] = Array.from({ length: NB }, (_, b) => {
  const [r, g, bl] = rgbAt((b + 0.5) / NB)
  return Array.from({ length: NA + 1 }, (_, a) => `rgba(${r},${g},${bl},${(a / NA).toFixed(3)})`)
})
const bucket = (x: number) => { const b = Math.floor(((x - (CX - R)) / (2 * R)) * NB); return b < 0 ? 0 : b >= NB ? NB - 1 : b }
const lvl = (a: number) => { const k = Math.round(a * NA); return k < 0 ? 0 : k > NA ? NA : k }

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
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
    const mk = () => { const e = document.createElement('canvas'); e.width = cv.width; e.height = cv.height; const x = e.getContext('2d') as CanvasRenderingContext2D; x.setTransform(dpr, 0, 0, dpr, 0, 0); return [e, x] as const }

    /* ── статичные слои: звёзды и две половины орбиты ── */
    const [sky, sx] = mk()
    for (let i = 0; i < (lowEnd ? 40 : 70); i++) { sx.beginPath(); sx.arc(Math.random() * W, Math.random() * H, Math.random() * 0.8 + 0.3, 0, 6.2832); sx.fillStyle = `rgba(255,255,255,${(0.15 + Math.random() * 0.4).toFixed(2)})`; sx.fill() }
    const orbitLayer = (front: boolean) => {
      const [e, x] = mk()
      x.beginPath()
      const st = front ? 0 : Math.PI
      for (let t = st; t <= st + Math.PI + 0.001; t += 0.04) { const ex = Math.cos(t) * ORX, ey = Math.sin(t) * ORY; const px = CX + ex * OCA - ey * OSA, py = CY + ex * OSA + ey * OCA; if (t === st) x.moveTo(px, py); else x.lineTo(px, py) }
      const g = x.createLinearGradient(CX - ORX, 0, CX + ORX, 0), al = front ? 0.9 : 0.25
      g.addColorStop(0, `rgba(61,255,200,${al})`); g.addColorStop(0.5, `rgba(61,139,255,${al})`); g.addColorStop(1, `rgba(180,92,255,${al})`)
      x.strokeStyle = g; x.lineWidth = front ? 1.3 : 1; x.stroke()
      return e
    }
    const orbBack = orbitLayer(false), orbFront = orbitLayer(true)
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.drawImage(orbBack, 0, 0); sx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const SAT = Array.from({ length: 15 }, (_, j) => `rgba(0,240,224,${(0.5 * (1 - j / 15)).toFixed(3)})`)

    /* ── сфера: отдельный слой, обновляется через кадр ── */
    const [base, bx] = mk()
    const gBall = bx.createRadialGradient(CX - 40, CY - 52, 6, CX, CY, R)
    gBall.addColorStop(0, 'rgba(207,255,242,.42)'); gBall.addColorStop(0.45, 'rgba(40,90,255,.28)'); gBall.addColorStop(1, 'rgba(8,12,24,.55)')
    const gRim = bx.createLinearGradient(CX - R, CY - R, CX + R, CY + R)
    gRim.addColorStop(0, 'rgba(61,255,200,.95)'); gRim.addColorStop(0.5, 'rgba(61,139,255,.7)'); gRim.addColorStop(1, 'rgba(180,92,255,.9)')
    // атмосфера вокруг шара и тень ночной стороны
    const gAtm = bx.createRadialGradient(CX, CY, R * 0.92, CX, CY, R * 1.22)
    gAtm.addColorStop(0, 'rgba(90,170,255,0)'); gAtm.addColorStop(0.35, 'rgba(90,170,255,.28)'); gAtm.addColorStop(0.7, 'rgba(140,90,255,.10)'); gAtm.addColorStop(1, 'rgba(140,90,255,0)')
    const gNight = bx.createRadialGradient(CX + 70, CY + 80, R * 0.2, CX + 40, CY + 40, R * 1.25)
    gNight.addColorStop(0, 'rgba(4,6,14,.62)'); gNight.addColorStop(0.55, 'rgba(4,6,14,.28)'); gNight.addColorStop(1, 'rgba(4,6,14,0)')
    const gSpec = bx.createRadialGradient(CX - 48, CY - 62, 0, CX - 48, CY - 62, 90)
    gSpec.addColorStop(0, 'rgba(255,255,255,.20)'); gSpec.addColorStop(1, 'rgba(255,255,255,0)')

    // точки суши в 3D (заранее), буферы для проекции (без аллокаций в кадре)
    const n = land.length / 2
    const LX0 = new Float32Array(n), LY0 = new Float32Array(n), LZ0 = new Float32Array(n)
    for (let i = 0; i < n; i++) { const f = land[i * 2] * D, l = land[i * 2 + 1] * D; LX0[i] = Math.cos(f) * Math.sin(l); LY0[i] = Math.sin(f); LZ0[i] = Math.cos(f) * Math.cos(l) }
    const PX = new Float32Array(n), PY = new Float32Array(n), PZ = new Float32Array(n)
    const BK = new Uint8Array(n)
    // сетка: меридианы и параллели в 3D
    const GRID: Float32Array[] = []
    for (let lo = 0; lo < 360; lo += 30) { const a = new Float32Array(31 * 3); for (let k = 0; k <= 30; k++) { const f = (-90 + k * 6) * D, l = lo * D; a[k * 3] = Math.cos(f) * Math.sin(l); a[k * 3 + 1] = Math.sin(f); a[k * 3 + 2] = Math.cos(f) * Math.cos(l) } GRID.push(a) }
    for (let la = -60; la <= 60; la += 30) { const a = new Float32Array(61 * 3); for (let k = 0; k <= 60; k++) { const f = la * D, l = k * 6 * D; a[k * 3] = Math.cos(f) * Math.sin(l); a[k * 3 + 1] = Math.sin(f); a[k * 3 + 2] = Math.cos(f) * Math.cos(l) } GRID.push(a) }

    // дуги: точки на большой окружности с подъёмом (заранее)
    const AN = 24
    const ARC3 = ARCS.map(([ai, bi]) => {
      const v = (la: number, lo: number) => { const f = la * D, l = lo * D; return [Math.cos(f) * Math.sin(l), Math.sin(f), Math.cos(f) * Math.cos(l)] }
      const a = v(...SPOTS[ai]), b = v(...SPOTS[bi])
      const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), o = Math.acos(d), so = Math.sin(o) || 1
      const out = new Float32Array((AN + 1) * 3)
      for (let k = 0; k <= AN; k++) {
        const u = k / AN, p = Math.sin((1 - u) * o) / so, q = Math.sin(u * o) / so, lift = 1 + 0.3 * Math.sin(Math.PI * u)
        out[k * 3] = (a[0] * p + b[0] * q) * lift; out[k * 3 + 1] = (a[1] * p + b[1] * q) * lift; out[k * 3 + 2] = (a[2] * p + b[2] * q) * lift
      }
      return out
    })
    const SP3 = SPOTS.map(([la, lo]) => { const f = la * D, l = lo * D; return [Math.cos(f) * Math.sin(l), Math.sin(f), Math.cos(f) * Math.cos(l)] })

    // поворот единичного вектора: результат в tmp[0..2] (без аллокаций)
    const tmp = new Float32Array(3)
    let sinR = 0, cosR = 1
    const proj = (x0: number, y0: number, z0: number) => {
      const x = x0 * cosR + z0 * sinR, z1 = -x0 * sinR + z0 * cosR
      const y = y0 * cT - z1 * sT, z = y0 * sT + z1 * cT
      tmp[0] = CX + (x * cR - y * sR) * R; tmp[1] = CY - (x * sR + y * cR) * R; tmp[2] = z
    }

    let rot = -0.4, vel = 0, drag = false, lx = 0, raf = 0, visible = true, last = performance.now()
    let frameNo = 0, baseEvery = lowEnd ? 3 : 2, avg = 0, samples = 0

    const drawBase = () => {
      const x = bx
      x.clearRect(0, 0, W, H)
      x.beginPath(); x.arc(CX, CY, R * 1.22, 0, 6.2832); x.fillStyle = gAtm; x.fill()
      x.beginPath(); x.arc(CX, CY, R, 0, 6.2832); x.fillStyle = gBall; x.fill()
      for (let i = 0; i < n; i++) { proj(LX0[i], LY0[i], LZ0[i]); PX[i] = tmp[0]; PY[i] = tmp[1]; PZ[i] = tmp[2]; BK[i] = bucket(tmp[0]) }
      // задняя сторона — бледные квадратики, по корзинам цвета
      for (let b = 0; b < NB; b++) {
        x.beginPath(); let any = false
        for (let i = 0; i < n; i++) if (BK[i] === b && PZ[i] < 0) { x.rect(PX[i] - 0.6, PY[i] - 0.6, 1.2, 1.2); any = true }
        if (any) { x.fillStyle = LUT[b][1]; x.fill() }
      }
      // сетка
      x.lineWidth = 0.6; x.strokeStyle = 'rgba(160,200,255,.09)'; x.beginPath()
      for (const g of GRID) { let pen = false; for (let k = 0; k < g.length; k += 3) { proj(g[k], g[k + 1], g[k + 2]); if (tmp[2] > 0) { if (pen) x.lineTo(tmp[0], tmp[1]); else x.moveTo(tmp[0], tmp[1]); pen = true } else pen = false } }
      x.stroke()
      // лицевая сторона — точки, по корзинам цвета и глубины
      for (let b = 0; b < NB; b++) for (let zl = 0; zl < 4; zl++) {
        x.beginPath(); let any = false
        const z0 = zl / 4, z1 = (zl + 1) / 4
        for (let i = 0; i < n; i++) {
          const z = PZ[i]
          if (BK[i] !== b || z < z0 || z >= z1 || z <= 0) continue
          const r = 0.6 + 1.15 * z
          x.moveTo(PX[i] + r, PY[i]); x.arc(PX[i], PY[i], r, 0, 6.2832)
          any = true
        }
        if (any) { x.fillStyle = LUT[b][lvl(0.45 + 0.55 * (zl + 0.5) / 4)]; x.fill() }
      }
      x.beginPath(); x.arc(CX, CY, R, 0, 6.2832); x.fillStyle = gNight; x.fill()
      x.beginPath(); x.arc(CX, CY, R, 0, 6.2832); x.strokeStyle = gRim; x.lineWidth = 1.2; x.stroke()
      x.beginPath(); x.arc(CX, CY, R, 0, 6.2832); x.fillStyle = gSpec; x.fill()
    }

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
    }
    const labelW: Record<string, number> = {}
    const boxes = new Float32Array(SPOTS.length * 4)

    const draw = (T: number, withBase: boolean) => {
      sinR = Math.sin(rot); cosR = Math.cos(rot)
      if (withBase) drawBase()
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      c.clearRect(0, 0, W, H)
      c.drawImage(sky, 0, 0, W, H)
      c.drawImage(base, 0, 0, W, H)

      // дуги
      for (let a = 0; a < ARC3.length; a++) {
        const p = ARC3[a], head = (T * 0.22 + a * 0.37) % 1.6
        let px = 0, py = 0, pv = false
        for (let k = 0; k <= AN; k++) {
          const lift = Math.hypot(p[k * 3], p[k * 3 + 1], p[k * 3 + 2])
          proj(p[k * 3] / lift, p[k * 3 + 1] / lift, p[k * 3 + 2] / lift)
          const sx2 = CX + (tmp[0] - CX) * lift, sy2 = CY + (tmp[1] - CY) * lift, dz = tmp[2]
          const dx = sx2 - CX, dy = sy2 - CY, vis = dz > 0 || dx * dx + dy * dy > R * R
          if (k > 0 && vis && pv) {
            const u = k / AN, near = head - u
            const al = near > 0 && near < 0.35 ? 0.14 + 0.86 * (1 - near / 0.35) : 0.14
            c.beginPath(); c.moveTo(px, py); c.lineTo(sx2, sy2); c.strokeStyle = LUT[bucket(sx2)][lvl(al)]; c.lineWidth = al > 0.3 ? 1.8 : 1; c.stroke()
            if (near > 0 && near < 1 / AN + 0.001) {
              c.beginPath(); c.arc(sx2, sy2, 7, 0, 6.2832); c.fillStyle = LUT[bucket(sx2)][4]; c.fill()
              c.beginPath(); c.arc(sx2, sy2, 2.6, 0, 6.2832); c.fillStyle = '#fff'; c.fill()
            }
          }
          px = sx2; py = sy2; pv = vis
        }
      }

      // точки-разделы и подписи
      const names = labelsRef.current
      let nb = 0
      c.font = '700 11px Inter,system-ui,sans-serif'; c.textBaseline = 'middle'
      for (let m = 0; m < SP3.length; m++) {
        const v = SP3[m]; proj(v[0], v[1], v[2])
        const x = tmp[0], y = tmp[1], z = tmp[2]
        if (z <= 0.02) continue
        const ph = (T * 0.7 + m * 0.31) % 1, b = bucket(x)
        c.beginPath(); c.arc(x, y, 3 + 16 * ph, 0, 6.2832); c.strokeStyle = LUT[b][lvl((1 - ph) * 0.8 * z)]; c.lineWidth = 1.2; c.stroke()
        c.beginPath(); c.arc(x, y, 7, 0, 6.2832); c.fillStyle = LUT[b][lvl(0.3 * z)]; c.fill()
        c.beginPath(); c.arc(x, y, 2.8, 0, 6.2832); c.fillStyle = '#fff'; c.fill()
        const name = names[m]
        const al = Math.max(0, Math.min(1, (z - 0.5) / 0.22))
        const by0 = y - 29
        if (!name || al <= 0 || y >= CY + 52 || y < 40 || (by0 < 64 && x > 200)) continue
        const t = name.length > 16 ? name.slice(0, 15) + '…' : name
        const tw = labelW[t] ?? (labelW[t] = c.measureText(t).width)
        const side = x < CX ? -1 : 1, lx2 = x + side * 16, ly2 = y - 18, bw = tw + 18, bh = 22
        const bxx = Math.max(18, Math.min(372 - bw, side > 0 ? lx2 : lx2 - bw)), by = ly2 - bh / 2 - (1 - al) * 5
        let hit = false
        for (let q = 0; q < nb; q++) { const o = q * 4; if (bxx < boxes[o] + boxes[o + 2] + 4 && bxx + bw + 4 > boxes[o] && by < boxes[o + 1] + boxes[o + 3] + 3 && by + bh + 3 > boxes[o + 1]) { hit = true; break } }
        if (hit) continue
        boxes[nb * 4] = bxx; boxes[nb * 4 + 1] = by; boxes[nb * 4 + 2] = bw; boxes[nb * 4 + 3] = bh; nb++
        c.globalAlpha = al
        c.beginPath(); c.moveTo(x, y); c.lineTo(lx2, ly2); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 0.8; c.stroke()
        rr(bxx, by, bw, bh, 11); c.fillStyle = 'rgba(9,11,16,.78)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1; c.stroke()
        c.fillStyle = '#F4F5F7'; c.fillText(t, bxx + 9, by + bh / 2 + 0.5)
        c.globalAlpha = 1
      }

      // спутник на орбите (за сферой — до неё рисовать нельзя, поэтому только передняя половина поверх, задняя — тусклее)
      const ts = (T * 0.55) % 6.2832, front = ts < Math.PI
      c.drawImage(orbFront, 0, 0, W, H)
      for (let j = 14; j >= 0; j--) {
        const tt = ts - j * 0.03, ex = Math.cos(tt) * ORX, ey = Math.sin(tt) * ORY
        const sx3 = CX + ex * OCA - ey * OSA, sy3 = CY + ex * OSA + ey * OCA
        if (!front) { const dx = sx3 - CX, dy = sy3 - CY; if (dx * dx + dy * dy < R * R) continue }
        c.beginPath(); c.arc(sx3, sy3, j ? 2.2 * (1 - j / 15) : 4.6, 0, 6.2832); c.fillStyle = j ? SAT[j] : '#fff'; c.fill()
      }
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible || document.hidden) { last = now; return }
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (!drag) { rot += (0.16 + vel) * dt; vel *= Math.pow(0.05, dt) }
      const withBase = drag || frameNo++ % baseEvery === 0
      const t0 = performance.now()
      draw(now / 1000, withBase)
      const ms = performance.now() - t0
      avg = avg ? avg * 0.92 + ms * 0.08 : ms
      // телефон не успевает — сфера обновляется ещё реже и проще; движущиеся точки остаются каждый кадр
      if (++samples > 45) { samples = 0; if (avg > 7 && baseEvery < 4) baseEvery++ }
    }
    if (reduce) draw(0, true); else raf = requestAnimationFrame(() => { raf = requestAnimationFrame(frame) })

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(cv)
    const scale = () => cv.getBoundingClientRect().width / W || 1
    const down = (e: PointerEvent) => { drag = true; lx = e.clientX; vel = 0; cv.setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => { if (!drag) return; const dx = (e.clientX - lx) / scale(); lx = e.clientX; rot += dx * 0.008; vel = dx * 0.5; if (reduce) draw(0, true) }
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
