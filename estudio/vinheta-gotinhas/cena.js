// Clube das Gotinhas - vinheta 3D (Three.js), renderizada quadro a quadro.
// window.renderFrame(t) desenha o instante t (segundos) e devolve o quadro em JPEG.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);

// ------------------------------------------------------------------ utilidades
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const easeOutBack = (u, s = 1.9) => { u = clamp(u); return 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); };
const easeInOut = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const bump = (t, c, w) => Math.exp(-((t - c) * (t - c)) / (w * w));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ linha do tempo
const ENTRADAS = [5.5, 6.75, 8.0, 9.25, 10.5, 11.75, 13.0];
const SILABAS = [0, .25, .5, .75, 1.0, 1.25];      // "CLU-BE DAS GO-TI-NHAS"
const GRITOS = [16.0, 18.0];
const T_EXPLOSAO = 20.0;

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);


const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 300);
scene.add(camera);

const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.32, 0.5, 0.95);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// luzes
scene.add(new THREE.HemisphereLight(0xd8fbff, 0x0d4a7a, 1.25));
const key = new THREE.DirectionalLight(0xfff1dc, 2.6); key.position.set(-5, 9, 9); scene.add(key);
const rim = new THREE.DirectionalLight(0x8ff3ff, 3.2); rim.position.set(5, 6, -9); scene.add(rim);
const rim2 = new THREE.DirectionalLight(0xffe9a8, 1.4); rim2.position.set(-7, 3, -6); scene.add(rim2);

// ------------------------------------------------------------------ texturas procedurais
function canvasTex(size, draw, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const texPelo = canvasTex(512, (g, s) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  const r = rng(7);
  for (let i = 0; i < 16000; i++) {
    const x = r() * s, y = r() * s, a = Math.PI / 2 + (r() - .5) * 1.4, l = 3 + r() * 7;
    const v = 70 + r() * 120 | 0;
    g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = .6 + r() * 1.3;
    g.beginPath();
    for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); }
    g.stroke();
  }
}, [7, 4]);
const texSombra = canvasTex(128, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(0,20,50,0.75)'); gr.addColorStop(.55, 'rgba(0,20,50,0.35)'); gr.addColorStop(1, 'rgba(0,20,50,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const texBrilho = canvasTex(128, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const texEstrela = canvasTex(128, (g, s) => {
  const c = s / 2;
  const gr = g.createRadialGradient(c, c, 0, c, c, c * .5);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.fillStyle = 'rgba(255,255,255,.9)';
  for (const [w, h] of [[s, 5], [5, s]]) { g.fillRect(c - w / 2, c - h / 2, w, h); }
});
const texRaio = canvasTex(128, (g, s) => {
  const gx = g.createLinearGradient(0, 0, s, 0);
  gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gx; g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'destination-in';
  const gy = g.createLinearGradient(0, 0, 0, s);
  gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy; g.fillRect(0, 0, s, s);
});

// ------------------------------------------------------------------ ceu / fundo
const ceuMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uT: { value: 0 }, uFundo: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
    varying vec3 vDir; uniform float uT; uniform float uFundo;
    void main(){
      float y = vDir.y;
      vec3 fundo = vec3(0.01,0.07,0.22), meio = vec3(0.02,0.36,0.62), turq = vec3(0.0,0.72,0.78), topo = vec3(0.45,0.95,0.95);
      vec3 c = mix(fundo, meio, smoothstep(-0.6, 0.0, y));
      c = mix(c, turq, smoothstep(0.0, 0.35, y));
      c = mix(c, topo, smoothstep(0.35, 0.95, y));
      // brilho central atras dos personagens
      float g = pow(max(dot(vDir, normalize(vec3(0.,0.18,-1.))),0.), 12.);
      c += vec3(0.45,0.95,0.95) * g * 0.35;
      // causticas suaves
      vec2 p = vDir.xz * 9. + vec2(vDir.y*3.);
      float k = sin(p.x*1.7 + uT*0.9) * sin(p.y*1.3 - uT*0.7) + sin((p.x+p.y)*1.1 + uT*0.5);
      c += vec3(0.25,0.55,0.55) * smoothstep(1.2, 1.9, k) * 0.10 * smoothstep(-0.2,0.5,y);
      c *= mix(1.0, 0.85, uFundo);
      gl_FragColor = vec4(pow(c, vec3(2.2)), 1.); // cores pensadas em sRGB -> linear
    }`
});
const ceu = new THREE.Mesh(new THREE.SphereGeometry(120, 48, 32), ceuMat);
scene.add(ceu);
{ // mapa de ambiente: o proprio ceu + paineis de luz suave (reflexos bonitos e coerentes)
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), ceuMat));
  for (const [x, y, z, w, h, k] of [[-20, 30, 20, 30, 18, 6], [25, 15, -10, 14, 22, 3], [0, -20, 25, 40, 8, 1.2], [-30, 8, -20, 10, 20, 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * .97), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  }
  scene.environment = pmrem.fromScene(env, 0.02).texture;
  scene.environmentIntensity = 0.7;
}

// raios de luz
const raios = [];
for (let i = 0; i < 7; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4 + i % 3, 46), new THREE.MeshBasicMaterial({
    map: texRaio, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xbffcff
  }));
  m.position.set(-14 + i * 4.6, 12, -28 - (i % 2) * 6);
  m.rotation.z = .35 - i * .04;
  scene.add(m); raios.push(m);
}

// bokeh e brilhos (pontos com shader)
function pontos(n, seed, cfg) {
  // billboards instanciados (gl_PointCoord nao funciona bem no SwiftShader)
  const r = rng(seed), pos = new Float32Array(n * 3), fase = new Float32Array(n), tam = new Float32Array(n), cor = new Float32Array(n * 3);
  const paleta = cfg.cores.map(c => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    pos.set([cfg.x[0] + r() * (cfg.x[1] - cfg.x[0]), cfg.y[0] + r() * (cfg.y[1] - cfg.y[0]), cfg.z[0] + r() * (cfg.z[1] - cfg.z[0])], i * 3);
    fase[i] = r() * 6.28; tam[i] = cfg.tam[0] + r() * (cfg.tam[1] - cfg.tam[0]);
    const c = paleta[(r() * paleta.length) | 0]; cor.set([c.r, c.g, c.b], i * 3);
  }
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
  g.setAttribute('centro', new THREE.InstancedBufferAttribute(pos, 3));
  g.setAttribute('fase', new THREE.InstancedBufferAttribute(fase, 1));
  g.setAttribute('tam', new THREE.InstancedBufferAttribute(tam, 1));
  g.setAttribute('cor', new THREE.InstancedBufferAttribute(cor, 3));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uAlpha: { value: cfg.alpha }, uPisca: { value: cfg.pisca }, uSobe: { value: cfg.sobe || 0 } },
    vertexShader: `
      attribute vec3 centro; attribute float fase; attribute float tam; attribute vec3 cor;
      uniform float uT, uPisca, uSobe; varying vec3 vCor; varying float vA; varying vec2 vUv;
      void main(){
        vec3 p = centro; p.y += mod(uT*uSobe + fase*3., 14.) - (uSobe>0. ? 7. : 0.); p.x += sin(uT*.4+fase)*.3;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        float tw = mix(1., .5+.5*sin(uT*3.+fase*7.), uPisca);
        mv.xy += position.xy * tam * .02 * tw * (uPisca > .5 ? 1. : 1.);
        vCor = cor; vA = tw; vUv = uv;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `uniform float uAlpha; uniform float uPisca; varying vec3 vCor; varying float vA; varying vec2 vUv;
      void main(){ vec2 d = vUv - .5; float r = length(d);
        float a;
        if (uPisca > .5) a = (1.-smoothstep(0., .2, r)) + (1.-smoothstep(0., .05, abs(d.x)))*(1.-smoothstep(0.,.5,abs(d.y)))*.7 + (1.-smoothstep(0., .05, abs(d.y)))*(1.-smoothstep(0.,.5,abs(d.x)))*.7;
        else a = (1.-smoothstep(.15, .5, r));
        gl_FragColor = vec4(vCor, clamp(a,0.,1.)*uAlpha*vA); }`
  });
  const p = new THREE.Mesh(g, mat); p.frustumCulled = false; scene.add(p);
  return p;
}
const bokeh = pontos(70, 3, { x: [-40, 40], y: [-6, 22], z: [-60, -25], tam: [60, 180], cores: ['#bffcff', '#7fe8ff', '#fff2a8', '#ffffff'], tex: texBrilho, alpha: .12, pisca: .3, sobe: .25 });
const brilhos = pontos(160, 5, { x: [-16, 16], y: [-1, 12], z: [-14, 6], tam: [5, 13], cores: ['#ffffff', '#fff6b0', '#c8ffff'], tex: texEstrela, alpha: .8, pisca: 1 });

// bolhas (instanciadas, shader fresnel)
const bolhaMat = new THREE.MeshPhysicalMaterial({
  color: 0xe8ffff, roughness: 0, metalness: 0, transparent: true, opacity: .16, depthWrite: false,
  clearcoat: 1, clearcoatRoughness: 0, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 600],
  envMapIntensity: 1.8, specularIntensity: 1,
});
const NB = 110, bolhas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), bolhaMat, NB);
bolhas.frustumCulled = false; scene.add(bolhas);
const bolhaDados = (() => { const r = rng(11); return Array.from({ length: NB }, () => ({ x: -14 + r() * 28, z: -12 + r() * 16, y0: r() * 16, v: .5 + r() * .9, s: .04 + Math.pow(r(), 2.5) * .3, f: r() * 6.28 })); })();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function atualizaBolhas(t) {
  bolhaDados.forEach((b, i) => {
    const y = -2 + ((b.y0 + t * b.v) % 16);
    _p.set(b.x + Math.sin(t * 1.3 + b.f) * .25, y, b.z);
    const w = 1 + .08 * Math.sin(t * 6 + b.f);
    _s.set(b.s * w, b.s / w, b.s * w);
    bolhas.setMatrixAt(i, _m.compose(_p, _q.identity(), _s));
  });
  bolhas.instanceMatrix.needsUpdate = true;
}

