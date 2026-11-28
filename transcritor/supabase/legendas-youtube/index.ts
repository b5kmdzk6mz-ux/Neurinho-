// Transcritor: busca as legendas de um vídeo do YouTube.
// Roda no Supabase (Edge Function "legendas-youtube"), porque o navegador do iPad
// não pode falar direto com o YouTube. Só aceita links do YouTube, para não virar
// um "atalho" aberto para outros sites.
//
// O YouTube costuma bloquear servidores (inclusive o do Supabase). Por isso a função
// tenta, em ordem: o YouTube direto, servidores públicos Invidious e servidores Piped.
// Esses servidores públicos são de voluntários: às vezes saem do ar.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Trecho = { inicio: number; texto: string };
type Achado = { titulo: string; idioma: string; automatica: boolean; trechos: Trecho[]; fonte: string };

const NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const INVIDIOUS_RESERVA = ["https://yt.chocolatemoo53.com", "https://inv.nadeko.net", "https://yewtu.be", "https://invidious.nerdvpn.de", "https://iv.melmac.space"];
const PIPED_RESERVA = ["https://api.piped.private.coffee", "https://pipedapi.kavin.rocks", "https://pipedapi.adminforge.de", "https://pipedapi.reallyaweso.me"];

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function idDoVideo(texto: string): string | null {
  const t = (texto || "").trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  let u: URL;
  try { u = new URL(t.startsWith("http") ? t : "https://" + t); } catch { return null; }
  const h = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (h === "youtu.be") id = u.pathname.slice(1, 12);
  else if (h === "youtube.com" || h === "youtube-nocookie.com") {
    id = u.searchParams.get("v");
    const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
    if (!id && m) id = m[2];
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

async function buscar(url: string, init: RequestInit = {}, ms = 9000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...init, signal: ac.signal }); } finally { clearTimeout(t); }
}

function ehPt(codigo: string) { return (codigo || "").toLowerCase().startsWith("pt"); }

function desfazEntidades(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

function limpa(s: string) {
  return desfazEntidades(s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function segundos(t: string): number {
  t = t.trim();
  if (/^[\d.]+s$/.test(t)) return parseFloat(t);
  if (/^[\d.]+ms$/.test(t)) return parseFloat(t) / 1000;
  const p = t.replace(",", ".").split(":").map(Number);
  return p.reduce((a, b) => a * 60 + b, 0);
}

// Legendas automáticas repetem a linha anterior a cada trecho; aqui tiramos as repetições.
function semRepeticao(lista: Trecho[]): Trecho[] {
  const fora: Trecho[] = [];
  let ultima = "";
  for (const t of lista) {
    const linhas = t.texto.split("\n").map((l) => l.trim()).filter(Boolean);
    const novas = linhas.filter((l) => l !== ultima);
    if (!novas.length) continue;
    ultima = linhas[linhas.length - 1];
    const texto = novas.join(" ").replace(/\s+/g, " ").trim();
    if (texto) fora.push({ inicio: t.inicio, texto });
  }
  return fora;
}

function lerVtt(vtt: string): Trecho[] {
  const lista: Trecho[] = [];
  for (const bloco of vtt.replace(/\r/g, "").split(/\n\n+/)) {
    const linhas = bloco.split("\n");
    const i = linhas.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const inicio = segundos(linhas[i].split("-->")[0]);
    const texto = linhas.slice(i + 1).map(limpa).filter(Boolean).join("\n");
    if (texto) lista.push({ inicio, texto });
  }
  return semRepeticao(lista);
}

function lerXml(xml: string): Trecho[] {
  const lista: Trecho[] = [];
  for (const m of xml.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)) {
    const texto = limpa(desfazEntidades(m[2]));
    if (texto) lista.push({ inicio: +m[1], texto });
  }
  for (const m of xml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const a = m[1];
    const b = a.match(/begin="([^"]+)"/);
    const t = a.match(/\bt="(\d+)"/);
    const inicio = b ? segundos(b[1]) : t ? +t[1] / 1000 : 0;
    const texto = limpa(m[2].replace(/<br\s*\/?>/gi, "\n"));
    if (texto) lista.push({ inicio, texto });
  }
  return semRepeticao(lista);
}

function lerJson3(txt: string): Trecho[] {
  const j = JSON.parse(txt);
  const lista: Trecho[] = [];
  for (const ev of j.events || []) {
    if (!ev.segs) continue;
    const texto = ev.segs.map((s: { utf8?: string }) => s.utf8 || "").join("").replace(/\s+/g, " ").trim();
    if (texto) lista.push({ inicio: (ev.tStartMs || 0) / 1000, texto });
  }
  return lista;
}

function lerQualquer(txt: string): Trecho[] {
  const t = txt.trim();
  if (t.startsWith("{")) { try { return lerJson3(t); } catch { return []; } }
  if (t.startsWith("WEBVTT")) return lerVtt(t);
  if (t.startsWith("<")) return lerXml(t);
  return [];
}

// ---------- 1) YouTube direto ----------
async function peloYoutube(id: string): Promise<Achado | null> {
  const clientes = [
    { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 34, ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip" },
    { clientName: "WEB", clientVersion: "2.20250312.04.00", ua: NAVEGADOR },
  ];
  for (const c of clientes) {
    try {
      const { ua, ...client } = c;
      const r = await buscar("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": ua },
        body: JSON.stringify({ videoId: id, context: { client: { ...client, hl: "pt", gl: "BR" } } }),
      }, 7000);
      if (!r.ok) return null; // bloqueado: nem tenta o próximo
      const j = await r.json();
      const faixas = j?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      if (!faixas.length) continue;
      const f = faixas.find((x: any) => ehPt(x.languageCode) && x.kind !== "asr") || faixas.find((x: any) => ehPt(x.languageCode)) || faixas[0];
      const pt = ehPt(f.languageCode);
      const base = String(f.baseUrl).replace(/&fmt=[^&]*/, "");
      let trechos: Trecho[] = [];
      if (!pt) trechos = lerQualquer(await (await buscar(base + "&tlang=pt&fmt=json3", { headers: { "User-Agent": NAVEGADOR } })).text());
      const traduzida = trechos.length > 0;
      if (!trechos.length) trechos = lerQualquer(await (await buscar(base + "&fmt=json3", { headers: { "User-Agent": NAVEGADOR } })).text());
      if (trechos.length) {
        return { titulo: j?.videoDetails?.title || "", idioma: traduzida ? "pt (traduzida)" : f.languageCode, automatica: f.kind === "asr", trechos, fonte: "YouTube" };
      }
    } catch { /* tenta o próximo */ }
  }
  return null;
}

