// Modo "integrado": as gotinhas e a placa entram no video do apresentador (fundo transparente).
// Linha do tempo sincronizada com a fala:
// "Calma ai(0.92), voce sabia(2.04) que a cor(2.58) do nosso xixi(3.08) pode revelar(4.16) alguma
//  informacao(4.84) sobre nossa saude?(5.84) Entao(6.78), vamos entender(7.40) um pouquinho(7.84) sobre isso(8.34)."
let T, cena, cam, ren, G, CFG, H;
let placa, vaso, gotasPlaca = [];

const BASE = [ // [x, y da base, z, atraso de entrada]   fileira de tras (4) e da frente (3), como na foto
  [-1.47, -3.0, -.7, .15], [-.49, -2.95, -.7, .3], [.49, -2.95, -.7, .45], [1.47, -3.0, -.7, .6],
  [-1.0, -3.98, .7, .8], [.02, -3.93, .7, .95], [1.04, -3.98, .7, 1.1],
];
const S = .5;
const T_PLACA = 2.35;

export async function prepara(o) {
  T = o.THREE; cena = o.scene; cam = o.camera; ren = o.renderer; G = o.gotinhas; CFG = o.CONFIG; H = o.helpers;
  ren.setClearColor(0x000000, 0);
  // so as gotinhas ficam visiveis; o resto da vinheta some
  const grupo = new T.Group(); cena.add(grupo);
  G.forEach(g => { grupo.add(g.raiz); g.sombra.visible = false; g.sombra.parent.remove(g.sombra); });
  cena.children.forEach(c => { if (c !== grupo && !c.isLight && c !== cam) c.visible = false; });
  // iluminacao neutra de estudio (como no video)
  cena.environment = H.pmrem.fromScene(new H.RoomEnvironment(), .04).texture;
  cena.environmentIntensity = .75;
  cena.children.filter(c => c.isLight).forEach(l => {
    if (l.isHemisphereLight) { l.color.set(0xffffff); l.groundColor.set(0x9a9590); l.intensity = 1.2; }
    else if (l.position.z > 0) { l.color.set(0xfff6ec); l.intensity = 2.4; l.position.set(-3, 6, 10); }
    else { l.color.set(0xffffff); l.intensity = 1.6; }
  });
  ren.toneMappingExposure = 1.0;
  // camera vertical
  cam.fov = 28; cam.aspect = 9 / 16; cam.position.set(0, 0, 14); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  cam.children.forEach(c => c.visible = false);
  await new FontFace('Mont', 'url(./Montserrat-ExtraBold.ttf)').load().then(f => document.fonts.add(f));
  montaPlaca();
}

