#!/usr/bin/env python3
"""Efeitos sonoros do video integrado (gotinhas no video do apresentador). Gera efeitos_integrado.wav."""
import numpy as np, wave
from scipy.signal import butter, sosfilt, fftconvolve
SR, DUR = 48000, 10.0
N = int(SR * DUR); out = np.zeros((2, N)); rng = np.random.default_rng(3)
t_ = lambda d: np.arange(int(SR * d)) / SR
filt = lambda x, k, f: sosfilt(butter(2, f, btype=k, fs=SR, output='sos'), x)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def add(s, ini, g=1, pan=0):
    i = int(ini * SR); s = s[:N - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[0, i:i + len(s)] += s * g * l * 1.41; out[1, i:i + len(s)] += s * g * r * 1.41
def bolha(f0, f1, d):
    t = t_(d); f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * .45)) * np.minimum(1, t / .004)
def glock(f, d=1.4):
    t = t_(d); return sum(a * np.sin(2 * np.pi * f * p * t) * np.exp(-t / dc) for p, a, dc in [(1, 1, 1.0), (2.756, .35, .4), (5.404, .15, .2)]) * np.minimum(1, t / .002)
def boing(f=330, d=.4):
    t = t_(d); ff = f * (1 + .35 * np.sin(2 * np.pi * 13 * t) * np.exp(-t / .12)) * (1 + .5 * np.exp(-t / .05))
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / .15)
def whoosh(d=.6):
    t = t_(d); r = rng.standard_normal(len(t)); s = np.zeros(len(t))
    for k, c in enumerate(np.geomspace(500, 6000, 8)):
        s += filt(r, 'bandpass', [c * .7, c * 1.4]) * np.exp(-((t / d - (1 - (k + .5) / 8)) ** 2) / .02)
    return s / 3
ENTR = sorted(.95 + k * .17 for k in range(7))
for k, e in enumerate(ENTR):
    add(bolha(320, 1300, .1), e + .05, .35, -.6 + k * .2)
    add(glock(hz([72, 74, 76, 77, 79, 81, 83][k])), e + .08, .07, -.6 + k * .2)
add(whoosh(.55), 1.8, .35)                       # placa caindo
add(boing(260, .5), 2.75, .25)
for k, n in enumerate([84, 88, 91, 96]): add(glock(hz(n)), 2.72 + k * .05, .09, -.3 + k * .2)
for e, n, p in [(2.0, 79, -.2), (4.65, 81, .3), (5.7, 84, .6), (6.75, 86, 0), (7.25, 88, -.6), (7.4, 91, -.3)]:
    add(glock(hz(n)), e, .06, p); add(bolha(500, 1600, .07), e + .02, .15, p)
# saida: gotinhas mergulham (bolhas descendo) + sininho final
for k in range(7): add(bolha(1300, 380, .12), 8.85 + abs(k - 3) * .07, .3, -.6 + k * .2)
for k, n in enumerate([96, 91, 88, 84]): add(glock(hz(n)), 9.1 + k * .07, .06, .4 - k * .2)
ir_t = t_(1.2); ir = filt(rng.standard_normal(len(ir_t)), 'lowpass', 6000) * np.exp(-ir_t / .3)
out = out + np.stack([fftconvolve(c, ir)[:N] for c in out]) * .03
out /= np.max(np.abs(out)) + 1e-9; out *= .9
with wave.open('efeitos_integrado.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out.T * 32767).astype('<i2').tobytes())
print('ok')
