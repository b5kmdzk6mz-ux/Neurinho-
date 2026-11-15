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
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
const MODO = Q.get('modo') || 'vinheta';
const renderer = new THREE.WebGLRenderer({ antialias: MODO === 'integrado', alpha: MODO === 'integrado', preserveDrawingBuffer: true, powerPreference: 'high-performance' });
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
function geoGota({ sx = 1.45, sy = 1.15, m = 1.0, dobra = .26, seg = 72, lat = 64, pescoco = null } = {}) {
  let pts = [];
  for (let i = 0; i <= lat; i++) {
    const phi = Math.PI * (1 - i / lat);
    const x = Math.sin(phi) * Math.pow(Math.sin(phi / 2), m) * sx;
    pts.push(new THREE.Vector2(Math.max(x, 1e-4), Math.cos(phi) * sy));
  }
  if (pescoco) { // cabeca de fantoche: a base da gota afina suavemente ate a manga
    const { yc, r, desce, fundo } = pescoco;
    const topo = pts.filter(p => p.y >= yc);
    const rc = topo[0].x, base = [];
    for (let k = 0; k <= 20; k++) { const u = k / 20, y = fundo + u * (yc - fundo); const w = sstep(yc - desce, yc, y); base.push(new THREE.Vector2(lerp(r, rc, w * w * (3 - 2 * w) ** .0 * w ** .2), y)); }
    pts = [...base.slice(0, -1), ...topo];
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

// ------------------------------------------------------------------ PERSONAGENS (fieis a foto de referencia: fantoches de pelucia)
const geoCorpo = geoGota({ sx: 1.42, sy: 1.15, m: 1.05, dobra: .2, pescoco: { yc: -.62, r: .6, desce: .6, fundo: -2.05 } });
const RAIO = geoCorpo.userData.raio, SY = geoCorpo.userData.sy;
const ESCALA = .64;
const MANGA_H = .7, CABECA_Y = 2.05;

// textura de plastico-bolha (gotinha transparente)
const texBolhas = canvasTex(256, (g, s) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
  const n = 4, d = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = (i + .5 + (j % 2) * .5) * d, y = (j + .5) * d;
    for (const dx of [-s, 0, s]) {
      const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, d * .42);
      gr.addColorStop(0, '#fff'); gr.addColorStop(.75, '#bbb'); gr.addColorStop(1, '#000');
      g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y, d * .42, 0, 6.283); g.fill();
    }
  }
}, [5, 3]);
// textura canelada da manga (meia)
const texCanelado = canvasTex(256, (g, s) => {
  for (let x = 0; x < s; x++) { const v = 128 + 60 * Math.sin(x / s * Math.PI * 2 * 12); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, s); }
  g.globalAlpha = .35; g.drawImage(texPelo.image, 0, 0, s, s);
}, [2, 1]);

// bocas desenhadas (decal projetado na superficie da cabeca)
function texBoca(tipo) {
  return canvasTex(512, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (tipo === 'aberta') {
      g.beginPath();
      g.moveTo(20, 40); g.quadraticCurveTo(s / 2, 90, s - 20, 40);
      g.bezierCurveTo(s - 10, 330, s * .72, s - 20, s / 2, s - 20);
      g.bezierCurveTo(s * .28, s - 20, 10, 330, 20, 40); g.closePath();
      const gr = g.createLinearGradient(0, 40, 0, s);
      gr.addColorStop(0, '#5a0612'); gr.addColorStop(.5, '#9c1022'); gr.addColorStop(1, '#c0182a');
      g.fillStyle = gr; g.fill();
      g.save(); g.clip();
      g.fillStyle = '#ff5468'; g.beginPath(); g.ellipse(s / 2, s - 40, s * .3, s * .2, 0, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(s / 2 - 40, s - 90, 40, 16, -.3, 0, 6.283); g.fill();
      g.strokeStyle = '#d9384c'; g.lineWidth = 6; g.beginPath(); g.moveTo(s / 2, s - 150); g.lineTo(s / 2, s - 60); g.stroke();
      g.restore();
      g.strokeStyle = '#3d040c'; g.lineWidth = 14;
      g.beginPath(); g.moveTo(20, 40); g.quadraticCurveTo(s / 2, 90, s - 20, 40);
      g.bezierCurveTo(s - 10, 330, s * .72, s - 20, s / 2, s - 20); g.bezierCurveTo(s * .28, s - 20, 10, 330, 20, 40); g.stroke();
    } else {
      g.strokeStyle = '#3d040c'; g.lineWidth = 34;
      g.beginPath();
      if (tipo === 'sorriso') { g.moveTo(60, 140); g.quadraticCurveTo(s / 2, 420, s - 60, 140); }
      else { g.moveTo(110, 360); g.quadraticCurveTo(s / 2, 170, s - 110, 360); }
      g.stroke();
    }
  });
}
const BOCAS = { aberta: texBoca('aberta'), sorriso: texBoca('sorriso'), bico: texBoca('bico') };

