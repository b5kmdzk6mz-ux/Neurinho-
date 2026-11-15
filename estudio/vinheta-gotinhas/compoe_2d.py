#!/usr/bin/env python3
"""Anima as gotinhas (ilustracao 2D recortada) e a placa sobre o video do apresentador.
Gera quadros RGBA em quadros_2d/ (1080x1920, 30 fps, 10 s)."""
import math, os
import numpy as np
from PIL import Image, ImageFilter

W, H, FPS, DUR = 1080, 1920, 30, 10.0
OUT = 'quadros_2d'
os.makedirs(OUT, exist_ok=True)

NOMES = ['transparente', 'amarelo-claro', 'amarela', 'laranja', 'castanha', 'esverdeada', 'vermelha']
ALT = 345                       # altura de cada gotinha no video (px)
PASSO = 152                     # distancia entre elas
ORDEM = [3, 1, 5, 0, 4, 2, 6]   # ordem de entrada (do meio para fora, alternando)
T_PLACA, T_SAI = 2.3, 8.75
# momentos de reacao sincronizados com a fala
REACAO = {4: (1.95, 'lupa'), 5: (4.6, 'pulo'), 6: (5.6, 'alerta'), 2: (6.7, 'pulo'), 0: (7.2, 'balanca'), 1: (7.35, 'balanca'), 3: (7.6, 'inclina')}

clamp = lambda x, a=0., b=1.: max(a, min(b, x))
def ease_back(u, s=1.7):
    u = clamp(u); return 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2
def squash(dt):
    return 0 if dt < 0 or dt > 1.2 else math.exp(-dt * 6) * math.cos(dt * 19) * .14
def bump(t, c, w):
    return math.exp(-((t - c) / w) ** 2)

def prepara(img, alt):
    k = alt * 2 / img.height   # guarda em 2x para manter qualidade ao transformar
    return img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)

def sombra(img):
    a = img.split()[3].filter(ImageFilter.GaussianBlur(10))
    s = Image.new('RGBA', img.size, (20, 20, 30, 0)); s.putalpha(a.point(lambda v: v * .35))
    return s

sprites = [prepara(Image.open(f'recortes/{n}.png').convert('RGBA'), ALT) for n in NOMES]
sombras = [sombra(s) for s in sprites]
placa_src = Image.open('recortes/placa.png').convert('RGBA')
PL_W = 920
placa = placa_src.resize((PL_W * 2, round(placa_src.height * PL_W * 2 / placa_src.width)), Image.LANCZOS)
placa_sombra = sombra(placa)

def cola(base, img, cx, by, sx, sy, rot, alfa=1.0, sh=None):
    """cola img (guardada em 2x) com a base no ponto (cx, by); escala e rotacao (graus) em torno do centro."""
    w, h = max(1, round(img.width / 2 * sx)), max(1, round(img.height / 2 * sy))
    centro = (cx, by - h / 2)
    for camada, dx, dy in ([(sh, 10, 14)] if sh is not None else []) + [(img, 0, 0)]:
        im = camada.resize((w, h), Image.BICUBIC)
        if abs(rot) > .05: im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
        x = round(centro[0] - im.width / 2 + dx); y = round(centro[1] - im.height / 2 + dy)
        if x >= W or y >= H or x + im.width <= 0 or y + im.height <= 0: continue
        base.alpha_composite(im, (max(x, 0), max(y, 0)), (max(-x, 0), max(-y, 0)))

def quadro(t):
    base = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    # ---- placa no alto: cai quicando
    u = (t - T_PLACA) / .7
    if u > 0:
        y = 18 + (1 - ease_back(u, 2.0)) * -420
        pulso = 1 + .03 * math.exp(-max(t - T_PLACA - .55, 0) * 3) * math.sin((t - T_PLACA) * 18)
        rot = (1 - clamp(u * 1.4)) * 6 + 1.0 * math.sin(t * 2.1)
        cola(base, placa, W / 2, y + placa.height / 2 * pulso, pulso, pulso, rot, sh=placa_sombra)
    # ---- gotinhas: fileira na base, a ordem de desenho deixa as de baixo na frente
    x0 = W / 2 - PASSO * 3
    for i in sorted(range(7), key=lambda i: i % 2 == 0):
        ini = .95 + ORDEM[i] * .17
        saida = T_SAI + abs(i - 3) * .07
        if t < ini or t > saida + .6:
            continue
        uu = t - ini
        y = 1932 + (12 if i % 2 == 0 else -20)          # alterna alturas para dar profundidade
        y += (1 - ease_back(uu / .45, 1.8)) * 420           # surge de baixo
        v = clamp((t - saida) / .45); y += 520 * v * v      # mergulha no final
        sq = squash(uu - .4)
        rot = 2.2 * math.sin(t * 1.9 + i * 1.3)
        y -= 6 * math.sin(t * 2.6 + i)                      # respira
        # todas levam um susto quando a placa cai
        pulo = bump(t, T_PLACA + .75, .12) * 38
        if i in REACAO:
            tr, tipo = REACAO[i]; d = t - tr
            if 0 < d < 1.4:
                env = math.sin(math.pi * clamp(d / 1.4))
                if tipo == 'pulo': pulo += abs(math.sin(d * 9)) * 45 * env
                elif tipo == 'alerta': rot += 7 * math.sin(d * 22) * env; pulo += abs(math.sin(d * 11)) * 25 * env
                elif tipo == 'balanca': rot += 9 * math.sin(d * 10) * env
                elif tipo == 'inclina': rot += 10 * env
                elif tipo == 'lupa': rot -= 8 * env; sq -= .05 * env
        if t > 8.35:
            rot += 6 * math.sin(t * 14 + i) * clamp((t - 8.35) / .2)   # tchauzinho
        sx, sy = 1 + sq * .6, 1 - sq
        if uu < .45: sx, sy = .92 + .08 * uu / .45, 1.1 - .1 * uu / .45   # estica ao subir
        cola(base, sprites[i], x0 + i * PASSO, y - pulo, sx, sy, rot, sh=sombras[i])
    return base

if __name__ == '__main__':
    import sys
    tempos = [float(x) for x in sys.argv[1].split(',')] if len(sys.argv) > 1 else None
    if tempos:
        for t in tempos:
            quadro(t).save(f'{OUT}/previa_{t:05.2f}.png')
    else:
        for n in range(int(DUR * FPS)):
            quadro(n / FPS).save(f'{OUT}/f{n:04d}.png', compress_level=1)
            if n % 60 == 0: print('quadro', n)