// ------------------------------------------------------------------ respingos (particulas balisticas)
const aguaMat = new THREE.MeshPhysicalMaterial({ color: 0xbff6ff, roughness: .04, metalness: 0, clearcoat: 1, transparent: true, opacity: .62, emissive: 0x2fb8d0, emissiveIntensity: .08, envMapIntensity: 1.8, iridescence: .4 });
const gotaGeo = new THREE.SphereGeometry(1, 16, 12);
class Respingo {
  constructor({ origem, t0, n = 60, vel = [2, 5], subida = [3, 7], raio = .1, tam = [.05, .14], vida = 1.6, g = 9.8, chao = -50, seed = 1, cone = 1 }) {
    Object.assign(this, { origem, t0, vida, g, chao });
    const r = rng(seed);
    this.p = Array.from({ length: n }, () => {
      const a = r() * 6.283, v = vel[0] + r() * (vel[1] - vel[0]), u = subida[0] + r() * (subida[1] - subida[0]);
      return { dx: Math.cos(a) * raio, dz: Math.sin(a) * raio, vx: Math.cos(a) * v * cone, vz: Math.sin(a) * v * cone, vy: u, s: tam[0] + r() * (tam[1] - tam[0]), atraso: r() * .12 };
    });
    this.mesh = new THREE.InstancedMesh(gotaGeo, aguaMat, n); this.mesh.frustumCulled = false; scene.add(this.mesh);
  }
  update(t) {
    this.p.forEach((q, i) => {
      const dt = t - this.t0 - q.atraso;
      let s = 0;
      if (dt > 0 && dt < this.vida) {
        const y = this.origem.y + q.vy * dt - .5 * this.g * dt * dt;
        if (y > this.chao) {
          _p.set(this.origem.x + q.dx + q.vx * dt, y, this.origem.z + q.dz + q.vz * dt);
          s = q.s * (1 - Math.pow(dt / this.vida, 3));
          const vy = q.vy - this.g * dt, sp = Math.hypot(q.vx, vy, q.vz);
          const est = 1 + Math.min(sp * .07, .9);
          _q.setFromUnitVectors(V(0, 1, 0), V(q.vx, vy, q.vz).normalize());
          _s.set(s, s * est, s);
        }
      }
      if (!s) { _p.set(0, -999, 0); _s.set(0, 0, 0); }
      this.mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      _q.identity();
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
const ondaMat = () => new THREE.MeshBasicMaterial({ color: 0xe8ffff, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false });
class Onda {
  constructor(origem, t0, raioMax = 3, vida = 1.4, espessura = .06) {
    Object.assign(this, { t0, raioMax, vida });
    this.mesh = new THREE.Mesh(new THREE.TorusGeometry(1, espessura, 8, 64), ondaMat());
    this.mesh.rotation.x = Math.PI / 2; this.mesh.position.copy(origem); scene.add(this.mesh);
  }
  update(t) {
    const u = (t - this.t0) / this.vida;
    this.mesh.visible = u > 0 && u < 1;
    if (!this.mesh.visible) return;
    const r = .2 + this.raioMax * (1 - Math.pow(1 - u, 2.4));
    this.mesh.scale.set(r, r, 1 + 2 * (1 - u));
    this.mesh.material.opacity = .85 * Math.pow(1 - u, 1.5);
  }
}
const efeitos = [];

// ------------------------------------------------------------------ CENA 1: gota caindo na agua
const cena1 = new THREE.Group(); scene.add(cena1);
const aguaSup = new THREE.Mesh(new THREE.CircleGeometry(60, 96), new THREE.MeshPhysicalMaterial({
  color: 0x0f8fb0, roughness: .08, metalness: .1, clearcoat: 1, clearcoatRoughness: .05, transparent: true, opacity: .92, envMapIntensity: 1.3
}));
aguaSup.rotation.x = -Math.PI / 2; cena1.add(aguaSup);

// geometria de gota (perfil em torno do eixo Y)
function geoGota({ sx = 1.45, sy = 1.15, m = 1.0, dobra = .26, seg = 72, lat = 64 } = {}) {
  const pts = [];
  for (let i = 0; i <= lat; i++) {
    const phi = Math.PI * (1 - i / lat);
    const x = Math.sin(phi) * Math.pow(Math.sin(phi / 2), m) * sx;
    pts.push(new THREE.Vector2(Math.max(x, 1e-4), Math.cos(phi) * sy));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > .3) p.setX(i, p.getX(i) + dobra * Math.pow((y - .3) / (sy - .3), 2.2));
  }
  g.computeVertexNormals();
  g.userData.raio = y => { // raio do perfil na altura y
    let best = 0;
    for (let i = 0; i < pts.length - 1; i++) if (pts[i].y <= y && pts[i + 1].y >= y) { const u = (y - pts[i].y) / (pts[i + 1].y - pts[i].y); best = lerp(pts[i].x, pts[i + 1].x, u); }
    return best;
  };
  g.userData.sy = sy;
  return g;
}
const gotaQueda = new THREE.Mesh(geoGota({ sx: 1.2, sy: 1.25, m: 1.25, dobra: 0 }), new THREE.MeshPhysicalMaterial({
  color: 0xc8f7ff, roughness: .02, clearcoat: 1, transparent: true, opacity: .78, emissive: 0x3ac6e0, emissiveIntensity: .35, iridescence: .6, envMapIntensity: 2
}));
gotaQueda.scale.setScalar(.32); cena1.add(gotaQueda);
const jato = new THREE.Mesh(new THREE.CylinderGeometry(.06, .16, 1, 20, 1, true), aguaMat);
cena1.add(jato);
const jatoGota = new THREE.Mesh(gotaGeo, aguaMat); cena1.add(jatoGota);
const coroa = new THREE.Mesh(new THREE.CylinderGeometry(1, .8, 1, 48, 1, true), new THREE.MeshPhysicalMaterial({
  color: 0xc8f7ff, roughness: .05, clearcoat: 1, transparent: true, opacity: .55, side: THREE.DoubleSide, emissive: 0x2fb8d0, emissiveIntensity: .3
}));
cena1.add(coroa);
const splash1 = new Respingo({ origem: V(0, .02, 0), t0: 3.0, n: 90, vel: [1.4, 3.4], subida: [2.2, 4.8], raio: .35, tam: [.025, .075], vida: 1.5, g: 6.5, chao: 0, seed: 21 });
const splash1b = new Respingo({ origem: V(0, .02, 0), t0: 3.05, n: 40, vel: [.4, 1.2], subida: [3.5, 6], raio: .15, tam: [.02, .05], vida: 1.8, g: 6.5, chao: 0, seed: 22 });
cena1.add(splash1.mesh, splash1b.mesh);
const ondas1 = [0, .25, .55, .9].map((d, i) => { const o = new Onda(V(0, .01, 0), 3.0 + d, 2.2 + i * 1.3, 1.6, .035); cena1.add(o.mesh); return o; });
efeitos.push(splash1, splash1b, ...ondas1);

function atualizaCena1(t) {
  // gota em camera lenta
  const u = clamp((t - .4) / 2.6);
  const y = lerp(5.2, .25, u * u * (1.2 - .2 * u));
  gotaQueda.visible = t < 3.0;
  gotaQueda.position.set(0, y, 0);
  gotaQueda.rotation.y = t * .6;
  const est = 1 + .06 * Math.sin(t * 9);
  gotaQueda.scale.set(.3 / Math.sqrt(est), .3 * est, .3 / Math.sqrt(est));
  // coroa
  const c = (t - 3.0) / .9;
  coroa.visible = c > 0 && c < 1;
  if (coroa.visible) {
    const r = .25 + .75 * Math.sqrt(c), h = .9 * Math.sin(Math.PI * Math.min(c * 1.2, 1));
    coroa.scale.set(r, Math.max(h, .01), r); coroa.position.y = h / 2; coroa.material.opacity = .55 * (1 - c);
  }
  // jato central (Worthington)
  const j = (t - 3.25) / .9;
  jato.visible = j > 0 && j < 1;
  const hj = 1.7 * Math.sin(Math.PI * clamp(j));
  jato.scale.set(1, Math.max(hj, .01), 1); jato.position.y = hj / 2;
  jatoGota.visible = t > 3.35 && t < 4.9;
  const jg = t - 3.35, yj = .2 + 4.6 * jg - 4.2 * jg * jg;
  jatoGota.position.set(0, Math.max(yj, -1), 0); jatoGota.scale.set(.13, .17, .13);
}

// ------------------------------------------------------------------ CENA 2+: palco
const palco = new THREE.Group(); scene.add(palco);
const palcoTopo = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.2, .7, 96), [
  new THREE.MeshPhysicalMaterial({ color: 0x0b4f9e, roughness: .4, clearcoat: .6 }),
  new THREE.MeshPhysicalMaterial({ color: 0x12a9c2, roughness: .1, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.1 }),
  new THREE.MeshPhysicalMaterial({ color: 0x0b4f9e }),
]);
palcoTopo.position.y = -.35; palco.add(palcoTopo);
const borda = new THREE.Mesh(new THREE.TorusGeometry(7.45, .2, 20, 128), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .7, sheen: 1, sheenColor: 0xbffcff, bumpMap: texPelo, bumpScale: 2 }));
borda.rotation.x = Math.PI / 2; palco.add(borda);
// bolhas gigantes decorativas
const bolhasGrandes = [[-11, 5, -14, 2.6], [12, 7, -18, 3.4], [-6, 9.5, -22, 2], [7, 2.2, -10, 1.3], [-9.5, 1.4, -6, .9]].map(([x, y, z, s]) => {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 40, 28), bolhaMat, 1);
  mesh.setMatrixAt(0, new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion(), V(s, s, s)));
  mesh.userData = { x, y, z, s }; palco.add(mesh); return mesh;
});
// fontes de agua nas laterais
const fontes = [-1, 1].map((lado, k) => {
  const arr = [];
  for (let n = 0; n < 9; n++) {
    const sp = new Respingo({ origem: V(lado * 6.4, 0, -3.2), t0: 4 + n * .55, n: 26, vel: [.3, .8], subida: [5.5, 6.8], raio: .1, tam: [.05, .1], vida: 2.2, g: 9.8, chao: 0, seed: 100 + n + k * 20, cone: 1 });
    palco.add(sp.mesh); arr.push(sp);
  }
  return arr;
});
function atualizaFontes(t) {
  fontes.forEach(arr => arr.forEach((sp, n) => {
    const per = 9 * .55, base = 4 + n * .55;
    sp.t0 = base + Math.floor((t - base) / per) * per;
    sp.update(t);
  }));
}