const CONFIG = [
  { nome: 'transparente', cor: '#eef5fa', manga: '#d8dde3', sheen: '#ffffff', bolhas: true, sobr: { alt: [.05, .05], ang: [.15, .15] }, fechada: 'sorriso', acessorio: 'oculos' },
  { nome: 'amarelo-claro', cor: '#fff09a', manga: '#f7e98e', sheen: '#fffbe0', cilios: true, bochecha: '#ff8fa6', sobr: { alt: [.06, .06], ang: [.2, .2] }, fechada: 'sorriso', acessorio: 'laco' },
  { nome: 'amarela', cor: '#ffd21a', manga: '#f5c814', sheen: '#fff2a0', sobr: { alt: [.04, .08], ang: [.12, .25] }, fechada: 'sorriso', piscadinha: 1 },
  { nome: 'laranja', cor: '#ff7a14', manga: '#f26f10', sheen: '#ffd0a0', sobr: { alt: [.12, -.04], ang: [.25, -.35] }, palp: [.38, .3], fechada: 'bico' },
  { nome: 'castanha', cor: '#7f4421', manga: '#74401f', sheen: '#d89a6a', sobr: { alt: [-.05, .1], ang: [-.3, .2] }, palp: [.45, 0], fechada: 'sorriso', acessorio: 'chapeu', segura: 'lupa', maoProp: 0 },
  { nome: 'esverdeada', cor: '#8fd13a', manga: '#84c234', sheen: '#e4ffb0', sobr: { alt: [.04, .04], ang: [-.45, -.45] }, palp: [.35, .35], fechada: 'bico', segura: 'termometro', maoProp: 1 },
  { nome: 'vermelha', cor: '#e0221f', manga: '#cc1d1b', sheen: '#ffb0a0', sobr: { alt: [-.02, -.02], ang: [.5, .5] }, fechada: 'bico', segura: 'placa', maoProp: 1 },
];

const pelucia = (cor, extra = {}) => new THREE.MeshPhysicalMaterial({ color: cor, roughness: .9, sheen: 1, sheenRoughness: .38, sheenColor: new THREE.Color(cor).lerp(new THREE.Color('#ffffff'), .5), bumpMap: texPelo, bumpScale: 1.6, envMapIntensity: .9, ...extra });
const matBranco = pelucia('#ffffff', { bumpScale: 1.2, sheenColor: new THREE.Color('#ffffff') });
const matOlho = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .25, clearcoat: 1, clearcoatRoughness: .05 });
const matPupila = new THREE.MeshPhysicalMaterial({ color: 0x060606, roughness: .15, clearcoat: 1 });
const matReflexo = new THREE.MeshBasicMaterial({ color: 0xffffff });
const matPreto = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0c, roughness: .5, clearcoat: .4 });

function pontoSuperficie(x, y, recuo = 0) {
  const r = RAIO(y);
  const z = Math.sqrt(Math.max(r * r - x * x, 0));
  const n = V(x / r, 0, z / r).normalize();
  return { p: V(x, y, z - recuo), n };
}

