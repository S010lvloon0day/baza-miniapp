import * as THREE from 'three'

/** Пейзаж забега: закатное небо, горы, луг с деревьями, асфальт с разметкой, фонари. Всё прокручивается по dz. */
const tex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, rx = 1, ry = 1) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  draw(cv.getContext('2d')!)
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry)
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
const speckle = (c: CanvasRenderingContext2D, w: number, h: number, n: number, cols: string[], s: [number, number]) => {
  for (let i = 0; i < n; i++) { c.fillStyle = cols[i % cols.length]; const r = s[0] + Math.random() * (s[1] - s[0]); c.fillRect(Math.random() * w, Math.random() * h, r, r) }
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

export function buildWorld(S: THREE.Scene, LANE: number) {
  const HORIZON = new THREE.Color(0xf0a070)
  S.background = HORIZON
  S.fog = new THREE.Fog(0xe39a78, 35, 150)

  // небо — градиент + солнце впереди
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sun: { value: new THREE.Vector3(0, 0.1, 1).normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec3 vD; uniform vec3 sun;
      void main(){ float h = vD.y;
        vec3 top = vec3(0.13,0.16,0.38), mid = vec3(0.55,0.36,0.62), hor = vec3(1.0,0.62,0.42), low = vec3(0.89,0.6,0.47);
        vec3 c = h > 0.0 ? mix(mix(hor, mid, smoothstep(0.0,0.22,h)), top, smoothstep(0.18,0.7,h)) : low;
        float s = max(dot(vD, sun), 0.0);
        c += vec3(1.0,0.75,0.45) * pow(s, 40.0) * 0.8 + vec3(1.0,0.95,0.8) * smoothstep(0.9975,0.999,s);
        gl_FragColor = vec4(c,1.0); }`,
  }))
  sky.renderOrder = -1; S.add(sky)

  // свет: тёплое контровое солнце спереди, холодная заливка сзади
  S.add(new THREE.HemisphereLight(0xffd9b8, 0x33402c, 1.1))
  const sun = new THREE.DirectionalLight(0xffb27a, 2.2); sun.position.set(-6, 8, 40); S.add(sun)
  const fill = new THREE.DirectionalLight(0xa9bbff, 0.9); fill.position.set(3, 5, -8); S.add(fill)

  const scroll: { o: THREE.Object3D; span: number }[] = []
  const texScroll: { t: THREE.Texture; k: number }[] = []

  // горы — статичный дальний план (туман делает их голубоватыми)
  const mMat = new THREE.MeshStandardMaterial({ color: 0x5b4a72, roughness: 1, flatShading: true })
  for (let i = 0; i < 22; i++) {
    const r = rnd(18, 42), h = rnd(14, 34)
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6 + Math.floor(rnd(0, 3))), mMat)
    const side = i % 2 ? 1 : -1
    m.position.set(side * rnd(12, 140), h / 2 - 2, rnd(150, 260)); m.rotation.y = rnd(0, 3); S.add(m)
  }

  // луг
  const grassT = tex(256, 256, c => {
    c.fillStyle = '#4c7a36'; c.fillRect(0, 0, 256, 256)
    speckle(c, 256, 256, 2600, ['#5a8c3f', '#416b2e', '#6a9a48', '#3a6129'], [1, 3])
    speckle(c, 256, 256, 40, ['#e8d36a', '#f2f2e6', '#d98ac0'], [2, 3])
  }, 60, 60)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 }))
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, 150); S.add(ground)
  texScroll.push({ t: grassT, k: 60 / 400 })

  // дорога: асфальт, пунктир между дорожками, сплошные края
  const W = LANE * 3 + 1.0, L = 200
  const roadT = tex(512, 512, c => {
    c.fillStyle = '#34363b'; c.fillRect(0, 0, 512, 512)
    speckle(c, 512, 512, 9000, ['#3e4046', '#2b2d31', '#46484e', '#232428'], [1, 2.5])
    const px = (x: number) => (x / W + 0.5) * 512
    c.fillStyle = '#eceae2'
    for (const s of [-1, 1]) c.fillRect(px(s * (LANE * 1.5 + 0.18)) - 5, 0, 10, 512)
    for (const s of [-0.5, 0.5]) for (let y = 0; y < 512; y += 128) c.fillRect(px(s * LANE) - 4, y, 8, 70)
  }, 1, L / 8)
  const road = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: roadT, roughness: 0.85, metalness: 0 }))
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, L / 2 - 10); S.add(road)
  texScroll.push({ t: roadT, k: (L / 8) / L })
  // бордюр красно-белый
  const curbT = tex(64, 256, c => { for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#e8e6e0' : '#c8383c'; c.fillRect(0, i * 64, 64, 64) } }, 1, L / 2)
  for (const s of [-1, 1]) {
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, L), new THREE.MeshStandardMaterial({ map: curbT, roughness: 0.7 }))
    cb.position.set(s * (W / 2 + 0.17), 0.07, L / 2 - 10); S.add(cb)
  }
  texScroll.push({ t: curbT, k: (L / 2) / L })
  // обочина — гравий
  const gravT = tex(128, 128, c => { c.fillStyle = '#8a7a62'; c.fillRect(0, 0, 128, 128); speckle(c, 128, 128, 900, ['#9b8b70', '#6f624e', '#b0a084'], [1, 3]) }, 2, L / 3)
  for (const s of [-1, 1]) {
    const gv = new THREE.Mesh(new THREE.PlaneGeometry(1.6, L), new THREE.MeshStandardMaterial({ map: gravT, roughness: 1 }))
    gv.rotation.x = -Math.PI / 2; gv.position.set(s * (W / 2 + 1.15), -0.005, L / 2 - 10); S.add(gv)
  }
  texScroll.push({ t: gravT, k: (L / 3) / L })

  // деревья (ель/лиственное), камни, фонари — переиспользуются по кругу
  const SPAN = 180
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 1, flatShading: true })
  const pineM = [0x2f5d34, 0x3b6e3a, 0x27502e].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }))
  const leafM = [0x5f8f3a, 0x7aa041, 0xb8873a, 0xc76a3a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }))
  const pineG = [new THREE.ConeGeometry(1.4, 2.2, 7), new THREE.ConeGeometry(1.1, 1.9, 7), new THREE.ConeGeometry(0.75, 1.6, 7)]
  const trunkG = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6)
  const blobG = new THREE.IcosahedronGeometry(1.2, 0)
  const tree = () => {
    const g = new THREE.Group()
    const tr = new THREE.Mesh(trunkG, trunkM); tr.position.y = 0.6; g.add(tr)
    if (Math.random() < 0.55) {
      const m = pineM[Math.floor(Math.random() * 3)]
      pineG.forEach((pg, i) => { const c = new THREE.Mesh(pg, m); c.position.y = 1.5 + i * 0.95; g.add(c) })
    } else {
      const m = leafM[Math.floor(Math.random() * leafM.length)]
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(blobG, m); b.position.set(rnd(-0.5, 0.5), 1.9 + rnd(0, 0.8), rnd(-0.5, 0.5)); b.scale.setScalar(rnd(0.7, 1.1)); b.rotation.set(rnd(0, 3), rnd(0, 3), 0); g.add(b) }
    }
    g.scale.setScalar(rnd(0.8, 1.6)); g.rotation.y = rnd(0, 6.3)
    return g
  }
  for (let i = 0; i < 70; i++) {
    const t = tree(); const s = i % 2 ? 1 : -1
    t.position.set(s * (W / 2 + rnd(3.2, 26)), 0, rnd(-8, SPAN - 8)); S.add(t); scroll.push({ o: t, span: SPAN })
  }
  const rockM = new THREE.MeshStandardMaterial({ color: 0x8b8580, roughness: 0.95, flatShading: true })
  const rockG = new THREE.DodecahedronGeometry(0.5, 0)
  for (let i = 0; i < 26; i++) {
    const r = new THREE.Mesh(rockG, rockM); const s = i % 2 ? 1 : -1
    r.scale.set(rnd(0.5, 1.4), rnd(0.35, 0.8), rnd(0.5, 1.3)); r.rotation.y = rnd(0, 3)
    r.position.set(s * (W / 2 + rnd(2.2, 12)), 0.12, rnd(-8, SPAN - 8)); S.add(r); scroll.push({ o: r, span: SPAN })
  }
  // кусты цветов
  const flowerM = [0xe4c84a, 0xe58ac0, 0xf2f0e6].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }))
  const bushG = new THREE.IcosahedronGeometry(0.35, 0)
  for (let i = 0; i < 40; i++) {
    const b = new THREE.Mesh(bushG, flowerM[i % 3]); const s = i % 2 ? 1 : -1
    b.scale.set(1, 0.6, 1); b.position.set(s * (W / 2 + rnd(2.1, 9)), 0.15, rnd(-8, SPAN - 8)); S.add(b); scroll.push({ o: b, span: SPAN })
  }
  // фонари с тёплым светящимся плафоном
  const poleM = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.6 })
  const bulbM = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc46a, emissiveIntensity: 2.2 })
  const glowT = tex(64, 64, c => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,214,150,0.55)'); g.addColorStop(1, 'rgba(255,190,120,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64) })
  const glowM = new THREE.SpriteMaterial({ map: glowT, depthWrite: false, blending: THREE.AdditiveBlending, fog: true })
  for (let i = 0; i < 16; i++) for (const s of [-1, 1]) {
    const g = new THREE.Group()
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.2, 8), poleM); p.position.y = 2.1; g.add(p)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), poleM); arm.position.set(-s * 0.42, 4.15, 0); g.add(arm)
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.2), bulbM); bulb.position.set(-s * 0.82, 4.08, 0); g.add(bulb)
    const gl = new THREE.Sprite(glowM); gl.scale.setScalar(0.9); gl.position.set(-s * 0.82, 4.0, 0); g.add(gl)
    g.position.set(s * (W / 2 + 0.75), 0, i * 12 + (s > 0 ? 6 : 0)); S.add(g); scroll.push({ o: g, span: 192 })
  }

  return {
    update(dz: number) {
      for (const it of scroll) { it.o.position.z -= dz; if (it.o.position.z < -10) it.o.position.z += it.span }
      for (const s of texScroll) s.t.offset.y += dz * s.k
    },
  }
}

/** Препятствия: шлагбаум (жёлтый, прыгать), арка с перекладиной (фиолетовая, подныривать), контейнер (красный, обегать). */
export function obstacleFactory(LANE: number) {
  const stripes = (a: string, b: string) => tex(256, 64, c => { for (let i = -1; i < 9; i++) { c.fillStyle = i % 2 ? a : b; c.beginPath(); c.moveTo(i * 32, 64); c.lineTo(i * 32 + 32, 64); c.lineTo(i * 32 + 64, 0); c.lineTo(i * 32 + 32, 0); c.fill() } })
  const lowM = new THREE.MeshStandardMaterial({ map: stripes('#f5c25a', '#1d1d1f'), roughness: 0.5, emissive: 0x3a2600, emissiveIntensity: 0.35 })
  const highM = new THREE.MeshStandardMaterial({ map: stripes('#9b7bff', '#f2f0ff'), roughness: 0.45, emissive: 0x24127a, emissiveIntensity: 0.5 })
  const postM = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.5, metalness: 0.5 })
  const contT = tex(256, 128, c => {
    c.fillStyle = '#b8383c'; c.fillRect(0, 0, 256, 128)
    for (let x = 0; x < 256; x += 16) { c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x, 0, 5, 128); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x + 6, 0, 3, 128) }
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, 0, 256, 8); c.fillRect(0, 120, 256, 8)
    c.fillStyle = '#f2efe8'; c.font = 'bold 22px sans-serif'; c.fillText('S010', 18, 72)
  })
  const contM = new THREE.MeshStandardMaterial({ map: contT, roughness: 0.6, metalness: 0.3, emissive: 0x3a0a0c, emissiveIntensity: 0.3 })
  return (k: 'low' | 'high' | 'wall') => {
    const g = new THREE.Group()
    if (k === 'low') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(LANE * 0.86, 0.26, 0.14), lowM); b.position.y = 0.42; g.add(b)
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(LANE * 0.86, 0.12, 0.12), lowM); b2.position.y = 0.16; g.add(b2)
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.36), postM); p.position.set(sx * LANE * 0.38, 0.275, 0); g.add(p) }
    }
    if (k === 'high') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(LANE * 0.92, 0.34, 0.3), highM); b.position.y = 1.42; g.add(b)
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.6, 8), postM); p.position.set(sx * LANE * 0.44, 0.8, 0); g.add(p) }
    }
    if (k === 'wall') {
      const w = new THREE.Mesh(new THREE.BoxGeometry(LANE * 0.88, 2.4, 1.3), contM); w.position.y = 1.2; g.add(w)
    }
    return g
  }
}