// ------------------------------------------------------------------ PERSONAGENS
const geoCorpo = geoGota();
const RAIO = geoCorpo.userData.raio, SY = geoCorpo.userData.sy;
const ESCALA = .78;

const CONFIG = [
  { nome: 'transparente', cor: '#dff4ff', sheen: '#ffffff', iris: '#2f7fd6', bochecha: '#ff9fb3', vidro: true, sobr: [.18, .18], incl: [.12, -.12] },
  { nome: 'amarelo-claro', cor: '#fff0a0', sheen: '#fffbe0', iris: '#6a4320', bochecha: '#ff9a8a', sobr: [.2, .2], incl: [-.28, .28] },
  { nome: 'amarela', cor: '#ffc81a', sheen: '#fff2a0', iris: '#5a3410', bochecha: '#ff8a5c', sobr: [.24, .24], incl: [.1, -.1] },
  { nome: 'laranja', cor: '#ff8417', sheen: '#ffd0a0', iris: '#4a2a10', bochecha: '#ff5f4a', sobr: [.26, .14], incl: [.18, .02] },
  { nome: 'castanha', cor: '#8c4a22', sheen: '#e0a070', iris: '#2a1608', bochecha: '#d0604a', sobr: [.12, .12], incl: [-.05, .05], palpebra: .78 },
  { nome: 'esverdeada', cor: '#a2c64a', sheen: '#eaffb0', iris: '#2f3a10', bochecha: '#ff8f70', sobr: [.24, .12], incl: [.25, .18] },
  { nome: 'vermelha', cor: '#de2b2b', sheen: '#ffb0a0', iris: '#3a0c0c', bochecha: '#ff6a6a', sobr: [.12, .12], incl: [-.3, .3] },
];