// ---- acessorios
function oculos() {
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 });
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new RoundedBoxGeometry(.46, .32, .07, 4, .09), m); l.position.set(s * .28, 0, 0); g.add(l); }
  const ponte = new THREE.Mesh(new THREE.BoxGeometry(.16, .06, .05), m); ponte.position.y = .07; g.add(ponte);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .7), m); h.position.set(s * .5, .06, -.33); g.add(h); }
  return g;
}
function laco() {
  const g = new THREE.Group(), m = pelucia('#ff4f9a', { bumpScale: .8 });
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 16), m); a.scale.set(1.15, .75, .45); a.position.x = s * .2; a.rotation.z = s * .35; g.add(a); }
  const n = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), m); n.position.z = .05; g.add(n);
  return g;
}
function chapeu() {
  const g = new THREE.Group(), m = pelucia('#6b3f22', { roughness: .8, bumpScale: .6 }), mf = pelucia('#2e1a0e', { bumpScale: .4 });
  const aba = new THREE.Mesh(new THREE.CylinderGeometry(.92, .92, .06, 48), m); aba.scale.z = .88; g.add(aba);
  const copa = new THREE.Mesh(new THREE.CylinderGeometry(.42, .55, .5, 40), m); copa.position.y = .27; g.add(copa);
  const topo = new THREE.Mesh(new THREE.SphereGeometry(.42, 32, 12, 0, 6.283, 0, Math.PI / 2), m); topo.scale.y = .25; topo.position.y = .52; g.add(topo);
  const faixa = new THREE.Mesh(new THREE.CylinderGeometry(.53, .56, .11, 40), mf); faixa.position.y = .1; g.add(faixa);
  return g;
}
function lupa() {
  const g = new THREE.Group();
  const aro = new THREE.Mesh(new THREE.TorusGeometry(.22, .04, 12, 36), new THREE.MeshPhysicalMaterial({ color: 0x2a2f38, roughness: .3, metalness: .6 }));
  aro.position.y = .52; g.add(aro);
  const vidro = new THREE.Mesh(new THREE.CircleGeometry(.22, 32), new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, roughness: 0, transparent: true, opacity: .45, clearcoat: 1, side: THREE.DoubleSide, envMapIntensity: 2 }));
  vidro.position.y = .52; g.add(vidro);
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .36, 16), matPreto); cabo.position.y = .14; g.add(cabo);
  return g;
}
function termometro() {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .5, 8, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .1, clearcoat: 1, transparent: true, opacity: .85 }));
  corpo.position.y = .38; g.add(corpo);
  const linha = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .38, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 })); linha.position.y = .36; g.add(linha);
  const bulbo = new THREE.Mesh(new THREE.SphereGeometry(.065, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xff1a1a, emissive: 0xaa0000, emissiveIntensity: .3, clearcoat: 1 }));
  bulbo.position.y = .12; g.add(bulbo);
  return g;
}
function placa() {
  const g = new THREE.Group();
  const tri = (r) => { const sh = new THREE.Shape(); for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 3; k ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } sh.closePath(); return sh; };
  const ext = new THREE.Mesh(new THREE.ExtrudeGeometry(tri(.46), { depth: .06, bevelEnabled: true, bevelThickness: .03, bevelSize: .05, bevelSegments: 4 }), new THREE.MeshPhysicalMaterial({ color: 0xe8141a, roughness: .35, clearcoat: .8 }));
  const inn = new THREE.Mesh(new THREE.ShapeGeometry(tri(.3)), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5 }));
  inn.position.z = .1;
  const ex1 = new THREE.Mesh(new THREE.CapsuleGeometry(.035, .14, 6, 12), matPreto); ex1.position.set(0, .02, .12);
  const ex2 = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), matPreto); ex2.position.set(0, -.15, .12);
  const sinal = new THREE.Group(); sinal.add(ext, inn, ex1, ex2); sinal.position.set(0, .62, .08);
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .45, 10), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: .4, metalness: .5 })); cabo.position.y = .2;
  g.add(sinal, cabo);
  return g;
}
const PROPS = { lupa, termometro, placa };

