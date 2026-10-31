import * as THREE from 'three'

/** Арена драки: ночная крыша над неоновым городом, дождь, прожекторы, машины в небе, молнии. */
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const canvasTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t
}

const BG_ROT = Number(new URLSearchParams(location.search).get('bgr') ?? (0.565 + Math.PI / 2))   // телебашня и небоскрёбы Пудуна — позади бойцов
export function buildArena(S: THREE.Scene) {
  S.background = new THREE.Color(0x07061a)
  S.fog = new THREE.FogExp2(0x120a2c, 0.012)

  // фон: настоящая ночная панорама (Poly Haven, CC0) с киберпанк-тонировкой; панорама стоит за спиной стража (+X)
  const pano = new THREE.TextureLoader().load(import.meta.env.BASE_URL + 'mask/arena_city.jpg', t => { t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; S.background = t })
  pano.mapping = THREE.EquirectangularReflectionMapping
  ;(S as any).backgroundRotation?.set(0, BG_ROT, 0)
  ;(S as any).backgroundIntensity = 1
  // свет: холодный голубой слева, пурпурный справа, контровой сзади
  S.add(new THREE.HemisphereLight(0x5a6cff, 0x1a0820, 0.55))
  const cyan = new THREE.SpotLight(0x34e8ff, 60, 30, 0.6, 0.6, 1.4); cyan.position.set(-6, 7, 4); cyan.target.position.set(-1, 0, 0); S.add(cyan, cyan.target)
  const mag = new THREE.SpotLight(0xff3fb4, 60, 30, 0.6, 0.6, 1.4); mag.position.set(6, 7, 4); mag.target.position.set(1, 0, 0); S.add(mag, mag.target)
  const rim = new THREE.DirectionalLight(0xb48cff, 1.4); rim.position.set(0, 5, -8); S.add(rim)
  const flash = new THREE.AmbientLight(0xd8e4ff, 0); S.add(flash)

  // крыша: мокрый тёмный металл, светящаяся разметка
  const floorT = canvasTex(1024, 512, c => {
    c.fillStyle = '#0c0d16'; c.fillRect(0, 0, 1024, 512)
    for (let i = 0; i < 2200; i++) { c.fillStyle = `rgba(${120 + Math.random() * 80},${120 + Math.random() * 80},${160 + Math.random() * 60},${Math.random() * 0.06})`; c.fillRect(Math.random() * 1024, Math.random() * 512, 2 + Math.random() * 30, 1 + Math.random() * 3) }
    c.strokeStyle = 'rgba(80,90,140,0.35)'; c.lineWidth = 2
    for (let x = 0; x <= 1024; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 512); c.stroke() }
    for (let y = 0; y <= 512; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke() }
    c.strokeStyle = 'rgba(52,232,255,0.9)'; c.lineWidth = 6; c.beginPath(); c.arc(512, 256, 150, 0, Math.PI * 2); c.stroke()
    c.strokeStyle = 'rgba(255,63,180,0.8)'; c.lineWidth = 3; c.beginPath(); c.arc(512, 256, 175, 0, Math.PI * 2); c.stroke()
    c.fillStyle = 'rgba(52,232,255,0.15)'; c.font = '800 120px sans-serif'; c.textAlign = 'center'; c.fillText('S010', 512, 300)
  })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.8), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.3, metalness: 0.45, envMapIntensity: 0.12, emissive: 0xffffff, emissiveMap: floorT, emissiveIntensity: 0.55 }))
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor)
  // продолжение крыши к камере — тёмный мокрый бетон, чтобы снизу не было «пустоты»
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 0.35, metalness: 0.4, envMapIntensity: 0.15 }))
  apron.rotation.x = -Math.PI / 2; apron.position.set(0, -0.005, 9); apron.receiveShadow = true; S.add(apron)
  const edgeC = new THREE.MeshBasicMaterial({ color: 0x34e8ff }), edgeM = new THREE.MeshBasicMaterial({ color: 0xff3fb4 })
  for (const [x, z, w, d, m] of [[0, -3.4, 14, 0.06, edgeC], [-7, 0, 0.06, 6.8, edgeC], [7, 0, 0.06, 6.8, edgeM]] as const) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), m); e.position.set(x, 0.03, z); S.add(e)
  }
  // парапет и техника на крыше
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1b28, roughness: 0.5, metalness: 0.6 })
  const par2 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.9, 0.3), dark); par2.position.set(0, 0.45, -3.4); S.add(par2)
  for (const sx of [-1, 1]) {
    const unit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1), dark); unit.position.set(sx * 5.6, 0.6, -2.6); S.add(unit)
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0x24263a, emissive: sx > 0 ? 0xff3fb4 : 0x34e8ff, emissiveIntensity: 0.4 }))
    fan.position.set(sx * 5.6, 1.25, -2.6); S.add(fan)
  }

  const cars: { m: THREE.Mesh; v: number }[] = []
  // неоновые вывески
  const neon = (text: string, col: string, w: number, h: number) => {
    const t = canvasTex(512, 128, c => {
      c.fillStyle = 'rgba(0,0,0,0)'; c.fillRect(0, 0, 512, 128)
      c.font = '800 78px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.shadowColor = col; c.shadowBlur = 28; c.fillStyle = col; c.fillText(text, 256, 66); c.shadowBlur = 10; c.fillStyle = '#ffffff'; c.globalAlpha = 0.55; c.fillText(text, 256, 66)
    })
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide }))
  }
  const signs: THREE.Mesh[] = []
  const frame = new THREE.MeshStandardMaterial({ color: 0x15161f, roughness: 0.4, metalness: 0.8 })
  for (const [txt, col, x, y, z, w] of [['БАЗА ЗНАНИЙ', '#34e8ff', -5.3, 1.75, -5.2, 3.4], ['S010', '#ff3fb4', 6.4, 1.7, -5.2, 2.2]] as const) {
    const m = neon(txt, col, w, w / 4); m.position.set(x, y, z); S.add(m); signs.push(m)
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.06, 0.06), frame); fr.position.set(x, y - w / 8 - 0.05, z - 0.05); S.add(fr)
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, y, 0.15), frame); leg.position.set(x, y / 2, z - 0.1); S.add(leg)
  }
  // летающие машины — светящиеся черточки на разных высотах
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffe2a8 : 0xff3355 }))
    m.position.set(rnd(-90, 90), rnd(8, 30), rnd(-110, -40)); S.add(m); cars.push({ m, v: (Math.random() < 0.5 ? -1 : 1) * rnd(8, 20) })
  }

  // дождь
  const RN = 900, rp = new Float32Array(RN * 6), rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3))
  const seed = (i: number, top = false) => { const x = rnd(-9, 9), z = rnd(-6, 7), y = top ? rnd(10, 14) : rnd(0, 14); rp.set([x, y, z, x - 0.04, y - 0.55, z], i * 6) }
  for (let i = 0; i < RN; i++) seed(i)
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.35, depthWrite: false }))
  rain.frustumCulled = false; S.add(rain)
  // брызги на полу
  const spT = canvasTex(64, 64, c => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(190,210,255,0.7)'); g.addColorStop(1, 'rgba(190,210,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64) })
  const splashes: { s: THREE.Sprite; l: number }[] = []
  for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spT, transparent: true, depthWrite: false, opacity: 0 })); s.scale.set(0.3, 0.08, 1); S.add(s); splashes.push({ s, l: 0 }) }

  // голограмма над ареной — медленно вращающееся кольцо
  const holo = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0x34e8ff, transparent: true, opacity: 0.5 }))
  holo.position.set(0, 4.2, -1.5); S.add(holo)
  const holo2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.02, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff3fb4, transparent: true, opacity: 0.5 }))
  holo2.position.copy(holo.position); S.add(holo2)

  let T = 0, nextBolt = rnd(5, 11), bolt = 0
  return {
    /** вспышка молнии (вызывается и при спецприёме) */
    flash(power = 1) { bolt = Math.max(bolt, power) },
    update(dt: number) {
      T += dt
      for (let i = 0; i < RN; i++) {
        const o = i * 6; rp[o + 1] -= dt * 16; rp[o + 4] -= dt * 16; rp[o] -= dt * 0.8; rp[o + 3] -= dt * 0.8
        if (rp[o + 4] < 0) {
          if (Math.abs(rp[o]) < 6 && rp[o + 2] < 3 && rp[o + 2] > -3 && Math.random() < 0.35) { const sp = splashes.find(x => x.l <= 0); if (sp) { sp.l = 0.25; sp.s.position.set(rp[o], 0.04, rp[o + 2]) } }
          seed(i, true)
        }
      }
      rg.attributes.position.needsUpdate = true
      for (const sp of splashes) if (sp.l > 0) { sp.l -= dt; (sp.s.material as THREE.SpriteMaterial).opacity = Math.max(0, sp.l * 3); sp.s.scale.x = 0.3 + (0.25 - sp.l) * 2 }
      for (const c of cars) { c.m.position.x += c.v * dt; if (c.m.position.x > 100) c.m.position.x = -100; if (c.m.position.x < -100) c.m.position.x = 100 }
      holo.rotation.x = Math.PI / 2 + Math.sin(T * 0.6) * 0.2; holo.rotation.z += dt * 0.5; holo2.rotation.x = Math.PI / 2 - Math.sin(T * 0.5) * 0.25; holo2.rotation.z -= dt * 0.8
      signs.forEach((s, i) => { (s.material as THREE.MeshBasicMaterial).opacity = (Math.sin(T * 7 + i * 3) > 0.96 && i % 2) ? 0.35 : 1 })   // мерцание неона
      nextBolt -= dt; if (nextBolt <= 0) { bolt = 1; nextBolt = rnd(7, 16) }
      flash.intensity = bolt * 2.2 * (Math.random() < 0.7 ? 1 : 0.3); bolt = Math.max(0, bolt - dt * 3.5)
      cyan.intensity = 60 + Math.sin(T * 1.3) * 8; mag.intensity = 60 + Math.cos(T * 1.1) * 8
    },
    get lightning() { return bolt },
  }
}