const matBranco = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .85, sheen: 1, sheenRoughness: .4, sheenColor: 0xffffff, bumpMap: texPelo, bumpScale: 1.4 });
const matOlho = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .25, clearcoat: 1, clearcoatRoughness: .05 });
const matPupila = new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: .2, clearcoat: 1 });
const matReflexo = new THREE.MeshBasicMaterial({ color: 0xffffff });
const matBoca = new THREE.MeshStandardMaterial({ color: 0x4a0f1e, roughness: .6 });
const matLingua = new THREE.MeshStandardMaterial({ color: 0xff6a7a, roughness: .5 });
const matDente = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .4 });

function pontoSuperficie(x, y, recuo = 0) {
  const r = RAIO(y);
  const z = Math.sqrt(Math.max(r * r - x * x, 0));
  const n = V(x / r, 0, z / r).normalize();
  return { p: V(x, y, z - recuo), n };
}

class Gotinha {
  constructor(cfg, i) {
    this.cfg = cfg; this.i = i;
    this.raiz = new THREE.Group();
    this.corpo = new THREE.Group();   // pivo na base (squash)
    this.raiz.add(this.corpo);
    const cor = new THREE.Color(cfg.cor);
    const mat = new THREE.MeshPhysicalMaterial({
      color: cor, roughness: .9, sheen: 1, sheenRoughness: .38, sheenColor: new THREE.Color(cfg.sheen),
      bumpMap: texPelo, bumpScale: 1.6, envMapIntensity: .9,
    });
    if (cfg.vidro) Object.assign(mat, { transparent: true, opacity: .8, roughness: .45, clearcoat: .8, iridescence: .7, iridescenceIOR: 1.4, emissive: new THREE.Color('#9fe6ff'), emissiveIntensity: .12 });
    this.mat = mat;
    const malha = new THREE.Mesh(geoCorpo, mat);
    malha.position.y = SY;
    this.corpo.add(malha);
    this.malha = malha;
    if (cfg.vidro) { // brilhinhos internos
      const brilho = new THREE.Mesh(new THREE.SphereGeometry(.45, 24, 16), new THREE.MeshBasicMaterial({ color: 0xcff6ff, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false }));
      brilho.position.set(-.25, -.2, .1); malha.add(brilho);
    }

    // olhos
    this.olhos = [];
    for (const lado of [-1, 1]) {
      const { p, n } = pontoSuperficie(lado * .34, .16, .06);
      const g = new THREE.Group(); g.position.copy(p); g.lookAt(p.clone().add(n.clone().add(V(0, .05, .9)).normalize()));
      const esc = new THREE.Mesh(new THREE.SphereGeometry(.27, 32, 24), matOlho); esc.scale.set(1, 1.18, .55); g.add(esc);
      const irisG = new THREE.Group(); irisG.position.z = .1; g.add(irisG);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(.17, 28, 20), new THREE.MeshPhysicalMaterial({ color: cfg.iris, roughness: .25, clearcoat: 1 }));
      iris.scale.set(1, 1.12, .42); irisG.add(iris);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(.105, 24, 16), matPupila); pup.scale.set(1, 1.1, .4); pup.position.z = .055; irisG.add(pup);
      const r1 = new THREE.Mesh(new THREE.SphereGeometry(.046, 12, 8), matReflexo); r1.position.set(-.06, .08, .08); irisG.add(r1);
      const r2 = new THREE.Mesh(new THREE.SphereGeometry(.026, 10, 6), matReflexo); r2.position.set(.065, -.05, .075); irisG.add(r2);
      // palpebra (cor do corpo) que desce para piscar
      const palp = new THREE.Mesh(new THREE.SphereGeometry(.285, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      palp.scale.set(1.04, 1.21, .85); g.add(palp);
      // sobrancelha
      const sob = new THREE.Mesh(new THREE.CapsuleGeometry(.035, .17, 6, 12), new THREE.MeshStandardMaterial({ color: cor.clone().multiplyScalar(cfg.vidro ? .55 : .45), roughness: .8 }));
      sob.rotation.z = Math.PI / 2; g.add(sob);
      this.corpo.children[0].add(g);
      this.olhos.push({ g, irisG, palp, sob, lado });
    }
    // bochechas
    for (const lado of [-1, 1]) {
      const { p, n } = pontoSuperficie(lado * .6, -.18, .03);
      const b = new THREE.Mesh(new THREE.CircleGeometry(.13, 24), new THREE.MeshBasicMaterial({ color: cfg.bochecha, transparent: true, opacity: .55, depthWrite: false }));
      b.position.copy(p); b.lookAt(p.clone().add(n)); b.scale.set(1.3, .8, 1); b.position.addScaledVector(n, .035);
      malha.add(b);
    }
    // boca
    const { p: pb, n: nb } = pontoSuperficie(0, -.3, .02);
    this.boca = new THREE.Group(); this.boca.position.copy(pb); this.boca.lookAt(pb.clone().add(nb.add(V(0, -.15, 0)))); malha.add(this.boca);
    const sorriso = new THREE.Mesh(new THREE.TorusGeometry(.16, .034, 12, 32, Math.PI), matBoca); sorriso.rotation.z = Math.PI; sorriso.position.y = .06; sorriso.scale.set(1.05, .62, 1); this.boca.add(sorriso);
    this.sorriso = sorriso;
    const aberta = new THREE.Group(); this.boca.add(aberta); this.aberta = aberta;
    const cav = new THREE.Mesh(new THREE.SphereGeometry(.17, 28, 18, 0, Math.PI * 2, Math.PI / 2 - .2, Math.PI / 2 + .2), matBoca); cav.scale.set(1, 1, .35); cav.rotation.x = 0; aberta.add(cav);
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .01, 28, 1, false, 0, Math.PI), matBoca); tampa.rotation.set(Math.PI / 2, 0, Math.PI / 2); tampa.scale.z = .35; // borda reta superior
    const lingua = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), matLingua); lingua.scale.set(1.2, .6, .5); lingua.position.set(0, -.11, .03); aberta.add(lingua);
    const dentes = new THREE.Mesh(new THREE.BoxGeometry(.16, .035, .03), matDente); dentes.position.set(0, -.015, .045); aberta.add(dentes);
    this.cav = cav;

    // bracos (cor do corpo) + maos brancas
    this.bracos = [];
    for (const lado of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(lado * .97, -.16, .05); malha.add(piv);
      const br = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .32, 8, 16), mat); br.position.y = -.22; piv.add(br);
      const mao = new THREE.Group(); mao.position.y = -.5; piv.add(mao);
      const palma = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 18), matBranco); palma.scale.set(1, 1.05, .8); mao.add(palma);
      const polegar = new THREE.Mesh(new THREE.SphereGeometry(.075, 16, 12), matBranco); polegar.position.set(-lado * .13, .06, .08); mao.add(polegar);
      const punho = new THREE.Mesh(new THREE.TorusGeometry(.13, .045, 10, 24), matBranco); punho.rotation.x = Math.PI / 2; punho.position.y = .13; mao.add(punho);
      this.bracos.push({ piv, lado });
    }
    // sombra de contato
    this.sombra = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false }));
    this.sombra.rotation.x = -Math.PI / 2; this.sombra.position.y = .012;
    palco.add(this.sombra);
    this.raiz.scale.setScalar(ESCALA);
    palco.add(this.raiz);
  }

  aplica(e) {
    this.raiz.visible = e.visivel; this.sombra.visible = e.visivel;
    if (!e.visivel) return;
    this.raiz.position.set(e.x, e.y, e.z);
    this.raiz.rotation.y = e.yaw;
    this.raiz.scale.setScalar(ESCALA * e.escala);
    this.corpo.scale.set(e.sx, e.sy, e.sx);
    this.corpo.rotation.z = e.incl; this.corpo.rotation.x = e.inclX || 0;
    const alt = Math.max(e.y, 0);
    this.sombra.position.set(e.x, .012, e.z);
    const ss = ESCALA * e.escala * (1.15 - Math.min(alt * .12, .5)) * e.sx;
    this.sombra.scale.set(ss, ss, ss);
    this.sombra.material.opacity = clamp(1 - alt * .25, .25, 1);
    // olhos
    const pal = this.cfg.palpebra || 1;
    this.olhos.forEach((o, k) => {
      const pisc = k === 0 ? e.piscaE : e.piscaD;
      const fech = clamp(Math.max(pisc, 1 - pal * (1 + .25 * e.alegria)));
      o.palp.rotation.x = lerp(-1.57, 1.57, fech); // palpebra fecha de cima para baixo
      o.palp.visible = fech > .02;
      o.irisG.position.x = e.olharX * .065; o.irisG.position.y = e.olharY * .07;
      const [sy, ] = this.cfg.sobr, incl = this.cfg.incl[k];
      o.sob.position.set(0, .34 + (k === 0 ? this.cfg.sobr[0] : this.cfg.sobr[1]) * .25 + e.sobeSobr * .08, .11);
      o.sob.rotation.z = Math.PI / 2 + (o.lado < 0 ? incl : -incl) * (1 - .5 * e.sobeSobr);
    });
    // boca
    const ab = clamp(e.boca, 0, 1.3);
    this.sorriso.visible = ab < .2;
    this.aberta.visible = ab >= .2;
    this.aberta.scale.set(1.05 + ab * .15, .3 + ab * .8, 1);
    // bracos
    this.bracos.forEach((b, k) => {
      const a = k === 0 ? e.bracoE : e.bracoD;
      b.piv.rotation.set(a.x || 0, 0, b.lado * a.z);
    });
  }
}
const gotinhas = CONFIG.map((c, i) => new Gotinha(c, i));