// ---- luva branca de 4 dedos
function luva(lado) {
  const g = new THREE.Group();
  const palma = new THREE.Mesh(new THREE.SphereGeometry(.19, 24, 18), matBranco); palma.scale.set(1.05, .95, .62); g.add(palma);
  const punho = new THREE.Mesh(new THREE.TorusGeometry(.15, .055, 10, 24), matBranco); punho.rotation.x = Math.PI / 2; punho.position.y = -.17; g.add(punho);
  const dedos = [-.13, -.045, .045, .13].map((x, k) => {
    const piv = new THREE.Group(); piv.position.set(x, .12, 0); g.add(piv);
    const d = new THREE.Mesh(new THREE.CapsuleGeometry(.056, k === 0 || k === 3 ? .1 : .13, 6, 12), matBranco); d.position.y = .1; piv.add(d);
    piv.userData.abre = x * 1.4;
    return piv;
  });
  const pol = new THREE.Group(); pol.position.set(-lado * .15, .0, .04); g.add(pol);
  const pm = new THREE.Mesh(new THREE.CapsuleGeometry(.06, .12, 6, 12), matBranco); pm.position.y = .1; pol.add(pm);
  return { g, dedos, pol, lado };
}
function poseLuva(l, pose) {
  const fecha = pose === 'aberta' ? 0 : 1;
  l.dedos.forEach(d => { d.rotation.set(fecha * 2.3, 0, -d.userData.abre * (1 - fecha) * 1.2); d.scale.setScalar(1 - .15 * fecha); });
  if (pose === 'joinha') { l.pol.rotation.set(0, 0, l.lado * Math.PI / 2); l.pol.scale.set(1, 1.35, 1); }
  else { l.pol.rotation.set(fecha * .9, 0, l.lado * (fecha ? .5 : 1.0)); l.pol.scale.set(1, 1, 1); }
}

class Gotinha {
  constructor(cfg, i) {
    this.cfg = cfg; this.i = i;
    this.raiz = new THREE.Group();
    this.corpo = new THREE.Group();   // pivo na base (squash)
    this.raiz.add(this.corpo);
    const mat = cfg.bolhas
      ? new THREE.MeshPhysicalMaterial({ color: '#eef6fb', roughness: .22, clearcoat: 1, clearcoatRoughness: .1, bumpMap: texBolhas, bumpScale: -2.4, transparent: true, opacity: .78, iridescence: .45, iridescenceIOR: 1.3, sheen: .6, sheenColor: new THREE.Color('#ffffff'), envMapIntensity: 1.4 })
      : pelucia(cfg.cor);
    this.mat = mat;
    // manga (meia)
    const manga = new THREE.Mesh(new THREE.CylinderGeometry(.615, .64, MANGA_H, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: cfg.manga, roughness: .95, sheen: .8, sheenColor: new THREE.Color(cfg.manga).lerp(new THREE.Color('#fff'), .4), bumpMap: texCanelado, bumpScale: 1.1 }));
    manga.position.y = MANGA_H / 2; this.corpo.add(manga);
    // cabeca
    const malha = new THREE.Mesh(geoCorpo, mat);
    malha.position.y = CABECA_Y;
    this.corpo.add(malha);
    this.malha = malha;

