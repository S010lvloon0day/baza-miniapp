import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export interface StageHandle {
  play: (anim: string) => void
  speak: (on: boolean) => void
  shake: () => void
  reveal: () => Promise<void>
}
interface Props {
  publicUrl: string
  revealUrl?: string        // если задан — лицо доступно (раунд разгадан)
  revealHeaders?: Record<string, string>
  revealed?: boolean        // сразу показать без маски
  onReady?: () => void
  onProgress?: (p: number) => void
}

const BASE = import.meta.env.BASE_URL

function makeLoader() {
  const d = new DRACOLoader(); d.setDecoderPath(BASE + 'mask/draco/')
  const l = new GLTFLoader(); l.setDRACOLoader(d); return l
}

const MaskStage = forwardRef<StageHandle, Props>(function MaskStage({ publicUrl, revealUrl, revealHeaders, revealed, onReady, onProgress }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<StageHandle>({ play: () => {}, speak: () => {}, shake: () => {}, reveal: async () => {} })
  useImperativeHandle(ref, () => ({
    play: a => api.current.play(a), speak: o => api.current.speak(o), shake: () => api.current.shake(), reveal: () => api.current.reveal(),
  }), [])

  useEffect(() => {
    const el = host.current!
    let disposed = false
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    el.appendChild(renderer.domElement)
    renderer.domElement.style.touchAction = 'none'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50)
    camera.position.set(0.45, 1.5, 3.2)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1.3, 0)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 1.6; controls.maxDistance = 5
    controls.minPolarAngle = 1.05; controls.maxPolarAngle = 1.78
    controls.rotateSpeed = 0.8

    // PBR-освещение: окружение студии (отражения ткани и кожи) + тёплый ключ + лёгкий холодный контровой
    const pm = new THREE.PMREMGenerator(renderer)
    const envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    scene.environmentIntensity = 0.9
    const key = new THREE.DirectionalLight(0xfff4e8, 1.5); key.position.set(1.5, 3, 2.5); scene.add(key)
    const rim = new THREE.DirectionalLight(0xc9c0ff, 0.9); rim.position.set(-2, 2.2, -2.4); scene.add(rim)

    // пятно на полу
    const g = document.createElement('canvas'); g.width = g.height = 128
    const cx = g.getContext('2d')!; const gr = cx.createRadialGradient(64, 64, 4, 64, 64, 64)
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(g), transparent: true, depthWrite: false }))
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.002; scene.add(floor)
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.64, 96), new THREE.MeshBasicMaterial({ color: 0x17e584, transparent: true, opacity: 0.35 }))
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; scene.add(ring)

    const clock = new THREE.Clock()
    let mixer: THREE.AnimationMixer | null = null
    let mixer2: THREE.AnimationMixer | null = null
    let clips: THREE.AnimationClip[] = []
    let idle: THREE.AnimationAction | null = null
    let idle2: THREE.AnimationAction | null = null
    let model: THREE.Object3D | null = null
    let model2: THREE.Object3D | null = null
    let maskMesh: THREE.Mesh | null = null
    let head: THREE.Object3D | null = null, head2: THREE.Object3D | null = null
    let speaking = false, shakeT = 0
    let current: THREE.AnimationAction | null = null
    let particles: THREE.Points | null = null, partT = -1
    const partVel: THREE.Vector3[] = []

    const loader = makeLoader()

    const fit = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1
      renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px'
      camera.aspect = w / h
      camera.position.z = w / h < 0.75 ? 3.4 : 3.0
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(fit); ro.observe(el); fit()

    const findHead = (o: THREE.Object3D) => { let hb: THREE.Object3D | null = null; o.traverse(n => { if (/Head$/.test(n.name) && !/HeadTop/.test(n.name)) hb = n }); return hb }

    const bindIdle = (m: THREE.AnimationMixer) => {
      const c = clips.find(c => c.name === 'idle'); if (!c) return null
      const a = m.clipAction(c); a.play(); return a
    }

    loader.load(publicUrl, gltf => {
      if (disposed) return
      model = gltf.scene; clips = gltf.animations
      model.traverse(o => {
        const m = o as THREE.Mesh
        if (m.isMesh) { m.frustumCulled = false; if (o.name.toLowerCase().startsWith('mask')) maskMesh = m }
      })
      scene.add(model)
      head = findHead(model)
      mixer = new THREE.AnimationMixer(model)
      idle = bindIdle(mixer); current = idle
      mixer.addEventListener('finished', () => { if (idle && current !== idle) { idle.reset().fadeIn(0.35).play(); current?.fadeOut(0.35); current = idle } })
      if (revealed && revealUrl) loadReveal().then(() => swapToReveal(true))
      onReady?.()
    }, ev => { if (ev.total) onProgress?.(ev.loaded / ev.total) }, () => onReady?.())

    let revealPromise: Promise<void> | null = null
    const loadReveal = () => {
      if (!revealUrl) return Promise.resolve()
      if (revealPromise) return revealPromise
      if (revealHeaders) loader.setRequestHeader(revealHeaders)
      revealPromise = new Promise<void>(res => {
        loader.load(revealUrl, gl => {
          if (disposed) return res()
          model2 = gl.scene; model2.visible = false
          model2.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.frustumCulled = false })
          scene.add(model2); head2 = findHead(model2)
          mixer2 = new THREE.AnimationMixer(model2)
          idle2 = bindIdle(mixer2)
          mixer2.addEventListener('finished', () => { idle2?.reset().fadeIn(0.35).play() })
          res()
        }, undefined, () => res())
      })
      return revealPromise
    }

    const swapToReveal = (instant = false) => {
      if (!model2 || !model) return
      model2.visible = true; model.visible = false
      if (!instant && mixer2) {
        const c = clips.find(c => c.name === 'victory') || clips.find(c => c.name === 'defeated')
        if (c) { const a = mixer2.clipAction(c); a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; idle2?.fadeOut(0.3); a.fadeIn(0.3).play() }
      }
    }

    const burst = () => {
      if (!head) return
      const p = new THREE.Vector3(); head.getWorldPosition(p); p.y += 0.08
      const N = 160, pos = new Float32Array(N * 3)
      partVel.length = 0
      for (let i = 0; i < N; i++) {
        pos.set([p.x, p.y, p.z], i * 3)
        const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.1, Math.random() - 0.5).normalize().multiplyScalar(0.6 + Math.random() * 1.2)
        partVel.push(v)
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf4f6f5, size: 0.025, transparent: true, opacity: 1, depthWrite: false }))
      scene.add(particles); partT = 0
    }

    api.current = {
      play: (name: string) => {
        const mx = model2?.visible ? mixer2 : mixer
        if (!mx) return
        const c = clips.find(c => c.name === name); if (!c) return
        const a = mx.clipAction(c)
        a.reset(); a.setLoop(THREE.LoopRepeat, name === 'wave' ? 4 : 1); a.clampWhenFinished = false
        const from = model2?.visible ? idle2 : current
        from?.fadeOut(0.25); a.fadeIn(0.25).play()
        if (!model2?.visible) current = a
      },
      speak: on => { speaking = on },
      shake: () => { shakeT = 0.35 },
      reveal: async () => {
        await loadReveal()
        if (maskMesh) {
          const mats = (Array.isArray(maskMesh.material) ? maskMesh.material : [maskMesh.material]) as THREE.MeshStandardMaterial[]
          mats.forEach(m => { m.transparent = true })
          burst()
          const t0 = performance.now()
          await new Promise<void>(res => {
            const step = () => {
              const k = Math.min(1, (performance.now() - t0) / 650)
              mats.forEach(m => { m.opacity = 1 - k; m.emissive?.setScalar(k * 0.8) })
              if (k < 1) requestAnimationFrame(step); else res()
            }
            step()
          })
        }
        swapToReveal()
      },
    }

    let raf = 0
    const tmpQ = new THREE.Quaternion(), axY = new THREE.Vector3(0, 1, 0), axX = new THREE.Vector3(1, 0, 0)
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, clock.getDelta())
      mixer?.update(dt); mixer2?.update(dt)
      // «живой» взгляд: голова слегка поворачивается к камере, при речи — кивки
      const t = clock.elapsedTime
      for (const hb of [head, head2]) {
        if (!hb) continue
        const az = Math.atan2(camera.position.x, camera.position.z)
        tmpQ.setFromAxisAngle(axY, THREE.MathUtils.clamp(az, -0.55, 0.55) * 0.45); hb.quaternion.multiply(tmpQ)
        if (speaking) { tmpQ.setFromAxisAngle(axX, Math.sin(t * 11) * 0.035 + Math.sin(t * 4.3) * 0.02); hb.quaternion.multiply(tmpQ) }
      }
      ring.material.opacity = 0.22 + Math.sin(t * 2) * 0.1
      if (particles && partT >= 0) {
        partT += dt
        const arr = (particles.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
        for (let i = 0; i < partVel.length; i++) {
          partVel[i].y -= 1.4 * dt
          arr[i * 3] += partVel[i].x * dt; arr[i * 3 + 1] += partVel[i].y * dt; arr[i * 3 + 2] += partVel[i].z * dt
        }
        particles.geometry.attributes.position.needsUpdate = true
        ;(particles.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - partT / 1.6)
        if (partT > 1.6) { scene.remove(particles); particles.geometry.dispose(); particles = null; partT = -1 }
      }
      controls.update()
      if (shakeT > 0) {
        shakeT -= dt
        const s = shakeT * 0.03
        camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s
      }
      renderer.render(scene, camera)
    }
    tick()

    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else { clock.getDelta(); tick() } }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      disposed = true
      cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis)
      controls.dispose()
      scene.traverse(o => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []
        mats.forEach((mt: any) => { Object.values(mt).forEach((v: any) => v?.isTexture && v.dispose()); mt.dispose?.() })
      })
      envTex.dispose(); pm.dispose()
      renderer.dispose(); renderer.domElement.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicUrl, revealUrl])

  return <div ref={host} className="absolute inset-0" />
})

export default MaskStage
