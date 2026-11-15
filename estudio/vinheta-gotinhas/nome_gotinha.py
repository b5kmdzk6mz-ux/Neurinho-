#!/usr/bin/env python3
"""Gera o titulo com o nome da gotinha (PNG transparente, 1080 de largura). Uso: nome_gotinha.py "Texto" "#cor" saida.png"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
texto, cor, saida = sys.argv[1], sys.argv[2], sys.argv[3]
F = ImageFont.truetype('Montserrat-ExtraBold.ttf', 84)
W, H = 1080, 230
img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
tw = d.textlength(texto, font=F); pw = min(W - 40, int(tw + 120)); x0 = (W - pw) // 2
caixa = (x0, 40, x0 + pw, 190)
sombra = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sombra).rounded_rectangle((caixa[0] + 6, caixa[1] + 12, caixa[2] + 6, caixa[3] + 12), 75, fill=(0, 0, 0, 90))
img.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(8)))
d = ImageDraw.Draw(img)
d.rounded_rectangle(caixa, 75, fill=cor)
d.rounded_rectangle((caixa[0] + 12, caixa[1] + 12, caixa[2] - 12, caixa[3] - 12), 63, fill='#ffffff')
d.text((W / 2, 115), texto, font=F, fill='#14304d', anchor='mm')
img.save(saida)
