/* Transcritor: o "motor" que ouve o áudio e escreve o texto (Whisper, rodando no próprio aparelho).
   Fica num worker separado para a tela não travar enquanto ele trabalha. */
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

env.allowLocalModels = false;

const TAXA = 16000;
let asr = null, chave = '', motor = '';
let cancelado = false;

const MODELOS = {
  rapido: 'onnx-community/whisper-base',
  preciso: 'onnx-community/whisper-small',
};

async function temWebGPU() {
  try { return !!(navigator.gpu && await navigator.gpu.requestAdapter()); } catch { return false; }
}

function avisaDownload() {
  const arquivos = {};
  return (p) => {
    if (p.status === 'progress' && p.total) {
      arquivos[p.file] = { l: p.loaded, t: p.total };
      let l = 0, t = 0;
      for (const k in arquivos) { l += arquivos[k].l; t += arquivos[k].t; }
      postMessage({ tipo: 'baixando', feito: l, total: t });
    }
  };
}

async function carregar(qual, forcarWasm) {
  const modelo = MODELOS[qual] || MODELOS.rapido;
  const usarGPU = !forcarWasm && await temWebGPU();
  const k = modelo + (usarGPU ? ':gpu' : ':wasm');
  if (asr && chave === k) return;
  if (asr) { try { await asr.dispose(); } catch {} asr = null; }
  postMessage({ tipo: 'status', texto: 'Preparando o modelo…' });
  const progress_callback = avisaDownload();
  if (usarGPU) {
    try {
      asr = await pipeline('automatic-speech-recognition', modelo, {
        device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, progress_callback,
      });
      chave = k; motor = 'placa de vídeo (rápido)';
      return;
    } catch (e) {
      console.warn('WebGPU falhou, usando o modo comum', e);
    }
  }
  asr = await pipeline('automatic-speech-recognition', modelo, { device: 'wasm', dtype: 'q8', progress_callback });
  chave = modelo + ':wasm'; motor = 'processador (modo comum)';
}

function rms(a, ini, fim) {
  let s = 0;
  for (let i = ini; i < fim; i++) s += a[i] * a[i];
  return Math.sqrt(s / Math.max(1, fim - ini));
}

/* Corta o áudio em pedaços de até ~29 s, sempre num momento de silêncio,
   para não partir uma palavra ao meio. */
function pedacos(audio) {
  const lista = [];
  const max = Math.floor(29 * TAXA), min = Math.floor(22 * TAXA), passo = Math.floor(0.05 * TAXA);
  let ini = 0;
  while (ini < audio.length) {
    let fim = Math.min(audio.length, ini + max);
    if (fim < audio.length) {
      let melhor = fim, menor = Infinity;
      for (let p = ini + min; p + passo <= fim; p += passo) {
        const e = rms(audio, p, p + passo);
        if (e < menor) { menor = e; melhor = p + (passo >> 1); }
      }
      fim = melhor;
    }
    lista.push([ini, fim]);
    ini = fim;
  }
  return lista;
}

/* O Whisper às vezes "inventa" frases em trechos de silêncio ou repete a mesma frase em loop. */
function limpaTexto(t) {
  t = (t || '').replace(/\s+/g, ' ').trim();
  if (/^[\[(].*[\])]$/.test(t)) return '';
  if (/^(legendas? (pela|por)|obrigad[oa] por assistir|inscreva-se|amara\.org)/i.test(t)) return '';
  const frases = t.split(/(?<=[.!?])\s+/);
  const fora = [];
  for (const f of frases) if (fora.filter((x) => x === f).length < 2) fora.push(f);
  return fora.join(' ');
}

async function transcrever(audio, idioma) {
  const lista = pedacos(audio);
  const opcoes = { return_timestamps: true, task: 'transcribe' };
  if (idioma && idioma !== 'auto') opcoes.language = idioma;
  const total = audio.length / TAXA;
  for (let i = 0; i < lista.length; i++) {
    if (cancelado) { postMessage({ tipo: 'cancelado' }); return; }
    const [ini, fim] = lista[i];
    const trecho = audio.subarray(ini, fim);
    const base = ini / TAXA;
    if (rms(trecho, 0, trecho.length) < 0.003) { // silêncio: nem manda para o Whisper
      postMessage({ tipo: 'progresso', feito: fim / TAXA, total });
      continue;
    }
    const r = await asr(trecho, opcoes);
    const partes = (r.chunks && r.chunks.length) ? r.chunks : [{ text: r.text, timestamp: [0, null] }];
    const trechos = [];
    for (const c of partes) {
      const texto = limpaTexto(c.text);
      if (texto) trechos.push({ inicio: base + ((c.timestamp && c.timestamp[0]) || 0), texto });
    }
    postMessage({ tipo: 'trechos', trechos, feito: fim / TAXA, total });
  }
  postMessage({ tipo: 'fim', motor });
}

onmessage = async (e) => {
  const m = e.data;
  if (m.tipo === 'cancelar') { cancelado = true; return; }
  if (m.tipo !== 'transcrever') return;
  cancelado = false;
  try {
    await carregar(m.modelo, false);
    postMessage({ tipo: 'pronto', motor });
    try {
      await transcrever(m.audio, m.idioma);
    } catch (err) {
      if (chave.endsWith(':gpu')) { // a placa de vídeo falhou no meio: tenta de novo no modo comum
        console.warn('erro na GPU, repetindo no modo comum', err);
        await carregar(m.modelo, true);
        postMessage({ tipo: 'recomecar', motor });
        await transcrever(m.audio, m.idioma);
      } else throw err;
    }
  } catch (err) {
    postMessage({ tipo: 'erro', texto: String(err && err.message || err) });
  }
};