    // olhos
    this.olhos = [];
    for (const lado of [-1, 1]) {
      const { p, n } = pontoSuperficie(lado * .3, .3, .07);
      const g = new THREE.Group(); g.position.copy(p); g.lookAt(p.clone().add(n.clone().add(V(0, .05, 1.1)).normalize()));
      const esc = new THREE.Mesh(new THREE.SphereGeometry(.25, 32, 24), matOlho); esc.scale.set(1, 1.22, .55); g.add(esc);
      const irisG = new THREE.Group(); irisG.position.z = .1; g.add(irisG);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(.15, 28, 20), matPupila); pup.scale.set(.92, 1.08, .42); pup.position.y = -.02; irisG.add(pup);
      const r1 = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), matReflexo); r1.position.set(-.055, .05, .07); irisG.add(r1);
      const r2 = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 6), matReflexo); r2.position.set(.05, -.07, .065); irisG.add(r2);
      const palp = new THREE.Mesh(new THREE.SphereGeometry(.265, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      palp.scale.set(1.04, 1.24, .9); g.add(palp);
      // sobrancelha preta em arco
      const sob = new THREE.Mesh(new THREE.TorusGeometry(.2, .036, 10, 24, 1.5), matPreto);
      sob.rotation.z = Math.PI / 2 - .75; g.add(sob);
      if (cfg.cilios) for (let k = 0; k < 3; k++) {
        const c = new THREE.Mesh(new THREE.CapsuleGeometry(.018, .09, 4, 8), matPreto);
        const a = (lado > 0 ? .25 : Math.PI - .25) + (lado > 0 ? 1 : -1) * k * .32;
        c.position.set(Math.cos(a) * .26, Math.sin(a) * .31 + .02, .04); c.rotation.z = a - Math.PI / 2; g.add(c);
      }
      malha.add(g);
      this.olhos.push({ g, irisG, palp, sob, lado });
    }
    // bochechas
    if (cfg.bochecha) for (const lado of [-1, 1]) {
      const { p, n } = pontoSuperficie(lado * .58, -.02, .02);
      const b = new THREE.Mesh(new THREE.CircleGeometry(.09, 24), new THREE.MeshBasicMaterial({ color: cfg.bochecha, transparent: true, opacity: .85, depthWrite: false }));
      b.position.copy(p).addScaledVector(n, .04); b.lookAt(p.clone().add(n)); malha.add(b);
    }
    // boca: grade projetada na superficie (decal) que abre como boca de fantoche
    this.bocaGeo = new THREE.PlaneGeometry(1, 1, 28, 14);
    this.bocaBase = this.bocaGeo.attributes.position.array.slice();
    this.bocaMat = new THREE.MeshStandardMaterial({ map: BOCAS.aberta, transparent: true, alphaTest: .4, roughness: .55, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: true });
    this.boca = new THREE.Mesh(this.bocaGeo, this.bocaMat); this.boca.frustumCulled = false; malha.add(this.boca);

    // bracos + luvas
    this.bracos = [];
    for (const lado of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(lado * .82, -.55, .12); malha.add(piv);
      const br = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .34, 8, 16), cfg.bolhas ? mat : pelucia(cfg.manga)); br.position.y = -.24; piv.add(br);
      const l = luva(lado); l.g.position.y = -.56; l.g.rotation.z = Math.PI; piv.add(l.g);
      this.bracos.push({ piv, lado, luva: l });
    }
    // acessorios
    if (cfg.acessorio === 'oculos') { const o = oculos(); o.position.set(0, .72, .42); o.rotation.x = -.55; malha.add(o); }
    if (cfg.acessorio === 'laco') { const o = laco(); o.position.set(-.38, .62, .42); o.rotation.set(-.3, -.35, .35); malha.add(o); }
    if (cfg.acessorio === 'chapeu') { const o = chapeu(); o.position.set(.05, .62, -.02); o.rotation.set(-.12, 0, -.14); malha.add(o); }
    if (cfg.segura) {
      const pr = PROPS[cfg.segura](); const l = this.bracos[cfg.maoProp].luva;
      pr.position.set(0, .05, .14); pr.scale.setScalar(cfg.segura === 'placa' ? 1.7 : 1.45); l.g.add(pr); this.prop = pr;
    }
    // sombra de contato
    this.sombra = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false }));
    this.sombra.rotation.x = -Math.PI / 2; this.sombra.position.y = .012;
    palco.add(this.sombra);
    this.raiz.scale.setScalar(ESCALA);
    palco.add(this.raiz);
  }

  atualizaBoca(ab) {
    // histerese: evita a boca ficar trocando entre aberta e fechada a cada quadro
    if (this._aberta === undefined) this._aberta = ab >= .14;
    if (this._aberta && ab < .09) this._aberta = false; else if (!this._aberta && ab > .2) this._aberta = true;
    let tipo = this._aberta ? 'aberta' : (this.cfg.fechada || 'sorriso');
    ab = Math.max(ab, this._aberta ? .14 : 0);
    const largura = tipo === 'aberta' ? 1.12 + .08 * ab : .8, topo = -.04;
    const alt = tipo === 'aberta' ? .2 + .62 * clamp(ab, 0, 1.3) : .3;
    if (this.bocaMat.map !== BOCAS[tipo]) { this.bocaMat.map = BOCAS[tipo]; this.bocaMat.needsUpdate = true; }
    const pos = this.bocaGeo.attributes.position, b = this.bocaBase;
    for (let k = 0; k < pos.count; k++) {
      const u = b[k * 3], v = b[k * 3 + 1];   // -0.5..0.5
      const x = u * largura, y = tipo === 'aberta' ? topo - (.5 - v) * alt : -.2 + v * alt;
      const r = RAIO(y), z = Math.sqrt(Math.max(r * r - x * x, .0001)) + .012;
      pos.setXYZ(k, x, y, z);
    }
    pos.needsUpdate = true; this.bocaGeo.computeVertexNormals(); this.bocaGeo.computeBoundingSphere();
  }

  aplica(e) {
    this.raiz.visible = e.visivel; this.sombra.visible = e.visivel;
    if (!e.visivel) return;
    this.raiz.position.set(e.x, e.y, e.z);
    this.raiz.rotation.y = e.yaw;
    this.raiz.scale.setScalar(ESCALA * e.escala);
    this.corpo.scale.set(e.sx, e.sy, e.sx);
    this.corpo.rotation.z = e.incl; this.corpo.rotation.x = e.inclX || 0;
    this.malha.rotation.z = e.cabeca || 0; this.malha.rotation.x = e.cabecaX || 0;
    const alt = Math.max(e.y, 0);
    this.sombra.position.set(e.x, .012, e.z);
    const ss = ESCALA * e.escala * (1.25 - Math.min(alt * .12, .5)) * e.sx;
    this.sombra.scale.set(ss, ss, ss);
    this.sombra.material.opacity = clamp(1 - alt * .25, .25, 1);
    // olhos e sobrancelhas
    const cfg = this.cfg;
    this.olhos.forEach((o, k) => {
      const pisc = clamp(k === 0 ? e.piscaE : e.piscaD);
      o.g.scale.y = 1 - .88 * pisc;   // piscar: o olho fecha achatando (sem palpebra saltada)
      const fech = clamp((cfg.palp ? cfg.palp[k] : 0) * (1 - .6 * e.alegria));
      o.palp.rotation.x = lerp(-1.57, 1.57, fech);
      o.palp.visible = fech > .02;
      o.irisG.position.x = e.olharX * .06; o.irisG.position.y = e.olharY * .07;
      const ang = cfg.sobr.ang[k] * (1 - .4 * e.alegria), altura = cfg.sobr.alt[k] + e.sobeSobr * .07;
      o.sob.position.set(0, .3 + altura, .1);
      o.sob.rotation.z = Math.PI / 2 - .75 + (o.lado < 0 ? -ang : ang);
    });
    this.atualizaBoca(clamp(e.boca, 0, 1.3));
    // bracos e maos
    this.bracos.forEach((b, k) => {
      const a = k === 0 ? e.bracoE : e.bracoD;
      b.piv.rotation.set(a.x || 0, 0, b.lado * a.z);
      poseLuva(b.luva, (k === 0 ? e.maoE : e.maoD) || 'aberta');
    });
    if (this.prop) { // acessorio segurado fica sempre em pe, de frente
      this.raiz.updateMatrixWorld(true);
      const qp = new THREE.Quaternion(); this.prop.parent.getWorldQuaternion(qp);
      const qd = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, e.yaw + (this.cfg.segura === 'placa' ? -.25 : .2), .12 * Math.sin(e.t * 3 + this.i)));
      this.prop.quaternion.copy(qp.invert().multiply(qd));
    }
  }
}
const gotinhas = CONFIG.map((c, i) => new Gotinha(c, i));

