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
    for (const s of [-0.5, 0.5]) c.fillRect(px(s * LANE) - 4, 0, 8, 192)   // штрих 3 м, разрыв 5 м
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

  const anim = addDetails(S, W, scroll, SPAN)

  return {
    update(dz: number, dt = 0) {
      for (const it of scroll) { it.o.position.z -= dz; if (it.o.position.z < -10) it.o.position.z += it.span }
      for (const s of texScroll) s.t.offset.y -= dz * s.k   // плоскость повёрнута: v растёт к камере
      anim(dt, dz)
    },
  }
}

/** Детали: облака, птицы, воздушный шар, ферма с мельницей, заборы, озеро, трава, билборды, арки над дорогой, пыльца. */
function addDetails(S: THREE.Scene, W: number, scroll: { o: THREE.Object3D; span: number }[], SPAN: number) {
  const anims: ((dt: number, dz: number, t: number) => void)[] = []
  let T = 0
  const std = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true, ...o })
  const put = (o: THREE.Object3D, span = SPAN) => { S.add(o); scroll.push({ o, span }) }

  // облака — мягкие спрайты, медленно плывут
  const cloudT = tex(128, 64, c => {
    for (let i = 0; i < 14; i++) { const x = 20 + Math.random() * 88, y = 26 + Math.random() * 16, r = 10 + Math.random() * 16
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,236,226,0.85)'); g.addColorStop(1, 'rgba(255,220,210,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 64) }
  })
  const clouds: THREE.Sprite[] = []
  for (let i = 0; i < 14; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, transparent: true, depthWrite: false, fog: false, opacity: rnd(0.55, 0.9) }))
    sp.scale.set(rnd(40, 80), rnd(14, 24), 1); sp.position.set(rnd(-160, 160), rnd(38, 80), rnd(140, 300)); S.add(sp); clouds.push(sp)
  }
  anims.push(dt => { for (const c of clouds) { c.position.x += dt * 1.2; if (c.position.x > 200) c.position.x = -200 } })

  // птицы — стая «галочек», машут крыльями
  const birdM = new THREE.MeshBasicMaterial({ color: 0x2a2030, side: THREE.DoubleSide, fog: false })
  const birds: { g: THREE.Group; l: THREE.Mesh; r: THREE.Mesh; ph: number }[] = []
  const flock = new THREE.Group(); flock.position.set(-60, 30, 120); S.add(flock)
  const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.9, 0, 0.25, 0.9, 0, -0.1], 3))
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); const l = new THREE.Mesh(wingG, birdM), r = new THREE.Mesh(wingG, birdM); r.scale.x = -1; g.add(l, r)
    g.position.set(-Math.abs(i - 4) * 1.6 + rnd(-0.3, 0.3), rnd(-0.6, 0.6), (i - 4) * 1.4); g.rotation.y = Math.PI / 2; g.scale.setScalar(1.3)
    flock.add(g); birds.push({ g, l, r, ph: rnd(0, 6) })
  }
  anims.push((dt, _dz, t) => {
    flock.position.x += dt * 5; flock.position.y = 30 + Math.sin(t * 0.3) * 2; if (flock.position.x > 90) flock.position.set(-90, 30, rnd(90, 150))
    for (const b of birds) { const a = Math.sin(t * 7 + b.ph) * 0.7; b.l.rotation.z = a; b.r.rotation.z = -a }
  })

  // воздушный шар
  const balloon = new THREE.Group()
  const envT = tex(256, 128, c => { const cols = ['#e5484d', '#f5c25a', '#17e584', '#8a6bff']; for (let i = 0; i < 16; i++) { c.fillStyle = cols[i % 4]; c.fillRect(i * 16, 0, 16, 128) } })
  const env = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshStandardMaterial({ map: envT, roughness: 0.6 }))
  env.scale.y = 1.2; balloon.add(env)
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), std(0x7a5232)); basket.position.y = -4.6; balloon.add(basket)
  balloon.position.set(26, 22, 95); S.add(balloon)
  anims.push((dt, _dz, t) => { balloon.position.y = 22 + Math.sin(t * 0.4) * 1.5; balloon.position.x -= dt * 0.6; if (balloon.position.x < -40) balloon.position.x = 40 })

  // озеро слева вдали, с бликами
  const lakeT = tex(256, 256, c => { c.fillStyle = '#5c7fb0'; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,${200 + Math.random() * 40 | 0},170,${Math.random() * 0.5})`; c.fillRect(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 14, 1.5) } }, 4, 4)
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ map: lakeT, roughness: 0.15, metalness: 0.4 }))
  lake.rotation.x = -Math.PI / 2; lake.scale.set(36, 22, 1); lake.position.set(52, 0.02, 120); S.add(lake)
  anims.push(dt => { lakeT.offset.x += dt * 0.01 })

  // ферма: домики, амбар, мельница — едут навстречу
  const wallC = [0xe9dcc5, 0xd9c2a0, 0xc9d6e0], roofC = [0x8f3b2e, 0x4a5a6e, 0x6b3d2a]
  const house = () => {
    const g = new THREE.Group(); const k = Math.floor(rnd(0, 3))
    const w = rnd(3, 4.5), d = rnd(3, 4), h = rnd(2.2, 3)
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(wallC[k])); b.position.y = h / 2; g.add(b)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.6, 4), std(roofC[k])); roof.position.y = h + 0.8; roof.rotation.y = Math.PI / 4; roof.scale.z = d / w; g.add(roof)
    const winM = new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffb050, emissiveIntensity: 1.4 })
    for (const sx of [-0.25, 0.25]) { const wn = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.05), winM); wn.position.set(sx * w, h * 0.55, -d / 2 - 0.02); g.add(wn) }
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.05), std(0x5a3a24)); door.position.set(0, 0.65, -d / 2 - 0.02); g.add(door)
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), std(0x7a5a4a)); ch.position.set(w * 0.25, h + 1.1, 0); g.add(ch)
    return g
  }
  const barn = () => {
    const g = new THREE.Group()
    const b = new THREE.Mesh(new THREE.BoxGeometry(6, 3.6, 5), std(0xa8322e)); b.position.y = 1.8; g.add(b)
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 5.2, 4, 1, false, 0, Math.PI), std(0x3c3f46)); roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.position.y = 3.6; roof.scale.set(1, 1, 0.55); g.add(roof)
    const dr = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.05), std(0xeee6d8)); dr.position.set(0, 1.3, -2.53); g.add(dr)
    const sil = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6, 12), std(0xb9bec6, { metalness: 0.4, roughness: 0.5 })); sil.position.set(4, 3, 0); g.add(sil)
    const sc = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), std(0xb9bec6, { metalness: 0.4, roughness: 0.5 })); sc.position.set(4, 6, 0); g.add(sc)
    return g
  }
  const mills: THREE.Object3D[] = []
  const mill = () => {
    const g = new THREE.Group()
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 7, 8), std(0xe8e0d0)); tw.position.y = 3.5; g.add(tw)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.4, 8), std(0x6b3d2a)); cap.position.y = 7.7; g.add(cap)
    const hub = new THREE.Group(); hub.position.set(0, 6.8, -1.1); g.add(hub)
    for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 0.06), std(0xf2ede4)); bl.position.y = 1.8; const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; arm.add(bl); hub.add(arm) }
    mills.push(hub); return g
  }
  anims.push(dt => { for (const m of mills) m.rotation.z += dt * 1.1 })
  for (let i = 0; i < 9; i++) {
    const s = i % 2 ? 1 : -1; const k = i % 3
    const o = k === 0 ? house() : k === 1 ? barn() : mill()
    o.position.set(s * (W / 2 + rnd(14, 30)), 0, i * (SPAN / 9) + rnd(0, 8)); o.rotation.y = s > 0 ? rnd(-0.4, 0.2) : rnd(-0.2, 0.4) + Math.PI * 0
    put(o)
  }

  // деревянный забор вдоль луга
  const fenceM = std(0x8a6a48)
  const fenceSeg = () => {
    const g = new THREE.Group()
    for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), fenceM); p.position.set(0, 0.5, i * 2); g.add(p) }
    for (const y of [0.4, 0.8]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 6.2), fenceM); r.position.set(0, y, 3); g.add(r) }
    return g
  }
  for (let i = 0; i < 26; i++) for (const s of [-1, 1]) { if (Math.random() < 0.25) continue; const f = fenceSeg(); f.position.set(s * (W / 2 + 2.9), 0, i * 7.2 - 6); put(f, 26 * 7.2) }

  // трава пучками у обочины (инстансы)
  const tuftG = new THREE.ConeGeometry(0.05, 0.34, 3); tuftG.translate(0, 0.17, 0)
  const tuftM = new THREE.MeshStandardMaterial({ color: 0x5f9a3e, roughness: 1, flatShading: true })
  const N = 900; const tufts = new THREE.InstancedMesh(tuftG, tuftM, N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
  const tz = new Float32Array(N), tx = new Float32Array(N), ts = new Float32Array(N), tr = new Float32Array(N)
  const col = new THREE.Color()
  for (let i = 0; i < N; i++) {
    tx[i] = (i % 2 ? 1 : -1) * (W / 2 + 0.4 + Math.random() * Math.random() * 14); tz[i] = rnd(-8, 110); ts[i] = rnd(0.5, 1.15); tr[i] = rnd(-0.35, 0.35)
    tufts.setColorAt(i, col.setHSL(0.25 + rnd(-0.03, 0.05), 0.55, rnd(0.36, 0.52)))
  }
  S.add(tufts)
  const placeTufts = () => {
    for (let i = 0; i < N; i++) { e.set(tr[i], i, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(tx[i], 0, tz[i]), q, new THREE.Vector3(ts[i], ts[i], ts[i])); tufts.setMatrixAt(i, m4) }
    tufts.instanceMatrix.needsUpdate = true
  }
  placeTufts()
  anims.push((_dt, dz) => { if (!dz) return; for (let i = 0; i < N; i++) { tz[i] -= dz; if (tz[i] < -8) tz[i] += 118 } placeTufts() })

  // билборды
  const boardT = (title: string, sub: string, a: string, b: string) => tex(512, 256, c => {
    const g = c.createLinearGradient(0, 0, 512, 256); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, 512, 256)
    c.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(420 - i * 30, 60 + i * 20, 80 - i * 8, 0, 7); c.fill() }
    c.fillStyle = '#fff'; c.font = 'bold 74px sans-serif'; c.fillText(title, 36, 130); c.font = '34px sans-serif'; c.fillText(sub, 38, 190)
  })
  const ads = [boardT('S010 VPN', 'быстро · без логов', '#0f8f5a', '#17e584'), boardT('СНИМИ МАСКУ', 'приз 80 USDT', '#3a1f8f', '#8a6bff'), boardT('20 000', 'добеги до конца', '#a8322e', '#f5c25a')]
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(); const s = i % 2 ? 1 : -1
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: ads[i % 3], roughness: 0.6, emissive: 0xffffff, emissiveMap: ads[i % 3], emissiveIntensity: 0.25 }))
    pane.position.y = 4.2; pane.rotation.y = Math.PI + s * 0.35; g.add(pane)
    const back = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.2, 0.15), std(0x2a2d33)); back.position.set(0, 4.2, 0.1); back.rotation.y = s * 0.35; g.add(back)
    for (const px of [-1.8, 1.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 0.2), std(0x2a2d33)); p.position.set(px, 1.4, 0.2); g.add(p) }
    g.position.set(s * (W / 2 + rnd(6, 9)), 0, i * 30 + 18); put(g, 180)
  }

  // арка-мост над дорогой (декор, выше героя)
  const archM = std(0x8c8378, { roughness: 0.95 })
  const arch = new THREE.Group()
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6, 2), archM); p.position.set(s * (W / 2 + 1.4), 3, 0); arch.add(p) }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(W + 4, 1.1, 2.4), archM); deck.position.y = 6.4; arch.add(deck)
  const rail = new THREE.Mesh(new THREE.BoxGeometry(W + 4, 0.5, 0.15), std(0x3a3d44)); rail.position.set(0, 7.2, -1.1); arch.add(rail)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.9), new THREE.MeshStandardMaterial({ map: tex(256, 64, c => { c.fillStyle = '#0f8f5a'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#fff'; c.font = 'bold 30px sans-serif'; c.fillText('▲ S010  ·  ВПЕРЁД', 14, 42) }), emissive: 0x0b6a40, emissiveIntensity: 0.6 }))
  sign.position.set(0, 5.4, -1.25); sign.rotation.y = Math.PI; arch.add(sign)
  arch.position.z = 90; put(arch, 180)

  // пыльца в лучах солнца
  const PN = 160; const pg = new THREE.BufferGeometry(); const pp = new Float32Array(PN * 3)
  for (let i = 0; i < PN; i++) { pp[i * 3] = rnd(-12, 12); pp[i * 3 + 1] = rnd(0.3, 5); pp[i * 3 + 2] = rnd(-4, 40) }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3))
  const pollen = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffe0a0, size: 0.07, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }))
  S.add(pollen)
  anims.push((dt, dz, t) => {
    for (let i = 0; i < PN; i++) {
      pp[i * 3 + 2] -= dz + dt * 0.3; pp[i * 3 + 1] += Math.sin(t + i) * dt * 0.15; pp[i * 3] += Math.cos(t * 0.7 + i) * dt * 0.1
      if (pp[i * 3 + 2] < -4) { pp[i * 3 + 2] += 44; pp[i * 3] = rnd(-12, 12); pp[i * 3 + 1] = rnd(0.3, 5) }
    }
    pg.attributes.position.needsUpdate = true
  })

  return (dt: number, dz: number) => { T += dt; for (const a of anims) a(dt, dz, T) }
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
