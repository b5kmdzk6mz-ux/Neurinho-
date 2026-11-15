// Modo "integrado": as gotinhas e a placa entram no video do apresentador (fundo transparente).
// Linha do tempo sincronizada com a fala:
// "Calma ai(0.92), voce sabia(2.04) que a cor(2.58) do nosso xixi(3.08) pode revelar(4.16) alguma
//  informacao(4.84) sobre nossa saude?(5.84) Entao(6.78), vamos entender(7.40) um pouquinho(7.84) sobre isso(8.34)."
let T, cena, cam, ren, G, CFG, H;
let placa, vaso, gotasPlaca = [];

// fileira unica na base do quadro: [x, y da base, z, inicio da entrada]
const BASE = [0, 1, 2, 3, 4, 5, 6].map(i => [-1.6 + i * .535, i % 2 ? -3.56 : -3.66, i % 2 ? -.25 : .25, .95 + [3, 1, 5, 0, 4, 2, 6][i] * .17]);
const S = .34;
const T_SAI = 8.75;
const T_PLACA = 2.3;

export async function prepara(o) {
  T = o.THREE; cena = o.scene; cam = o.camera; ren = o.renderer; G = o.gotinhas; CFG = o.CONFIG; H = o.helpers;
  ren.setClearColor(0x000000, 0);
  o.CONFIG.forEach(c => { c.fechada = 'sorriso'; });
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
  const W = 2048, A = 680;
  const tex = H.canvasTex(W, (g) => {
    g.canvas.height = A; g.clearRect(0, 0, W, A);
    // cartao branco com borda turquesa dupla
    g.beginPath(); g.roundRect(24, 24, W - 48, A - 48, 100);
    const fundo = g.createLinearGradient(0, 0, 0, A); fundo.addColorStop(0, '#ffffff'); fundo.addColorStop(1, '#e9f8ff');
    g.fillStyle = fundo; g.fill();
    g.lineWidth = 22; g.strokeStyle = '#18a4dc'; g.stroke();
    g.beginPath(); g.roundRect(52, 52, W - 104, A - 104, 76); g.lineWidth = 6; g.strokeStyle = '#9fe0f7'; g.stroke();
    // bolinhas decorativas de agua no fundo do cartao
    for (let k = 0; k < 26; k++) { g.fillStyle = `rgba(80,190,240,${.06 + rnd() * .08})`; g.beginPath(); g.arc(440 + rnd() * 1520, 70 + rnd() * (A - 140), 10 + rnd() * 26, 0, 6.283); g.fill(); }
    const cx = 1230, maxW = 1480;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    // linha 1
    g.font = '96px Mont'; g.letterSpacing = '10px';
    g.fillStyle = '#0b4f8a'; g.fillText('A COR DO SEU', cx, 128);
    g.letterSpacing = '0px';
    // XIXI
    g.font = '252px Mont';
    const yy = 300;
    g.save(); g.shadowColor = 'rgba(0,40,80,.35)'; g.shadowOffsetY = 14; g.shadowBlur = 10;
    g.strokeStyle = '#ffffff'; g.lineWidth = 60; g.strokeText('XIXI', cx, yy); g.restore();
    g.strokeStyle = '#0b4f8a'; g.lineWidth = 30; g.strokeText('XIXI', cx, yy);
    const gr = g.createLinearGradient(0, yy - 120, 0, yy + 120); gr.addColorStop(0, '#fff07a'); gr.addColorStop(.45, '#ffd21a'); gr.addColorStop(1, '#f5a800');
    g.fillStyle = gr; g.fillText('XIXI', cx, yy);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '252px Mont';
    g.save(); g.beginPath(); g.rect(0, yy - 120, W, 70); g.clip(); g.globalCompositeOperation = 'source-atop'; g.restore();
    // linha 3 (ajusta para caber)
    let tam = 84; g.font = `${tam}px Mont`;
    while (g.measureText('pode dizer muito sobre a sua saúde!').width > maxW) { tam -= 2; g.font = `${tam}px Mont`; }
    g.fillStyle = '#16314d'; g.fillText('pode dizer muito sobre a sua saúde!', cx, 500);
    // sublinhado ondulado
    g.beginPath(); for (let x = cx - 420; x <= cx + 420; x += 6) g.lineTo(x, 572 + 9 * Math.sin((x - cx) / 40)); g.lineWidth = 10; g.strokeStyle = '#18a4dc'; g.lineCap = 'round'; g.stroke();
  });
  tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const larg = 3.72, alt = larg * A / W;
  placa = new T.Group();
  const frente = new T.Mesh(new T.PlaneGeometry(larg, alt), new T.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .05, roughness: .55 }));
  placa.add(frente);
  const sombra = new T.Mesh(new T.PlaneGeometry(larg, alt), new T.MeshBasicMaterial({ map: tex, transparent: true, color: 0x000000, opacity: .2, alphaTest: .05 }));
  sombra.position.set(.03, -.06, -.04); placa.add(sombra);
  // vasinho sanitario sorridente
  const tv = H.canvasTex(512, (g, s) => {
    g.clearRect(0, 0, s, s); g.lineJoin = 'round'; g.lineCap = 'round';
    g.lineWidth = 16; g.strokeStyle = '#0b2a45'; const lg = g.createLinearGradient(130, 0, 420, 0); lg.addColorStop(0, '#ffffff'); lg.addColorStop(1, '#d9e6ef'); g.fillStyle = lg;
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
  vaso = new T.Mesh(new T.PlaneGeometry(1.08, 1.08), new T.MeshStandardMaterial({ map: tv, transparent: true, alphaTest: .05, roughness: .5 }));
  vaso.position.set(-larg / 2 + .5, -.02, .05); placa.add(vaso);
  // gotas azuis
  const tg = H.canvasTex(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.beginPath(); g.moveTo(128, 18); g.bezierCurveTo(150, 80, 220, 130, 220, 175); g.arc(128, 175, 92, 0, Math.PI); g.bezierCurveTo(36, 130, 106, 80, 128, 18); g.closePath();
    const gr = g.createLinearGradient(0, 20, 0, 270); gr.addColorStop(0, '#7fd0ff'); gr.addColorStop(1, '#1f8fe0');
    g.fillStyle = gr; g.fill(); g.lineWidth = 10; g.strokeStyle = '#ffffff'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(95, 160, 18, 34, -.4, 0, 6.283); g.fill();
  });
  tg.colorSpace = T.SRGBColorSpace;
  for (const [x, y, sc, rot] of [[larg / 2 - .05, .42, .34, .45], [larg / 2 + .08, .02, .24, .8], [-larg / 2 - .02, .45, .26, -.5], [larg / 2 - .38, -.5, .2, .2]]) {
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial({ map: tg, transparent: true, alphaTest: .05, roughness: .3 }));
    m.position.set(x, y, .06); m.scale.setScalar(sc); m.rotation.z = rot; m.userData = { x, y, rot }; placa.add(m); gotasPlaca.push(m);
  }
  placa.position.set(0, 2.88, 0);
  cena.add(placa);
}

