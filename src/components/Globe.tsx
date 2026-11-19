import { useEffect, useRef } from 'react'
import { LAND_MASK } from './landMask'

/** Глобус на видеокарте (WebGL): весь рисунок считается в шейдере, JS в кадре только передаёт время и угол.
 *  Поэтому нет подвисаний: ни выделения памяти, ни тяжёлой отрисовки на процессоре.
 *  Точки-континенты, атмосфера, ночная сторона, блик, пульсирующие точки, орбита со спутником.
 *  Пауза вне экрана и в свёрнутом приложении. Без WebGL — статичная картинка-шар. */

const W = 390, H = 330
const SPOTS: [number, number][] = [[55.7, 37.6], [37.8, -122.4], [35.7, 139.7], [-23.5, -46.6], [51.5, -0.1], [1.3, 103.8], [-33.9, 18.4], [28.6, 77.2]]

const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

const FS = `precision highp float;
uniform vec2 uRes;uniform float uT;uniform float uRot;uniform sampler2D uMask;uniform vec3 uSpots[8];
const float PI=3.14159265;
const vec3 C1=vec3(.24,1.,.78);const vec3 C2=vec3(.24,.55,1.);const vec3 C3=vec3(.71,.36,1.);
vec3 pal(float u){return u<.5?mix(C1,C2,u*2.):mix(C2,C3,(u-.5)*2.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
void main(){
  vec2 px=gl_FragCoord.xy/uRes*vec2(${W}.,${H}.);px.y=${H}.-px.y;
  vec2 q=(px-vec2(195.,150.))/118.;           // центр шара, радиус 118
  float r2=dot(q,q);
  vec3 col=vec3(0.);float a=0.;
  float ux=clamp((px.x-77.)/236.,0.,1.);
  // атмосфера вокруг шара
  float d=sqrt(r2);
  float atm=smoothstep(1.28,1.0,d)*smoothstep(.9,1.0,d);
  col+=mix(vec3(.25,.6,1.),vec3(.6,.3,1.),ux)*atm*.55;a+=atm*.55;
  // орбита: эллипс, наклон -18°
  float oa=-.314;vec2 o=mat2(cos(oa),sin(oa),-sin(oa),cos(oa))*(px-vec2(195.,150.));
  vec2 oe=o/vec2(178.,46.);float ol=length(oe);float ang=atan(oe.y,oe.x);
  float ring=smoothstep(1.5,.0,abs(ol-1.)*46.);
  float sat=mod(uT*.55,2.*PI);float da=mod(sat-ang+2.*PI,2.*PI);
  float trail=ring*smoothstep(.55,0.,da)*1.4;
  float head=smoothstep(7.,0.,length(o-vec2(cos(sat)*178.,sin(sat)*46.)));
  vec3 rc=mix(vec3(.24,1.,.78),vec3(.71,.36,1.),ux);
  bool frontHalf=o.y>0.;
  if(r2<1.){
    float z=sqrt(1.-r2);vec3 n=vec3(q.x,-q.y,z);
    vec3 w=rotY(uRot)*(rotX(.35)*n);           // наклон оси 20°
    float lat=asin(clamp(w.y,-1.,1.));float lon=atan(w.x,w.z);
    // шар: тёмный океан с объёмом
    vec3 L=normalize(vec3(-.55,.6,.6));float lam=max(dot(n,L),0.);
    vec3 ocean=mix(vec3(.02,.04,.12),vec3(.06,.16,.38),lam)+vec3(.04,.1,.2)*pow(1.-z,2.);
    col=ocean;a=1.;
    // сетка точек: ряды по 1.7°, плотность по широте
    float rowH=1.7*PI/180.;float row=floor((lat+PI*.5)/rowH);float latc=(row+.5)*rowH-PI*.5;
    float cnt=max(1.,floor(2.*PI*cos(latc)/rowH));float cell=2.*PI/cnt;
    float colI=floor((lon+PI)/cell);float lonc=(colI+.5)*cell-PI;
    vec2 dd=vec2((lon-lonc)*cos(latc),lat-latc)/rowH;
    float land=texture2D(uMask,vec2((lonc+PI)/(2.*PI),(PI*.5-latc)/PI)).r;
    float rad=.34*(.75+.5*z);
    float dot1=smoothstep(rad,rad-.12,length(dd));
    float tw=.75+.25*sin(uT*2.+hash(vec2(row,colI))*6.28);
    vec3 dc=pal(ux)*(.6+.8*lam+.25*z)*tw;
    // ночная сторона: точки тусклее, отдельные «огни» мерцают
    float night=smoothstep(.15,-.25,dot(n,L));
    float lights=step(.86,hash(vec2(colI,row)))*night*(.6+.4*sin(uT*3.+hash(vec2(row,colI+1.))*9.));
    col=mix(col,dc,dot1*land*(1.-night*.55));
    col+=vec3(1.,.75,1.)*dot1*land*lights*.6;
    col+=pal(ux)*.05*dot1*(1.-land);           // едва заметный океанский узор
    // точки-разделы: ядро и расходящееся кольцо
    for(int i=0;i<8;i++){
      vec3 s=uSpots[i];vec3 sw=s;               // уже в координатах шара
      float cd=acos(clamp(dot(w,sw),-1.,1.));
      float ph=fract(uT*.6+float(i)*.31);
      float core=smoothstep(.04,.0,cd);
      float rng=smoothstep(.012,0.,abs(cd-ph*.16))*(1.-ph);
      float halo=smoothstep(.12,0.,cd)*.55;
      col+=(vec3(1.)*core+pal(ux)*(rng*1.2+halo))*smoothstep(-.1,.3,z);
    }
    // край шара и блик
    col+=mix(vec3(.24,1.,.78),vec3(.71,.36,1.),ux)*pow(1.-z,4.)*.9;
    col+=vec3(1.)*pow(max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.),18.)*.18;
    // передняя половина орбиты поверх шара
    if(frontHalf){col+=rc*ring*.75+rc*trail+vec3(1.)*head;}
  } else {
    float vis=frontHalf?1.:1.;
    col+=rc*ring*(frontHalf?.75:.3)*vis+rc*trail*(frontHalf?1.:.5)+vec3(1.)*head;
    a=max(a,max(ring*(frontHalf?.75:.3),max(trail,head)));
    // звёзды
    vec2 g=floor(px/6.);float h=hash(g);
    if(h>.985){vec2 f=fract(px/6.)-.5;float s=smoothstep(.18,0.,length(f))*(.5+.5*sin(uT*(1.+h*3.)+h*40.));col+=vec3(.9,.95,1.)*s;a=max(a,s);}
  }
  gl_FragColor=vec4(col,clamp(a,0.,1.));
}`