// posicoes por fase
const SLOT2 = [[-5.2, .2], [-3.45, -.5], [-1.7, .35], [0, -.45], [1.7, .35], [3.45, -.5], [5.2, .2]];
const SLOT3 = [-3, -2, -1, 0, 1, 2, 3].map(k => [k * 1.62, .7 - .09 * k * k]);
const SLOT4 = [[-5.0, 1.3], [-3.6, .5], [-2.05, 1.6], [0, 2.3], [2.05, 1.6], [3.6, .5], [5.0, 1.3]];

function salto(u, h) { return 4 * h * u * (1 - u); }
function squash(dt) { if (dt < 0 || dt > 1.2) return 0; return Math.exp(-dt * 6) * Math.cos(dt * 19) * .2; }
function fala(t, seed, gate = 1) {
  const g = sstep(.1, .45, Math.sin(t * 1.3 + seed * 2.1) * .5 + .5 + .1 * Math.sin(t * 3.1 + seed));
  return gate * g * (.15 + .75 * Math.abs(Math.sin(t * (9 + seed) + seed * 4) * Math.sin(t * 4.3 + seed)));
}
function piscada(t, i) {
  const per = 2.4 + .41 * i, off = i * .73;
  const u = ((t + off) % per);
  return u < .16 ? Math.sin(Math.PI * u / .16) : 0;
}
const REPOUSO = { z: .5, x: -.1 };
const acenar = (t, f = 2.6, fase = 0) => ({ z: 2.45 + .32 * Math.sin(t * f * 6.283 + fase), x: -.25 });
const bracoCima = (t, fase = 0) => ({ z: 2.75 + .12 * Math.sin(t * 9 + fase), x: -.15 });
const bater = (t) => ({ z: -.15 + .32 * Math.abs(Math.sin(t * Math.PI * 3.2)), x: -1.25 });
const timido = { z: -.35, x: -.55 };
const apontar = { z: 1.45, x: -1.05 };
const mix = (a, b, u) => ({ z: lerp(a.z, b.z, u), x: lerp(a.x || 0, b.x || 0, u) });
function gesto(t, ini, fim, alvo, base = REPOUSO) { const u = sstep(ini, ini + .22, t) * (1 - sstep(fim - .22, fim, t)); return mix(base, typeof alvo === 'function' ? alvo(t) : alvo, u); }