// ------------------------------------------------------------------ estado de cada gotinha
function estado(i, t) {
  const { clamp, sstep, easeOutBack, bump, squash, piscada, gesto, acenar, bracoCima, mix, REPOUSO } = H;
  const [x, y0, z, ini] = BASE[i];
  const cfg = CFG[i], hp = cfg.segura ? cfg.maoProp : -1;
  const saida = T_SAI + Math.abs(i - 3) * .07;
  const e = { visivel: t >= ini && t < saida + .6, x, y: y0, z, yaw: 0, escala: 1, sx: 1, sy: 1, incl: 0, boca: .32, piscaE: 0, piscaD: 0, olharX: 0, olharY: 0, sobeSobr: 0, alegria: .4, bracoE: { ...REPOUSO }, bracoD: { ...REPOUSO }, maoE: 'aberta', maoD: 'aberta', t };
  if (!e.visivel) return e;
  // surge de baixo (quique) e mergulha de volta quando ele termina de falar
  const u = t - ini;
  e.y = y0 - 1.6 * (1 - easeOutBack(clamp(u / .45), 1.7));
  const v = clamp((t - saida) / .45);
  e.y -= 1.9 * v * v;
  const sq = squash(t - ini - .38);
  e.sy = 1 - sq + .012 * Math.sin(t * 3 + i); e.sx = 1 + sq * .5;
  // olham para ele enquanto fala; para a placa quando ela cai
  const olhaPlaca = bump(t, T_PLACA + .6, .45);
  const olhaEle = clamp(sstep(u > 0 ? ini + .5 : 99, ini + .8, t) - olhaPlaca);
  const paraCentro = Math.max(-.5, Math.min(.5, -x * .35));
  e.yaw = paraCentro * olhaEle * .8 + .05 * Math.sin(t * 1.2 + i * 2);
  e.olharX = Math.sign(-x || 1) * .6 * olhaEle;
  e.olharY = .8 * olhaEle + olhaPlaca;
  e.cabecaX = -.12 * olhaEle - .25 * olhaPlaca;
  e.sobeSobr = olhaPlaca * .8;
  e.incl = .035 * Math.sin(t * 1.8 + i);
  e.piscaE = piscada(t, i); e.piscaD = e.piscaE;
  // boca sempre sorrindo aberta (como os fantoches), "oh!" para a placa
  e.boca = .3 + .08 * Math.sin(t * 1.7 + i * 1.3) + .45 * olhaPlaca;
  if (u < .5) e.boca = .55;
  const BAIXO = { z: .85, x: -.7 };
  if (hp === 0) { e.bracoE = { ...BAIXO }; e.maoE = 'segura'; }
  if (hp === 1) { e.bracoD = { ...BAIXO }; e.maoD = 'segura'; }
  const momento = (a, b, f) => { if (t > a && t < b) f(); };
  momento(1.95, 3.6, () => { if (i === 4) e.bracoE = gesto(t, 1.95, 3.6, { z: .55, x: -2.0 }, BAIXO); });                      // castanha: lupa
  momento(4.6, 6.2, () => { if (i === 5) e.bracoD = gesto(t, 4.6, 6.2, { z: 2.0, x: -.6 }, BAIXO); });                        // esverdeada: termometro
  momento(5.6, 7.2, () => { if (i === 6) e.bracoD = gesto(t, 5.6, 7.2, { z: 2.4, x: -.25 }, BAIXO); });                       // vermelha: alerta
  momento(6.7, 8.3, () => { if (i === 2) { e.bracoD = gesto(t, 6.7, 8.3, { z: 1.85, x: -.45 }); e.maoD = t > 6.85 ? 'joinha' : 'aberta'; if (t > 6.9 && t < 7.8) e.piscaD = 1; } }); // amarela: joinha
  momento(7.2, 8.6, () => { if (i === 0 || i === 1) e.bracoD = gesto(t, 7.2, 8.6, tt => acenar(tt, 2.2, i)); });            // acenam
  momento(7.6, 8.7, () => { if (i === 3) { e.bracoE = gesto(t, 7.6, 8.7, { z: .15, x: -2.3 }); e.maoE = 'segura'; } });      // laranja pensativa
  // tchauzinho antes de mergulhar
  if (t > 8.35) { const c = sstep(8.35, 8.6, t); e.bracoE = mix(e.bracoE, acenar(t, 2.6, i), c * (hp === 0 ? 0 : 1)); e.boca = Math.max(e.boca, .55); }
  return e;
}

export function quadro(t) {
  const { clamp, easeOutBack, sstep } = H;
  G.forEach((g, i) => { g.aplica(estado(i, t)); g.raiz.scale.multiplyScalar(S / .64); });
  // placa cai do alto quicando
  const u = (t - T_PLACA) / .7;
  placa.visible = u > 0;
  placa.position.y = 2.88 + (1 - easeOutBack(clamp(u), 2.2)) * 2.5;
  placa.rotation.z = (1 - clamp(u * 1.4)) * .12 + .012 * Math.sin(t * 2.2);
  placa.rotation.x = .04 * Math.sin(t * 1.7);
  const pulso = 1 + .035 * Math.exp(-Math.max(t - T_PLACA - .5, 0) * 3) * Math.sin((t - T_PLACA) * 20) 
  placa.scale.setScalar(pulso);
  vaso.rotation.z = .1 * Math.sin(t * 5);
  vaso.position.y = .02 + .03 * Math.abs(Math.sin(t * 5));
  gotasPlaca.forEach((m, k) => { const d = m.userData; m.position.y = d.y + .05 * Math.sin(t * 3 + k * 1.7); m.rotation.z = d.rot + .15 * Math.sin(t * 2.4 + k); });
}
