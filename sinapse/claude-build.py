#!/usr/bin/env python3
"""Gera a versão do Sinapse que roda dentro do Claude (artifact).

Uso: python3 sinapse/claude-build.py PASTA_DE_SAIDA

O mesmo index.html serve para os dois lugares: dentro do Claude ele percebe
`window.claude` e passa a usar a IA da assinatura e a nuvem do Claude.
Este script só ajusta o que muda na publicação: tira o <head> (o Claude
coloca o próprio), troca os caminhos "../" e copia os arquivos de apoio.
"""
import os, re, shutil, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
saida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, 'claude-dist')
os.makedirs(saida, exist_ok=True)

html = open(os.path.join(AQUI, 'index.html'), encoding='utf-8').read()

# cabeçalho: fica só o título, a fonte do Google e o CSS
cab, corpo = html.split('</head>', 1)
titulo = re.search(r'<title>.*?</title>', cab).group(0)
fontes = '\n'.join(re.findall(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>', cab))
estilo = cab[cab.index('<style>'):]
corpo = re.sub(r'^\s*<body[^>]*>', '', corpo)
corpo = re.sub(r'</body>\s*</html>\s*$', '', corpo)
pagina = '\n'.join([titulo, fontes, estilo, corpo])

# caminhos: no artifact tudo fica na mesma pasta
pagina = pagina.replace('../vendor/', './vendor/').replace('url(../OpenDyslexic', 'url(./OpenDyslexic')
assert '../' not in pagina, 'sobrou caminho com ../'
open(os.path.join(saida, 'index.html'), 'w', encoding='utf-8').write(pagina)

arquivos = ['icon-192.png']
for pasta in ['arte', 'arte/adesivos']:
    for f in sorted(os.listdir(os.path.join(AQUI, pasta))):
        if os.path.isfile(os.path.join(AQUI, pasta, f)):
            arquivos.append(pasta + '/' + f)
for f in arquivos:
    os.makedirs(os.path.dirname(os.path.join(saida, f)) or saida, exist_ok=True)
    shutil.copy(os.path.join(AQUI, f), os.path.join(saida, f))
extras = {'vendor/pdf.min.mjs': 'vendor/pdf.min.mjs', 'vendor/pdf.worker.min.mjs': 'vendor/pdf.worker.min.mjs',
          'OpenDyslexic-Regular.otf': 'OpenDyslexic-Regular.otf'}
for dest, src in extras.items():
    os.makedirs(os.path.dirname(os.path.join(saida, dest)) or saida, exist_ok=True)
    shutil.copy(os.path.join(RAIZ, src), os.path.join(saida, dest))
print('\n'.join(['index.html'] + arquivos + list(extras)))