// ---------- 2) Invidious ----------
async function listaInvidious(): Promise<string[]> {
  try {
    const r = await buscar("https://api.invidious.io/instances.json?sort_by=health", {}, 5000);
    const j = await r.json();
    const l = j.filter((x: any) => x[1]?.api && x[1]?.type === "https").map((x: any) => x[1].uri as string);
    return [...new Set([...l, ...INVIDIOUS_RESERVA])];
  } catch { return INVIDIOUS_RESERVA; }
}

async function peloInvidious(base: string, id: string): Promise<Achado | null> {
  const r = await buscar(`${base}/api/v1/captions/${id}`, {}, 8000);
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  const faixas: { label: string; languageCode: string; url: string }[] = j?.captions || [];
  if (!faixas.length) return null;
  const auto = (f: { label: string }) => /auto/i.test(f.label);
  const f = faixas.find((x) => ehPt(x.languageCode) && !auto(x)) || faixas.find((x) => ehPt(x.languageCode)) ||
    faixas.find((x) => !auto(x)) || faixas[0];
  const url = f.url.startsWith("http") ? f.url : base + f.url;
  const r2 = await buscar(url, {}, 10000);
  if (!r2.ok) return null;
  const trechos = lerQualquer(await r2.text());
  if (!trechos.length) return null;
  let titulo = "";
  try {
    const v = await buscar(`${base}/api/v1/videos/${id}?fields=title`, {}, 4000);
    titulo = (await v.json())?.title || "";
  } catch { /* sem título */ }
  return { titulo, idioma: f.languageCode, automatica: auto(f), trechos, fonte: "Invidious" };
}

// ---------- 3) Piped ----------
async function peloPiped(base: string, id: string): Promise<Achado | null> {
  const r = await buscar(`${base}/streams/${id}`, {}, 9000);
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  const faixas: { url: string; code: string; autoGenerated: boolean }[] = j?.subtitles || [];
  if (!faixas.length) return null;
  const f = faixas.find((x) => ehPt(x.code) && !x.autoGenerated) || faixas.find((x) => ehPt(x.code)) ||
    faixas.find((x) => !x.autoGenerated) || faixas[0];
  const r2 = await buscar(f.url, {}, 10000);
  if (!r2.ok) return null;
  const trechos = lerQualquer(await r2.text());
  if (!trechos.length) return null;
  return { titulo: j?.title || "", idioma: f.code, automatica: !!f.autoGenerated, trechos, fonte: "Piped" };
}

// Tenta vários servidores ao mesmo tempo, em grupos, e fica com o primeiro que der certo.
async function primeiroQueDer(tarefas: (() => Promise<Achado | null>)[], grupo = 4): Promise<Achado | null> {
  for (let i = 0; i < tarefas.length; i += grupo) {
    const lote = tarefas.slice(i, i + grupo).map((t) =>
      t().then((a) => (a ? a : Promise.reject(new Error("vazio"))))
    );
    try { return await Promise.any(lote); } catch { /* próximo grupo */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resposta({ erro: "metodo", mensagem: "Use POST." }, 405);

  let link = "";
  try { link = String((await req.json())?.link || "").slice(0, 300); } catch { /* vazio */ }
  const id = idDoVideo(link);
  if (!id) return resposta({ erro: "link_invalido", mensagem: "Esse link não parece ser de um vídeo do YouTube." }, 400);

  try {
    let achado = await peloYoutube(id);
    if (!achado) {
      const inv = (await listaInvidious()).slice(0, 8);
      achado = await primeiroQueDer([
        ...inv.map((b) => () => peloInvidious(b, id)),
        ...PIPED_RESERVA.map((b) => () => peloPiped(b, id)),
      ]);
    }
    if (!achado) {
      return resposta({
        erro: "sem_legenda",
        mensagem: "Não consegui as legendas desse vídeo. Ou ele não tem legenda, ou o YouTube bloqueou os servidores agora.",
      }, 404);
    }
    return resposta({ id, ...achado });
  } catch (e) {
    return resposta({ erro: "falha", mensagem: "Não consegui buscar as legendas agora. Tente de novo em alguns minutos.", detalhe: String(e).slice(0, 200) }, 502);
  }
});