function maskTexture(gl: WebGLRenderingContext) {
  const bin = atob(LAND_MASK)
  const px = new Uint8Array(360 * 180)
  for (let i = 0; i < px.length; i++) px[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1 ? 255 : 0
  const t = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 360, 180, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, px)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return t
}

export default function Globe(_props: { labels?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const gl = cv.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: true, powerPreference: 'low-power' })
    if (!gl) { cv.classList.add('globe-fallback'); return }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)

    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s }
    const pr = gl.createProgram()!
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr)
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.classList.add('globe-fallback'); return }
    gl.useProgram(pr)
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.activeTexture(gl.TEXTURE0); maskTexture(gl)
    gl.uniform1i(gl.getUniformLocation(pr, 'uMask'), 0)
    gl.uniform2f(gl.getUniformLocation(pr, 'uRes'), cv.width, cv.height)
    const sp = new Float32Array(24)
    SPOTS.forEach(([la, lo], i) => { const f = la * Math.PI / 180, l = lo * Math.PI / 180; sp[i * 3] = Math.cos(f) * Math.sin(l); sp[i * 3 + 1] = Math.sin(f); sp[i * 3 + 2] = Math.cos(f) * Math.cos(l) })
    gl.uniform3fv(gl.getUniformLocation(pr, 'uSpots'), sp)
    const uT = gl.getUniformLocation(pr, 'uT'), uRot = gl.getUniformLocation(pr, 'uRot')
    gl.viewport(0, 0, cv.width, cv.height)
    gl.clearColor(0, 0, 0, 0)

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let rot = 2.2, vel = 0, drag = false, lx = 0, raf = 0, visible = true, last = performance.now()
    const render = (t: number) => { gl.uniform1f(uT, t); gl.uniform1f(uRot, rot); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4) }
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible || document.hidden) { last = now; return }
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (!drag) { rot -= (0.14 + vel) * dt; vel *= Math.pow(0.05, dt) }
      render(now / 1000)
    }
    if (reduce) render(0); else raf = requestAnimationFrame(frame)

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(cv)
    const scale = () => cv.getBoundingClientRect().width / W || 1
    const down = (e: PointerEvent) => { drag = true; lx = e.clientX; vel = 0; cv.setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => { if (!drag) return; const dx = (e.clientX - lx) / scale(); lx = e.clientX; rot -= dx * 0.008; vel = dx * 0.5; if (reduce) render(0) }
    const up = () => { drag = false }
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move)
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up)
    const lost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); cv.classList.add('globe-fallback') }
    cv.addEventListener('webglcontextlost', lost)
    return () => {
      cancelAnimationFrame(raf); io.disconnect()
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up)
      cv.removeEventListener('webglcontextlost', lost)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return <canvas ref={ref} className="globe-cv" style={{ width: '100%', aspectRatio: `${W} / ${H}`, touchAction: 'pan-y' }} />
}
