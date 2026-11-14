# Vinheta: Clube das Gotinhas

Abertura animada em 3D (30 s, 1920×1080, 24 fps) para o trabalho de Morfofisiologia dos Sistemas II (sistema urinário).

- `cena.js`: personagens, cenário, câmera e linha do tempo, em Three.js. As sete gotinhas são modelos 3D com textura de pelúcia, olhos, pálpebras, sobrancelhas, boca que abre e fecha, braços e mãos brancas.
- `musica.py`: trilha original sintetizada do zero (xilofone, sinos, percussão, baixo, bolhas, respingos e transições), sincronizada com as cenas.
- `render.js`: abre a cena num Chromium sem tela, desenha quadro a quadro e gera o MP4.

## Gerar de novo
```bash
cd estudio/vinheta-gotinhas
npm install three@0.170.0
python3 musica.py                                   # trilha.wav
NODE_PATH=$(npm root -g) node render.js             # saida/video_mudo.mp4
ffmpeg -i saida/video_mudo.mp4 -i trilha.wav -af loudnorm=I=-14:TP=-1.5 \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart saida/Clube_das_Gotinhas.mp4
```
Para ver quadros soltos: `node render.js --w 960 --h 540 --previa 6.3,16,24` (imagens em `quadros/`).

## Linha do tempo
| Tempo | Cena |
|---|---|
| 0–5 s | Fundo turquesa, bolhas e uma gota caindo em câmera lenta; respingo com coroa, ondas e jato; a câmera mergulha. |
| 5–14 s | As sete gotinhas entram uma a uma (surgindo do respingo, caindo, saltando, aos pulinhos), acenando, piscando e conversando. |
| 14–20 s | Todas se juntam, levantam os braços e "gritam" CLUBE DAS GOTINHAS! (duas vezes, com a boca sincronizada à música). |
| 20–27 s | Explosão de água e título 3D: CLUBE DAS GOTINHAS! / SISTEMA URINÁRIO / Morfofisiologia dos Sistemas II. |
| 27–30 s | Aproximação suave, as gotinhas acenam, final alegre ("ta-da"). |

Cores das gotinhas: transparente, amarelo-clara, amarela, laranja, castanha, esverdeada e vermelha (sem rosa). Para ajustar, edite `CONFIG` em `cena.js`.