function estado(i, t, cam) {
  const te = ENTRADAS[i];
  const e = { visivel: t >= te, x: 0, y: 0, z: 0, yaw: 0, escala: 1, sx: 1, sy: 1, incl: 0, boca: 0, piscaE: 0, piscaD: 0, olharX: 0, olharY: 0, sobeSobr: 0, alegria: 0, bracoE: { ...REPOUSO }, bracoD: { ...REPOUSO } };
  if (!e.visivel) return e;
  const u = t - te;
  const [x2, z2] = SLOT2[i], [x3, z3] = SLOT3[i], [x4, z4] = SLOT4[i];
  let x = x2, z = z2, y = 0, pousos = [];
  let escala = 1;
  // ---- entrada
  const tipos = ['respingo', 'cai', 'saltoE', 'saltoD', 'respingo', 'pulinhos', 'caiGiro'];
  const tipo = tipos[i];
  let incl = 0, inclX = 0, giro = 0;
  if (tipo === 'respingo') {
    const k = clamp(u / .55);
    y = lerp(-2.6, 0, easeOutBack(k, 1.4)) + salto(clamp((u - .1) / .5), .9) * (u < .6 ? 1 : 0);
    escala = lerp(.4, 1, easeOutBack(clamp(u / .45)));
    pousos.push(te + .6);
  } else if (tipo === 'cai' || tipo === 'caiGiro') {
    const d = tipo === 'cai' ? .5 : .55;
    const k = clamp(u / d);
    y = lerp(tipo === 'cai' ? 7 : 9, 0, k * k);
    if (tipo === 'caiGiro') giro = (1 - easeInOut(k)) * Math.PI * 4;
    pousos.push(te + d);
  } else if (tipo === 'saltoE' || tipo === 'saltoD') {
    const de = tipo === 'saltoE' ? -10 : 10, d = .75, k = clamp(u / d);
    x = lerp(x2 + de, x2, k); y = salto(k, 2.6);
    giro = tipo === 'saltoE' ? (1 - k) * -Math.PI * 2 * 0 : 0;
    incl = (1 - k) * (tipo === 'saltoE' ? -.5 : .5) * (k < 1 ? 1 : 0);
    pousos.push(te + d);
  } else if (tipo === 'pulinhos') {
    const d = 1.05, k = clamp(u / d), n = 3;
    x = lerp(x2 - 7.5, x2, k);
    const ph = (k * n) % 1;
    y = k < 1 ? salto(ph, .8) : 0;
    for (let j = 1; j <= n; j++) pousos.push(te + d * j / n);
  }
  // ---- reuniao (14-15) e explosao (20-20.8)
  if (t >= 14.0) {
    const k = clamp((t - 14.0 - i * .05) / .8);
    x = lerp(x2, x3, easeInOut(k)); z = lerp(z2, z3, easeInOut(k)); y = salto(k, .55);
    pousos.push(14.85 + i * .05);
  }
  if (t >= 15.0) {
    for (const g of GRITOS) { const k = (t - g + .05) / .45; if (k > 0 && k < 1) y = salto(k, .55); pousos.push(g + .4); }
  }
  if (t >= T_EXPLOSAO) {
    const k = clamp((t - T_EXPLOSAO - .15 - Math.abs(i - 3) * .06) / .75);
    x = lerp(x3, x4, easeInOut(k)); z = lerp(z3, z4, easeInOut(k)); y = salto(k, 1.1);
    pousos.push(T_EXPLOSAO + .9 + Math.abs(i - 3) * .06);
  }
  // ---- squash
  let sq = 0; for (const p of pousos) sq += squash(t - p);
  if (y > .05) sq -= .08 * Math.min(y, 1); // estica no ar
  e.sy = 1 - sq + .018 * Math.sin(t * 3.2 + i); e.sx = 1 + sq * .55 - .009 * Math.sin(t * 3.2 + i);
  e.x = x; e.y = y; e.z = z; e.escala = escala;
  // ---- olhar / direcao
  const paraCam = Math.atan2(cam.x - x, cam.z - z);
  let alvoYaw = paraCam * .85;
  let olharX = 0, olharY = 0;
  if (t < 14) { // olha para quem acabou de chegar
    const ult = ENTRADAS.reduce((a, tt, j) => (t >= tt + .2 && j !== i ? j : a), -1);
    if (ult >= 0 && ult > i) {
      const w = bump(t, ENTRADAS[ult] + .9, .55);
      const dx = SLOT2[ult][0] - x;
      alvoYaw = lerp(alvoYaw, Math.sign(dx) * .75, w * .7);
      olharX = Math.sign(dx) * w;
    }
  }
  if (t > T_EXPLOSAO + .8 && t < T_EXPLOSAO + 2.4) { // olham para o titulo
    const w = sstep(T_EXPLOSAO + .8, T_EXPLOSAO + 1.1, t) * (1 - sstep(T_EXPLOSAO + 2.0, T_EXPLOSAO + 2.4, t));
    olharY = w; olharX = -x / 6 * w; e.sobeSobr = w;
  }
  e.yaw = alvoYaw + giro + .08 * Math.sin(t * 1.1 + i * 2);
  e.olharX = olharX; e.olharY = olharY;
  e.incl = incl + .055 * Math.sin(t * 2.1 + i * 1.7);
  e.piscaE = piscada(t, i); e.piscaD = e.piscaE;
  // ---- gestos e fala por fase
  let bE = { ...REPOUSO }, bD = { ...REPOUSO }, boca = 0, alegria = 0;
  if (t < 14) {
    boca = fala(t, i * 1.7, .8) * (u > .5 ? 1 : 0);
    const G = [
      () => { bD = gesto(t, te + .55, te + 2.4, tt => acenar(tt)); boca = Math.max(boca, u > .7 && u < 2 ? fala(t, 3.1) + .2 : 0); },
      () => { bE = gesto(t, te + .55, te + 1.5, timido); bD = gesto(t, te + .55, te + 1.5, timido); bE = gesto(t, te + 1.5, te + 2.6, tt => acenar(tt, 2.2), bE); alegria = .3; },
      () => { bE = gesto(t, te + .7, te + 1.9, tt => bracoCima(tt)); bD = gesto(t, te + .7, te + 1.9, tt => bracoCima(tt, 1)); boca = u > .7 && u < 1.9 ? .55 + .35 * Math.abs(Math.sin(t * 8)) : boca; },
      () => { bD = gesto(t, te + .75, te + 1.9, apontar); if (u > .9 && u < 1.4) e.piscaE = 1; boca = u > .8 && u < 1.9 ? fala(t, 5.5) + .15 : boca; },
      () => { bE = gesto(t, te + .5, te + 1.9, tt => acenar(tt, 2.4, 1)); boca = u > .6 && u < 1.9 ? fala(t, 7.7) + .15 : boca; },
      () => { bE = gesto(t, te + 1.05, te + 2.1, bater); bD = gesto(t, te + 1.05, te + 2.1, bater); boca = u > 1.0 && u < 2.1 ? fala(t, 9.9) + .2 : boca; },
      () => { bE = gesto(t, te + .55, te + 1.5, tt => bracoCima(tt)); bD = gesto(t, te + .55, te + 1.5, tt => bracoCima(tt, 2)); bD = gesto(t, te + 1.5, te + 2.4, tt => acenar(tt), bD); boca = u > .55 && u < 1.6 ? .7 + .3 * Math.abs(Math.sin(t * 7)) : boca; },
    ];
    G[i]();
    // quem ja esta no palco acena de leve para os novos
    if (u > 2.6) { const w = bump(t, ENTRADAS.find(tt => tt > t - .9 && tt < t + .3) ?? -9, .5); if (w > .05 && i % 2 === 0) bE = mix(bE, acenar(t, 2.4, i), w); }
  } else if (t < T_EXPLOSAO) {
    const cima = sstep(15.3, 15.7, t);
    bE = mix(REPOUSO, bracoCima(t, i), cima); bD = mix(REPOUSO, bracoCima(t, i + 1), cima);
    if (t < 15.3) boca = fala(t, i * 2.3, .7);
    else boca = .25;
    for (const g of GRITOS) for (const s of SILABAS) boca = Math.max(boca, 1.15 * bump(t, g + s + .05, .085));
    if (t > 19.4) boca = .3;
    alegria = .4; e.incl += .1 * Math.sin((t - 15) * Math.PI * 2);
  } else {
    const k = t - T_EXPLOSAO;
    boca = k < 1.2 ? .9 : (.18 + fala(t, i * 3.3, .7));
    const m = i % 3;
    if (m === 0) { bD = gesto(t, T_EXPLOSAO + .9, 99, tt => acenar(tt, 2.2, i)); bE = gesto(t, T_EXPLOSAO + .9, 99, tt => bracoCima(tt, i)); }
    else if (m === 1) { bE = gesto(t, T_EXPLOSAO + .9, 99, tt => acenar(tt, 2.5, i)); }
    else { bE = gesto(t, T_EXPLOSAO + .9, 99, tt => acenar(tt, 2.0, i)); bD = gesto(t, T_EXPLOSAO + .9, 99, tt => acenar(tt, 2.0, i + 2)); }
    if (k < .9) { bE = bracoCima(t, i); bD = bracoCima(t, i + 1); }
    alegria = .5;
    if (t > 27) boca = .2 + fala(t, i * 4.1, .6) * .8;
  }
  e.bracoE = bE; e.bracoD = bD; e.boca = boca; e.alegria = alegria;
  return e;
}

