# Estúdio de edição com IA

Espaço para a IA (Claude) editar vídeos de forma profissional, usando ffmpeg + Whisper (transcrição em português, roda offline).

## O que ele faz
- **Transcrição com tempo de cada palavra** → roteiro legível, legenda `.srt`, palavras com dúvida marcadas.
- **Cortes automáticos** de pausas, silêncios e "ahn/hum" (jump cuts).
- **Legendas animadas** queimadas no vídeo, com a palavra falada em destaque (estilo Reels) e correção de palavras.
- **Áudio**: redução de ruído, equalização de voz, compressor, volume padronizado (-14 LUFS redes / -16 LUFS horizontal).
- **Música de fundo** que abaixa sozinha quando alguém fala (ducking).
- **Abertura e encerramento** com título, subtítulo e logo animados.
- **Textos na tela** (destaque, título, crédito de nome, info) e **imagens** (tela cheia ou no canto).
- **Formatos**: 16:9, 9:16, 1:1 e 4:5, com fundo desfocado, barras ou corte com foco ajustável.
- **Zoom (punch-in)** e **velocidade** por clipe.

## Uso
```bash
bash estudio/instalar.sh                       # 1x por sessão: bibliotecas + modelo (~250 MB)
python3 estudio/estudio.py novo meu-video      # cria estudio/projetos/meu-video/
# coloque os vídeos em entrada/ e logo/imagens/música em midia/
python3 estudio/estudio.py analisar meu-video  # analise/: roteiro.txt, quadros.jpg, RESUMO.md
python3 estudio/estudio.py autocortes meu-video --pausa 0.5
python3 estudio/estudio.py quadros meu-video video.mp4 12.5 40   # ver quadros específicos
python3 estudio/estudio.py render meu-video --previa              # rápido, metade da resolução
python3 estudio/estudio.py render meu-video                       # final em saida/
```

## projeto.json
| Campo | O que controla |
|---|---|
| `formatos` | `["16:9", "9:16"]` gera um arquivo por formato |
| `enquadramento` | `desfocar`, `barras` ou `cortar` |
| `estilo` | `cor_destaque`, `cor_fundo`, `cor_texto`, `fonte_titulo`, `fonte_texto`, `tamanho_legenda` |
| `abertura` / `encerramento` | `ativo`, `titulo`, `subtitulo`, `logo`, `duracao` |
| `legendas` | `ativo`, `estilo` (`destaque`/`simples`), `max_palavras`, `posicao` (`auto`/`centro`/`topo`), `caixa_alta`, `correcoes` (`{"prostata": "próstata"}`) |
| `audio` | `reduzir_ruido`, `eq_voz`, `normalizar`, `lufs`, `musica`, `volume_musica` |
| `clipes` | lista em ordem: `{"video", "inicio", "fim"}` + opcionais `zoom` (ex. 1.15), `foco_x` (0–1), `velocidade`, `mudo`, `enquadramento` |
| `textos` | `{"texto", "subtexto", "estilo": destaque/titulo/nome/info, "posicao": topo/centro/baixo}` |
| `imagens` | `{"arquivo", "modo": tela_cheia/canto_sup_dir/canto_sup_esq/canto_inf_dir/canto_inf_esq/centro, "tamanho"}` |

Textos e imagens podem ser posicionados de dois jeitos:
- `"video": "gravacao.mp4", "em": 42.0, "duracao": 3`: preso ao momento do vídeo original, continua certo mesmo se os cortes mudarem.
- `"inicio": 10, "fim": 13`: tempo no vídeo final, contando a abertura.

## Arquivos
Vídeos, mídias e saídas **não** vão para o git (são grandes). Ficam só o `projeto.json` e a análise de cada projeto. Fontes em `fontes/` (Montserrat, Open Sans e OpenDyslexic, licença OFL).
