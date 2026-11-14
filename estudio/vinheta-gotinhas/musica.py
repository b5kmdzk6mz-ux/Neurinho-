#!/usr/bin/env python3
"""Trilha original da vinheta Clube das Gotinhas (sintetizada do zero, sem samples).
Xilofone/marimba, sinos (glockenspiel), percussao leve, baixo, pad, bolhas, respingos e transicoes.
Sincronizada com a linha do tempo de cena.js. Gera trilha.wav (48 kHz, estereo)."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 30.0
BPM = 120
B = 60 / BPM  # 1 tempo = 0.5 s
rng = np.random.default_rng(7)

ENTRADAS = [5.5, 6.75, 8.0, 9.25, 10.5, 11.75, 13.0]
POUSO = [0.6, 0.5, 0.75, 0.75, 0.6, 1.05, 0.55]
GRITOS = [16.0, 18.0]
SILABAS = [0, .25, .5, .75, 1.0, 1.25]
EXP = 20.0

N = int(SR * DUR)
seco = np.zeros((2, N))
envio = np.zeros((2, N))  # vai para o reverb


def t_(d):
    return np.arange(int(SR * d)) / SR


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


NOTA = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(n):  # 'C5', 'F#4'
    s = 1 if '#' in n else 0
    return 12 * (int(n[-1]) + 1) + NOTA[n[0]] + s


def filtro(x, tipo, f):
    return sosfilt(butter(2, f, btype=tipo, fs=SR, output='sos'), x)


def add(sig, inicio, ganho=1.0, pan=0.0, rev=0.2):
    i = int(inicio * SR)
    if i >= N:
        return
    sig = sig[:N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    for k, g in enumerate((l, r)):
        seco[k, i:i + len(sig)] += sig * ganho * g * 1.41
        envio[k, i:i + len(sig)] += sig * ganho * g * 1.41 * rev


def ataque(sig, ms=3):
    n = int(SR * ms / 1000)
    sig[:n] *= np.linspace(0, 1, n)
    return sig


# ------------------------------------------------------------------ instrumentos
def marimba(f, d=0.9):
    t = t_(d)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / .32)
         + .28 * np.sin(2 * np.pi * 3.93 * f * t) * np.exp(-t / .07)
         + .08 * np.sin(2 * np.pi * 9.2 * f * t) * np.exp(-t / .025))
    clique = filtro(rng.standard_normal(len(t)), 'highpass', 3000) * np.exp(-t / .003) * .05
    return ataque(s + clique, 2)


def glock(f, d=1.8):
    t = t_(d)
    s = sum(a * np.sin(2 * np.pi * f * p * t) * np.exp(-t / dc) for p, a, dc in
            [(1, 1, 1.3), (2.756, .35, .45), (5.404, .18, .25), (8.933, .08, .12)])
    return ataque(s, 1)


def sino(f, d=3.0):
    t = t_(d)
    s = sum(a * np.sin(2 * np.pi * f * p * t) * np.exp(-t / dc) for p, a, dc in
            [(1, 1, 2.2), (2.0, .5, 1.4), (3.01, .25, .8), (4.17, .15, .5), (5.43, .1, .3)])
    return ataque(s, 2)


def baixo(f, d=.45):
    t = t_(d)
    s = np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t) * np.exp(-t / .08)
    return ataque(s * np.exp(-t / .22), 4)


def pad(fs, d, at=.6, rel=.8):
    t = t_(d)
    s = np.zeros(len(t))
    for f in fs:
        for det in (-.12, 0, .12):
            ff = f * 2 ** (det / 12)
            s += 2 * ((t * ff) % 1) - 1
    s = filtro(s, 'lowpass', 1600) / (len(fs) * 3)
    env = np.minimum(1, t / at) * np.minimum(1, (d - t) / rel)
    return s * np.clip(env, 0, 1)


def bumbo(d=.35):
    t = t_(d)
    f = 48 + 110 * np.exp(-t / .03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .18)
    return ataque(s, 1)


def caixa(d=.25):
    t = t_(d)
    r = filtro(rng.standard_normal(len(t)), 'bandpass', [900, 7000]) * np.exp(-t / .09)
    tom = np.sin(2 * np.pi * 190 * t) * np.exp(-t / .04)
    return ataque(.8 * r + .5 * tom, 1)


def palma(d=.3):
    t = t_(d)
    r = filtro(rng.standard_normal(len(t)), 'bandpass', [800, 3500])
    env = np.exp(-t / .1) * .6
    for k in range(3):
        env += np.exp(-np.maximum(t - k * .011, 0) / .006) * (t >= k * .011)
    return r * env * .6


def chocalho(d=.09):
    t = t_(d)
    r = filtro(rng.standard_normal(len(t)), 'highpass', 6000)
    return r * np.minimum(1, t / .008) * np.exp(-t / .035)


def prato(d=2.5):
    t = t_(d)
    r = filtro(rng.standard_normal(len(t)), 'highpass', 4500) * np.exp(-t / .9)
    anel = sum(np.sin(2 * np.pi * f * t) for f in (3150, 4270, 5590, 7110)) * np.exp(-t / .5) * .05
    return ataque(r * .7 + anel, 2)


def bolha(f0=500, f1=1500, d=.09):
    t = t_(d)
    f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * .45)) * np.minimum(1, t / .004)


def pop(d=.12):
    return bolha(350, 1400, d) * 1.0


def respingo(d=1.0, brilho=1.0):
    t = t_(d)
    r = rng.standard_normal(len(t))
    grave = filtro(r, 'lowpass', 1800) * np.exp(-t / .25)
    agudo = filtro(r, 'highpass', 3500) * np.exp(-t / .12) * brilho
    s = ataque((grave * .9 + agudo * .5), 3)
    for _ in range(int(10 * d)):  # gotinhas caindo depois
        k = int(rng.uniform(.05, d * .8) * SR)
        b = bolha(rng.uniform(600, 1200), rng.uniform(1500, 2600), rng.uniform(.03, .06)) * rng.uniform(.1, .3)
        s[k:k + len(b)] += b[:len(s) - k]
    return s


def varredura(d, subindo=True, faixas=10, f0=300, f1=7000):
    """ruido filtrado varrendo bandas (whoosh/riser)"""
    t = t_(d)
    s = np.zeros(len(t))
    r = rng.standard_normal(len(t))
    cs = np.geomspace(f0, f1, faixas)
    for k, c in enumerate(cs):
        centro = (k + .5) / faixas if subindo else 1 - (k + .5) / faixas
        env = np.exp(-((t / d - centro) ** 2) / (2 * .12 ** 2))
        s += filtro(r, 'bandpass', [c * .7, c * 1.4]) * env
    return s / 2


def stab(fs, d=.3):
    t = t_(d)
    s = np.zeros(len(t))
    for f in fs:
        for det in (-.08, .08):
            ff = f * 2 ** (det / 12)
            s += 2 * ((t * ff) % 1) - 1
    corte = 900 + 4500 * np.exp(-t / .06)
    # filtro passa-baixa de 1 polo com corte variavel
    y = np.zeros(len(s)); a = 1 - np.exp(-2 * np.pi * corte / SR); acc = 0
    for i in range(len(s)):
        acc += a[i] * (s[i] - acc); y[i] = acc
    env = np.minimum(1, t / .008) * (.45 + .55 * np.exp(-t / .07)) * np.minimum(1, (d - t) / .06)
    return y * env / len(fs)


def tombo(d=.25):
    t = t_(d)
    return np.sin(2 * np.pi * (70 + 60 * np.exp(-t / .03)) * t) * np.exp(-t / .07)


def boing(d=.35, f=330):
    t = t_(d)
    ff = f * (1 + .35 * np.sin(2 * np.pi * 14 * t) * np.exp(-t / .12)) * (1 + .6 * np.exp(-t / .05))
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / .14) * np.minimum(1, t / .003)


# ------------------------------------------------------------------ composicao
ACORDES = {'C': ['C3', 'E4', 'G4', 'C5'], 'Am': ['A2', 'C4', 'E4', 'A4'], 'F': ['F2', 'A3', 'C4', 'F4'], 'G': ['G2', 'B3', 'D4', 'G4']}


def tocar(notas, inicio, inst, ganho, pan=0, rev=.25, oit=0):
    for b, n, d in notas:
        f = hz(midi(n) + 12 * oit)
        add(inst(f), inicio + b * B, ganho, pan, rev)


# CENA 1 (0-5): abertura magica
add(pad([hz(midi(n)) for n in ['C4', 'E4', 'G4', 'D5']], 5.2, at=1.8, rel=1.2), 0, .22, 0, .6)
for k, n in enumerate(['C6', 'G6', 'E6', 'D7', 'C7', 'G6', 'E7', 'D6', 'G7']):
    add(glock(hz(midi(n))), .25 + k * .33 + .05 * np.sin(k), .08 * (1 + k / 9), (k % 3 - 1) * .5, .7)
# gota caindo: assobio descendente suave
t = t_(2.5); f = 1700 * (500 / 1700) ** (t / 2.5)
add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / .4) * np.exp(-t / 1.6) * .5, .5, .07, 0, .5)
for k in range(14):  # bolhinhas subindo
    add(bolha(rng.uniform(450, 800), rng.uniform(1300, 2200), rng.uniform(.05, .09)), rng.uniform(0, 2.9), rng.uniform(.05, .12), rng.uniform(-.8, .8), .4)
add(respingo(1.6, 1.2), 3.0, .55, 0, .5)
add(tombo(.5), 3.0, .5, 0, .2)
add(sino(hz(midi('C4'))), 3.0, .06, 0, .8)
for k in range(10):
    add(bolha(rng.uniform(500, 900), rng.uniform(1600, 2400), .06), 3.1 + k * .07 + rng.uniform(0, .05), .12, rng.uniform(-.6, .6), .4)
add(varredura(1.4, True, 12, 250, 9000), 3.6, .35, 0, .5)
for k, n in enumerate(['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7', 'G7']):  # glissando magico
    add(glock(hz(midi(n))), 4.5 + k * .055, .1, -.6 + k * .15, .7)
add(prato(2.0), 5.0, .18, 0, .4)

# CENA 2 (5-14): groove + entradas
GANCHO = [  # (tempo, nota, dur) por compasso: C, Am, F, G
    [(0, 'E5', .5), (.5, 'G5', .5), (1, 'C6', .5), (1.5, 'G5', .5), (2, 'A5', .5), (2.5, 'G5', .5), (3, 'E5', 1)],
    [(0, 'C5', .5), (.5, 'E5', .5), (1, 'A5', .5), (1.5, 'G5', .5), (2, 'E5', .5), (2.5, 'D5', .5), (3, 'C5', 1)],
    [(0, 'F5', .5), (.5, 'A5', .5), (1, 'C6', .5), (1.5, 'A5', .5), (2, 'D6', .5), (2.5, 'C6', .5), (3, 'A5', 1)],
    [(0, 'G5', .5), (.5, 'B5', .5), (1, 'D6', .5), (1.5, 'B5', .5), (2, 'G5', .5), (2.5, 'A5', .5), (3, 'B5', .5), (3.5, 'D6', .5)],
]
SEQ = ['C', 'Am', 'F', 'G']


def bateria(inicio, compassos, forte=False):
    for c in range(compassos):
        b0 = inicio + c * 4 * B
        for bt in (0, 2):
            add(bumbo(), b0 + bt * B, .55, 0, .05)
        add(bumbo(), b0 + 2.5 * B, .3, 0, .05)
        for bt in (1, 3):
            add(palma() if forte else caixa(), b0 + bt * B, .32 if forte else .22, .1, .3)
            if forte:
                add(caixa(), b0 + bt * B, .15, -.1, .25)
        for k in range(8 if not forte else 16):
            passo = .5 if not forte else .25
            add(chocalho(), b0 + k * passo * B, (.07 if k % 2 else .1) * (1.2 if forte else 1), .4, .1)


def baixo_linha(inicio, acordes):
    for c, a in enumerate(acordes):
        b0 = inicio + c * 4 * B
        raiz = midi(ACORDES[a][0])
        for bt, sem in ((0, 0), (1.5, 0), (2, 7), (3, 12), (3.5, 7)):
            add(baixo(hz(raiz + sem)), b0 + bt * B, .45, 0, .05)


def pads(inicio, acordes, ganho=.1):
    for c, a in enumerate(acordes):
        add(pad([hz(midi(n)) for n in ACORDES[a][1:]], 4 * B + .2, at=.15, rel=.3), inicio + c * 4 * B, ganho, 0, .5)


bateria(5.0, 4)
baixo_linha(5.0, SEQ)
pads(5.0, SEQ, .08)
for c in range(4):
    tocar(GANCHO[c], 5.0 + c * 4 * B, marimba, .28, -.2, .25)
for i, te in enumerate(ENTRADAS):  # efeitos de cada personagem
    if i in (0, 4):
        add(respingo(.8), te, .35, -.5 + i * .15, .4)
    add(pop(), te + .02, .3, -.6 + i * .2, .3)
    add(boing(f=300 + i * 40), te + .05, .12, -.6 + i * .2, .3)
    add(tombo(), te + POUSO[i], .25, -.6 + i * .2, .1)
    add(glock(hz(midi(['C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6'][i]))), te + .1, .12, -.6 + i * .2, .6)
# compasso 13-15: preparacao (G)
add(bumbo(), 13.0, .5); add(caixa(), 13.5, .2)
for k, n in enumerate(['G4', 'B4', 'D5', 'G5', 'B5', 'D6', 'G6', 'B6']):
    add(marimba(hz(midi(n))), 13.0 + k * .25, .22, -.3 + k * .08, .3)
baixo_linha(13.0, ['G'])
pads(13.0, ['G'], .08)
for k in range(8):  # rufar crescendo
    add(caixa(), 14.0 + k * .125, .08 + k * .025, 0, .3)
add(varredura(.9, True, 8, 400, 6000), 14.0, .22, 0, .4)
for i in range(7):
    add(boing(.3, 380 + i * 30), 14.0 + i * .05, .06, -.6 + i * .2, .3)

# CENA 3 (15-20): todos juntos + "CLUBE DAS GOTINHAS!"
bateria(15.0, 2, forte=True)
baixo_linha(15.0, ['C', 'F'])
pads(15.0, ['C', 'F'], .1)
GRITO = [('C5', 'C'), ('C5', 'C'), ('D5', 'C'), ('E5', 'F'), ('G5', 'G'), ('C6', 'C')]
for g in GRITOS:
    for s, (n, a) in zip(SILABAS, GRITO):
        notas = [hz(midi(x)) for x in ACORDES[a][1:]] + [hz(midi(n))]
        add(stab(notas, .24 if s < 1.25 else .55), g + s, .5, 0, .35)
        add(palma(), g + s, .18, .3, .3)
    add(prato(1.6), g + 1.25, .12, .3, .4)
    add(tombo(), g + .4, .25)
tocar([(0, 'G5', 1), (1, 'E5', 1), (2, 'C5', 1), (3, 'G5', 1)], 15.0, glock, .12, .3, .6)
for c, idx in enumerate((0, 2)):  # melodia continua, mais cheia
    tocar(GANCHO[idx], 15.0 + c * 4 * B, marimba, .3, -.2, .25)
    tocar(GANCHO[idx], 15.0 + c * 4 * B, glock, .07, .3, .6)
pads(15.0, ['C', 'F'], .06)
# 19-20: subida para a explosao
add(varredura(1.0, True, 14, 200, 12000), 19.0, .45, 0, .5)
t = t_(1.0); f = 200 * (1600 / 200) ** t
add(np.sin(2 * np.pi * np.cumsum(f) / SR) * t ** 2 * .5, 19.0, .12, 0, .5)
for k in range(12):
    add(caixa(), 19.0 + k * .0625 * (1 if k < 12 else 1), .06 + k * .02, 0, .3)

# CENA 4 (20-27): explosao e titulo
add(respingo(2.2, 1.4), EXP, .75, 0, .5)
add(prato(3.0), EXP, .35, 0, .5)
add(bumbo(.8), EXP, .9, 0, .2)
add(tombo(.6), EXP, .6)
add(sino(hz(midi('C5'))), EXP, .14, -.3, .8)
add(sino(hz(midi('G5'))), EXP, .1, .3, .8)
REFRAO = [
    [(0, 'G5', 1), (1, 'E6', .5), (1.5, 'D6', .5), (2, 'C6', 1), (3, 'G5', 1)],
    [(0, 'B5', 1), (1, 'D6', .5), (1.5, 'C6', .5), (2, 'B5', 1), (3, 'G5', 1)],
    [(0, 'A5', 1), (1, 'C6', .5), (1.5, 'E6', .5), (2, 'D6', .5), (2.5, 'C6', .5), (3, 'A5', 1)],
    [(0, 'F5', .5), (.5, 'A5', .5), (1, 'C6', .5), (1.5, 'F6', .5), (2, 'E6', 1), (3, 'D6', 1)],
]
SEQ2 = ['C', 'G', 'Am', 'F']
bateria(20.0, 4, forte=True)
baixo_linha(20.0, SEQ2)
pads(20.0, SEQ2, .1)
for c in range(4):
    tocar(REFRAO[c], 20.0 + c * 4 * B, marimba, .26, -.25, .25)
    tocar(REFRAO[c], 20.0 + c * 4 * B, glock, .09, .25, .6)
for k in range(9):  # letras surgindo
    add(pop(.08), EXP + .35 + k * .06, .1, -.5 + k * .12, .3)
    add(pop(.08), EXP + .85 + k * .065, .12, -.5 + k * .12, .3)
for k, n in enumerate(['C6', 'E6', 'G6', 'C7', 'E7']):
    add(glock(hz(midi(n))), EXP + 1.9 + k * .08, .08, -.4 + k * .2, .7)
for c0 in (EXP + 3.1, EXP + 5.6):  # brilho percorrendo o titulo
    for k, n in enumerate(['G6', 'A6', 'C7', 'D7', 'E7', 'G7']):
        add(glock(hz(midi(n))), c0 + k * .045, .05, -.5 + k * .2, .8)

# CENA 5 (27-30): final alegre "ta-da"
FIM = 28.0
add(stab([hz(midi(n)) for n in ['C4', 'E4', 'G4', 'C5', 'E5']], .9), FIM, .55, 0, .5)
add(bumbo(.8), FIM, .8); add(prato(2.5), FIM, .3, 0, .6)
for n in ['C5', 'E5', 'G5', 'C6']:
    add(marimba(hz(midi(n)), 1.5), FIM, .2, 0, .4)
    add(sino(hz(midi(n)), 2.5), FIM, .06, 0, .8)
for k, n in enumerate(['C6', 'E6', 'G6', 'C7', 'E7', 'G7', 'C8']):
    add(glock(hz(midi(n))), FIM + .1 + k * .05, .08, -.6 + k * .2, .8)
add(baixo(hz(midi('C2')), 1.2), FIM, .6)
add(pop(.14), FIM + .65, .3, .3, .5)
add(bolha(600, 2200, .1), FIM + .78, .2, -.3, .5)

# bolhas ambiente ao longo do video
for k in range(40):
    tk = rng.uniform(5.2, 27.5)
    add(bolha(rng.uniform(500, 900), rng.uniform(1400, 2400), rng.uniform(.04, .08)), tk, rng.uniform(.03, .07), rng.uniform(-.9, .9), .5)

# ------------------------------------------------------------------ mixagem
ir_t = t_(1.8)
ir = np.stack([filtro(rng.standard_normal(len(ir_t)), 'lowpass', 6000) * np.exp(-ir_t / .45) for _ in range(2)])
ir[:, :int(.012 * SR)] = 0
rev = np.stack([fftconvolve(envio[k], ir[k])[:N] for k in range(2)]) * .06
mix = seco + rev
mix = filtro(mix, 'highpass', 30)
t = np.arange(N) / SR
mix *= np.clip((DUR - .05 - t) / 1.6, 0, 1) ** 1.5 * (t > 28.35) + (t <= 28.35)  # cauda final suave
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.6) / np.tanh(1.6) * .95

import wave
with wave.open('trilha.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype('<i2').tobytes())
print('trilha.wav gerada')