// posicoes por fase
const SLOT2 = [[-5.2, .2], [-3.45, -.5], [-1.7, .35], [0, -.45], [1.7, .35], [3.45, -.5], [5.2, .2]];
const SLOT3 = [-3, -2, -1, 0, 1, 2, 3].map(k => [k * 1.55, .7 - .09 * k * k]);
const SLOT4 = [[-4.75, 1.2], [-3.4, .5], [-1.95, 1.5], [0, 2.2], [1.95, 1.5], [3.4, .5], [4.75, 1.2]];

function salto(u, h) { return 4 * h * u * (1 - u); }
function squash(dt) { if (dt < 0 || dt > 1.2) return 0; return Math.exp(-dt * 6) * Math.cos(dt * 19) * .2; }
function fala(t, seed, gate = 1) {
  const g = sstep(.1, .45, Math.sin(t * 1.3 + seed * 2.1) * .5 + .5 + .1 * Math.sin(t * 3.1 + seed));
  return gate * g * (.15 + .75 * Math.abs(Math.sin(t * (9 + seed) + seed * 4) * Math.sin(t * 4.3 + seed)));
}
function piscada(t, i) {
  const per = 3.3 + .53 * i, off = i * .91;
  const u = ((t + off) % per);
  return u < .14 ? Math.sin(Math.PI * u / .14) : 0;
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
  const cfg = CONFIG[i], hp = cfg.segura ? cfg.maoProp : -1;
  const SEG = { z: 1.75, x: -.8 };
  let bE = hp === 0 ? { ...SEG } : { ...REPOUSO }, bD = hp === 1 ? { ...SEG } : { ...REPOUSO }, boca = 0, alegria = 0;
  let mE = hp === 0 ? 'segura' : 'aberta', mD = hp === 1 ? 'segura' : 'aberta';
  const ajusta = (k, v) => { if (k === 0) bE = v; else bD = v; };
  if (t < 14) {
    boca = fala(t, i * 1.7, .8) * (u > .5 ? 1 : 0);
    const G = [
      () => { bD = gesto(t, te + .55, te + 2.4, tt => acenar(tt)); boca = Math.max(boca, u > .7 && u < 2 ? fala(t, 3.1) + .3 : 0); },
      () => { bE = gesto(t, te + .5, te + 2.2, tt => acenar(tt, 2.4)); bD = gesto(t, te + .5, te + 2.2, tt => acenar(tt, 2.4, 2)); alegria = .5; boca = u > .5 && u < 2.2 ? .6 + .4 * Math.abs(Math.sin(t * 7)) : boca; },
      () => { bD = gesto(t, te + .7, te + 2.3, { z: 1.85, x: -.45 }); if (u > .7 && u < 2.3) mD = 'joinha'; if (u > .85 && u < 2.0) e.piscaD = 1; boca = u > .7 && u < 2.3 ? .55 + .3 * Math.abs(Math.sin(t * 6)) : boca; },
      () => { bE = gesto(t, te + .8, te + 2.4, { z: .15, x: -2.35 }); if (u > .8 && u < 2.4) { mE = 'segura'; boca = .05; e.cabeca = -.12; } else boca = u > 2.4 ? boca : boca; },
      () => { bE = gesto(t, te + .5, te + 2.2, { z: .55, x: -2.05 }, SEG); if (u > .6 && u < 2.2) e.piscaD = Math.max(e.piscaD, .5); boca = u > .7 && u < 2.2 ? fala(t, 7.7) + .2 : boca; },
      () => { bD = gesto(t, te + 1.0, te + 2.4, { z: 2.1, x: -.6 }, SEG); bE = gesto(t, te + 1.0, te + 2.4, { z: 1.2, x: -1.2 }); boca = u > 1.0 && u < 2.4 ? fala(t, 9.9) + .2 : boca; },
      () => { bD = gesto(t, te + .5, te + 2.4, tt => ({ z: 2.5 + .1 * Math.sin(tt * 7), x: -.2 }), SEG); bE = gesto(t, te + 1.2, te + 2.4, tt => acenar(tt, 2.6)); boca = u > .5 && u < 2.0 ? .8 + .35 * Math.abs(Math.sin(t * 8)) : boca; },
    ];
    G[i]();
    if (u > 2.6) { const w = bump(t, ENTRADAS.find(tt => tt > t - .9 && tt < t + .3) ?? -9, .5); if (w > .05 && i % 2 === 0 && hp !== 0) bE = mix(bE, acenar(t, 2.4, i), w); }
    if (i === 2 && u > 2.6 && Math.sin(t * 1.3) > .6) e.piscaD = 1;
  } else if (t < T_EXPLOSAO) {
    const cima = sstep(15.3, 15.7, t);
    bE = mix(bE, bracoCima(t, i), cima); bD = mix(bD, bracoCima(t, i + 1), cima);
    if (t < 15.3) boca = fala(t, i * 2.3, .7);
    else boca = .3;
    for (const g of GRITOS) for (const s of SILABAS) boca = Math.max(boca, 1.2 * bump(t, g + s + .05, .085));
    if (t > 19.4) boca = .45;
    alegria = .6; e.incl += .1 * Math.sin((t - 15) * Math.PI * 2);
  } else {
    const k = t - T_EXPLOSAO;
    boca = k < 1.2 ? 1.0 : (.25 + fala(t, i * 3.3, .7));
    const m = i % 3;
    if (m === 0) { bD = gesto(t, T_EXPLOSAO + .9, 99, tt => acenar(tt, 2.2, i), bD); bE = gesto(t, T_EXPLOSAO + .9, 99, tt => bracoCima(tt, i), bE); }
    else if (m === 1) { bE = gesto(t, T_EXPLOSAO + .9, 99, tt => acenar(tt, 2.5, i), bE); }
    else { bE = gesto(t, T_EXPLOSAO + .9, 99, tt => acenar(tt, 2.0, i), bE); bD = gesto(t, T_EXPLOSAO + .9, 99, tt => acenar(tt, 2.0, i + 2), bD); }
    if (hp >= 0) ajusta(hp, { z: 2.3 + .15 * Math.sin(t * 5 + i), x: -.35 });
    if (i === 2) { bD = gesto(t, T_EXPLOSAO + 1.2, 99, { z: 1.85, x: -.45 }, bD); if (k > 1.2) mD = 'joinha'; if (Math.sin(t * 1.1) > .7) e.piscaD = 1; }
    if (k < .9) { bE = bracoCima(t, i); bD = bracoCima(t, i + 1); }
    alegria = .6;
    if (t > 27) boca = .3 + fala(t, i * 4.1, .6) * .8;
  }
  e.maoE = mE; e.maoD = mD; e.t = t;
  e.cabeca = (e.cabeca || 0) + .05 * Math.sin(t * 6 + i) * clamp(boca);
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
      k.push([te + .5, [x * .82 + (perto ? .6 : -.4), perto ? 1.6 : 1.9, z + (perto ? 4.8 : 6.8)], [x * .92, 1.3, z], perto ? 34 : 36]);
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
if (MODO === 'integrado') {
  const mod = await import('./integrado.js');
  await mod.prepara({ THREE, scene, camera, renderer, gotinhas, CONFIG, helpers: { clamp, lerp, sstep, easeOutBack, bump, salto, squash, fala, piscada, gesto, acenar, bracoCima, mix, REPOUSO, V, rng, canvasTex, pmrem, RoomEnvironment } });
  window.renderFrame = t => { mod.quadro(t); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); };
} else
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
