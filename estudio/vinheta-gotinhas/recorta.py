"""Recorta as gotinhas e a placa do fundo branco (flood fill a partir das bordas)."""
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
UP = '/root/.claude/uploads/64dd0bf9-4239-5b3d-880e-b07c48cb0f71/'

def tira_fundo(im, lim=238):
    a = np.asarray(im.convert('RGB')).astype(int)
    claro = (a.min(2) > lim) & ((a.max(2) - a.min(2)) < 14)
    lab, n = nd.label(claro)
    borda = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fundo = np.isin(lab, list(borda))
    alpha = ~fundo
    alpha = nd.binary_opening(alpha, iterations=1)
    alpha = nd.binary_fill_holes(alpha)  # buracos internos brancos continuam opacos
    al = Image.fromarray((alpha * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.8))
    out = im.convert('RGBA'); out.putalpha(al)
    return out, alpha

# placa
placa, _ = tira_fundo(Image.open(UP + '60637971-image.png'))
placa.crop(placa.getbbox()).save('recortes/placa.png')
# gotinhas: grade 4x2, cortes nos vales de menor ocupacao
im = Image.open(UP + '504c62ef-image.png')
rgba, alpha = tira_fundo(im)
H, W = alpha.shape
rs = alpha.sum(1); yc = 560 + int(np.argmin(rs[560:720]))
nomes = [['transparente', 'amarelo-claro', 'amarela', 'laranja'], ['rosada', 'castanha', 'esverdeada', 'vermelha']]
for r, (ya, yb) in enumerate([(0, yc), (yc, H)]):
    cs = alpha[ya:yb].sum(0)
    xs = [0] + [c - 70 + int(np.argmin(cs[c - 70:c + 70])) for c in (W // 4, W // 2, 3 * W // 4)] + [W]
    for k in range(4):
        a = alpha[ya:yb, xs[k]:xs[k + 1]]
        lab, n = nd.label(a)
        if n:
            maior = 1 + int(np.argmax(nd.sum(a, lab, range(1, n + 1))))
            keep = lab == maior
        c = np.asarray(rgba.crop((xs[k], ya, xs[k + 1], yb))).copy()
        c[..., 3] = (c[..., 3] * keep).astype('uint8')
        out = Image.fromarray(c); out = out.crop(out.getbbox())
        out.save(f'recortes/{nomes[r][k]}.png'); print(nomes[r][k], out.size)