// respingos das entradas e da explosao
[0, 4].forEach(i => {
  const [x, z] = SLOT2[i];
  const sp = new Respingo({ origem: V(x, 0, z), t0: ENTRADAS[i], n: 50, vel: [1, 2.6], subida: [2.5, 5], raio: .4, tam: [.05, .12], vida: 1.2, g: 9, chao: 0, seed: 40 + i });
  palco.add(sp.mesh); efeitos.push(sp);
  const o = new Onda(V(x, .02, z), ENTRADAS[i], 2.2, 1.2); palco.add(o.mesh); efeitos.push(o);
});
[1, 2, 3, 5, 6].forEach(i => { // ondinhas ao pousar
  const pous = { 1: .5, 2: .75, 3: .75, 5: 1.05, 6: .55 }[i];
  const [x, z] = SLOT2[i];
  const o = new Onda(V(x, .02, z), ENTRADAS[i] + pous, 1.8, 1.0, .05); palco.add(o.mesh); efeitos.push(o);
  const sp = new Respingo({ origem: V(x, 0, z), t0: ENTRADAS[i] + pous, n: 24, vel: [1.2, 2.4], subida: [1.2, 2.6], raio: .55, tam: [.04, .08], vida: .8, g: 9, chao: 0, seed: 60 + i });
  palco.add(sp.mesh); efeitos.push(sp);
});
const geiser = [
  new Respingo({ origem: V(0, 0, -3.2), t0: T_EXPLOSAO, n: 220, vel: [1.5, 5.5], subida: [7, 13], raio: .6, tam: [.07, .2], vida: 2.6, g: 8, chao: 0, seed: 80 }),
  new Respingo({ origem: V(0, 0, -3.2), t0: T_EXPLOSAO + .05, n: 120, vel: [4, 8], subida: [3, 6], raio: 1, tam: [.05, .14], vida: 1.8, g: 8, chao: 0, seed: 81 }),
];
geiser.forEach(g => { palco.add(g.mesh); efeitos.push(g); });
[0, .2, .45].forEach((d, k) => { const o = new Onda(V(0, .03, -3.2), T_EXPLOSAO + d, 6 + k * 2, 1.8, .09); palco.add(o.mesh); efeitos.push(o); });
const flashExp = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texBrilho, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xd8ffff }));
flashExp.position.set(0, 3, -4); palco.add(flashExp);
// confete de bolhas e gotinhas coloridas na celebracao
const confete = new Respingo({ origem: V(0, 0, -3.2), t0: T_EXPLOSAO + .1, n: 90, vel: [2, 6], subida: [8, 12], raio: .5, tam: [.05, .09], vida: 7, g: 2.2, chao: -1, seed: 90 });
confete.mesh.material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .3, clearcoat: 1, emissive: 0xffe680, emissiveIntensity: .6 });
palco.add(confete.mesh); efeitos.push(confete);

// ------------------------------------------------------------------ TITULO 3D
const titulo = new THREE.Group(); palco.add(titulo);
const letras = [];
async function montaTitulo() {
  const json = await new Promise((ok, err) => new TTFLoader().load('./Montserrat-ExtraBold.ttf', ok, undefined, err));
  const fonte = new Font(json);
  const res = json.resolution;
  const linha = (texto, tam, prof, y, z, matFrente, matLado, t0, passo) => {
    const esc = tam / res;
    const itens = [];
    let cursor = 0;
    for (const ch of texto) {
      const gl = json.glyphs[ch];
      const av = (gl ? gl.ha : res * .3) * esc;
      if (ch !== ' ') {
        const geo = new TextGeometry(ch, { font: fonte, size: tam, depth: prof, curveSegments: 7, bevelEnabled: true, bevelThickness: prof * .28, bevelSize: tam * .035, bevelSegments: 4 });
        geo.computeBoundingBox();
        const bb = geo.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
        geo.translate(-cx, -cy, -prof / 2);
        const mf = matFrente.clone();
        const m = new THREE.Mesh(geo, [mf, matLado]);
        itens.push({ m, x: cursor + cx, cy, mf });
      }
      cursor += av;
    }
    itens.forEach((it, k) => {
      it.m.position.set(it.x - cursor / 2, y + it.cy, z);
      it.base = it.m.position.clone(); it.t0 = t0 + k * passo; it.k = k;
      titulo.add(it.m); letras.push(it);
    });
  };
  const frenteBranca = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .3, clearcoat: 1, clearcoatRoughness: .1, emissive: 0xbff8ff, emissiveIntensity: .12 });
  const frenteAmarela = new THREE.MeshPhysicalMaterial({ color: 0xffd21f, roughness: .28, clearcoat: 1, clearcoatRoughness: .08, emissive: 0xff9a00, emissiveIntensity: .18, sheen: .5, sheenColor: 0xfff4b0 });
  const ladoAzul = new THREE.MeshPhysicalMaterial({ color: 0x0b58c9, roughness: .3, clearcoat: .8 });
  const ladoTurq = new THREE.MeshPhysicalMaterial({ color: 0x0aa6b8, roughness: .35, clearcoat: .6 });
  linha('CLUBE DAS', .95, .42, 4.75, -1.6, frenteBranca, ladoAzul, T_EXPLOSAO + .35, .06);
  linha('GOTINHAS!', 1.32, .55, 3.42, -1.4, frenteAmarela, ladoAzul, T_EXPLOSAO + .85, .065);
  linha('SISTEMA URINÁRIO', .44, .16, 2.52, -1.1, frenteBranca, ladoTurq, T_EXPLOSAO + 1.9, .03);
  linha('Morfofisiologia dos Sistemas II', .27, .07, 2.02, -1.1, new THREE.MeshPhysicalMaterial({ color: 0xfff3b0, roughness: .4, emissive: 0xffe066, emissiveIntensity: .1 }), ladoAzul, T_EXPLOSAO + 2.4, .015);
}
function atualizaTitulo(t) {
  titulo.visible = t > T_EXPLOSAO;
  for (const it of letras) {
    const u = (t - it.t0) / .5;
    const s = u <= 0 ? 0 : easeOutBack(u, 2.2);
    it.m.visible = u > 0;
    it.m.scale.setScalar(Math.max(s, .0001));
    it.m.position.copy(it.base);
    it.m.position.y += (1 - clamp(u)) * -1.6 + .07 * Math.sin(t * 2.6 - it.k * .45) * sstep(0, 1, u - 1);
    it.m.rotation.x = (1 - clamp(u)) * -1.4;
    it.m.rotation.z = .04 * Math.sin(t * 2 + it.k);
    // brilho que percorre as letras
    let br = 0; for (const c of [T_EXPLOSAO + 3.1, T_EXPLOSAO + 5.6]) br += bump(t, c + it.x * .06, .09);
    it.mf.emissiveIntensity = (it.mf.userData.base ??= it.mf.emissiveIntensity) + br * 1.4;
  }
}

// ------------------------------------------------------------------ flash de transicao
const flash = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0xd9ffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
flash.position.z = -.2; flash.scale.setScalar(.5); flash.renderOrder = 999; camera.add(flash);

