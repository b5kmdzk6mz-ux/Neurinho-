// Renderiza a vinheta: node render.js [--previa t1,t2,...] [--w 1920 --h 1080] [--fps 24] [--de 0 --ate 30]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg('w', 1920), H = +arg('h', 1080), FPS = +arg('fps', 24), DE = +arg('de', 0), ATE = +arg('ate', 30);
const previa = arg('previa', null), saida = arg('saida', 'saida/video_mudo.mp4');
const raiz = __dirname;
const tipos = { '.js': 'text/javascript', '.html': 'text/html', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => {
  const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(raiz) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
(async () => {
  const porta = srv.address().port;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  p.on('console', m => console.log('[pagina]', m.text()));
  p.on('pageerror', e => { console.error('ERRO', e); process.exit(1); });
  await p.goto(`http://127.0.0.1:${porta}/cena.html?w=${W}&h=${H}&ocultar=${arg("ocultar","")}&modo=${arg("modo","vinheta")}`);
  await p.waitForFunction('window.ready === true', null, { timeout: 120000 });
  fs.mkdirSync(path.join(raiz, 'quadros'), { recursive: true }); fs.mkdirSync(path.join(raiz, 'saida'), { recursive: true });
  if (previa) {
    for (const t of previa.split(',').map(Number)) {
      const t0 = Date.now();
      const d = await p.evaluate(t => window.renderFrame(t, .9), t);
      const ext = d.startsWith('data:image/png') ? 'png' : 'jpg';
      fs.writeFileSync(path.join(raiz, 'quadros', `t${t.toFixed(2).padStart(6, '0')}.${ext}`), Buffer.from(d.split(',')[1], 'base64'));
      console.log('t', t, (Date.now() - t0) + 'ms');
    }
  } else if (arg('modo', '') === 'integrado') {
    const pasta = path.join(raiz, 'quadros_integ'); fs.mkdirSync(pasta, { recursive: true });
    const n0 = Math.round(DE * FPS), n1 = Math.round(ATE * FPS), ini = Date.now();
    for (let n = n0; n < n1; n++) {
      const d = await p.evaluate(t => window.renderFrame(t), n / FPS);
      fs.writeFileSync(path.join(pasta, `f${String(n).padStart(4, '0')}.png`), Buffer.from(d.split(',')[1], 'base64'));
      if (n % 30 === 0) { const el = (Date.now() - ini) / 1000, feito = n - n0 + 1; console.log(`quadro ${n}/${n1} | ${(el / feito).toFixed(2)} s/quadro`); }
    }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', FPS, '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', FPS, path.join(raiz, saida)], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n0 = Math.round(DE * FPS), n1 = Math.round(ATE * FPS), ini = Date.now();
    for (let n = n0; n < n1; n++) {
      const d = await p.evaluate(t => window.renderFrame(t, .95), n / FPS);
      if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (n % 24 === 0) { const el = (Date.now() - ini) / 1000, feito = n - n0 + 1; console.log(`quadro ${n}/${n1} | ${(el / feito).toFixed(2)} s/quadro | falta ~${((n1 - n) * el / feito / 60).toFixed(1)} min`); }
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close(); srv.close();
})();
