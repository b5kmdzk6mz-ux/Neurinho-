#!/usr/bin/env python3
"""Estudio de edicao de video com IA (ffmpeg + Whisper).

Fluxo:
  python3 estudio/estudio.py novo meu-video          # cria a pasta do projeto
  (coloque os videos em estudio/projetos/meu-video/entrada/)
  python3 estudio/estudio.py analisar meu-video      # transcreve, mede audio, gera folha de quadros
  python3 estudio/estudio.py autocortes meu-video    # rascunho de cortes (tira pausas)
  (ajuste o projeto.json: cortes, textos, abertura, musica...)
  python3 estudio/estudio.py render meu-video --previa
  python3 estudio/estudio.py render meu-video

Tudo e controlado pelo arquivo projeto.json de cada projeto (veja README.md).
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PROJETOS = RAIZ / "projetos"
FONTES = RAIZ / "fontes"
MODELO = Path(os.environ.get("ESTUDIO_MODELO", RAIZ / "modelos" / "whisper-small"))
EXT_VIDEO = {".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi", ".3gp", ".mts"}
EXT_AUDIO = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus", ".flac"}
FPS = 30
FORMATOS = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080), "4:5": (1080, 1350)}
VICIOS = {"ahn", "ãh", "hã", "hum", "hmm", "humm", "eh", "éé", "ééé", "ã", "uhm", "hm"}


# ---------------------------------------------------------------- utilidades
def log(*a):
    print("»", *a, flush=True)


def rodar(cmd, quieto=True):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write("\nComando falhou:\n" + " ".join(map(str, cmd)) + "\n" + r.stderr[-4000:] + "\n")
        sys.exit(1)
    if not quieto:
        print(r.stdout)
    return r


def ffmpeg(args):
    return rodar(["ffmpeg", "-hide_banner", "-y", "-loglevel", "error", *map(str, args)])


def sonda(arq):
    r = rodar(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(arq)])
    d = json.loads(r.stdout)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    info = {"duracao": float(d["format"].get("duration", 0)), "tem_audio": a is not None, "tem_video": v is not None}
    if v:
        w, h = int(v["width"]), int(v["height"])
        rot = 0
        for sd in v.get("side_data_list", []) or []:
            if "rotation" in sd:
                rot = int(sd["rotation"])
        rot = int(v.get("tags", {}).get("rotate", rot))
        if abs(rot) % 180 == 90:
            w, h = h, w
        num, den = (v.get("avg_frame_rate") or "0/1").split("/")
        info.update(largura=w, altura=h, fps=round(float(num) / float(den), 2) if float(den) else 0,
                    codec=v.get("codec_name"))
    if a:
        info.update(audio_codec=a.get("codec_name"), canais=a.get("channels"))
    return info


def tempo_fmt(t):
    m, s = divmod(max(t, 0), 60)
    return f"{int(m):02d}:{s:05.2f}"


def carregar_projeto(nome):
    pasta = PROJETOS / nome
    if not pasta.exists():
        sys.exit(f"Projeto '{nome}' nao existe. Crie com: estudio.py novo {nome}")
    arq = pasta / "projeto.json"
    proj = json.loads(arq.read_text(encoding="utf-8")) if arq.exists() else {}
    return pasta, proj


def salvar_projeto(pasta, proj):
    (pasta / "projeto.json").write_text(json.dumps(proj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def videos_de(pasta):
    return sorted(p for p in (pasta / "entrada").iterdir() if p.suffix.lower() in EXT_VIDEO | EXT_AUDIO)


def achar_midia(pasta, nome):
    for base in (pasta / "entrada", pasta / "midia", pasta, RAIZ.parent):
        p = base / nome
        if p.exists():
            return p
    sys.exit(f"Arquivo nao encontrado: {nome} (procurei em entrada/, midia/ e na raiz do repositorio)")


# ---------------------------------------------------------------- novo
MODELO_PROJETO = {
    "titulo": "Meu video",
    "formatos": ["16:9"],
    "enquadramento": "desfocar",
    "estilo": {
        "cor_destaque": "#FFD23F",
        "cor_fundo": "#0B1F3A",
        "cor_texto": "#FFFFFF",
        "fonte_titulo": "Montserrat ExtraBold",
        "fonte_texto": "Open Sans",
    },
    "abertura": {"ativo": False, "titulo": "Titulo do trabalho", "subtitulo": "Nome da disciplina", "logo": "", "duracao": 3.5},
    "encerramento": {"ativo": False, "titulo": "Obrigado!", "subtitulo": "Nomes do grupo", "logo": "", "duracao": 4},
    "legendas": {"ativo": True, "estilo": "destaque", "max_palavras": 0, "posicao": "auto", "correcoes": {}},
    "audio": {"reduzir_ruido": True, "normalizar": True, "musica": "", "volume_musica": 0.12},
    "clipes": [],
    "textos": [],
    "imagens": [],
}


def cmd_novo(a):
    pasta = PROJETOS / a.nome
    for sub in ("entrada", "midia", "analise", "saida"):
        (pasta / sub).mkdir(parents=True, exist_ok=True)
    if not (pasta / "projeto.json").exists():
        p = json.loads(json.dumps(MODELO_PROJETO))
        p["titulo"] = a.nome.replace("-", " ").title()
        salvar_projeto(pasta, p)
    log(f"Projeto criado em {pasta}")
    log("Coloque os videos brutos em entrada/ e imagens/musica/logo em midia/")


# ---------------------------------------------------------------- analise
_modelo_cache = None


def transcrever(arq):
    global _modelo_cache
    import numpy as np
    from faster_whisper import WhisperModel

    if not (MODELO / "model.bin").exists():
        sys.exit("Modelo Whisper nao encontrado. Rode: bash estudio/baixar_modelo.sh")
    if _modelo_cache is None:
        _modelo_cache = WhisperModel(str(MODELO), device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(arq), "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, np.float32)
    segs, _ = _modelo_cache.transcribe(audio, language="pt", word_timestamps=True, vad_filter=False,
                                       condition_on_previous_text=False, beam_size=5)
    saida = []
    for s in segs:
        saida.append({
            "inicio": round(s.start, 3), "fim": round(s.end, 3), "texto": s.text.strip(),
            "palavras": [{"p": w.word.strip(), "i": round(w.start, 3), "f": round(w.end, 3), "c": round(w.probability, 2)}
                         for w in (s.words or []) if w.word.strip()],
        })
    return saida


def silencios(arq, limiar_db=-35, minimo=0.5):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(arq), "-vn", "-af",
                        f"silencedetect=noise={limiar_db}dB:d={minimo}", "-f", "null", "-"],
                       capture_output=True, text=True)
    ini, out = None, []
    for ln in r.stderr.splitlines():
        m = re.search(r"silence_start: ([\d.]+)", ln)
        if m:
            ini = float(m.group(1))
        m = re.search(r"silence_end: ([\d.]+)", ln)
        if m and ini is not None:
            out.append([round(ini, 2), round(float(m.group(1)), 2)])
            ini = None
    return out


def volume(arq):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(arq), "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    lufs = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    pico = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r.stderr)
    return {"lufs": float(lufs[-1]) if lufs else None, "pico_dbfs": float(pico[-1]) if pico else None}


def folha_quadros(arq, destino, dur, colunas=4):
    passo = max(1.0, dur / 24)
    n = int(dur // passo) + 1
    linhas = (n + colunas - 1) // colunas
    fonte = FONTES / "OpenSans-Bold.ttf"
    vf = (f"fps=1/{passo},scale=360:-2,"
          f"drawtext=fontfile='{fonte}':text='%{{pts\\:hms}}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6,"
          f"tile={colunas}x{linhas}:padding=4:color=black")
    ffmpeg(["-i", arq, "-vf", vf, "-frames:v", 1, "-q:v", 3, destino])
    return passo


def cmd_analisar(a):
    pasta, proj = carregar_projeto(a.nome)
    an = pasta / "analise"
    an.mkdir(exist_ok=True)
    resumo = [f"# Analise do projeto {a.nome}\n"]
    arquivos = videos_de(pasta)
    if not arquivos:
        sys.exit("Nenhum video em entrada/.")
    for arq in arquivos:
        if a.video and arq.name != a.video:
            continue
        log(f"Analisando {arq.name}")
        info = sonda(arq)
        info["arquivo"] = arq.name
        tr_arq = an / f"{arq.stem}.transcricao.json"
        if tr_arq.exists() and not a.refazer:
            tr = json.loads(tr_arq.read_text(encoding="utf-8"))
            log("  transcricao ja existe (use --refazer para refazer)")
        elif info["tem_audio"]:
            log("  transcrevendo (pode levar alguns minutos)...")
            tr = transcrever(arq)
            tr_arq.write_text(json.dumps(tr, ensure_ascii=False, indent=1), encoding="utf-8")
        else:
            tr = []
        info["silencios"] = silencios(arq) if info["tem_audio"] else []
        info["audio"] = volume(arq) if info["tem_audio"] else {}
        if info["tem_video"]:
            info["passo_quadros"] = folha_quadros(arq, an / f"{arq.stem}.quadros.jpg", info["duracao"])
        (an / f"{arq.stem}.info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")

        # roteiro legivel e legenda .srt
        rot = [f"# {arq.name} | {tempo_fmt(info['duracao'])} | {info.get('largura')}x{info.get('altura')}\n"]
        srt = []
        for n, s in enumerate(tr, 1):
            duvida = [w["p"] for w in s["palavras"] if w["c"] < 0.5]
            extra = f"   (duvida: {', '.join(duvida)})" if duvida else ""
            rot.append(f"[{s['inicio']:8.2f} - {s['fim']:8.2f}] {s['texto']}{extra}")
            srt.append(f"{n}\n{srt_t(s['inicio'])} --> {srt_t(s['fim'])}\n{s['texto']}\n")
        (an / f"{arq.stem}.roteiro.txt").write_text("\n".join(rot) + "\n", encoding="utf-8")
        (an / f"{arq.stem}.srt").write_text("\n".join(srt), encoding="utf-8")

        falado = sum(s["fim"] - s["inicio"] for s in tr)
        au = info["audio"]
        resumo.append(f"## {arq.name}\n- Duracao: {tempo_fmt(info['duracao'])} | resolucao {info.get('largura')}x{info.get('altura')} @ {info.get('fps')} fps")
        resumo.append(f"- Fala: {tempo_fmt(falado)} | pausas >0,5s: {len(info['silencios'])} | volume {au.get('lufs')} LUFS, pico {au.get('pico_dbfs')} dBFS")
        resumo.append(f"- Arquivos: {arq.stem}.roteiro.txt, {arq.stem}.quadros.jpg\n")
    (an / "RESUMO.md").write_text("\n".join(resumo) + "\n", encoding="utf-8")
    print("\n".join(resumo))


def srt_t(t):
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"


# ---------------------------------------------------------------- autocortes
def carregar_palavras(pasta, video):
    arq = pasta / "analise" / f"{Path(video).stem}.transcricao.json"
    if not arq.exists():
        return []
    out = []
    for s in json.loads(arq.read_text(encoding="utf-8")):
        out.extend(s["palavras"])
    return out


def cmd_autocortes(a):
    pasta, proj = carregar_projeto(a.nome)
    clipes = []
    for arq in videos_de(pasta):
        if a.video and arq.name != a.video:
            continue
        dur = sonda(arq)["duracao"]
        palavras = [w for w in carregar_palavras(pasta, arq.name)
                    if not (a.tirar_vicios and w["p"].lower().strip(".,!?…") in VICIOS)]
        if not palavras:
            log(f"{arq.name}: sem transcricao, rode 'analisar' antes")
            continue
        blocos = []
        for w in palavras:
            if blocos and w["i"] - blocos[-1][1] <= a.pausa:
                blocos[-1][1] = w["f"]
            else:
                blocos.append([w["i"], w["f"]])
        for i, f in blocos:
            ini, fim = max(0.0, i - a.margem), min(dur, f + a.margem + 0.08)
            if clipes and clipes[-1]["video"] == arq.name and ini <= clipes[-1]["fim"]:
                clipes[-1]["fim"] = round(fim, 2)
            else:
                clipes.append({"video": arq.name, "inicio": round(ini, 2), "fim": round(fim, 2)})
        antes = dur
        depois = sum(c["fim"] - c["inicio"] for c in clipes if c["video"] == arq.name)
        log(f"{arq.name}: {tempo_fmt(antes)} -> {tempo_fmt(depois)} ({len(blocos)} trechos)")
    proj["clipes"] = clipes
    salvar_projeto(pasta, proj)
    log(f"{len(clipes)} clipes gravados em projeto.json")


# ---------------------------------------------------------------- quadros
def cmd_quadros(a):
    pasta, _ = carregar_projeto(a.nome)
    arq = achar_midia(pasta, a.video)
    dest = pasta / "analise" / "quadros"
    dest.mkdir(parents=True, exist_ok=True)
    for t in a.tempos:
        out = dest / f"{arq.stem}_{float(t):07.2f}.jpg"
        ffmpeg(["-ss", t, "-i", arq, "-frames:v", 1, "-vf", "scale=960:-2", "-q:v", 3, out])
        print(out)


# ---------------------------------------------------------------- ASS (textos e legendas)
def cor_ass(hexcor, alfa=0):
    h = hexcor.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H{alfa:02X}{b}{g}{r}".upper()


def esc_ass(t):
    return str(t).replace("\\", "\\\\").replace("{", "(").replace("}", ")").replace("\n", "\\N")


def ass_t(t):
    t = max(t, 0)
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def ass_cabecalho(W, H, est):
    k = min(W, H) / 1080
    vert = H > W
    dest, txt, fundo = est.get("cor_destaque", "#FFD23F"), est.get("cor_texto", "#FFFFFF"), est.get("cor_fundo", "#0B1F3A")
    ft, fx = est.get("fonte_titulo", "Montserrat ExtraBold"), est.get("fonte_texto", "Open Sans")
    leg_tam = int((est.get("tamanho_legenda") or (74 if vert else 62)) * k)
    leg_mv = int(H * 0.27) if vert else int(70 * k)
    preto = "&H00000000"
    sombra = "&H80000000"
    estilos = [
        # Name, Font, Size, Primary, Secondary, Outline, Back, Bold, Italic, U, S, ScX, ScY, Sp, Ang, BorderStyle, Outline, Shadow, Align, ML, MR, MV
        ("Legenda", ft, leg_tam, cor_ass(txt), cor_ass(dest), preto, sombra, 0, 0, 0, 0, 100, 100, 0, 0, 1, max(3, int(6 * k)), int(2 * k), 2, int(60 * k), int(60 * k), leg_mv),
        ("Titulo", ft, int(92 * k), cor_ass(txt), cor_ass(dest), preto, sombra, 0, 0, 0, 0, 100, 100, 0, 0, 1, int(6 * k), int(3 * k), 5, int(80 * k), int(80 * k), int(80 * k)),
        ("Destaque", ft, int(64 * k), cor_ass(fundo), cor_ass(txt), cor_ass(dest), sombra, 0, 0, 0, 0, 100, 100, 0, 0, 3, int(18 * k), 0, 8, int(80 * k), int(80 * k), int((260 if vert else 90) * k)),
        ("Nome", fx, int(46 * k), cor_ass(txt), cor_ass(dest), cor_ass(fundo, 0x20), sombra, 1, 0, 0, 0, 100, 100, 0, 0, 3, int(16 * k), 0, 1, int(70 * k), int(70 * k), int((420 if vert else 120) * k)),
        ("Info", fx, int(42 * k), cor_ass(txt), cor_ass(dest), preto, sombra, 1, 0, 0, 0, 100, 100, 0, 0, 1, int(4 * k), int(2 * k), 8, int(70 * k), int(70 * k), int(60 * k)),
        ("CartaoTitulo", ft, int((96 if vert else 104) * k), cor_ass(txt), cor_ass(dest), preto, "&HFF000000", 0, 0, 0, 0, 100, 100, 0, 0, 1, 0, 0, 5, int(90 * k), int(90 * k), 0),
        ("CartaoSub", fx, int(48 * k), cor_ass(dest), cor_ass(txt), preto, "&HFF000000", 1, 0, 0, 0, 100, 100, 1, 0, 1, 0, 0, 5, int(90 * k), int(90 * k), 0),
    ]
    linhas = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 0",
              "ScaledBorderAndShadow: yes", "", "[V4+ Styles]",
              "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
              "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"]
    for e in estilos:
        linhas.append("Style: " + ",".join(map(str, e)) + ",1")
    linhas += ["", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    return linhas


def ass_evento(ini, fim, estilo, texto, camada=0):
    return f"Dialogue: {camada},{ass_t(ini)},{ass_t(fim)},{estilo},,0,0,0,,{texto}"


def grupos_legenda(palavras, maxp, maxc):
    grupos, atual = [], []
    for w in palavras:
        if atual:
            gap = w["i"] - atual[-1]["f"]
            texto = " ".join(x["p"] for x in atual + [w])
            if len(atual) >= maxp or len(texto) > maxc or gap > 0.6 or re.search(r"[.!?…]$", atual[-1]["p"]):
                grupos.append(atual)
                atual = []
        atual.append(w)
    if atual:
        grupos.append(atual)
    return grupos


def eventos_legenda(palavras, cfg, est, vert):
    if not palavras:
        return []
    maxp = cfg.get("max_palavras") or (3 if vert else 7)
    maxc = 22 if vert else 44
    caixa_alta = cfg.get("caixa_alta", vert)
    dest = cor_ass(est.get("cor_destaque", "#FFD23F"))
    branco = cor_ass(est.get("cor_texto", "#FFFFFF"))
    pos = ""
    if cfg.get("posicao") == "centro":
        pos = "{\\an5}"
    elif cfg.get("posicao") == "topo":
        pos = "{\\an8}"
    ev = []
    for g in grupos_legenda(palavras, maxp, maxc):
        txt = [esc_ass(w["p"].upper() if caixa_alta else w["p"]) for w in g]
        g_ini, g_fim = g[0]["i"], g[-1]["f"] + 0.12
        if cfg.get("estilo", "destaque") == "simples":
            ev.append(ass_evento(g_ini, g_fim, "Legenda", pos + " ".join(txt)))
            continue
        for k, w in enumerate(g):
            ini = g_ini if k == 0 else w["i"]
            fim = g[k + 1]["i"] if k + 1 < len(g) else g_fim
            if fim <= ini:
                continue
            partes = [(f"{{\\c{dest}}}{t}{{\\c{branco}}}" if j == k else t) for j, t in enumerate(txt)]
            ev.append(ass_evento(ini, fim, "Legenda", pos + " ".join(partes)))
    return ev


def eventos_texto(t, ini, fim):
    estilo = {"titulo": "Titulo", "destaque": "Destaque", "nome": "Nome", "info": "Info"}.get(t.get("estilo", "destaque"), "Destaque")
    pos = {"topo": "\\an8", "centro": "\\an5", "baixo": "\\an2"}.get(t.get("posicao", ""), "")
    txt = esc_ass(t["texto"])
    if t.get("subtexto"):
        txt += "\\N{\\b0\\fscx80\\fscy80}" + esc_ass(t["subtexto"])
    anim = "\\fad(250,250)"
    if estilo in ("Titulo", "Destaque"):
        anim += "\\t(0,220,\\fscx104\\fscy104)\\t(220,380,\\fscx100\\fscy100)"
    return [ass_evento(ini, fim, estilo, "{" + pos + anim + "}" + txt, camada=2)]


# ---------------------------------------------------------------- render
def filtro_enquadrar(W, H, modo, zoom=1.0, foco=0.5):
    pre = f"crop=iw/{zoom}:ih/{zoom}," if zoom and zoom != 1 else ""
    if modo == "cortar":
        return (f"{pre}scale={W}:{H}:force_original_aspect_ratio=increase,"
                f"crop={W}:{H}:(iw-{W})*{foco}:(ih-{H})/2,setsar=1")
    if modo == "barras":
        return f"{pre}scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1"
    # desfocar: fundo ampliado e borrado + video inteiro por cima
    return (f"{pre}split[a][b];[a]scale={W // 4}:{H // 4}:force_original_aspect_ratio=increase,crop={W // 4}:{H // 4},"
            f"boxblur=12:2,eq=brightness=-0.08,scale={W}:{H}[fundo];"
            f"[b]scale={W}:{H}:force_original_aspect_ratio=decrease[frente];[fundo][frente]overlay=(W-w)/2:(H-h)/2,setsar=1")


def enc_inter(previa):
    return ["-c:v", "libx264", "-preset", "ultrafast" if previa else "veryfast", "-crf", "26" if previa else "15",
            "-pix_fmt", "yuv420p", "-r", FPS, "-c:a", "pcm_s16le", "-ar", 48000, "-ac", 2]


def render_clipe(pasta, c, W, H, modo, destino, previa):
    arq = achar_midia(pasta, c["video"])
    info = sonda(arq)
    dur = c["fim"] - c["inicio"]
    entradas = ["-ss", f"{c['inicio']:.3f}", "-t", f"{dur:.3f}", "-i", arq]
    vel = float(c.get("velocidade", 1))
    vf = filtro_enquadrar(W, H, c.get("enquadramento", modo), c.get("zoom", 1.0), c.get("foco_x", 0.5))
    vf = f"[0:v]{vf},fps={FPS},format=yuv420p" + (f",setpts=PTS/{vel}" if vel != 1 else "") + "[v]"
    fade = 0.025
    if info["tem_audio"] and not c.get("mudo"):
        af = f"[0:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d={fade},afade=t=out:st={max(dur - fade, 0):.3f}:d={fade}"
        if vel != 1:
            af += f",atempo={vel}"
        af += "[a]"
    else:
        entradas += ["-f", "lavfi", "-t", f"{dur / vel:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
        af = "[1:a]anull[a]"
    ffmpeg([*entradas, "-filter_complex", vf + ";" + af, "-map", "[v]", "-map", "[a]", "-t", f"{dur / vel:.3f}",
            *enc_inter(previa), destino])


def concat(arquivos, destino, tmp):
    lista = tmp / f"lista_{destino.stem}.txt"
    lista.write_text("".join(f"file '{p.resolve()}'\n" for p in arquivos), encoding="utf-8")
    ffmpeg(["-f", "concat", "-safe", 0, "-i", lista, "-c", "copy", destino])


def render_cartao(pasta, cfg, est, W, H, destino, tmp, previa):
    dur = float(cfg.get("duracao", 3.5))
    k = min(W, H) / 1080
    ass = ass_cabecalho(W, H, est)
    meio = H * (0.56 if cfg.get("logo") else 0.5)
    tit = esc_ass(cfg.get("titulo", ""))
    sub = esc_ass(cfg.get("subtitulo", ""))
    ass.append(ass_evento(0.15, dur - 0.1, "CartaoTitulo",
                          f"{{\\pos({W // 2},{int(meio - 40 * k)})\\fad(400,300)\\blur0.6\\t(0,500,\\fscx102\\fscy102)}}{tit}"))
    if sub:
        ass.append(ass_evento(0.55, dur - 0.1, "CartaoSub", f"{{\\pos({W // 2},{int(meio + 70 * k)})\\fad(400,300)}}{sub}"))
    # barra de destaque animada
    barra = int(140 * k)
    ass.append(ass_evento(0.35, dur - 0.1, "CartaoSub",
                          f"{{\\an7\\pos({W // 2 - barra // 2},{int(meio + 125 * k)})\\bord0\\shad0\\1c{cor_ass(est.get('cor_destaque', '#FFD23F'))}\\fad(300,300)\\p1}}"
                          f"m 0 0 l {barra} 0 {barra} {max(4, int(8 * k))} 0 {max(4, int(8 * k))}{{\\p0}}"))
    arq_ass = tmp / f"{destino.stem}.ass"
    arq_ass.write_text("\n".join(ass) + "\n", encoding="utf-8")
    fundo = est.get("cor_fundo", "#0B1F3A").lstrip("#")
    entradas = ["-f", "lavfi", "-t", dur, "-i", f"color=c=0x{fundo}:s={W}x{H}:r={FPS}",
                "-f", "lavfi", "-t", dur, "-i", "anullsrc=r=48000:cl=stereo"]
    fc = f"[0:v]{filtro_ass(arq_ass)}[base]"
    if cfg.get("logo"):
        logo = achar_midia(pasta, cfg["logo"])
        entradas += ["-loop", 1, "-t", dur, "-i", logo]
        lh = int(H * (0.16 if H > W else 0.2))
        fc += (f";[2:v]scale=-1:{lh},format=rgba,fade=t=in:st=0.1:d=0.5:alpha=1,fade=t=out:st={dur - 0.4}:d=0.3:alpha=1[logo];"
               f"[base][logo]overlay=(W-w)/2:{int(meio - 40 * k - lh - 110 * k)}[base]")
    fc += f";[base]fade=t=in:d=0.3,fade=t=out:st={dur - 0.3}:d=0.3,format=yuv420p[v]"
    ffmpeg([*entradas, "-filter_complex", fc, "-map", "[v]", "-map", "1:a", "-t", dur, *enc_inter(previa), destino])


def filtro_ass(arq):
    p = str(arq).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    f = str(FONTES).replace(":", "\\:").replace("'", "\\'")
    return f"ass='{p}':fontsdir='{f}'"


def mapear_tempo(clipes_tl, video, t):
    """Converte um tempo do video original para o tempo do video editado (corpo)."""
    for c in clipes_tl:
        if c["video"] == video and c["inicio"] <= t < c["fim"]:
            return c["off"] + (t - c["inicio"]) / c["vel"]
    return None


def corrigir_palavra(p, corr):
    chave = p.lower().strip(".,!?…;:")
    if chave in corr:
        novo = corr[chave]
        return novo + p[len(p.rstrip(".,!?…;:")):]
    return p


def render_formato(pasta, proj, fmt, previa):
    W, H = FORMATOS[fmt]
    if previa:
        W, H = W // 2, H // 2
    vert = H > W
    est = proj.get("estilo", {})
    modo = proj.get("enquadramento", "desfocar")
    tmp = pasta / "saida" / f".tmp_{fmt.replace(':', 'x')}{'_previa' if previa else ''}"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)

    clipes = proj.get("clipes") or [{"video": v.name, "inicio": 0, "fim": sonda(v)["duracao"]} for v in videos_de(pasta)]
    # 1) clipes
    segs, tl, off = [], [], 0.0
    for n, c in enumerate(clipes):
        log(f"[{fmt}] clipe {n + 1}/{len(clipes)}: {c['video']} {c['inicio']:.2f}-{c['fim']:.2f}")
        d = tmp / f"seg_{n:04d}.mkv"
        render_clipe(pasta, c, W, H, modo, d, previa)
        real = sonda(d)["duracao"]
        tl.append({**c, "off": off, "vel": float(c.get("velocidade", 1))})
        off += real
        segs.append(d)
    corpo = tmp / "corpo.mkv"
    concat(segs, corpo, tmp)
    dur_corpo = off

    # 2) legendas + textos (ASS) e imagens sobre o corpo
    ass = ass_cabecalho(W, H, est)
    leg = proj.get("legendas", {})
    if leg.get("ativo", True):
        corr = {k.lower(): v for k, v in (leg.get("correcoes") or {}).items()}
        pal = []
        for c in tl:
            for w in carregar_palavras(pasta, c["video"]):
                t = mapear_tempo(tl, c["video"], w["i"])
                if t is None or not (c["inicio"] <= w["i"] < c["fim"]):
                    continue
                fim = min(c["fim"], w["f"])
                pal.append({"p": corrigir_palavra(w["p"], corr), "i": t, "f": c["off"] + (fim - c["inicio"]) / c["vel"]})
        pal.sort(key=lambda x: x["i"])
        pal = [w for w in pal if w["p"].lower().strip(".,!?…") not in VICIOS]
        ass += eventos_legenda(pal, leg, est, vert)
    ab = proj.get("abertura", {})
    dur_ab = float(ab.get("duracao", 3.5)) if ab.get("ativo") else 0.0
    for t in proj.get("textos", []):
        ini, fim = tempo_item(t, tl, dur_ab)
        if ini is None:
            log(f"  aviso: texto '{t.get('texto')}' fora dos cortes, ignorado")
            continue
        ass += eventos_texto(t, ini, min(fim, dur_corpo))
    arq_ass = tmp / "corpo.ass"
    arq_ass.write_text("\n".join(ass) + "\n", encoding="utf-8")

    entradas = ["-i", corpo]
    fc = []
    ultimo = "[0:v]"
    for n, im in enumerate(proj.get("imagens", [])):
        ini, fim = tempo_item(im, tl, dur_ab)
        if ini is None:
            continue
        arq = achar_midia(pasta, im["arquivo"])
        entradas += ["-loop", 1, "-t", f"{dur_corpo:.3f}", "-i", arq]
        modo_im = im.get("modo", "tela_cheia")
        j = n + 1
        if modo_im == "tela_cheia":
            esc = filtro_enquadrar(W, H, im.get("enquadramento", "desfocar")).replace("[a]", f"[a{j}]").replace("[b]", f"[b{j}]").replace("[fundo]", f"[fundo{j}]").replace("[frente]", f"[frente{j}]")
            fc.append(f"[{j}:v]{esc},format=rgba,fade=t=in:st={ini}:d=0.25:alpha=1,fade=t=out:st={fim - 0.25}:d=0.25:alpha=1[im{j}]")
            xy = "0:0"
        else:
            larg = int(W * float(im.get("tamanho", 0.38)))
            fc.append(f"[{j}:v]scale={larg}:-1,format=rgba,fade=t=in:st={ini}:d=0.25:alpha=1,fade=t=out:st={fim - 0.25}:d=0.25:alpha=1[im{j}]")
            m = int(min(W, H) * 0.04)
            xy = {"canto_sup_dir": f"W-w-{m}:{m}", "canto_sup_esq": f"{m}:{m}", "canto_inf_dir": f"W-w-{m}:H-h-{m}",
                  "canto_inf_esq": f"{m}:H-h-{m}", "centro": "(W-w)/2:(H-h)/2"}.get(modo_im, f"W-w-{m}:{m}")
        fc.append(f"{ultimo}[im{j}]overlay={xy}:enable='between(t,{ini:.3f},{fim:.3f})'[v{j}]")
        ultimo = f"[v{j}]"
    fc.append(f"{ultimo}{filtro_ass(arq_ass)},format=yuv420p[v]")

    au = proj.get("audio", {})
    af = ["highpass=f=75"]
    if au.get("reduzir_ruido", True):
        af += ["afftdn=nr=12:nf=-35:tn=1"]
    af += ["acompressor=threshold=0.09:ratio=3:attack=15:release=250:makeup=1.5"]
    if au.get("eq_voz", True):
        af += ["equalizer=f=3000:t=q:w=1.2:g=2.5", "equalizer=f=250:t=q:w=1:g=-1.5"]
    fc.append(f"[0:a]{','.join(af)}[a]")
    corpo_final = tmp / "corpo_final.mkv"
    log(f"[{fmt}] aplicando legendas, textos, imagens e tratamento de audio")
    ffmpeg([*entradas, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]", "-t", f"{dur_corpo:.3f}",
            *enc_inter(previa), corpo_final])

    # 3) abertura / encerramento
    partes = []
    if ab.get("ativo"):
        log(f"[{fmt}] abertura")
        d = tmp / "abertura.mkv"
        render_cartao(pasta, ab, est, W, H, d, tmp, previa)
        partes.append(d)
    partes.append(corpo_final)
    en = proj.get("encerramento", {})
    if en.get("ativo"):
        log(f"[{fmt}] encerramento")
        d = tmp / "encerramento.mkv"
        render_cartao(pasta, en, est, W, H, d, tmp, previa)
        partes.append(d)
    junto = tmp / "junto.mkv"
    concat(partes, junto, tmp)
    total = sum(sonda(p)["duracao"] for p in partes)

    # 4) musica com ducking + loudness final + mp4
    nome = re.sub(r"[^\w\-]+", "_", proj.get("titulo", "video")).strip("_") or "video"
    saida = pasta / "saida" / f"{nome}_{fmt.replace(':', 'x')}{'_PREVIA' if previa else ''}.mp4"
    entradas = ["-i", junto]
    final_a = "[0:a]"
    fc = []
    if au.get("musica"):
        mus = achar_midia(pasta, au["musica"])
        vol = float(au.get("volume_musica", 0.12))
        entradas += ["-stream_loop", -1, "-i", mus]
        fc.append(f"[1:a]aresample=48000,aformat=channel_layouts=stereo,volume={vol},atrim=0:{total:.3f},"
                  f"afade=t=in:d=1.5,afade=t=out:st={max(total - 2.5, 0):.3f}:d=2.5[mus]")
        fc.append("[0:a]asplit=2[voz][chave]")
        fc.append("[mus][chave]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=500[musd]")
        fc.append("[voz][musd]amix=inputs=2:duration=first:normalize=0[mix]")
        final_a = "[mix]"
    if au.get("normalizar", True):
        alvo = au.get("lufs", -14 if vert else -16)
        fc.append(f"{final_a}loudnorm=I={alvo}:TP=-1.5:LRA=11,aresample=48000[afinal]")
    else:
        fc.append(f"{final_a}anull[afinal]")
    log(f"[{fmt}] exportando {saida.name}")
    ffmpeg([*entradas, "-filter_complex", ";".join(fc), "-map", "0:v", "-map", "[afinal]", "-t", f"{total:.3f}",
            "-c:v", "libx264", "-preset", "ultrafast" if previa else "slow", "-crf", "28" if previa else "19",
            "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "192k", "-ar", 48000,
            "-movflags", "+faststart", saida])
    if not a_manter_tmp:
        shutil.rmtree(tmp, ignore_errors=True)
    tam = saida.stat().st_size / 1e6
    log(f"PRONTO: {saida}  ({tempo_fmt(total)}, {tam:.1f} MB)")
    return saida


def tempo_item(t, tl, dur_ab):
    """Tempo de um texto/imagem no corpo. Aceita {video, em, duracao} (ancorado no video original)
    ou {inicio, fim} (tempo do video final, contando a abertura)."""
    if "video" in t and "em" in t:
        ini = mapear_tempo(tl, t["video"], float(t["em"]))
        if ini is None:
            return None, None
        return ini, ini + float(t.get("duracao", 3))
    ini = float(t.get("inicio", 0)) - dur_ab
    fim = float(t["fim"]) - dur_ab if "fim" in t else ini + float(t.get("duracao", 3))
    if fim <= 0:
        return None, None
    return max(ini, 0), fim


a_manter_tmp = False


def cmd_render(a):
    global a_manter_tmp
    a_manter_tmp = a.manter
    pasta, proj = carregar_projeto(a.nome)
    fmts = [a.formato] if a.formato else proj.get("formatos", ["16:9"])
    for f in fmts:
        if f not in FORMATOS:
            sys.exit(f"Formato invalido: {f}. Use: {', '.join(FORMATOS)}")
        render_formato(pasta, proj, f, a.previa)


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="Estudio de edicao de video com IA")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("novo", help="cria um projeto")
    p.add_argument("nome")
    p.set_defaults(f=cmd_novo)
    p = sub.add_parser("analisar", help="transcreve e analisa os videos de entrada/")
    p.add_argument("nome")
    p.add_argument("--video")
    p.add_argument("--refazer", action="store_true")
    p.set_defaults(f=cmd_analisar)
    p = sub.add_parser("autocortes", help="gera os clipes cortando pausas")
    p.add_argument("nome")
    p.add_argument("--video")
    p.add_argument("--pausa", type=float, default=0.55, help="pausa maxima mantida (s)")
    p.add_argument("--margem", type=float, default=0.12, help="respiro antes/depois da fala (s)")
    p.add_argument("--manter-vicios", dest="tirar_vicios", action="store_false")
    p.set_defaults(f=cmd_autocortes)
    p = sub.add_parser("quadros", help="extrai quadros em tempos especificos")
    p.add_argument("nome")
    p.add_argument("video")
    p.add_argument("tempos", nargs="+")
    p.set_defaults(f=cmd_quadros)
    p = sub.add_parser("render", help="gera o video final")
    p.add_argument("nome")
    p.add_argument("--previa", action="store_true", help="metade da resolucao, rapido")
    p.add_argument("--formato", help="16:9, 9:16, 1:1 ou 4:5")
    p.add_argument("--manter", action="store_true", help="manter arquivos temporarios")
    p.set_defaults(f=cmd_render)
    a = ap.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