// ------------------------------------------------------------------ camera
const TOMADAS = [
  { ini: 0, fim: 5.0, keys: [
    [0, [0, 2.4, 9.5], [0, 3.6, 0], 40], [1.6, [0, 1.6, 8.2], [0, 2.2, 0], 39], [3.0, [0, .95, 6.4], [0, .55, 0], 38],
    [3.8, [0, 1.05, 4.6], [0, .9, 0], 40], [4.5, [0, 1.15, 2.1], [0, 1.0, -1], 46], [5.0, [0, 1.0, .15], [0, 1, -3], 55]] },
  { ini: 5.0, fim: 99, keys: (() => {
    const k = [[5.0, [0, 5.2, 18], [0, 1.6, 0], 38]];
    ENTRADAS.forEach((te, i) => {
      const [x, z] = SLOT2[i], perto = i % 2 === 0;
      k.push([te + .5, [x * .82 + (perto ? .6 : -.4), perto ? 1.25 : 1.6, z + (perto ? 4.4 : 6.6)], [x * .92, .95, z], perto ? 34 : 36]);
    });
    k.push([14.0, [0, 2.4, 14.2], [0, 1.15, 0], 38], [15.4, [-2.6, 1.1, 11.6], [0, 1.25, .2], 38], [16.6, [0, .85, 11.0], [0, 1.45, .2], 40],
      [18.2, [2.4, 1.0, 11.3], [0, 1.35, .2], 39], [19.7, [0, 1.3, 12.0], [0, 1.4, 0], 38],
      [20.5, [0, 2.75, 14.8], [0, 2.75, 0], 38], [23.0, [-1.3, 2.9, 12.7], [0, 2.75, 0], 38], [25.8, [1.1, 2.85, 12.5], [0, 2.75, 0], 38],
      [27.0, [0, 2.8, 12.6], [0, 2.75, 0], 38], [30.0, [0, 2.7, 10.6], [0, 2.75, 0], 38]);
    return k;
  })() },
];
function catmull(p0, p1, p2, p3, t0, t1, t2, t3, t) {
  // Catmull-Rom nao-uniforme (Barry-Goldman)
  const A1 = p0 * (t1 - t) / (t1 - t0) + p1 * (t - t0) / (t1 - t0);
  const A2 = p1 * (t2 - t) / (t2 - t1) + p2 * (t - t1) / (t2 - t1);
  const A3 = p2 * (t3 - t) / (t3 - t2) + p3 * (t - t2) / (t3 - t2);
  const B1 = A1 * (t2 - t) / (t2 - t0) + A2 * (t - t0) / (t2 - t0);
  const B2 = A2 * (t3 - t) / (t3 - t1) + A3 * (t - t1) / (t3 - t1);
  return B1 * (t2 - t) / (t2 - t1) + B2 * (t - t1) / (t2 - t1);
}
function amostra(keys, t, f) {
  if (t <= keys[0][0]) return f(keys[0]);
  if (t >= keys.at(-1)[0]) return f(keys.at(-1));
  let i = keys.findIndex((k, j) => j < keys.length - 1 && t >= k[0] && t <= keys[j + 1][0]);
  const k0 = keys[Math.max(i - 1, 0)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(i + 2, keys.length - 1)];
  const t0 = k0 === k1 ? k1[0] - 1 : k0[0], t3 = k3 === k2 ? k2[0] + 1 : k3[0];
  // suaviza o parametro dentro do segmento para movimentos com inercia
  const u = (t - k1[0]) / (k2[0] - k1[0]), us = lerp(u, easeInOut(u), .35);
  const tt = k1[0] + us * (k2[0] - k1[0]);
  const a = f(k0), b = f(k1), c = f(k2), d = f(k3);
  return a.map((_, j) => catmull(a[j], b[j], c[j], d[j], t0, k1[0], k2[0], t3, tt));
}
function atualizaCamera(t) {
  const tom = TOMADAS.find(s => t >= s.ini && t < s.fim);
  const pos = amostra(tom.keys, t, k => k[1]), alvo = amostra(tom.keys, t, k => k[2]), fov = amostra(tom.keys, t, k => [k[3]])[0];
  // tremidinha de camera na mao + impacto da explosao
  const tre = .025 + .12 * bump(t, T_EXPLOSAO + .15, .25) + .05 * bump(t, 3.05, .15);
  camera.position.set(pos[0] + tre * Math.sin(t * 13.1), pos[1] + tre * Math.sin(t * 17.3 + 1), pos[2]);
  camera.lookAt(alvo[0], alvo[1], alvo[2]);
  camera.fov = fov; camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------ quadro
function quadro(t) {
  atualizaCamera(t);
  const c1 = t < 5.0;
  cena1.visible = c1; palco.visible = !c1;
  ceu.position.copy(camera.position);
  ceuMat.uniforms.uT.value = t; ceuMat.uniforms.uFundo.value = c1 ? 1 : 0;
  for (const p of [bokeh, brilhos]) p.material.uniforms.uT.value = t;
  raios.forEach((r, i) => { r.material.opacity = .07 + .05 * Math.sin(t * .7 + i * 1.9); r.rotation.z = .35 - i * .04 + .04 * Math.sin(t * .3 + i); });
  atualizaBolhas(t);
  if (c1) atualizaCena1(t);
  else {
    gotinhas.forEach((g, i) => g.aplica(estado(i, t, camera.position)));
    atualizaFontes(t);
    atualizaTitulo(t);
    const fe = (t - T_EXPLOSAO) / .9;
    flashExp.visible = fe > 0 && fe < 1;
    flashExp.scale.setScalar(4 + 22 * fe); flashExp.material.opacity = Math.pow(1 - clamp(fe), 2) * .9;
    flashExp.lookAt(camera.position);
    bolhasGrandes.forEach((b, k) => { const d = b.userData; b.setMatrixAt(0, _m.compose(V(d.x + Math.sin(t * .3 + k) * .4, d.y + Math.sin(t * .5 + k * 2) * .5, d.z), _q.identity(), V(d.s, d.s, d.s))); b.instanceMatrix.needsUpdate = true; });
  }
  efeitos.forEach(e => e.update(t));
  flash.material.opacity = clamp(sstep(4.55, 4.97, t) * (1 - sstep(5.0, 5.55, t)));
  bloom.strength = .32 + .5 * bump(t, T_EXPLOSAO + .2, .35) + .3 * bump(t, 3.05, .2);
  for (const nome of (Q.get('ocultar') || '').split(',').filter(Boolean)) ({ bokeh, brilhos, bolhas, ceu, raios: raios[0] })[nome].visible = false;
  if (Q.get('ocultar')?.includes('raios')) raios.forEach(r => r.visible = false);
  if (Q.get('ocultar')?.includes('bloom')) bloom.enabled = false;
  composer.render();
}

await montaTitulo();
window.renderFrame = (t, q = .93) => { quadro(t); return renderer.domElement.toDataURL('image/jpeg', q); };
window.debug = t => { quadro(t); const bad = []; scene.traverse(o => { if (o.visible) { const e = o.matrixWorld.elements; if (e.some(v => !isFinite(v))) bad.push(o.type + ':' + (o.parent?.type||'')); } }); return { cam: camera.position.toArray(), bad: bad.slice(0, 10), n: bad.length }; };
window.px = (t, esconder) => { quadro(t); const ocultos = [];
  if (esconder === 'bloom') bloom.enabled = false;
  else if (esconder === 'ceu' || esconder === 'bolhas' || esconder === 'bokeh' || esconder === 'brilhos' || esconder === 'grandes') { const alvo = {ceu:[ceu], bolhas:[bolhas], bokeh:[bokeh], brilhos:[brilhos], grandes: bolhasGrandes}[esconder]; alvo.forEach(o => { o.visible = false; ocultos.push(o); }); }
  else if (esconder) scene.traverse(o => { if (o.visible && o.isMesh && (esconder === 'tudo' || o.material?.type === esconder || (o.material?.length && esconder==='multi'))) { o.visible = false; ocultos.push(o); } });
  if (esconder) composer.render();
  const gl = renderer.getContext(); const b = new Uint8Array(4); gl.readPixels(W/2|0, H/2|0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b);
  ocultos.forEach(o => o.visible = true); bloom.enabled = true; return Array.from(b); };
window.ready = true;