// ------------------------------------------------------------------ placa "A cor do seu XIXI..."
function textoGlitter(g, txt, x, y, tam, rnd) {
  g.font = `${tam}px Mont`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.strokeStyle = '#ffffff'; g.lineWidth = tam * .16; g.strokeText(txt, x, y);
  g.fillStyle = '#141414'; g.fillText(txt, x, y);
  // brilho de purpurina
  const w = g.measureText(txt).width;
  g.save(); g.globalCompositeOperation = 'source-atop';
  for (let k = 0; k < w * tam * .02; k++) {
    const px = x - w / 2 + rnd() * w, py = y - tam * .45 + rnd() * tam * .9, v = 60 + rnd() * 150 | 0;
    g.fillStyle = `rgba(${v},${v},${v + 10},${.35 + rnd() * .5})`; g.fillRect(px, py, 2 + rnd() * 3, 2 + rnd() * 3);
  }
  g.restore();
}
function montaPlaca() {
  const rnd = H.rng(5);
  const W = 2048, A = 600;
  const tex = H.canvasTex(W, (g) => {
    g.canvas.height = A; g.clearRect(0, 0, W, A);
    const forma = (dy) => { g.beginPath(); g.roundRect(30, 20 + dy, W - 60, A - 70, 120); };
    forma(26); g.fillStyle = '#2f9be0'; g.fill();          // borda azul de baixo
    forma(0); g.fillStyle = '#ffffff'; g.fill();
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 6; g.stroke();
    const cx = W / 2 + 120;
    // "A cor do seu" + XIXI na mesma linha
    g.font = '118px Mont'; const w1 = g.measureText('A cor do seu ').width;
    g.font = '230px Mont'; const w2 = g.measureText('XIXI').width;
    const x0 = cx - (w1 + w2) / 2;
    textoGlitter(g, 'A cor do seu', x0 + w1 / 2 - 20, 175, 118, rnd);
    // XIXI amarelo de feltro com contorno marrom
    g.font = '230px Mont'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const xx = x0 + w1 + w2 / 2, yy = 165;
    g.strokeStyle = '#ffffff'; g.lineWidth = 64; g.strokeText('XIXI', xx, yy);
    g.strokeStyle = '#5b3608'; g.lineWidth = 34; g.strokeText('XIXI', xx, yy);
    const gr = g.createLinearGradient(0, yy - 110, 0, yy + 110); gr.addColorStop(0, '#ffe24a'); gr.addColorStop(1, '#f6b800');
    g.fillStyle = gr; g.fillText('XIXI', xx, yy);
    g.save(); g.globalCompositeOperation = 'source-atop';
    for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(255,${200 + rnd() * 55 | 0},0,${rnd() * .5})`; g.fillRect(xx - w2 / 2 + rnd() * w2, yy - 110 + rnd() * 220, 2, 3); }
    g.restore();
    textoGlitter(g, 'pode dizer muito sobre', cx, 345, 104, rnd);
    textoGlitter(g, 'a sua saúde!', cx, 455, 104, rnd);
  });
  tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const larg = 3.75, alt = larg * A / W;
  placa = new T.Group();
  const frente = new T.Mesh(new T.PlaneGeometry(larg, alt), new T.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .05, roughness: .55 }));
  placa.add(frente);
  // espessura (sombra por tras)
  const sombra = new T.Mesh(new T.PlaneGeometry(larg, alt), new T.MeshBasicMaterial({ map: tex, transparent: true, color: 0x000000, opacity: .22, alphaTest: .05 }));
  sombra.position.set(.03, -.05, -.04); placa.add(sombra);
  // vasinho sanitario sorridente
  const tv = H.canvasTex(512, (g, s) => {
    g.clearRect(0, 0, s, s); g.lineJoin = 'round'; g.lineCap = 'round';
    g.lineWidth = 16; g.strokeStyle = '#121212'; g.fillStyle = '#ffffff';
    g.beginPath(); g.roundRect(150, 40, 250, 170, 40); g.fill(); g.stroke();             // caixa
    g.beginPath(); g.roundRect(130, 200, 290, 50, 25); g.fill(); g.stroke();             // tampa
    g.beginPath(); g.moveTo(150, 250); g.bezierCurveTo(150, 380, 220, 400, 230, 420); g.lineTo(220, 480); g.lineTo(380, 480); g.lineTo(370, 420);
    g.bezierCurveTo(390, 400, 410, 340, 400, 250); g.closePath(); g.fill(); g.stroke();  // bacia
    g.fillStyle = '#4fb3f0'; g.beginPath(); g.ellipse(275, 262, 100, 14, 0, 0, 6.283); g.fill();
    // rosto
    g.fillStyle = '#121212';
    for (const ex of [235, 315]) { g.beginPath(); g.ellipse(ex, 110, 20, 28, 0, 0, 6.283); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - 6, 100, 7, 0, 6.283); g.fill(); g.fillStyle = '#121212'; }
    g.fillStyle = '#ff8fb0'; for (const bx of [200, 350]) { g.beginPath(); g.ellipse(bx, 150, 20, 12, 0, 0, 6.283); g.fill(); }
    g.fillStyle = '#c0182a'; g.beginPath(); g.moveTo(240, 150); g.quadraticCurveTo(275, 200, 310, 150); g.closePath(); g.fill(); g.lineWidth = 8; g.stroke();
    // maozinha acenando
    g.lineWidth = 14; g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(95, 310, 48, 44, 0, 0, 6.283); g.fill(); g.stroke();
    for (const [dx, dy] of [[-40, -45], [-10, -62], [22, -55]]) { g.beginPath(); g.ellipse(95 + dx, 310 + dy, 15, 26, dx / 120, 0, 6.283); g.fill(); g.stroke(); }
  });
  tv.colorSpace = T.SRGBColorSpace;
  vaso = new T.Mesh(new T.PlaneGeometry(1.15, 1.15), new T.MeshStandardMaterial({ map: tv, transparent: true, alphaTest: .05, roughness: .5 }));
  vaso.position.set(-larg / 2 + .32, .02, .05); placa.add(vaso);
  // gotas azuis
  const tg = H.canvasTex(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.beginPath(); g.moveTo(128, 18); g.bezierCurveTo(150, 80, 220, 130, 220, 175); g.arc(128, 175, 92, 0, Math.PI); g.bezierCurveTo(36, 130, 106, 80, 128, 18); g.closePath();
    const gr = g.createLinearGradient(0, 20, 0, 270); gr.addColorStop(0, '#7fd0ff'); gr.addColorStop(1, '#1f8fe0');
    g.fillStyle = gr; g.fill(); g.lineWidth = 10; g.strokeStyle = '#ffffff'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(95, 160, 18, 34, -.4, 0, 6.283); g.fill();
  });
  tg.colorSpace = T.SRGBColorSpace;
  for (const [x, y, sc, rot] of [[larg / 2 - .12, .3, .38, .5], [larg / 2 + .02, -.12, .28, .9], [-larg / 2 + .95, .45, .26, -.5], [larg / 2 - .5, .52, .22, .2]]) {
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial({ map: tg, transparent: true, alphaTest: .05, roughness: .3 }));
    m.position.set(x, y, .06); m.scale.setScalar(sc); m.rotation.z = rot; m.userData = { x, y, rot }; placa.add(m); gotasPlaca.push(m);
  }
  placa.position.set(0, 2.92, 0);
  cena.add(placa);
}

// ------------------------------------------------------------------ estado de cada gotinha
function estado(i, t) {
  const { clamp, lerp, sstep, easeOutBack, bump, squash, fala, piscada, gesto, acenar, bracoCima, mix, REPOUSO } = H;
  const [x, y0, z, atraso] = BASE[i];
  const cfg = CFG[i], hp = cfg.segura ? cfg.maoProp : -1;
  const e = { visivel: t >= atraso, x, y: y0, z, yaw: 0, escala: 1, sx: 1, sy: 1, incl: 0, boca: .1, piscaE: 0, piscaD: 0, olharX: 0, olharY: 0, sobeSobr: 0, alegria: .3, bracoE: { ...REPOUSO }, bracoD: { ...REPOUSO }, maoE: 'aberta', maoD: 'aberta', t };
  if (!e.visivel) return e;
  const u = t - atraso;
  // entrada: sobe de baixo do quadro, como fantoche
  e.y = y0 - 2.4 * (1 - easeOutBack(clamp(u / .45), 1.6));
  let sq = squash(t - atraso - .4);
  // pulinhos de comemoracao no final
  const fim = sstep(8.6, 8.9, t);
  if (t > 8.7) { const k = ((t - 8.7 + i * .07) % .5) / .5; e.y += Math.sin(Math.PI * k) * .22 * fim; sq += .08 * Math.cos(Math.PI * 2 * k) * fim; }
  e.sy = 1 - sq + .015 * Math.sin(t * 3.1 + i); e.sx = 1 + sq * .5;
  e.escala = 1;
  // para onde olhar: o apresentador (centro, acima), a placa (acima) ou a camera
  const olhaPlaca = bump(t, T_PLACA + .55, .5);
  const olhaEle = clamp(sstep(1.3, 1.7, t) * (1 - sstep(6.6, 7.0, t)) - olhaPlaca);
  const paraCentro = Math.max(-.6, Math.min(.6, -x * .45));
  e.yaw = paraCentro * olhaEle + paraCentro * .4 * olhaPlaca + .06 * Math.sin(t * 1.3 + i * 2);
  e.olharX = Math.sign(-x || 1) * .8 * olhaEle;
  e.olharY = .9 * olhaEle + 1 * olhaPlaca;
  e.cabecaX = -.18 * olhaEle - .3 * olhaPlaca;
  e.sobeSobr = olhaPlaca;
  e.incl = .04 * Math.sin(t * 2 + i);
  e.piscaE = piscada(t, i); e.piscaD = e.piscaE;
  // boca: sorrindo, "oh!" quando a placa cai, conversinhas, festa no final
  e.boca = .1 + .12 * Math.sin(t * 2 + i) ** 2;
  e.boca = Math.max(e.boca, .85 * olhaPlaca * (i % 2 ? 1 : .8));
  if (u < .6) e.boca = .7;
  const SEG = { z: 1.75, x: -.8 }, BAIXO = { z: .9, x: -.7 };
  if (hp === 0) { e.bracoE = { ...BAIXO }; e.maoE = 'segura'; }
  if (hp === 1) { e.bracoD = { ...BAIXO }; e.maoD = 'segura'; }
  const momento = (ini, f) => { if (t > ini && t < ini + 1.6) f(t - ini); };
  // gestos sincronizados com a fala
  if (i === 4) momento(1.95, k => { e.bracoE = gesto(t, 1.95, 3.55, { z: .55, x: -2.05 }, BAIXO); e.piscaD = Math.max(e.piscaD, .5); });         // castanha: lupa em "voce sabia"
  if (i === 5) momento(4.6, k => { e.bracoD = gesto(t, 4.6, 6.2, { z: 2.1, x: -.6 }, BAIXO); e.boca = Math.max(e.boca, .3); });                 // esverdeada: termometro em "informacao"
  if (i === 6) momento(5.65, k => { e.bracoD = gesto(t, 5.65, 7.25, tt => ({ z: 2.5 + .1 * Math.sin(tt * 8), x: -.2 }), BAIXO); e.boca = Math.max(e.boca, .7 + .3 * Math.abs(Math.sin(t * 9))); }); // vermelha: alerta em "saude?"
  if (i === 2) momento(6.7, k => { e.bracoD = gesto(t, 6.7, 8.3, { z: 1.85, x: -.45 }); e.maoD = k > .15 ? 'joinha' : 'aberta'; if (k > .2 && k < 1.2) e.piscaD = 1; e.boca = Math.max(e.boca, .5); }); // amarela: joinha em "Entao"
  if (i === 0) momento(7.2, k => { e.bracoD = gesto(t, 7.2, 8.8, tt => acenar(tt)); e.boca = Math.max(e.boca, .55); });                         // transparente acena
  if (i === 1) momento(7.35, k => { e.bracoE = gesto(t, 7.35, 8.9, tt => acenar(tt, 2.4)); e.bracoD = gesto(t, 7.35, 8.9, tt => acenar(tt, 2.4, 2)); e.boca = Math.max(e.boca, .6); });
  if (i === 3) momento(7.6, k => { e.bracoE = gesto(t, 7.6, 9.0, { z: .15, x: -2.35 }); e.maoE = 'segura'; e.boca = .05; e.cabeca = -.12; });   // laranja pensativa
  // festa final: bracos para cima e bocas abertas
  if (t > 8.75) {
    const c = sstep(8.75, 9.05, t);
    e.bracoE = mix(e.bracoE, bracoCima(t, i), c); e.bracoD = mix(e.bracoD, i % 2 ? acenar(t, 2.4, i) : bracoCima(t, i + 1), c);
    e.boca = Math.max(e.boca, c * (.7 + .3 * Math.abs(Math.sin(t * 7 + i))));
    e.alegria = .7;
    if (i === 2) { e.maoD = 'joinha'; e.piscaD = 1; }
  }
  e.cabeca = (e.cabeca || 0) + .04 * Math.sin(t * 6 + i) * clamp(e.boca);
  return e;
}

export function quadro(t) {
  const { clamp, easeOutBack, sstep } = H;
  G.forEach((g, i) => { g.aplica(estado(i, t)); g.raiz.scale.multiplyScalar(S / .64); });
  // placa cai do alto quicando
  const u = (t - T_PLACA) / .7;
  placa.visible = u > 0;
  placa.position.y = 2.92 + (1 - easeOutBack(clamp(u), 2.2)) * 2.5;
  placa.rotation.z = (1 - clamp(u * 1.4)) * .12 + .012 * Math.sin(t * 2.2);
  placa.rotation.x = .04 * Math.sin(t * 1.7);
  const pulso = 1 + .035 * Math.exp(-Math.max(t - T_PLACA - .5, 0) * 3) * Math.sin((t - T_PLACA) * 20) + .02 * sstep(8.7, 9, t) * Math.sin(t * 12);
  placa.scale.setScalar(pulso);
  vaso.rotation.z = .1 * Math.sin(t * 5);
  vaso.position.y = .02 + .03 * Math.abs(Math.sin(t * 5));
  gotasPlaca.forEach((m, k) => { const d = m.userData; m.position.y = d.y + .05 * Math.sin(t * 3 + k * 1.7); m.rotation.z = d.rot + .15 * Math.sin(t * 2.4 + k); });
}
