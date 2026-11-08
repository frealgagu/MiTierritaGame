"""Fuente de íconos del juego (MiTierrita Icons): glifos de color (COLR v0 + CPAL) para los productos
que no tienen un emoji que se les parezca (la cereza de café, el guarapo, la panela...).

Cada ícono es una lista de capas (color, trazos) dibujadas en un lienzo de 100 × 100 (y hacia abajo,
como SVG). Se generan:
  src/assets/mitierrita-icons.woff2   la fuente (la usan la interfaz y los textos del mapa)
  src/data/icons.js                el código de cada ícono (ICON.cherry = U+E001...), para usarlos
  tools/icons/preview.svg          todos los íconos en grande, para revisarlos

Uso:  pip install fonttools brotli && python3 tools/icons/build_icons.py
"""

import math
import re
from pathlib import Path

from fontTools.colorLib.builder import buildCOLR, buildCPAL
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path

ROOT = Path(__file__).resolve().parents[2]
UPM = 1000
# Del tamaño de un emoji: el lienzo (100 × 100) mide 1,15 em y va de y = 950 a y = -200.
SCALE = 11.5
ADVANCE = 1250
TOP = 950


# ---------- Ayudas de dibujo: devuelven trazos SVG en coordenadas del lienzo ----------

def pts(points):
    return 'M ' + ' L '.join(f'{x:.2f} {y:.2f}' for x, y in points) + ' Z'


def ellipse_pts(cx, cy, rx, ry, rot=0, a0=0, a1=360, n=64):
    r = math.radians(rot)
    out = []
    steps = max(2, round(n * abs(a1 - a0) / 360))
    for i in range(steps + 1):
        t = math.radians(a0 + (a1 - a0) * i / steps)
        x, y = rx * math.cos(t), ry * math.sin(t)
        out.append((cx + x * math.cos(r) - y * math.sin(r), cy + x * math.sin(r) + y * math.cos(r)))
    return out


def ellipse(cx, cy, rx, ry, rot=0):
    return pts(ellipse_pts(cx, cy, rx, ry, rot)[:-1])


def circle(cx, cy, r):
    return ellipse(cx, cy, r, r)


def poly(*xy):
    return pts(list(zip(xy[0::2], xy[1::2])))


def rect(x, y, w, h, rot=0, cx=None, cy=None):
    corners = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    if rot:
        cx = x + w / 2 if cx is None else cx
        cy = y + h / 2 if cy is None else cy
        r = math.radians(rot)
        corners = [(cx + (px - cx) * math.cos(r) - (py - cy) * math.sin(r), cy + (px - cx) * math.sin(r) + (py - cy) * math.cos(r)) for px, py in corners]
    return pts(corners)


def leaf(x0, y0, x1, y1, width):
    """Hoja en punta de (x0, y0) a (x1, y1), con curvas a cada lado."""
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    nx, ny = -dy / length * width, dx / length * width
    return f'M {x0} {y0} Q {mx + nx:.2f} {my + ny:.2f} {x1} {y1} Q {mx - nx:.2f} {my - ny:.2f} {x0} {y0} Z'


def rib(x0, y0, x1, y1, width=1.2):
    """Línea fina (nervio de una hoja) como figura cerrada."""
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    nx, ny = -dy / length * width / 2, dx / length * width / 2
    return poly(x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny)


def grow(points, cx, cy, d):
    """Contorno: la misma figura agrandada d unidades desde (cx, cy) (para el borde oscuro)."""
    out = []
    for x, y in points:
        vx, vy = x - cx, y - cy
        k = math.hypot(vx, vy) or 1
        out.append((x + vx / k * d, y + vy / k * d))
    return pts(out)


# ---------- Los íconos ----------

OUTLINE = '#5b3a24'


def cherry():
    """Cereza de café: racimo de granos ovalados rojos con su «ombligo», en la rama con hojas."""
    layers = [
        ('#2e7d32', [leaf(50, 38, 4, 14, 11)]),
        ('#388e3c', [leaf(52, 38, 96, 10, 11)]),
        ('#81c784', [rib(48, 37, 9, 16), rib(54, 37, 91, 12)]),
        ('#6d4c41', ['M 4 42 Q 50 30 96 42 L 96 48 Q 50 37 4 48 Z']),
    ]
    beans = [  # cx, cy, rx, ry, rotación, color
        (50, 52, 12, 14, 0, '#7cb342'),  # una todavía verde: el racimo madura disparejo
        (32, 62, 14, 18, 18, '#b71c1c'),
        (68, 62, 14, 18, -18, '#c62828'),
        (50, 74, 15, 19, 0, '#e53935'),
    ]
    for cx, cy, rx, ry, rot, color in beans:
        layers.append((OUTLINE, [grow(ellipse_pts(cx, cy, rx, ry, rot)[:-1], cx, cy, 1.8)]))
        layers.append((color, [ellipse(cx, cy, rx, ry, rot)]))
    tips, shines = [], []
    for cx, cy, rx, ry, rot, _ in beans:
        r = math.radians(rot)
        # El ombligo, en la punta de abajo del grano; el brillo, arriba a la izquierda.
        tips.append(circle(cx - ry * 0.82 * math.sin(r), cy + ry * 0.82 * math.cos(r), 2.6))
        shines.append(ellipse(cx - rx * 0.4, cy - ry * 0.35, rx * 0.22, ry * 0.3, rot - 20))
    layers.append(('#3e0d0d', tips))
    layers.append(('#ffffffa0', shines))
    return layers


def guarapo():
    """Guarapo: vaso con jugo de caña verde amarillento, espuma, hielo, limón y un trozo de caña."""
    cane = [rect(64, 0, 10, 64, 14, 69, 32)]
    nodes = [rect(63, 15, 12, 3, 14, 69, 32), rect(63, 37, 12, 3, 14, 69, 32)]
    glass = poly(20, 20, 80, 20, 72, 96, 28, 96)
    juice = poly(23.5, 34, 76.5, 34, 70, 91, 30, 91)
    foam = ['M 23 36 L 77 36 L 76.6 31 Q 72 26 67 30 Q 62 25 56 29 Q 50 24 44 29 Q 38 25 33 30 Q 27 26 23.4 31 Z']
    return [
        ('#8bc34a', cane),
        ('#558b2f', nodes),
        (OUTLINE, [grow([(20, 20), (80, 20), (72, 96), (28, 96)], 50, 58, 2.2)]),
        ('#dcecf2', [glass]),
        ('#b9c94a', [juice]),
        ('#cddc68', [poly(23.5, 34, 40, 34, 37, 91, 30, 91)]),
        ('#f3efd2', foam),
        ('#ffffff99', [rect(33, 52, 13, 13, 20), rect(52, 64, 12, 12, -15)]),
        ('#ffffffcc', [poly(23, 24, 27, 24, 31, 92, 29, 92)]),
        ('#558b2f', [circle(22, 24, 12)]),
        ('#c5e1a5', [circle(22, 24, 9.5)]),
        ('#8bc34a', [rib(22, 24, 22, 15, 1.4), rib(22, 24, 30, 28, 1.4), rib(22, 24, 14, 28, 1.4)]),
    ]


def panela():
    """Panela: bloque de molde (gavera), de lados inclinados, café dorado, sobre hoja seca de plátano."""
    return [
        ('#c9a96b', ['M 2 80 Q 50 66 98 72 L 94 90 Q 50 99 6 93 Z']),
        ('#a3844a', [rib(10, 86, 92, 78, 1.2), rib(30, 92, 40, 78, 1), rib(60, 92, 66, 77, 1)]),
        (OUTLINE, [grow([(8, 86), (72, 86), (90, 70), (80, 30), (30, 30), (15, 48)], 49, 60, 2.2)]),
        ('#9a4e1b', [poly(8, 86, 72, 86, 66, 48, 15, 48)]),
        ('#d8923c', [poly(15, 48, 66, 48, 80, 30, 30, 30)]),
        ('#76390f', [poly(66, 48, 80, 30, 90, 70, 72, 86)]),
        ('#ecb465', [circle(30, 40, 1.9), circle(46, 36, 1.6), circle(58, 42, 1.9), circle(68, 34, 1.5), circle(38, 44, 1.4)]),
        ('#6e3510', [circle(24, 66, 1.7), circle(40, 76, 1.5), circle(54, 60, 1.7), circle(62, 78, 1.4), circle(18, 80, 1.3), circle(32, 56, 1.3)]),
        ('#f0bd73', [poly(16, 49, 65, 49, 64.6, 51.5, 16.4, 51.5)]),
    ]


def panela_powder():
    """Panela pulverizada: montoncito dorado y amarillo en una totuma de madera."""
    heap = 'M 12 62 Q 26 26 50 18 Q 74 26 88 62 Z'
    return [
        ('#7a4a22', [ellipse(50, 62, 44, 8)]),
        (OUTLINE, ['M 9.5 63 Q 24 23 50 15.5 Q 76 23 90.5 63 Z']),
        ('#f2b823', [heap]),
        ('#d99a12', ['M 50 18 Q 74 26 88 62 L 62 62 Q 60 36 50 18 Z']),
        ('#ffe066', ['M 22 56 Q 30 34 46 24 Q 34 38 30 56 Z']),
        ('#b07a0c', [circle(40, 44, 1.3), circle(58, 40, 1.2), circle(66, 52, 1.4), circle(48, 56, 1.2), circle(30, 54, 1.1), circle(54, 30, 1)]),
        ('#fff1a8', [circle(36, 36, 1.2), circle(50, 46, 1.1), circle(62, 30, 1), circle(72, 48, 1.2)]),
        (OUTLINE, ['M 3.5 61 L 96.5 61 Q 92 96 50 97.5 Q 8 96 3.5 61 Z']),
        ('#a0652e', ['M 6 62 L 94 62 Q 90 93 50 95 Q 10 93 6 62 Z']),
        ('#c8884a', ['M 10 66 L 90 66 Q 89 70 87 72 L 13 72 Q 11 70 10 66 Z']),
        ('#f2b823', [circle(16, 98, 1.6), circle(84, 97, 1.4)]),
    ]


def cheese():
    """Queso campesino: rueda blanca con una tajada cortada, sobre hoja de plátano."""
    cx, cy, rx, ry, h = 49, 34, 41, 17, 34
    cut0, cut1 = 8, 78  # tajada que falta (grados, 90 = de frente)
    top = [(cx, cy)] + ellipse_pts(cx, cy, rx, ry, 0, cut1, 360 + cut0, 96)
    p = lambda a, dz=0: (cx + rx * math.cos(math.radians(a)), cy + ry * math.sin(math.radians(a)) + dz)

    def band(a0, a1):
        upper = ellipse_pts(cx, cy, rx, ry, 0, a0, a1, 64)
        lower = ellipse_pts(cx, cy + h, rx, ry, 0, a1, a0, 64)
        return pts(upper + lower)

    face_front = pts([(cx, cy), p(cut1), p(cut1, h), (cx, cy + h)])
    face_side = pts([(cx, cy), p(cut0), p(cut0, h), (cx, cy + h)])
    # Borde oscuro: cada parte un poco agrandada (sin rellenar el hueco de la tajada).
    top_out = ellipse_pts(cx, cy, rx + 2.2, ry + 2.2, 0, cut1, 360 + cut0, 96)
    back = ellipse_pts(cx, cy + h, rx + 2.2, ry + 2.2, 0, cut1, 180, 48)
    side = ellipse_pts(cx, cy + h, rx + 2.2, ry + 2.2, 0, 0, cut0, 16)
    q = lambda a, dz=0: (cx + (rx + 2.2) * math.cos(math.radians(a)), cy + (ry + 2.2) * math.sin(math.radians(a)) + dz)
    outline = [
        pts([(cx, cy - 2)] + top_out),
        pts(ellipse_pts(cx, cy, rx + 2.2, ry + 2.2, 0, cut1, 180, 48) + back[::-1]),
        pts(ellipse_pts(cx, cy, rx + 2.2, ry + 2.2, 0, 0, cut0, 16) + side[::-1]),
        pts([(cx - 2, cy), q(cut1), q(cut1, h), (cx - 2, cy + h + 2.2)]),
        pts([(cx, cy - 2), q(cut0), q(cut0, h), (cx + 2, cy + h + 2.2)]),
    ]
    return [
        ('#43a047', [leaf(0, 88, 100, 78, 14)]),
        ('#2e7d32', [rib(2, 88, 98, 78, 1.4)]),
        (OUTLINE, outline),
        ('#e9e1cc', [band(cut1, 180), band(0, cut0)]),
        ('#f4eedd', [face_side]),
        ('#fbf7ea', [face_front]),
        ('#fffdf6', [pts(top)]),
        ('#e7dfc8', [circle(28, 32, 1.8), circle(40, 27, 1.5), circle(56, 26, 1.7), circle(22, 38, 1.4), circle(68, 30, 1.4), circle(36, 40, 1.4), circle(26, 58, 1.6), circle(40, 66, 1.4), circle(16, 52, 1.3)]),
    ]


def milk():
    """Leche pasteurizada: botella de vidrio con tapa y etiqueta azules."""
    bottle = 'M 39 14 L 61 14 L 61 26 Q 77 33 77 47 L 77 88 Q 77 95 70 95 L 30 95 Q 23 95 23 88 L 23 47 Q 23 33 39 26 Z'
    body = 'M 25 46 Q 25 36 39 30 L 61 30 Q 75 36 75 46 L 75 88 Q 75 93 70 93 L 30 93 Q 25 93 25 88 Z'
    return [
        (OUTLINE, ['M 37 12 L 63 12 L 63 24.5 Q 79.5 32 79.5 47 L 79.5 88 Q 79.5 97.5 70 97.5 L 30 97.5 Q 20.5 97.5 20.5 88 L 20.5 47 Q 20.5 32 37 24.5 Z']),
        ('#d6e9f0', [bottle]),
        ('#ffffff', [body]),
        ('#e6edf0', ['M 62 32 Q 75 37 75 46 L 75 88 Q 75 93 70 93 L 62 93 Z']),
        ('#1e63c6', [rect(36, 4, 28, 12)]),
        ('#5b95e6', [rect(36, 6, 28, 2.5)]),
        ('#2e7dd7', [rect(25, 54, 50, 22)]),
        ('#ffffff', ['M 50 58 Q 57 66 57 69 Q 57 74 50 74 Q 43 74 43 69 Q 43 66 50 58 Z']),
        ('#ffffffcc', [rect(29, 40, 4, 48)]),
    ]


def cream():
    """Crema de leche: pote abierto, lleno de crema espesa, con una cuchara."""
    swirl = 'M 20 48 Q 20 36 34 36 Q 40 28 52 31 Q 64 27 70 35 Q 80 36 80 48 Z'
    swirl_out = 'M 17.5 49.5 Q 17 33.5 33 33.5 Q 40 25 52 28.5 Q 65 24 72 32.5 Q 83 34 82.5 49.5 Z'
    spoon = 'M 58 30 L 84 4 L 88 8 L 62 34 Z'
    spoon_bowl = ellipse(87, 4, 6, 4, -45)
    return [
        ('#9aa5ad', [spoon, spoon_bowl]),
        ('#c9d2d8', [rib(60, 31, 85, 6, 1.4)]),
        (OUTLINE, ['M 18 46 L 82 46 L 77.5 91 Q 76.5 97 69 97 L 31 97 Q 23.5 97 22.5 91 Z']),
        ('#7fb8e0', ['M 21 47 L 79 47 L 75 90 Q 74 94 68 94 L 32 94 Q 26 94 25 90 Z']),
        ('#5f9fcf', ['M 64 47 L 79 47 L 75 90 Q 74 94 68 94 L 62 94 Z']),
        ('#fff3d6', [poly(22.6, 60, 77.6, 60, 76.2, 76, 24, 76)]),
        ('#2e6fd1', [poly(22.3, 64, 77.8, 64, 77.6, 67, 22.6, 67)]),
        ('#5f9fcf', [ellipse(50, 47, 30, 6)]),
        (OUTLINE, [swirl_out]),
        ('#fffdf6', [swirl]),
        ('#efe4c6', ['M 28 44 Q 46 38 70 42 Q 46 41 28 46 Z', 'M 38 37 Q 50 33 62 36 Q 50 36 38 39 Z']),
    ]


def rotate(points, angle, cx, cy):
    r = math.radians(angle)
    return [(cx + (x - cx) * math.cos(r) - (y - cy) * math.sin(r), cy + (x - cx) * math.sin(r) + (y - cy) * math.cos(r)) for x, y in points]


def bean(cx, cy, rx, ry, rot, color, seam, shine):
    """Grano de cacao: almendra con su raya al medio y un brillo."""
    r = math.radians(rot)
    dx, dy = rx * 0.75 * math.cos(r), rx * 0.75 * math.sin(r)
    return [
        (OUTLINE, [grow(ellipse_pts(cx, cy, rx, ry, rot)[:-1], cx, cy, 1.6)]),
        (color, [ellipse(cx, cy, rx, ry, rot)]),
        (seam, [rib(cx - dx, cy - dy, cx + dx, cy + dy, 1.4)]),
        (shine, [ellipse(cx - rx * 0.35 * math.cos(r) + ry * 0.35 * math.sin(r), cy - rx * 0.35 * math.sin(r) - ry * 0.4 * math.cos(r), rx * 0.3, ry * 0.18, rot)]),
    ]


def cacao_dry():
    """Cacao seco: granos color canela, claros, secándose en una estera de guadua."""
    layers = [
        ('#c9a265', [poly(4, 70, 70, 54, 96, 72, 30, 92)]),
        ('#a98446', [rib(14, 72, 78, 57, 1.3), rib(21, 78, 85, 62, 1.3), rib(28, 84, 91, 67, 1.3), rib(9, 66, 72, 52, 1.0)]),
    ]
    for args in [(36, 52, 14, 9, -15, '#c08a5a'), (60, 46, 14, 9, 20, '#b07a4c'), (50, 64, 15, 9.5, 5, '#d09b68'), (24, 66, 12, 8, 30, '#b98353'), (72, 62, 13, 8.5, -25, '#c7935f')]:
        cx, cy, rx, ry, rot, color = args
        layers += bean(cx, cy, rx, ry, rot, color, '#8a5a34', '#f3d3a8')
    return layers


def cacao_roasted():
    """Cacao tostado: granos casi negros, brillantes, en el tiesto, con humo."""
    layers = [
        ('#d9d4cc', ['M 30 30 Q 22 20 30 12 Q 36 6 32 0 Q 42 8 36 16 Q 30 22 36 30 Z', 'M 62 28 Q 56 18 64 10 Q 70 4 66 -2 Q 76 6 70 14 Q 64 20 70 28 Z']),
        ('#3d3d3d', [ellipse(50, 74, 46, 16)]),
        ('#6b6b6b', [ellipse(50, 70, 42, 12)]),
    ]
    for args in [(34, 62, 13, 8.5, -10, '#4a2817'), (58, 58, 13, 8.5, 25, '#3b1f10'), (48, 72, 14, 9, 5, '#55301b'), (70, 70, 12, 8, -20, '#43240f'), (26, 74, 11, 7.5, 15, '#4f2b16')]:
        cx, cy, rx, ry, rot, color = args
        layers += bean(cx, cy, rx, ry, rot, color, '#1e0f06', '#a87a5a')
    return layers


def milk_chocolate():
    """Chocolatina con leche: barra de chocolate claro, medio desenvuelta, en papel azul con leche."""
    cx, cy, a = 50, 50, -22
    R = lambda pts_: pts(rotate(pts_, a, cx, cy))
    bar = [(30, 6), (70, 6), (70, 60), (30, 60)]
    layers = [
        (OUTLINE, [R([(27.5, 3.5), (72.5, 3.5), (72.5, 96.5), (27.5, 96.5)])]),
        ('#7a4424', [R(bar)]),
    ]
    squares_light, squares_dark = [], []
    for row in range(3):
        for col in range(2):
            x0, y0 = 32.5 + col * 18.5, 8.5 + row * 17
            squares_dark.append(R([(x0, y0), (x0 + 16.5, y0), (x0 + 16.5, y0 + 15), (x0, y0 + 15)]))
            squares_light.append(R([(x0 + 2, y0 + 2), (x0 + 14.5, y0 + 2), (x0 + 14.5, y0 + 12), (x0 + 2, y0 + 12)]))
    layers += [('#8f5530', squares_dark), ('#b07040', squares_light)]
    foil = [(30, 56)] + [(30 + i * 5, 52 if i % 2 else 58) for i in range(1, 8)] + [(70, 56), (70, 64), (30, 64)]
    layers += [
        ('#c9ced3', [R(foil)]),
        ('#2e6fd1', [R([(30, 62), (70, 62), (70, 94), (30, 94)])]),
        ('#ffffff', [R([(33, 72), (40, 66), (46, 71), (53, 65), (60, 70), (67, 66), (67, 80), (60, 84), (52, 79), (44, 85), (37, 79), (33, 82)])]),
        ('#8f5530', [R([(42, 86), (58, 86), (58, 89), (42, 89)])]),
        ('#1f4f9c', [R([(30, 91), (70, 91), (70, 94), (30, 94)])]),
    ]
    return layers


def arepa_disc(cx, cy, rx, ry, h):
    """Arepa: disco grueso de masa dorada (cara de arriba y canto), con su borde oscuro."""
    side = ellipse_pts(cx, cy, rx, ry, 0, 0, 180, 48) + ellipse_pts(cx, cy + h, rx, ry, 0, 180, 0, 48)
    out = ellipse_pts(cx, cy, rx, ry, 0, 180, 360, 48) + ellipse_pts(cx, cy + h, rx, ry, 0, 0, 180, 48)
    return [
        (OUTLINE, [grow(out, cx, cy + h / 2, 2.2)]),
        ('#cf9a4c', [pts(side)]),
        ('#ecc471', [ellipse(cx, cy, rx, ry)]),
    ]


def toasted(spots, color='#b9792e'):
    """Manchas tostadas del budare."""
    return (color, [ellipse(x, y, r * 1.4, r, rot) for x, y, r, rot in spots])


def arepa():
    """Arepa sola: una arepa grande, dorada y tostada en el budare."""
    return [
        *arepa_disc(50, 46, 46, 22, 16),
        toasted([(28, 40, 3.2, 10), (44, 32, 2.4, -15), (66, 36, 3, 20), (78, 48, 2.6, -10), (56, 54, 3.4, 5), (34, 56, 2.6, 25), (20, 50, 2, 0), (60, 42, 1.8, 0), (46, 46, 1.6, 0)]),
        ('#d8a650', [ellipse(40, 40, 7, 2.5, -10), ellipse(64, 50, 6, 2, 12)]),
        ('#f6dc98', [ellipse(36, 34, 10, 3, -8)]),
        ('#8f5a22', [rib(10, 52, 20, 60, 1.6), rib(80, 62, 90, 54, 1.6), rib(44, 70, 56, 70, 1.4)]),
    ]


def cheese_arepa():
    """Arepas de queso: dos arepas doradas, con el queso blanco derretido chorreando por el borde."""
    cx, cy, rx, ry, h = 50, 58, 44, 18, 13

    def rim_y(x):
        return cy + ry * math.sqrt(max(0, 1 - ((x - cx) / rx) ** 2))

    def melted(dx=0, dy=0):
        shapes = [
            ellipse(50 + dx, 63 + dy, 25, 10),  # el queso encima, hasta el borde de adelante
            ellipse(34 + dx, 67 + dy, 11, 7),
            ellipse(66 + dx, 67 + dy, 11, 7),
        ]
        # Lo que rebasa el borde: una franja sobre el canto...
        lip = [(x, rim_y(x) - 3) for x in range(28, 73, 3)]
        shapes.append(pts([(x + dx, y + dy) for x, y in lip] + [(x + dx, y + 7 + dy) for x, y in lip[::-1]]))
        # ...y chorros redondeados de distinto largo.
        for x, length in [(33, 7), (42, 12), (51, 5), (59, 10), (67, 4)]:
            top = rim_y(x)
            shapes.append(rect(x - 3 + dx, top + dy, 6, length))
            shapes.append(circle(x + dx, top + length + dy, 3))
        return shapes

    return [
        *arepa_disc(56, 24, 36, 14, 10),
        toasted([(46, 22, 2.2, 0), (62, 18, 1.8, 0), (76, 26, 2, 10), (34, 28, 1.6, 0)]),
        *arepa_disc(cx, cy, rx, ry, h),
        toasted([(16, 58, 2.4, 0), (86, 60, 2.2, 0), (24, 50, 1.8, 0), (78, 50, 2, 0), (60, 46, 1.6, 0)]),
        ('#b9ad8c', melted(1.2, 1.6)),
        ('#fffaf0', melted()),
        ('#ffffff', [ellipse(44, 59, 10, 2.6, -6), ellipse(62, 58, 5, 1.6, 8), rect(41, 76, 1.6, 7)]),
    ]


def curve(x0, y0, qx, qy, x1, y1, width=1.4):
    """Línea curva fina (una curva cuadrática) como figura cerrada."""
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy) or 1
    nx, ny = -dy / length * width / 2, dx / length * width / 2
    return (f'M {x0 + nx:.2f} {y0 + ny:.2f} Q {qx + nx:.2f} {qy + ny:.2f} {x1 + nx:.2f} {y1 + ny:.2f} '
            f'L {x1 - nx:.2f} {y1 - ny:.2f} Q {qx - nx:.2f} {qy - ny:.2f} {x0 - nx:.2f} {y0 - ny:.2f} Z')


def coffee_bean(cx, cy, rx, ry, rot, color, crease, shine, husk=None):
    """Grano de café: óvalo con su surco curvo (y la cascarilla del pergamino, si se pide)."""
    r = math.radians(rot)
    ux, uy = math.cos(r), math.sin(r)
    vx, vy = -math.sin(r), math.cos(r)
    a = (cx - ux * rx * 0.72, cy - uy * rx * 0.72)
    b = (cx + ux * rx * 0.72, cy + uy * rx * 0.72)
    q = (cx + vx * ry * 0.45, cy + vy * ry * 0.45)
    layers = [(OUTLINE, [grow(ellipse_pts(cx, cy, rx + (2 if husk else 0), ry + (2 if husk else 0), rot)[:-1], cx, cy, 1.6)])]
    if husk:
        layers.append((husk, [ellipse(cx, cy, rx + 2, ry + 2, rot)]))
    layers += [
        (color, [ellipse(cx, cy, rx, ry, rot)]),
        (crease, [curve(a[0], a[1], q[0], q[1], b[0], b[1], 1.8)]),
        (shine, [ellipse(cx - vx * ry * 0.45 - ux * rx * 0.2, cy - vy * ry * 0.45 - uy * rx * 0.2, rx * 0.32, ry * 0.16, rot)]),
    ]
    return layers


PILE = [(30, 62, -20), (54, 56, 15), (42, 74, 5), (68, 70, -10), (52, 42, -35)]


def bean_pile(color, crease, shine, husk=None, colors=None, rx=14, ry=10):
    layers = []
    for i, (cx, cy, rot) in enumerate(sorted(PILE, key=lambda b: b[1])):
        layers += coffee_bean(cx, cy, rx, ry, rot, (colors or [color])[i % len(colors or [color])], crease, shine, husk)
    return layers


def washed():
    """Café lavado: granos claros, mojados, recién salidos del agua."""
    drops = []
    for x, y, r in [(20, 26, 5), (80, 22, 6), (66, 12, 4)]:
        drops.append(f'M {x} {y - r * 2.2} Q {x + r} {y - r * 0.4} {x + r} {y + r * 0.3} Q {x + r} {y + r * 1.3} {x} {y + r * 1.3} Q {x - r} {y + r * 1.3} {x - r} {y + r * 0.3} Q {x - r} {y - r * 0.4} {x} {y - r * 2.2} Z')
    return [
        ('#8fc8ee', [ellipse(50, 80, 46, 14)]),
        ('#bfe2f7', [ellipse(46, 78, 30, 7)]),
        *bean_pile('#e8d6a3', '#b39a5c', '#ffffff', colors=['#e8d6a3', '#dcc68e', '#efe0b4']),
        ('#2e86d6', drops),
        ('#d8eefb', [circle(18, 25, 1.6), circle(78, 21, 1.8)]),
    ]


def pulp():
    """Pulpa: las cáscaras rojas que suelta la cereza al despulparla, abiertas y arrugadas."""
    def peel(cx, cy, rx, ry, rot):
        outer = ellipse_pts(cx, cy, rx, ry, rot, 200, 520, 40)
        inner = ellipse_pts(cx + 3 * math.cos(math.radians(rot - 90)), cy + 3 * math.sin(math.radians(rot - 90)), rx * 0.78, ry * 0.55, rot, 520, 200, 40)
        return pts(outer + inner), outer, inner

    layers = []
    for cx, cy, rot, color in [(32, 44, -25, '#9b2335'), (68, 42, 25, '#b52a3e'), (50, 66, 0, '#c43246'), (24, 72, 20, '#a12639'), (76, 72, -20, '#b52a3e')]:
        shape, outer, inner = peel(cx, cy, 17, 13, rot)
        layers.append((OUTLINE, [grow(outer + inner, cx, cy, 1.6)]))
        layers.append(('#f0d9a8', [ellipse(cx, cy - 1, 13, 7, rot)]))
        layers.append((color, [shape]))
        layers.append(('#e58a96', [ellipse(cx - 7 * math.cos(math.radians(rot)), cy + 5, 3.5, 1.4, rot + 25)]))
    return layers

def parchment():
    """Café pergamino: granos secos, todavía con su cascarilla de papel."""
    return [
        ('#c9a265', [poly(4, 74, 66, 60, 96, 76, 34, 94)]),
        ('#a98446', [rib(14, 76, 74, 63, 1.2), rib(22, 82, 82, 68, 1.2), rib(30, 88, 90, 72, 1.2)]),
        *bean_pile('#d6b97c', '#a3854a', '#fff6dc', husk='#f3e6c2', colors=['#d6b97c', '#cfb072', '#dcc28a']),
    ]


def green():
    """Café verde: granos verde grisáceo, trillados y listos para tostar."""
    return [
        ('#d9c08c', ['M 6 92 Q 4 70 18 64 L 82 64 Q 96 70 94 92 Z']),
        ('#c2a46c', [rib(10, 72, 90, 72, 1.2), rib(8, 82, 92, 82, 1.2)]),
        *bean_pile('#9fb57a', '#5f7445', '#e6f0d2', colors=['#9fb57a', '#8ea56a', '#a9be86']),
    ]


def coffee_roasted():
    """Café tostado: granos café oscuro, brillantes, con su surco."""
    return bean_pile('#5a3420', '#1e0f06', '#b0805c', colors=['#5a3420', '#4a2a17', '#6b3e26'], rx=15, ry=11)


def ground():
    """Café molido: montoncito de café en polvo, con un grano al lado."""
    return [
        ('#c9a265', [ellipse(50, 84, 46, 10)]),
        (OUTLINE, ['M 9 82 Q 22 36 48 26 Q 76 34 91 82 Z']),
        ('#4a2a1a', ['M 12 81 Q 24 40 48 29 Q 74 37 88 81 Z']),
        ('#2e190e', ['M 48 29 Q 74 37 88 81 L 62 81 Q 60 50 48 29 Z']),
        ('#6b3e26', ['M 22 74 Q 30 50 44 38 Q 34 54 30 74 Z']),
        ('#8a5a3a', [circle(36, 60, 1.3), circle(52, 50, 1.2), circle(60, 66, 1.4), circle(44, 72, 1.2), circle(70, 74, 1.1)]),
        *coffee_bean(84, 26, 9, 6.5, -30, '#5a3420', '#1e0f06', '#b0805c'),
    ]


def coffee_bag():
    """Bolsa de café: paquete de papel kraft doblado arriba, con la etiqueta del grano."""
    return [
        (OUTLINE, ['M 20.5 22 L 79.5 22 L 84.5 97.5 L 15.5 97.5 Z']),
        ('#c8956a', ['M 23 24 L 77 24 L 82 95 L 18 95 Z']),
        ('#ad7a52', ['M 66 24 L 77 24 L 82 95 L 70 95 Z']),
        (OUTLINE, [rect(21.5, 6.5, 57, 19)]),
        ('#d9a87c', [rect(24, 9, 52, 14)]),
        ('#ad7a52', [rect(24, 14, 52, 2.4)]),
        ('#fff3d6', [rect(28, 42, 44, 36)]),
        ('#d7263d', [rect(28, 42, 44, 7)]),
        *coffee_bean(50, 64, 11, 8, -25, '#5a3420', '#1e0f06', '#b0805c'),
    ]


def compost():
    """Compost: montón de tierra negra con una lombriz y un brote."""
    worm = curve(26, 66, 34, 54, 46, 62, 5)
    return [
        (OUTLINE, ['M 3 90 Q 14 52 50 44 Q 86 52 97 90 Z']),
        ('#5b4636', ['M 6 88 Q 16 55 50 47 Q 84 55 94 88 Z']),
        ('#46352a', ['M 50 47 Q 84 55 94 88 L 64 88 Q 62 62 50 47 Z']),
        ('#7a6250', [circle(30, 74, 2.2), circle(44, 62, 1.8), circle(58, 76, 2), circle(70, 66, 1.6), circle(22, 84, 1.6), circle(80, 80, 1.8), circle(52, 84, 1.4)]),
        ('#e8919b', [worm]),
        ('#c86a75', [circle(45.5, 61.5, 2.4)]),
        ('#4caf50', [leaf(62, 46, 76, 30, 6), leaf(62, 46, 52, 28, 5)]),
        ('#2e7d32', [rib(62, 47, 62, 40, 1.6)]),
    ]


def bagasse():
    """Bagazo: las fibras de la caña ya molida, en un manojo desordenado."""
    strips = [(10, 80, 50, 58, 90, 74, '#e0cf94'), (14, 66, 46, 40, 86, 56, '#d4bf7e'), (20, 88, 56, 70, 92, 88, '#cdb878'), (12, 52, 44, 26, 80, 40, '#e6d7a2'), (24, 74, 60, 50, 94, 62, '#d9c587')]
    layers = []
    for x0, y0, qx, qy, x1, y1, color in strips:
        layers.append((OUTLINE, [curve(x0, y0, qx, qy, x1, y1, 12)]))
        layers.append((color, [curve(x0, y0, qx, qy, x1, y1, 9)]))
        layers.append(('#a8915a', [curve(x0 + 2, y0, qx, qy, x1 - 2, y1, 1.2)]))
    return layers


def kernel(cx, cy, rot, color, tip, size=1.0):
    """Grano de maíz: diente de arriba ancho y redondeado, angosto abajo, con el germen más claro."""
    k = size
    path = [(-7.5, -1)] + [(7.5 * math.cos(math.radians(a)), -1 - 8 * math.sin(math.radians(a))) for a in range(180, -1, -15)][::-1] + [(7.5, -1), (4, 8), (0, 9.5), (-4, 8)]
    shape = rotate([(cx + x * k, cy + y * k) for x, y in path], rot, cx, cy)
    germ = rotate([(cx + x * k, cy + y * k) for x, y in [(0, -6), (3, -1), (2, 5), (0, 6.5), (-2, 5), (-3, -1)]], rot, cx, cy)
    return [
        (OUTLINE, [grow(shape, cx, cy, 1.4)]),
        (color, [pts(shape)]),
        (tip, [pts(germ)]),
    ]

KERNELS = [(30, 40, -20), (50, 34, 5), (70, 40, 25), (22, 60, -35), (42, 56, -5), (62, 56, 15), (80, 62, 30), (32, 76, -15), (52, 76, 10), (70, 80, 20)]


def corn_kernels():
    """Maíz desgranado: granos amarillos sueltos."""
    layers = []
    for i, (cx, cy, rot) in enumerate(KERNELS):
        layers += kernel(cx, cy, rot, ['#f2c230', '#e9b520', '#f5cc45'][i % 3], '#ffe48a')
    return layers


def corn_hulled():
    """Maíz pilado: granos blancos, pelados, en el pilón de madera."""
    layers = [
        (OUTLINE, ['M 14 52 L 86 52 L 78 90 Q 50 98 22 90 Z']),
        ('#8b5a2b', ['M 17 54 L 83 54 L 76 88 Q 50 95 24 88 Z']),
        ('#6e4420', ['M 62 54 L 83 54 L 76 88 Q 68 91 60 92 Z']),
        ('#a87442', [ellipse(50, 54, 34, 8)]),
    ]
    for i, (cx, cy, rot) in enumerate([(34, 46, -20), (50, 40, 5), (66, 46, 25), (42, 30, -10), (58, 30, 15), (50, 52, 0)]):
        layers += kernel(cx, cy, rot, ['#f4ecd6', '#ece2c4', '#f8f2e2'][i % 3], '#ffffff', 0.95)
    return layers


def corn_dough():
    """Masa de maíz: bola de masa amarilla clara sobre la tabla."""
    return [
        (OUTLINE, [rect(4.5, 72.5, 91, 21)]),
        ('#b07a44', [rect(7, 75, 86, 16)]),
        ('#8f5f33', [rib(10, 83, 90, 83, 1.2)]),
        (OUTLINE, [ellipse(50, 52, 37, 30)]),
        ('#f1dc9a', [ellipse(50, 52, 34.5, 27.5)]),
        ('#e2c579', ['M 50 79 Q 78 78 84 56 Q 82 76 50 79 Z', 'M 30 60 Q 44 66 58 60 Q 44 70 30 60 Z']),
        ('#fbefc6', [ellipse(36, 38, 12, 6, -20)]),
        ('#d9b86a', [circle(60, 40, 1.4), circle(66, 52, 1.2), circle(44, 50, 1.2)]),
    ]


def cacao_pod():
    """Mazorca de cacao: gruesa, alargada, con surcos, amarilla y rojiza, colgando del tallo."""
    x0, y0, x1, y1 = 30, 14, 70, 94
    w = 38
    layers = [
        ('#6d4c41', [rect(26, 0, 6, 18, -20)]),
        (OUTLINE, [leaf(x0 - 2.5, y0 - 2.5, x1 + 2.5, y1 + 2.5, w + 3)]),
        ('#e8961c', [leaf(x0, y0, x1, y1, w)]),
        ('#c9502a', [leaf(x0, y0, 56, 52, 18)]),
        ('#f5c04a', [leaf(x0 + 10, y0 + 22, x1 - 6, y1 - 14, 10)]),
    ]
    ridges = [curve(x0, y0, x0 - 18, 62, x1, y1, 2.2), curve(x0, y0, 32, 58, x1, y1, 2.2), curve(x0, y0, 52, 50, x1, y1, 2.2), curve(x0, y0, 72, 44, x1, y1, 2.2), curve(x0, y0, x1 + 18, 40, x1, y1, 2.2)]
    layers.append(('#a8650c', ridges))
    return layers

def cacao_paste():
    """Pasta de cacao: el cacao molido, espeso y brillante, en una totuma con su cuchara."""
    return [
        ('#8b5a2b', [rect(60, 2, 7, 46, 28)]),
        (OUTLINE, ['M 6 46 L 94 46 Q 90 92 50 95 Q 10 92 6 46 Z']),
        ('#b5651d', ['M 9 48 L 91 48 Q 87 89 50 92 Q 13 89 9 48 Z']),
        ('#934f15', ['M 66 48 L 91 48 Q 87 84 66 90 Z']),
        ('#4b2e1a', [ellipse(50, 47, 41, 11)]),
        ('#6b4428', [ellipse(40, 44, 16, 4, -5)]),
        ('#4b2e1a', ['M 18 52 Q 20 62 23 63 Q 26 61 25 52 Z', 'M 70 54 Q 72 66 75 66 Q 78 64 76 53 Z']),
        ('#8b5a2b', [rect(56, 30, 8, 18, 28)]),
    ]


def cafe_origen():
    """Café de origen: costal de fique amarrado, con granos tostados y una franja de Colombia."""
    return [
        (OUTLINE, ['M 18 28 Q 12 60 16 92 L 84 92 Q 88 60 82 28 Q 66 36 50 36 Q 34 36 18 28 Z']),
        ('#d9c08c', ['M 20.5 30 Q 14.5 60 18.5 89.5 L 81.5 89.5 Q 85.5 60 79.5 30 Q 65 38 50 38 Q 35 38 20.5 30 Z']),
        ('#c2a46c', [rib(24, 50, 76, 50, 1), rib(22, 66, 78, 66, 1), rib(22, 80, 78, 80, 1), rib(40, 38, 38, 88, 1), rib(60, 38, 62, 88, 1)]),
        ('#f2c230', [rect(30, 56, 40, 6)]),
        ('#2e4fa8', [rect(30, 62, 40, 3)]),
        ('#d7263d', [rect(30, 65, 40, 3)]),
        ('#8b5a2b', [ellipse(50, 28, 20, 5), rect(46, 14, 8, 14)]),
        *coffee_bean(40, 22, 8, 5.5, -15, '#5a3420', '#1e0f06', '#b0805c'),
        *coffee_bean(58, 20, 8, 5.5, 20, '#4a2a17', '#1e0f06', '#b0805c'),
        *coffee_bean(50, 12, 7.5, 5, 0, '#6b3e26', '#1e0f06', '#b0805c'),
    ]


def raw_milk():
    """Leche cruda: cantina de aluminio de las fincas, recién ordeñada."""
    body = 'M 28 34 L 72 34 L 76 46 L 76 92 Q 76 96 72 96 L 28 96 Q 24 96 24 92 L 24 46 Z'
    return [
        (OUTLINE, ['M 25.5 31.5 L 74.5 31.5 L 78.5 45.5 L 78.5 92 Q 78.5 98.5 72 98.5 L 28 98.5 Q 21.5 98.5 21.5 92 L 21.5 45.5 Z']),
        ('#c9d1d6', [body]),
        ('#a9b3ba', ['M 62 34 L 72 34 L 76 46 L 76 92 Q 76 96 72 96 L 62 96 Z']),
        ('#8f9aa2', [rect(24, 56, 52, 4), rect(24, 82, 52, 4)]),
        ('#eef2f4', [rect(30, 46, 4, 44)]),
        (OUTLINE, [rect(33.5, 13.5, 33, 22)]),
        ('#b8c1c7', [rect(36, 16, 28, 18)]),
        ('#d9dfe3', [ellipse(50, 16, 16, 4)]),
        ('#8f9aa2', [rect(46, 6, 8, 8), curve(18, 50, 10, 58, 20, 66, 3), curve(82, 50, 90, 58, 80, 66, 3)]),
        ('#ffffff', ['M 50 64 Q 58 73 58 77 Q 58 83 50 83 Q 42 83 42 77 Q 42 73 50 64 Z']),
    ]


def container():
    """Contenedor de exportación: el contenedor de acero, con sus puertas, listo para el barco."""
    front = [(8, 40), (58, 52), (58, 88), (8, 76)]
    side = [(58, 52), (92, 36), (92, 72), (58, 88)]
    top = [(8, 40), (42, 24), (92, 36), (58, 52)]
    layers = [
        (OUTLINE, [grow([(8, 40), (42, 24), (92, 36), (92, 72), (58, 88), (8, 76)], 50, 56, 2.4)]),
        ('#d35400', [pts(front)]),
        ('#a84300', [pts(side)]),
        ('#e8732a', [pts(top)]),
    ]
    ribs = [rib(8 + 50 * t, 40 + 12 * t + 3, 8 + 50 * t, 76 + 12 * t - 3, 1.6) for t in [i / 8 for i in range(1, 8)]]
    layers.append(('#b84800', ribs))
    doors = [rib(66, 50, 66, 82, 1.8), rib(75, 46, 75, 78, 1.8), rib(84, 42, 84, 74, 1.8)]
    layers.append(('#7f3300', doors))
    layers.append(('#ffffff', [poly(16, 50, 34, 54.3, 34, 60, 16, 55.7)]))
    return layers


def breakfast():
    """Desayuno campesino: arepa, huevo frito y una taza de chocolate."""
    return [
        (OUTLINE, [ellipse(46, 66, 44, 26)]),
        ('#2e6fd1', [ellipse(46, 66, 42, 24)]),
        ('#ffffff', [ellipse(46, 66, 37, 20)]),
        *arepa_disc(34, 58, 18, 8, 5),
        ('#b9792e', [circle(28, 56, 1.6), circle(38, 60, 1.4)]),
        ('#fffdf6', ['M 50 68 Q 54 56 66 58 Q 78 56 78 66 Q 80 76 66 77 Q 52 80 50 68 Z']),
        ('#f2a900', [circle(64, 67, 6)]),
        ('#ffd54f', [circle(62, 65, 2.2)]),
        (OUTLINE, ['M 70.5 16.5 L 97.5 16.5 L 95 44 Q 94 48.5 89 48.5 L 79 48.5 Q 74 48.5 73 44 Z']),
        ('#ffffff', ['M 73 19 L 95 19 L 92.6 43.5 Q 92 46 89 46 L 79 46 Q 76 46 75.4 43.5 Z']),
        ('#6b3e26', [ellipse(84, 20, 10.5, 3)]),
        ('#ffffff', [curve(95, 24, 103, 30, 94, 38, 3)]),
    ]


def coffee_plant():
    """Mata de café: arbusto verde oscuro, de hojas brillantes, con racimos de cerezas rojas."""
    leaves = [
        ('#2e7d32', [leaf(50, 30, 22, 12, 9), leaf(50, 30, 78, 12, 9), leaf(50, 46, 14, 36, 10), leaf(50, 46, 86, 36, 10), leaf(50, 62, 10, 58, 11), leaf(50, 62, 90, 58, 11)]),
        ('#388e3c', [leaf(50, 8, 40, 24, 5), leaf(50, 8, 60, 24, 5), leaf(50, 40, 30, 26, 8), leaf(50, 40, 70, 26, 8), leaf(50, 56, 26, 48, 9), leaf(50, 56, 74, 48, 9)]),
        ('#66bb6a', [rib(50, 30, 26, 14, 1), rib(50, 30, 74, 14, 1), rib(50, 46, 18, 37, 1), rib(50, 46, 82, 37, 1), rib(50, 62, 14, 58, 1), rib(50, 62, 86, 58, 1)]),
    ]
    berries = [circle(x, y, 3.2) for x, y in [(40, 34), (44, 37), (60, 34), (56, 37), (34, 52), (38, 55), (64, 52), (68, 55), (30, 66), (70, 66), (46, 50), (54, 50)]]
    return [
        ('#8a5a3c', [ellipse(50, 92, 30, 6)]),
        ('#6d4c41', [rect(47, 30, 6, 62)]),
        *leaves,
        ('#7f1d1d', [circle(x + 0.8, y + 0.8, 3.2) for x, y in [(40, 34), (60, 34), (34, 52), (64, 52), (30, 66), (70, 66), (46, 50), (54, 50)]]),
        ('#d32f2f', berries),
        ('#ff8a80', [circle(x - 1, y - 1, 1) for x, y in [(40, 34), (60, 34), (34, 52), (64, 52), (46, 50), (54, 50)]]),
    ]


# ---------- Santander · La Guayabera (v3.0) ----------

def guava_half(cx, cy, r):
    """Media guayaba cortada: cáscara verde amarilla, pulpa rosada y semillas."""
    seeds = [circle(cx + r * 0.42 * math.cos(math.radians(a)), cy + r * 0.42 * math.sin(math.radians(a)), r * 0.07) for a in range(0, 360, 40)]
    return [
        (OUTLINE, [circle(cx, cy, r + 2)]),
        ('#c5d65a', [circle(cx, cy, r)]),
        ('#f48fb1', [circle(cx, cy, r * 0.84)]),
        ('#f8bbd0', [circle(cx, cy, r * 0.5)]),
        ('#fff3e0', seeds),
    ]


def guava():
    """Guayaba: una entera, verde amarilla con su coronita, y media abierta, rosada por dentro."""
    return [
        ('#2e7d32', [leaf(40, 22, 22, 4, 7)]),
        (OUTLINE, [ellipse(38, 46, 30, 32)]),
        ('#cddc39', [ellipse(38, 46, 28, 30)]),
        ('#afb42b', [ellipse(46, 54, 16, 18)]),
        ('#5d4037', [circle(38, 16.5, 3.5)]),
        ('#ffffffa0', [ellipse(28, 34, 6, 9, -20)]),
        *guava_half(66, 68, 26),
    ]


def guava_tree():
    """Guayabo: árbol de tronco liso y copa redonda, con guayabas amarillas."""
    fruits = [(34, 30), (60, 26), (70, 44), (42, 48), (26, 46), (56, 52)]
    return [
        ('#8a5a3c', [ellipse(50, 92, 28, 6)]),
        ('#a1887f', [poly(46, 92, 54, 92, 53, 56, 60, 46, 56, 44, 50, 52, 44, 42, 40, 44, 47, 58)]),
        (OUTLINE, [circle(50, 34, 34)]),
        ('#388e3c', [circle(50, 34, 32)]),
        ('#4caf50', [circle(40, 26, 16), circle(62, 30, 15), circle(52, 46, 16)]),
        ('#827717', [circle(x + 0.8, y + 0.8, 5) for x, y in fruits]),
        ('#d4e157', [circle(x, y, 5) for x, y in fruits]),
        ('#ffffffa0', [circle(x - 1.5, y - 1.5, 1.4) for x, y in fruits]),
    ]


def guava_pulp():
    """Pulpa de guayaba: totuma de madera llena de pulpa rosada espesa."""
    return [
        ('#f06292', ['M 16 50 Q 22 22 50 20 Q 78 22 84 50 Z']),
        ('#f8bbd0', [ellipse(42, 34, 12, 6, -15)]),
        ('#fff3e0', [circle(56, 40, 1.8), circle(34, 44, 1.6), circle(64, 30, 1.6), circle(48, 28, 1.5)]),
        (OUTLINE, ['M 8 48 L 92 48 Q 90 92 50 94 Q 10 92 8 48 Z']),
        ('#a1672c', ['M 11 51 L 89 51 Q 87 89 50 91 Q 13 89 11 51 Z']),
        ('#8d5524', ['M 60 51 L 89 51 Q 87 89 50 91 Z']),
        ('#c68642', [rect(11, 51, 78, 4)]),
    ]


def guava_jelly():
    """Melado de guayaba: paila de cobre con la pulpa cocinándose, espesa y roja, con burbujas."""
    return [
        ('#ffffff90', ['M 36 18 Q 30 10 38 4 Q 34 12 40 18 Z', 'M 58 16 Q 52 8 60 2 Q 56 10 62 16 Z']),
        (OUTLINE, [ellipse(50, 40, 44, 14)]),
        ('#c2185b', [ellipse(50, 40, 41, 11.5)]),
        ('#e91e63', [ellipse(44, 38, 22, 6)]),
        ('#f8bbd0', [circle(36, 38, 2.5), circle(58, 42, 2), circle(66, 36, 1.6)]),
        (OUTLINE, ['M 6 42 Q 10 92 50 94 Q 90 92 94 42 Q 70 56 50 56 Q 30 56 6 42 Z']),
        ('#c47a3a', ['M 9 46 Q 13 89 50 91 Q 87 89 91 46 Q 70 59 50 59 Q 30 59 9 46 Z']),
        ('#a3602a', ['M 62 58 Q 78 54 91 46 Q 87 89 50 91 Z']),
        ('#e3a05b', [ellipse(24, 66, 4, 10, 20)]),
        ('#5d4037', [rect(0, 44, 10, 6), rect(90, 44, 10, 6)]),
    ]


def bocadillo_box(x, y, w, h, d, top, front, side):
    """Bloque de lados rectos en perspectiva: tapa, frente y costado."""
    return [
        (OUTLINE, [poly(x - 2, y + d - 2, x + d - 2, y - 2, x + w + d + 2, y - 2, x + w + d + 2, y + h - 2, x + w + 2, y + h + d + 2, x - 2, y + h + d + 2)]),
        (top, [poly(x, y + d, x + d, y, x + w + d, y, x + w, y + d)]),
        (front, [rect(x, y + d, w, h)]),
        (side, [poly(x + w, y + d, x + w + d, y, x + w + d, y + h, x + w, y + h + d)]),
    ]


def bocadillo_block():
    """Bloque de bocadillo: el dulce de guayaba recién desmoldado, rojo vino, sobre una tabla."""
    return [
        ('#c68642', [poly(2, 82, 70, 82, 98, 64, 30, 64)]),
        ('#8d5524', [poly(2, 82, 70, 82, 70, 88, 2, 88), poly(70, 82, 98, 64, 98, 70, 70, 88)]),
        *bocadillo_box(14, 34, 52, 30, 18, '#c2185b', '#880e4f', '#6a0a3c'),
        ('#ffffff60', [poly(22, 50, 30, 42, 58, 42, 50, 50)]),
    ]


def bocadillo():
    """Bocadillo: barrita rojo vino con su franja blanca de guayaba blanca (el combinado)."""
    return [
        *bocadillo_box(12, 34, 60, 32, 18, '#d81b60', '#880e4f', '#6a0a3c'),
        ('#fce4ec', [rect(12, 56, 60, 6)]),
        ('#f8bbd0', [poly(72, 56, 90, 38, 90, 44, 72, 62)]),
        ('#ffffff70', [poly(22, 46, 32, 38, 66, 38, 56, 46)]),
    ]


def bocadillo_bijao():
    """Bocadillo veleño: envuelto en hoja de bijao seca, amarrado con un hilo de fique."""
    return [
        (OUTLINE, ['M 6 58 Q 10 30 50 26 Q 90 30 94 58 Q 90 82 50 84 Q 10 82 6 58 Z']),
        ('#8d9f3c', ['M 9 58 Q 13 33 50 29 Q 87 33 91 58 Q 87 79 50 81 Q 13 79 9 58 Z']),
        ('#a5b84a', ['M 9 58 Q 13 33 50 29 Q 70 31 80 40 Q 50 44 9 58 Z']),
        ('#6b7a2a', [rib(12, 58, 88, 58, 1.2), rib(18, 48, 82, 66, 0.8), rib(20, 68, 80, 48, 0.8)]),
        ('#e0c48a', [rect(46, 26, 8, 58)]),
        ('#c9a96b', [ellipse(50, 26, 8, 5), 'M 50 26 Q 40 12 30 14 Q 42 16 50 26 Z', 'M 50 26 Q 62 10 72 14 Q 60 16 50 26 Z']),
    ]


def bocadillo_crate():
    """Caja de bocadillos veleños: cajita de madera abierta, con los bocadillos en bijao."""
    wraps = [(26, 30), (44, 26), (62, 30), (35, 40), (55, 40)]
    return [
        *[layer for x, y in wraps for layer in [(OUTLINE, [ellipse(x, y, 11, 7)]), ('#8d9f3c', [ellipse(x, y, 9.5, 5.6)]), ('#e0c48a', [rect(x - 1.5, y - 5.6, 3, 11.2)])]],
        (OUTLINE, [poly(6, 40, 94, 40, 88, 94, 12, 94)]),
        ('#d7a86e', [poly(9, 43, 91, 43, 85.5, 91, 14.5, 91)]),
        ('#b07d48', [rect(10, 58, 80, 3), rect(12, 75, 76, 3)]),
        ('#fff3d6', [rect(30, 60, 40, 15)]),
        ('#c2185b', [rect(30, 60, 40, 4)]),
        ('#8d9f3c', [ellipse(50, 70, 6, 3)]),
    ]


# ---------- Santander · El Tabacal (v3.1) ----------

def tobacco_leaf_shape(x0, y0, x1, y1, width, color, dark, vein):
    """Hoja ancha de tabaco con su nervio central y los laterales (por dentro del borde)."""
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    veins = []
    for t in (0.25, 0.45, 0.65):
        px, py = x0 + dx * t, y0 + dy * t
        half = 2 * (t + 0.12) * (1 - t - 0.12) * width * 0.75  # ancho de la hoja un poco más arriba
        for side in (1, -1):
            veins.append(rib(px, py, px - uy * side * half + dx * 0.12, py + ux * side * half + dy * 0.12, 1))
    return [
        (OUTLINE, [leaf(x0, y0, x1, y1, width + 2)]),
        (color, [leaf(x0, y0, x1, y1, width)]),
        (dark, [f'M {x0} {y0} Q {mx + uy * width:.2f} {my - ux * width:.2f} {x1} {y1} Z']),
        (vein, [rib(x0, y0, x1, y1, 1.8), *veins]),
    ]


def tobacco_plant():
    """Mata de tabaco: tallo alto con hojas grandes y anchas y sus flores rosadas arriba."""
    return [
        ('#8a5a3c', [ellipse(50, 93, 26, 5)]),
        ('#7cb342', [rect(47.5, 14, 5, 80)]),
        *tobacco_leaf_shape(50, 84, 10, 68, 20, '#558b2f', '#33691e', '#9ccc65'),
        *tobacco_leaf_shape(50, 84, 90, 68, 20, '#558b2f', '#33691e', '#9ccc65'),
        *tobacco_leaf_shape(50, 62, 14, 40, 18, '#689f38', '#558b2f', '#aed581'),
        *tobacco_leaf_shape(50, 62, 86, 40, 18, '#689f38', '#558b2f', '#aed581'),
        *tobacco_leaf_shape(50, 40, 24, 20, 13, '#7cb342', '#689f38', '#c5e1a5'),
        *tobacco_leaf_shape(50, 40, 76, 20, 13, '#7cb342', '#689f38', '#c5e1a5'),
        ('#f48fb1', [poly(46, 14, 42, 4, 48, 8), poly(54, 14, 58, 4, 52, 8), poly(50, 14, 47, 2, 53, 2)]),
        ('#ec407a', [circle(44, 5, 2.5), circle(56, 5, 2.5), circle(50, 3, 2.5)]),
    ]


def tobacco_leaf():
    """Hoja de tabaco: recién cortada, verde y ancha, con sus nervios."""
    return [*tobacco_leaf_shape(16, 86, 84, 14, 52, '#7cb342', '#558b2f', '#c5e1a5'), ('#6d8b3a', [rect(8, 86, 10, 6, -45)])]


def cured_leaf():
    """Hoja curada: la hoja seca en el caney, dorada y arrugada."""
    return [
        *tobacco_leaf_shape(16, 86, 84, 14, 48, '#c8913b', '#a0692a', '#e8c27a'),
        ('#8d5524', [rib(34, 52, 42, 58, 1.4), rib(56, 30, 62, 40, 1.4), rib(48, 56, 56, 62, 1)]),
        ('#6d4c2a', [rect(8, 86, 10, 6, -45)]),
    ]


def stripped_leaf():
    """Hoja despalillada: las dos mitades de la hoja curada, ya sin la vena del centro."""
    halves = [('M 8 46 L 92 10 Q 86 64 8 46 Z', '#c8913b', '#e8c27a', (26, 44, 74, 28)), ('M 8 92 L 92 56 Q 18 48 8 92 Z', '#b7792c', '#e0a85a', (26, 80, 70, 62))]
    out = []
    for d, color, vein, (vx0, vy0, vx1, vy1) in halves:
        out += [(OUTLINE, [grow_path(d)]), (color, [d]), (vein, [rib(vx0, vy0, vx1, vy1, 1)])]
    return out


def grow_path(d):
    """El mismo trazo (de tres puntos) un poco más grande, para el borde oscuro."""
    nums = [float(n) for n in re.findall(r'-?[0-9.]+', d)]
    cx, cy = sum(nums[0::2]) / (len(nums) / 2), sum(nums[1::2]) / (len(nums) / 2)
    moved = []
    for x, y in zip(nums[0::2], nums[1::2]):
        k = math.hypot(x - cx, y - cy) or 1
        moved += [x + (x - cx) / k * 2.5, y + (y - cy) / k * 2.5]
    it = iter(moved)
    return re.sub(r'-?[0-9.]+', lambda m: f'{next(it):.2f}', d)


def fermented_tobacco():
    """Tabaco fermentado: un manojo de hojas oscuras, amarrado con su propia hoja."""
    tips = [(18, 90, '#5d3a1a'), (82, 90, '#5d3a1a'), (32, 94, '#7b4a22'), (68, 94, '#7b4a22'), (50, 96, '#6b4020')]
    out = []
    for x, y, color in tips:
        out += [(OUTLINE, [leaf(50, 12, x, y, 18)]), (color, [leaf(50, 14, x, y, 16)]), ('#4a2c12', [rib(50, 22, x, y - 6, 1)])]
    return out + [
        (OUTLINE, [rect(38, 20, 24, 14)]),
        ('#a0652a', [rect(40, 22, 20, 10)]),
        ('#c8913b', [rib(40, 27, 60, 27, 1)]),
    ]


def cigar():
    """Tabaco torcido: el puro enrollado a mano, con su anillo y la punta cortada, sin encender (v3.65)."""
    return [
        (OUTLINE, [rect(6, 50, 82, 18, -25, 47, 59)]),
        ('#7b4a22', [rect(8, 52, 78, 14, -25, 47, 59)]),
        ('#9c6634', [rect(8, 52, 78, 5, -25, 47, 59)]),
        ('#5d3a1a', [rib(22, 74, 26, 62, 1), rib(36, 68, 40, 56, 1), rib(52, 61, 56, 49, 1)]),
        ('#d7263d', [rect(22, 52, 10, 14, -25, 47, 59)]),
        ('#e8b90f', [rect(25, 52, 4, 14, -25, 47, 59)]),
        ('#5d3a1a', [ellipse(84, 41, 4, 7, -25)]),
        ('#9c6634', [ellipse(84.5, 41, 2.2, 4.8, -25)]),
    ]


# ---------- Santander · La Fiquera (v3.2) ----------

def fique_plant():
    """Mata de fique: roseta de pencas largas, gruesas y en punta, verde azulada."""
    blades = []
    for k, (x1, y1, w) in enumerate([(8, 40, 9), (92, 40, 9), (18, 18, 8), (82, 18, 8), (34, 6, 7), (66, 6, 7), (50, 2, 7), (4, 66, 8), (96, 66, 8)]):
        blades.append((x1, y1, w, '#5d8a6a' if k % 2 else '#6f9a7a'))
    out = [('#8a5a3c', [ellipse(50, 92, 30, 6)])]
    for x1, y1, w, color in blades:
        out += [(OUTLINE, [leaf(50, 88, x1, y1, w + 2)]), (color, [leaf(50, 88, x1, y1, w)])]
    return out + [('#a5c4ad', [rib(50, 86, x1, y1 + 8, 1) for x1, y1, _, _ in blades[:6]])]


def fique_leaf():
    """Penca de fique: hojas largas y carnosas recién cortadas, con espinas en el borde."""
    out = []
    for x0, x1, color in [(20, 70, '#5d8a6a'), (34, 84, '#6f9a7a')]:
        out += [(OUTLINE, [leaf(x0, 92, x1, 6, 18)]), (color, [leaf(x0, 92, x1, 6, 16)])]
        out.append(('#3f6b4c', [circle(x0 + (x1 - x0) * t + 5, 92 - 86 * t, 1.2) for t in (0.25, 0.4, 0.55, 0.7)]))
    return out + [('#a5c4ad', [rib(36, 90, 82, 10, 1)])]


def fique_fiber():
    """Fibra de fique: un manojo de fibra clara y brillante, amarrado en la mitad."""
    strands = [rib(30 + i * 5, 6, 26 + i * 6, 94, 3) for i in range(9)]
    return [
        (OUTLINE, ['M 26 4 L 76 4 L 82 96 L 18 96 Z']),
        ('#e8d9a8', ['M 28.5 6.5 L 73.5 6.5 L 79 93.5 L 21 93.5 Z']),
        ('#cdb97e', strands),
        (OUTLINE, [rect(22, 44, 56, 12)]),
        ('#a0652a', [rect(24, 46, 52, 8)]),
    ]


def fique_yarn():
    """Hilo de fique: un ovillo de cabuya, con la punta suelta."""
    return [
        (OUTLINE, [circle(48, 52, 38)]),
        ('#d9c08c', [circle(48, 52, 35.5)]),
        ('#b89a5a', [rib(18, 40, 78, 64, 2.4), rib(20, 64, 74, 30, 2.4), rib(30, 22, 64, 86, 2.4), rib(14, 52, 82, 50, 2.4)]),
        ('#c9a96b', ['M 80 70 Q 92 80 96 94 L 92 95 Q 88 82 77 74 Z']),
        ('#ffffff50', [ellipse(36, 36, 9, 6, -30)]),
    ]


def alpargatas():
    """Alpargatas: el par, con suela de fique trenzado y capellada de tela."""
    def shoe(dx, dy):
        return [
            (OUTLINE, [ellipse(40 + dx, 66 + dy, 34, 13, -10)]),
            ('#d9c08c', [ellipse(40 + dx, 66 + dy, 32, 11, -10)]),
            ('#b89a5a', [rib(12 + dx, 70 + dy, 68 + dx, 60 + dy, 1.2), rib(14 + dx, 66 + dy, 66 + dx, 56 + dy, 1.2)]),
            (OUTLINE, [f'M {16 + dx} {62 + dy} Q {30 + dx} {34 + dy} {56 + dx} {44 + dy} L {60 + dx} {58 + dy} Z']),
            ('#2e4fa8', [f'M {19 + dx} {60 + dy} Q {31 + dx} {37 + dy} {54 + dx} {46 + dy} L {57 + dx} {56 + dy} Z']),
            ('#d7263d', [rib(24 + dx, 50 + dy, 52 + dx, 46 + dy, 2)]),
        ]
    return [*shoe(20, -24), *shoe(0, 10)]


def fique_sack():
    """Costal de fique: tejido de cabuya, lleno y amarrado arriba."""
    return [
        (OUTLINE, ['M 18 30 Q 10 62 16 94 L 84 94 Q 90 62 82 30 Q 66 38 50 38 Q 34 38 18 30 Z']),
        ('#d9c08c', ['M 20.5 32 Q 12.5 62 18.5 91.5 L 81.5 91.5 Q 87.5 62 79.5 32 Q 65 40 50 40 Q 35 40 20.5 32 Z']),
        ('#c2a46c', [rib(20, 52, 80, 52, 1), rib(18, 66, 82, 66, 1), rib(18, 80, 82, 80, 1), rib(34, 40, 30, 90, 1), rib(50, 40, 50, 91, 1), rib(66, 40, 70, 90, 1)]),
        (OUTLINE, [ellipse(50, 28, 16, 6)]),
        ('#c2a46c', ['M 38 28 Q 50 8 62 28 Z']),
        ('#8b5a2b', [rect(42, 24, 16, 6)]),
    ]


def tobacco_bale():
    """Tercio de tabaco: paca de hoja de tabaco forrada en tela de fique y amarrada con cabuya."""
    return [
        *bocadillo_box(10, 30, 62, 50, 18, '#d9c08c', '#c9a96b', '#b0905a'),
        ('#7b4a22', [poly(14, 46, 22, 38, 30, 46, 22, 52), poly(56, 34, 64, 30, 70, 36, 62, 40)]),
        ('#8b5a2b', [rect(10, 52, 62, 4), poly(72, 52, 90, 34, 90, 38, 72, 56), rect(38, 48, 4, 32), poly(38, 48, 56, 30, 60, 30, 42, 48)]),
    ]


# ---------- Santander · El Hato (v3.3) ----------

def meat_strip(x0, y0, x1, y1, w, color, fat):
    """Tira de carne delgada, con su borde de grasa."""
    return [(OUTLINE, [leaf(x0, y0, x1, y1, w + 2)]), (color, [leaf(x0, y0, x1, y1, w)]), (fat, [rib(x0 + (x1 - x0) * 0.2, y0 + (y1 - y0) * 0.2, x1 - (x1 - x0) * 0.2, y1 - (y1 - y0) * 0.2, 1.4)])]


def salted_beef():
    """Carne salada: tiras de carne roja adobadas, con granos de sal, en una batea de madera."""
    salt = [circle(x, y, 1.6) for x, y in [(30, 40), (44, 34), (58, 42), (70, 36), (38, 52), (62, 52), (50, 46)]]
    return [
        *meat_strip(16, 56, 84, 30, 16, '#c0392b', '#f5b7a8'),
        *meat_strip(20, 62, 86, 44, 14, '#a93226', '#f5b7a8'),
        ('#ffffff', salt),
        (OUTLINE, ['M 6 58 L 94 58 L 86 90 L 14 90 Z']),
        ('#a1672c', ['M 9.5 61 L 90.5 61 L 83.5 87 L 16.5 87 Z']),
        ('#c68642', [rect(10, 61, 80, 4)]),
    ]


def carne_oreada():
    """Carne oreada: tiras de carne secándose al sol, colgadas de una cuerda."""
    out = [(OUTLINE, [rect(4, 12, 92, 5)]), ('#c9a96b', [rect(5, 13, 90, 3)])]
    for x, h, color in [(16, 70, '#8e2c1f'), (36, 80, '#a3392a'), (56, 66, '#8e2c1f'), (76, 76, '#a3392a')]:
        out += [
            (OUTLINE, [f'M {x - 9} 14 Q {x - 11} {14 + h / 2} {x - 4} {14 + h} L {x + 4} {14 + h} Q {x + 11} {14 + h / 2} {x + 9} 14 Z']),
            (color, [f'M {x - 7} 16 Q {x - 9} {14 + h / 2} {x - 3} {12 + h} L {x + 3} {12 + h} Q {x + 9} {14 + h / 2} {x + 7} 16 Z']),
            ('#d98b6f', [rib(x - 2, 22, x + 1, 8 + h, 1.2)]),
        ]
    return out


def grilled_oreada():
    """Carne oreada asada: la tira dorada por fuera, con las marcas de la parrilla, y una yuca."""
    marks = [rib(28 + i * 12, 30, 22 + i * 12, 64, 2.4) for i in range(4)]
    return [
        (OUTLINE, [ellipse(50, 50, 44, 26, -12)]),
        ('#8d3b1f', [ellipse(50, 50, 41, 23, -12)]),
        ('#b5562f', [ellipse(46, 46, 30, 14, -12)]),
        ('#4a1c0c', marks),
        (OUTLINE, [ellipse(74, 80, 20, 9, 15)]),
        ('#f3e5c0', [ellipse(74, 80, 18, 7, 15)]),
        ('#8a5a3c', [ellipse(90, 85, 3, 6, 15)]),
    ]


def almuerzo():
    """Almuerzo santandereano: plato con carne oreada, yuca, arepa y un bocadillo de postre."""
    return [
        (OUTLINE, [ellipse(46, 58, 44, 30)]),
        ('#f4f1e8', [ellipse(46, 58, 41, 27)]),
        ('#e3dccb', [ellipse(46, 58, 33, 20)]),
        (OUTLINE, [ellipse(34, 52, 18, 10, -10)]),
        ('#8d3b1f', [ellipse(34, 52, 16, 8, -10)]),
        ('#4a1c0c', [rib(24, 48, 36, 58, 1.6), rib(32, 46, 44, 56, 1.6)]),
        (OUTLINE, [ellipse(58, 66, 14, 6, 20)]),
        ('#f3e5c0', [ellipse(58, 66, 12, 4.5, 20)]),
        (OUTLINE, [circle(60, 46, 9)]),
        ('#e8c77a', [circle(60, 46, 7.5)]),
        *bocadillo_box(76, 70, 16, 9, 6, '#d81b60', '#880e4f', '#6a0a3c'),
    ]


def fiambre():
    """Fiambre: el almuerzo envuelto en hojas de bijao y amarrado con cabuya, para el camino."""
    return [
        (OUTLINE, ['M 10 60 Q 14 26 50 22 Q 86 26 90 60 Q 86 90 50 92 Q 14 90 10 60 Z']),
        ('#6b8e23', ['M 13 60 Q 17 29 50 25 Q 83 29 87 60 Q 83 87 50 89 Q 17 87 13 60 Z']),
        ('#8db33a', ['M 13 60 Q 17 29 50 25 Q 70 27 80 38 Q 50 42 13 60 Z']),
        ('#4f6b1a', [rib(14, 60, 86, 60, 1), rib(30, 34, 30, 86, 0.8), rib(70, 34, 70, 86, 0.8)]),
        ('#d9c08c', [rect(10, 54, 80, 5), rect(46, 22, 5, 70)]),
        ('#c2a46c', ['M 48 22 Q 38 6 28 10 Q 40 12 48 22 Z', 'M 50 22 Q 62 6 72 10 Q 60 12 50 22 Z']),
    ]


# ---------- Santander · Las Hormigas (v3.4) ----------

def ant(cx, cy, scale, body, wings=True, legs=True, rot=0):
    """Hormiga culona (la reina): cabeza, tórax y el abdomen grande; con alas y patas, o limpia."""
    r = scale
    out = []
    if wings:
        out.append(('#e3f2fdc0', [ellipse(cx - 4 * r, cy - 10 * r, 16 * r, 6 * r, -25 + rot), ellipse(cx + 2 * r, cy - 12 * r, 16 * r, 6 * r, -45 + rot)]))
    if legs:
        out.append((OUTLINE, [rib(cx - 4 * r, cy, cx - 14 * r, cy + 10 * r, 1.6 * r), rib(cx, cy, cx - 4 * r, cy + 13 * r, 1.6 * r), rib(cx + 4 * r, cy, cx + 8 * r, cy + 12 * r, 1.6 * r)]))
    out += [
        (OUTLINE, [ellipse(cx + 14 * r, cy - 2 * r, 15 * r, 12 * r, rot), circle(cx - 6 * r, cy - 2 * r, 6.5 * r), circle(cx - 16 * r, cy - 4 * r, 6 * r)]),
        (body, [ellipse(cx + 14 * r, cy - 2 * r, 13 * r, 10 * r, rot)]),
        ('#5d2c14', [circle(cx - 6 * r, cy - 2 * r, 5 * r), circle(cx - 16 * r, cy - 4 * r, 4.6 * r)]),
        ('#ffffff60', [ellipse(cx + 10 * r, cy - 7 * r, 6 * r, 3 * r, rot)]),
        (OUTLINE, [rib(cx - 19 * r, cy - 7 * r, cx - 26 * r, cy - 14 * r, 1.4 * r), rib(cx - 17 * r, cy - 8 * r, cx - 20 * r, cy - 16 * r, 1.4 * r)]),
    ]
    return out


def ant_queen():
    """Hormiga culona: la reina, con su abdomen grande y las alas, recién salida del hormiguero."""
    return [('#8a5a3c', [ellipse(50, 90, 34, 6)]), *ant(46, 58, 1.5, '#8e3b1f')]


def ant_clean():
    """Hormiga limpia: sin alas ni patas, lista para la salmuera."""
    return [*ant(30, 44, 0.9, '#8e3b1f', wings=False, legs=False), *ant(60, 72, 0.9, '#8e3b1f', wings=False, legs=False), *ant(70, 30, 0.75, '#8e3b1f', wings=False, legs=False)]


def ant_brine():
    """Hormigas en salmuera: una olla de barro con agua de sal y las hormigas flotando."""
    return [
        (OUTLINE, [ellipse(50, 42, 42, 13)]),
        ('#cfe8f0', [ellipse(50, 42, 39, 10.5)]),
        ('#8e3b1f', [ellipse(36, 41, 6, 3.5), ellipse(56, 44, 6, 3.5), ellipse(66, 38, 5, 3)]),
        ('#ffffff', [circle(44, 38, 1.5), circle(60, 40, 1.2), circle(30, 44, 1.2)]),
        (OUTLINE, ['M 8 44 Q 10 92 50 94 Q 90 92 92 44 Q 70 58 50 58 Q 30 58 8 44 Z']),
        ('#b5653a', ['M 11 48 Q 13 89 50 91 Q 87 89 89 48 Q 70 61 50 61 Q 30 61 11 48 Z']),
        ('#94502c', ['M 62 60 Q 78 56 89 48 Q 87 89 50 91 Z']),
    ]


def toasted_ants():
    """Hormigas tostadas: un montón de hormigas doradas y crocantes en un tiesto de barro."""
    pile = []
    for x, y, rot in [(28, 52, -10), (46, 48, 15), (64, 52, -20), (36, 40, 30), (56, 38, -5), (72, 42, 10), (46, 30, 0)]:
        pile += [(OUTLINE, [ellipse(x, y, 8.5, 6, rot)]), ('#6b2e14', [ellipse(x, y, 7, 4.6, rot)]), ('#b5562f', [ellipse(x - 2, y - 1.5, 3, 1.6, rot)])]
    return [
        *pile,
        (OUTLINE, ['M 6 56 L 94 56 Q 88 90 50 92 Q 12 90 6 56 Z']),
        ('#a0522d', ['M 9.5 59 L 90.5 59 Q 85 87 50 89 Q 15 87 9.5 59 Z']),
        ('#c06a3a', [rect(10, 59, 80, 4)]),
    ]


def ant_cone():
    """Cucurucho de hormigas: el cono de papel lleno de hormigas tostadas, como se venden en la calle."""
    top = []
    for x, y in [(30, 26), (44, 22), (58, 24), (70, 28), (38, 16), (54, 14)]:
        top += [(OUTLINE, [ellipse(x, y, 7, 5)]), ('#6b2e14', [ellipse(x, y, 5.6, 3.8)])]
    return [
        *top,
        (OUTLINE, ['M 16 30 L 84 30 L 52 96 L 48 96 Z']),
        ('#f4efe6', ['M 20.5 32.5 L 79.5 32.5 L 51 92 L 49 92 Z']),
        ('#d9cbb0', ['M 50 32.5 L 79.5 32.5 L 51 92 Z']),
        ('#d7263d', [rect(28, 44, 44, 5)]),
    ]


def recuerdo():
    """Recuerdo de Santander: un costalito de fique con hormigas y unas alpargatas amarradas."""
    return [
        (OUTLINE, ['M 22 30 Q 14 62 20 94 L 80 94 Q 86 62 78 30 Q 64 38 50 38 Q 36 38 22 30 Z']),
        ('#d9c08c', ['M 24.5 32 Q 16.5 62 22.5 91.5 L 77.5 91.5 Q 83.5 62 75.5 32 Q 63 40 50 40 Q 37 40 24.5 32 Z']),
        ('#c2a46c', [rib(24, 54, 76, 54, 1), rib(22, 72, 78, 72, 1), rib(38, 40, 36, 90, 1), rib(62, 40, 64, 90, 1)]),
        *ant(46, 66, 0.55, '#8e3b1f', wings=False),
        ('#8b5a2b', [rect(42, 24, 16, 7)]),
        (OUTLINE, [ellipse(50, 22, 22, 8, -8)]),
        ('#2e4fa8', [ellipse(50, 22, 20, 6, -8)]),
        ('#d9c08c', [ellipse(50, 24, 20, 3, -8)]),
    ]


# ---------- Santander · Barichara (v3.5) ----------

def dulces_tipicos():
    """Dulces típicos: un plato de barro con bocadillos, cocadas y panelitas de leche."""
    return [
        (OUTLINE, [ellipse(50, 66, 46, 22)]),
        ('#b5653a', [ellipse(50, 66, 43, 19.5)]),
        ('#c97a4a', [ellipse(50, 62, 36, 14)]),
        *bocadillo_box(22, 48, 18, 10, 7, '#d81b60', '#880e4f', '#6a0a3c'),
        (OUTLINE, [circle(60, 56, 10)]),
        ('#f4efe6', [circle(60, 56, 8.5)]),
        ('#e3d9c6', [circle(57, 53, 1.6), circle(63, 58, 1.6), circle(58, 60, 1.4)]),
        *bocadillo_box(44, 60, 14, 8, 6, '#f3dfb0', '#e0c48a', '#c9a96b'),
        *bocadillo_box(64, 66, 14, 8, 6, '#f3dfb0', '#e0c48a', '#c9a96b'),
    ]


def sobremesa():
    """Sobremesa: un pocillo de tinto, un bocadillo y un tabaco, en la mesa del parque."""
    return [
        ('#ffffff90', ['M 34 22 Q 28 12 36 4 Q 32 14 38 20 Z']),
        (OUTLINE, ['M 18 30 L 52 30 L 48 62 Q 35 68 22 62 Z', ellipse(54, 44, 8, 9)]),
        ('#f4efe6', ['M 20.5 32.5 L 49.5 32.5 L 45.8 60 Q 35 65 24.2 60 Z']),
        ('#f4efe6', [ellipse(54, 44, 5, 6)]),
        ('#3b2314', [ellipse(35, 32.5, 14.5, 3)]),
        (OUTLINE, [ellipse(36, 66, 26, 6)]),
        ('#f4efe6', [ellipse(36, 66, 24, 4.5)]),
        *bocadillo_box(56, 70, 26, 12, 8, '#d81b60', '#880e4f', '#6a0a3c'),
        (OUTLINE, [rect(8, 82, 62, 10, -8, 39, 87)]),
        ('#7b4a22', [rect(10, 84, 58, 6, -8, 39, 87)]),
        ('#d7263d', [rect(22, 84, 6, 6, -8, 39, 87)]),
    ]


def estadia():
    """Estadía en la posada: la llave grande de la puerta, con su tablita de madera."""
    return [
        (OUTLINE, [circle(32, 32, 20)]),
        ('#c9a227', [circle(32, 32, 17)]),
        ('#fff8ec', [circle(32, 32, 8)]),
        (OUTLINE, [rect(44, 28, 46, 9, 35, 44, 32)]),
        ('#c9a227', [rect(46, 30, 42, 5, 35, 44, 32)]),
        (OUTLINE, [rect(70, 52, 10, 14, 35, 75, 59)]),
        ('#c9a227', [rect(72, 54, 6, 10, 35, 75, 59)]),
        ('#8b5a2b', [rib(18, 50, 22, 70, 1.4)]),
        (OUTLINE, [rect(8, 68, 30, 22)]),
        ('#a1672c', [rect(10, 70, 26, 18)]),
        ('#fff8ec', [rect(16, 76, 14, 2), rect(16, 81, 10, 2)]),
    ]


def caja_surtida():
    """Caja surtida: caja forrada en papel de fique con bocadillos y hoja de tabaco."""
    return [
        *bocadillo_box(30, 22, 20, 10, 8, '#d81b60', '#880e4f', '#6a0a3c'),
        (OUTLINE, [leaf(56, 38, 84, 10, 12)]),
        ('#b7792c', [leaf(56, 38, 84, 10, 10)]),
        (OUTLINE, [poly(8, 40, 92, 40, 86, 94, 14, 94)]),
        ('#e8dcc0', [poly(11, 43, 89, 43, 83.5, 91, 16.5, 91)]),
        ('#d6c6a0', [rib(14, 58, 86, 58, 1), rib(16, 74, 84, 74, 1), rib(36, 44, 34, 90, 0.8), rib(64, 44, 66, 90, 0.8)]),
        ('#2fa36b', [rect(36, 58, 28, 16)]),
        ('#fff8ec', [rect(40, 62, 20, 2.5), rect(40, 67, 14, 2.5)]),
    ]


def canasta_caminante():
    """Canasta del caminante: canasto con el fiambre envuelto en bijao y el almuerzo para el camino."""
    return [
        (OUTLINE, ['M 22 46 Q 50 2 78 46 L 72 46 Q 50 12 28 46 Z']),
        ('#8db33a', [ellipse(36, 44, 14, 10)]),
        ('#d9c08c', [rect(34, 34, 4, 20)]),
        ('#f4f1e8', [ellipse(64, 46, 14, 7)]),
        ('#8d3b1f', [ellipse(62, 44, 7, 3.5)]),
        (OUTLINE, [poly(8, 48, 92, 48, 82, 94, 18, 94)]),
        ('#c8a26b', [poly(11.5, 51, 88.5, 51, 79.5, 91, 20.5, 91)]),
        ('#a07c4a', [rib(14, 62, 86, 62, 2), rib(16, 74, 84, 74, 2), rib(19, 86, 81, 86, 2)]),
        ('#d7263d', [rect(40, 48, 20, 6)]),
    ]


def excursion():
    """Excursión a Guane: el letrero del Camino Real, con su sombrero y el bastón del caminante."""
    stones = [ellipse(x, y, rx, 4) for x, y, rx in [(30, 90, 10), (52, 88, 9), (72, 92, 10), (44, 96, 8), (62, 96, 7)]]
    return [
        ('#d9b56a', stones),
        (OUTLINE, [rect(46, 22, 8, 70)]),
        ('#8b5a2b', [rect(48, 24, 4, 66)]),
        (OUTLINE, [poly(16, 24, 78, 24, 92, 34, 78, 44, 16, 44)]),
        ('#a1672c', [poly(19, 27, 77, 27, 88, 34, 77, 41, 19, 41)]),
        ('#fff8ec', [rect(26, 32, 40, 3)]),
        (OUTLINE, [ellipse(50, 16, 24, 6)]),
        ('#e8d9a8', [ellipse(50, 16, 22, 4.5)]),
        ('#e8d9a8', ['M 38 16 Q 40 2 50 2 Q 60 2 62 16 Z']),
        ('#3a2418', [rect(38, 12, 24, 3)]),
        ('#6b4a2e', [rib(82, 50, 70, 96, 2.4)]),
    ]


# ---------- Costa · El Arrozal (v3.15) ----------

def rice_grain(cx, cy, rot, color, length=9, width=3.6):
    """Un grano de arroz: elipse alargada con su borde oscuro."""
    return [
        (OUTLINE, [grow(ellipse_pts(cx, cy, length, width, rot)[:-1], cx, cy, 1.2)]),
        (color, [ellipse(cx, cy, length, width, rot)]),
    ]


def grain_pile(color, tip, spots):
    """Montoncito de granos (para el arroz en cáscara, el integral...)."""
    layers = [(OUTLINE, [ellipse(50, 74, 40, 16)]), (shade_hex(color, 0.85), [ellipse(50, 74, 38, 14)])]
    grains = [(30, 70, 20), (44, 64, -15), (58, 68, 30), (70, 74, -25), (38, 80, 10), (54, 80, -10), (50, 56, 5), (64, 58, -35), (36, 58, 40)]
    for cx, cy, rot in grains:
        layers += rice_grain(cx, cy, rot, color)
    layers.append((tip, [circle(cx + 7 * math.cos(math.radians(rot)), cy + 7 * math.sin(math.radians(rot)), 1.5) for cx, cy, rot in grains]))
    if spots:
        layers.append(('#ffffff90', [ellipse(cx - 2, cy - 1.5, 3.5, 1.2, rot) for cx, cy, rot in grains]))
    return layers


def shade_hex(color, f):
    c = color.lstrip('#')
    r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    return '#%02x%02x%02x' % tuple(min(255, round(v * f)) for v in (r, g, b))


def rice_plant():
    """Mata de arroz: macolla de hojas largas y espigas doradas que se doblan con el peso del grano."""
    layers = [('#5d8f3a', [ellipse(50, 92, 26, 6)])]
    blades = [(50, 92, 18, 20, 6), (50, 92, 34, 8, 6), (50, 92, 66, 10, 6), (50, 92, 82, 22, 6), (50, 92, 50, 4, 5)]
    for x0, y0, x1, y1, w in blades:
        layers.append(('#2e7d32', [leaf(x0, y0, x1, y1, w)]))
    layers.append(('#66bb6a', [rib(50, 92, 34, 10), rib(50, 92, 66, 12)]))
    # Las espigas: tallo curvo y granos dorados colgando.
    for sx, ex, ey in [(44, 22, 40), (56, 80, 36), (50, 44, 20)]:
        layers.append(('#c8a23a', [f'M {sx} 60 Q {(sx + ex) / 2} {ey - 14} {ex} {ey} L {ex + 1.6} {ey + 1.6} Q {(sx + ex) / 2 + 1.6} {ey - 12} {sx + 2} 60 Z']))
        for k in range(5):
            t = k / 5
            gx = sx + (ex - sx) * (0.4 + t * 0.6)
            gy = 60 + (ey - 60) * (0.4 + t * 0.6) + 4 * math.sin(t * math.pi)
            layers += rice_grain(gx, gy, 70, '#e6b93a', 4.2, 2.2)
    return layers


def paddy():
    """Arroz en cáscara: un montoncito de granos dorados alargados, con su cascarilla y la punta oscura."""
    return grain_pile('#e0b23c', '#8a6a1a', False)


def dry_paddy():
    """Arroz seco: granos dorados extendidos sobre una lona al sol, con el rastrillo de madera."""
    layers = [(OUTLINE, [poly(6, 70, 52, 52, 96, 70, 50, 90)]), ('#4f86c6', [poly(9, 70, 52, 54.5, 92.5, 70, 50, 87.5)])]
    layers.append(('#e8c45a', [poly(16, 70, 52, 58, 86, 70, 50, 83)]))
    for cx, cy, rot in [(30, 70, 20), (44, 66, -20), (60, 66, 15), (72, 71, -10), (50, 76, 5), (38, 76, -30), (62, 77, 30)]:
        layers += rice_grain(cx, cy, rot, '#f2d36b', 4.5, 2)
    layers.append(('#8b5a2b', [rib(30, 20, 62, 66, 3), rect(48, 60, 30, 6, 30)]))
    layers.append(('#ffd54f', [circle(82, 18, 10)]))
    return layers


def brown_rice():
    """Arroz integral: granos color crema, sin cáscara, en una totuma."""
    layers = [(OUTLINE, ['M 8 52 Q 50 104 92 52 Z']), ('#8d6e4a', ['M 12 54 Q 50 98 88 54 Z']), ('#6d4c32', [rib(20, 66, 80, 66, 1.4)])]
    for cx, cy, rot in [(30, 48, 20), (42, 42, -15), (56, 44, 30), (70, 48, -25), (38, 54, 10), (52, 54, -10), (64, 54, 15), (48, 36, 5)]:
        layers += rice_grain(cx, cy, rot, '#d9b98a', 7, 3)
    return layers


def white_rice():
    """Arroz blanco: un plato hondo con arroz blanco recién hecho."""
    layers = [(OUTLINE, ['M 6 50 Q 50 104 94 50 Z']), ('#f4efe6', ['M 10 52 Q 50 98 90 52 Z']), ('#2e6fd1', [rib(16, 62, 84, 62, 2)])]
    layers.append((OUTLINE, [ellipse(50, 48, 38, 18)]))
    layers.append(('#ffffff', [ellipse(50, 46, 36, 16), circle(50, 34, 16)]))
    layers.append(('#e9e4d8', [ellipse(cx, cy, 4, 1.6, rot) for cx, cy, rot in [(36, 44, 20), (50, 40, -10), (62, 46, 30), (44, 32, 10), (58, 30, -30), (50, 50, 0), (30, 50, -20), (68, 52, 15)]]))
    layers.append(('#b0bec5', ['M 70 30 Q 74 18 70 8 L 73 8 Q 77 18 73 30 Z', 'M 30 30 Q 26 18 30 8 L 33 8 Q 29 18 33 30 Z']))
    return layers


def premium_rice():
    """Arroz excelso: granos largos y brillantes, con un sello dorado de calidad."""
    layers = []
    for cx, cy, rot in [(28, 56, 60), (40, 50, 75), (52, 54, 65), (64, 50, 80), (34, 70, 70), (48, 70, 60), (60, 68, 75), (72, 64, 65)]:
        layers += rice_grain(cx, cy, rot, '#ffffff', 12, 3.4)
    layers.append(('#ffffffc0', [ellipse(cx - 1, cy - 3, 1.2, 5, rot) for cx, cy, rot in [(40, 50, 75), (64, 50, 80), (48, 70, 60)]]))
    layers.append((OUTLINE, [circle(76, 24, 17)]))
    layers.append(('#ffc107', [circle(76, 24, 15)]))
    layers.append(('#ff8f00', [poly(76, 13, 79, 21, 87, 21, 81, 26, 83, 34, 76, 29, 69, 34, 71, 26, 65, 21, 73, 21)]))
    return layers


def rice_bag():
    """Bolsa de arroz: bolsa transparente de una libra, con el arroz blanco y la etiqueta roja."""
    return [
        (OUTLINE, ['M 22 14 L 78 14 L 82 92 L 18 92 Z']),
        ('#dfe8ef', ['M 24.5 16.5 L 75.5 16.5 L 79.3 89.5 L 20.7 89.5 Z']),
        ('#fbfaf6', ['M 26 34 L 74 34 L 77.8 88 L 22.2 88 Z']),
        ('#d7263d', [rect(24, 44, 52, 22)]),
        ('#ffffff', [ellipse(50, 55, 16, 7)]),
        ('#e0b23c', [ellipse(50, 55, 9, 3, 15)]),
        ('#9fb2c0', [rect(22, 14, 56, 6)]),
        ('#ffffff90', [rect(30, 72, 4, 14), rect(66, 22, 3, 10)]),
    ]


def rice_sack():
    """Bulto de arroz: costal blanco de cincuenta kilos, cosido arriba, con letras azules."""
    return [
        (OUTLINE, ['M 16 26 Q 8 60 14 94 L 86 94 Q 92 60 84 26 Q 66 32 50 32 Q 34 32 16 26 Z']),
        ('#f4f1e8', ['M 18.5 28.5 Q 10.5 60 16.5 91.5 L 83.5 91.5 Q 89.5 60 81.5 28.5 Q 65 34.5 50 34.5 Q 35 34.5 18.5 28.5 Z']),
        ('#d9d4c4', [rib(18, 50, 82, 50, 0.8), rib(16, 72, 84, 72, 0.8)]),
        ('#2e6fd1', [rect(28, 54, 44, 14)]),
        ('#ffffff', [rect(32, 59, 36, 4)]),
        ('#d7263d', [rect(28, 40, 44, 6)]),
        ('#8b5a2b', [rib(18, 28, 82, 28, 2.4)]),
        ('#5d4037', [rib(24, 24, 28, 32, 1.4), rib(36, 26, 40, 34, 1.4), rib(48, 27, 52, 35, 1.4), rib(60, 26, 64, 34, 1.4), rib(72, 24, 76, 32, 1.4)]),
    ]


# ---------- Costa · El Cocal (v3.16) ----------

def outlined_circle(cx, cy, r, color, d=2.5):
    return [(OUTLINE, [circle(cx, cy, r + d)]), (color, [circle(cx, cy, r)])]


def coconut_palm():
    """Palma de coco: tronco curvo y anillado, hojas largas que cuelgan y el racimo de cocos."""
    layers = [('#5d8f3a', [ellipse(46, 94, 22, 5)])]
    layers.append((OUTLINE, ['M 40 94 Q 46 60 60 30 L 68 32 Q 56 62 52 94 Z']))
    layers.append(('#a1785a', ['M 42.5 92 Q 48.5 60 61.5 33 L 65.5 34 Q 54 62 49.5 92 Z']))
    layers.append(('#7a5a3e', [rib(43, 84, 51, 84, 1.4), rib(45, 72, 53, 73, 1.4), rib(48, 60, 56, 61, 1.4), rib(52, 48, 60, 50, 1.4), rib(56, 38, 64, 40, 1.4)]))
    fronds = [(62, 30, 14, 40, 7), (62, 30, 30, 14, 7), (62, 30, 60, 6, 6), (62, 30, 88, 14, 7), (62, 30, 96, 40, 7), (62, 30, 40, 30, 5)]
    for x0, y0, x1, y1, w in fronds:
        layers.append(('#2e7d32', [leaf(x0, y0, x1, y1, w)]))
    layers.append(('#66bb6a', [rib(x0, y0, x1, y1, 1) for x0, y0, x1, y1, w in fronds]))
    for cx, cy in [(56, 38), (66, 38), (61, 44)]:
        layers += outlined_circle(cx, cy, 5, '#8bc34a', 1.5)
    return layers


def coconut():
    """Coco: el coco verde recién bajado de la palma, entero, con su cáscara lisa."""
    layers = [(OUTLINE, [ellipse(50, 56, 36, 38, -15)]), ('#7cb342', [ellipse(50, 56, 33.5, 35.5, -15)])]
    layers.append(('#9ccc65', [ellipse(40, 44, 12, 18, -25)]))
    layers.append(('#c5e1a5', [ellipse(36, 38, 4, 8, -25)]))
    layers.append(('#5d4037', [poly(44, 18, 56, 18, 58, 26, 42, 26)]))
    layers.append(('#558b2f', [rib(50, 26, 46, 90, 1.4)]))
    return layers


def peeled_coconut():
    """Coco pelado: el coco café y peludo, sin la cáscara verde, con sus tres ojitos."""
    layers = [(OUTLINE, [circle(50, 56, 36)]), ('#8d6e4a', [circle(50, 56, 33.5)])]
    layers.append(('#6d4c32', [rib(26 + k * 6, 30 + (k % 3) * 4, 30 + k * 6, 84 - (k % 2) * 6, 1.3) for k in range(9)]))
    layers.append(('#a1887f', [ellipse(40, 42, 10, 6, -30)]))
    layers.append(('#3e2723', [circle(44, 32, 3.2), circle(56, 32, 3.2), circle(50, 41, 3.2)]))
    return layers


def grated_coconut():
    """Coco rallado: una totuma llena de coco blanco rallado, con el rallador al lado."""
    layers = [(OUTLINE, ['M 6 52 Q 48 104 90 52 Z']), ('#8d6e4a', ['M 10 54 Q 48 98 86 54 Z'])]
    layers.append((OUTLINE, [ellipse(48, 50, 41, 14)]))
    layers.append(('#fbfaf6', [ellipse(48, 48, 38, 12), ellipse(48, 42, 26, 10)]))
    layers.append(('#d7ccc8', [rib(cx - 3, cy, cx + 3, cy + 1.5, 1.2) for cx, cy in [(30, 46), (42, 40), (54, 44), (64, 48), (38, 50), (50, 50), (60, 40), (46, 34)]]))
    layers.append((OUTLINE, [rect(74, 8, 16, 40, 20)]))
    layers.append(('#b0bec5', [rect(76, 10, 12, 36, 20)]))
    layers.append(('#78909c', [circle(78 + (k % 2) * 5, 16 + k * 7, 1.4) for k in range(4)]))
    return layers


def coconut_milk():
    """Leche de coco: medio coco con la leche blanca, y una botella llena al lado."""
    layers = [(OUTLINE, ['M 6 50 Q 40 102 74 50 Z']), ('#6d4c32', ['M 10 52 Q 40 96 70 52 Z'])]
    layers.append((OUTLINE, [ellipse(40, 50, 35, 11)]))
    layers.append(('#fbfaf6', [ellipse(40, 50, 32, 9)]))
    layers.append(('#ffffff', [ellipse(32, 48, 10, 3)]))
    layers.append((OUTLINE, ['M 72 30 L 72 22 L 80 22 L 80 30 Q 92 38 90 50 L 90 92 L 62 92 L 62 50 Q 60 38 72 30 Z']))
    layers.append(('#eceff1', ['M 74.5 32 L 74.5 24.5 L 77.5 24.5 L 77.5 32 Q 88 39 87.5 50 L 87.5 89.5 L 64.5 89.5 L 64.5 50 Q 64 39 74.5 32 Z']))
    layers.append(('#fbfaf6', ['M 64.5 50 L 87.5 50 L 87.5 89.5 L 64.5 89.5 Z']))
    layers.append(('#7cb342', [rect(64.5, 60, 23, 12)]))
    layers.append(('#d32f2f', [rect(73, 18, 6, 6)]))
    return layers


def cocada():
    """Cocadas: tres cocadas redondas, una blanca, una de panela y una de guayaba, sobre papel."""
    layers = [(OUTLINE, [poly(8, 74, 50, 56, 94, 74, 52, 94)]), ('#f5ecd7', [poly(12, 74, 50, 58.5, 90, 74, 52, 91.5)])]
    for cx, cy, col in [(30, 60, '#fbfaf6'), (70, 60, '#a0612d'), (50, 74, '#e57373')]:
        layers.append((OUTLINE, [ellipse(cx, cy, 20, 13)]))
        layers.append((shade_hex(col, 0.8), [ellipse(cx, cy + 2, 17.5, 10.5)]))
        layers.append((col, [ellipse(cx, cy - 1, 17.5, 9.5)]))
        layers.append((shade_hex(col, 0.75), [rib(cx - 9 + k * 4, cy - 4 + (k % 2) * 3, cx - 6 + k * 4, cy - 1 + (k % 2) * 3, 1.2) for k in range(5)]))
    return layers


# ---------- Costa · La Ciénaga (v3.17) ----------

def fish_shape(cx, cy, length, height, body, belly, rot=0, eye=True):
    """Un pescado de perfil mirando a la izquierda: cuerpo, cola, aleta y ojo."""
    r = math.radians(rot)

    def at(dx, dy):
        return (cx + dx * math.cos(r) - dy * math.sin(r), cy + dx * math.sin(r) + dy * math.cos(r))

    L, H = length / 2, height / 2
    tail = [at(L * 0.8, 0), at(L * 1.25, -H * 0.95), at(L * 1.15, 0), at(L * 1.25, H * 0.95)]
    fin = [at(-L * 0.1, -H * 0.85), at(L * 0.25, -H * 1.35), at(L * 0.4, -H * 0.7)]
    layers = [
        (OUTLINE, [pts([(x + (x - cx) * 0.06, y + (y - cy) * 0.1) for x, y in tail]), pts(fin), grow(ellipse_pts(cx, cy, L, H, rot)[:-1], cx, cy, 2.2)]),
        (shade_hex(body, 0.8), [pts(tail), pts(fin)]),
        (body, [ellipse(cx, cy, L, H, rot)]),
        (belly, [ellipse(*at(-L * 0.1, H * 0.35), L * 0.75, H * 0.45, rot)]),
    ]
    if eye:
        ex, ey = at(-L * 0.62, -H * 0.2)
        layers += [('#ffffff', [circle(ex, ey, H * 0.22)]), ('#263238', [circle(ex - 0.5, ey, H * 0.12)])]
        gx, gy = at(-L * 0.38, 0)
        layers.append((shade_hex(body, 0.7), [rib(gx, gy - H * 0.5, gx + 2, gy + H * 0.4, 1.4)]))
    return layers


def canoe():
    """Canoa de pesca: la canoa de madera en el agua, con el pescador y la atarraya abierta."""
    layers = [('#4f8f96', [ellipse(50, 84, 46, 10)]), ('#7fbcc0', [ellipse(36, 82, 12, 2), ellipse(70, 88, 10, 1.6)])]
    layers.append((OUTLINE, ['M 8 70 Q 50 92 92 70 L 86 80 Q 50 96 14 80 Z']))
    layers.append(('#8d5a32', ['M 12 72 Q 50 90 88 72 L 84 78 Q 50 92 16 78 Z']))
    layers.append(('#5d3a1e', [rib(14, 73, 86, 73, 1.6)]))
    # El pescador, de pie, lanzando la red.
    layers.append(('#37474f', [rib(42, 76, 42, 58, 4), rib(48, 76, 48, 58, 4)]))
    layers.append((OUTLINE, [rect(38, 38, 14, 22)]))
    layers.append(('#f4efe6', [rect(40, 40, 10, 18)]))
    layers.append(('#8d5524', [circle(45, 32, 6)]))
    layers.append((OUTLINE, [ellipse(45, 27, 12, 3.6)]))
    layers.append(('#f4e3b5', [ellipse(45, 27, 10.5, 2.6), poly(39, 27, 41, 20, 49, 20, 51, 27)]))
    layers.append(('#263238', [rib(40, 25, 50, 25, 1.4)]))
    layers.append(('#8d5524', [rib(50, 44, 64, 30, 3)]))
    # La atarraya: un cono de malla que se abre.
    layers.append(('#eceff1c0', ['M 64 30 L 92 58 Q 78 66 62 60 Z']))
    layers.append(('#90a4ae', [rib(64, 30, 92, 58, 1), rib(64, 30, 78, 63, 1), rib(64, 30, 62, 60, 1), rib(70, 40, 76, 44, 0.8), rib(68, 50, 84, 54, 0.8)]))
    return layers


def fish():
    """Bocachico: el pescado plateado de la ciénaga, recién sacado del agua."""
    layers = fish_shape(46, 52, 70, 34, '#90a4ae', '#e3e8ea')
    layers.append(('#ffffff90', [ellipse(36, 44, 12, 2.4, -8)]))
    layers.append(('#4fc3f7', [circle(84, 20, 3), circle(90, 30, 2.2), circle(78, 30, 1.8)]))
    return layers


def clean_fish():
    """Pescado limpio: el pescado sin escamas ni tripas, sobre una hoja de plátano."""
    layers = [('#2e7d32', [leaf(6, 78, 94, 64, 16)]), ('#66bb6a', [rib(10, 77, 90, 65, 1.2)])]
    layers += fish_shape(48, 54, 66, 30, '#b0bec5', '#f5f5f5', -6)
    layers.append(('#ef9a9a', [ellipse(46, 62, 14, 2.6, -6)]))
    layers.append(('#ffffffb0', [ellipse(40, 46, 10, 2, -6)]))
    return layers


def fish_fillet():
    """Filete de pescado: dos filetes blancos y rosados, sin espinas, en una tabla."""
    layers = [(OUTLINE, [rect(6, 56, 88, 30, -6)]), ('#c68a4a', [rect(9, 59, 82, 24, -6)])]
    for cx, cy, rot in [(34, 52, -10), (64, 60, 8)]:
        layers.append((OUTLINE, [ellipse(cx, cy, 25, 11, rot)]))
        layers.append(('#ffe0d6', [ellipse(cx, cy, 22.5, 8.8, rot)]))
        layers.append(('#ffccbc', [ellipse(cx + 3, cy + 2, 16, 4, rot)]))
        layers.append(('#ffffff', [rib(cx - 12, cy - 3, cx - 6, cy + 3, 1), rib(cx - 2, cy - 4, cx + 4, cy + 3, 1), rib(cx + 8, cy - 4, cx + 13, cy + 2, 1)]))
    return layers


def fried_fish():
    """Pescado frito: mojarra dorada en un plato, con patacones y limón."""
    layers = [(OUTLINE, [ellipse(50, 66, 46, 22)]), ('#ffffff', [ellipse(50, 66, 43, 19.5)]), ('#e0e0e0', [ellipse(50, 70, 34, 12)])]
    layers += fish_shape(44, 58, 54, 28, '#d4892a', '#f2b45a', -8)
    layers.append(('#8d4e12', [rib(30 + k * 8, 50, 34 + k * 8, 64, 1.4) for k in range(4)]))
    for cx, cy in [(76, 70), (68, 78)]:
        layers += [(OUTLINE, [circle(cx, cy, 8)]), ('#f2c14e', [circle(cx, cy, 6.5)]), ('#d9a33a', [circle(cx, cy, 3)])]
    layers += [(OUTLINE, [circle(24, 76, 7)]), ('#9ccc65', [circle(24, 76, 5.5)]), ('#dce775', [circle(24, 76, 3)])]
    return layers


def salted_fish():
    """Pescado salado: el pescado abierto y aplanado, colgado al sol, con granos de sal."""
    layers = [('#8b5a2b', [rib(10, 12, 90, 12, 3)]), ('#5d4037', [rib(50, 12, 50, 22, 1.4)])]
    layers.append((OUTLINE, ['M 50 20 L 72 34 Q 76 62 60 84 L 50 96 L 40 84 Q 24 62 28 34 Z']))
    layers.append(('#d7c39b', ['M 50 23 L 69.5 35.5 Q 73 62 58 82 L 50 92 L 42 82 Q 27 62 30.5 35.5 Z']))
    layers.append(('#e8d8b4', ['M 50 28 L 64 38 Q 66 60 54 76 L 50 80 L 46 76 Q 34 60 36 38 Z']))
    layers.append(('#b08a5a', [rib(50, 26, 50, 82, 1.6)] + [rib(50, 36 + k * 9, 60 - k, 40 + k * 9, 1) for k in range(5)] + [rib(50, 36 + k * 9, 40 + k, 40 + k * 9, 1) for k in range(5)]))
    layers.append(('#ffffff', [rect(cx, cy, 3, 3, 45) for cx, cy in [(38, 44), (58, 50), (44, 66), (56, 70), (62, 40), (36, 58), (50, 56)]]))
    return layers


def fish_in_coconut():
    """Pescado en coco: la cazuela de barro con el pescado en salsa de leche de coco, y medio coco al lado."""
    layers = [(OUTLINE, ['M 6 50 Q 8 92 46 92 Q 84 92 86 50 Z']), ('#b5562e', ['M 10 52 Q 12 88 46 88 Q 80 88 82 52 Z'])]
    layers.append(('#8e3f1f', [rib(14, 66, 78, 66, 1.4)]))
    layers.append((OUTLINE, [ellipse(46, 50, 42, 14)]))
    layers.append(('#f5ecd7', [ellipse(46, 50, 38.5, 11)]))
    layers += fish_shape(44, 46, 46, 16, '#d4a35a', '#f0d9a8', -4)
    layers.append(('#7cb342', [circle(26, 54, 2.4), circle(60, 54, 2.2), circle(68, 48, 1.8)]))
    layers.append(('#d32f2f', [circle(32, 56, 1.8), circle(54, 56, 1.8)]))
    layers += [(OUTLINE, ['M 70 24 Q 84 42 98 24 Z']), ('#6d4c32', ['M 73 26 Q 84 39 95 26 Z']), (OUTLINE, [ellipse(84, 24, 15, 4.5)]), ('#fbfaf6', [ellipse(84, 24, 13, 3)])]
    return layers


# ---------- Costa · La Quesera (v3.18) ----------

def cebu():
    """Vaca cebú: blanca, con la giba sobre los hombros, orejas caídas y papada."""
    layers = [('#7fa04a', [ellipse(50, 92, 40, 6)])]
    layers.append((OUTLINE, [rect(22, 62, 8, 30), rect(34, 64, 8, 28), rect(62, 64, 8, 28), rect(72, 62, 8, 30)]))
    layers.append(('#d9d5cc', [rect(24, 64, 4, 26), rect(36, 66, 4, 24), rect(64, 66, 4, 24), rect(74, 64, 4, 26)]))
    layers.append(('#5d4037', [rect(23, 88, 6, 4), rect(35, 88, 6, 4), rect(63, 88, 6, 4), rect(73, 88, 6, 4)]))
    layers.append((OUTLINE, [ellipse(52, 56, 34, 16), ellipse(38, 41, 11, 9), 'M 84 56 Q 94 66 90 78 L 86 78 Q 88 66 80 60 Z']))
    layers.append(('#eceae4', [ellipse(52, 56, 31.5, 13.5), ellipse(38, 41.5, 8.5, 7)]))
    layers.append(('#d6d2c8', [ellipse(54, 64, 26, 5)]))
    layers.append(('#f2a7b5', [ellipse(56, 70, 6, 3)]))
    # La cabeza, con las orejas largas caídas y la papada.
    layers.append((OUTLINE, ['M 10 36 Q 6 50 14 60 L 24 60 Q 28 48 24 36 Z', ellipse(8, 44, 4, 10, 20), ellipse(28, 44, 4, 10, -20)]))
    layers.append(('#eceae4', ['M 12.5 38 Q 9 50 15.5 57.5 L 22.5 57.5 Q 25.5 48 22 38 Z']))
    layers.append(('#d6d2c8', [ellipse(8, 44, 2.4, 8, 20), ellipse(28, 44, 2.4, 8, -20), 'M 22 58 Q 30 66 36 62 L 34 56 Z']))
    layers.append(('#9e9a8a', [ellipse(18, 57, 5, 3.4)]))
    layers.append(('#263238', [circle(14, 44, 1.6), circle(22, 44, 1.6), circle(16, 57, 0.9), circle(20, 57, 0.9)]))
    layers.append(('#8d6e63', ['M 13 36 Q 10 28 14 26 L 15 30 Z', 'M 23 36 Q 26 28 22 26 L 21 30 Z']))
    return layers


def ordeno_milk():
    """Leche de ordeño: la cantina de aluminio con la leche espumosa, y un totumo al lado."""
    layers = [(OUTLINE, ['M 30 22 L 62 22 L 62 30 Q 74 38 74 50 L 74 92 L 18 92 L 18 50 Q 18 38 30 30 Z'])]
    layers.append(('#b0bec5', ['M 32.5 24.5 L 59.5 24.5 L 59.5 31.5 Q 71.5 39 71.5 50 L 71.5 89.5 L 20.5 89.5 L 20.5 50 Q 20.5 39 32.5 31.5 Z']))
    layers.append(('#cfd8dc', [rect(26, 44, 10, 42)]))
    layers.append(('#90a4ae', [rib(20, 58, 72, 58, 2), rib(20, 78, 72, 78, 2)]))
    layers.append((OUTLINE, [ellipse(46, 22, 18, 5)]))
    layers.append(('#fbfaf6', [ellipse(46, 22, 16, 3.6), circle(40, 19, 3), circle(48, 18, 3.4), circle(54, 20, 2.6)]))
    layers += [(OUTLINE, ['M 70 70 Q 84 96 98 70 Z']), ('#8d6e4a', ['M 73 72 Q 84 92 95 72 Z']), (OUTLINE, [ellipse(84, 70, 15, 4.5)]), ('#fbfaf6', [ellipse(84, 70, 13, 3)])]
    return layers


def cuajada():
    """Cuajada: el queso fresco, blanco y blandito, sobre una hoja de bijao."""
    layers = [('#2e7d32', [leaf(4, 80, 96, 70, 18)]), ('#66bb6a', [rib(8, 79, 92, 71, 1.2)])]
    layers.append((OUTLINE, ['M 20 66 Q 18 40 50 38 Q 82 40 80 66 Q 50 80 20 66 Z']))
    layers.append(('#fbfaf6', ['M 22.5 64.5 Q 21 42.5 50 40.5 Q 79 42.5 77.5 64.5 Q 50 77 22.5 64.5 Z']))
    layers.append(('#ece6d6', [ellipse(50, 66, 26, 6)]))
    layers.append(('#e0d8c4', [circle(36, 52, 2.4), circle(58, 48, 2), circle(64, 58, 2.6), circle(46, 60, 1.8)]))
    layers.append(('#ffffffc0', [ellipse(38, 46, 8, 3, -15)]))
    return layers


def salted_curd():
    """Cuajada salada: la cuajada molida con sal en una batea de madera, con el puño de sal."""
    layers = [(OUTLINE, ['M 6 52 L 94 52 L 84 84 L 16 84 Z']), ('#a1785a', ['M 9.5 54.5 L 90.5 54.5 L 82 81.5 L 18 81.5 Z'])]
    layers.append(('#7a5a3e', [rib(14, 68, 86, 68, 1.2)]))
    layers.append((OUTLINE, [ellipse(50, 52, 44, 10)]))
    layers.append(('#fbfaf6', [ellipse(50, 52, 41, 8), ellipse(44, 46, 22, 7), ellipse(60, 47, 14, 5)]))
    layers.append(('#e0d8c4', [circle(30 + (k * 9) % 40, 46 + (k * 5) % 9, 1.6) for k in range(9)]))
    layers.append(('#ffffff', [rect(cx, cy, 3, 3, 45) for cx, cy in [(70, 22), (78, 30), (64, 32), (74, 40), (82, 18)]]))
    layers.append(('#90a4ae', [rect(cx, cy, 3, 3, 45) for cx, cy in [(68, 26), (80, 36)]]))
    return layers


def queso_costeno():
    """Queso costeño: el bloque blanco, duro y salado, con la marca del molde y un pedazo cortado."""
    layers = [(OUTLINE, [poly(10, 46, 50, 30, 90, 46, 90, 72, 50, 90, 10, 72)])]
    layers.append(('#f4efe1', [poly(13, 47.5, 50, 33, 87, 47.5, 50, 63)]))
    layers.append(('#e6dfc9', [poly(13, 47.5, 50, 63, 50, 87, 13, 70.5)]))
    layers.append(('#d6cdb2', [poly(50, 63, 87, 47.5, 87, 70.5, 50, 87)]))
    layers.append(('#cfc5a6', [rib(20 + k * 6, 54 + k * 2.6, 20 + k * 6, 66 + k * 2.6, 1) for k in range(5)]))
    layers.append(('#ffffff', [rect(cx, cy, 2.6, 2.6, 45) for cx, cy in [(34, 42), (52, 38), (62, 46), (44, 50), (70, 44)]]))
    layers += [(OUTLINE, [poly(70, 74, 92, 66, 96, 82, 74, 92)]), ('#f4efe1', [poly(72, 75.5, 90.5, 68.5, 94, 81, 75, 89.5)])]
    return layers


def mote_queso():
    """Mote de queso: el plato hondo de sopa de ñame con trocitos de queso costeño y cebollín."""
    layers = [(OUTLINE, ['M 6 46 Q 50 104 94 46 Z']), ('#f4efe6', ['M 10 48 Q 50 98 90 48 Z']), ('#d7263d', [rib(14, 58, 86, 58, 2)])]
    layers.append((OUTLINE, [ellipse(50, 46, 44, 13)]))
    layers.append(('#f2e3b3', [ellipse(50, 46, 41, 10.5)]))
    layers.append(('#e8d48e', [ellipse(50, 48, 30, 6)]))
    layers.append((OUTLINE, [rect(cx - 0.8, cy - 0.8, 8.6, 6.6, rot) for cx, cy, rot in [(28, 42, 10), (46, 38, -15), (60, 44, 20), (38, 48, -5)]]))
    layers.append(('#fbfaf6', [rect(cx, cy, 7, 5, rot) for cx, cy, rot in [(28, 42, 10), (46, 38, -15), (60, 44, 20), (38, 48, -5)]]))
    layers.append(('#d9b98a', [rect(cx, cy, 6, 5, rot) for cx, cy, rot in [(52, 48, 30), (68, 40, -20), (20, 46, 15)]]))
    layers.append(('#7cb342', [circle(cx, cy, 1.6) for cx, cy in [(34, 38), (56, 36), (72, 46), (44, 52), (24, 50), (64, 52)]]))
    layers.append(('#b0bec5', ['M 50 30 Q 46 20 50 10 L 53 10 Q 49 20 53 30 Z', 'M 36 32 Q 32 24 36 16 L 39 16 Q 35 24 39 32 Z']))
    return layers


def almuerzo_costeno():
    """Almuerzo costeño: el plato con arroz blanco, el mote en su taza, patacones y queso costeño."""
    layers = [(OUTLINE, [ellipse(46, 66, 44, 24)]), ('#ffffff', [ellipse(46, 66, 41, 21.5)]), ('#e0e0e0', [ellipse(46, 70, 32, 13)])]
    layers += [(OUTLINE, [ellipse(32, 62, 18, 10)]), ('#ffffff', [ellipse(32, 60, 16, 8.5), circle(30, 54, 8)])]
    layers.append(('#e9e4d8', [ellipse(cx, cy, 2.6, 1, rot) for cx, cy, rot in [(26, 58, 20), (34, 56, -10), (30, 62, 30), (38, 61, 0)]]))
    for cx, cy in [(58, 74), (68, 68)]:
        layers += [(OUTLINE, [circle(cx, cy, 8)]), ('#f2c14e', [circle(cx, cy, 6.5)]), ('#d9a33a', [circle(cx, cy, 3)])]
    layers += [(OUTLINE, [poly(44, 76, 54, 72, 56, 80, 46, 84)]), ('#f4efe1', [poly(45.5, 76.5, 53, 73.5, 54.5, 79.5, 47, 82.5)])]
    layers += [(OUTLINE, ['M 62 32 Q 64 56 80 56 Q 96 56 98 32 Z']), ('#d7263d', ['M 65 34 Q 67 53 80 53 Q 93 53 95 34 Z'])]
    layers += [(OUTLINE, [ellipse(80, 32, 18, 5)]), ('#f2e3b3', [ellipse(80, 32, 16, 3.6)]), ('#fbfaf6', [rect(74, 29, 5, 3), rect(83, 30, 5, 3)])]
    return layers


def bandeja_costena():
    """Bandeja costeña: la bandeja con pescado frito, arroz, patacones, queso costeño y limón."""
    layers = [(OUTLINE, [rect(4, 42, 92, 50)]), ('#c68a4a', [rect(7, 45, 86, 44)]), ('#e0b07a', [rect(11, 49, 78, 36)])]
    layers += fish_shape(38, 60, 44, 20, '#d4892a', '#f2b45a', -6)
    layers += [(OUTLINE, [ellipse(72, 58, 14, 8)]), ('#ffffff', [ellipse(72, 57, 12.5, 6.5)])]
    for cx, cy in [(24, 76), (38, 78)]:
        layers += [(OUTLINE, [circle(cx, cy, 7)]), ('#f2c14e', [circle(cx, cy, 5.6)]), ('#d9a33a', [circle(cx, cy, 2.6)])]
    layers += [(OUTLINE, [poly(56, 74, 70, 70, 72, 80, 58, 84)]), ('#f4efe1', [poly(57.5, 74.5, 69, 71.5, 70.5, 79.5, 59, 82.5)])]
    layers += [(OUTLINE, [circle(82, 76, 6)]), ('#9ccc65', [circle(82, 76, 4.6)]), ('#dce775', [circle(82, 76, 2.4)])]
    layers.append(('#b0bec5', ['M 40 40 Q 36 30 40 20 L 43 20 Q 39 30 43 40 Z', 'M 60 40 Q 56 30 60 20 L 63 20 Q 59 30 63 40 Z']))
    return layers


# ---------- Costa · El Sombrero (v3.19) ----------

def zenu_band(x, y, w, h, n=4):
    """Franja de trenza con los dibujos zenúes: rombos negros sobre la fibra clara."""
    layers = [(OUTLINE, [rect(x - 1.2, y - 1.2, w + 2.4, h + 2.4)]), ('#efe3c2', [rect(x, y, w, h)])]
    step = w / n
    layers.append(('#2b2b2b', [poly(x + step * (k + 0.5), y + 1, x + step * (k + 0.9), y + h / 2, x + step * (k + 0.5), y + h - 1, x + step * (k + 0.1), y + h / 2) for k in range(n)]))
    layers.append(('#efe3c2', [poly(x + step * (k + 0.5), y + h * 0.3, x + step * (k + 0.68), y + h / 2, x + step * (k + 0.5), y + h * 0.7, x + step * (k + 0.32), y + h / 2) for k in range(n)]))
    return layers


def cana_flecha_plant():
    """Mata de caña flecha: hojas largas en abanico y la espiga plumosa arriba."""
    layers = [('#a3b85a', [ellipse(50, 92, 28, 6)])]
    for x1, y1 in [(14, 40), (26, 24), (40, 14), (60, 14), (74, 24), (86, 40), (50, 30)]:
        layers.append(('#4e8f34', [leaf(50, 92, x1, y1, 4.5)]))
    layers.append(('#7cb342', [rib(50, 92, 26, 24, 1), rib(50, 92, 74, 24, 1)]))
    layers.append(('#c8b07a', [rib(50, 92, 52, 12, 2)]))
    layers.append(('#efe3c2', [leaf(52, 14, 40, 2, 4), leaf(52, 14, 62, 0, 4), leaf(52, 14, 52, -4, 3)]))
    return layers


def cana_flecha():
    """Caña flecha cortada: el atado de hojas largas amarrado con una tira."""
    layers = []
    for k in range(6):
        x0 = 20 + k * 4
        layers.append(('#3a2418', [leaf(x0, 90, x0 + 40, 10 + k * 3, 6)]))
        layers.append(('#6fae44' if k % 2 else '#4e8f34', [leaf(x0 + 1, 88, x0 + 39, 12 + k * 3, 4.6)]))
    layers.append(('#8b5a2b', [rect(30, 58, 30, 6, -35)]))
    return layers


def cana_fiber():
    """Fibra de caña flecha: las tiras blancas raspadas, enrolladas en un manojo."""
    layers = [(OUTLINE, [ellipse(50, 60, 40, 26)]), ('#efe3c2', [ellipse(50, 60, 37, 23)])]
    layers.append(('#d9c99a', [ellipse(50, 60, 37 - k * 7, 23 - k * 4.4) for k in range(1, 5)][::2]))
    layers.append(('#efe3c2', [ellipse(50, 60, 37 - k * 7, 23 - k * 4.4) for k in range(1, 5)][1::2]))
    layers.append(('#efe3c2', ['M 82 70 Q 92 84 80 96 L 76 94 Q 86 84 78 72 Z']))
    layers.append(('#3a2418', [ellipse(50, 60, 3, 2)]))
    return layers


def dyed_fiber():
    """Fibra teñida: tiras negras (teñidas con barro y bija) y tiras blancas, colgadas a secar."""
    layers = [('#8b5a2b', [rib(8, 16, 92, 16, 3)])]
    for k in range(7):
        x = 16 + k * 11
        col = '#2b2b2b' if k % 2 == 0 else '#efe3c2'
        layers.append((OUTLINE, [f'M {x - 3} 16 L {x + 3} 16 Q {x + 6} 56 {x + 1} 92 L {x - 5} 92 Q {x} 56 {x - 3} 16 Z']))
        layers.append((col, [f'M {x - 1.6} 18 L {x + 1.6} 18 Q {x + 4.4} 56 {x - 0.2} 90 L {x - 3.4} 90 Q {x + 1} 56 {x - 1.6} 18 Z']))
    return layers


def trenza():
    """Trenza de caña flecha: el rollo de trenza con sus dibujos zenúes en blanco y negro."""
    layers = [(OUTLINE, [circle(36, 56, 28)]), ('#efe3c2', [circle(36, 56, 25.5)])]
    for r in (20, 14, 8):
        layers.append(('#2b2b2b', [circle(36, 56, r)]))
        layers.append(('#efe3c2', [circle(36, 56, r - 3)]))
    layers += zenu_band(60, 60, 34, 12, 3)
    return layers


def sombrero_vueltiao():
    """Sombrero vueltiao: el ala ancha y la copa, con las vueltas de trenza en blanco y negro."""
    layers = [(OUTLINE, [ellipse(50, 66, 48, 18)]), ('#efe3c2', [ellipse(50, 66, 45.5, 15.5)])]
    for k, col in enumerate(['#2b2b2b', '#efe3c2', '#2b2b2b', '#efe3c2']):
        layers.append((col, [ellipse(50, 66, 42 - k * 6, 14 - k * 2)]))
    layers.append((OUTLINE, ['M 26 64 Q 26 22 50 20 Q 74 22 74 64 Z']))
    layers.append(('#efe3c2', ['M 28.5 63 Q 28.5 24.5 50 22.5 Q 71.5 24.5 71.5 63 Z']))
    for k in range(4):
        y = 30 + k * 9
        layers.append(('#2b2b2b', [f'M {29 + (k < 1) * 2} {y} Q 50 {y + 3} {71 - (k < 1) * 2} {y} L {71} {y + 3.5} Q 50 {y + 6.5} 29 {y + 3.5} Z']))
    layers.append(('#2b2b2b', [poly(36 + k * 7, 52, 39.5 + k * 7, 56, 36 + k * 7, 60, 32.5 + k * 7, 56) for k in range(5)]))
    return layers


def recuerdo_costa():
    """Recuerdo de la Costa: el sombrero vueltiao con el pescado salado envuelto para el viaje."""
    layers = [(OUTLINE, ['M 50 34 L 70 44 Q 74 66 60 84 L 50 94 L 40 84 Q 26 66 30 44 Z']), ('#d7c39b', ['M 50 37 L 67.5 45.5 Q 71 66 58 82 L 50 90 L 42 82 Q 29 66 32.5 45.5 Z'])]
    layers.append(('#b08a5a', [rib(50, 40, 50, 88, 1.4)]))
    layers.append(('#d7263d', [rect(32, 60, 36, 6)]))
    layers += [(OUTLINE, [ellipse(52, 36, 44, 14)]), ('#efe3c2', [ellipse(52, 36, 41.5, 11.5)]), ('#2b2b2b', [ellipse(52, 36, 34, 9)]), ('#efe3c2', [ellipse(52, 36, 26, 7)])]
    layers += [(OUTLINE, ['M 36 34 Q 36 8 52 6 Q 68 8 68 34 Z']), ('#efe3c2', ['M 38.5 33 Q 38.5 10.5 52 8.5 Q 65.5 10.5 65.5 33 Z'])]
    layers.append(('#2b2b2b', ['M 39 18 Q 52 21 65 18 L 65.5 21.5 Q 52 24.5 38.5 21.5 Z', 'M 38.6 27 Q 52 30 65.4 27 L 65.5 30.5 Q 52 33.5 38.5 30.5 Z']))
    return layers


# ---------- Costa · Cartagena (v3.20) ----------

def torre_reloj():
    """Torre del Reloj de Cartagena: la puerta de la muralla con su torre amarilla y el reloj."""
    layers = [(OUTLINE, [rect(8, 54, 84, 40)]), ('#d9c9a8', [rect(10.5, 56.5, 79, 35)])]
    layers.append(('#bfae8a', [rib(10, 66, 90, 66, 1), rib(10, 78, 90, 78, 1)]))
    layers.append((OUTLINE, [rect(30, 22, 40, 72)]))
    layers.append(('#f2c14e', [rect(32.5, 24.5, 35, 67)]))
    layers.append((OUTLINE, ['M 40 94 L 40 72 Q 50 62 60 72 L 60 94 Z']))
    layers.append(('#5d4037', ['M 42.5 94 L 42.5 73 Q 50 65.5 57.5 73 L 57.5 94 Z']))
    layers += [(OUTLINE, [circle(50, 42, 9)]), ('#ffffff', [circle(50, 42, 7)]), ('#263238', [rib(50, 42, 50, 37, 1.2), rib(50, 42, 54, 43, 1.2)])]
    layers.append((OUTLINE, [poly(26, 22, 50, 4, 74, 22)]))
    layers.append(('#d7263d', [poly(30, 20, 50, 7.5, 70, 20)]))
    layers.append(('#ffffff', [rect(30, 54, 40, 3)]))
    return layers


def arroz_con_coco():
    """Arroz con coco: el arroz dorado de panela y coco, en un plato con medio coco al lado."""
    layers = [(OUTLINE, ['M 6 52 Q 50 104 94 52 Z']), ('#ffffff', ['M 10 54 Q 50 98 90 54 Z']), ('#2e6fd1', [rib(16, 64, 84, 64, 2)])]
    layers.append((OUTLINE, [ellipse(50, 50, 40, 15)]))
    layers.append(('#c8975a', [ellipse(50, 48, 37, 12.5), circle(50, 38, 16)]))
    layers.append(('#a8763a', [ellipse(cx, cy, 3.6, 1.4, rot) for cx, cy, rot in [(36, 46, 20), (50, 42, -10), (62, 48, 30), (44, 34, 10), (56, 32, -30), (50, 52, 0), (30, 50, -20), (68, 52, 15)]]))
    layers.append(('#5d4037', [circle(42, 40, 1.4), circle(58, 44, 1.4), circle(48, 30, 1.3)]))
    layers += [(OUTLINE, ['M 68 20 Q 82 40 96 20 Z']), ('#6d4c32', ['M 71 22 Q 82 37 93 22 Z']), (OUTLINE, [ellipse(82, 20, 15, 4.5)]), ('#fbfaf6', [ellipse(82, 20, 13, 3)])]
    return layers


def cena_muralla():
    """Cena en la muralla: la mesa con el plato, la vela y la copa, sobre las piedras de la muralla."""
    layers = [(OUTLINE, [rect(4, 70, 92, 26)]), ('#d9c9a8', [rect(6.5, 72.5, 87, 21)])]
    layers.append(('#bfae8a', [rib(6, 83, 94, 83, 1), rib(30, 72, 30, 83, 1), rib(60, 72, 60, 83, 1), rib(45, 83, 45, 94, 1), rib(78, 83, 78, 94, 1)]))
    layers.append((OUTLINE, [ellipse(50, 56, 44, 14)]))
    layers.append(('#fbfaf6', [ellipse(50, 56, 41.5, 11.5)]))
    layers.append(('#d7263d', ['M 8 56 Q 50 74 92 56 L 92 62 Q 50 80 8 62 Z']))
    layers += [(OUTLINE, [ellipse(40, 54, 16, 6)]), ('#ffffff', [ellipse(40, 54, 14, 4.6)]), ('#c8975a', [ellipse(40, 53, 8, 2.6)]), ('#d4892a', [ellipse(46, 53, 5, 2)])]
    layers += [(OUTLINE, [rect(68, 30, 6, 22)]), ('#fbfaf6', [rect(69.5, 31.5, 3, 20)]), ('#ffb300', ['M 71 16 Q 76 24 71 30 Q 66 24 71 16 Z']), ('#fff3c4', [ellipse(71, 25, 1.6, 3)])]
    layers += [(OUTLINE, ['M 18 26 L 30 26 Q 30 40 24 40 Q 18 40 18 26 Z', rect(23, 40, 2, 12), rect(18, 51, 12, 2)]), ('#ad1457', ['M 19.5 30 L 28.5 30 Q 28.5 38.5 24 38.5 Q 19.5 38.5 19.5 30 Z'])]
    return layers


def noche_hotel():
    """Noche en la ciudad amurallada: el balcón de madera de una casa colonial, con bugambilias y la luna."""
    layers = [(OUTLINE, [rect(10, 14, 80, 82)]), ('#f28c9a', [rect(12.5, 16.5, 75, 77)])]
    layers.append((OUTLINE, ['M 34 94 L 34 62 Q 50 50 66 62 L 66 94 Z']))
    layers.append(('#2f7d4f', ['M 36.5 94 L 36.5 63 Q 50 53 63.5 63 L 63.5 94 Z']))
    layers.append(('#1f5a38', [rib(50, 58, 50, 94, 1.4)]))
    layers.append((OUTLINE, [rect(22, 22, 56, 22)]))
    layers.append(('#2b4d6e', [rect(24.5, 24.5, 51, 17)]))
    layers.append(('#ffe082', [rect(28, 27, 18, 12), rect(54, 27, 18, 12)]))
    layers.append((OUTLINE, [rect(16, 42, 68, 6)]))
    layers.append(('#7a4a22', [rect(18, 43.5, 64, 3)]))
    layers.append(('#7a4a22', [rect(20 + k * 8, 34, 2.6, 9) for k in range(8)]))
    layers.append(('#d63384', [circle(cx, cy, 4.6) for cx, cy in [(14, 22), (20, 16), (12, 32), (86, 20), (80, 14), (88, 30)]]))
    layers.append(('#4e8a33', [circle(cx, cy, 2.2) for cx, cy in [(16, 26), (84, 24)]]))
    layers += [(OUTLINE, [circle(78, 68, 9)]), ('#fff8e1', [circle(78, 68, 7.5)]), ('#f28c9a', [circle(82, 65, 6.5)])]
    return layers


def almuerzo_bahia():
    """Almuerzo en la bahía: el pescado en coco con arroz con coco y patacones, frente al mar."""
    layers = [('#4fc3f7', [rect(0, 18, 100, 20)]), ('#81d4fa', [rib(8, 26, 30, 26, 1.6), rib(54, 30, 80, 30, 1.6)])]
    layers += [(OUTLINE, [ellipse(50, 66, 46, 22)]), ('#ffffff', [ellipse(50, 66, 43, 19.5)])]
    layers += [(OUTLINE, [ellipse(34, 64, 16, 9)]), ('#c8975a', [ellipse(34, 62, 14, 7.5), circle(34, 57, 7)])]
    layers += fish_shape(64, 64, 34, 15, '#d4a35a', '#f0d9a8', -6)
    layers.append(('#f5ecd7', [ellipse(64, 72, 16, 3)]))
    for cx, cy in [(44, 80), (56, 82)]:
        layers += [(OUTLINE, [circle(cx, cy, 6)]), ('#f2c14e', [circle(cx, cy, 4.8)])]
    return layers


def lonchera_paseo():
    """Lonchera del paseo: la nevera de icopor con el almuerzo, el hielo y las gaseosas para la lancha."""
    layers = [(OUTLINE, [poly(10, 44, 70, 44, 86, 34, 26, 34)]), ('#ffffff', [poly(14, 42.5, 68.5, 42.5, 81, 35.5, 27, 35.5)])]
    layers.append(('#4fc3f7', [poly(30, 38, 60, 38, 66, 36, 34, 36)]))
    layers.append((OUTLINE, [rect(10, 44, 60, 46), poly(70, 44, 86, 34, 86, 80, 70, 90)]))
    layers.append(('#fbfaf6', [rect(12.5, 46.5, 55, 41)]))
    layers.append(('#e0e0e0', [poly(72.5, 45, 83.5, 38.5, 83.5, 79, 72.5, 86)]))
    layers.append(('#2e6fd1', [rect(12.5, 60, 55, 8)]))
    layers += [(OUTLINE, [rect(34, 6, 10, 30)]), ('#d7263d', [rect(36, 8, 6, 26)]), ('#ffffff', [rect(36, 18, 6, 4)])]
    layers += [(OUTLINE, [rect(48, 12, 10, 24)]), ('#2fa36b', [rect(50, 14, 6, 20)])]
    layers += [(OUTLINE, [ellipse(22, 34, 9, 5)]), ('#f2c14e', [ellipse(22, 33, 7.5, 3.5)])]
    return layers


def paseo_islas():
    """Paseo a las Islas del Rosario: la lancha sobre el mar turquesa, rumbo a la isla con su palma."""
    layers = [('#26c6da', [rect(0, 58, 100, 42)]), ('#80deea', [rib(6, 70, 30, 70, 1.6), rib(60, 88, 90, 88, 1.6), rib(40, 96, 60, 96, 1.4)])]
    layers += [('#f5e6b8', [ellipse(74, 58, 22, 6)]), ('#8d6e4a', ['M 74 58 Q 72 40 80 26 L 82 27 Q 75 42 77 58 Z'])]
    for x1, y1 in [(66, 22), (72, 16), (86, 18), (94, 26), (80, 32)]:
        layers.append(('#2e7d32', [leaf(81, 26, x1, y1, 3.4)]))
    layers.append((OUTLINE, ['M 4 70 L 60 70 L 54 84 Q 30 88 12 82 Z']))
    layers.append(('#ffffff', ['M 7.5 72.5 L 56.5 72.5 L 52 81.5 Q 30 85 13.5 80 Z']))
    layers.append(('#2e6fd1', ['M 9 76 L 55 76 L 54 78.5 L 10.5 78.5 Z']))
    layers.append(('#d7263d', [rect(28, 60, 18, 10)]))
    layers.append((OUTLINE, [rect(26, 58, 22, 3)]))
    for cx in (18, 34, 44):
        layers += [('#8d5524', [circle(cx, 64, 3.4)]), ('#f6d860', [rect(cx - 3, 67, 6, 4)])]
    layers.append(('#ffd54f', [circle(18, 18, 9)]))
    return layers


# ---------- Boyacá · El Papal (v3.22) ----------

def potato_shape(cx, cy, rx, ry, rot, color, eyes=True):
    """Una papa: óvalo irregular con su borde oscuro y los ojitos."""
    layers = [(OUTLINE, [grow(ellipse_pts(cx, cy, rx, ry, rot)[:-1], cx, cy, 2)]), (color, [ellipse(cx, cy, rx, ry, rot)])]
    layers.append((shade_hex(color, 1.15), [ellipse(cx - rx * 0.3, cy - ry * 0.35, rx * 0.35, ry * 0.25, rot)]))
    if eyes:
        r = math.radians(rot)
        layers.append((shade_hex(color, 0.7), [circle(cx + dx * math.cos(r) - dy * math.sin(r), cy + dx * math.sin(r) + dy * math.cos(r), 1.3) for dx, dy in [(-rx * 0.4, ry * 0.2), (rx * 0.3, -ry * 0.3), (rx * 0.5, ry * 0.35)]]))
    return layers


def potato_plant():
    """Mata de papa: hojas verdes en ramillete con flores blancas y moradas, y una papa asomada."""
    layers = [('#5d4037', [ellipse(50, 90, 34, 7)])]
    layers += potato_shape(30, 88, 9, 6, -10, '#c9a066')
    for x1, y1, w in [(18, 52, 9), (34, 36, 9), (50, 30, 9), (66, 36, 9), (82, 52, 9), (50, 50, 8), (28, 66, 8), (72, 66, 8)]:
        layers.append(('#2e7d32', [leaf(50, 86, x1, y1, w)]))
    layers.append(('#66bb6a', [rib(50, 86, 34, 38, 1), rib(50, 86, 66, 38, 1), rib(50, 86, 50, 32, 1)]))
    for cx, cy, col in [(40, 26, '#ffffff'), (56, 22, '#b39ddb'), (70, 30, '#ffffff')]:
        layers.append((OUTLINE, [circle(cx, cy, 6)]))
        layers.append((col, [poly(*[v for k in range(5) for v in (cx + 5 * math.cos(k * 1.2566 - 1.57), cy + 5 * math.sin(k * 1.2566 - 1.57))])]))
        layers.append(('#fdd835', [circle(cx, cy, 1.8)]))
    return layers


def potato():
    """Papa: dos papas recién sacadas de la tierra, con tierrita pegada."""
    layers = potato_shape(40, 60, 24, 17, -15, '#b98a52') + potato_shape(66, 70, 20, 14, 20, '#c9a066')
    layers.append(('#6d4c32', [circle(30, 70, 2), circle(52, 56, 1.6), circle(74, 78, 1.8), circle(44, 48, 1.4)]))
    return layers


def washed_potato():
    """Papa lavada: papas limpias y brillantes en una canasta, con gotas de agua."""
    layers = [(OUTLINE, ['M 10 56 L 90 56 L 80 92 L 20 92 Z']), ('#b08850', ['M 13.5 58.5 L 86.5 58.5 L 78 89.5 L 22 89.5 Z'])]
    layers.append(('#7a5a30', [rib(16 + k * 10, 60, 22 + k * 8, 88, 1) for k in range(7)]))
    for cx, cy, rot in [(30, 52, -10), (50, 46, 10), (70, 52, -20), (40, 58, 0), (62, 58, 15)]:
        layers += potato_shape(cx, cy, 11, 8, rot, '#e0bb7a')
    layers.append(('#4fc3f7', ['M 80 16 Q 86 26 80 30 Q 74 26 80 16 Z', 'M 20 20 Q 24 27 20 30 Q 16 27 20 20 Z']))
    return layers


def graded_potato():
    """Papa de primera: papas grandes y parejas con la cinta azul de primera calidad."""
    layers = []
    for cx, cy, rot in [(30, 66, -10), (52, 70, 5), (74, 64, -15), (42, 50, 10), (64, 48, -5)]:
        layers += potato_shape(cx, cy, 14, 10, rot, '#d4a960')
    layers += [(OUTLINE, [circle(78, 22, 14)]), ('#2e6fd1', [circle(78, 22, 12)]), ('#ffffff', [circle(78, 22, 6)]), ('#2e6fd1', [poly(70, 32, 66, 44, 72, 40, 76, 46, 78, 34), poly(86, 32, 90, 44, 84, 40, 80, 46, 78, 34)])]
    return layers


def peeled_potato():
    """Papa pelada: papas amarillas sin cáscara en una olla con agua, y las cáscaras al lado."""
    layers = [(OUTLINE, ['M 12 46 L 88 46 L 82 88 Q 50 96 18 88 Z']), ('#9aa3a8', ['M 15.5 48.5 L 84.5 48.5 L 79.5 85.5 Q 50 93 20.5 85.5 Z'])]
    layers.append((OUTLINE, [ellipse(50, 46, 40, 10)]))
    layers.append(('#81d4fa', [ellipse(50, 46, 37, 7.5)]))
    for cx, cy, rot in [(34, 42, -10), (52, 38, 10), (68, 43, -20)]:
        layers += potato_shape(cx, cy, 11, 7, rot, '#f6d860', eyes=False)
    layers.append(('#b98a52', ['M 76 14 Q 90 10 94 22 Q 86 18 80 22 Z', 'M 70 24 Q 82 26 84 36 Q 78 30 72 32 Z']))
    return layers


def criollas():
    """Papitas criollas fritas: las papitas amarillas y doradas, redonditas, en una totuma."""
    layers = [(OUTLINE, ['M 8 52 Q 50 104 92 52 Z']), ('#8d6e4a', ['M 12 54 Q 50 98 88 54 Z'])]
    for cx, cy in [(26, 50), (40, 44), (56, 42), (72, 48), (34, 56), (50, 54), (66, 56), (48, 32), (62, 34)]:
        layers += [(OUTLINE, [circle(cx, cy, 8)]), ('#f2b705', [circle(cx, cy, 6.6)]), ('#ffd54f', [circle(cx - 2, cy - 2, 2.4)]), ('#c98a0a', [circle(cx + 2.5, cy + 2.5, 1.4)])]
    layers.append(('#ffffff', [rect(cx, cy, 2, 2, 45) for cx, cy in [(44, 50), (58, 46), (30, 48), (68, 52)]]))
    return layers


def criollas_bag():
    """Bolsa de papitas: la bolsa de paquete, amarilla y verde, con la papita dibujada."""
    return [
        (OUTLINE, ['M 22 12 L 78 12 L 74 24 Q 82 56 74 88 L 78 94 L 22 94 L 26 88 Q 18 56 26 24 Z']),
        ('#f2b705', ['M 25 14.5 L 75 14.5 L 71.5 24.5 Q 79 56 71.5 87.5 L 74.5 91.5 L 25.5 91.5 L 28.5 87.5 Q 21 56 28.5 24.5 Z']),
        ('#2fa36b', [rect(24, 30, 52, 14)]),
        ('#ffffff', [rect(32, 35, 36, 4)]),
        ('#d9a30a', [rib(26, 20, 74, 20, 1.4), rib(26, 86, 74, 86, 1.4)]),
    ] + [(OUTLINE, [circle(50, 64, 12)]), ('#ffd54f', [circle(50, 64, 10.5)]), ('#c98a0a', [circle(54, 68, 2), circle(46, 60, 1.6)])]


def criollas_box():
    """Caja de papitas: la caja de cartón con las bolsas asomándose."""
    layers = [(OUTLINE, [poly(8, 40, 50, 26, 92, 40, 92, 82, 50, 96, 8, 82)])]
    layers.append(('#c8a26a', [poly(11, 42, 50, 55, 50, 92.5, 11, 80)]))
    layers.append(('#b08850', [poly(50, 55, 89, 42, 89, 80, 50, 92.5)]))
    for cx in (30, 50, 70):
        layers += [(OUTLINE, [rect(cx - 8, 16 + abs(cx - 50) * 0.3, 16, 30)]), ('#f2b705', [rect(cx - 6.5, 17.5 + abs(cx - 50) * 0.3, 13, 27)]), ('#2fa36b', [rect(cx - 6.5, 24 + abs(cx - 50) * 0.3, 13, 6)])]
    layers.append(('#d9b98a', [poly(11, 42, 50, 29, 89, 42, 50, 55)]))
    layers.append(('#2e6fd1', [rect(56, 62, 24, 8, -16)]))
    return layers


# ---------- Boyacá · La Cervecería (v3.23) ----------

def barley_spike(cx, cy, length, rot, color):
    """Espiga de cebada: tallo, granos en dos hileras y las barbas largas."""
    r = math.radians(rot)
    ux, uy = math.sin(r), -math.cos(r)
    layers = []
    awns = []
    grains = []
    for k in range(6):
        t = 0.35 + k * 0.11
        gx, gy = cx + ux * length * t, cy + uy * length * t
        for side in (-1, 1):
            px, py = gx + side * uy * 3.2, gy - side * ux * 3.2
            grains.append(ellipse(px, py, 2.4, 4, rot + side * 20))
            awns.append(rib(px, py, px + ux * 14 + side * uy * 4, py + uy * 14 - side * ux * 4, 0.8))
    layers.append(('#c8a23a', [rib(cx, cy, cx + ux * length, cy + uy * length, 1.6)] + awns))
    layers.append((color, grains))
    return layers


def barley_plant():
    """Mata de cebada: macolla de tallos con espigas doradas y barbas largas."""
    layers = [('#5d4037', [ellipse(50, 92, 28, 6)])]
    layers.append(('#7cb342', [leaf(50, 92, 22, 60, 4), leaf(50, 92, 78, 60, 4)]))
    for cx, rot in [(42, -18), (50, 0), (58, 18)]:
        layers += barley_spike(cx, 92, 70, rot, '#e6b93a')
    return layers


def barley():
    """Cebada: el atado de espigas doradas recién cortadas."""
    layers = []
    for cx, rot in [(30, -25), (42, -10), (54, 5), (66, 20)]:
        layers += barley_spike(cx + 6, 94, 72, rot, '#e6b93a')
    layers.append(('#8b5a2b', [rect(32, 66, 34, 6, 0)]))
    return layers


def malt():
    """Malta: los granos de cebada germinados y tostados en un costal abierto."""
    layers = [(OUTLINE, ['M 14 40 Q 10 70 18 92 L 82 92 Q 90 70 86 40 Z']), ('#e8d9a8', ['M 17 42.5 Q 13 70 20.5 89.5 L 79.5 89.5 Q 87 70 83 42.5 Z'])]
    layers.append((OUTLINE, [ellipse(50, 42, 38, 12)]))
    layers.append(('#a0612d', [ellipse(50, 42, 35, 9.5)]))
    for cx, cy, rot in [(30, 40, 20), (42, 36, -15), (56, 38, 30), (68, 42, -25), (38, 46, 10), (52, 46, -10), (62, 34, 15), (46, 30, 5)]:
        layers += rice_grain(cx, cy, rot, '#c8853a', 6, 3)
    layers.append(('#5d4037', [rib(30, 60, 70, 60, 1.2), rib(34, 74, 66, 74, 1.2)]))
    return layers


def wort():
    """Mosto: la paila de cobre con el mosto dulce hirviendo y su vapor."""
    layers = [(OUTLINE, ['M 10 44 L 90 44 L 84 86 Q 50 96 16 86 Z']), ('#c46a2a', ['M 13.5 46.5 L 86.5 46.5 L 81 83.5 Q 50 93 19 83.5 Z'])]
    layers.append(('#e08a4a', [rect(20, 50, 8, 30)]))
    layers.append((OUTLINE, [ellipse(50, 44, 40, 10)]))
    layers.append(('#a8641a', [ellipse(50, 44, 37, 7.5)]))
    layers.append(('#d4892a', [circle(38, 43, 3), circle(56, 45, 2.4), circle(64, 42, 2)]))
    layers.append(('#b0bec5', ['M 34 34 Q 30 22 34 10 L 37 10 Q 33 22 37 34 Z', 'M 54 34 Q 50 22 54 10 L 57 10 Q 53 22 57 34 Z', 'M 72 34 Q 68 24 72 14 L 75 14 Q 71 24 75 34 Z']))
    return layers


def beer():
    """Cerveza: la jarra llena con su espuma blanca, y la botella al lado."""
    layers = [(OUTLINE, ['M 18 30 L 62 30 L 60 92 L 20 92 Z', 'M 60 44 Q 80 44 80 60 Q 80 76 60 76 L 60 68 Q 72 68 72 60 Q 72 52 60 52 Z'])]
    layers.append(('#e8a317', ['M 20.5 34 L 59.5 34 L 57.6 89.5 L 22.4 89.5 Z']))
    layers.append(('#f6c244', [rect(26, 38, 6, 46)]))
    layers.append(('#ffffff', [circle(cx, cy, r) for cx, cy, r in [(24, 28, 7), (34, 24, 8), (46, 25, 8), (56, 28, 7)]]))
    layers.append(('#fff3c4', [circle(38, 60, 1.4), circle(46, 72, 1.2), circle(30, 78, 1.4)]))
    layers += [(OUTLINE, ['M 80 30 L 80 20 L 86 20 L 86 30 Q 94 36 94 48 L 94 92 L 72 92 L 72 48 Q 72 36 80 30 Z']), ('#6d4c1f', ['M 82.5 32 L 82.5 22.5 L 83.5 22.5 L 83.5 32 Q 91.5 38 91.5 48 L 91.5 89.5 L 74.5 89.5 L 74.5 48 Q 74.5 38 82.5 32 Z']), ('#f2b705', [rect(74.5, 60, 17, 12)])]
    return layers


def beer_crate():
    """Canasta de cerveza: la canasta plástica roja con las botellas asomadas."""
    layers = []
    for k in range(5):
        x = 18 + k * 14
        layers += [(OUTLINE, [rect(x - 4, 16, 8, 40)]), ('#6d4c1f', [rect(x - 2.5, 18, 5, 37)]), ('#f2b705', [rect(x - 2.5, 30, 5, 8)])]
    layers.append((OUTLINE, [rect(6, 44, 88, 50)]))
    layers.append(('#d7263d', [rect(9, 47, 82, 44)]))
    layers.append(('#a61d2f', [rect(16 + k * 14, 56, 8, 26) for k in range(5)]))
    layers.append(('#ffffff', [rect(36, 84, 28, 4)]))
    return layers


# ---------- Boyacá · Ráquira (v3.24) ----------

def caballito():
    """Caballito de Ráquira: el caballito de barro pintado de colores, con sus ollitas a lado y lado."""
    layers = [('#c8a26a', [ellipse(50, 92, 34, 5)])]
    layers.append((OUTLINE, [rect(28, 60, 8, 30), rect(64, 60, 8, 30), ellipse(50, 56, 28, 14), 'M 70 52 L 84 24 L 94 30 L 80 58 Z']))
    layers.append(('#d9772e', [rect(30, 62, 4, 27), rect(66, 62, 4, 27), ellipse(50, 56, 25.5, 11.5), 'M 72 52 L 85 27 L 91 31 L 79 56 Z']))
    layers.append(('#2e6fd1', [rib(28, 52, 72, 52, 3)]))
    layers.append(('#f2b705', [circle(36 + k * 9, 60, 2.2) for k in range(4)]))
    layers.append(('#d7263d', [poly(84, 24, 92, 18, 94, 26)]))
    layers.append(('#263238', [circle(88, 28, 1.4)]))
    for cx in (34, 62):
        layers += [(OUTLINE, ['M %d 40 Q %d 30 %d 40 L %d 48 Q %d 52 %d 48 Z' % (cx - 7, cx, cx + 7, cx + 6, cx, cx - 6)]), ('#b5562e', ['M %d 41 Q %d 33 %d 41 L %d 47 Q %d 50 %d 47 Z' % (cx - 5, cx, cx + 5, cx + 4.5, cx, cx - 4.5)])]
    return layers


def greda():
    """Greda: el montón de arcilla cruda recién sacada de la mina, con la pala."""
    layers = [(OUTLINE, ['M 8 88 Q 20 46 50 40 Q 80 46 92 88 Z']), ('#a8735a', ['M 11.5 85.5 Q 22.5 49 50 43 Q 77.5 49 88.5 85.5 Z'])]
    layers.append(('#c08a6a', ['M 30 60 Q 44 48 58 52 Q 46 56 34 66 Z']))
    layers.append(('#8a5a46', [circle(40, 74, 3), circle(64, 70, 2.4), circle(54, 80, 2)]))
    layers.append(('#8b5a2b', [rib(70, 14, 58, 56, 3)]))
    layers += [(OUTLINE, [poly(52, 52, 64, 56, 60, 72, 48, 68)]), ('#9aa3a8', [poly(53.5, 54, 62, 57, 59, 69.5, 50, 66.5)])]
    return layers


def barro():
    """Barro amasado: la bola de barro suave sobre la mesa, con la marca de las manos."""
    layers = [(OUTLINE, [poly(6, 76, 50, 60, 94, 76, 50, 92)]), ('#c68a4a', [poly(10, 76, 50, 62.5, 90, 76, 50, 89.5)])]
    layers.append((OUTLINE, [ellipse(50, 56, 30, 24)]))
    layers.append(('#b5653a', [ellipse(50, 56, 27.5, 21.5)]))
    layers.append(('#cf7d4f', [ellipse(42, 48, 10, 6, -20)]))
    layers.append(('#94502c', ['M 40 60 Q 50 54 60 60', rib(42, 62, 58, 62, 1.6), rib(44, 66, 56, 66, 1.2)]))
    return layers


def olla_barro():
    """Olla de barro: la olla negra de Ráquira, panzona, con sus orejas y el borde ancho."""
    layers = [(OUTLINE, ['M 22 36 Q 6 60 22 86 Q 50 98 78 86 Q 94 60 78 36 Z', ellipse(50, 34, 30, 9), ellipse(14, 52, 7, 4), ellipse(86, 52, 7, 4)])]
    layers.append(('#4e342e', ['M 24.5 38.5 Q 9.5 60 24.5 83.5 Q 50 94.5 75.5 83.5 Q 90.5 60 75.5 38.5 Z', ellipse(14, 52, 4.5, 2)]))
    layers.append(('#4e342e', [ellipse(86, 52, 4.5, 2)]))
    layers.append(('#6d4c41', [ellipse(36, 54, 6, 14, -15)]))
    layers.append(('#3e2723', [ellipse(50, 34, 27, 6.5)]))
    layers.append(('#d9772e', [rib(18, 64, 82, 64, 2)]))
    return layers


def pieza_torneada():
    """Pieza torneada: la vasija cruda, sin hornear, girando en el torno del alfarero."""
    layers = [(OUTLINE, [ellipse(50, 86, 40, 9)]), ('#8b5a2b', [ellipse(50, 86, 37, 7)]), ('#6d4c32', [rect(46, 86, 8, 10)])]
    layers.append((OUTLINE, ['M 34 80 Q 26 60 36 46 Q 40 40 38 30 L 62 30 Q 60 40 64 46 Q 74 60 66 80 Z']))
    layers.append(('#c08a6a', ['M 36.5 78 Q 29 60 38.5 47 Q 42.5 41 41 32.5 L 59 32.5 Q 57.5 41 61.5 47 Q 71 60 63.5 78 Z']))
    layers.append(('#a8735a', [rib(32, 60, 68, 60, 1), rib(36, 70, 64, 70, 1)]))
    layers.append(('#8a5a46', [ellipse(50, 31, 10, 2.4)]))
    layers.append(('#b0bec5', ['M 16 70 Q 10 60 16 50', 'M 84 70 Q 90 60 84 50']))
    return layers


def matera():
    """Matera pintada: la matera de barro horneado con flores pintadas y una mata sembrada."""
    layers = [(OUTLINE, ['M 22 48 L 78 48 L 70 92 L 30 92 Z']), ('#d9772e', ['M 25 50.5 L 75 50.5 L 67.8 89.5 L 32.2 89.5 Z'])]
    layers.append((OUTLINE, [rect(18, 42, 64, 10)]))
    layers.append(('#e8915a', [rect(20.5, 44.5, 59, 5)]))
    layers.append(('#ffffff', [circle(cx, 68, 4) for cx in (38, 50, 62)]))
    layers.append(('#2e6fd1', [circle(cx, 68, 1.8) for cx in (38, 50, 62)]))
    layers.append(('#2fa36b', [leaf(44, 72, 40, 80, 2), leaf(56, 72, 60, 80, 2)]))
    for x1, y1 in [(30, 14), (44, 8), (58, 10), (72, 18), (50, 22)]:
        layers.append(('#2e7d32', [leaf(50, 44, x1, y1, 5)]))
    layers.append(('#d7263d', [circle(44, 10, 4), circle(70, 18, 3.4)]))
    return layers


def jarra_cerveza():
    """Jarra de barro con cerveza: la jarra de Ráquira, con su asa, llena y con espuma."""
    layers = [(OUTLINE, ['M 22 30 Q 18 60 24 92 L 66 92 Q 72 60 68 30 Z', 'M 66 42 Q 90 42 90 60 Q 90 78 66 78 L 66 70 Q 82 70 82 60 Q 82 50 66 50 Z'])]
    layers.append(('#b5653a', ['M 24.5 33 Q 20.5 60 26.5 89.5 L 63.5 89.5 Q 69.5 60 65.5 33 Z']))
    layers.append(('#cf7d4f', [rect(30, 38, 6, 46)]))
    layers.append(('#f2b705', [rib(24, 56, 66, 56, 2.4)]))
    layers.append(('#2e6fd1', [circle(cx, 70, 2.4) for cx in (34, 45, 56)]))
    layers.append(('#ffffff', [circle(cx, cy, r) for cx, cy, r in [(26, 28, 7), (36, 23, 8), (48, 24, 8), (60, 27, 7)]]))
    return layers


# ---------- Boyacá · Paipa (v3.25) ----------

def molded_cheese():
    """Queso en molde: el queso fresco apretado en su aro de madera, soltando el suero."""
    layers = [(OUTLINE, [ellipse(50, 74, 40, 14)]), ('#c8a26a', [ellipse(50, 74, 37, 11.5)])]
    layers.append((OUTLINE, ['M 18 48 L 18 70 Q 50 84 82 70 L 82 48 Z']))
    layers.append(('#a0703a', ['M 20.5 50 L 20.5 69 Q 50 81.5 79.5 69 L 79.5 50 Z']))
    layers.append(('#7a5a30', [rib(20, 60, 80, 60, 1.2)]))
    layers.append((OUTLINE, [ellipse(50, 48, 32, 10)]))
    layers.append(('#fbfaf6', [ellipse(50, 48, 29.5, 7.5)]))
    layers.append(('#b0bec5', [rect(46, 22, 8, 22)]))
    layers.append(('#e8f0d0', ['M 84 72 Q 88 80 84 84 Q 80 80 84 72 Z']))
    return layers


def queso_paipa():
    """Queso Paipa: la rueda madurada, de corteza dorada, con su tajada cortada."""
    layers = [(OUTLINE, ['M 8 46 L 8 72 Q 50 92 92 72 L 92 46 Z', ellipse(50, 46, 42, 14)])]
    layers.append(('#d9a330', ['M 10.5 48 L 10.5 70 Q 50 89 89.5 70 L 89.5 48 Z']))
    layers.append(('#f2c14e', [ellipse(50, 46, 39.5, 11.5)]))
    layers.append(('#fff3c4', ['M 50 46 L 89.5 46 L 89.5 70 L 50 82 Z']))
    layers.append(('#f2c14e', ['M 50 46 L 89.5 46 L 70 56 Z']))
    layers.append(('#d9a330', [circle(64, 66, 2), circle(76, 60, 1.6), circle(58, 74, 1.4)]))
    return layers


def almojabana():
    """Almojábanas: los panecitos redondos y dorados de queso y cuajada, en un canasto."""
    layers = [(OUTLINE, ['M 8 58 L 92 58 L 82 92 L 18 92 Z']), ('#b08850', ['M 11.5 60.5 L 88.5 60.5 L 80 89.5 L 20 89.5 Z'])]
    layers.append(('#7a5a30', [rib(16 + k * 10, 62, 22 + k * 8, 88, 1) for k in range(7)]))
    for cx, cy in [(28, 52), (50, 46), (72, 52), (38, 60), (62, 60)]:
        layers += [(OUTLINE, [circle(cx, cy, 13)]), ('#e8a53a', [circle(cx, cy, 11.5)]), ('#f6c66a', [circle(cx - 3, cy - 4, 5)])]
    return layers


def piquete():
    """Piquete boyacense: la bandeja con papitas criollas, mazorca, queso y ají en el centro."""
    layers = [(OUTLINE, [ellipse(50, 66, 46, 24)]), ('#c68a4a', [ellipse(50, 66, 43, 21.5)])]
    for cx, cy in [(26, 62), (34, 72), (42, 64), (30, 54)]:
        layers += [(OUTLINE, [circle(cx, cy, 6)]), ('#f2b705', [circle(cx, cy, 4.8)])]
    layers += [(OUTLINE, [ellipse(64, 54, 16, 6, -20)]), ('#f6d860', [ellipse(64, 54, 14, 4.6, -20)])]
    layers.append(('#e0b84a', [circle(58 + k * 3, 56 - k * 1.1, 1.2) for k in range(5)]))
    layers += [(OUTLINE, [poly(56, 72, 70, 66, 74, 76, 60, 82)]), ('#fff3c4', [poly(57.5, 72.5, 69, 67.5, 72, 75.5, 61, 80)])]
    layers += [(OUTLINE, [circle(76, 76, 7)]), ('#ffffff', [circle(76, 76, 5.6)]), ('#4caf50', [circle(76, 76, 3.6)]), ('#d7263d', [circle(77, 75, 1.2)])]
    return layers


def amasijos():
    """Canasta de amasijos: almojábanas, garullas y mantecadas recién salidas del horno de barro."""
    layers = [(OUTLINE, ['M 8 50 L 92 50 L 82 92 L 18 92 Z', 'M 20 50 Q 50 8 80 50 L 74 50 Q 50 18 26 50 Z']), ('#b08850', ['M 11.5 52.5 L 88.5 52.5 L 80 89.5 L 20 89.5 Z', 'M 22 50 Q 50 12 78 50 L 76 50 Q 50 16 24 50 Z'])]
    layers.append(('#d7263d', [rect(12, 62, 76, 6)]))
    for cx, cy, col in [(28, 46, '#e8a53a'), (50, 42, '#f6d860'), (72, 46, '#d9772e')]:
        layers += [(OUTLINE, [circle(cx, cy, 10)]), (col, [circle(cx, cy, 8.5)])]
    layers.append(('#fff3c4', [circle(26, 43, 3), circle(48, 39, 3), circle(70, 43, 3)]))
    return layers


# ---------- Boyacá · Las Ruanas (v3.26) ----------

def fleece(cx, cy, rx, ry, color):
    """Un vellón: muchas bolitas de lana juntas, con su borde."""
    pts = [(cx + rx * math.cos(a) * 0.75, cy + ry * math.sin(a) * 0.7) for a in [k * math.pi / 5 for k in range(10)]]
    layers = [(OUTLINE, [circle(x, y, ry * 0.55 + 2) for x, y in pts] + [ellipse(cx, cy, rx * 0.8 + 2, ry * 0.8 + 2)])]
    layers.append((color, [circle(x, y, ry * 0.55) for x, y in pts] + [ellipse(cx, cy, rx * 0.8, ry * 0.8)]))
    layers.append((shade_hex(color, 0.88), [circle(cx + dx, cy + dy, 2.4) for dx, dy in [(-10, -4), (4, -8), (12, 2), (-4, 6), (8, 8)]]))
    return layers


def sheep():
    """Oveja: el cuerpo de lana blanca, la cara y las patas negras."""
    layers = [('#7fa04a', [ellipse(50, 90, 36, 6)])]
    layers.append(('#263238', [rect(30, 66, 6, 22), rect(42, 68, 6, 20), rect(58, 68, 6, 20), rect(70, 66, 6, 22)]))
    layers += fleece(54, 56, 34, 22, '#f4f1e8')
    layers.append((OUTLINE, [ellipse(20, 50, 11, 13, -20)]))
    layers.append(('#263238', [ellipse(20, 50, 9, 11, -20), ellipse(12, 42, 5, 2.5, -40), ellipse(28, 40, 5, 2.5, 30)]))
    layers.append(('#ffffff', [circle(16, 48, 1.8), circle(24, 47, 1.8)]))
    layers += fleece(22, 37, 9, 5, '#f4f1e8')
    return layers


def wool():
    """Lana: el vellón recién trasquilado, con las tijeras al lado."""
    layers = fleece(46, 58, 40, 26, '#ece4cf')
    layers.append(('#9aa3a8', ['M 74 18 L 92 36 L 89 39 L 71 21 Z', 'M 92 18 L 74 36 L 71 33 L 89 15 Z']))
    layers.append(('#d7263d', [circle(70, 38, 4), circle(92, 38, 4)]))
    return layers


def clean_wool():
    """Lana lavada: la lana blanquita secándose sobre una cerca, con gotas."""
    layers = [('#8b5a2b', [rib(8, 70, 92, 70, 3), rib(14, 70, 14, 94, 3), rib(86, 70, 86, 94, 3)])]
    layers += fleece(32, 58, 22, 16, '#ffffff') + fleece(66, 56, 22, 16, '#ffffff')
    layers.append(('#4fc3f7', ['M 30 80 Q 34 87 30 90 Q 26 87 30 80 Z', 'M 66 80 Q 70 87 66 90 Q 62 87 66 80 Z']))
    return layers


def carded_wool():
    """Lana cardada: la lana peinada en copos suaves, con las cardas de púas."""
    layers = [(OUTLINE, [rect(8, 22, 34, 26, -10), rect(58, 22, 34, 26, 10)]), ('#a0703a', [rect(10.5, 24.5, 29, 21, -10), rect(60.5, 24.5, 29, 21, 10)])]
    layers.append(('#9aa3a8', [rib(14 + k * 4, 30 - k * 0.6, 14 + k * 4, 40 - k * 0.6, 0.8) for k in range(6)] + [rib(64 + k * 4, 28 + k * 0.6, 64 + k * 4, 38 + k * 0.6, 0.8) for k in range(6)]))
    layers += fleece(50, 72, 38, 14, '#fbfaf6')
    return layers


def wool_yarn():
    """Hilo de lana: las madejas de lana hilada, una natural y una teñida."""
    layers = []
    for cx, cy, col in [(34, 58, '#ece4cf'), (66, 62, '#8e44ad')]:
        layers += [(OUTLINE, [ellipse(cx, cy, 22, 26)]), (col, [ellipse(cx, cy, 19.5, 23.5)])]
        layers.append((shade_hex(col, 0.8), [rib(cx - 16 + k * 6, cy - 18 + (k % 2) * 4, cx - 12 + k * 6, cy + 18 - (k % 2) * 4, 1.2) for k in range(5)]))
    layers.append(('#5e3b1c', [rib(20, 24, 80, 24, 2.4)]))
    return layers


def ruana():
    """Ruana: la ruana de lana con sus franjas, doblada como para la venta."""
    layers = [(OUTLINE, ['M 10 30 L 90 30 L 96 84 L 4 84 Z']), ('#6d4c41', ['M 12.5 32.5 L 87.5 32.5 L 93 81.5 L 7 81.5 Z'])]
    layers.append(('#ece4cf', ['M 9 46 L 91 46 L 91.5 52 L 8.5 52 Z', 'M 7.5 64 L 92.5 64 L 93 70 L 7 70 Z']))
    layers.append(('#d7263d', ['M 8.6 55 L 91.4 55 L 91.7 58 L 8.3 58 Z']))
    layers.append((OUTLINE, ['M 40 32 L 50 52 L 60 32 Z']))
    layers.append(('#4e342e', ['M 43 32.5 L 50 47 L 57 32.5 Z']))
    layers.append(('#ece4cf', [rib(6 + k * 8, 84, 5 + k * 8, 94, 1.4) for k in range(12)]))
    return layers


def recuerdo_boyaca():
    """Recuerdo de Boyacá: la ruana doblada con una olla y una matera de Ráquira encima."""
    layers = [(OUTLINE, [rect(6, 58, 88, 34)]), ('#6d4c41', [rect(8.5, 60.5, 83, 29)])]
    layers.append(('#ece4cf', [rect(8.5, 68, 83, 4), rect(8.5, 80, 83, 4)]))
    layers.append(('#d7263d', [rect(8.5, 74, 83, 3)]))
    layers += [(OUTLINE, ['M 22 32 Q 10 46 22 60 L 46 60 Q 58 46 46 32 Z', ellipse(34, 32, 14, 4)]), ('#4e342e', ['M 24 34 Q 13 46 24 57.5 L 44 57.5 Q 55 46 44 34 Z']), ('#3e2723', [ellipse(34, 32, 11.5, 2.6)])]
    layers += [(OUTLINE, ['M 60 30 L 88 30 L 84 60 L 64 60 Z']), ('#d9772e', ['M 62.5 32.5 L 85.5 32.5 L 82 57.5 L 66 57.5 Z']), ('#ffffff', [circle(70, 44, 2.4), circle(78, 44, 2.4)])]
    layers.append(('#2e7d32', [leaf(74, 30, 66, 12, 4), leaf(74, 30, 82, 12, 4), leaf(74, 30, 74, 8, 3)]))
    return layers


# ---------- Boyacá · Villa de Leyva (v3.27) ----------

def iglesia_villa():
    """Villa de Leyva: la iglesia blanca de la plaza, con su torre y la plaza empedrada."""
    layers = [(OUTLINE, [poly(4, 84, 50, 70, 96, 84, 50, 98)]), ('#b9b2a5', [poly(8, 84, 50, 72.5, 92, 84, 50, 95.5)])]
    layers.append(('#a39b8c', [circle(cx, cy, 2) for cx, cy in [(30, 84), (44, 80), (58, 86), (70, 82), (50, 90), (38, 88)]]))
    layers.append((OUTLINE, [rect(22, 40, 44, 42), rect(62, 18, 18, 64), poly(18, 42, 44, 22, 70, 42)]))
    layers.append(('#fbf8f1', [rect(24.5, 42.5, 39, 37), rect(64.5, 20.5, 13, 59)]))
    layers.append(('#d9cfbd', [poly(21.5, 41, 44, 25, 66.5, 41)]))
    layers.append(('#2f7d4f', ['M 36 80 L 36 64 Q 44 56 52 64 L 52 80 Z']))
    layers.append(('#5d4037', [rect(68, 28, 6, 10)]))
    layers.append((OUTLINE, [poly(60, 18, 71, 6, 82, 18)]))
    layers.append(('#b5562e', [poly(63, 17, 71, 9, 79, 17)]))
    layers.append(('#5d4037', [rib(71, 0, 71, 8, 1.4), rib(68, 3, 74, 3, 1.4)]))
    return layers


def onces():
    """Onces: el chocolate en pocillo, el pan y el queso para la tarde."""
    layers = [(OUTLINE, [ellipse(50, 80, 44, 12)]), ('#ffffff', [ellipse(50, 80, 41, 9.5)])]
    layers.append((OUTLINE, ['M 22 42 L 54 42 L 50 78 Q 38 82 26 78 Z', 'M 54 50 Q 66 50 64 60 Q 62 70 52 68 L 52 64 Q 58 64 59 60 Q 60 55 54 55 Z']))
    layers.append(('#d7263d', ['M 24.5 44.5 L 51.5 44.5 L 48 76 Q 38 79 28 76 Z']))
    layers.append(('#5d3a1e', [ellipse(38, 44, 13.5, 3)]))
    layers.append(('#b0bec5', ['M 32 36 Q 28 26 32 16 L 35 16 Q 31 26 35 36 Z', 'M 42 36 Q 38 26 42 16 L 45 16 Q 41 26 45 36 Z']))
    layers += [(OUTLINE, [ellipse(76, 66, 16, 10)]), ('#e8a53a', [ellipse(76, 66, 14, 8)]), ('#f6c66a', [ellipse(72, 63, 6, 3)])]
    layers += [(OUTLINE, [poly(58, 80, 72, 74, 76, 82, 62, 88)]), ('#fff3c4', [poly(59.5, 80.5, 71, 75.5, 74, 81.5, 62.5, 86)])]
    return layers


def tarde_plaza():
    """Tarde en la plaza: la mesa con las cervezas frías, las papitas y el parasol."""
    layers = [('#5d4037', [rib(50, 28, 50, 94, 3)])]
    layers += [(OUTLINE, [poly(8, 30, 50, 8, 92, 30)]), ('#d7263d', [poly(12, 29, 50, 11, 88, 29)]), ('#ffffff', [poly(36, 22, 50, 11, 64, 22)])]
    layers += [(OUTLINE, [ellipse(50, 70, 40, 12)]), ('#f4efe6', [ellipse(50, 70, 37, 9.5)])]
    for cx in (28, 40):
        layers += [(OUTLINE, [rect(cx - 4, 46, 8, 22)]), ('#6d4c1f', [rect(cx - 2.5, 47.5, 5, 19)]), ('#f2b705', [rect(cx - 2.5, 56, 5, 5)])]
    layers += [(OUTLINE, ['M 56 62 Q 66 52 76 62 Z']), ('#f2b705', ['M 58 61 Q 66 54 74 61 Z'])]
    return layers


def noche_villa():
    """Noche en Villa de Leyva: la casona blanca de balcones verdes y la luna sobre el tejado."""
    layers = [(OUTLINE, [rect(8, 34, 84, 62), poly(4, 36, 50, 16, 96, 36)]), ('#b5562e', [poly(8, 34.5, 50, 19, 92, 34.5)]), ('#fbf8f1', [rect(10.5, 36.5, 79, 57)])]
    layers.append(('#2f7d4f', [rect(18, 44, 16, 14), rect(66, 44, 16, 14), 'M 42 94 L 42 70 Q 50 62 58 70 L 58 94 Z']))
    layers.append(('#ffe082', [rect(20, 46, 12, 10), rect(68, 46, 12, 10)]))
    layers.append(('#1f5a38', [rect(14, 58, 24, 3), rect(62, 58, 24, 3)]))
    layers.append(('#1f5a38', [rect(15 + k * 4.4, 52, 1.6, 6) for k in range(6)] + [rect(63 + k * 4.4, 52, 1.6, 6) for k in range(6)]))
    layers += [(OUTLINE, [circle(80, 12, 9)]), ('#fff8e1', [circle(80, 12, 7.5)]), ('#fdf6e3', [circle(84, 9, 6)])]
    return layers


def canasta_mercado():
    """Canasta del mercado: el canasto del sábado con frutas, mazorca y una jarra de barro."""
    layers = [(OUTLINE, ['M 10 50 L 90 50 L 80 92 L 20 92 Z', 'M 22 50 Q 50 12 78 50 L 72 50 Q 50 22 28 50 Z']), ('#b08850', ['M 13.5 52.5 L 86.5 52.5 L 78 89.5 L 22 89.5 Z', 'M 24 50 Q 50 16 76 50 L 74 50 Q 50 20 26 50 Z'])]
    layers.append(('#7a5a30', [rib(18 + k * 10, 54, 24 + k * 8, 88, 1) for k in range(7)]))
    layers += [(OUTLINE, [circle(30, 46, 8)]), ('#f2b705', [circle(30, 46, 6.6)])]
    layers += [(OUTLINE, [ellipse(46, 44, 12, 5, -20)]), ('#f6d860', [ellipse(46, 44, 10.5, 3.6, -20)])]
    layers += [(OUTLINE, ['M 60 26 Q 58 40 62 50 L 78 50 Q 82 40 80 26 Z']), ('#b5653a', ['M 62.5 28.5 Q 61 40 64 47.5 L 76 47.5 Q 79 40 77.5 28.5 Z']), ('#ffffff', [ellipse(70, 27, 9, 3)])]
    return layers


def fiambre_paseo():
    """Fiambre del paseo: el atado envuelto en hoja de plátano sobre el mantel de cuadros."""
    layers = [(OUTLINE, [poly(4, 74, 50, 56, 96, 74, 50, 94)]), ('#d7263d', [poly(8, 74, 50, 58.5, 92, 74, 50, 91.5)])]
    layers.append(('#ffffff', [poly(29, 66.5, 39.5, 62.5, 50, 66.5, 39.5, 70.5), poly(50, 74, 60.5, 70, 71, 74, 60.5, 78), poly(29, 82, 39.5, 78, 50, 82, 39.5, 86)]))
    layers += [(OUTLINE, [ellipse(50, 58, 28, 16)]), ('#2e7d32', [ellipse(50, 58, 25.5, 13.5)]), ('#66bb6a', [rib(26, 58, 74, 58, 1.4)])]
    layers.append(('#8b5a2b', [rib(50, 42, 50, 74, 2.2), rib(26, 52, 74, 64, 2.2)]))
    layers += [(OUTLINE, [rect(74, 32, 10, 26)]), ('#6d4c1f', [rect(75.5, 33.5, 7, 23)]), ('#f2b705', [rect(75.5, 42, 7, 6)])]
    return layers


def excursion_fosil():
    """Excursión al Fósil: el esqueleto del kronosaurio sobre la piedra y la amonita."""
    layers = [(OUTLINE, [poly(4, 70, 30, 54, 76, 56, 96, 72, 70, 92, 20, 90)]), ('#c9b48a', [poly(8, 70, 31, 57, 75, 58.5, 92, 72, 69, 89.5, 21, 87.5)])]
    layers.append(('#8a7a5a', ['M 18 74 Q 34 64 54 70 Q 70 74 84 70', 'M 54 70 L 62 64 L 66 70 Z']))
    layers.append(('#fbf8f1', [rib(18, 74, 84, 70, 2.4)] + [rib(26 + k * 6, 72 - k * 0.2, 28 + k * 6, 80 - k * 0.2, 1.2) for k in range(9)] + [ellipse(16, 74, 7, 4, -10)]))
    layers.append(('#263238', [circle(14, 73, 1.2)]))
    layers += [(OUTLINE, [circle(76, 28, 16)]), ('#d9a330', [circle(76, 28, 14)])]
    layers.append(('#a87a20', ['M 76 28 m -11 0 a 11 11 0 1 1 22 0', 'M 76 28 m -6 0 a 6 6 0 1 1 12 0']))
    layers.append(('#a87a20', [rib(76, 28, 76 + 13 * math.cos(a), 28 + 13 * math.sin(a), 1) for a in [k * 0.7 for k in range(9)]]))
    return layers


# ---------- Los Llanos · La Palma (v3.31) ----------

def palm_fruit_shape(cx, cy, r, rot, color):
    """Fruto de palma de aceite: ovalado, rojo anaranjado con la punta oscura."""
    return [(OUTLINE, [ellipse(cx, cy, r + 1.6, r * 1.3 + 1.6, rot)]), (color, [ellipse(cx, cy, r, r * 1.3, rot)]),
            ('#4e1f0a', [ellipse(cx + math.sin(math.radians(rot)) * r * 0.75, cy - math.cos(math.radians(rot)) * r * 0.75, r * 0.45, r * 0.35, rot)]),
            ('#ffb74d', [ellipse(cx - r * 0.3, cy + r * 0.2, r * 0.25, r * 0.4, rot)])]


def oil_palm():
    """Palma de aceite: tronco grueso con las bases de las hojas, hojas arqueadas y racimos rojos."""
    layers = [('#5d8f3a', [ellipse(50, 94, 26, 5)])]
    layers.append((OUTLINE, ['M 38 94 L 42 46 L 58 46 L 62 94 Z']))
    layers.append(('#8d6e4a', ['M 40.8 91.5 L 44.5 48.5 L 55.5 48.5 L 59.2 91.5 Z']))
    layers.append(('#6d5236', [poly(44, 56 + k * 9, 50, 52 + k * 9, 56, 56 + k * 9, 50, 60 + k * 9) for k in range(4)]))
    fronds = [(50, 40, 8, 54, 8), (50, 40, 16, 22, 8), (50, 40, 40, 8, 7), (50, 40, 62, 8, 7), (50, 40, 86, 22, 8), (50, 40, 92, 54, 8), (50, 40, 30, 44, 6), (50, 40, 72, 44, 6)]
    for x0, y0, x1, y1, w in fronds:
        layers.append(('#2e7d32', [leaf(x0, y0, x1, y1, w)]))
    layers.append(('#66bb6a', [rib(x0, y0, x1, y1, 1) for x0, y0, x1, y1, w in fronds]))
    for cx, cy in [(40, 48), (60, 48)]:
        for dx, dy in [(-4, -2), (4, -2), (0, 3), (-3, 6), (3, 6)]:
            layers += palm_fruit_shape(cx + dx, cy + dy, 3.2, 0, '#d84315')
    return layers


def palm_bunch():
    """Racimo de palma: el racimo pesado, lleno de frutos rojos, anaranjados y negros, con sus espinas."""
    layers = [(OUTLINE, [ellipse(50, 56, 38, 36)]), ('#6d4c1f', [ellipse(50, 56, 35.5, 33.5)])]
    layers.append(('#5d4037', [rect(46, 10, 8, 16)]))
    fruits = [(34, 40, '#bf360c'), (50, 34, '#e65100'), (66, 40, '#d84315'), (28, 58, '#e65100'), (44, 52, '#4e1f0a'), (60, 54, '#bf360c'), (72, 60, '#e65100'), (36, 74, '#d84315'), (52, 70, '#e65100'), (66, 76, '#bf360c'), (50, 86, '#d84315')]
    for cx, cy, col in fruits:
        layers += palm_fruit_shape(cx, cy, 6.5, (cx - 50) * 0.8, col)
    return layers


def palm_fruit():
    """Fruto de palma: los frutos sueltos, ya desgranados del racimo."""
    layers = []
    for cx, cy, r, rot, col in [(30, 62, 13, -20, '#d84315'), (66, 56, 14, 15, '#e65100'), (46, 80, 11, 5, '#bf360c'), (50, 34, 11, -5, '#e65100')]:
        layers += palm_fruit_shape(cx, cy, r, rot, col)
    return layers


def cooked_fruit():
    """Fruto cocido: la vagoneta del esterilizador llena de fruto, echando vapor."""
    layers = [(OUTLINE, [poly(10, 44, 90, 44, 82, 82, 18, 82)]), ('#78909c', [poly(13.5, 46.5, 86.5, 46.5, 79.8, 79.5, 20.2, 79.5)])]
    layers.append(('#546e7a', [rect(22, 52, 56, 3), rect(22, 64, 56, 3)]))
    for cx, cy, col in [(26, 42, '#bf5a1a'), (40, 40, '#a8461a'), (54, 40, '#bf5a1a'), (68, 42, '#a8461a'), (33, 34, '#8d3b14'), (61, 34, '#a8461a'), (47, 32, '#bf5a1a')]:
        layers += palm_fruit_shape(cx, cy, 6, 0, col)
    layers += [(OUTLINE, [circle(30, 88, 7), circle(70, 88, 7)]), ('#37474f', [circle(30, 88, 4.5), circle(70, 88, 4.5)])]
    layers.append(('#eceff1', ['M 30 22 Q 24 14 32 8 Q 26 16 34 22 Z', 'M 52 20 Q 46 12 54 6 Q 48 14 56 20 Z', 'M 72 22 Q 66 14 74 8 Q 68 16 76 22 Z']))
    return layers


def palm_oil():
    """Aceite de palma: el tanque con el aceite rojo anaranjado y la gota que cae."""
    layers = [(OUTLINE, [rect(18, 30, 64, 62)]), ('#b0bec5', [rect(21, 33, 58, 56)])]
    layers.append(('#f57c00', [rect(21, 50, 58, 39)]))
    layers.append(('#ffb74d', [rect(26, 54, 8, 30)]))
    layers.append(('#90a4ae', [rect(16, 26, 68, 7)]))
    layers += [(OUTLINE, ['M 50 4 Q 62 18 62 24 Q 62 32 50 32 Q 38 32 38 24 Q 38 18 50 4 Z']), ('#e65100', ['M 50 8.5 Q 59.5 19.5 59.5 24 Q 59.5 29.5 50 29.5 Q 40.5 29.5 40.5 24 Q 40.5 19.5 50 8.5 Z'])]
    layers.append(('#ffcc80', [ellipse(45, 23, 2.4, 4, -20)]))
    return layers


def oil_bottle():
    """Botella de aceite: la botella plástica con el aceite dorado, la tapa roja y la etiqueta con la palma."""
    layers = [(OUTLINE, ['M 40 6 L 60 6 L 60 18 Q 74 26 74 42 L 74 92 L 26 92 L 26 42 Q 26 26 40 18 Z'])]
    layers.append(('#ffe0b2', ['M 42.5 8.5 L 57.5 8.5 L 57.5 19.5 Q 71.5 27.5 71.5 42 L 71.5 89.5 L 28.5 89.5 L 28.5 42 Q 28.5 27.5 42.5 19.5 Z']))
    layers.append(('#f9a825', ['M 28.5 40 L 71.5 40 L 71.5 89.5 L 28.5 89.5 Z']))
    layers.append(('#d7263d', [rect(40, 4, 20, 8)]))
    layers.append(('#ffffff', [rect(28.5, 52, 43, 22)]))
    layers.append(('#2e7d32', [leaf(50, 70, 38, 56, 3), leaf(50, 70, 62, 56, 3), leaf(50, 70, 50, 54, 3)]))
    layers.append(('#d84315', [circle(50, 68, 3)]))
    layers.append(('#fff3c4', [rect(33, 44, 4, 40)]))
    return layers


def oil_box():
    """Caja de aceite: la caja de cartón con las tapas rojas de las botellas asomadas."""
    layers = [(OUTLINE, [poly(8, 40, 50, 26, 92, 40, 92, 82, 50, 96, 8, 82)])]
    layers.append(('#c8a26a', [poly(11, 42, 50, 55, 50, 92.5, 11, 80)]))
    layers.append(('#b08850', [poly(50, 55, 89, 42, 89, 80, 50, 92.5)]))
    for cx in (30, 50, 70):
        top = 14 + abs(cx - 50) * 0.3
        layers += [(OUTLINE, [rect(cx - 7, top, 14, 32)]), ('#f9a825', [rect(cx - 5.5, top + 6, 11, 24.5)]), ('#d7263d', [rect(cx - 5.5, top + 1.5, 11, 5)])]
    layers.append(('#d9b98a', [poly(11, 42, 50, 29, 89, 42, 50, 55)]))
    layers += [('#2e7d32', [leaf(66, 76, 58, 66, 2.5), leaf(66, 76, 74, 66, 2.5)]), ('#d84315', [circle(66, 74, 2.4)])]
    return layers


# ---------- Los Llanos · El Frutal (v3.32) ----------

def passion_fruit_shape(cx, cy, r, color='#f4c430'):
    """Maracuyá: la fruta redonda, amarilla y con pintas, con su tallito."""
    return [(OUTLINE, [circle(cx, cy, r + 1.8)]), (color, [circle(cx, cy, r)]), ('#fff59d', [ellipse(cx - r * 0.35, cy - r * 0.35, r * 0.3, r * 0.22, -30)]),
            ('#d4a017', [circle(cx + r * 0.3, cy + r * 0.2, 0.9), circle(cx - r * 0.2, cy + r * 0.45, 0.8), circle(cx + r * 0.5, cy - r * 0.3, 0.8)]),
            ('#5d4037', [rect(cx - 1.2, cy - r - 6, 2.4, 6)])]


def passion_vine():
    """Maracuyal: la enramada de alambre con la enredadera, sus flores moradas y los maracuyás colgando."""
    layers = [('#5d4037', [rect(14, 30, 5, 64), rect(81, 30, 5, 64)]), ('#8a8f94', [rib(16, 32, 84, 32, 1.6)])]
    for x0, y0, x1, y1 in [(16, 32, 30, 50), (34, 32, 26, 54), (50, 32, 58, 52), (66, 32, 74, 50), (84, 32, 70, 54), (40, 30, 46, 14), (62, 30, 56, 16), (24, 30, 18, 16), (78, 30, 84, 14)]:
        layers.append(('#2e7d32', [leaf(x0, y0, x1, y1, 7)]))
    for cx, cy in [(30, 22), (70, 22)]:
        layers.append(('#ffffff', [circle(cx, cy, 6)]))
        layers.append(('#7e57c2', [circle(cx, cy, 3.6)]))
        layers.append(('#fdd835', [circle(cx, cy, 1.4)]))
    for cx, cy in [(28, 66), (50, 70), (72, 64)]:
        layers.append(('#2e7d32', [rib(cx, 32, cx, cy - 10, 1)]))
        layers += passion_fruit_shape(cx, cy, 9)
    return layers


def passion_fruit():
    """Maracuyá: uno entero y otro partido por la mitad, con la pulpa amarilla y las semillas negras."""
    layers = passion_fruit_shape(34, 52, 22)
    layers += [(OUTLINE, [circle(70, 64, 22)]), ('#f4c430', [circle(70, 64, 20)]), ('#fff8e1', [circle(70, 64, 16.5)]), ('#f9a825', [circle(70, 64, 14)])]
    layers.append(('#263238', [circle(70 + 8 * math.cos(k * 0.9), 64 + 8 * math.sin(k * 0.9), 1.6) for k in range(7)] + [circle(70, 64, 1.6), circle(66, 60, 1.4), circle(74, 68, 1.4)]))
    return layers


def passion_pulp():
    """Pulpa de maracuyá: la olleta con la pulpa amarilla y sus semillas, recién despulpada."""
    layers = [(OUTLINE, ['M 12 44 L 88 44 Q 86 92 50 92 Q 14 92 12 44 Z']), ('#b0bec5', ['M 15 47 L 85 47 Q 83 89 50 89 Q 17 89 15 47 Z'])]
    layers += [(OUTLINE, [ellipse(50, 44, 39, 10)]), ('#f9a825', [ellipse(50, 44, 36, 8)])]
    layers.append(('#263238', [circle(38, 43, 1.6), circle(50, 46, 1.6), circle(62, 42, 1.6), circle(44, 40, 1.4), circle(58, 47, 1.4), circle(30, 46, 1.3), circle(70, 45, 1.3)]))
    layers += passion_fruit_shape(78, 24, 9)
    return layers


def past_pulp():
    """Pulpa pasteurizada: la bolsa sellada de pulpa, fría, con su etiqueta."""
    layers = [(OUTLINE, ['M 22 12 L 78 12 L 82 88 Q 50 96 18 88 Z']), ('#ffb300', ['M 25 15 L 75 15 L 79 85.5 Q 50 92.5 21 85.5 Z'])]
    layers.append(('#ffe082', [rect(28, 18, 8, 60)]))
    layers.append(('#e0e0e0', [rect(22, 12, 56, 8)]))
    layers += [('#ffffff', [rect(36, 40, 30, 22)]), ('#43a047', [leaf(51, 58, 44, 46, 3), leaf(51, 58, 58, 46, 3)]), ('#f4c430', [circle(51, 52, 3.5)])]
    layers.append(('#4fc3f7', ['M 80 22 L 84 30 L 80 38 L 76 30 Z', 'M 88 34 L 91 40 L 88 46 L 85 40 Z']))
    return layers


def passion_juice():
    """Jugo de maracuyá: el vaso de jugo amarillo con hielo y una tajada de maracuyá."""
    layers = [(OUTLINE, ['M 22 20 L 78 20 L 70 94 L 30 94 Z']), ('#e3f2fd', ['M 25 23 L 75 23 L 67.5 91.5 L 32.5 91.5 Z'])]
    layers.append(('#ffd54f', ['M 26.5 34 L 73.5 34 L 67.5 91.5 L 32.5 91.5 Z']))
    layers.append(('#ffffff', [rect(34, 40, 12, 10, 15), rect(52, 44, 11, 9, -10)]))
    layers.append(('#fff8e1', [rect(32, 38, 4, 48)]))
    layers += [(OUTLINE, [circle(76, 22, 13)]), ('#f4c430', [circle(76, 22, 11.5)]), ('#f9a825', [circle(76, 22, 8.5)]), ('#263238', [circle(73, 20, 1.3), circle(79, 24, 1.3), circle(76, 18, 1.2)])]
    layers.append(('#e53935', [rib(56, 6, 50, 60, 2.4)]))
    return layers


def juice_box():
    """Caja de jugos: la caja de cartón con las cajitas de jugo verdes y amarillas asomadas."""
    layers = [(OUTLINE, [poly(8, 40, 50, 26, 92, 40, 92, 82, 50, 96, 8, 82)])]
    layers.append(('#c8a26a', [poly(11, 42, 50, 55, 50, 92.5, 11, 80)]))
    layers.append(('#b08850', [poly(50, 55, 89, 42, 89, 80, 50, 92.5)]))
    for cx in (30, 50, 70):
        top = 16 + abs(cx - 50) * 0.3
        layers += [(OUTLINE, [rect(cx - 8, top, 16, 28)]), ('#43a047', [rect(cx - 6.5, top + 1.5, 13, 25)]), ('#f4c430', [circle(cx, top + 14, 4)]), ('#ffffff', [rect(cx + 2, top - 6, 2, 8)])]
    layers.append(('#d9b98a', [poly(11, 42, 50, 29, 89, 42, 50, 55)]))
    layers += passion_fruit_shape(66, 72, 5)
    return layers


# ---------- Los Llanos · La Cachamera (v3.33) ----------

def cachama():
    """Cachama: el pez redondo y alto de los ríos del Llano, gris oscuro con la barriga anaranjada."""
    layers = fish_shape(46, 54, 66, 48, '#455a64', '#ff8a50')
    layers.append(('#ffffff60', [ellipse(36, 42, 12, 3, -10)]))
    layers.append(('#4fc3f7', [circle(86, 20, 3), circle(92, 30, 2.2), circle(80, 30, 1.8)]))
    return layers


def clean_cachama():
    """Cachama limpia: la cachama sin escamas, sobre una hoja de plátano, con su tajo de limón."""
    layers = [('#2e7d32', [leaf(6, 80, 94, 66, 16)]), ('#66bb6a', [rib(10, 79, 90, 67, 1.2)])]
    layers += fish_shape(46, 54, 64, 44, '#90a4ae', '#ffccbc', -6)
    layers.append(('#ffffffb0', [ellipse(38, 44, 10, 2, -6)]))
    layers += [(OUTLINE, [circle(82, 30, 8)]), ('#9ccc65', [circle(82, 30, 6.5)]), ('#dce775', [circle(82, 30, 3.5)])]
    return layers


def cachama_fillet():
    """Filete de cachama: dos filetes rosados en la tabla, con el cuchillo."""
    layers = [(OUTLINE, [rect(6, 56, 88, 30, -6)]), ('#c68a4a', [rect(9, 59, 82, 24, -6)])]
    for cx, cy, rot in [(32, 54, -10), (62, 62, 8)]:
        layers.append((OUTLINE, [ellipse(cx, cy, 22, 12, rot)]))
        layers.append(('#ffd0bd', [ellipse(cx, cy, 19.5, 9.8, rot)]))
        layers.append(('#ffab91', [ellipse(cx + 3, cy + 2, 13, 4, rot)]))
    layers += [(OUTLINE, [rect(60, 14, 34, 8, 25)]), ('#cfd8dc', [rect(62, 16, 22, 4.5, 25)]), ('#5d4037', [rect(80, 26, 12, 6, 25)])]
    return layers


def smoked_cachama():
    """Cachama ahumada: las cachamas doradas colgadas en la vara, con el humo que sube."""
    layers = [('#5d4037', [rect(8, 18, 84, 6)])]
    for cx in (28, 50, 72):
        layers.append(('#8d6e4a', [rib(cx, 22, cx, 32, 1.4)]))
        layers += fish_shape(cx, 58, 46, 22, '#8d5524', '#c68a4a', 90, eye=False)
    layers.append(('#b0bec5a0', ['M 18 92 Q 12 80 20 70 Q 14 80 24 92 Z', 'M 84 92 Q 78 80 86 70 Q 80 80 90 92 Z']))
    return layers


def pisillo():
    """Pisillo de cachama: el pescado desmechado y sofrito en un plato hondo, con un plátano al lado."""
    layers = [(OUTLINE, [ellipse(50, 62, 44, 24)]), ('#ffffff', [ellipse(50, 62, 41, 21.5)]), ('#e0e0e0', [ellipse(50, 66, 32, 13)])]
    layers.append(('#c6893f', [ellipse(46, 58, 28, 12)]))
    layers.append(('#8d5524', [rib(30 + k * 6, 54 + (k % 2) * 4, 36 + k * 6, 58 - (k % 2) * 3, 1.6) for k in range(6)]))
    layers.append(('#e53935', [circle(40, 56, 2), circle(56, 60, 2), circle(48, 52, 1.6)]))
    layers.append(('#43a047', [circle(34, 60, 1.6), circle(60, 55, 1.6)]))
    layers += [(OUTLINE, ['M 70 26 Q 92 30 94 52 L 88 52 Q 84 36 68 32 Z']), ('#fbc02d', ['M 71 28.5 Q 89.5 32 91.5 49.5 L 89.5 49.5 Q 85.5 34.5 69.5 30 Z'])]
    return layers


def cachama_maracuya():
    """Cachama al maracuyá: la cachama asada en el plato, bañada en salsa amarilla de maracuyá."""
    layers = [(OUTLINE, [ellipse(50, 66, 46, 24)]), ('#ffffff', [ellipse(50, 66, 43, 21.5)])]
    layers.append(('#f4c430', [ellipse(46, 68, 34, 13)]))
    layers += fish_shape(44, 60, 56, 34, '#8d5524', '#d9893a', -6)
    layers.append(('#5d3a1a', [rib(30 + k * 8, 50, 34 + k * 8, 66, 1.4) for k in range(4)]))
    layers.append(('#f9a825', [ellipse(40, 58, 10, 3, -6)]))
    layers += [(OUTLINE, [circle(82, 30, 11)]), ('#f4c430', [circle(82, 30, 9.5)]), ('#f9a825', [circle(82, 30, 7)]), ('#263238', [circle(80, 28, 1.2), circle(84, 32, 1.2), circle(82, 26, 1.1)])]
    return layers


# ---------- Los Llanos · El Hato llanero (v3.34) ----------

def adobada():
    """Ternera adobada: la carne roja espolvoreada de sal gruesa, en la batea de madera."""
    layers = [(OUTLINE, [ellipse(50, 70, 44, 18)]), ('#a1785a', [ellipse(50, 70, 41, 15.5)])]
    for cx, cy, rot in [(36, 58, -12), (62, 62, 10)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 20, 12, rot)]), ('#a93226', [ellipse(cx, cy, 17.5, 9.5, rot)]), ('#f8bbd0', [ellipse(cx + 4, cy - 2, 7, 2.5, rot)])]
    layers.append(('#ffffff', [circle(30 + k * 7, 55 + (k % 3) * 3, 1.3) for k in range(7)] + [circle(56 + k * 6, 60 + (k % 2) * 4, 1.3) for k in range(4)]))
    return layers


def mamona():
    """Mamona a la vara: los trozos de ternera ensartados en las varas, clavadas junto a la candela."""
    layers = [('#5d4037', [rect(26, 14, 4, 80, -12), rect(56, 12, 4, 82, 8)])]
    for cx, cy, rot in [(30, 32, -12), (34, 56, -12), (58, 30, 8), (56, 54, 8)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 13, 9, rot)]), ('#8e3b1f', [ellipse(cx, cy, 10.5, 6.8, rot)]), ('#c0602a', [ellipse(cx - 2, cy - 2, 5, 2.4, rot)])]
    layers += [(OUTLINE, ['M 62 94 Q 66 74 76 66 Q 74 78 82 82 Q 84 70 90 64 Q 94 82 88 94 Z']), ('#ff7043', ['M 65 92 Q 68 77 75.5 70 Q 74.5 80.5 83 85 Q 85 75 89 69.5 Q 91.5 83 86.5 92 Z']), ('#ffd54f', ['M 72 92 Q 74 84 78 80 Q 78 86 84 88 L 84 92 Z'])]
    return layers


def carne_llanera():
    """Carne a la llanera: la tabla con la carne asada trinchada, el cuchillo y el ají."""
    layers = [(OUTLINE, [rect(6, 58, 88, 28, -6)]), ('#c68a4a', [rect(9, 61, 82, 22, -6)])]
    for k in range(4):
        cx = 22 + k * 15
        layers += [(OUTLINE, [rect(cx - 6, 48 - k, 12, 18, -6)]), ('#8d3b1f', [rect(cx - 4, 50 - k, 8, 14, -6)]), ('#d9893a', [rect(cx - 4, 50 - k, 8, 3, -6)])]
    layers += [(OUTLINE, [rect(58, 18, 36, 8, 25)]), ('#cfd8dc', [rect(60, 20, 22, 4.5, 25)]), ('#5d4037', [rect(80, 30, 12, 6, 25)])]
    layers += [(OUTLINE, [ellipse(16, 34, 10, 7)]), ('#ffffff', [ellipse(16, 34, 8, 5)]), ('#43a047', [ellipse(16, 33, 6, 3)]), ('#e53935', [circle(14, 32, 1.4), circle(19, 34, 1.2)])]
    return layers


def almuerzo_llanero():
    """Almuerzo llanero: el plato con la carne a la llanera, la yuca frita, el plátano y la papa."""
    layers = [(OUTLINE, [ellipse(50, 64, 46, 24)]), ('#ffffff', [ellipse(50, 64, 43, 21.5)])]
    layers += [(OUTLINE, [ellipse(40, 58, 18, 11)]), ('#8d3b1f', [ellipse(40, 58, 15.5, 8.5)]), ('#d9893a', [ellipse(36, 55, 6, 2, -10)])]
    for k in range(3):
        layers += [(OUTLINE, [rect(60 + k * 6, 50, 6, 20, 12)]), ('#f6d860', [rect(61 + k * 6, 51.5, 4, 17, 12)])]
    layers += [(OUTLINE, ['M 26 72 Q 40 84 58 76 L 56 72 Q 42 78 30 68 Z']), ('#f9a825', ['M 28 71.5 Q 40 81.5 55.5 74.5 L 55 73 Q 42 79.5 30 70 Z'])]
    layers += [(OUTLINE, [circle(70, 76, 6)]), ('#e0bb7a', [circle(70, 76, 4.6)])]
    return layers


def parranda():
    """Asado de la parranda: el arpa llanera junto al asado, con la carne y la cachama en las varas."""
    layers = [(OUTLINE, ['M 14 92 L 14 16 Q 34 8 52 30 L 50 92 Z']), ('#a1785a', ['M 17 89.5 L 17 18 Q 33 12 49 31.5 L 47.5 89.5 Z']), ('#5d4037', [rect(14, 86, 40, 6)])]
    layers.append(('#fff8e1', [rib(19 + k * 4, 22 + k * 1.5, 19 + k * 4, 86, 0.8) for k in range(7)]))
    layers += [('#5d4037', [rect(62, 18, 4, 76, 6), rect(82, 20, 4, 74, -6)])]
    layers += [(OUTLINE, [ellipse(64, 40, 10, 7, 6)]), ('#8e3b1f', [ellipse(64, 40, 7.5, 4.8, 6)])]
    layers += fish_shape(84, 46, 22, 14, '#8d5524', '#d9893a', 84, eye=False)
    layers += [(OUTLINE, ['M 64 94 Q 68 80 76 74 Q 76 84 82 86 Q 84 78 90 72 Q 92 86 88 94 Z']), ('#ff7043', ['M 67 92 Q 70 82 75.5 77.5 Q 75.5 86 83 88.5 Q 85 81 89 76.5 Q 90 87 86.5 92 Z'])]
    return layers


# ---------- Los Llanos · La Talabartería (v3.35) ----------

def hide_shape(cx, cy, s, color, edge):
    """Un cuero de res extendido: la silueta con sus cuatro patas y el cuello."""
    pts_ = [(-30, -14), (-38, -26), (-24, -20), (-10, -24), (0, -30), (10, -24), (24, -20), (38, -26), (30, -14), (34, 6), (40, 22), (24, 16), (10, 24), (0, 30), (-10, 24), (-24, 16), (-40, 22), (-34, 6)]
    outline = pts([(cx + x * s, cy + y * s) for x, y in pts_])
    inner = pts([(cx + x * s * 0.92, cy + y * s * 0.92) for x, y in pts_])
    return [(OUTLINE, [outline]), (color, [inner]), (edge, [ellipse(cx, cy, 18 * s, 12 * s)])]


def raw_hide():
    """Cuero crudo: el cuero de res templado en el marco de palos, secándose al sol con sal."""
    layers = [('#5d4037', [rect(8, 14, 6, 80), rect(86, 14, 6, 80), rect(8, 14, 84, 5), rect(8, 84, 84, 5)])]
    layers += hide_shape(50, 52, 1.0, '#c9a37a', '#d9b98a')
    layers.append(('#8d6e4a', [rib(14, 20, 22, 30, 1), rib(86, 20, 78, 30, 1), rib(14, 84, 22, 74, 1), rib(86, 84, 78, 74, 1)]))
    layers.append(('#ffffff', [circle(40 + k * 5, 50 + (k % 3) * 3, 1.2) for k in range(5)]))
    return layers


def leather():
    """Cuero curtido: el cuero café, blando y doblado en rollo, con el borde ondulado."""
    layers = [(OUTLINE, ['M 10 40 Q 50 26 90 40 L 90 76 Q 50 90 10 76 Z']), ('#8d5524', ['M 13 42 Q 50 29 87 42 L 87 74 Q 50 87 13 74 Z'])]
    layers += [(OUTLINE, [ellipse(18, 58, 12, 20)]), ('#6d3b1f', [ellipse(18, 58, 9.5, 17.5)]), ('#a0622d', [ellipse(18, 58, 5, 12)])]
    layers.append(('#a0622d', ['M 30 46 Q 60 38 84 46 L 84 50 Q 60 42 30 50 Z']))
    return layers


def leather_pieces():
    """Piezas de cuero: las piezas recortadas con su molde y la cuchilla de talabartero."""
    layers = []
    for x0, y0, rot, col in [(10, 30, -10, '#a0522d'), (44, 40, 8, '#8d5524'), (24, 62, 4, '#b5683a')]:
        layers += [(OUTLINE, [rect(x0, y0, 42, 22, rot)]), (col, [rect(x0 + 2.5, y0 + 2.5, 37, 17, rot)])]
        layers.append(('#5d3a1a', [rect(x0 + 6, y0 + 10, 30, 1.4, rot)]))
    layers += [(OUTLINE, ['M 70 14 Q 92 16 90 34 L 74 30 Z']), ('#cfd8dc', ['M 72.5 16.5 Q 89 18.5 87.5 31 L 75.5 28 Z']), ('#5d4037', [rect(62, 26, 14, 6, 25)])]
    return layers


def tooled_leather():
    """Cuero repujado: la pieza con la flor labrada a golpe de buril, y el buril."""
    layers = [(OUTLINE, [rect(10, 24, 70, 62, -6)]), ('#7b4a22', [rect(13, 27, 64, 56, -6)])]
    layers.append(('#a0622d', [rect(18, 32, 54, 46, -6)]))
    for k in range(6):
        a = math.radians(k * 60)
        layers.append(('#5d3a1a', [leaf(45, 55, 45 + 14 * math.cos(a), 55 + 14 * math.sin(a), 4)]))
    layers += [('#3e2412', [circle(45, 55, 4)]), ('#5d3a1a', [rib(22, 38, 30, 38, 1.4), rib(60, 72, 68, 72, 1.4)])]
    layers += [(OUTLINE, [rect(74, 8, 9, 46, 20)]), ('#b0bec5', [rect(76, 10, 5, 42, 20)])]
    return layers


def saddle():
    """Silla de montar llanera: la silla de cuero con su cabeza alta, el estribo y la cincha."""
    layers = [(OUTLINE, ['M 12 52 Q 20 38 34 40 Q 46 44 58 40 Q 66 26 72 20 Q 78 18 80 24 Q 76 34 78 44 Q 86 50 88 60 L 84 66 Q 50 74 16 66 Z'])]
    layers.append(('#6d3b1f', ['M 15 53 Q 22 41 34 43 Q 46 47 59 42.5 Q 67 29.5 72.5 23 Q 76.5 21.5 77.5 24.5 Q 73.5 34.5 75.5 45.5 Q 83 51 85 59.5 L 82.5 63.5 Q 50 71 17.5 63.5 Z']))
    layers.append(('#8d5524', ['M 22 52 Q 46 58 72 50 L 72 56 Q 46 64 22 58 Z']))
    layers.append(('#a0622d', [circle(28 + k * 9, 55 + (k % 2), 1.6) for k in range(5)]))
    layers += [('#5d4037', [rect(44, 66, 4, 18), rect(30, 64, 3, 22, 10)])]
    layers += [(OUTLINE, [rect(36, 82, 20, 9)]), ('#b0bec5', [rect(38, 84, 16, 5)])]
    return layers


def recuerdo_llano():
    """Recuerdo del Llano: la silla de montar con el sombrero llanero, el pisillo y la cachama ahumada."""
    layers = [(OUTLINE, ['M 8 70 Q 16 56 30 58 Q 44 62 56 56 Q 62 44 68 40 Q 74 40 74 46 Q 72 54 74 62 L 70 76 Q 40 84 10 78 Z']), ('#6d3b1f', ['M 11 71 Q 18 59 30 61 Q 44 65 57 58.5 Q 63 47 68 43 Q 71 43 71 46 Q 69 54 71.5 62 L 68 73.5 Q 40 81 12.5 75.5 Z'])]
    layers += [(OUTLINE, [ellipse(34, 36, 26, 7)]), ('#3e2a1a', [ellipse(34, 36, 23.5, 5)]), (OUTLINE, ['M 22 34 Q 22 18 34 16 Q 46 18 46 34 Z']), ('#5d4037', ['M 24.5 33 Q 24.5 20.5 34 18.5 Q 43.5 20.5 43.5 33 Z']), ('#f4c430', [rect(24.5, 28, 19, 3)])]
    layers += fish_shape(84, 30, 22, 12, '#8d5524', '#c68a4a', 90, eye=False)
    layers += [(OUTLINE, [ellipse(84, 78, 12, 7)]), ('#ffffff', [ellipse(84, 78, 10, 5)]), ('#c6893f', [ellipse(84, 77, 7, 3)])]
    return layers


# ---------- Los Llanos · Villavicencio (v3.36) ----------

def empanadas():
    """Empanadas: tres empanadas doradas, recién fritas, en la canasta con el ají."""
    layers = [(OUTLINE, ['M 8 62 L 92 62 L 82 92 L 18 92 Z']), ('#b08850', ['M 11.5 64.5 L 88.5 64.5 L 80 89.5 L 20 89.5 Z'])]
    for cx, cy, rot in [(30, 52, -12), (54, 46, 6), (72, 56, 18)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 20, 12, rot)]), ('#f2b705', [ellipse(cx, cy, 17.5, 9.5, rot)]), ('#d98e04', [rib(cx - 14, cy + 4, cx + 14, cy + 4, 1.6)])]
    layers += [(OUTLINE, [circle(84, 22, 10)]), ('#ffffff', [circle(84, 22, 8.5)]), ('#43a047', [circle(84, 22, 6)]), ('#e53935', [circle(82, 20, 1.6), circle(87, 24, 1.4)])]
    return layers


def tarde_parque():
    """Tarde en el parque: el kiosco con su techo de palma, el jugo y la empanada en la mesa."""
    layers = [(OUTLINE, ['M 10 40 L 50 12 L 90 40 Z']), ('#c9a35a', ['M 16 38 L 50 15.5 L 84 38 Z'])]
    layers.append(('#a1785a', [rib(30 + k * 8, 26 + abs(k - 2.5) * 2, 30 + k * 8, 38, 1) for k in range(6)]))
    layers += [('#6d4c32', [rect(20, 40, 4, 48), rect(76, 40, 4, 48)]), (OUTLINE, [rect(26, 62, 48, 7)]), ('#8d6e4a', [rect(28, 64, 44, 3)])]
    layers += [(OUTLINE, ['M 34 46 L 46 46 L 44 62 L 36 62 Z']), ('#ffd54f', ['M 35.5 48 L 44.5 48 L 43 60.5 L 37 60.5 Z'])]
    layers += [(OUTLINE, [ellipse(60, 58, 10, 5)]), ('#f2b705', [ellipse(60, 58, 8.5, 3.6)])]
    return layers


def noche_villavo():
    """Noche en Villavicencio: el hotel campestre con la piscina iluminada y la luna sobre las palmas."""
    layers = [(OUTLINE, [rect(8, 54, 84, 38)]), ('#fbf8f1', [rect(11, 57, 78, 32)]), (OUTLINE, ['M 4 56 L 50 34 L 96 56 Z']), ('#b5512e', ['M 10 54 L 50 37 L 90 54 Z'])]
    layers.append(('#ffd54f', [rect(20, 64, 10, 10), rect(70, 64, 10, 10)]))
    layers += [(OUTLINE, [rect(36, 76, 28, 14)]), ('#29b6f6', [rect(38, 78, 24, 10)]), ('#e1f5fe', [rib(41, 82, 59, 82, 1)])]
    layers += [('#fff59d', [circle(80, 16, 9)]), ('#1e3a5f', [circle(84, 13, 7)])]
    layers += [('#2e7d32', [leaf(16, 30, 4, 24, 4), leaf(16, 30, 28, 22, 4), leaf(16, 30, 16, 14, 4)]), ('#8d6e4a', [rect(15, 30, 2.4, 24)])]
    return layers


def almuerzo_plaza():
    """Almuerzo de la plaza: la cachama al maracuyá con la empanada y el jugo, en la mesa del mercado."""
    layers = [(OUTLINE, [ellipse(46, 64, 40, 22)]), ('#ffffff', [ellipse(46, 64, 37.5, 19.5)]), ('#f4c430', [ellipse(42, 66, 26, 10)])]
    layers += fish_shape(40, 60, 42, 26, '#8d5524', '#d9893a', -6)
    layers += [(OUTLINE, [ellipse(72, 74, 12, 7, 10)]), ('#f2b705', [ellipse(72, 74, 10, 5, 10)])]
    layers += [(OUTLINE, ['M 74 18 L 94 18 L 90 52 L 78 52 Z']), ('#ffd54f', ['M 76.5 26 L 91.5 26 L 88 49.5 L 80 49.5 Z'])]
    return layers


def fiambre_viaje():
    """Morral del viaje: el morral de cuero con el sombrero llanero y el termo, listo para Caño Cristales."""
    layers = [(OUTLINE, ['M 18 40 Q 18 30 30 30 L 70 30 Q 82 30 82 40 L 84 90 L 16 90 Z']), ('#8d5524', ['M 20.5 41 Q 20.5 32.5 30 32.5 L 70 32.5 Q 79.5 32.5 79.5 41 L 81.5 87.5 L 18.5 87.5 Z'])]
    layers += [(OUTLINE, ['M 18 42 L 82 42 L 78 62 L 22 62 Z']), ('#6d3b1f', ['M 20.5 44.5 L 79.5 44.5 L 76 59.5 L 24 59.5 Z']), ('#b0bec5', [rect(46, 56, 8, 8)])]
    layers += [(OUTLINE, [ellipse(50, 20, 34, 8)]), ('#3e2a1a', [ellipse(50, 20, 31, 6)]), (OUTLINE, ['M 36 18 Q 36 4 50 4 Q 64 4 64 18 Z']), ('#5d4037', ['M 38.5 17 Q 38.5 6.5 50 6.5 Q 61.5 6.5 61.5 17 Z'])]
    layers += [(OUTLINE, [rect(84, 44, 12, 38)]), ('#e53935', [rect(86, 46, 8, 34)])]
    return layers


def cano_cristales():
    """Caño Cristales: el río de los cinco colores, rojo, amarillo, verde y azul, entre las piedras."""
    layers = [(OUTLINE, ['M 4 30 Q 30 20 50 34 Q 70 48 96 40 L 96 78 Q 70 86 50 72 Q 30 58 4 70 Z'])]
    layers.append(('#4fc3f7', ['M 6 32.5 Q 30 23 50 37 Q 70 51 94 43 L 94 75.5 Q 70 83 50 69 Q 30 55 6 67.5 Z']))
    for cx, cy, rx, ry, col in [(18, 48, 10, 6, '#d7263d'), (40, 46, 9, 5, '#f4c430'), (60, 58, 10, 6, '#d7263d'), (80, 58, 9, 6, '#2e7d32'), (30, 60, 7, 4, '#2e7d32'), (72, 46, 6, 4, '#f4c430')]:
        layers.append((col, [ellipse(cx, cy, rx, ry, 10)]))
    layers += [('#8d8a80', [ellipse(14, 84, 12, 6), ellipse(86, 26, 10, 5), ellipse(50, 90, 8, 4)]), ('#ffffff', [rib(22, 40, 32, 38, 1.2), rib(54, 64, 66, 66, 1.2)])]
    return layers


# ---------- Costa Pacífica · El Platanal (v3.38) ----------

def finger(x0, y0, x1, y1, bend, w, color, outline=True, tip=True):
    """Dedo de plátano: grueso y curvo, de la base (x0, y0) a la punta (x1, y1), curvado `bend`, de grueso `w`."""
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    nx, ny = -dy / length, dx / length
    qx, qy = (x0 + x1) / 2 + nx * bend * 2, (y0 + y1) / 2 + ny * bend * 2

    def at(t):
        cx = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * qx + t * t * x1
        cy = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * qy + t * t * y1
        tx = 2 * (1 - t) * (qx - x0) + 2 * t * (x1 - qx)
        ty = 2 * (1 - t) * (qy - y0) + 2 * t * (y1 - qy)
        k = math.hypot(tx, ty) or 1
        return cx, cy, -ty / k, tx / k

    def shape(extra):
        left, right = [], []
        for i in range(17):
            t = i / 16
            cx, cy, ux, uy = at(t)
            half = (w / 2) * (0.45 + 0.55 * math.sin(math.pi * min(1, t * 1.25))) + extra
            left.append((cx + ux * half, cy + uy * half))
            right.append((cx - ux * half, cy - uy * half))
        return pts(left + right[::-1])
    layers = [(OUTLINE, [shape(1.6)])] if outline else []
    layers.append((color, [shape(0)]))
    if tip:
        cx, cy, _, _ = at(1)
        layers.append(('#4e342e', [circle(cx, cy, max(1.2, w * 0.16))]))
    return layers


def plantain_plant():
    """Mata de plátano: el tallo con sus hojas grandes y rasgadas, el racimo verde y la bellota morada."""
    layers = [('#5d8f3a', [ellipse(50, 94, 24, 5)])]
    layers.append((OUTLINE, ['M 41 94 L 44 38 L 56 38 L 59 94 Z']))
    layers.append(('#8a9a4b', ['M 43.6 91.5 L 46.4 40.5 L 53.6 40.5 L 56.4 91.5 Z']))
    layers.append(('#6b7a34', [rect(47, 46, 1.6, 44), rect(51.5, 50, 1.4, 38)]))
    fronds = [(50, 38, 6, 26, 10), (50, 38, 94, 22, 10), (50, 36, 26, 4, 9), (50, 36, 72, 4, 9), (50, 40, 12, 52, 7)]
    for x0, y0, x1, y1, w in fronds:
        layers.append((OUTLINE, [leaf(x0, y0, x1, y1, w + 1.5)]))
        layers.append(('#43a047' if x1 < 50 else '#66bb6a', [leaf(x0, y0, x1, y1, w)]))
    layers.append(('#2e7d32', [rib(x0, y0, x1, y1, 1.1) for x0, y0, x1, y1, w in fronds]))
    # El racimo, colgado del vástago que sale de la corona.
    layers.append((OUTLINE, ['M 54 40 Q 70 42 70 56 L 67 56 Q 67 45 54 43 Z']))
    for k, cy in enumerate((56, 64, 72)):
        for dx in (-8, -3, 2, 7):
            layers += finger(68 + dx * 0.6, cy + 2, 68 + dx * 1.2, cy - 8, 1.5, 4.6, '#7cb342' if (k + dx) % 2 else '#8bc34a', tip=False)
    layers += [(OUTLINE, [ellipse(69, 84, 5.5, 8)]), ('#7b1f4b', [ellipse(69, 84, 3.8, 6.3)]), ('#a8456f', [ellipse(67.6, 82, 1.2, 3)])]
    return layers


def plantain_bunch():
    """Racimo de plátano: el racimo verde con sus manos, colgado del vástago, y la bellota morada."""
    layers = [(OUTLINE, [rect(46, 2, 8, 88)]), ('#8a9a4b', [rect(48.4, 4, 3.2, 84)])]
    for k, cy in enumerate((22, 40, 58, 74)):
        spread = 26 - k * 3
        for i in range(5):
            f = i / 4
            bx = 50 + (f - 0.5) * spread * 0.6
            tx = 50 + (f - 0.5) * spread * 2
            layers += finger(bx, cy + 6, tx, cy - 8, 2 if tx > 50 else -2, 7, '#7cb342' if (i + k) % 2 else '#9ccc65')
    layers += [(OUTLINE, [ellipse(50, 90, 6.5, 8.5)]), ('#7b1f4b', [ellipse(50, 90, 4.8, 6.8)]), ('#a8456f', [ellipse(48.4, 88, 1.3, 3)])]
    return layers


def hand_of(cx, cy, colors, n=5, scale=1.0):
    """La mano de plátano: los dedos que salen de la corona, abiertos en abanico."""
    layers = []
    for i in range(n):
        a = math.radians(-55 + i * 75 / (n - 1))
        tx = cx + math.cos(a) * 44 * scale
        ty = cy + math.sin(a) * 30 * scale - 10 * scale
        layers += finger(cx + 4 * scale, cy, tx, ty, -4 * scale, 11 * scale, colors[i % len(colors)])
    layers += [(OUTLINE, [rect(cx - 8 * scale, cy - 6 * scale, 12 * scale, 12 * scale)]), ('#6b7a34', [rect(cx - 6 * scale, cy - 4 * scale, 8 * scale, 8 * scale)])]
    return layers


def plantain_hand():
    """Mano de plátano: los dedos verdes unidos por la corona, como salen del racimo."""
    return hand_of(10, 70, ['#7cb342', '#8bc34a', '#689f38'], 5, 1.6)


def washed_plantain():
    """Plátano lavado: la mano de plátano en el agua del tanque, con las burbujas."""
    layers = [(OUTLINE, [rect(4, 52, 92, 42)]), ('#4fa3c7', [rect(7, 55, 86, 36)])]
    layers += hand_of(16, 56, ['#9ccc65', '#8bc34a', '#aed581'], 5, 1.15)
    layers.append(('#81c9e6', [rect(7, 66, 86, 25)]))
    layers.append(('#e8f6ff', [circle(30, 78, 2.6), circle(46, 84, 2), circle(64, 76, 3), circle(80, 84, 2.2), circle(22, 86, 1.8)]))
    layers.append(('#e8f6ff', ['M 10 70 Q 20 66 30 70 Q 40 74 50 70 Q 60 66 70 70 Q 80 74 90 70 L 90 72 Q 80 76 70 72 Q 60 68 50 72 Q 40 76 30 72 Q 20 68 10 72 Z']))
    return layers


def peeled_plantain():
    """Plátano pelado: el plátano verde sin cáscara, de color crema, con la cáscara al lado y el cuchillo."""
    layers = finger(10, 70, 90, 56, -8, 18, '#eee0a6', tip=False)
    layers.append(('#d9c27a', ['M 18 72 Q 50 76 84 60 L 84 62 Q 50 79 18 74 Z']))
    for x0, y0, x1, y1, b in [(14, 92, 46, 88, 4), (52, 94, 84, 86, 4)]:
        layers += finger(x0, y0, x1, y1, b, 6, '#558b2f', tip=False)
    layers += [(OUTLINE, [rect(58, 14, 34, 7, -28)]), ('#cfd8dc', [rect(59.5, 15.5, 31, 4, -28)]),
               (OUTLINE, [rect(44, 30, 18, 9, -28)]), ('#6d4c41', [rect(45.5, 31.5, 15, 6, -28)])]
    return layers


def patacon_disc(cx, cy, r):
    """Un patacón: el plátano frito y aplastado, dorado, con el borde rizado y más tostado."""
    ring = [(cx + (r + 2.2 + (1.4 if i % 2 else 0)) * math.cos(math.radians(i * 20)), cy + (r * 0.62 + 2 + (1 if i % 2 else 0)) * math.sin(math.radians(i * 20))) for i in range(18)]
    edge = [(cx + (r + (1.2 if i % 2 else 0)) * math.cos(math.radians(i * 20)), cy + (r * 0.62 + (0.8 if i % 2 else 0)) * math.sin(math.radians(i * 20))) for i in range(18)]
    return [(OUTLINE, [pts(ring)]), ('#c98a24', [pts(edge)]), ('#f0b84a', [ellipse(cx, cy - 1, r * 0.72, r * 0.42)]),
            ('#d99a2e', [ellipse(cx - r * 0.3, cy - 2, r * 0.18, r * 0.1), ellipse(cx + r * 0.25, cy + 1, r * 0.2, r * 0.1)]),
            ('#ffffff', [circle(cx - r * 0.15, cy - 3, 0.9), circle(cx + r * 0.3, cy - 2, 0.8), circle(cx, cy + 1, 0.8)])]


def patacon():
    """Patacones: tres patacones dorados, recién fritos y aplastados, en el plato con sal."""
    layers = [(OUTLINE, [ellipse(50, 66, 46, 24)]), ('#f5f5f0', [ellipse(50, 66, 43.5, 21.5)]), ('#dcdcd2', [ellipse(50, 69, 34, 14)])]
    layers += patacon_disc(34, 58, 16) + patacon_disc(64, 56, 16) + patacon_disc(50, 72, 17)
    return layers


def patacon_bag():
    """Bolsa de patacones: la bolsa amarilla, cerrada arriba, con los patacones por la ventana y el plátano."""
    layers = [(OUTLINE, ['M 22 14 L 78 14 L 76 22 Q 84 54 80 92 L 20 92 Q 16 54 24 22 Z'])]
    layers.append(('#f4c430', ['M 24.6 16.5 L 75.4 16.5 L 73.6 22.5 Q 81.4 54 77.6 89.5 L 22.4 89.5 Q 18.6 54 26.4 22.5 Z']))
    layers.append(('#d99a1e', [rect(24, 16.5, 52, 6)]))
    layers += [(OUTLINE, [ellipse(50, 60, 20, 16)]), ('#fff3c4', [ellipse(50, 60, 18, 14)])]
    layers += patacon_disc(44, 58, 8) + patacon_disc(56, 63, 8)
    layers += finger(30, 38, 70, 34, -4, 9, '#7cb342')
    layers.append(('#ffffff', [rect(28, 78, 44, 6)]))
    return layers


def patacon_box():
    """Caja de patacones: la caja de cartón con las bolsas amarillas asomadas."""
    layers = [(OUTLINE, [poly(8, 40, 50, 26, 92, 40, 92, 82, 50, 96, 8, 82)])]
    layers.append(('#c8a26a', [poly(11, 42, 50, 55, 50, 92.5, 11, 80)]))
    layers.append(('#b08850', [poly(50, 55, 89, 42, 89, 80, 50, 92.5)]))
    for cx in (30, 50, 70):
        top = 12 + abs(cx - 50) * 0.3
        layers += [(OUTLINE, [rect(cx - 9, top, 18, 34)]), ('#f4c430', [rect(cx - 7.5, top + 1.5, 15, 31)]), ('#d99a1e', [rect(cx - 7.5, top + 1.5, 15, 4)]),
                   ('#e0a030', [ellipse(cx, top + 16, 5, 3)])]
    layers.append(('#d9b98a', [poly(11, 42, 50, 29, 89, 42, 50, 55)]))
    layers += finger(58, 78, 82, 68, -2, 6, '#7cb342')
    return layers


# ---------- Costa Pacífica · La Azotea (v3.39) ----------

def herb_sprig(cx, cy, h, color, lean=0):
    """Una mata de hierba: el tallo y sus hojas en punta, a lado y lado."""
    layers = [(OUTLINE, [rib(cx, cy, cx + lean, cy - h, 3.2)]), ('#2e7d32', [rib(cx, cy, cx + lean, cy - h, 1.6)])]
    for k in range(3):
        f = 0.35 + k * 0.25
        bx, by = cx + lean * f, cy - h * f
        for side in (-1, 1):
            layers.append((OUTLINE, [leaf(bx, by, bx + side * h * 0.38, by - h * 0.18, 4.6)]))
            layers.append((color, [leaf(bx, by, bx + side * h * 0.38, by - h * 0.18, 3.4)]))
    layers += [(OUTLINE, [leaf(cx + lean, cy - h, cx + lean, cy - h - h * 0.3, 4.4)]), (color, [leaf(cx + lean, cy - h, cx + lean, cy - h - h * 0.3, 3.2)])]
    return layers


def azotea():
    """Azotea: la canoa vieja alzada en pilotes, llena de tierra y de hierbas de cocina."""
    layers = [('#5d8f3a', [ellipse(50, 94, 40, 5)])]
    for x in (22, 40, 60, 78):
        layers += [(OUTLINE, [rect(x - 3.5, 58, 7, 36)]), ('#6d4c41', [rect(x - 1.8, 59.5, 3.6, 33)])]
    layers += [(OUTLINE, ['M 6 44 L 94 44 Q 90 66 70 68 L 30 68 Q 10 66 6 44 Z']), ('#8d6e4a', ['M 9.5 46.5 L 90.5 46.5 Q 87 63.5 69 65.5 L 31 65.5 Q 13 63.5 9.5 46.5 Z'])]
    layers.append(('#4e342e', [rect(10, 44, 80, 5)]))
    for cx, h, col, lean in [(18, 26, '#43a047', -4), (32, 34, '#66bb6a', 2), (48, 30, '#2e7d32', -2), (62, 36, '#7cb342', 4), (78, 28, '#558b2f', 3)]:
        layers += herb_sprig(cx, 46, h, col, lean)
    layers += [('#7e57c2', [circle(48, 13, 2.4), circle(51, 10, 2), circle(45, 10, 2)])]
    return layers


def herbs():
    """Hierbas de azotea: el manojo de chillangua, poleo y albahaca, amarrado con una cabuya."""
    layers = []
    for x1, y1, col in [(22, 18, '#43a047'), (38, 10, '#66bb6a'), (54, 8, '#2e7d32'), (70, 14, '#7cb342'), (82, 26, '#558b2f')]:
        layers += [(OUTLINE, [leaf(50, 80, x1, y1, 11)]), (col, [leaf(50, 80, x1, y1, 9)]), ('#1b5e20', [rib(50, 80, x1, y1, 1)])]
    layers += [(OUTLINE, [rect(42, 70, 16, 24, 0)]), ('#689f38', [rect(44.5, 72, 11, 21)])]
    layers += [(OUTLINE, [rect(38, 72, 24, 8)]), ('#c8a26a', [rect(40, 73.5, 20, 5)])]
    layers += [('#7e57c2', [circle(54, 14, 2.6), circle(57, 11, 2.2), circle(51, 11, 2.2)])]
    return layers


def washed_herbs():
    """Hierbas lavadas: el manojo dentro de la ponchera con agua, todavía goteando."""
    layers = [(OUTLINE, ['M 6 54 L 94 54 Q 90 92 50 92 Q 10 92 6 54 Z']), ('#e57373', ['M 9.5 56.5 L 90.5 56.5 Q 87 89.5 50 89.5 Q 13 89.5 9.5 56.5 Z'])]
    for x1, y1, col in [(24, 20, '#66bb6a'), (42, 12, '#81c784'), (60, 12, '#4caf50'), (76, 22, '#9ccc65')]:
        layers += [(OUTLINE, [leaf(50, 66, x1, y1, 10)]), (col, [leaf(50, 66, x1, y1, 8)]), ('#2e7d32', [rib(50, 66, x1, y1, 1)])]
    layers += [(OUTLINE, [ellipse(50, 56, 43, 8)]), ('#4fa3c7', [ellipse(50, 56, 40.5, 6)]), ('#e8f6ff', [ellipse(36, 55, 8, 1.6), ellipse(64, 57, 6, 1.4)])]
    layers += [('#4fa3c7', ['M 30 30 Q 33 36 30 38 Q 27 36 30 30 Z', 'M 70 34 Q 73 40 70 42 Q 67 40 70 34 Z'])]
    return layers


def pounded_herbs():
    """Hierbas machacadas: el pilón de madera con la pasta verde y la mano del pilón."""
    layers = [(OUTLINE, ['M 18 40 L 82 40 L 74 84 L 66 92 L 34 92 L 26 84 Z']), ('#8d6e4a', ['M 21 42.5 L 79 42.5 L 71.6 82.8 L 64.8 89.5 L 35.2 89.5 L 28.4 82.8 Z'])]
    layers.append(('#6d4c41', [rect(24, 60, 52, 4), rect(26, 72, 48, 4)]))
    layers += [(OUTLINE, [ellipse(50, 41, 32, 8)]), ('#4e342e', [ellipse(50, 41, 29.5, 6)]), ('#558b2f', [ellipse(50, 42, 24, 4.5)]), ('#7cb342', [circle(42, 41, 2), circle(56, 42, 1.8), circle(48, 43, 1.6)])]
    layers += [(OUTLINE, [rect(58, 2, 12, 44, 18)]), ('#bc8a5f', [rect(60.5, 4.5, 7, 39, 18)])]
    layers += [('#ffffff', [circle(36, 44, 1.2), circle(60, 40, 1.2)])]
    return layers


def alino_jar(cx, cy, s=1.0):
    """Frasco de aliño: vidrio con el aliño verde oscuro, la tapa roja y la etiqueta con la hoja."""
    w, h = 22 * s, 34 * s
    layers = [(OUTLINE, [rect(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 4)]), ('#e8f6ff', [rect(cx - w / 2, cy - h / 2, w, h)])]
    layers.append(('#7a8a2e', [rect(cx - w / 2, cy - h / 2 + 6 * s, w, h - 6 * s)]))
    layers.append(('#5d6b1f', [circle(cx - w * 0.2, cy + h * 0.1, 1.6 * s), circle(cx + w * 0.25, cy + h * 0.3, 1.4 * s), circle(cx, cy - h * 0.1, 1.2 * s)]))
    layers += [(OUTLINE, [rect(cx - w / 2 - 1, cy - h / 2 - 9 * s, w + 2, 9 * s)]), ('#d7263d', [rect(cx - w / 2 + 1, cy - h / 2 - 7 * s, w - 2, 5 * s)])]
    layers.append(('#fff8e1', [rect(cx - w / 2, cy - 2 * s, w, 12 * s)]))
    layers.append(('#2e7d32', [leaf(cx - 6 * s, cy + 8 * s, cx + 6 * s, cy, 2.4 * s)]))
    return layers


def alino():
    """Aliño de azotea: el frasco de aliño, con la chillangua y el ajo al lado."""
    layers = alino_jar(46, 54, 1.6)
    layers += [(OUTLINE, [leaf(70, 92, 94, 60, 7)]), ('#43a047', [leaf(70, 92, 94, 60, 5.5)])]
    layers += [(OUTLINE, [ellipse(16, 84, 10, 9)]), ('#f5f0e1', [ellipse(16, 84, 8, 7)]), ('#d7ccc8', [rib(16, 77, 16, 91, 1)])]
    return layers


def alino_box():
    """Caja de aliño: la caja de cartón con los frascos de tapa roja asomados."""
    layers = [(OUTLINE, [poly(8, 40, 50, 26, 92, 40, 92, 82, 50, 96, 8, 82)])]
    layers.append(('#c8a26a', [poly(11, 42, 50, 55, 50, 92.5, 11, 80)]))
    layers.append(('#b08850', [poly(50, 55, 89, 42, 89, 80, 50, 92.5)]))
    for cx in (30, 50, 70):
        top = 28 + abs(cx - 50) * 0.3
        layers += alino_jar(cx, top, 0.6)
    layers.append(('#d9b98a', [poly(11, 42, 50, 29, 89, 42, 50, 55)]))
    layers += [(OUTLINE, [leaf(60, 78, 80, 66, 4.5)]), ('#43a047', [leaf(60, 78, 80, 66, 3.2)])]
    return layers


# ---------- Costa Pacífica · La Bahía (v3.40) ----------

def pargo():
    """Pargo rojo: el pez del mar Pacífico, rojo encendido con la barriga rosada, recién sacado."""
    layers = fish_shape(46, 54, 74, 38, '#e53935', '#ffab91')
    layers.append(('#ffffff60', [ellipse(36, 44, 14, 3, -8)]))
    layers.append(('#b71c1c', [rib(30 + k * 9, 40, 34 + k * 9, 46, 1.2) for k in range(4)]))
    layers.append(('#4fc3f7', [circle(88, 22, 3), circle(93, 32, 2.2), circle(82, 32, 1.8)]))
    return layers


def clean_pargo():
    """Pargo limpio: el pargo sin escamas ni tripas, sobre una hoja de plátano, con su tajo de limón."""
    layers = [('#2e7d32', [leaf(6, 80, 94, 66, 16)]), ('#66bb6a', [rib(10, 79, 90, 67, 1.2)])]
    layers += fish_shape(46, 54, 68, 34, '#ef9a9a', '#ffe0d6', -6)
    layers.append(('#ffffffb0', [ellipse(38, 46, 11, 2, -6)]))
    layers += [(OUTLINE, [circle(82, 28, 8)]), ('#9ccc65', [circle(82, 28, 6.5)]), ('#dce775', [circle(82, 28, 3.5)])]
    return layers


def pargo_fillet():
    """Filete de pargo: los filetes blancos, con su piel roja, en la tabla y con el cuchillo."""
    layers = [(OUTLINE, [rect(6, 56, 88, 30, -6)]), ('#c68a4a', [rect(9, 59, 82, 24, -6)])]
    for cx, cy, rot in [(32, 54, -10), (62, 62, 8)]:
        layers.append((OUTLINE, [ellipse(cx, cy, 22, 12, rot)]))
        layers.append(('#e53935', [ellipse(cx, cy, 19.5, 9.8, rot)]))
        layers.append(('#fff3ee', [ellipse(cx - 1, cy - 1.5, 18, 7.5, rot)]))
        layers.append(('#ffd0c4', [ellipse(cx + 2, cy, 11, 2.5, rot)]))
    layers += [(OUTLINE, [rect(60, 14, 34, 8, 25)]), ('#cfd8dc', [rect(62, 16, 22, 4.5, 25)]), ('#5d4037', [rect(80, 26, 12, 6, 25)])]
    return layers


def smoked_pargo():
    """Pargo ahumado: los pargos dorados abiertos sobre la parrilla del ahumadero, con el humo que sube."""
    layers = [(OUTLINE, [rect(6, 70, 88, 8)]), ('#5d4037', [rect(8, 71.5, 84, 5)])]
    layers.append(('#37474f', [rib(10 + k * 10, 70, 10 + k * 10, 78, 1.2) for k in range(9)]))
    for cx, rot in [(30, -8), (68, 6)]:
        layers += fish_shape(cx, 58, 46, 24, '#a0522d', '#d9893a', rot, eye=False)
    layers.append(('#b0bec5a0', ['M 22 40 Q 16 28 24 16 Q 18 28 28 40 Z', 'M 52 38 Q 46 24 54 10 Q 48 24 58 38 Z', 'M 78 40 Q 72 28 80 16 Q 74 28 84 40 Z']))
    layers += [('#ff7043', [ellipse(50, 88, 30, 5)]), ('#ffcc80', [ellipse(50, 88, 16, 2.5)])]
    return layers


def dried_fish():
    """Pescado seco: el pescado abierto y salado, colgado al sol en la cuerda, con la sal que brilla."""
    layers = [('#8d6e4a', [rect(4, 14, 92, 4)])]
    for cx in (28, 70):
        layers.append(('#5d4037', [rib(cx, 16, cx, 26, 1.4)]))
        layers.append((OUTLINE, ['M %d 24 Q %d 40 %d 70 L %d 90 L %d 70 Q %d 40 %d 24 Z' % (cx - 4, cx - 22, cx - 8, cx, cx + 8, cx + 22, cx + 4)]))
        layers.append(('#d7c49e', ['M %d 27 Q %d 42 %d 68 L %d 85 L %d 68 Q %d 42 %d 27 Z' % (cx - 3, cx - 18.5, cx - 6.5, cx, cx + 6.5, cx + 18.5, cx + 3)]))
        layers.append(('#b89a6a', [rib(cx, 30, cx, 80, 1.4)] + [rib(cx - 10 + k * 0, 38 + k * 9, cx + 10, 38 + k * 9, 0.8) for k in range(4)]))
        layers.append(('#ffffff', [circle(cx - 6, 40, 1.2), circle(cx + 5, 52, 1.2), circle(cx - 4, 62, 1), circle(cx + 7, 34, 1)]))
    layers.append(('#fbc02d', [circle(90, 8, 5)]))
    return layers


def tapao():
    """Tapao de pescado: la olla destapada con el pescado, el plátano verde y el caldo, y la hoja que la tapaba."""
    layers = [(OUTLINE, ['M 10 48 L 90 48 L 84 86 Q 50 96 16 86 Z']), ('#546e7a', ['M 13 50.5 L 87 50.5 L 81.6 84 Q 50 93 18.4 84 Z'])]
    layers += [(OUTLINE, [ellipse(50, 48, 42, 11)]), ('#c98a24', [ellipse(50, 48, 39.5, 9)])]
    layers += fish_shape(44, 44, 40, 16, '#e57373', '#ffccbc', -4)
    for x0, y0, x1, y1 in [(62, 48, 80, 42), (22, 50, 34, 44)]:
        layers += [(OUTLINE, [ellipse((x0 + x1) / 2, (y0 + y1) / 2, 10, 4.5, -18)]), ('#c5e1a5', [ellipse((x0 + x1) / 2, (y0 + y1) / 2, 8, 3, -18)])]
    layers += [('#43a047', [circle(30, 46, 1.6), circle(58, 50, 1.6), circle(70, 52, 1.4)])]
    layers += [(OUTLINE, [leaf(54, 30, 96, 6, 12)]), ('#2e7d32', [leaf(54, 30, 96, 6, 10)]), ('#66bb6a', [rib(56, 29, 94, 7, 1)])]
    layers.append(('#eceff1a0', ['M 30 34 Q 24 24 32 14 Q 26 24 36 34 Z', 'M 46 32 Q 40 22 48 12 Q 42 22 52 32 Z']))
    return layers


# ---------- Costa Pacífica · El Manglar (v3.41) ----------

def piangua_shell(cx, cy, r, rot=0, open_=False):
    """Una piangua: la concha negra, rayada, con su borde; abierta muestra la carne rojiza."""
    layers = [(OUTLINE, [ellipse(cx, cy, r + 1.8, r * 0.82 + 1.8, rot)]), ('#2b2622', [ellipse(cx, cy, r, r * 0.82, rot)])]
    a = math.radians(rot)
    for k in (-0.5, 0, 0.5):
        x0, y0 = cx + math.cos(a + math.pi / 2) * r * 0.75 + math.cos(a) * k * r, cy + math.sin(a + math.pi / 2) * r * 0.62 + math.sin(a) * k * r
        layers.append(('#4e443a', [rib(cx + math.cos(a) * k * r * 0.4, cy - r * 0.55, x0, y0, 1.1)]))
    if open_:
        layers += [('#f5e6d3', [ellipse(cx, cy - r * 0.15, r * 0.7, r * 0.45, rot)]), ('#b5654a', [ellipse(cx, cy - r * 0.15, r * 0.5, r * 0.3, rot)])]
    layers.append(('#ffffff40', [ellipse(cx - r * 0.35, cy - r * 0.35, r * 0.3, r * 0.12, rot - 20)]))
    return layers


def mangrove_tree(cx, cy, s=1.0):
    """El mangle: la copa verde oscura sobre las raíces zancudas que salen del agua."""
    layers = []
    for dx in (-18, -9, 0, 9, 18):
        layers += [(OUTLINE, ['M %.1f %.1f Q %.1f %.1f %.1f %.1f' % (cx, cy - 20 * s, cx + dx * 0.4 * s, cy - 10 * s, cx + dx * s, cy) + ' L %.1f %.1f Q %.1f %.1f %.1f %.1f Z' % (cx + dx * s + 2.4 * s, cy, cx + dx * 0.4 * s + 2 * s, cy - 10 * s, cx + 2 * s, cy - 20 * s)])]
        layers += [('#6d4c41', ['M %.1f %.1f Q %.1f %.1f %.1f %.1f' % (cx + 0.6 * s, cy - 20 * s, cx + dx * 0.4 * s + 0.6 * s, cy - 10 * s, cx + dx * s + 0.6 * s, cy) + ' L %.1f %.1f Q %.1f %.1f %.1f %.1f Z' % (cx + dx * s + 1.8 * s, cy, cx + dx * 0.4 * s + 1.4 * s, cy - 10 * s, cx + 1.4 * s, cy - 20 * s)])]
    layers += [(OUTLINE, [rect(cx - 3 * s, cy - 40 * s, 6 * s, 22 * s)]), ('#6d4c41', [rect(cx - 1.5 * s, cy - 39 * s, 3 * s, 20 * s)])]
    for dx, dy, r in [(-14, -46, 13), (12, -48, 13), (0, -58, 15), (-4, -42, 10), (8, -40, 10)]:
        layers += [(OUTLINE, [circle(cx + dx * s, cy + dy * s, r * s + 1.8)])]
    for dx, dy, r in [(-14, -46, 13), (12, -48, 13), (0, -58, 15), (-4, -42, 10), (8, -40, 10)]:
        layers += [('#2e6b22' if dy < -50 else '#245a1c', [circle(cx + dx * s, cy + dy * s, r * s)])]
    return layers


def mangrove():
    """Manglar: el mangle con sus raíces zancudas en el agua y las pianguas en el barro."""
    layers = [('#5d4a36', [ellipse(50, 88, 46, 9)]), ('#4fa3c7a0', [ellipse(64, 86, 30, 6)])]
    layers += mangrove_tree(46, 86, 1.25)
    layers += piangua_shell(20, 88, 6, -10) + piangua_shell(80, 90, 6, 15)
    return layers


def piangua():
    """Piangua: las conchas negras del manglar, todavía con barro, en la batea de madera."""
    layers = [(OUTLINE, [ellipse(50, 70, 46, 18)]), ('#8d6e4a', [ellipse(50, 70, 43.5, 15.5)]), ('#6d4c41', [ellipse(50, 66, 36, 9)])]
    for cx, cy, rot in [(30, 56, -20), (50, 50, 10), (70, 56, 25), (40, 66, -5), (62, 66, 15), (50, 36, -10)]:
        layers += piangua_shell(cx, cy, 11, rot)
    layers.append(('#5d4a36', [ellipse(36, 70, 4, 1.4), ellipse(64, 48, 3, 1.2)]))
    return layers


def cooked_piangua():
    """Piangua cocida: la olla con las conchas abiertas por el hervor y el vapor que sube."""
    layers = [(OUTLINE, ['M 10 46 L 90 46 L 84 88 Q 50 96 16 88 Z']), ('#546e7a', ['M 13 48.5 L 87 48.5 L 81.6 86 Q 50 93 18.4 86 Z'])]
    layers += [(OUTLINE, [ellipse(50, 46, 42, 11)]), ('#cfd8dc', [ellipse(50, 46, 39.5, 9)])]
    for cx, cy, rot in [(30, 44, -15), (50, 40, 5), (70, 44, 20), (40, 50, 0), (60, 50, 10)]:
        layers += piangua_shell(cx, cy, 8.5, rot, open_=True)
    layers.append(('#eceff1a0', ['M 30 30 Q 24 20 32 8 Q 26 20 36 30 Z', 'M 52 28 Q 46 18 54 6 Q 48 18 58 28 Z', 'M 72 30 Q 66 20 74 8 Q 68 20 78 30 Z']))
    return layers


def piangua_meat():
    """Carne de piangua: la carne rojiza, ya desconchada, en el plato hondo; al lado, las conchas vacías."""
    layers = [(OUTLINE, [ellipse(46, 62, 40, 22)]), ('#ffffff', [ellipse(46, 62, 37.5, 19.5)]), ('#e0e0e0', [ellipse(46, 66, 28, 11)])]
    for cx, cy in [(34, 56), (44, 52), (54, 56), (40, 62), (52, 63), (60, 58), (46, 58)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 6, 4.2)]), ('#b5654a', [ellipse(cx, cy, 4.6, 3)]), ('#d98a6a', [ellipse(cx - 1, cy - 1, 2, 1.2)])]
    layers += piangua_shell(84, 30, 9, 20) + piangua_shell(80, 84, 8, -15)
    return layers


def encocado():
    """Piangua encocada: la cazuela con la salsa blanca de leche de coco, la carne de piangua y el aliño verde."""
    layers = [(OUTLINE, [ellipse(46, 62, 42, 22)]), ('#a1522f', [ellipse(46, 62, 39.5, 19.5)]), ('#e8d9b5', [ellipse(46, 58, 32, 13)])]
    for cx, cy in [(34, 56), (46, 52), (58, 56), (40, 62), (54, 62)]:
        layers += [('#b5654a', [ellipse(cx, cy, 4.4, 3)])]
    layers += [('#43a047', [circle(30, 60, 1.6), circle(50, 58, 1.6), circle(62, 54, 1.4), circle(42, 55, 1.3)])]
    layers += [(OUTLINE, [circle(84, 28, 13)]), ('#6d4c41', [circle(84, 28, 11)]), ('#fff8e1', [circle(84, 28, 8)]), ('#8d6e4a', [circle(84, 28, 3)])]
    return layers


def arroz_piangua():
    """Arroz con piangua: el plato con el arroz amarillo y la piangua, los patacones y la tajada de limón."""
    layers = [(OUTLINE, [ellipse(50, 62, 46, 26)]), ('#ffffff', [ellipse(50, 62, 43.5, 23.5)])]
    layers += [(OUTLINE, [ellipse(38, 58, 24, 14)]), ('#f6d77a', [ellipse(38, 58, 22, 12)])]
    for cx, cy in [(30, 54), (40, 52), (46, 60), (32, 62), (38, 57)]:
        layers.append(('#b5654a', [ellipse(cx, cy, 2.8, 2)]))
    layers += [('#43a047', [circle(28, 58, 1.2), circle(44, 55, 1.2)])]
    layers += patacon_disc(68, 54, 9) + patacon_disc(70, 70, 9)
    layers += [(OUTLINE, [ellipse(30, 78, 9, 5)]), ('#9ccc65', [ellipse(30, 78, 7.5, 3.8)]), ('#dce775', [ellipse(30, 78, 4, 1.8)])]
    return layers


def cazuela():
    """Cazuela de mariscos: la cazuela de barro hirviendo, con la piangua, el pargo y el patacón al lado."""
    layers = [(OUTLINE, ['M 8 46 L 92 46 L 86 80 Q 50 92 14 80 Z']), ('#a1522f', ['M 11 48.5 L 89 48.5 L 83.5 78 Q 50 89 16.5 78 Z'])]
    layers += [(OUTLINE, [rect(2, 50, 10, 8), rect(88, 50, 10, 8)]), ('#a1522f', [rect(3.5, 51.5, 7, 5), rect(89.5, 51.5, 7, 5)])]
    layers += [(OUTLINE, [ellipse(50, 46, 42, 11)]), ('#f0c27a', [ellipse(50, 46, 39.5, 9)])]
    layers += piangua_shell(32, 44, 7, -10, open_=True) + piangua_shell(66, 46, 7, 15, open_=True)
    layers += [(OUTLINE, [ellipse(50, 44, 10, 5)]), ('#ffe0d6', [ellipse(50, 44, 8.5, 3.8)]), ('#e53935', [ellipse(54, 43, 3, 2)])]
    layers += [('#43a047', [circle(40, 48, 1.4), circle(58, 49, 1.4), circle(46, 40, 1.2)])]
    layers.append(('#eceff1a0', ['M 36 30 Q 30 20 38 8 Q 32 20 42 30 Z', 'M 60 30 Q 54 20 62 8 Q 56 20 66 30 Z']))
    return layers


# ---------- Costa Pacífica · El Werregue (v3.42) ----------

def werregue_pattern(cx, cy, w, h, light='#d9a85a', dark='#2b2018', red='#b23a2a'):
    """El tejido del werregue: bandas de fibra clara con grecas negras en zigzag y una franja roja."""
    layers = [(light, [rect(cx - w / 2, cy - h / 2, w, h)])]
    zz = []
    n = 6
    for i in range(n):
        x0 = cx - w / 2 + w * i / n
        zz.append(poly(x0, cy - h * 0.1, x0 + w / n / 2, cy - h * 0.35, x0 + w / n, cy - h * 0.1, x0 + w / n, cy + 0.02 * h, x0 + w / n / 2, cy - h * 0.22, x0, cy + 0.02 * h))
    layers.append((dark, zz))
    layers.append((red, [rect(cx - w / 2, cy + h * 0.18, w, h * 0.12)]))
    layers.append((dark, [rect(cx - w / 2, cy + h * 0.36, w, h * 0.06)]))
    return layers


def werregue_palm():
    """Palmar de werregue: la palma espinosa de la selva, con el cogollo tierno que se corta para la fibra."""
    layers = [('#5d8f3a', [ellipse(50, 94, 26, 5)])]
    layers += [(OUTLINE, [rect(45, 44, 10, 50)]), ('#5d4a36', [rect(47, 46, 6, 47)])]
    layers.append(('#2b2018', [rib(46 + (k % 2) * 8, 50 + k * 5, 42 + (k % 2) * 16, 48 + k * 5, 1) for k in range(8)]))
    fronds = [(50, 44, 6, 40, 7), (50, 44, 94, 40, 7), (50, 42, 14, 14, 7), (50, 42, 86, 14, 7), (50, 40, 36, 4, 6), (50, 40, 64, 4, 6)]
    for x0, y0, x1, y1, w in fronds:
        layers += [(OUTLINE, [leaf(x0, y0, x1, y1, w + 1.5)]), ('#2e7d32' if x1 < 50 else '#43a047', [leaf(x0, y0, x1, y1, w)])]
    layers.append(('#1b5e20', [rib(x0, y0, x1, y1, 1) for x0, y0, x1, y1, w in fronds]))
    layers += [(OUTLINE, [leaf(50, 44, 50, 6, 5.5)]), ('#c5e1a5', [leaf(50, 44, 50, 6, 4)])]
    return layers


def werregue_fiber():
    """Fibra de werregue: el manojo de tiras finas y claras, recién sacadas del cogollo."""
    layers = []
    for k in range(9):
        x0 = 30 + k * 4.5
        layers += [(OUTLINE, ['M %.1f 10 Q %.1f 50 %.1f 92 L %.1f 92 Q %.1f 50 %.1f 10 Z' % (x0, x0 - 8 + k, x0 - 10 + k * 2, x0 - 7 + k * 2, x0 - 5 + k, x0 + 3)])]
        layers += [('#e0cf9a' if k % 2 else '#efe2b8', ['M %.1f 12 Q %.1f 50 %.1f 90 L %.1f 90 Q %.1f 50 %.1f 12 Z' % (x0 + 0.6, x0 - 7.4 + k, x0 - 9.4 + k * 2, x0 - 7.6 + k * 2, x0 - 5.6 + k, x0 + 2.4)])]
    layers += [(OUTLINE, [rect(26, 40, 46, 8)]), ('#8d6e4a', [rect(28, 41.5, 42, 5)])]
    return layers


def dyed_werregue():
    """Fibra teñida: las madejas negras (de jagua) y rojas (de achiote) colgadas a secar, con la jagua y el achiote."""
    layers = [('#8d6e4a', [rect(6, 12, 88, 5)])]
    for cx, col in [(22, '#2b2018'), (40, '#b23a2a'), (58, '#2b2018'), (76, '#e0cf9a')]:
        layers += [(OUTLINE, ['M %d 14 Q %d 50 %d 76 L %d 76 Q %d 50 %d 14 Z' % (cx - 5, cx - 9, cx - 5, cx + 5, cx + 9, cx + 5)]), (col, ['M %d 17 Q %d 50 %.1f 73.5 L %.1f 73.5 Q %d 50 %d 17 Z' % (cx - 3, cx - 6.5, cx - 3.5, cx + 3.5, cx + 6.5, cx + 3)])]
    layers += [(OUTLINE, [circle(20, 88, 8)]), ('#5d6b1f', [circle(20, 88, 6.5)]), (OUTLINE, [circle(80, 88, 8)]), ('#c62828', [circle(80, 88, 6.5)]), ('#ffcdd2', [circle(78, 86, 1.6)])]
    return layers


def werregue_thread():
    """Hebra de werregue: los rollos de hebra torcida, negra, roja y clara, listos para tejer."""
    layers = []
    for cx, cy, col in [(30, 64, '#2b2018'), (66, 64, '#b23a2a'), (48, 36, '#e0cf9a')]:
        layers += [(OUTLINE, [ellipse(cx, cy, 20, 16)]), (col, [ellipse(cx, cy, 17.5, 13.5)])]
        layers.append((shade_hex(col, 1.4) if col != '#2b2018' else '#5d4a36', [rib(cx - 14, cy - 6 + k * 4, cx + 14, cy - 8 + k * 4, 1) for k in range(4)]))
    layers += [(OUTLINE, [rib(80, 70, 94, 92, 4)]), ('#b23a2a', [rib(80, 70, 94, 92, 2)])]
    return layers


def werregue_jar():
    """Jarrón de werregue: el jarrón tejido, de boca angosta, con sus grecas negras y rojas."""
    body = 'M 38 10 L 62 10 L 60 22 Q 90 34 88 62 Q 86 92 50 94 Q 14 92 12 62 Q 10 34 40 22 Z'
    layers = [(OUTLINE, [body]), ('#d9a85a', ['M 40.5 12.5 L 59.5 12.5 L 57.8 23.8 Q 87.5 35 85.5 62 Q 83.6 89.5 50 91.5 Q 16.4 89.5 14.5 62 Q 12.5 35 42.2 23.8 Z'])]
    layers += werregue_pattern(50, 46, 66, 14)
    layers += werregue_pattern(50, 70, 70, 14, red='#2b2018', dark='#b23a2a')
    layers.append(('#2b2018', [rect(40.5, 12.5, 19, 3)]))
    layers.append(('#b8874a', [rib(18 + k * 0, 34 + k * 8, 82, 34 + k * 8, 0.6) for k in range(1)]))
    return layers


def recuerdo_pacifico():
    """Recuerdo del Pacífico: el jarrón de werregue con el pescado seco y el pargo ahumado, envueltos para el viaje."""
    layers = []
    body = 'M 30 18 L 48 18 L 47 26 Q 66 34 66 56 Q 64 82 39 84 Q 14 82 12 56 Q 12 34 31 26 Z'
    layers += [(OUTLINE, [body]), ('#d9a85a', ['M 32.5 20.5 L 45.5 20.5 L 44.6 27.8 Q 63.5 35.5 63.5 56 Q 61.7 79.5 39 81.5 Q 16.3 79.5 14.5 56 Q 14.5 35.5 33.4 27.8 Z'])]
    layers += werregue_pattern(39, 48, 46, 12)
    layers += werregue_pattern(39, 66, 48, 10, red='#2b2018', dark='#b23a2a')
    layers += [(OUTLINE, [leaf(58, 92, 96, 70, 12)]), ('#2e7d32', [leaf(58, 92, 96, 70, 10)])]
    layers += fish_shape(80, 66, 30, 12, '#a0522d', '#d9893a', -30, eye=False)
    layers += [(OUTLINE, ['M 76 20 Q 66 34 72 52 L 84 52 Q 90 34 80 20 Z']), ('#d7c49e', ['M 76.5 23 Q 68.5 35 73.8 49.5 L 82.2 49.5 Q 87.5 35 79.5 23 Z']), ('#ffffff', [circle(76, 34, 1), circle(80, 42, 1)])]
    return layers


# ---------- Costa Pacífica · Buenaventura (v3.43) ----------

def marranitas():
    """Marranitas: las bolitas de plátano verde rellenas de chicharrón, doradas, en la canasta con la servilleta."""
    layers = [(OUTLINE, ['M 8 56 L 92 56 L 82 90 L 18 90 Z']), ('#c8a26a', ['M 11.5 58.5 L 88.5 58.5 L 80.2 87.5 L 19.8 87.5 Z'])]
    layers.append(('#a8804a', [rib(14 + k * 0, 66 + k * 8, 86, 66 + k * 8, 1.2) for k in range(3)]))
    layers += [('#f7f4ee', [poly(12, 58, 40, 50, 60, 58)])]
    for cx, cy, r in [(30, 48, 14), (54, 44, 15), (74, 52, 12), (42, 30, 12)]:
        layers += [(OUTLINE, [circle(cx, cy, r + 2)]), ('#d9a032', [circle(cx, cy, r)]), ('#f0c060', [circle(cx - r * 0.3, cy - r * 0.35, r * 0.35)])]
        layers.append(('#8d5524', [circle(cx + r * 0.2, cy + r * 0.2, 1.4), circle(cx - r * 0.4, cy + r * 0.3, 1.2), circle(cx + r * 0.45, cy - r * 0.2, 1.1)]))
    return layers


def ceviche():
    """Ceviche del malecón: la copa con el camarón, la cebolla, el tomate y el cilantro, y las galletas de soda."""
    layers = [(OUTLINE, ['M 14 30 L 86 30 Q 84 62 50 66 Q 16 62 14 30 Z']), ('#e8f6ff', ['M 17 32.5 L 83 32.5 Q 81 59.5 50 63.5 Q 19 59.5 17 32.5 Z'])]
    layers += [(OUTLINE, [rect(46, 64, 8, 18), ellipse(50, 86, 20, 6)]), ('#e8f6ff', [rect(47.5, 64, 5, 18), ellipse(50, 86, 18, 4.5)])]
    layers.append(('#ffab91', [ellipse(50, 34, 33, 6)]))
    for cx, cy, rot in [(32, 30, -20), (50, 26, 10), (68, 30, 25)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 9, 5.5, rot)]), ('#ff8a65', [ellipse(cx, cy, 7.5, 4, rot)]), ('#ffccbc', [rib(cx - 5, cy, cx + 5, cy, 1)])]
    layers += [('#e53935', [circle(40, 34, 2.4), circle(60, 36, 2.2)]), ('#f3e5f5', [circle(46, 36, 2), circle(56, 32, 1.8)]), ('#43a047', [circle(36, 28, 1.4), circle(64, 26, 1.4), circle(52, 34, 1.2)])]
    for cx, cy in [(10, 72), (88, 74)]:
        layers += [(OUTLINE, [rect(cx - 9, cy - 7, 18, 14)]), ('#f0d9a0', [rect(cx - 7.5, cy - 5.5, 15, 11)]), ('#c8a26a', [circle(cx - 3, cy - 2, 0.9), circle(cx + 3, cy + 2, 0.9), circle(cx + 3, cy - 2, 0.9)])]
    return layers


def noche_buenaventura():
    """Noche en Buenaventura: el hotel frente a la bahía, con la luna sobre el mar y las luces del muelle."""
    layers = [('#1a2a4a', [rect(4, 4, 92, 92)]), ('#fff8e1', [circle(76, 22, 9)]), ('#1a2a4a', [circle(80, 19, 7)])]
    layers.append(('#ffffff', [circle(20, 14, 1), circle(42, 22, 1), circle(58, 10, 1)]))
    layers.append(('#1e4a7a', [rect(4, 64, 92, 32)]))
    layers.append(('#fff8e180', [rect(70, 66, 4, 2), rect(66, 72, 10, 2), rect(72, 80, 6, 2)]))
    layers += [(OUTLINE, [rect(12, 30, 40, 36)]), ('#f28c9a', [rect(14, 32, 36, 32)]), ('#9aa3a8', [poly(10, 32, 32, 20, 54, 32)])]
    for wx, wy in [(18, 38), (28, 38), (38, 38), (18, 50), (38, 50)]:
        layers.append(('#ffe082', [rect(wx, wy, 6, 7)]))
    layers += [('#6d4c41', [rect(28, 50, 6, 14)])]
    layers += [(OUTLINE, [rect(54, 60, 36, 4)]), ('#8d6e4a', [rect(55, 61, 34, 2)]), ('#ffe082', [circle(60, 56, 2), circle(84, 56, 2)])]
    return layers


def almuerzo_galeria():
    """Almuerzo de la galería: el tapao en el plato hondo, con arroz, patacones y el jugo de borojó."""
    layers = [(OUTLINE, [ellipse(44, 64, 40, 22)]), ('#ffffff', [ellipse(44, 64, 37.5, 19.5)])]
    layers += [(OUTLINE, [ellipse(32, 60, 18, 10)]), ('#c98a24', [ellipse(32, 60, 16, 8)])]
    layers += fish_shape(32, 58, 22, 9, '#e57373', '#ffccbc', -4)
    layers += [(OUTLINE, [ellipse(54, 66, 12, 6)]), ('#fafafa', [ellipse(54, 66, 10.5, 4.6)])]
    layers += patacon_disc(62, 54, 7) + patacon_disc(68, 68, 6)
    layers += [(OUTLINE, ['M 76 18 L 94 18 L 91 50 L 79 50 Z']), ('#6d4c2a', ['M 78.3 21 L 91.7 21 L 89.2 47.5 L 80.8 47.5 Z']), ('#e8f6ff80', [rect(80, 22, 3, 22)])]
    return layers


def lonchera_lancha():
    """Lonchera de la lancha: el portacomidas con el arroz con piangua y la cazuela, y el chaleco salvavidas naranja."""
    layers = [(OUTLINE, [rect(18, 34, 40, 54)]), ('#e0e0e0', [rect(20.5, 36.5, 35, 49)])]
    layers.append(('#bdbdbd', [rect(20.5, 52, 35, 2.5), rect(20.5, 69, 35, 2.5)]))
    layers += [(OUTLINE, [rect(30, 22, 16, 14)]), ('#9e9e9e', [rect(32.5, 24.5, 11, 9)])]
    layers += [(OUTLINE, ['M 56 30 L 86 30 L 92 50 L 90 90 L 52 90 L 50 50 Z']), ('#ff6f00', ['M 58 32.5 L 84 32.5 L 89.4 50.5 L 87.6 87.5 L 54.4 87.5 L 52.6 50.5 Z'])]
    layers += [('#4e342e', [rect(69, 32.5, 4, 55)]), ('#e0e0e0', [rect(54, 60, 34, 4), rect(54, 74, 34, 4)])]
    return layers


def ballenas():
    """Salida a ver las ballenas: la ballena jorobada que salta del mar, con la cría y la lancha de los turistas."""
    layers = [('#1e88e5', [rect(4, 70, 92, 26)]), ('#90caf9', [rect(4, 70, 92, 3)])]
    body = 'M 18 66 Q 20 36 46 24 Q 66 16 78 26 Q 70 30 72 36 Q 60 30 50 40 Q 36 54 34 70 Z'
    layers += [(OUTLINE, [body]), ('#37474f', ['M 21 64 Q 23 38 47 27 Q 64 20 73 25.5 Q 67.5 29 68.5 32.5 Q 58.5 28 48 38.5 Q 34.5 52.5 31.5 66 Z'])]
    layers += [('#cfd8dc', ['M 28 62 Q 32 44 46 34 Q 40 46 36 62 Z']), ('#263238', [circle(62, 26, 1.6)])]
    layers += [(OUTLINE, ['M 36 46 Q 22 50 14 58 Q 26 58 38 52 Z']), ('#546e7a', ['M 35.5 47.5 Q 24 51 17 56.5 Q 27 56.5 36.5 51 Z'])]
    layers += [('#ffffff', ['M 12 70 Q 18 62 24 70 Z', 'M 30 70 Q 36 64 42 70 Z']), ('#e3f2fd', [circle(16, 64, 2), circle(40, 62, 1.6), circle(26, 58, 1.4)])]
    layers += [(OUTLINE, ['M 66 76 L 94 76 L 90 84 L 70 84 Z']), ('#f7f4ee', ['M 68.5 77.5 L 91.5 77.5 L 88.5 82.5 L 71.5 82.5 Z']), ('#ff6f00', [circle(76, 73, 2.4), circle(84, 73, 2.4)])]
    return layers


# ---------- Amazonas · El Asaizal (v3.47) ----------

def asai_berries(cx, cy, r, n, spread, rng_seed=1, color='#311b4e'):
    """Un puñado de bolitas de asaí, moradas casi negras, con su brillo."""
    import random
    rnd = random.Random(rng_seed)
    layers = []
    pts_ = []
    for i in range(n):
        a = rnd.random() * math.pi * 2
        d = math.sqrt(rnd.random()) * spread
        pts_.append((cx + math.cos(a) * d, cy + math.sin(a) * d * 0.8))
    pts_.sort(key=lambda q: q[1])
    for x, y in pts_:
        layers += [(OUTLINE, [circle(x, y, r + 1.4)]), (color, [circle(x, y, r)]), ('#7e57c2', [circle(x - r * 0.35, y - r * 0.35, r * 0.3)])]
    return layers


def asai_palm():
    """Asaizal: la palma de asaí, delgada y alta, con las hojas de plumas y los racimos morados."""
    layers = [('#5d8f3a', [ellipse(46, 95, 22, 4)])]
    layers += [(OUTLINE, ['M 43 95 Q 46 60 50 30 L 54 30 Q 50 60 48 95 Z']), ('#8d8a6a', ['M 44.6 93 Q 47.4 60 51 32 L 52.6 32 Q 49 60 46.6 93 Z'])]
    fronds = [(51, 30, 8, 38, 6), (51, 30, 94, 34, 6), (51, 28, 20, 10, 6), (51, 28, 82, 8, 6), (51, 27, 50, 2, 5)]
    for x0, y0, x1, y1, w in fronds:
        layers += [(OUTLINE, [leaf(x0, y0, x1, y1, w + 1.5)]), ('#2e7d32' if x1 < 51 else '#43a047', [leaf(x0, y0, x1, y1, w)])]
        for k in range(1, 6):
            f = k / 6
            bx, by = x0 + (x1 - x0) * f, y0 + (y1 - y0) * f
            layers.append(('#1b5e20', [rib(bx, by, bx + (1 if x1 > x0 else -1) * 3, by + 6, 0.9)]))
    layers += [(OUTLINE, [rib(52, 34, 62, 46, 2.4)]), ('#6d4c41', [rib(52, 34, 62, 46, 1.2)])]
    layers += asai_berries(64, 54, 2.6, 16, 9, 3)
    return layers


def asai_bunch():
    """Racimo de asaí: el racimo de ramitas cargado de bolitas moradas."""
    layers = [(OUTLINE, [rib(50, 4, 50, 36, 6)]), ('#8d6e4a', [rib(50, 4, 50, 36, 3.5)])]
    for k in range(9):
        a = math.radians(-160 + k * 17.5)
        x1, y1 = 50 + math.cos(a) * 44, 36 - math.sin(a) * 50
        layers.append(('#8d6e4a', [rib(50, 36, x1, max(y1, 40), 1.6)]))
    layers += asai_berries(50, 66, 3.6, 46, 30, 7)
    return layers


def asai_fruit():
    """Frutos de asaí: las bolitas moradas sueltas, ya desgranadas, en la batea."""
    layers = [(OUTLINE, [ellipse(50, 70, 46, 18)]), ('#8d6e4a', [ellipse(50, 70, 43.5, 15.5)]), ('#6d4c41', [ellipse(50, 66, 36, 9)])]
    layers += asai_berries(50, 54, 4.5, 30, 24, 11)
    return layers


def soaked_asai():
    """Asaí remojado: los frutos en la ponchera con agua tibia, que ya se tiñe de morado."""
    layers = [(OUTLINE, ['M 6 50 L 94 50 Q 90 92 50 92 Q 10 92 6 50 Z']), ('#4fa3c7', ['M 9.5 52.5 L 90.5 52.5 Q 87 89.5 50 89.5 Q 13 89.5 9.5 52.5 Z'])]
    layers += [(OUTLINE, [ellipse(50, 51, 43, 8)]), ('#7e57c2', [ellipse(50, 51, 40.5, 6)])]
    layers += asai_berries(50, 46, 4, 20, 26, 5)
    layers.append(('#eceff1a0', ['M 30 30 Q 24 20 32 8 Q 26 20 36 30 Z', 'M 66 28 Q 60 18 68 6 Q 62 18 72 28 Z']))
    return layers


def asai_pulp():
    """Pulpa de asaí: la olleta llena de la pulpa morada y espesa, con el cucharón."""
    layers = [(OUTLINE, ['M 14 40 L 86 40 L 80 88 Q 50 96 20 88 Z']), ('#b0bec5', ['M 17 42.5 L 83 42.5 L 77.6 85.6 Q 50 93 22.4 85.6 Z'])]
    layers += [(OUTLINE, [ellipse(50, 40, 37, 9)]), ('#4a148c', [ellipse(50, 40, 34.5, 7)]), ('#7b1fa2', [ellipse(42, 38, 12, 2.5)])]
    layers += [(OUTLINE, [rect(60, 6, 8, 40, 20)]), ('#8d6e4a', [rect(62, 8, 4, 36, 20)])]
    return layers


def asai_shake():
    """Asaí batido: el vaso de asaí morado, espeso, con la fariña por encima y el pitillo."""
    layers = [(OUTLINE, ['M 24 22 L 76 22 L 68 92 L 32 92 Z']), ('#e8f6ff', ['M 27 24.5 L 73 24.5 L 65.6 89.5 L 34.4 89.5 Z'])]
    layers.append(('#6a1b9a', ['M 28 34 L 72 34 L 65.6 89.5 L 34.4 89.5 Z']))
    layers.append(('#9c4dcc', [rect(32, 40, 5, 44, 4)]))
    layers += [(OUTLINE, [ellipse(50, 30, 24, 6)]), ('#e8d9a0', [ellipse(50, 30, 22, 4.5)]), ('#c8a26a', [circle(44, 29, 1.2), circle(56, 31, 1.2), circle(50, 28, 1)])]
    layers += [(OUTLINE, [rect(58, 4, 6, 34, 14)]), ('#d7263d', [rect(59.5, 5.5, 3, 31, 14)])]
    return layers


def asai_bag():
    """Bolsa de asaí: la bolsa de pulpa congelada, morada, con la escarcha y la etiqueta de la palma."""
    layers = [(OUTLINE, ['M 22 12 L 78 12 L 80 88 L 20 88 Z']), ('#7b1fa2', ['M 24.5 14.5 L 75.5 14.5 L 77.4 85.5 L 22.6 85.5 Z'])]
    layers.append(('#e1bee7', [rect(24.5, 14.5, 51, 6)]))
    layers += [(OUTLINE, [rect(30, 40, 40, 30)]), ('#ffffff', [rect(32, 42, 36, 26)])]
    layers += [('#2e7d32', [leaf(50, 64, 38, 48, 3), leaf(50, 64, 62, 48, 3), leaf(50, 64, 50, 46, 3)]), ('#4a148c', [circle(50, 60, 3)])]
    layers.append(('#ffffffc0', [circle(30, 30, 1.4), circle(66, 26, 1.2), circle(70, 78, 1.4), circle(28, 78, 1.2), circle(60, 34, 1)]))
    return layers


def asai_box():
    """Caja de asaí: la caja de icopor con las bolsas moradas asomadas y el hielo."""
    layers = [(OUTLINE, [poly(8, 40, 50, 26, 92, 40, 92, 82, 50, 96, 8, 82)])]
    layers.append(('#eceff1', [poly(11, 42, 50, 55, 50, 92.5, 11, 80)]))
    layers.append(('#cfd8dc', [poly(50, 55, 89, 42, 89, 80, 50, 92.5)]))
    for cx in (30, 50, 70):
        top = 14 + abs(cx - 50) * 0.3
        layers += [(OUTLINE, [rect(cx - 9, top, 18, 32)]), ('#7b1fa2', [rect(cx - 7.5, top + 1.5, 15, 29)]), ('#e1bee7', [rect(cx - 7.5, top + 1.5, 15, 4)])]
    layers.append(('#f5f5f5', [poly(11, 42, 50, 29, 89, 42, 50, 55)]))
    layers += [('#2e7d32', [leaf(66, 76, 58, 66, 2.5), leaf(66, 76, 74, 66, 2.5)]), ('#4a148c', [circle(66, 74, 2.4)])]
    return layers


# ---------- Amazonas · El Ajizal (v3.48) ----------

def chili(x0, y0, x1, y1, bend, w, color):
    """Un ají: alargado y curvo, con su pedúnculo verde."""
    layers = finger(x0, y0, x1, y1, bend, w, color, tip=False)
    layers += [(OUTLINE, [rib(x0, y0, x0 - (x1 - x0) * 0.12, y0 - (y1 - y0) * 0.12, 4)]), ('#2e7d32', [rib(x0, y0, x0 - (x1 - x0) * 0.12, y0 - (y1 - y0) * 0.12, 2.2)])]
    layers.append(('#ffffff70', [rib(x0 + (x1 - x0) * 0.2, y0 + (y1 - y0) * 0.2 - w * 0.2, x0 + (x1 - x0) * 0.6, y0 + (y1 - y0) * 0.6 - w * 0.2, 1.2)]))
    return layers


def aji_plant():
    """Ajizal: la mata de ají con sus hojas y los ajíes rojos, amarillos y morados colgando."""
    layers = [('#5d8f3a', [ellipse(50, 94, 26, 5)]), (OUTLINE, [rib(50, 94, 50, 50, 5)]), ('#558b2f', [rib(50, 94, 50, 50, 3)])]
    for x1, y1 in [(22, 40), (78, 40), (30, 22), (70, 22), (50, 12), (20, 62), (80, 62)]:
        layers += [(OUTLINE, [rib(50, 60, x1, y1, 3.6)]), ('#558b2f', [rib(50, 60, x1, y1, 2)])]
        layers += [(OUTLINE, [leaf(x1, y1, x1 + (x1 - 50) * 0.25, y1 - 10, 6)]), ('#43a047', [leaf(x1, y1, x1 + (x1 - 50) * 0.25, y1 - 10, 4.6)])]
    for x0, y0, col in [(26, 44, '#e53935'), (40, 30, '#fbc02d'), (62, 30, '#e53935'), (74, 44, '#8e24aa'), (34, 64, '#fbc02d'), (66, 64, '#e53935')]:
        layers += chili(x0, y0, x0 + 2, y0 + 18, 2, 6, col)
    return layers


def aji_peppers():
    """Ají amazónico: los ajíes rojos, amarillos y morados, recién cogidos."""
    layers = []
    for x0, y0, x1, y1, col in [(20, 30, 40, 84, '#e53935'), (40, 20, 54, 80, '#fbc02d'), (62, 24, 66, 86, '#e53935'), (80, 34, 78, 82, '#8e24aa')]:
        layers += chili(x0, y0, x1, y1, 4, 13, col)
    return layers


def ground_aji():
    """Ají molido: el molino de mano con la pasta roja que sale y los ajíes al lado."""
    layers = [(OUTLINE, [ellipse(50, 80, 40, 12)]), ('#cfd8dc', [ellipse(50, 80, 37.5, 9.5)]), ('#c62828', [ellipse(50, 78, 30, 6)])]
    layers.append(('#ff8a80', [circle(40, 77, 1.4), circle(58, 79, 1.2), circle(50, 76, 1)]))
    layers += [(OUTLINE, [rect(34, 22, 32, 40)]), ('#90a4ae', [rect(36.5, 24.5, 27, 35)]), (OUTLINE, [rect(26, 14, 48, 10)]), ('#b0bec5', [rect(28, 16, 44, 6)])]
    layers += [(OUTLINE, [rect(66, 34, 24, 6)]), ('#607d8b', [rect(68, 35.5, 20, 3)]), (OUTLINE, [rect(86, 30, 6, 16)]), ('#8d6e4a', [rect(87.5, 31.5, 3, 13)])]
    layers += [(OUTLINE, ['M 44 62 L 56 62 L 54 72 L 46 72 Z']), ('#c62828', ['M 46 63.5 L 54 63.5 L 52.6 70.5 L 47.4 70.5 Z'])]
    layers += chili(8, 50, 14, 74, 2, 6, '#e53935')
    return layers


def aji_negro():
    """Ají negro: el frasco con el ají negro del tucupí, espeso y brillante, con un ají rojo encima."""
    layers = [(OUTLINE, [rect(26, 26, 48, 66)]), ('#e8f6ff', [rect(28.5, 28.5, 43, 61)])]
    layers.append(('#3e2723', [rect(28.5, 38, 43, 51.5)]))
    layers.append(('#5d4037', [ellipse(42, 50, 6, 2), ellipse(58, 66, 7, 2), ellipse(46, 78, 5, 1.6)]))
    layers.append(('#ffffff50', [rect(32, 40, 4, 44)]))
    layers += [(OUTLINE, [rect(24, 16, 52, 12)]), ('#8d6e4a', [rect(26.5, 18.5, 47, 7)])]
    layers += chili(60, 6, 90, 16, -2, 7, '#e53935')
    return layers


def aji_box():
    """Caja de ají negro: la caja de cartón con los frascos de tapa de madera asomados."""
    layers = [(OUTLINE, [poly(8, 40, 50, 26, 92, 40, 92, 82, 50, 96, 8, 82)])]
    layers.append(('#c8a26a', [poly(11, 42, 50, 55, 50, 92.5, 11, 80)]))
    layers.append(('#b08850', [poly(50, 55, 89, 42, 89, 80, 50, 92.5)]))
    for cx in (30, 50, 70):
        top = 18 + abs(cx - 50) * 0.3
        layers += [(OUTLINE, [rect(cx - 9, top, 18, 30)]), ('#3e2723', [rect(cx - 7.5, top + 5, 15, 23.5)]), ('#8d6e4a', [rect(cx - 7.5, top + 1.5, 15, 4)])]
    layers.append(('#d9b98a', [poly(11, 42, 50, 29, 89, 42, 50, 55)]))
    layers += chili(58, 70, 80, 64, -2, 6, '#e53935')
    return layers


# ---------- Amazonas · El Lago (v3.49) ----------

def pirarucu_body(cx, cy, length, height, rot=0, eye=True):
    """El pirarucú: el pez gigante del Amazonas, largo y oscuro, con la cola roja y las escamas marcadas."""
    layers = fish_shape(cx, cy, length, height, '#4e5b4a', '#c9b48a', rot, eye)
    a = math.radians(rot)
    L = length / 2
    # La mitad de atrás se pone roja, como la del pirarucú de verdad.
    tx, ty = cx + math.cos(a) * L * 0.55, cy + math.sin(a) * L * 0.55
    layers.append(('#c62828', [ellipse(tx, ty, L * 0.3, height * 0.36, rot)]))
    for k in range(5):
        x = cx - L * 0.3 + k * L * 0.2
        layers.append(('#3a4537', [ellipse(x, cy - height * 0.12 + (x - cx) * math.tan(a), 2.6, 1.6, rot)]))
    return layers


def pirarucu():
    """Pirarucú: el pez gigante del lago, recién sacado de la canoa, con el agua que todavía le escurre."""
    layers = [('#4f8f96', [ellipse(50, 86, 44, 8)]), ('#7fbcc0', [ellipse(32, 85, 10, 1.6), ellipse(70, 88, 8, 1.4)])]
    layers += pirarucu_body(46, 54, 82, 30, -4)
    layers.append(('#ffffff50', [ellipse(36, 46, 14, 2.6, -6)]))
    layers.append(('#4fc3f7', [circle(88, 24, 3), circle(93, 34, 2.2), circle(82, 34, 1.8)]))
    return layers


def clean_pirarucu():
    """Pirarucú limpio: el pirarucú sin vísceras, abierto sobre la hoja de bijao, con su carne blanca."""
    layers = [('#2e7d32', [leaf(4, 80, 96, 64, 18)]), ('#66bb6a', [rib(8, 79, 92, 65, 1.2)])]
    layers += pirarucu_body(48, 54, 76, 28, -6)
    layers += [(OUTLINE, [ellipse(46, 58, 22, 5.5, -6)]), ('#fff3e6', [ellipse(46, 58, 20, 4, -6)])]
    layers.append(('#ffffffb0', [ellipse(38, 46, 11, 2, -6)]))
    return layers


def pirarucu_fillet():
    """Postas de pirarucú: las tajadas gruesas de carne blanca, con la piel oscura, en la tabla y con el machete."""
    layers = [(OUTLINE, [rect(6, 56, 88, 30, -6)]), ('#c68a4a', [rect(9, 59, 82, 24, -6)])]
    for cx, cy, rot in [(26, 58, -8), (50, 62, 4), (74, 58, 10)]:
        layers.append((OUTLINE, [rect(cx - 11, cy - 12, 22, 22, rot)]))
        layers.append(('#4e5b4a', [rect(cx - 9.5, cy - 10.5, 19, 19, rot)]))
        layers.append(('#fff3ee', [rect(cx - 8, cy - 9, 16, 15, rot)]))
        layers.append(('#ffd9c4', [rib(cx - 6, cy - 4, cx + 6, cy - 4, 1), rib(cx - 6, cy + 1, cx + 6, cy + 1, 1)]))
    layers += [(OUTLINE, [rect(54, 12, 40, 9, 22)]), ('#cfd8dc', [rect(56, 14, 28, 5.5, 22)]), ('#5d4037', [rect(82, 26, 12, 6, 22)])]
    return layers


def moqueado():
    """Pescado moqueado: las postas de pirarucú doradas sobre la parrilla de palos del moquén, con el humo que sube."""
    layers = [(OUTLINE, [rect(6, 64, 88, 8)]), ('#6d4c2e', [rect(8, 65.5, 84, 5)])]
    layers.append(('#4e342e', [rib(14, 72, 10, 94, 3), rib(86, 72, 90, 94, 3), rib(50, 72, 50, 94, 3)]))
    for cx, cy, rot in [(28, 54, -6), (52, 56, 4), (76, 54, -2)]:
        layers.append((OUTLINE, [rect(cx - 10, cy - 10, 20, 18, rot)]))
        layers.append(('#8d4a1f', [rect(cx - 8.5, cy - 8.5, 17, 15, rot)]))
        layers.append(('#c97a32', [rect(cx - 6.5, cy - 6.5, 13, 9, rot)]))
        layers.append(('#5d2e12', [rib(cx - 7, cy + 3, cx + 7, cy + 3, 1.2)]))
    layers.append(('#b0bec5a0', ['M 22 40 Q 16 28 24 16 Q 18 28 28 40 Z', 'M 52 38 Q 46 24 54 10 Q 48 24 58 38 Z', 'M 78 40 Q 72 28 80 16 Q 74 28 84 40 Z']))
    layers += [('#ff7043', [ellipse(50, 90, 26, 4)]), ('#ffcc80', [ellipse(50, 90, 14, 2)])]
    return layers


def salted_pirarucu():
    """Pirarucú salado: la manta de pirarucú abierta, salada y seca, doblada y amarrada con bejuco."""
    layers = [(OUTLINE, [poly(10, 34, 90, 26, 94, 78, 14, 86)])]
    layers.append(('#d7c49e', [poly(13, 37, 87, 29.5, 91, 75.5, 16.5, 83)]))
    layers.append(('#b89a6a', [rib(16, 50, 89, 43, 1.2), rib(17, 66, 90, 59, 1.2)]))
    layers.append(('#a1887f', [rib(14, 36, 18, 84, 2.4)]))
    layers += [(OUTLINE, [rect(44, 22, 7, 68, -3)]), ('#8d6e4a', [rect(45.5, 23.5, 4, 65, -3)])]
    layers.append(('#ffffff', [circle(26, 44, 1.3), circle(66, 40, 1.3), circle(34, 72, 1.1), circle(74, 68, 1.2), circle(58, 56, 1), circle(80, 50, 1)]))
    return layers


def pirarucu_aji():
    """Pirarucú al ají negro: el plato con la posta dorada, el ají negro por encima, el casabe y el limón."""
    layers = [(OUTLINE, [ellipse(50, 64, 46, 22)]), ('#f5f0e6', [ellipse(50, 64, 43.5, 19.5)]), ('#e6ddcc', [ellipse(50, 64, 34, 14)])]
    layers += [(OUTLINE, [rect(28, 50, 34, 20, -4)]), ('#c97a32', [rect(30, 52, 30, 16, -4)]), ('#e8a55a', [rect(32, 54, 24, 6, -4)])]
    layers.append(('#3e2723', ['M 32 56 Q 44 50 58 54 Q 50 60 36 60 Z']))
    layers.append(('#5d4037', [circle(40, 55, 1.4), circle(50, 55, 1.2)]))
    layers += [(OUTLINE, [circle(76, 60, 11)]), ('#f3e3b8', [circle(76, 60, 9.5)]), ('#e0c98a', [circle(73, 57, 2), circle(80, 63, 1.6), circle(78, 55, 1.2)])]
    layers += [(OUTLINE, [circle(24, 72, 7)]), ('#9ccc65', [circle(24, 72, 5.5)]), ('#dce775', [circle(24, 72, 3)])]
    layers += chili(60, 14, 88, 26, -2, 6, '#e53935')
    return layers


# ---------- Amazonas · La Casabería (v3.50) ----------

def yuca_root(x0, y0, x1, y1, w, skin='#8d5a32', flesh=None):
    """Una raíz de yuca: alargada y ahusada, con la cáscara café (o pelada, blanca) y sus anillos."""
    layers = [(OUTLINE, [leaf(x0, y0, x1, y1, w + 2.4)]), (skin, [leaf(x0, y0, x1, y1, w)])]
    if flesh:
        layers.append((flesh, [leaf(x0 + (x1 - x0) * 0.04, y0 + (y1 - y0) * 0.04, x1 - (x1 - x0) * 0.04, y1 - (y1 - y0) * 0.04, w * 0.78)]))
    ring = shade_hex(skin, 0.75) if not flesh else '#e0d6bf'
    for f in (0.3, 0.5, 0.7):
        cx, cy = x0 + (x1 - x0) * f, y0 + (y1 - y0) * f
        dx, dy = (y1 - y0), -(x1 - x0)
        n = math.hypot(dx, dy) or 1
        k = w * 0.42 * (1 - abs(f - 0.5) * 1.2)
        layers.append((ring, [rib(cx - dx / n * k, cy - dy / n * k, cx + dx / n * k, cy + dy / n * k, 1)]))
    return layers


def yuca_plant():
    """Mata de yuca: el tallo de nudos con las hojas palmeadas de siete dedos, y las raíces que asoman en la tierra."""
    layers = [('#7a5236', [ellipse(50, 84, 40, 10)])]
    layers += yuca_root(30, 80, 12, 92, 7) + yuca_root(64, 82, 88, 92, 7)
    layers += [(OUTLINE, [rib(50, 84, 48, 30, 5.4)]), ('#a1887f', [rib(50, 84, 48, 30, 3.2)])]
    layers.append(('#6d4c41', [rib(46.5, 70, 51, 70, 1), rib(46.5, 56, 50.5, 56, 1), rib(46.5, 42, 50, 42, 1)]))
    for cx, cy, sc in [(30, 34, 1), (68, 30, 1), (48, 18, 0.9)]:
        for a in range(-90, 91, 30):
            r = math.radians(a - 90)
            L = 18 * sc * (1 - abs(a) / 300)
            layers += [(OUTLINE, [leaf(cx, cy, cx + math.cos(r) * L, cy + math.sin(r) * L, 6 * sc)])]
        for a in range(-90, 91, 30):
            r = math.radians(a - 90)
            L = 18 * sc * (1 - abs(a) / 300)
            layers += [('#43a047', [leaf(cx, cy, cx + math.cos(r) * L, cy + math.sin(r) * L, 4.4 * sc)])]
        layers.append(('#2e7d32', [circle(cx, cy, 2)]))
    return layers


def yuca_brava():
    """Yuca brava: las raíces largas recién arrancadas de la chagra, con su cáscara café y la tierra."""
    layers = yuca_root(10, 70, 88, 46, 15) + yuca_root(14, 52, 82, 24, 13) + yuca_root(20, 88, 92, 76, 12)
    layers.append(('#5d4037', [circle(24, 60, 1.6), circle(70, 40, 1.4), circle(56, 84, 1.4), circle(40, 30, 1.2)]))
    return layers


def peeled_yuca():
    """Yuca pelada: las raíces blancas, sin cáscara, en la batea con agua, y las cáscaras al lado."""
    layers = [(OUTLINE, [ellipse(50, 70, 46, 20)]), ('#8d6e4a', [ellipse(50, 70, 43.5, 17.5)]), ('#5a9aa0', [ellipse(50, 66, 38, 12)])]
    layers += yuca_root(18, 66, 78, 54, 11, '#8d5a32', '#f8f3e6') + yuca_root(26, 76, 84, 66, 10, '#8d5a32', '#f5efe0')
    layers += yuca_root(52, 30, 86, 20, 8)
    layers.append(('#e8f6ff', [rib(24, 60, 34, 60, 1), rib(60, 74, 72, 74, 1)]))
    return layers


def yuca_mass():
    """Masa de yuca: la yuca rallada, blanca y húmeda, en la ponchera, con el rallador de lata encima."""
    layers = [(OUTLINE, ['M 8 50 L 92 50 L 80 88 Q 50 96 20 88 Z']), ('#c8a26a', ['M 11 52.5 L 89 52.5 L 77.8 85.6 Q 50 93 22.2 85.6 Z'])]
    layers += [(OUTLINE, [ellipse(50, 50, 43, 11)]), ('#f3ecd8', [ellipse(50, 50, 40.5, 9)])]
    layers.append(('#e0d6bf', [circle(32, 48, 2), circle(44, 52, 1.6), circle(58, 47, 1.8), circle(70, 52, 1.6), circle(50, 49, 1.2)]))
    layers += [(OUTLINE, [rect(50, 8, 26, 40, 20)]), ('#b0bec5', [rect(52, 10, 22, 36, 20)])]
    layers.append(('#607d8b', [circle(56 + i * 5 + j * 2, 18 + j * 6 + i * 1.8, 1) for i in range(3) for j in range(4)]))
    return layers


def tipiti():
    """Tipití: el tubo tejido de palma colgado y estirado con el palo, que exprime la masa; el jugo cae a la totuma."""
    layers = [('#6d4c41', [rib(50, 2, 50, 12, 2)])]
    layers += [(OUTLINE, ['M 38 12 L 62 12 L 58 74 L 42 74 Z']), ('#d9b26a', ['M 40.5 14.5 L 59.5 14.5 L 55.6 71.5 L 44.4 71.5 Z'])]
    for k in range(9):
        y = 18 + k * 6
        layers.append(('#a07a3e', [rib(41 + k * 0.4, y, 59 - k * 0.4, y + 4, 1), rib(41 + k * 0.4, y + 4, 59 - k * 0.4, y, 1)]))
    layers += [(OUTLINE, [rib(50, 74, 50, 80, 3)]), (OUTLINE, [rib(20, 80, 84, 80, 5)]), ('#8d5a32', [rib(22, 80, 82, 80, 3)])]
    layers.append(('#f9e79f', [rib(46, 74, 44, 86, 1.6)]))
    layers += [(OUTLINE, ['M 28 86 Q 44 100 60 86 Z']), ('#5d4037', ['M 31 87.5 Q 44 97 57 87.5 Z']), ('#f4d03f', [ellipse(44, 88, 11, 1.8)])]
    return layers


def casabe():
    """Casabe: las tortas grandes, planas y redondas de yuca, tostadas en el budare, una encima de otra."""
    layers = []
    for cy, rx in [(74, 44), (60, 42)]:
        layers += [(OUTLINE, [ellipse(50, cy, rx + 2.2, rx * 0.34 + 2.2)]), ('#d9c08a', [ellipse(50, cy + 2, rx, rx * 0.34)]), ('#f3e3b8', [ellipse(50, cy, rx, rx * 0.34)])]
    layers.append(('#d6b46e', [ellipse(x, y, r * 1.6, r, 0) for x, y, r in [(30, 58, 2), (44, 64, 2.4), (62, 56, 2), (74, 62, 1.8), (52, 54, 1.4)]]))
    # Un pedazo partido, recostado encima.
    layers += [(OUTLINE, ['M 30 44 L 74 30 Q 62 16 38 22 Z']), ('#efdcaa', ['M 33.5 41 L 70 29.5 Q 60 19 39.5 24.5 Z'])]
    layers.append(('#d6b46e', [ellipse(48, 30, 2.4, 1.4), ellipse(58, 26, 2, 1.2)]))
    return layers


def desayuno_amazonico():
    """Desayuno amazónico: el casabe, el vaso de asaí con fariña y el frasquito de ají negro, sobre la hoja."""
    layers = [('#2e7d32', [leaf(4, 84, 96, 70, 20)]), ('#66bb6a', [rib(8, 83, 92, 71, 1.2)])]
    layers += [(OUTLINE, [ellipse(34, 68, 28, 10)]), ('#f3e3b8', [ellipse(34, 68, 25.5, 7.8)]), ('#d6b46e', [ellipse(28, 66, 3, 1.6), ellipse(42, 70, 3, 1.6)])]
    layers += [(OUTLINE, ['M 58 22 L 90 22 L 85 76 L 63 76 Z']), ('#e8f6ff', ['M 60.5 24.5 L 87.5 24.5 L 82.8 73.5 L 65.2 73.5 Z'])]
    layers.append(('#6a1b9a', ['M 61.4 32 L 86.6 32 L 82.8 73.5 L 65.2 73.5 Z']))
    layers += [(OUTLINE, [ellipse(74, 28, 14, 4)]), ('#e8d9a0', [ellipse(74, 28, 12.5, 3)])]
    layers += [(OUTLINE, [rect(18, 36, 16, 22)]), ('#3e2723', [rect(19.5, 40, 13, 16.5)]), ('#8d6e4a', [rect(19.5, 37.5, 13, 3.5)])]
    return layers


def banquete_maloca():
    """Banquete de la maloca: la batea grande con el pirarucú moqueado, el casabe, el asaí y el ají, para compartir."""
    layers = [(OUTLINE, [ellipse(50, 66, 47, 22)]), ('#8d5a32', [ellipse(50, 66, 44.5, 19.5)]), ('#a8743e', [ellipse(50, 64, 38, 14)])]
    layers += [(OUTLINE, [ellipse(32, 62, 18, 7)]), ('#f3e3b8', [ellipse(32, 62, 16, 5.4)])]
    for cx, cy in [(50, 58), (62, 64), (56, 70)]:
        layers += [(OUTLINE, [rect(cx - 7, cy - 5, 14, 9, -6)]), ('#8d4a1f', [rect(cx - 5.8, cy - 3.8, 11.6, 6.6, -6)]), ('#c97a32', [rect(cx - 4.5, cy - 3, 9, 3.4, -6)])]
    layers += [(OUTLINE, [circle(78, 58, 8)]), ('#6a1b9a', [circle(78, 58, 6.5)]), ('#9c4dcc', [circle(76, 56, 2)])]
    layers += chili(14, 72, 30, 80, 2, 4.4, '#e53935')
    # La totuma de chicha de chontaduro, atrás.
    layers += [(OUTLINE, ['M 38 24 Q 50 52 62 24 Z']), ('#6d4c41', ['M 40.5 26 Q 50 48 59.5 26 Z']), ('#f4b860', [ellipse(50, 26, 9.5, 2.4)])]
    return layers


# ---------- Amazonas · La Yanchama (v3.51) ----------

def ticuna_motif(cx, cy, w, h, dark='#2b2018', red='#b23a2a'):
    """Los dibujos ticuna: rombos negros, la línea roja en zigzag y los puntos."""
    layers = []
    zig = []
    n = 6
    for k in range(n + 1):
        zig.append((cx - w / 2 + w * k / n, cy + (h / 2 if k % 2 else -h / 2)))
    layers.append((red, [rib(zig[k][0], zig[k][1], zig[k + 1][0], zig[k + 1][1], 1.6) for k in range(n)]))
    for k in range(0, n, 2):
        x = cx - w / 2 + w * (k + 1) / n
        layers.append((dark, [poly(x - 3, cy, x, cy - 4, x + 3, cy, x, cy + 4)]))
    return layers


def yanchama_tree():
    """Árbol de yanchama: el tronco liso y claro con las raíces de tabla, la copa ancha, y la tira de corteza sacada."""
    layers = [('#5d4037', [ellipse(50, 90, 34, 6)])]
    layers += [(OUTLINE, ['M 40 90 L 43 40 L 57 40 L 60 90 Z', 'M 26 92 L 42 70 L 44 90 Z', 'M 74 92 L 58 70 L 56 90 Z'])]
    layers += [('#c9b48a', ['M 42.5 88 L 45 42 L 55 42 L 57.5 88 Z']), ('#a8936a', ['M 29 90.5 L 42 73 L 43 89 Z', 'M 71 90.5 L 58 73 L 57 89 Z'])]
    layers += [(OUTLINE, [rect(46.5, 54, 6, 22)]), ('#e8d9b5', [rect(47.5, 55, 4, 20)])]
    layers += [(OUTLINE, [ellipse(50, 30, 42, 22)]), ('#2e7d32', [ellipse(50, 30, 39.5, 19.5)]), ('#43a047', [ellipse(36, 24, 16, 9), ellipse(62, 22, 18, 9), ellipse(50, 36, 18, 7)])]
    return layers


def yanchama_bark():
    """Corteza de yanchama: las tiras de corteza, café por fuera y claras por dentro, remojándose en el agua del río."""
    layers = [('#4f8f96', [ellipse(50, 74, 46, 16)]), ('#7fbcc0', [ellipse(30, 72, 10, 1.6), ellipse(72, 78, 8, 1.4)])]
    for x0, y0, x1, y1 in [(12, 40, 80, 62), (22, 56, 90, 76), (8, 70, 64, 86)]:
        layers += [(OUTLINE, [rib(x0, y0, x1, y1, 13)]), ('#8d6e4a', [rib(x0, y0, x1, y1, 10.5)]), ('#e8d9b5', [rib(x0 + 2, y0 + 1, x1 - 2, y1 - 1, 5.5)])]
    return layers


def bark_cloth():
    """Tela de yanchama: la tela clara y fibrosa que sale de golpear la corteza, con el mazo de palo encima."""
    layers = [(OUTLINE, [poly(8, 46, 84, 30, 94, 76, 18, 92)]), ('#e8d9b5', [poly(11, 48, 82, 33, 91, 74, 20, 89)])]
    layers.append(('#d1c09a', [rib(14 + k * 2, 52 + k * 8, 86 + k, 38 + k * 8, 0.8) for k in range(5)]))
    layers += [(OUTLINE, [rib(30, 30, 66, 14, 7)]), ('#8d5a32', [rib(31, 29.5, 65, 14.5, 4.6)])]
    layers += [(OUTLINE, [ellipse(26, 34, 11, 8, -24)]), ('#a1887f', [ellipse(26, 34, 9, 6, -24)])]
    return layers


def painted_cloth():
    """Tela pintada: la yanchama con los dibujos ticuna en negro de jagua y rojo de achiote, y el pincel."""
    layers = [(OUTLINE, [rect(10, 22, 80, 64, -4)]), ('#e8d9b5', [rect(12.5, 24.5, 75, 59, -4)])]
    layers += ticuna_motif(50, 38, 62, 10)
    layers += ticuna_motif(50, 68, 62, 10, dark='#b23a2a', red='#2b2018')
    layers += [('#2b2018', [circle(26, 53, 2), circle(42, 52, 2), circle(58, 52, 2), circle(74, 51, 2)])]
    layers += [(OUTLINE, [rib(70, 96, 96, 70, 4.6)]), ('#8d6e4a', [rib(71, 95, 95, 71, 2.6)]), ('#b23a2a', [circle(70, 96, 3)])]
    return layers


def ticuna_mask():
    """Máscara ticuna: la máscara de yanchama pintada, con los ojos grandes, la boca y el pelo de fibra."""
    layers = [(OUTLINE, ['M 24 20 Q 50 6 76 20 L 78 62 Q 50 96 22 62 Z']), ('#e8d9b5', ['M 26.5 22 Q 50 9 73.5 22 L 75.5 61.5 Q 50 92 24.5 61.5 Z'])]
    layers.append(('#c9a96b', [rib(22 + k * 4, 64 + abs(k - 7) * 1.4, 20 + k * 4.4, 92, 1.6) for k in range(15)]))
    layers += [(OUTLINE, ['M 24 20 Q 50 6 76 20 L 78 62 Q 50 96 22 62 Z']), ('#e8d9b5', ['M 26.5 22 Q 50 9 73.5 22 L 75.5 61.5 Q 50 92 24.5 61.5 Z'])]
    layers += [('#2b2018', [ellipse(38, 42, 9, 7), ellipse(62, 42, 9, 7)]), ('#ffffff', [circle(38, 42, 3.4), circle(62, 42, 3.4)]), ('#2b2018', [circle(38, 42, 1.8), circle(62, 42, 1.8)])]
    layers += [('#b23a2a', [rib(30, 32, 46, 30, 2), rib(54, 30, 70, 32, 2), rib(50, 46, 50, 58, 2.4)])]
    layers += [('#2b2018', ['M 38 66 Q 50 74 62 66 Q 50 70 38 66 Z']), ('#b23a2a', [poly(28, 52, 32, 56, 28, 60), poly(72, 52, 68, 56, 72, 60)])]
    layers += ticuna_motif(50, 18, 40, 5)
    return layers


def recuerdo_amazonas():
    """Recuerdo del Amazonas: la máscara ticuna y la yanchama pintada, con el pirarucú moqueado envuelto en hoja."""
    layers = [(OUTLINE, [rect(4, 30, 52, 60, -8)]), ('#e8d9b5', [rect(6.5, 32.5, 47, 55, -8)])]
    layers += ticuna_motif(30, 50, 36, 8)
    layers += ticuna_motif(32, 72, 36, 8, dark='#b23a2a', red='#2b2018')
    layers += [(OUTLINE, ['M 46 14 Q 66 4 86 14 L 88 46 Q 66 72 44 46 Z']), ('#d9b98a', ['M 48.5 16 Q 66 7 83.5 16 L 85.5 45.5 Q 66 68 46.5 45.5 Z'])]
    layers += [('#2b2018', [ellipse(58, 30, 6, 5), ellipse(74, 30, 6, 5)]), ('#ffffff', [circle(58, 30, 2), circle(74, 30, 2)]), ('#b23a2a', [rib(66, 34, 66, 44, 2), rib(58, 52, 74, 52, 2)])]
    layers += [(OUTLINE, [leaf(54, 94, 96, 74, 14)]), ('#2e7d32', [leaf(54, 94, 96, 74, 12)])]
    layers += [(OUTLINE, [rect(66, 76, 16, 10, -24)]), ('#8d4a1f', [rect(67.5, 77.5, 13, 7, -24)]), ('#c97a32', [rect(69, 78.5, 9, 3, -24)])]
    return layers


# ---------- Amazonas · Leticia (v3.52) ----------

def helado_asai():
    """Helado de asaí: el cono con dos bolas moradas de asaí, la galleta y la fariña por encima."""
    layers = [(OUTLINE, ['M 34 52 L 66 52 L 50 96 Z']), ('#e0a95a', ['M 37.5 54.5 L 62.5 54.5 L 50 91 Z'])]
    layers.append(('#b47a32', [rib(40 + k * 5, 55, 50 + k * 2, 88, 0.8) for k in range(-1, 4)] + [rib(60 - k * 5, 55, 50 - k * 2, 88, 0.8) for k in range(-1, 4)]))
    for cx, cy, r in [(42, 46, 14), (58, 44, 14), (50, 28, 14)]:
        layers += [(OUTLINE, [circle(cx, cy, r + 2.2)]), ('#6a1b9a', [circle(cx, cy, r)]), ('#9c4dcc', [circle(cx - r * 0.35, cy - r * 0.35, r * 0.35)])]
    layers.append(('#e8d9a0', [circle(46, 20, 1.4), circle(54, 24, 1.2), circle(50, 30, 1.2), circle(40, 40, 1.2), circle(62, 38, 1.2)]))
    layers += [(OUTLINE, [rect(64, 6, 10, 24, 20)]), ('#f3e3b8', [rect(65.5, 7.5, 7, 21, 20)])]
    return layers


def cena_ribera():
    """Cena de la ribera: el plato con el pescado frito, el patacón, la ensalada y el frasquito de ají negro."""
    layers = [(OUTLINE, [ellipse(46, 64, 42, 22)]), ('#ffffff', [ellipse(46, 64, 39.5, 19.5)])]
    layers += fish_shape(40, 60, 46, 18, '#c9862e', '#f0c27a', -6)
    layers += [('#43a047', [ellipse(66, 70, 9, 4)]), ('#e53935', [circle(64, 68, 2.4), circle(70, 72, 2)])]
    layers += [(OUTLINE, [ellipse(24, 74, 8, 4)]), ('#f4c430', [ellipse(24, 74, 6.5, 3)])]
    layers += [(OUTLINE, [rect(76, 26, 16, 24)]), ('#3e2723', [rect(77.5, 30, 13, 18.5)]), ('#8d6e4a', [rect(77.5, 27.5, 13, 3.5)])]
    return layers


def noche_leticia():
    """Noche en Leticia: la cabaña del hotel entre los árboles de la selva, con la luna sobre el río y los loros."""
    layers = [('#1a2a4a', [rect(4, 4, 92, 92)]), ('#fff8e1', [circle(74, 20, 9)]), ('#1a2a4a', [circle(78, 17, 7)])]
    layers.append(('#ffffff', [circle(20, 14, 1), circle(44, 22, 1), circle(56, 10, 1)]))
    layers.append(('#3b5a4a', [rect(4, 74, 92, 22)]))
    layers.append(('#fff8e180', [rect(66, 78, 10, 2), rect(72, 86, 6, 2)]))
    layers += [('#1f4a2a', [circle(10, 50, 14), circle(90, 52, 14), circle(20, 38, 10), circle(84, 40, 10)])]
    layers += [(OUTLINE, [rect(26, 46, 44, 26)]), ('#a1887f', [rect(28, 48, 40, 22)]), ('#6d4c41', [rect(24, 70, 48, 4)])]
    layers += [(OUTLINE, ['M 20 48 L 48 26 L 76 48 Z']), ('#c9a96b', ['M 24 46.5 L 48 29 L 72 46.5 Z'])]
    for wx in (32, 56):
        layers.append(('#ffe082', [rect(wx, 54, 8, 8)]))
    layers += [('#4e342e', [rect(44, 56, 8, 14)])]
    for x, y in [(30, 18), (40, 12)]:
        layers += [('#e53935', [ellipse(x, y, 4, 1.6)]), ('#1e88e5', [ellipse(x + 3, y, 2, 1)])]
    return layers


def almuerzo_mercado():
    """Almuerzo del mercado: la posta de pirarucú con ají negro, el arroz, la fariña y el jugo de camu camu."""
    layers = [(OUTLINE, [ellipse(44, 64, 40, 22)]), ('#ffffff', [ellipse(44, 64, 37.5, 19.5)])]
    layers += [(OUTLINE, [rect(18, 52, 28, 18, -6)]), ('#c97a32', [rect(20, 54, 24, 14, -6)]), ('#3e2723', ['M 22 58 Q 32 52 42 56 Q 34 62 24 62 Z'])]
    layers += [(OUTLINE, [ellipse(56, 66, 12, 6)]), ('#fafafa', [ellipse(56, 66, 10.5, 4.6)])]
    layers += [(OUTLINE, [ellipse(46, 78, 9, 4)]), ('#e8d9a0', [ellipse(46, 78, 7.5, 3)])]
    layers += [(OUTLINE, ['M 72 26 L 92 26 L 89 74 L 75 74 Z']), ('#e8f6ff', ['M 74.5 28.5 L 89.5 28.5 L 86.8 71.5 L 77.2 71.5 Z']), ('#d81b60', ['M 75 38 L 89 38 L 86.8 71.5 L 77.2 71.5 Z'])]
    return layers


def provision_canoa():
    """Provisión de la canoa: el canasto tejido con el casabe, las bolsas de asaí, la totuma y el racimo de plátano."""
    layers = [(OUTLINE, ['M 12 46 L 88 46 L 80 92 L 20 92 Z']), ('#c9a96b', ['M 15 48.5 L 85 48.5 L 77.8 89.5 L 22.2 89.5 Z'])]
    layers.append(('#a07a3e', [rib(16 + k * 2, 56 + k * 8, 84 - k * 2, 56 + k * 8, 1) for k in range(5)]))
    layers += [(OUTLINE, [ellipse(34, 40, 18, 7)]), ('#f3e3b8', [ellipse(34, 40, 16, 5.5)])]
    layers += [(OUTLINE, ['M 52 18 L 70 18 L 72 46 L 50 46 Z']), ('#7b1fa2', ['M 54 20.5 L 68 20.5 L 69.6 43.5 L 52.4 43.5 Z']), ('#e1bee7', [rect(54, 20.5, 14, 4)])]
    layers += [(OUTLINE, ['M 72 34 Q 82 52 92 34 Z']), ('#6d4c41', ['M 74.5 36 Q 82 48 89.5 36 Z'])]
    layers += [(OUTLINE, [rib(30, 18, 42, 8, 6)]), ('#9ccc65', [rib(30, 18, 42, 8, 4)])]
    return layers


def delfines():
    """Salida a ver los delfines rosados: el delfín rosado que salta del río negro, con la canoa de los turistas."""
    layers = [('#3e5a50', [rect(4, 70, 92, 26)]), ('#7fa69a', [rect(4, 70, 92, 3)])]
    body = 'M 16 70 Q 20 40 46 30 Q 64 24 80 30 L 92 28 L 84 36 Q 70 34 58 42 Q 40 52 34 70 Z'
    layers += [(OUTLINE, [body]), ('#f48fb1', ['M 19 68 Q 23 42 47 33 Q 63 27.5 78 32.5 L 86 31 L 81.5 35.5 Q 69 33 56.5 40 Q 38 50 31.5 68 Z'])]
    layers += [('#f8bbd0', ['M 26 64 Q 32 46 48 38 Q 40 50 36 64 Z']), ('#263238', [circle(72, 32, 1.6)])]
    layers += [(OUTLINE, ['M 44 34 Q 40 24 46 16 Q 50 26 52 32 Z']), ('#ec6f9b', ['M 45.5 33 Q 42.5 25 46 19 Q 49 27 50.5 31.5 Z'])]
    layers += [('#ffffff', ['M 10 70 Q 16 62 22 70 Z', 'M 30 70 Q 36 64 42 70 Z']), ('#e3f2fd', [circle(14, 64, 2), circle(38, 62, 1.6)])]
    layers += [(OUTLINE, ['M 58 78 Q 76 88 96 78 L 92 84 Q 76 92 62 84 Z']), ('#8d5a32', ['M 61 79.5 Q 76 87 93 79.5 L 90 82.5 Q 76 89 64 82.5 Z']), ('#ff6f00', [circle(70, 76, 2.4), circle(80, 76, 2.4)])]
    return layers


# ---------- v4.0: subproductos de las regiones de antes ----------

def suero_costeno():
    """Suero costeño: la totuma con el suero blanco y espeso, la cuchara de palo y un pedazo de bollo."""
    layers = [(OUTLINE, ['M 10 46 Q 12 88 50 90 Q 88 88 90 46 Z']), ('#8d5a32', ['M 13.5 48.5 Q 15.5 85 50 87 Q 84.5 85 86.5 48.5 Z'])]
    layers.append(('#6d4325', [rib(22, 62, 30, 80, 1.2), rib(70, 80, 78, 62, 1.2)]))
    layers += [(OUTLINE, [ellipse(50, 46, 40, 11)]), ('#f6f0dc', [ellipse(50, 46, 37, 8.5)]), ('#fffdf5', [ellipse(42, 44, 14, 3.4)])]
    layers += [(OUTLINE, [rect(58, 8, 8, 42, 24)]), ('#c9a96b', [rect(59.5, 9.5, 5, 39, 24)])]
    layers += [(OUTLINE, [ellipse(22, 30, 10, 6, -20)]), ('#f3e3b8', [ellipse(22, 30, 8, 4.4, -20)])]
    return layers


def palmiste():
    """Almendra de palmiste: las nueces oscuras del fruto de palma, una partida con su almendra blanca."""
    layers = []
    for cx, cy, r, rot in [(30, 60, 15, -20), (66, 64, 15, 15), (48, 36, 13, 5)]:
        layers += [(OUTLINE, [ellipse(cx, cy, r + 2, r * 1.15 + 2, rot)]), ('#4e342e', [ellipse(cx, cy, r, r * 1.15, rot)]), ('#6d4c41', [ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.3, r * 0.45, rot)])]
    layers += [(OUTLINE, [ellipse(66, 64, 9.5, 11, 15)]), ('#f3e9d2', [ellipse(66, 64, 7.5, 9, 15)]), ('#d7c7a2', [ellipse(68, 67, 3, 4, 15)])]
    return layers


def fresh_hide():
    """Cuero fresco: el cuero recién sacado en el desposte, doblado sobre la vara, todavía con su pelo."""
    layers = [('#5d4037', [rect(6, 26, 88, 6)])]
    layers += hide_shape(50, 60, 0.95, '#b07a52', '#9a6440')
    layers.append(('#f5f0e6', [ellipse(36, 56, 7, 5), ellipse(62, 64, 8, 5.5), ellipse(50, 74, 5, 3)]))
    layers.append(('#3e2723', [ellipse(54, 50, 5, 3.5), ellipse(40, 70, 4, 3)]))
    return layers


def bagazo_cervecero():
    """Bagazo cervecero: el costal abierto con la cebada cocida y húmeda que sobra de la paila, para las vacas."""
    layers = [(OUTLINE, ['M 18 40 L 82 40 L 88 92 L 12 92 Z']), ('#d7b98a', ['M 20.5 42.5 L 79.5 42.5 L 85 89.5 L 15 89.5 Z'])]
    layers.append(('#b8986a', [rib(24, 56, 76, 56, 1), rib(22, 72, 78, 72, 1)]))
    layers += [(OUTLINE, [ellipse(50, 40, 34, 12)]), ('#a0703a', [ellipse(50, 40, 31.5, 9.5)])]
    layers.append(('#c98f4a', [ellipse(36 + (k % 5) * 7, 36 + (k // 5) * 6, 2.6, 1.6, 30) for k in range(10)]))
    layers.append(('#b0bec5', ['M 40 26 Q 36 16 40 6 L 43 6 Q 39 16 43 26 Z', 'M 60 26 Q 56 18 60 10 L 63 10 Q 59 18 63 26 Z']))
    return layers


# ---------- Tolima Grande (v4.0) ----------

def achira_plant():
    """Achira: la mata de hojas anchas, verdes con el borde morado, y sus flores rojas encima."""
    layers = [('#6d8f3a', [ellipse(50, 92, 30, 5)])]
    for x0, y0, x1, y1, w in [(50, 90, 18, 34, 13), (50, 90, 82, 36, 13), (50, 90, 34, 18, 11), (50, 90, 66, 20, 11)]:
        layers += [(OUTLINE, [leaf(x0, y0, x1, y1, w + 2)]), ('#4e8a34', [leaf(x0, y0, x1, y1, w)]), ('#7b3f6e', [rib(x0, y0, x1, y1, 1)])]
    layers += [(OUTLINE, [rect(47.5, 10, 5, 50)]), ('#5d8f3a', [rect(48.5, 11, 3, 48)])]
    for cx, cy, rot in [(44, 10, -30), (56, 8, 30), (50, 4, 0), (46, 18, -50), (55, 17, 50)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 5.5, 9, rot)]), ('#e53935', [ellipse(cx, cy, 4, 7.5, rot)])]
    layers.append(('#ffca28', [circle(50, 9, 1.8)]))
    return layers


def achira_root():
    """Rizoma de achira: los tubérculos gordos y anillados, con sus raicitas, recién sacados de la tierra."""
    layers = [('#8d6e4a', [ellipse(50, 88, 38, 6)])]
    for cx, cy, rx, ry, rot in [(34, 62, 20, 13, -25), (64, 58, 22, 14, 20), (50, 76, 18, 11, 0)]:
        layers += [(OUTLINE, [ellipse(cx, cy, rx + 2, ry + 2, rot)]), ('#c9a27a', [ellipse(cx, cy, rx, ry, rot)])]
        layers.append(('#a07a52', [rib(cx - rx * 0.5, cy - ry * 0.8, cx - rx * 0.3, cy + ry * 0.8, 0.9), rib(cx + rx * 0.2, cy - ry * 0.9, cx + rx * 0.4, cy + ry * 0.8, 0.9)]))
    layers.append(('#6d4c32', [rib(16, 66, 8, 74, 0.8), rib(82, 62, 92, 70, 0.8), rib(40, 86, 36, 94, 0.8)]))
    layers += [(OUTLINE, [leaf(60, 46, 70, 16, 7)]), ('#4e8a34', [leaf(60, 46, 70, 16, 5)])]
    return layers


def achira_mash():
    """Achira rallada: la batea de madera con la masa blanca y fibrosa, y el rallador de lata."""
    layers = [(OUTLINE, ['M 8 52 Q 50 96 92 52 Z']), ('#8d5a32', ['M 12 54.5 Q 50 91 88 54.5 Z'])]
    layers += [(OUTLINE, [ellipse(50, 52, 42, 10)]), ('#e8dcc0', [ellipse(50, 52, 39, 7.5)])]
    layers.append(('#cdbf9e', [rib(26 + k * 8, 48, 30 + k * 8, 56, 0.8) for k in range(6)]))
    layers += [(OUTLINE, [rect(60, 8, 16, 38, 18)]), ('#b0bec5', [rect(62, 10, 12, 34, 18)])]
    layers.append(('#78909c', [circle(66 + (k % 3) * 3, 16 + (k // 3) * 6, 0.9) for k in range(12)]))
    return layers


def wet_starch():
    """Almidón húmedo: el tanque donde se asienta el almidón blanco bajo el agua."""
    layers = [(OUTLINE, [rect(10, 34, 80, 54)]), ('#90a4ae', [rect(13, 37, 74, 48)])]
    layers += [('#bbdefb', [rect(13, 37, 74, 22)]), ('#f1ece0', [rect(13, 59, 74, 26)]), ('#ffffff', [rect(18, 62, 30, 3)])]
    layers.append(('#e3f2fd', [rib(20, 46, 40, 46, 1), rib(52, 50, 76, 50, 1)]))
    layers += [(OUTLINE, [rect(6, 30, 88, 6)]), ('#78909c', [rect(8, 31.5, 84, 3)])]
    return layers


def achira_starch():
    """Almidón de achira: el costal abierto con el almidón seco, blanquísimo, y la cuchara de palo."""
    layers = [(OUTLINE, ['M 16 40 L 84 40 L 90 94 L 10 94 Z']), ('#e0cf94', ['M 18.5 42.5 L 81.5 42.5 L 87 91.5 L 13 91.5 Z'])]
    layers += [(OUTLINE, [ellipse(50, 40, 36, 11)]), ('#faf8f2', [ellipse(50, 40, 33, 8.5)]), ('#ffffff', [ellipse(42, 37, 12, 3)])]
    layers += [(OUTLINE, [rect(60, 6, 7, 36, 25)]), ('#c9a96b', [rect(61.5, 7.5, 4, 33, 25)])]
    layers.append(('#c8b07a', [rib(22, 60, 78, 60, 1), rib(18, 76, 82, 76, 1)]))
    return layers


def bizcocho_dough():
    """Masa de bizcocho: la bola de masa de almidón, cuajada y mantequilla sobre la mesa, con el rodillo."""
    layers = [(OUTLINE, [rect(4, 64, 92, 26)]), ('#a1887f', [rect(6.5, 66.5, 87, 21)])]
    layers += [(OUTLINE, [ellipse(46, 56, 34, 20)]), ('#f3e3b8', [ellipse(46, 56, 31, 17.5)]), ('#fff8e1', [ellipse(38, 49, 12, 6)])]
    layers += [(OUTLINE, [rect(54, 70, 40, 9, -12)]), ('#c9a96b', [rect(55.5, 71.5, 37, 6, -12)])]
    layers.append(('#ffffff', [circle(70, 30, 1.6), circle(76, 36, 1.2), circle(64, 34, 1.4)]))
    return layers


def biscuit(cx, cy, s=1.0, rot=0):
    """Un bizcocho de achira: el bastoncito dorado, un poco curvo."""
    return [(OUTLINE, [ellipse(cx, cy, 15 * s, 6 * s, rot)]), ('#e8b860', [ellipse(cx, cy, 13 * s, 4.4 * s, rot)]),
            ('#f6d690', [ellipse(cx - 3 * s, cy - 1.2 * s, 6 * s, 1.6 * s, rot)])]


def bizcochos():
    """Bizcochos de achira: la bolsita de papel abierta con los bizcochos dorados asomando."""
    layers = [(OUTLINE, ['M 22 38 L 78 38 L 84 96 L 16 96 Z']), ('#f3e3b8', ['M 24.5 40.5 L 75.5 40.5 L 81 93.5 L 19 93.5 Z'])]
    for cx, cy, rot in [(38, 34, -60), (52, 28, -80), (64, 34, -110), (46, 40, -70)]:
        layers += biscuit(cx, cy, 1.1, rot)
    layers += [('#e53935', [rect(28, 62, 44, 12)]), ('#ffffff', [rect(32, 66, 36, 4)])]
    return layers


def bizcocho_box():
    """Caja de bizcochos: la caja de cartón con las bolsitas de bizcochos de achira y la flor roja de la achira."""
    layers = [(OUTLINE, ['M 8 40 L 92 40 L 88 92 L 12 92 Z']), ('#c8a26a', ['M 10.5 42.5 L 89.5 42.5 L 85.5 89.5 L 14.5 89.5 Z'])]
    for cx in (28, 50, 72):
        layers += biscuit(cx, 36, 0.9, -70)
    layers += [(OUTLINE, [rect(30, 56, 40, 24)]), ('#fff3d6', [rect(32, 58, 36, 20)])]
    layers += [('#e53935', [ellipse(50, 66, 4, 7, -20), ellipse(55, 65, 4, 7, 25)]), ('#4e8a34', [leaf(44, 76, 52, 70, 3)])]
    return layers


def cafe_excelso():
    """Café excelso: el grano verde ya trillado y seleccionado, en el plato de la catadora."""
    layers = [(OUTLINE, [ellipse(50, 70, 44, 18)]), ('#e8e0cc', [ellipse(50, 70, 41, 15.5)])]
    for cx, cy, rot in [(32, 64, -20), (50, 60, 10), (68, 64, 30), (40, 74, 40), (60, 76, -10), (50, 50, -30)]:
        layers += coffee_bean(cx, cy, 10, 7, rot, '#8fae5d', '#4e6b2e', '#c5dc9a')
    layers.append(('#d7263d', [rect(70, 14, 18, 22, 10)]))
    layers.append(('#ffffff', [rect(73, 18, 12, 3, 10), rect(73, 24, 9, 2, 10)]))
    return layers


def cafe_especial():
    """Café especial del Huila: la bolsa negra con válvula, la etiqueta dorada y la montaña del Huila."""
    layers = [(OUTLINE, ['M 20.5 22 L 79.5 22 L 84.5 97.5 L 15.5 97.5 Z']), ('#3e2723', ['M 23 24 L 77 24 L 82 95 L 18 95 Z'])]
    layers += [(OUTLINE, [rect(21.5, 6.5, 57, 19)]), ('#5d4037', [rect(24, 9, 52, 14)])]
    layers += [('#e0b84a', [rect(28, 44, 44, 38)]), ('#2e7d32', ['M 30 72 L 42 54 L 50 64 L 58 50 L 70 72 Z']), ('#ffffff', ['M 54 56 L 58 50 L 62 56 Z'])]
    layers += coffee_bean(50, 78, 6, 4, -20, '#5a3420', '#1e0f06', '#b0805c')
    layers.append(('#9e9e9e', [circle(66, 32, 3)]))
    return layers


def cascara():
    """Cáscara de café: la cascarilla roja y seca de la cereza, regada en una zaranda de secado."""
    layers = [(OUTLINE, [rect(6, 50, 88, 34, 0)]), ('#8d6e4a', [rect(8.5, 52.5, 83, 29)])]
    layers.append(('#a1887f', [rib(8 + k * 8, 52, 8 + k * 8, 82, 0.6) for k in range(11)]))
    for cx, cy, rot in [(22, 60, 20), (36, 66, -10), (52, 58, 40), (66, 68, 0), (80, 60, -30), (30, 76, 60), (60, 76, 15), (46, 72, -40)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 7, 4.6, rot)]), ('#9b2335', [ellipse(cx, cy, 5.5, 3.3, rot)]), ('#c0392b', [ellipse(cx - 1, cy - 1, 2.4, 1.2, rot)])]
    for cx, cy in [(38, 30), (60, 26)]:
        layers += [(OUTLINE, [circle(cx, cy, 11)]), ('#d7263d', [circle(cx, cy, 9)]), ('#ff6f61', [circle(cx - 3, cy - 3, 3)])]
    return layers


def te_cascara():
    """Té de cáscara: la taza de vidrio con la infusión rojiza de la cascarilla del café y su bolsita."""
    layers = [(OUTLINE, [ellipse(50, 90, 38, 7)]), ('#eceff1', [ellipse(50, 90, 35, 5)])]
    layers += [(OUTLINE, ['M 24 40 L 76 40 L 70 88 L 30 88 Z', 'M 74 50 Q 92 52 88 66 Q 84 76 72 74 L 72 68 Q 82 68 82 62 Q 82 56 74 56 Z'])]
    layers += [('#e3f2fd', ['M 26.5 42.5 L 73.5 42.5 L 67.8 85.5 L 32.2 85.5 Z']), ('#c0622b', ['M 28 52 L 72 52 L 67.8 85.5 L 32.2 85.5 Z']), ('#e08a52', [rect(32, 54, 8, 26)])]
    layers += [('#9b2335', [ellipse(40, 46, 4, 2.5), ellipse(54, 44, 3.5, 2.2)])]
    layers.append(('#b0bec5', ['M 40 34 Q 36 22 40 10 L 43 10 Q 39 22 43 34 Z', 'M 58 34 Q 54 24 58 14 L 61 14 Q 57 24 61 34 Z']))
    return layers


def tilapia():
    """Tilapia: el pescado gris plateado de las jaulas de la represa, con sus rayas oscuras."""
    layers = fish_shape(50, 52, 74, 40, '#8a9a9a', '#cfd8dc')
    layers.append(('#5f6f6f', [rib(36 + k * 9, 38, 34 + k * 9, 64, 1.4) for k in range(4)]))
    layers.append(('#4fc3f7', [rib(10, 88, 90, 88, 1.6)]))
    return layers


def clean_tilapia():
    """Tilapia limpia: la tilapia sin escamas ni tripa, rosadita, sobre la hoja de plátano."""
    layers = [('#2e7d32', [leaf(4, 82, 96, 70, 16)]), ('#66bb6a', [rib(8, 81, 92, 71, 1.2)])]
    layers += fish_shape(50, 52, 70, 34, '#e8b8a8', '#f8e4dc')
    layers.append(('#ffffff', [rib(30, 48, 60, 46, 1.4)]))
    return layers


def tilapia_fillet():
    """Filete de tilapia: los filetes blancos y rosados, sin espinas, en la bandeja."""
    layers = [(OUTLINE, [rect(6, 56, 88, 28)]), ('#cfd8dc', [rect(8.5, 58.5, 83, 23)])]
    for cx, cy, rot in [(32, 56, -10), (66, 52, 8)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 22, 11, rot)]), ('#fbe9e7', [ellipse(cx, cy, 20, 9, rot)]), ('#f8bbd0', [rib(cx - 14, cy + 2, cx + 14, cy - 2, 1.2)])]
    return layers


def escabeche():
    """Tilapia en escabeche: el frasco de vidrio con los filetes en vinagre, cebolla, zanahoria y laurel."""
    layers = [(OUTLINE, [rect(22, 22, 56, 72)]), ('#fff3d6', [rect(25, 25, 50, 66)])]
    layers += [('#f6dfa0', [rect(25, 34, 50, 57)])]
    for cx, cy in [(38, 52), (60, 64), (44, 78)]:
        layers += [('#fbe9e7', [ellipse(cx, cy, 12, 5, 15)])]
    layers += [('#ff8f00', [circle(56, 46, 3.5), circle(36, 66, 3), circle(62, 82, 3)]), ('#ffffff', [ellipse(46, 60, 5, 2), ellipse(58, 76, 4.5, 1.8)]), ('#558b2f', [leaf(30, 86, 42, 70, 3)])]
    layers += [(OUTLINE, [rect(18, 10, 64, 14)]), ('#d7263d', [rect(20.5, 12.5, 59, 9)]), ('#ffffff', [circle(30, 17, 1.5), circle(50, 17, 1.5), circle(70, 17, 1.5)])]
    return layers


def tilapia_ahumada():
    """Tilapia ahumada: la tilapia dorada y oscura del humo, colgada de la vara del ahumadero."""
    layers = [(OUTLINE, [rect(6, 10, 88, 6)]), ('#6d4c41', [rect(8, 11.5, 84, 3)])]
    layers += fish_shape(50, 56, 34 * 2, 34, '#a8642a', '#d9a05a', 90, eye=False)
    layers.append(('#5d3a1e', [rib(40, 40 + k * 10, 60, 40 + k * 10, 1.4) for k in range(4)]))
    layers.append(('#5d4037', [rib(50, 14, 50, 22, 1.4)]))
    layers.append(('#b0bec5', ['M 24 40 Q 18 28 24 16 L 27 16 Q 21 28 27 40 Z', 'M 78 46 Q 72 34 78 22 L 81 22 Q 75 34 81 46 Z']))
    return layers


def almuerzo_represa():
    """Almuerzo de la represa: la tilapia frita con patacones, arroz, ensalada y limón."""
    layers = [(OUTLINE, [ellipse(50, 64, 46, 24)]), ('#ffffff', [ellipse(50, 64, 43, 21.5)])]
    layers += fish_shape(46, 58, 56, 22, '#c9862e', '#f0c27a', -6)
    for cx, cy in [(24, 74), (34, 80)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 9, 5)]), ('#f4c430', [ellipse(cx, cy, 7.5, 3.8)])]
    layers += [(OUTLINE, [ellipse(70, 76, 10, 5)]), ('#fafafa', [ellipse(70, 76, 8.5, 3.8)]), ('#43a047', [ellipse(76, 64, 7, 3.5)]), ('#9ccc65', [circle(84, 70, 4)])]
    return layers


def pig(cx, cy, s, body='#f4a7b0', spot=None):
    """Un cerdito de perfil, mirando a la izquierda."""
    layers = [(OUTLINE, [ellipse(cx, cy, 26 * s, 17 * s), circle(cx - 25 * s, cy - 2 * s, 11 * s)])]
    for lx in (-14, -6, 8, 16):
        layers.append((OUTLINE, [rect(cx + lx * s - 3 * s, cy + 10 * s, 6 * s, 14 * s)]))
        layers.append((body, [rect(cx + lx * s - 1.8 * s, cy + 11 * s, 3.6 * s, 11.5 * s)]))
    layers += [(body, [ellipse(cx, cy, 24 * s, 15 * s), circle(cx - 25 * s, cy - 2 * s, 9 * s)])]
    if spot:
        layers.append((spot, [ellipse(cx + 8 * s, cy - 4 * s, 9 * s, 7 * s)]))
    layers += [('#f48fb1', [ellipse(cx - 33 * s, cy, 4.5 * s, 5.5 * s)]), ('#ad5a6a', [circle(cx - 34 * s, cy - 1.5 * s, 1 * s), circle(cx - 32 * s, cy + 1.5 * s, 1 * s)])]
    layers += [('#263238', [circle(cx - 27 * s, cy - 6 * s, 1.6 * s)]), (body, [poly(cx - 22 * s, cy - 11 * s, cx - 16 * s, cy - 20 * s, cx - 14 * s, cy - 9 * s)])]
    layers.append((OUTLINE, [rib(cx + 24 * s, cy - 4 * s, cx + 30 * s, cy - 10 * s, 1.2)]))
    return layers


def cerdo():
    """Cerdo: el cerdito rosado con una mancha negra, en el barro."""
    return [('#8d6e4a', [ellipse(50, 90, 40, 6)])] + pig(56, 58, 1.2, spot='#424242')


def carne_cerdo():
    """Carne de cerdo: los pedazos de carne roja con su gordo blanco, sobre la tabla."""
    layers = [(OUTLINE, [rect(4, 62, 92, 26)]), ('#c9a96b', [rect(6.5, 64.5, 87, 21)])]
    for cx, cy, rot in [(32, 58, -10), (64, 56, 12), (48, 44, 0)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 18, 12, rot)]), ('#e57373', [ellipse(cx, cy, 16, 10, rot)]), ('#fce4ec', [ellipse(cx + 6, cy - 4, 7, 3, rot)])]
    return layers


def cuero_cerdo():
    """Cuero de cerdo: el cuero rosado, enrollado, recién sacado en el desposte."""
    layers = [(OUTLINE, [ellipse(50, 60, 40, 24)]), ('#f0b9a8', [ellipse(50, 60, 37, 21)])]
    layers += [(OUTLINE, [ellipse(70, 58, 14, 18)]), ('#e8a090', [ellipse(70, 58, 11, 15)]), ('#f8d0c4', [ellipse(70, 58, 6, 9)])]
    layers.append(('#d98a7a', [rib(18, 50, 54, 46, 1), rib(16, 62, 54, 60, 1), rib(20, 74, 54, 72, 1)]))
    return layers


def cuero_limpio():
    """Cuero limpio: el cuero pelado y adobado con comino, extendido para envolver la lechona."""
    layers = [(OUTLINE, [rect(8, 34, 84, 48, -6)]), ('#e8c49a', [rect(11, 37, 78, 42, -6)])]
    layers.append(('#c9925a', [circle(24 + (k % 6) * 10, 46 + (k // 6) * 12 + (k % 2) * 3, 1.4) for k in range(18)]))
    layers.append(('#fff3d6', [rib(14, 44, 86, 36, 1.2)]))
    return layers


def relleno():
    """Relleno de la lechona: la paila con el arroz amarillo, la arveja y la carne adobada."""
    layers = [(OUTLINE, ['M 10 46 L 90 46 L 82 84 Q 50 94 18 84 Z']), ('#424242', ['M 13.5 48.5 L 86.5 48.5 L 79.5 81.5 Q 50 91 20.5 81.5 Z'])]
    layers += [(OUTLINE, [ellipse(50, 46, 40, 11)]), ('#d9a441', [ellipse(50, 46, 37, 8.5)])]
    layers.append(('#7cb342', [circle(30 + (k * 13) % 42, 42 + (k * 5) % 8, 2.2) for k in range(9)]))
    layers.append(('#a1452a', [ellipse(44, 46, 6, 3), ellipse(62, 44, 5, 2.5), ellipse(34, 48, 4, 2)]))
    layers.append(('#b0bec5', ['M 34 36 Q 30 24 34 12 L 37 12 Q 33 24 37 36 Z', 'M 60 36 Q 56 26 60 16 L 63 16 Q 59 26 63 36 Z']))
    return layers


def tamal():
    """Tamal tolimense: el tamal envuelto en hoja de plátano, amarrado con cabuya, y uno abierto."""
    layers = [(OUTLINE, [rect(8, 46, 50, 36, -10)]), ('#4e8a34', [rect(11, 49, 44, 30, -10)]), ('#9ccc65', [rib(14, 56, 52, 50, 1)])]
    layers.append(('#c9a96b', [rib(30, 44, 36, 84, 1.6), rib(10, 66, 58, 58, 1.6)]))
    layers += [(OUTLINE, [leaf(46, 86, 96, 60, 18)]), ('#6aa84f', [leaf(46, 86, 96, 60, 16)])]
    layers += [(OUTLINE, [ellipse(70, 72, 16, 9, -25)]), ('#f4c430', [ellipse(70, 72, 14, 7, -25)])]
    layers += [('#a1452a', [ellipse(66, 72, 4, 2.5)]), ('#ffffff', [ellipse(74, 69, 3, 2)]), ('#ff8f00', [circle(72, 76, 1.8)])]
    return layers


def lechona():
    """Lechona tolimense: el cerdo entero, dorado y tostado, relleno, servido en la batea."""
    layers = [(OUTLINE, ['M 4 68 Q 50 100 96 68 Z']), ('#8d5a32', ['M 8 70 Q 50 95 92 70 Z'])]
    layers += [(OUTLINE, [ellipse(52, 56, 38, 18), circle(16, 52, 12)]), ('#c9782c', [ellipse(52, 56, 35.5, 15.5), circle(16, 52, 10)])]
    layers += [('#e8a050', [ellipse(50, 48, 24, 5)]), ('#d9a441', [ellipse(64, 62, 12, 5)]), ('#7cb342', [circle(60, 62, 1.6), circle(68, 63, 1.6)])]
    layers += [('#263238', [circle(12, 48, 1.4)]), ('#a0521a', [ellipse(7, 54, 3.5, 4.5)]), ('#f44336', [circle(4, 54, 2.5)])]
    return layers


def desayuno_tolimense():
    """Desayuno tolimense: el tamal abierto en su hoja, la taza de tinto y los bizcochos de achira."""
    layers = [(OUTLINE, [leaf(4, 74, 66, 56, 22)]), ('#4e8a34', [leaf(4, 74, 66, 56, 20)])]
    layers += [(OUTLINE, [ellipse(34, 64, 18, 10, -15)]), ('#f4c430', [ellipse(34, 64, 16, 8, -15)]), ('#a1452a', [ellipse(32, 64, 5, 3)]), ('#ffffff', [ellipse(40, 61, 3, 2)])]
    layers += [(OUTLINE, ['M 62 28 L 88 28 L 85 56 L 65 56 Z']), ('#ffffff', ['M 64.5 30.5 L 85.5 30.5 L 82.8 53.5 L 67.2 53.5 Z']), ('#4e2a14', [ellipse(75, 32, 10, 2.5)])]
    layers += biscuit(66, 82, 1.0, -15) + biscuit(84, 74, 0.9, 30)
    layers.append(('#b0bec5', ['M 72 24 Q 68 14 72 4 L 75 4 Q 71 14 75 24 Z']))
    return layers


def arcilla():
    """Arcilla: el terrón de arcilla gris del barranco del río Magdalena, con la pala."""
    layers = [(OUTLINE, ['M 8 86 Q 20 40 50 36 Q 82 40 92 86 Z']), ('#8d6e63', ['M 12 84 Q 23 43 50 39 Q 79 43 88 84 Z'])]
    layers.append(('#a1887f', [ellipse(36, 58, 10, 5), ellipse(62, 70, 12, 5), ellipse(54, 48, 7, 3)]))
    layers += [(OUTLINE, [rect(66, 6, 7, 42, 20)]), ('#6d4c41', [rect(67.5, 7.5, 4, 39, 20)])]
    layers += [(OUTLINE, ['M 56 42 L 72 46 L 70 58 L 54 54 Z']), ('#90a4ae', ['M 58 44 L 70 47.5 L 68.5 56 L 56 52.5 Z'])]
    return layers


def barro_pisado():
    """Barro pisado: el barro amasado con los pies, con las huellas, y la arena fina para mezclar."""
    layers = [(OUTLINE, [ellipse(50, 64, 44, 24)]), ('#795548', [ellipse(50, 64, 41, 21)])]
    for cx, cy, rot in [(36, 58, -20), (52, 72, -10), (64, 56, 15)]:
        layers += [('#5d4037', [ellipse(cx, cy, 5, 9, rot)]), ('#5d4037', [circle(cx + 1, cy - 11, 2), circle(cx + 4, cy - 10, 1.6)])]
    layers += [(OUTLINE, [ellipse(82, 30, 12, 7)]), ('#e0c890', [ellipse(82, 30, 10, 5)])]
    return layers


def black_pot(cx, cy, s, color='#2b2b2b', shine='#6d6d6d'):
    """Una cazuela de loza negra de La Chamba, con sus dos asas."""
    return [(OUTLINE, ['M %.1f %.1f Q %.1f %.1f %.1f %.1f Q %.1f %.1f %.1f %.1f Z' % (cx - 22 * s, cy - 8 * s, cx - 20 * s, cy + 14 * s, cx, cy + 16 * s, cx + 20 * s, cy + 14 * s, cx + 22 * s, cy - 8 * s),
             ellipse(cx - 24 * s, cy - 4 * s, 4 * s, 2.5 * s), ellipse(cx + 24 * s, cy - 4 * s, 4 * s, 2.5 * s)]),
            (color, ['M %.1f %.1f Q %.1f %.1f %.1f %.1f Q %.1f %.1f %.1f %.1f Z' % (cx - 19.5 * s, cy - 7 * s, cx - 18 * s, cy + 11.5 * s, cx, cy + 13.5 * s, cx + 18 * s, cy + 11.5 * s, cx + 19.5 * s, cy - 7 * s)]),
            (OUTLINE, [ellipse(cx, cy - 8 * s, 23 * s, 6 * s)]), (color, [ellipse(cx, cy - 8 * s, 21 * s, 4.5 * s)]),
            (shine, [ellipse(cx - 10 * s, cy + 2 * s, 3 * s, 7 * s, 15)])]


def pieza_cruda():
    """Pieza modelada: la cazuela de barro crudo, color tierra, recién hecha a mano sobre la tabla."""
    layers = [(OUTLINE, [ellipse(50, 88, 36, 6)]), ('#a1887f', [ellipse(50, 88, 33, 4.5)])]
    layers += black_pot(50, 64, 1.5, '#a1887f', '#c9b0a0')
    layers.append(('#8d6e63', [rib(32, 66, 68, 66, 0.8)]))
    return layers


def pieza_brunida():
    """Pieza bruñida: la cazuela pulida a mano con la piedra de río, que brilla, y la piedra al lado."""
    layers = black_pot(46, 60, 1.4, '#bc8f6f', '#f3d9c4')
    layers += [(OUTLINE, [ellipse(80, 84, 10, 6)]), ('#90a4ae', [ellipse(80, 84, 8, 4.5)]), ('#cfd8dc', [ellipse(77, 82, 3, 1.5)])]
    layers.append(('#ffffff', [rib(30, 52, 34, 66, 1.4)]))
    return layers


def loza_negra():
    """Loza negra: la cazuela negra y brillante de La Chamba, con su tapa, y una ollita."""
    layers = black_pot(42, 64, 1.3)
    layers += [(OUTLINE, [ellipse(42, 48, 20, 6)]), ('#2b2b2b', [ellipse(42, 48, 18, 4.5)]), (OUTLINE, [circle(42, 42, 4)]), ('#3a3a3a', [circle(42, 42, 2.6)])]
    layers += black_pot(80, 80, 0.55)
    return layers


def recuerdo_tolima():
    """Recuerdo del Tolima: la cazuela negra de La Chamba con la tilapia ahumada y el frasco de escabeche."""
    layers = black_pot(44, 66, 1.3)
    layers += fish_shape(44, 48, 40, 14, '#a8642a', '#d9a05a', -10, eye=False)
    layers += [(OUTLINE, [rect(70, 40, 22, 48)]), ('#f6dfa0', [rect(72.5, 42.5, 17, 43)]), ('#d7263d', [rect(70, 34, 22, 8)]), ('#fbe9e7', [ellipse(81, 60, 6, 3), ellipse(81, 72, 6, 3)])]
    layers += [('#e53935', [ellipse(18, 22, 4, 7, -20), ellipse(24, 20, 4, 7, 25)]), ('#4e8a34', [leaf(14, 36, 22, 26, 3)])]
    return layers


def merienda_malecon():
    """Merienda del malecón: el pocillo de chocolate, los bizcochos de achira y el quesillo, junto al río."""
    layers = [('#4fc3f7', [rect(4, 80, 92, 16)]), ('#e3f2fd', [rib(10, 86, 40, 86, 1), rib(56, 90, 90, 90, 1)])]
    layers += [(OUTLINE, [ellipse(50, 70, 44, 12)]), ('#ffffff', [ellipse(50, 70, 41, 9.5)])]
    layers += [(OUTLINE, ['M 18 36 L 46 36 L 43 66 L 21 66 Z']), ('#fff3e0', ['M 20.5 38.5 L 43.5 38.5 L 40.8 63.5 L 23.2 63.5 Z']), ('#6d3a1e', [ellipse(32, 40, 11, 2.5)])]
    layers += biscuit(66, 62, 1.0, -10) + biscuit(72, 52, 0.9, 20)
    layers += [(OUTLINE, [rect(54, 66, 22, 10)]), ('#fffde7', [rect(56, 68, 18, 6)])]
    return layers


def cena_opita():
    """Cena opita: el asado huilense con su yuca, el arroz y el envuelto de maíz."""
    layers = [(OUTLINE, [ellipse(48, 66, 44, 22)]), ('#ffffff', [ellipse(48, 66, 41, 19.5)])]
    layers += [(OUTLINE, [ellipse(40, 60, 18, 10, -10)]), ('#a1452a', [ellipse(40, 60, 16, 8, -10)]), ('#7b2e14', [rib(28, 58, 52, 56, 1.2)])]
    layers += [(OUTLINE, [rect(56, 62, 20, 8, 15)]), ('#fff3d6', [rect(57.5, 63.5, 17, 5, 15)])]
    layers += [(OUTLINE, [ellipse(34, 76, 9, 4)]), ('#fafafa', [ellipse(34, 76, 7.5, 3)])]
    layers += [(OUTLINE, [leaf(70, 40, 96, 30, 8)]), ('#9ccc65', [leaf(70, 40, 96, 30, 6)])]
    return layers


def noche_sanpedro():
    """Noche del San Pedro: la pareja bailando el sanjuanero bajo las banderitas y los fuegos artificiales."""
    layers = [('#1a2a4a', [rect(4, 4, 92, 92)])]
    for cx, cy, col in [(24, 20, '#ffca28'), (74, 16, '#ec407a'), (50, 10, '#66bb6a')]:
        layers.append((col, [rib(cx, cy, cx + dx, cy + dy, 1.2) for dx, dy in [(8, 0), (-8, 0), (0, 8), (0, -8), (6, 6), (-6, 6), (6, -6), (-6, -6)]]))
    layers.append(('#ffffff', [rib(4, 34, 96, 30, 0.8)]))
    layers.append(('#e53935', [poly(10 + k * 14, 33 - k * 0.4, 18 + k * 14, 33 - k * 0.4, 14 + k * 14, 40) for k in range(0, 6, 2)]))
    layers.append(('#fdd835', [poly(10 + k * 14, 33 - k * 0.4, 18 + k * 14, 33 - k * 0.4, 14 + k * 14, 40) for k in range(1, 6, 2)]))
    layers.append(('#5d4037', [rect(4, 84, 92, 12)]))
    layers += [(OUTLINE, ['M 30 84 L 40 50 L 52 84 Z']), ('#e53935', ['M 32.5 82 L 40 55 L 49.5 82 Z']), ('#fdd835', [rect(31, 76, 20, 3)]), ('#6d4c32', [circle(40, 46, 5)])]
    layers += [(OUTLINE, [rect(60, 56, 10, 28)]), ('#fafafa', [rect(61.5, 57.5, 7, 15)]), ('#424242', [rect(61.5, 72, 7, 12)]), ('#6d4c32', [circle(65, 51, 5)]), ('#f4e3b5', [ellipse(65, 47, 9, 2.2)])]
    layers.append(('#d7263d', [rib(68, 60, 78, 58, 1.6)]))
    return layers


def almuerzo_opita():
    """Almuerzo opita: el asado huilense con arroz, yuca y el jugo de cholupa del mercado."""
    layers = [(OUTLINE, [ellipse(44, 64, 40, 22)]), ('#ffffff', [ellipse(44, 64, 37.5, 19.5)])]
    layers += [(OUTLINE, [rect(18, 52, 28, 18, -6)]), ('#a1452a', [rect(20, 54, 24, 14, -6)])]
    layers += [(OUTLINE, [ellipse(56, 66, 12, 6)]), ('#fafafa', [ellipse(56, 66, 10.5, 4.6)]), (OUTLINE, [rect(34, 74, 20, 7, 10)]), ('#fff3d6', [rect(35.5, 75.5, 17, 4, 10)])]
    layers += [(OUTLINE, ['M 72 26 L 92 26 L 89 74 L 75 74 Z']), ('#e8f6ff', ['M 74.5 28.5 L 89.5 28.5 L 86.8 71.5 L 77.2 71.5 Z']), ('#ffb74d', ['M 75 38 L 89 38 L 86.8 71.5 L 77.2 71.5 Z'])]
    return layers


def fiambre_tatacoa():
    """Fiambre de la Tatacoa: el fiambre envuelto en hoja de bijao, con la lechona, el tamal y la cantimplora."""
    layers = [(OUTLINE, [leaf(6, 70, 94, 70, 30)]), ('#4e8a34', [leaf(6, 70, 94, 70, 28)]), ('#9ccc65', [rib(10, 70, 90, 70, 1)])]
    layers += [(OUTLINE, [ellipse(38, 64, 18, 10)]), ('#c9782c', [ellipse(38, 64, 16, 8)]), (OUTLINE, [ellipse(62, 66, 14, 8)]), ('#f4c430', [ellipse(62, 66, 12, 6)])]
    layers += [(OUTLINE, [circle(80, 30, 14)]), ('#78909c', [circle(80, 30, 12)]), ('#5d4037', [rect(77, 12, 6, 6)]), ('#c9a96b', [rib(66, 22, 94, 40, 1.6)])]
    return layers


def tatacoa():
    """Noche de estrellas en la Tatacoa: el desierto rojo con sus cárcavas y cactus bajo el cielo estrellado."""
    layers = [('#0d1440', [rect(4, 4, 92, 92)]), ('#1a237e', [rect(4, 40, 92, 30)])]
    layers.append(('#ffffff', [circle(14, 12, 1.2), circle(30, 22, 1), circle(46, 10, 1.4), circle(62, 20, 1), circle(80, 12, 1.2), circle(88, 28, 1), circle(22, 34, 0.9), circle(56, 34, 0.9), circle(72, 40, 1)]))
    layers.append(('#e3f2fd80', [ellipse(50, 26, 40, 4, -15)]))
    layers += [('#c0582b', ['M 4 96 L 4 66 L 16 58 L 26 66 L 36 54 L 50 64 L 62 52 L 74 62 L 86 56 L 96 64 L 96 96 Z']), ('#8e3a1a', ['M 20 96 L 26 70 L 32 96 Z', 'M 56 96 L 62 62 L 70 96 Z', 'M 84 96 L 86 66 L 92 96 Z'])]
    layers += [(OUTLINE, [rect(40, 64, 7, 28)]), ('#558b2f', [rect(41.5, 65.5, 4, 26)]), ('#558b2f', [rect(34, 72, 7, 4), rect(34, 66, 4, 9), rect(46, 76, 7, 4), rect(49, 70, 4, 9)])]
    layers += [(OUTLINE, [rect(72, 74, 3, 18)]), ('#455a64', [rect(66, 70, 15, 5, -20)])]
    return layers


# Código de cada ícono (U+E001...), el nombre en src/data/icons.js y cómo se dibuja.

# ---------- Láminas del álbum (v4.3): dibujos propios en lugar de los emojis del teléfono ----------

def shape(points, color, d=2.2):
    """Figura con su borde oscuro (el borde es la misma figura agrandada d unidades)."""
    cx = sum(x for x, _ in points) / len(points)
    cy = sum(y for _, y in points) / len(points)
    return [(OUTLINE, [grow(points, cx, cy, d)]), (color, [pts(points)])]


def oval(cx, cy, rx, ry, color, rot=0, d=2.2):
    """Óvalo con su borde oscuro."""
    return [(OUTLINE, [ellipse(cx, cy, rx + d, ry + d, rot)]), (color, [ellipse(cx, cy, rx, ry, rot)])]


def bar(x0, y0, x1, y1, w, color, d=1.6):
    """Palo o barra de (x0, y0) a (x1, y1), de ancho w, con borde."""
    return [(OUTLINE, [rib(x0, y0, x1, y1, w + 2 * d)]), (color, [rib(x0, y0, x1, y1, w)])]


def note(x, y, s=1.0, color='#3e2723'):
    """Una corchea: la cabeza ovalada, la plica y la bandera."""
    return [(color, [ellipse(x, y, 4.2 * s, 3 * s, -20), rect(x + 3 * s, y - 20 * s, 1.6 * s, 20 * s),
                     f'M {x + 4.6 * s:.1f} {y - 20 * s:.1f} Q {x + 12 * s:.1f} {y - 14 * s:.1f} {x + 9 * s:.1f} {y - 6 * s:.1f} Q {x + 8 * s:.1f} {y - 12 * s:.1f} {x + 4.6 * s:.1f} {y - 15 * s:.1f} Z'])]


def nevado_tolima():
    """El Nevado del Tolima: el volcán de cono perfecto, con su nieve y el cráter, sobre las montañas verdes."""
    puffs = [(18, 20, 7), (26, 16, 8), (34, 20, 6)]
    layers = [(OUTLINE, [circle(x, y, r + 2) for x, y, r in puffs] + [rect(16, 20, 20, 7)]), ('#ffffff', [circle(x, y, r) for x, y, r in puffs] + [rect(18, 20, 16, 5)])]
    layers += shape([(6, 86), (41, 24), (59, 24), (94, 86)], '#8a9aa6')
    layers.append(('#6f7f8b', [poly(50, 24, 59, 24, 94, 86, 62, 86)]))
    layers.append(('#ffffff', [poly(41, 24, 59, 24, 68, 41, 62, 38, 57, 45, 51, 37, 45, 45, 39, 38, 32, 41)]))
    layers.append(('#d6e0e5', [poly(52, 25, 59, 24, 68, 41, 62, 38, 57, 45, 54, 33)]))
    layers.append(('#5d6d78', [ellipse(50, 24, 8, 2)]))
    layers += oval(24, 90, 26, 9, '#6aa84f') + oval(76, 91, 26, 8, '#7cb342')
    return layers


def rio_magdalena():
    """El río Magdalena: el río ancho entre orillas verdes, con un champán de techo curvo."""
    layers = oval(50, 58, 45, 34, '#8bc34a')
    river = 'M 26 26 Q 66 36 44 56 Q 22 76 58 92 L 76 90 Q 42 76 60 58 Q 84 36 40 24 Z'
    layers += [(OUTLINE, [river]), ('#4fa3d9', ['M 29 27.5 Q 66 37 46 56 Q 25 76 59 90 L 72 89 Q 39 76 58 58 Q 80 37 40 26 Z'])]
    layers.append(('#b3e0f2', [curve(46, 34, 58, 40, 52, 48, 1.2), curve(44, 70, 48, 78, 58, 82, 1.2)]))
    layers += shape([(38, 62), (58, 62), (55, 68), (41, 68)], '#8d5a32', 1.6)
    layers += [(OUTLINE, ['M 41 62 Q 48 52 55 62 Z']), ('#d7b46a', ['M 43 62 Q 48 55 53 62 Z'])]
    layers += bar(80, 46, 80, 22, 2.4, '#795548') + [('#43a047', [leaf(80, 22, 66, 18, 4), leaf(80, 22, 92, 16, 4), leaf(80, 22, 72, 10, 3.5), leaf(80, 22, 88, 8, 3.5)])]
    layers += bar(18, 60, 18, 44, 2, '#795548') + [('#388e3c', [circle(18, 40, 7)])]
    return layers


def desierto_tatacoa():
    """El desierto de la Tatacoa: las cárcavas rojas cortadas por el agua, un cactus y el sol."""
    layers = oval(22, 20, 9, 9, '#ffca28')
    land = [(4, 88), (4, 58), (14, 44), (22, 58), (30, 34), (40, 54), (50, 28), (60, 52), (70, 38), (80, 56), (90, 46), (96, 58), (96, 88)]
    layers += [(OUTLINE, [pts([(2, 90), (2, 57), (14, 41), (22, 54), (30, 31), (40, 51), (50, 25), (60, 49), (70, 35), (80, 53), (90, 43), (98, 57), (98, 90)])]), ('#c8602e', [pts(land)])]
    layers.append(('#a2471f', [rib(14, 46, 12, 86, 2.4), rib(30, 36, 28, 86, 2.6), rib(50, 30, 52, 86, 2.8), rib(70, 40, 68, 86, 2.4), rib(90, 48, 88, 86, 2.2),
                               rib(22, 58, 20, 86, 1.2), rib(40, 54, 42, 86, 1.4), rib(60, 52, 60, 86, 1.4), rib(80, 56, 78, 86, 1.2)]))
    layers.append(('#e08a4e', [poly(4, 70, 96, 66, 96, 74, 4, 78)]))
    layers += bar(74, 88, 74, 62, 6, '#4f9a3a') + bar(68, 76, 68, 66, 3.5, '#4f9a3a') + bar(80, 74, 80, 64, 3.5, '#4f9a3a')
    layers.append(('#4f9a3a', [rib(68, 76, 74, 76, 3.5), rib(74, 74, 80, 74, 3.5)]))
    return layers


def estatua_agustin():
    """San Agustín: la estatua de piedra con ojos grandes, nariz ancha y boca de colmillos cruzados."""
    layers = shape([(26, 92), (24, 22), (32, 10), (68, 10), (76, 22), (74, 92)], '#9e9a88')
    layers.append(('#86826f', [poly(24, 22, 32, 10, 68, 10, 76, 22, 76, 28, 24, 28)]))
    layers.append(('#b5b19e', [rect(30, 14, 40, 3)]))
    for ex in (39, 61):
        layers += [(OUTLINE, [circle(ex, 38, 7)]), ('#c9c5b0', [circle(ex, 38, 5.6)]), (OUTLINE, [circle(ex, 38, 2.4)])]
    layers += [(OUTLINE, [poly(44, 42, 56, 42, 60, 54, 40, 54)]), ('#a8a491', [poly(45.5, 43.5, 54.5, 43.5, 57.5, 52.5, 42.5, 52.5)])]
    layers += [(OUTLINE, [rect(34, 58, 32, 12)]), ('#4e4a3e', [rect(35.5, 59.5, 29, 9)])]
    layers.append(('#efeadb', [poly(38, 59.5, 41, 59.5, 39.5, 66), poly(59, 59.5, 62, 59.5, 60.5, 66), poly(44, 68.5, 47, 68.5, 45.5, 62), poly(53, 68.5, 56, 68.5, 54.5, 62)]))
    layers.append(('#86826f', [rib(28, 78, 50, 84, 3), rib(72, 78, 50, 84, 3)]))
    layers.append(('#7cb342', [ellipse(30, 90, 5, 2), ellipse(70, 89, 4, 2), ellipse(72, 30, 2, 3)]))
    return layers


def guayacan():
    """El guayacán amarillo: el árbol sin hojas, cubierto de flores amarillas, y las flores caídas."""
    layers = oval(50, 90, 36, 5, '#9ccc65')
    layers += [(OUTLINE, [poly(44, 90, 46, 56, 54, 56, 57, 90)]), ('#6d4c41', [poly(45.8, 88.5, 47.6, 57, 52.4, 57, 55, 88.5)])]
    layers += bar(49, 62, 34, 46, 3, '#6d4c41') + bar(51, 60, 68, 44, 3, '#6d4c41')
    blobs = [(50, 30, 20), (30, 38, 14), (70, 38, 14), (38, 22, 12), (62, 22, 12), (50, 16, 10)]
    layers.append((OUTLINE, [circle(x, y, r + 2.2) for x, y, r in blobs]))
    layers.append(('#fdd835', [circle(x, y, r) for x, y, r in blobs]))
    layers.append(('#f9a825', [circle(x, y, 2.2) for x, y in [(42, 28), (56, 24), (64, 36), (34, 40), (48, 40), (58, 14), (28, 34), (72, 30), (44, 18)]]))
    layers.append(('#fff59d', [circle(x, y, 1.8) for x, y in [(46, 24), (60, 30), (38, 34), (52, 34), (66, 42)]]))
    layers.append(('#fdd835', [ellipse(x, y, 2.4, 1.2) for x, y in [(30, 89), (38, 91), (64, 90), (72, 88), (22, 90), (78, 91)]]))
    return layers


def estrecho_magdalena():
    """El estrecho del Magdalena: el río que pasa entre dos paredes de roca, con su espuma."""
    layers = shape([(4, 90), (4, 24), (18, 12), (34, 16), (44, 36), (42, 90)], '#8d7b68')
    layers += shape([(96, 90), (96, 28), (84, 14), (66, 20), (56, 38), (58, 90)], '#7a6a58')
    layers += [(OUTLINE, [poly(42, 90, 44, 36, 56, 38, 58, 90)]), ('#3f8fc8', [poly(43.5, 90, 45.4, 38, 54.8, 39.6, 56.5, 90)])]
    layers.append(('#e3f2fd', [rib(46, 50, 48, 58, 1.6), rib(53, 60, 51, 70, 1.6), rib(47, 76, 49, 86, 1.6), rib(54, 44, 53, 50, 1.2)]))
    layers.append(('#6d5d4c', [rib(14, 30, 30, 34, 1.6), rib(10, 52, 34, 56, 1.6), rib(12, 74, 36, 72, 1.6), rib(66, 34, 88, 30, 1.6), rib(64, 58, 90, 54, 1.6), rib(66, 76, 92, 78, 1.6)]))
    layers += oval(16, 12, 10, 4, '#558b2f', d=1.6) + oval(80, 14, 11, 4, '#558b2f', d=1.6)
    return layers


def insulso():
    """El insulso: el dulce oscuro de maíz y panela, en cuadros sobre la hoja de plátano."""
    layers = [(OUTLINE, [leaf(4, 70, 96, 62, 24)]), ('#558b2f', [leaf(6, 70, 94, 62, 21.5)]), ('#7cb342', [rib(8, 69, 92, 63, 1.4)])]
    for x, y in [(22, 50), (46, 46), (36, 62), (60, 58)]:
        layers += [(OUTLINE, [poly(x - 2, y + 2, x + 18, y - 2, x + 22, y + 10, x + 22, y + 16, x + 2, y + 20, x - 2, y + 14)]),
                   ('#6d3b1e', [poly(x, y + 3.5, x + 18, y - 0.2, x + 20.5, y + 10, x + 20.5, y + 14.6, x + 2, y + 18.4, x, y + 13)]),
                   ('#8a4f2a', [poly(x, y + 3.5, x + 18, y - 0.2, x + 20.5, y + 6.5, x + 2.5, y + 10)]),
                   ('#a8693d', [ellipse(x + 9, y + 4, 4, 1.4, -12)])]
    return layers


def asado_huilense():
    """El asado huilense: los trozos de cerdo adobado y dorado en la cazuela, con naranja agria partida."""
    layers = [(OUTLINE, ['M 4 54 Q 50 100 96 54 Z']), ('#8d4a2a', ['M 7.5 56 Q 50 95 92.5 56 Z']), ('#a85a32', [rect(6, 52, 88, 5)])]
    layers += [(OUTLINE, [ellipse(50, 54, 46, 8)]), ('#5d2f19', [ellipse(50, 54, 43, 6)])]
    for x, y, r in [(28, 44, -20), (48, 40, 10), (66, 46, 25), (40, 52, 0), (58, 54, -10)]:
        layers += oval(x, y, 11, 7, '#b5541f', r, 1.8) + [('#7a3410', [ellipse(x + 2, y + 2, 7, 3, r)]), ('#f3c27a', [ellipse(x - 3, y - 2.5, 4, 1.4, r)])]
    for x, y in [(18, 30), (82, 30)]:
        layers += oval(x, y, 11, 11, '#8bc34a') + [('#ffb74d', [circle(x, y, 8.6)]), ('#ffe0b2', [rib(x - 7, y, x + 7, y, 0.9), rib(x, y - 7, x, y + 7, 0.9), rib(x - 5, y - 5, x + 5, y + 5, 0.9), rib(x - 5, y + 5, x + 5, y - 5, 0.9)])]
    return layers


def cholupa():
    """La cholupa: la fruta redonda de cáscara amarilla pecosa, entera y partida, con su pulpa gris y semillas negras."""
    layers = oval(36, 52, 26, 30, '#d9c64a')
    layers.append(('#f3e7a0', [circle(x, y, 1.4) for x, y in [(26, 40), (34, 34), (44, 42), (24, 58), (40, 60), (30, 70), (48, 54), (20, 48), (36, 48), (44, 70)]]))
    layers.append(('#fff8d0', [ellipse(26, 36, 6, 3, -40)]))
    layers += bar(38, 22, 44, 8, 2.4, '#6d4c41') + [('#558b2f', [leaf(44, 12, 62, 4, 6)])]
    layers += oval(72, 66, 22, 22, '#d9c64a') + [('#f1ead2', [circle(72, 66, 17)]), ('#cfc7ad', [circle(72, 66, 13)])]
    layers.append(('#212121', [ellipse(72 + 9 * math.cos(a), 66 + 9 * math.sin(a), 2.2, 1.5, math.degrees(a)) for a in [i * math.pi / 5 for i in range(10)]] + [circle(72, 66, 2), circle(68, 62, 1.6), circle(76, 70, 1.6)]))
    return layers


def mistela():
    """La mistela: el frasco de vidrio con la bebida dulce de frutas, las moras y uchuvas adentro, y el vasito servido."""
    layers = [(OUTLINE, ['M 22 92 Q 14 92 14 80 L 14 46 Q 14 34 26 32 L 26 22 L 50 22 L 50 32 Q 62 34 62 46 L 62 80 Q 62 92 54 92 Z'])]
    layers.append(('#e3f2f8', ['M 23 89.5 Q 16.5 89.5 16.5 80 L 16.5 46 Q 16.5 36.5 28.5 34.5 L 28.5 24.5 L 47.5 24.5 L 47.5 34.5 Q 59.5 36.5 59.5 46 L 59.5 80 Q 59.5 89.5 53 89.5 Z']))
    layers.append(('#e65100', ['M 23 89.5 Q 16.5 89.5 16.5 80 L 16.5 52 L 59.5 52 L 59.5 80 Q 59.5 89.5 53 89.5 Z']))
    layers.append(('#4a148c', [circle(x, y, 3.2) for x, y in [(26, 74), (44, 80), (34, 62), (50, 66)]]))
    layers.append(('#fbc02d', [circle(x, y, 3) for x, y in [(36, 82), (48, 58), (24, 60), (40, 70)]]))
    layers.append(('#ffffff', [rect(19, 42, 3, 34)]))
    layers += [(OUTLINE, [rect(24, 12, 28, 12)]), ('#a1887f', [rect(26, 14, 24, 8)]), ('#8d6e63', [rect(26, 18, 24, 1.4)])]
    layers += [(OUTLINE, [poly(68, 66, 90, 66, 87, 92, 71, 92)]), ('#e3f2f8', [poly(70.4, 68, 87.6, 68, 85.2, 89.6, 72.8, 89.6)]), ('#e65100', [poly(71, 74, 87, 74, 85.2, 89.6, 72.8, 89.6)])]
    layers.append(('#4a148c', [circle(78, 82, 2.4)]))
    return layers


def house_front(x, y, w, h, wall, roof, door, window=True):
    """Casa de pueblo de frente: paredes, techo de teja a dos aguas, puerta y ventana."""
    layers = [(OUTLINE, [poly(x - 1.5, y + h + 1.5, x - 1.5, y - 1, x + w + 1.5, y - 1, x + w + 1.5, y + h + 1.5)]), (wall, [rect(x, y, w, h)])]
    layers += [(OUTLINE, [poly(x - 5, y + 1, x + w / 2, y - h * 0.55, x + w + 5, y + 1)]), (roof, [poly(x - 2, y - 0.5, x + w / 2, y - h * 0.48, x + w + 2, y - 0.5)])]
    layers += [(door, [rect(x + w * 0.38, y + h * 0.42, w * 0.24, h * 0.58)])]
    if window:
        layers += [('#5d4037', [rect(x + w * 0.1, y + h * 0.2, w * 0.18, h * 0.3), rect(x + w * 0.72, y + h * 0.2, w * 0.18, h * 0.3)])]
    return layers


def pueblo_natagaima():
    """Natagaima: la calle de casas de colores con techo de teja, la iglesia y el bizcocho de achira."""
    layers = oval(50, 92, 46, 4, '#d7ccc8', d=1.4)
    layers += shape([(42, 90), (42, 26), (50, 12), (58, 26), (58, 90)], '#f5f0e6', 1.8)
    layers += [(OUTLINE, [rect(48.5, 4, 3, 10), rect(45, 7, 10, 2.6)]), ('#8d6e63', [rect(47, 34, 6, 8), rect(46, 70, 8, 20)])]
    layers += house_front(6, 60, 32, 30, '#ffe082', '#c0592b', '#2e7d32') + house_front(62, 60, 32, 30, '#90caf9', '#c0592b', '#c62828')
    layers += biscuit(30, 50, 0.7, 20)
    return layers


def pijao():
    """Los pijao: una mujer del pueblo pijao, con su cabello largo, la manta de franjas y collar de semillas."""
    layers = oval(50, 90, 34, 6, '#a1887f', d=1.4)
    layers += [(OUTLINE, ['M 18 96 Q 20 58 50 56 Q 80 58 82 96 Z']), ('#f5f0e6', ['M 21 96 Q 23 61 50 59 Q 77 61 79 96 Z'])]
    layers.append(('#c62828', [poly(22, 80, 78, 80, 79, 86, 21, 86)]))
    layers.append(('#1b1b1b', [poly(22, 88, 78, 88, 79, 91, 21, 91)]))
    layers.append(('#fbc02d', [poly(30 + 8 * i, 80, 34 + 8 * i, 86, 26 + 8 * i, 86) for i in range(6)]))
    layers += [(OUTLINE, ['M 30 62 Q 26 18 50 14 Q 74 18 70 62 Z']), ('#2b1d14', ['M 32 61 Q 28.5 20 50 16.5 Q 71.5 20 68 61 Z'])]
    layers += oval(50, 38, 15, 18, '#a8693f', d=1.8)
    layers.append(('#2b1d14', ['M 34 30 Q 50 14 66 30 Q 58 24 50 24 Q 42 24 34 30 Z']))
    layers.append(('#c62828', [poly(34, 28, 66, 28, 66, 32, 34, 32)]))
    layers.append(('#2b1d14', [circle(44, 40, 1.8), circle(56, 40, 1.8), curve(45, 48, 50, 51, 55, 48, 1.4)]))
    layers.append(('#8d3b22', [circle(39 + 3.6 * i, 60 + abs(i - 3) * -0.8, 1.6) for i in range(7)]))
    return layers


def horno_barro():
    """El horno de barro: la cúpula de barro con la boca encendida, la leña al lado y el humo."""
    layers = oval(50, 88, 44, 6, '#a1887f', d=1.6)
    layers += [(OUTLINE, ['M 10 86 Q 12 30 50 28 Q 88 30 90 86 Z']), ('#c1673a', ['M 13 86 Q 15 33 50 31 Q 85 33 87 86 Z'])]
    layers.append(('#d98552', [ellipse(36, 48, 10, 5, -30)]))
    layers += [(OUTLINE, ['M 34 86 Q 34 58 50 58 Q 66 58 66 86 Z']), ('#3e2723', ['M 36 86 Q 36 60 50 60 Q 64 60 64 86 Z'])]
    layers += [('#ff7043', ['M 40 86 Q 42 72 46 66 Q 47 76 50 70 Q 53 64 56 74 Q 58 68 60 86 Z']), ('#ffca28', ['M 45 86 Q 46 78 49 74 Q 51 80 53 76 Q 55 80 55 86 Z'])]
    layers += bar(70, 90, 94, 84, 5, '#795548') + bar(72, 84, 92, 92, 5, '#8d6e63')
    layers.append(('#b0bec5', ['M 50 28 Q 44 18 52 10 Q 58 4 54 0 L 58 0 Q 62 6 56 12 Q 50 20 54 28 Z']))
    return layers


def sanjuanero():
    """El sanjuanero: la pareja bailando, ella con la falda de colores y flores, él con sombrero y pañuelo rojo."""
    layers = oval(50, 94, 44, 4, '#d7ccc8', d=1.2)
    # Ella: la falda ancha, la blusa blanca y el moño con flores.
    skirt = [(6, 92), (16, 60), (36, 60), (46, 92)]
    layers += shape(skirt, '#e53935')
    layers.append(('#fdd835', [poly(9, 82, 43, 82, 45, 88, 7, 88)]))
    layers.append(('#1e88e5', [poly(12, 72, 40, 72, 41.5, 77, 10.5, 77)]))
    layers.append(('#ffffff', [circle(x, 66, 2) for x in (18, 26, 34)] + [circle(x, 85, 1.6) for x in (14, 24, 34)]))
    layers += shape([(17, 62), (19, 42), (33, 42), (35, 62)], '#ffffff', 1.8)
    layers += bar(19, 46, 8, 34, 3, '#c68642') + bar(33, 46, 44, 38, 3, '#c68642')
    layers += oval(26, 34, 7.5, 8, '#c68642', d=1.8) + [('#2b1d14', ['M 18 32 Q 26 20 34 32 Q 30 27 26 27 Q 22 27 18 32 Z']), ('#2b1d14', [circle(31, 26, 4)])]
    layers.append(('#ec407a', [circle(36, 24, 3)]))
    # Él: pantalón, camisa blanca, pañuelo rojo y sombrero.
    layers += shape([(60, 92), (62, 66), (70, 66), (69, 92)], '#3e2723', 1.6) + shape([(72, 92), (71, 66), (79, 66), (81, 92)], '#3e2723', 1.6)
    layers += shape([(58, 68), (60, 42), (80, 42), (82, 68)], '#ffffff', 1.8)
    layers += [(OUTLINE, [poly(62, 42, 78, 42, 70, 54)]), ('#d32f2f', [poly(64, 43, 76, 43, 70, 51.5)])]
    layers += bar(60, 46, 48, 40, 3, '#a1693f') + bar(80, 46, 90, 30, 3, '#a1693f')
    layers += oval(70, 34, 7.5, 8, '#a1693f', d=1.8)
    layers += oval(70, 26, 14, 3.2, '#f5e6c4', d=1.8) + [(OUTLINE, ['M 62 26 Q 62 14 70 14 Q 78 14 78 26 Z']), ('#f5e6c4', ['M 63.5 25.5 Q 63.5 15.5 70 15.5 Q 76.5 15.5 76.5 25.5 Z']), ('#3e2723', [rect(63.5, 22, 13, 2.4)])]
    return layers


def tiple_shape(cx, cy, s=1.0, rot=0):
    """El tiple: la caja de madera clara en forma de ocho, la boca, el puente, el mástil y las doce clavijas."""
    def rp(x, y):
        a = math.radians(rot)
        return (cx + (x * math.cos(a) - y * math.sin(a)) * s, cy + (x * math.sin(a) + y * math.cos(a)) * s)
    def P(*xy):
        return pts([rp(x, y) for x, y in zip(xy[0::2], xy[1::2])])
    def C(x, y, r):
        return pts([rp(x + r * math.cos(t * math.pi / 24), y + r * math.sin(t * math.pi / 24)) for t in range(48)])
    layers = [(OUTLINE, [C(0, 18, 17), C(0, -2, 13.5), P(-3.5, -12, 3.5, -12, 3.5, -46, -3.5, -46)])]
    layers += [('#d9a15e', [C(0, 18, 15), C(0, -2, 11.5)]), ('#e8bf86', [C(-4, 22, 6)])]
    layers += [('#6d4c41', [P(-2.2, -12, 2.2, -12, 2.2, -45, -2.2, -45)]), (OUTLINE, [P(-5, -45, 5, -45, 4, -56, -4, -56)]), ('#5d4037', [P(-3.6, -46, 3.6, -46, 2.8, -54.6, -2.8, -54.6)])]
    layers += [('#3e2723', [C(0, 4, 4.6), P(-7, 27, 7, 27, 7, 30, -7, 30)])]
    layers += [('#f5f5f5', [P(-1.6 + 1.05 * i, -45, -1.3 + 1.05 * i, -45, -1.3 + 1.05 * i, 28, -1.6 + 1.05 * i, 28) for i in range(4)])]
    layers += [('#fafafa', [C(-6.5, -48 - 2.6 * i, 1.3) for i in range(3)] + [C(6.5, -48 - 2.6 * i, 1.3) for i in range(3)])]
    return layers


def tiple():
    """El tiple: la guitarra pequeña de doce cuerdas en cuatro órdenes, de madera clara."""
    return tiple_shape(52, 58, 1.0, 18)


def tambora():
    """La tambora: el tambor de madera con dos parches de cuero, amarrado con cuerdas, y sus dos baquetas."""
    layers = bar(28, 30, 60, 6, 3, '#8d6e63') + bar(72, 30, 40, 6, 3, '#8d6e63')
    layers += [(OUTLINE, [rect(14, 38, 72, 42), ellipse(50, 80, 38, 9)]), ('#a0522d', [rect(16, 40, 68, 40), ellipse(50, 80, 36, 7.5)])]
    layers += oval(50, 38, 36, 9, '#f3e5c8')
    layers.append(('#7a3a18', [rect(16, 44, 68, 4), rect(16, 72, 68, 4)]))
    layers.append(('#f5e6c4', [rib(16 + 8.5 * i, 48, 24.5 + 8.5 * i, 72, 1.6) for i in range(8)] + [rib(24.5 + 8.5 * i, 48, 16 + 8.5 * i, 72, 1.6) for i in range(8)]))
    layers.append(('#ffffff', [ellipse(40, 36, 12, 3)]))
    return layers


def rajalena():
    """La rajaleña: el tiple, la carrasca de dientes que se raspa con un palito y las coplas que se cantan."""
    layers = tiple_shape(32, 60, 0.82, -20)
    layers += [(OUTLINE, [rect(60, 18, 9, 70, 18)]), ('#c8a165', [rect(61.6, 19.6, 5.8, 66.8, 18)])]
    layers.append(('#7a5230', [rect(58 + 0.3 * i, 26 + 5.6 * i, 12, 1.3, 18) for i in range(11)]))
    layers += bar(82, 30, 74, 70, 2.4, '#5d4037')
    layers += note(84, 18, 0.7) + note(16, 18, 0.6)
    return layers


def bambuco():
    """El bambuco: el pañuelo rojo que se agita al bailar, el sombrero aguadeño y la música."""
    layers = [(OUTLINE, ['M 8 40 Q 30 22 52 34 Q 62 52 50 74 Q 30 62 8 40 Z']), ('#d32f2f', ['M 11 40.5 Q 30 25 50 36 Q 59 52 49 70.5 Q 30 60 11 40.5 Z'])]
    layers.append(('#ffcdd2', [rib(14, 41, 48, 36, 1.2), rib(48, 38, 48, 68, 1.2)]))
    layers += oval(66, 80, 30, 8, '#f5e6c4') + [(OUTLINE, ['M 50 80 Q 50 56 66 56 Q 82 56 82 80 Z']), ('#f5e6c4', ['M 51.5 79 Q 51.5 57.5 66 57.5 Q 80.5 57.5 80.5 79 Z']), ('#3e2723', [rect(51.5, 72, 29, 3.4)])]
    layers += note(68, 30, 0.9) + note(84, 22, 0.8) + note(28, 86, 0.6)
    return layers


def ibague_musical():
    """Ibagué, ciudad musical: el conservatorio de columnas blancas y la música que sale de él."""
    layers = shape([(10, 50), (50, 30), (90, 50)], '#f5f0e6', 1.8)
    layers += [(OUTLINE, [rect(12, 50, 76, 6), rect(8, 86, 84, 8)]), ('#e8dcc4', [rect(13.5, 51.5, 73, 3), rect(9.5, 87.5, 81, 5)])]
    for x in (18, 34, 50, 66, 82):
        layers += [(OUTLINE, [rect(x - 4.5, 56, 9, 31)]), ('#fafafa', [rect(x - 3, 56, 6, 31)]), ('#d7ccc8', [rect(x + 0.8, 56, 1.6, 31)])]
    layers.append(('#c0a060', [circle(50, 43, 3.4)]))
    layers += note(26, 22, 0.8, '#1565c0') + note(50, 14, 0.9, '#6a1b9a') + note(74, 22, 0.8, '#c62828')
    return layers


def sombrero_suaza():
    """El sombrero de Suaza: el sombrero fino de palma de iraca, de ala ancha y cinta negra."""
    layers = oval(50, 66, 46, 15, '#efe3c2')
    layers.append(('#e2d3ab', [ellipse(50, 66, 34, 9)]))
    layers += [(OUTLINE, ['M 26 66 Q 24 30 50 28 Q 76 30 74 66 Z']), ('#f3e9cf', ['M 28 65 Q 26.5 32 50 30.5 Q 73.5 32 72 65 Z'])]
    layers.append(('#d9c79b', [curve(30, 50, 50, 46, 70, 50, 0.9), curve(29, 40, 50, 36, 71, 40, 0.9), curve(8, 66, 50, 82, 92, 66, 0.9), curve(18, 70, 50, 80, 82, 70, 0.8)]))
    layers.append(('#1b1b1b', ['M 27 56 Q 50 62 73 56 L 73.6 62 Q 50 68 26.6 62 Z']))
    layers.append(('#fff8e1', [ellipse(40, 38, 4, 7, 15)]))
    return layers


def chiva_pitalito():
    """La chiva de Pitalito: la chivita de cerámica pintada de colores, con su escalera y la carga en el techo."""
    layers = [(OUTLINE, [rect(8, 34, 80, 44), poly(88, 52, 96, 54, 96, 78, 88, 78)])]
    layers += [('#ffd54f', [rect(10, 36, 76, 40)]), ('#ffca28', [poly(88, 54, 94.5, 55.5, 94.5, 76.5, 88, 76.5)])]
    layers.append(('#e53935', [rect(10, 36, 76, 5), rect(10, 68, 76, 4)]))
    layers.append(('#1e88e5', [rect(10, 62, 76, 4)]))
    layers.append(('#43a047', [poly(10 + 6 * i, 72, 13 + 6 * i, 76, 16 + 6 * i, 72) for i in range(13)]))
    for x in (14, 28, 42, 56, 70):
        layers += [(OUTLINE, [rect(x, 44, 11, 14)]), ('#b3e5fc', [rect(x + 1.4, 45.4, 8.2, 11.2)]), ('#8d6e63', [circle(x + 5.5, 51, 2.4)])]
    layers += [(OUTLINE, [rect(4, 36, 3, 40), rect(4, 44, 6, 1.6), rect(4, 54, 6, 1.6), rect(4, 64, 6, 1.6)])]
    layers += oval(24, 30, 9, 5, '#a1887f', d=1.6) + oval(46, 29, 9, 6, '#7cb342', d=1.6) + oval(68, 30, 10, 5, '#ef6c00', d=1.6)
    layers.append(('#fdd835', [leaf(40, 28, 54, 24, 3), leaf(40, 31, 54, 30, 3)]))
    for x in (24, 72):
        layers += oval(x, 80, 8, 8, '#263238', d=1.8) + [('#b0bec5', [circle(x, 80, 3)])]
    return layers


def brunido():
    """El bruñido: la piedra de río que pule la cazuela de barro hasta dejarla brillante."""
    layers = black_pot(44, 58, 1.35)
    layers.append(('#9e9e9e', [rib(26, 50, 42, 44, 2.4), rib(30, 58, 44, 52, 1.6)]))
    layers += oval(76, 40, 12, 8, '#b0bec5', -25) + [('#eceff1', [ellipse(72, 37, 5, 2.4, -25)])]
    layers.append(('#ffffff', [poly(60, 26, 62, 32, 68, 34, 62, 36, 60, 42, 58, 36, 52, 34, 58, 32), poly(88, 60, 89, 63, 92, 64, 89, 65, 88, 68, 87, 65, 84, 64, 87, 63)]))
    return layers


def canasto():
    """El canasto: tejido de bejuco con asa, lleno del mercado: plátanos, cebolla y tomates."""
    layers = [(OUTLINE, ['M 22 50 Q 50 2 78 50 L 74 50 Q 50 10 26 50 Z'])]
    layers.append(('#a1693f', ['M 23.6 49 Q 50 5 76.4 49 L 75.4 49 Q 50 9 24.6 49 Z']))
    layers += [('#fdd835', [leaf(30, 50, 58, 30, 6), leaf(36, 50, 66, 34, 6)]), ('#7cb342', [rib(56, 30, 60, 26, 2), rib(64, 34, 68, 30, 2)])]
    layers += oval(66, 46, 6, 6, '#e53935', d=1.6) + oval(56, 48, 5, 5, '#e53935', d=1.6) + [('#43a047', [rib(40, 50, 34, 26, 2.4), rib(42, 50, 42, 24, 2.4)])]
    layers += [(OUTLINE, [poly(12, 48, 88, 48, 78, 92, 22, 92)]), ('#c68a4a', [poly(14.5, 50, 85.5, 50, 76.4, 90, 23.6, 90)])]
    layers.append(('#9c6430', [poly(15 + 0.25 * k, 56 + 8 * k, 85 - 0.25 * k, 56 + 8 * k, 84.5 - 2.2 * k, 59 + 8 * k, 15.5 + 2.2 * k, 59 + 8 * k) for k in range(4)]))
    layers.append(('#e2b07a', [rib(22 + 8 * i, 51, 26 + 6.4 * i, 89, 1.4) for i in range(8)]))
    layers += [(OUTLINE, [rect(10, 46, 80, 6)]), ('#a1693f', [rect(11.5, 47.5, 77, 3)])]
    return layers


def rejo():
    """El rejo: el lazo de cuero trenzado, enrollado, con la punta y la argolla."""
    layers = []
    for rx, ry in [(40, 26), (33, 20), (26, 14)]:
        layers += [(OUTLINE, [ellipse(50, 50, rx + 4, ry + 4)]), ('#8d5a32', [ellipse(50, 50, rx + 2, ry + 2)]), ('#fff8ec', [ellipse(50, 50, rx - 2, ry - 2)])]
    for rx, ry in [(40, 26), (33, 20), (26, 14)]:
        layers.append(('#5d3a1e', [rib(50 + rx * math.cos(a), 50 + ry * math.sin(a), 50 + (rx + 3) * math.cos(a + 0.09), 50 + (ry + 3) * math.sin(a + 0.09), 1.1) for a in [i * math.pi / 14 for i in range(28)]]))
    layers += bar(88, 54, 96, 88, 4, '#8d5a32') + oval(92, 90, 5, 4, '#bdbdbd', d=1.6)
    return layers


def malecon_neiva():
    """El malecón de Neiva: el paseo a la orilla del Magdalena, con baranda, farol, palma y el atardecer."""
    layers = oval(70, 26, 10, 10, '#ffb74d')
    layers += [(OUTLINE, [rect(2, 66, 96, 30)]), ('#4fa3d9', [rect(3.5, 67.5, 93, 27)]), ('#b3e0f2', [rib(10, 76, 30, 76, 1.4), rib(50, 84, 74, 84, 1.4), rib(70, 72, 88, 72, 1.4)])]
    layers += [(OUTLINE, [rect(2, 56, 96, 10)]), ('#d7ccc8', [rect(3.5, 57.5, 93, 7)])]
    layers += [(OUTLINE, [rect(2, 46, 96, 2.6)] + [rect(4 + 12 * i, 46, 2.4, 11) for i in range(8)])]
    layers += bar(24, 56, 24, 22, 2.4, '#37474f') + oval(24, 20, 4, 4, '#ffee58', d=1.6)
    layers += bar(76, 56, 70, 18, 3, '#795548') + [('#2e7d32', [leaf(70, 18, 54, 16, 5), leaf(70, 18, 86, 12, 5), leaf(70, 18, 60, 6, 4), leaf(70, 18, 82, 2, 4), leaf(70, 18, 70, 2, 4)])]
    return layers


def fiesta_sanpedro():
    """El San Pedro: la corona de la reina, las banderitas y los fuegos artificiales de la fiesta."""
    layers = [(OUTLINE, [curve(2, 10, 50, 30, 98, 10, 1.4)])]
    cols = ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#8e24aa', '#fb8c00', '#e53935']
    for i, c in enumerate(cols):
        x = 8 + 14 * i
        y = 10 + 20 * (1 - ((x - 50) / 48) ** 2) * 0.5
        layers += [(OUTLINE, [poly(x - 6, y - 1, x + 6, y - 1, x, y + 12)]), (c, [poly(x - 4.6, y, x + 4.6, y, x, y + 9.8)])]
    for cx, cy, c in [(20, 44, '#ffca28'), (80, 42, '#ec407a')]:
        layers.append((c, [rib(cx, cy, cx + 12 * math.cos(a), cy + 12 * math.sin(a), 1.6) for a in [i * math.pi / 6 for i in range(12)]]))
        layers.append(('#ffffff', [circle(cx + 14 * math.cos(a), cy + 14 * math.sin(a), 1.2) for a in [i * math.pi / 6 for i in range(12)]]))
    crown = [(26, 90), (22, 56), (36, 70), (50, 48), (64, 70), (78, 56), (74, 90)]
    layers += shape(crown, '#fbc02d')
    layers.append(('#f57f17', [rect(26, 82, 48, 4)]))
    layers += oval(50, 74, 4, 5, '#e53935', d=1.4) + oval(34, 78, 3, 3, '#1e88e5', d=1.2) + oval(66, 78, 3, 3, '#43a047', d=1.2)
    layers.append(('#fff9c4', [circle(22, 56, 2.4), circle(50, 48, 2.6), circle(78, 56, 2.4)]))
    return layers


def observatorio():
    """El observatorio de la Tatacoa: la cúpula con el telescopio asomado bajo el cielo lleno de estrellas."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#1a2350', [rect(4, 4, 92, 92)])]
    layers.append(('#ffffff', [circle(x, y, r) for x, y, r in [(14, 14, 1.4), (30, 22, 1), (46, 10, 1.6), (66, 18, 1.2), (86, 12, 1.5), (78, 34, 1), (12, 34, 1.2), (56, 28, 0.9), (92, 46, 1.2), (24, 46, 1)]]))
    layers.append(('#b0b8e0', [ellipse(60, 22, 34, 3.4, -18)]))
    layers += [('#c8602e', [poly(4, 96, 4, 72, 18, 66, 30, 76, 44, 70, 56, 80, 72, 68, 86, 74, 96, 70, 96, 96)]), ('#a2471f', [rib(18, 68, 16, 94, 2), rib(72, 70, 74, 94, 2)])]
    layers += [(OUTLINE, [rect(30, 66, 40, 22), 'M 28 66 Q 28 40 50 40 Q 72 40 72 66 Z']), ('#eceff1', [rect(31.5, 66, 37, 20.5)]), ('#cfd8dc', ['M 29.5 65 Q 29.5 41.5 50 41.5 Q 70.5 41.5 70.5 65 Z'])]
    layers.append(('#37474f', [poly(46, 41, 54, 41, 55, 64, 45, 64)]))
    layers += bar(50, 56, 66, 34, 5, '#90a4ae')
    layers += [('#5d4037', [rect(46, 74, 8, 12.5)])]
    return layers


def fosil_tortuga():
    """Los fósiles de la Tatacoa: el caparazón de una tortuga gigante convertido en piedra, con su pincel."""
    layers = shape([(4, 80), (8, 30), (30, 18), (70, 16), (94, 30), (96, 78), (70, 90), (24, 90)], '#c9b18a')
    layers.append(('#b49a72', [ellipse(20, 76, 12, 4), ellipse(80, 28, 10, 3)]))
    layers += [(OUTLINE, [ellipse(50, 54, 32, 24)]), ('#a08560', [ellipse(50, 54, 29.5, 21.5)])]
    hexes = [(50, 54), (36, 46), (64, 46), (36, 62), (64, 62), (50, 40), (50, 68)]
    for x, y in hexes:
        layers += [('#7a6244', [pts([(x + 8 * math.cos(a), y + 7 * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]])]),
                   ('#c2a77d', [pts([(x + 6 * math.cos(a), y + 5.2 * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]])])]
    layers += oval(50, 28, 6, 5, '#a08560', d=1.6) + oval(24, 44, 6, 3.4, '#a08560', 30, 1.6) + oval(76, 44, 6, 3.4, '#a08560', -30, 1.6) + oval(26, 68, 6, 3.4, '#a08560', -30, 1.6) + oval(74, 68, 6, 3.4, '#a08560', 30, 1.6)
    layers += bar(70, 92, 92, 70, 3, '#8d6e63') + [(OUTLINE, [rect(89, 60, 8, 10, 45)]), ('#f5f5f5', [rect(90.5, 61.5, 5, 7, 45)])]
    return layers


def hoyos_tatacoa():
    """Los Hoyos: la piscina de agua fresca y azul en medio de las cárcavas grises del desierto."""
    layers = [(OUTLINE, [pts([(2, 84), (2, 40), (16, 24), (28, 40), (40, 20), (54, 38), (66, 18), (80, 36), (98, 26), (98, 84)])]),
              ('#9ea4a8', [pts([(4, 82), (4, 41), (16, 27), (28, 43), (40, 23), (54, 41), (66, 21), (80, 39), (96, 29), (96, 82)])])]
    layers.append(('#7d8488', [rib(16, 28, 14, 80, 2.2), rib(40, 24, 42, 80, 2.4), rib(66, 22, 64, 80, 2.4), rib(84, 34, 86, 80, 2)]))
    layers += oval(50, 74, 38, 14, '#d7ccc8') + [(OUTLINE, [ellipse(50, 74, 30, 9)]), ('#26c6da', [ellipse(50, 74, 28, 7.5)]), ('#b2ebf2', [rib(34, 72, 46, 72, 1.4), rib(54, 77, 66, 77, 1.4)])]
    layers += bar(76, 64, 76, 76, 1.4, '#cfd8dc') + bar(80, 64, 80, 76, 1.4, '#cfd8dc')
    layers.append(('#cfd8dc', [rect(76, 67, 4, 1.2), rect(76, 71, 4, 1.2)]))
    return layers


def cardon():
    """El cardón: el cactus alto y acanalado del desierto, con un pajarito en su nido."""
    layers = oval(50, 92, 36, 5, '#d7a86e', d=1.4)
    layers += [(OUTLINE, [rect(41, 18, 18, 76), circle(50, 18, 9), rect(17, 44, 13, 26), circle(23.5, 44, 6.5), rect(70, 34, 13, 30), circle(76.5, 34, 6.5),
                          rect(22, 62, 22, 10), rect(56, 56, 22, 10)])]
    green = '#4f9a3a'
    layers += [(green, [rect(43, 18, 14, 74), circle(50, 18, 7), rect(19, 44, 9, 24), circle(23.5, 44, 4.5), rect(72, 34, 9, 28), circle(76.5, 34, 4.5),
                        rect(24, 64, 20, 6), rect(56, 58, 20, 6)])]
    layers.append(('#3d7a2c', [rect(47, 20, 1.6, 70), rect(52, 20, 1.6, 70), rect(23, 46, 1.4, 20), rect(76, 36, 1.4, 24)]))
    layers.append(('#fff59d', [circle(x, y, 0.9) for x, y in [(45, 30), (55, 40), (45, 54), (55, 66), (45, 78), (21, 52), (79, 46)]]))
    layers += [(OUTLINE, [ellipse(50, 11, 10, 4)]), ('#a1887f', [ellipse(50, 11, 8.5, 2.8)])]
    layers += oval(50, 4, 4.5, 3.5, '#8d6e63', d=1.4) + [('#ffb74d', [poly(54, 4, 58, 3, 54, 6)]), ('#1b1b1b', [circle(52, 3, 0.8)])]
    layers.append(('#ec407a', [circle(23.5, 39, 2.4), circle(76.5, 29, 2.4)]))
    return layers


def lechona_v2():
    """Lechona tolimense: el cerdo entero dorado, con cabeza, orejas y patas, abierto por encima con el relleno de arroz y arveja, en la batea."""
    layers = [(OUTLINE, ['M 2 70 Q 50 104 98 70 Z']), ('#8d5a32', ['M 6 72 Q 50 99 94 72 Z']), ('#a8703f', [rect(6, 69.5, 88, 3.5)])]
    layers += oval(36, 70, 6, 3.4, '#b0652a', d=1.6) + oval(80, 70, 6, 3.4, '#b0652a', d=1.6)
    layers += oval(58, 54, 34, 16, '#c9782c')
    layers.append(('#a85c1e', [ellipse(60, 64, 30, 5)]))
    layers.append(('#e8a050', [ellipse(46, 50, 8, 2.4, -10), ellipse(80, 52, 6, 2, 15)]))
    layers += [(OUTLINE, [ellipse(60, 45, 22, 7)]), ('#f2c94c', [ellipse(60, 45, 20, 5.4)])]
    layers.append(('#7cb342', [circle(x, y, 1.7) for x, y in [(50, 44), (58, 47), (66, 43), (72, 46), (54, 41), (63, 49)]]))
    layers.append(('#8d4a2a', [ellipse(x, y, 2.6, 1.6) for x, y in [(46, 46), (62, 42), (70, 48)]]))
    layers += bar(92, 52, 96, 46, 1.4, '#b0652a')
    layers += oval(20, 50, 13, 12, '#c9782c')
    layers += [(OUTLINE, [poly(14, 41, 24, 37, 12, 30)]), ('#b0652a', [poly(15.5, 40, 22.4, 37.4, 13.8, 32.6)])]
    layers += [(OUTLINE, [poly(24, 40, 32, 38, 28, 30)]), ('#b0652a', [poly(25.4, 39.4, 30.6, 38, 28, 32.6)])]
    layers += oval(9, 55, 5.4, 6.4, '#d98a5a', d=1.6) + [('#5b3a24', [ellipse(7.6, 53, 1, 1.6), ellipse(7.6, 57.5, 1, 1.6)])]
    layers.append(('#3e2723', [curve(16, 47, 19, 49.5, 22, 47, 1.3)]))
    layers.append(('#e8a050', [ellipse(22, 44, 4, 1.6, -20)]))
    return layers



# ---------- Láminas del Eje Cafetero (v4.3) ----------

def aguadeno_hat(cx, cy, s=1.0, band='#1b1b1b'):
    """Sombrero aguadeño: blanco, de iraca, con la copa hundida adelante y la cinta negra."""
    def S(v):
        return v * s
    layers = [(OUTLINE, [ellipse(cx, cy, S(30), S(8))]), ('#f7f1e1', [ellipse(cx, cy, S(28), S(6.4))])]
    layers += [(OUTLINE, [f'M {cx - S(16)} {cy} Q {cx - S(17)} {cy - S(22)} {cx} {cy - S(20)} Q {cx + S(17)} {cy - S(22)} {cx + S(16)} {cy} Z']),
               ('#fbf6ea', [f'M {cx - S(14.5)} {cy - S(0.5)} Q {cx - S(15.5)} {cy - S(20.5)} {cx} {cy - S(18.5)} Q {cx + S(15.5)} {cy - S(20.5)} {cx + S(14.5)} {cy - S(0.5)} Z'])]
    layers.append(('#e8dfc6', [curve(cx - S(8), cy - S(19), cx, cy - S(13), cx + S(8), cy - S(19), S(1.6))]))
    layers.append((band, [f'M {cx - S(15)} {cy - S(6)} Q {cx} {cy - S(3)} {cx + S(15)} {cy - S(6)} L {cx + S(15.4)} {cy - S(1.5)} Q {cx} {cy + S(1.5)} {cx - S(15.4)} {cy - S(1.5)} Z']))
    return layers


def arriero():
    """El arriero: con sombrero aguadeño, ruana al hombro, carriel terciado, pantalón remangado y alpargatas, con el zurriago."""
    layers = oval(50, 95, 26, 3, '#d7ccc8', d=1.2)
    layers += shape([(38, 94), (40, 66), (49, 66), (48, 94)], '#eeeeee', 1.6) + shape([(52, 94), (51, 66), (60, 66), (62, 94)], '#eeeeee', 1.6)
    layers += oval(42, 94, 6, 2.4, '#d7c9a7', d=1.4) + oval(58, 94, 6, 2.4, '#d7c9a7', d=1.4)
    layers += shape([(34, 70), (36, 38), (64, 38), (66, 70)], '#ffffff', 1.8)
    layers += [(OUTLINE, ['M 30 66 Q 32 38 50 36 L 46 44 Q 38 48 36 68 Z']), ('#c62828', ['M 31.8 65 Q 34 40 48 38 L 45 43.5 Q 37 48 35 66 Z']), ('#1b1b1b', [rib(33, 52, 42, 44, 1.4)])]
    layers.append(('#6d4c41', [rib(58, 38, 40, 66, 2)]))
    layers += shape([(34, 62), (46, 62), (46, 74), (34, 74)], '#7b4a2a', 1.8) + [('#f5f5f5', [ellipse(40, 68, 4, 3)]), ('#5d3a1e', [circle(38, 67, 1), circle(42, 70, 1)])]
    layers += bar(64, 42, 76, 60, 3.4, '#a1693f') + bar(76, 60, 84, 30, 1.6, '#5d4037')
    layers += oval(50, 28, 8, 9, '#c68642', d=1.8)
    layers.append(('#2b1d14', [rib(43, 32, 57, 32, 1.4), circle(47, 27, 1), circle(53, 27, 1)]))
    layers += aguadeno_hat(50, 22, 0.6)
    return layers


def mule(cx, cy, s=1.0, body='#6d4c41', load=True, horse=False):
    """La mula de perfil, mirando a la izquierda, con su enjalma y la carga de café (horse: caballo, de orejas cortas y crin)."""
    def P(*xy):
        return pts([(cx + x * s, cy + y * s) for x, y in zip(xy[0::2], xy[1::2])])
    def E(x, y, rx, ry, rot=0):
        return ellipse(cx + x * s, cy + y * s, rx * s, ry * s, rot)
    layers = []
    for lx in (-20, -12, 14, 22):
        layers += [(OUTLINE, [P(lx - 3, 0, lx + 3, 0, lx + 3, 28, lx - 3, 28)]), (body, [P(lx - 1.6, 0, lx + 1.6, 0, lx + 1.6, 26.6, lx - 1.6, 26.6)]), ('#3e2723', [P(lx - 2.4, 24, lx + 2.4, 24, lx + 2.4, 28, lx - 2.4, 28)])]
    layers += [(OUTLINE, [E(0, 0, 30, 13)]), (body, [E(0, 0, 28, 11)])]
    layers += [(OUTLINE, [P(-24, -2, -40, -24, -46, -20, -32, 4)]), (body, [P(-24.5, -3, -39.5, -21.6, -43.6, -19.6, -31, 2.4)])]
    layers += [(OUTLINE, [E(-46, -18, 9, 6, 20)]), (body, [E(-46, -18, 7.6, 4.6, 20)]), ('#3e2723', [E(-52, -15, 2.6, 2.2)])]
    if horse:
        layers += [(OUTLINE, [P(-41, -24, -39, -32, -35, -24)]), (body, [P(-39.8, -24, -38.8, -29.4, -36.2, -24)])]
        layers += [('#3e2723', [P(-36, -26, -22, -4, -26, -2, -40, -22)])]
    else:
        layers += [(OUTLINE, [P(-42, -24, -38, -42, -34, -24)]), (body, [P(-40.6, -24, -38, -38, -35.4, -24)])]
        layers += [(OUTLINE, [P(-38, -24, -30, -40, -30, -22)]), (body, [P(-36.4, -24, -31, -36.6, -31, -23)])]
    layers += [('#1b1b1b', [E(-44, -20, 1.2, 1.2)]), ('#3e2723', [P(28, -6, 36, 6, 34, 18, 30, 6)])]
    if load:
        layers += [(OUTLINE, [E(-8, -12, 12, 9), E(10, -12, 12, 9)]), ('#c8a165', [E(-8, -12, 10.4, 7.4), E(10, -12, 10.4, 7.4)]), ('#a1793f', [P(-14, -14, -2, -14, -2, -12.6, -14, -12.6), P(4, -14, 16, -14, 16, -12.6, 4, -12.6)])]
        layers += [(OUTLINE, [P(-16, -6, 18, -6, 18, 2, -16, 2)]), ('#c62828', [P(-14.6, -4.6, 16.6, -4.6, 16.6, 0.6, -14.6, 0.6)])]
    return layers


def mula():
    """La mula: de paso firme, cargada con dos bultos de café sobre su enjalma roja."""
    return mule(56, 54, 0.95)


def chapolera():
    """La chapolera: con pañoleta, camisa de manga larga y el canasto amarrado a la cintura, cogiendo café grano a grano."""
    layers = [('#2e7d32', [leaf(70, 20, 96, 6, 9), leaf(70, 28, 98, 40, 9)]), ('#4e342e', [rib(62, 36, 96, 16, 2)])]
    layers.append(('#d32f2f', [circle(x, y, 2.6) for x, y in [(78, 22), (82, 25), (86, 21), (74, 27), (88, 27)]]))
    layers += shape([(34, 94), (36, 66), (62, 66), (64, 94)], '#1565c0', 1.8)
    layers += shape([(32, 70), (34, 40), (62, 40), (64, 70)], '#ef6c00', 1.8) + [('#ffe0b2', [circle(x, y, 1.4) for x, y in [(40, 48), (50, 56), (56, 46), (44, 62), (58, 62)]])]
    layers += bar(60, 46, 76, 28, 3.4, '#ef6c00') + oval(78, 26, 3.4, 3.4, '#c68642', d=1.4)
    layers += bar(36, 48, 30, 66, 3.4, '#ef6c00')
    layers += [(OUTLINE, ['M 22 64 L 46 64 L 43 84 Q 34 88 25 84 Z']), ('#c8a165', ['M 24 66 L 44 66 L 41.4 82.6 Q 34 86 26.6 82.6 Z']), ('#d32f2f', [circle(30, 66, 2.4), circle(36, 65, 2.4), circle(41, 66, 2.4)]), ('#a1793f', [rib(25, 72, 43, 72, 1.2), rib(26, 78, 42, 78, 1.2)])]
    layers.append(('#5d4037', [rib(34, 64, 62, 68, 1.6)]))
    layers += oval(48, 28, 8, 9, '#c68642', d=1.8)
    layers += [(OUTLINE, ['M 38 28 Q 38 14 48 14 Q 58 14 58 28 L 62 34 L 54 26 Q 48 20 42 26 L 36 34 Z']), ('#e53935', ['M 39.6 27.4 Q 39.6 15.6 48 15.6 Q 56.4 15.6 56.4 27.4 L 58.6 31 L 53.4 24.6 Q 48 18.4 42.6 24.6 L 37.4 31 Z'])]
    layers.append(('#ffffff', [circle(44, 18, 1), circle(52, 18, 1), circle(48, 16, 1)]))
    layers.append(('#2b1d14', [circle(45, 29, 1), circle(51, 29, 1), curve(45, 33, 48, 35, 51, 33, 1.2)]))
    return layers


def carriel():
    """El carriel: el bolso de cuero del arriero, con su tapa, el parche de piel de becerro y la correa."""
    layers = [(OUTLINE, [curve(18, 40, 50, -6, 82, 40, 5)]), ('#7b4a2a', [curve(18, 40, 50, -6, 82, 40, 2.6)])]
    layers += [(OUTLINE, ['M 14 40 L 86 40 L 82 88 Q 50 96 18 88 Z']), ('#8d5a32', ['M 16.6 42.4 L 83.4 42.4 L 79.8 86 Q 50 93.4 20.2 86 Z'])]
    layers += [(OUTLINE, ['M 12 38 L 88 38 L 84 64 Q 50 74 16 64 Z']), ('#6d4128', ['M 14.6 40.4 L 85.4 40.4 L 81.8 62 Q 50 71.4 18.2 62 Z'])]
    layers += [(OUTLINE, [ellipse(50, 54, 18, 11)]), ('#f5f0e6', [ellipse(50, 54, 16, 9.4)]), ('#6d4c41', [ellipse(44, 51, 5, 3.4, 20), ellipse(56, 58, 4, 2.6, -15), ellipse(54, 49, 2.4, 1.6)])]
    layers.append(('#c8a165', [rib(20, 66, 80, 66, 1), rib(22, 84, 78, 84, 1)] + [circle(18 + 8 * i, 44, 1) for i in range(9)]))
    layers += oval(50, 68, 4, 3, '#c0a060', d=1.2)
    return layers


def aguadeno():
    """El aguadeño: el sombrero blanco de iraca tejido en Aguadas, con la copa hundida y la cinta negra."""
    layers = aguadeno_hat(50, 66, 1.45)
    layers.append(('#ece2c6', [curve(16, 66, 50, 82, 84, 66, 0.9), curve(26, 70, 50, 78, 74, 70, 0.8)]))
    return layers


def willys_side(cx, cy, s=1.0, color='#4f7a3a'):
    """El Willys de perfil, mirando a la derecha: carrocería, capó, parabrisas y las dos ruedas."""
    def P(*xy):
        return pts([(cx + x * s, cy + y * s) for x, y in zip(xy[0::2], xy[1::2])])
    def C(x, y, r):
        return circle(cx + x * s, cy + y * s, r * s)
    layers = [(OUTLINE, [P(-38, -4, -38, -20, 4, -20, 6, -24, 34, -24, 38, -18, 38, -4)]), (color, [P(-36.4, -5.6, -36.4, -18.4, 5.4, -18.4, 7.4, -22.4, 32.8, -22.4, 36.4, -17.4, 36.4, -5.6)])]
    layers += [(OUTLINE, [P(2, -20, 6, -44, 9, -44, 6, -20)]), ('#b3e5fc', [P(4.4, -21, 7.4, -41, 8, -41, 5.4, -21)])]
    layers += [('#ffe082', [C(35, -14, 2.2)]), ('#3e2723', [P(-38, -8, 38, -8, 38, -6, -38, -6)])]
    for x in (-24, 22):
        layers += [(OUTLINE, [C(x, -2, 10)]), ('#263238', [C(x, -2, 8.4)]), ('#b0bec5', [C(x, -2, 3.4)])]
    return layers


def yipao():
    """El yipao: un Willys cargado hasta el techo con bultos de café, racimos de plátano y hasta un taburete."""
    layers = oval(50, 92, 44, 3.4, '#d7ccc8', d=1.2)
    layers += willys_side(50, 88, 1.05)
    layers += [(OUTLINE, [rect(14, 30, 42, 36)]), ('#c8a165', [rect(15.6, 31.6, 38.8, 32.8)]), ('#a1793f', [rib(16, 48, 54, 48, 1.4), rib(35, 32, 35, 64, 1.4)])]
    layers += oval(26, 24, 12, 8, '#c8a165') + oval(44, 22, 11, 8, '#c8a165')
    layers += [(OUTLINE, [rect(18, 6, 4, 16), rect(34, 6, 4, 16), rect(16, 4, 24, 4)]), ('#8d6e63', [rect(19.2, 7.2, 1.6, 13.6), rect(35.2, 7.2, 1.6, 13.6), rect(17.2, 5.2, 21.6, 1.6)])]
    layers += [(OUTLINE, [leaf(58, 54, 74, 22, 9)]), ('#fdd835', [leaf(59, 52, 73, 24, 7)]), ('#7cb342', [leaf(60, 50, 72, 30, 3.4)])]
    layers += bar(66, 22, 70, 14, 2, '#6d4c41')
    return layers


def trapiche_mill():
    """El trapiche: los tres rodillos de hierro en su marco de madera, la caña que entra y el guarapo que cae a la canoa."""
    layers = [(OUTLINE, [rect(16, 12, 6, 70), rect(78, 12, 6, 70), rect(14, 10, 72, 8), rect(14, 64, 72, 8)]), ('#8d5a32', [rect(17.6, 13.6, 2.8, 66.8), rect(79.6, 13.6, 2.8, 66.8), rect(15.6, 11.6, 68.8, 4.8), rect(15.6, 65.6, 68.8, 4.8)])]
    for x in (32, 50, 68):
        layers += [(OUTLINE, [rect(x - 8, 18, 16, 46)]), ('#78909c', [rect(x - 6.4, 19.6, 12.8, 42.8)]), ('#b0bec5', [rect(x - 4, 19.6, 2.4, 42.8)]), ('#546e7a', [rect(x - 6.4, 30 + 10 * k, 12.8, 1.4) for k in range(3)])]
    layers += bar(2, 40, 26, 44, 4, '#9ccc65') + bar(4, 50, 26, 48, 4, '#8bc34a') + [('#33691e', [rib(10, 41, 10, 45, 1), rib(14, 49, 14, 53, 1)])]
    layers += [(OUTLINE, ['M 28 80 L 72 80 L 68 94 L 32 94 Z']), ('#8d5a32', ['M 30.4 81.6 L 69.6 81.6 L 66.6 92.4 L 33.4 92.4 Z']), ('#c5e17a', [rect(31, 82, 38, 4)])]
    layers.append(('#c5e17a', [rect(48.6, 72, 2.8, 10), circle(50, 74, 2)]))
    return layers


def molienda():
    """La molienda: el atado de cañas recién cortadas, el machete, y el balde de guarapo para toda la familia."""
    layers = []
    for i, x in enumerate([22, 30, 38, 46, 54]):
        col = '#9ccc65' if i % 2 else '#7cb342'
        layers += [(OUTLINE, [rect(x - 3.6, 18 + (i % 2) * 4, 7.2, 72)]), (col, [rect(x - 2.2, 19.4 + (i % 2) * 4, 4.4, 69.2)]), ('#558b2f', [rect(x - 2.2, 30 + 14 * k + (i % 2) * 4, 4.4, 1.4) for k in range(4)])]
    layers += [('#43a047', [leaf(30, 22, 6, 4, 4), leaf(38, 20, 52, 2, 4), leaf(46, 24, 70, 10, 4)])]
    layers += [(OUTLINE, [rect(14, 56, 48, 6)]), ('#a1793f', [rect(15.6, 57.6, 44.8, 2.8)])]
    layers += [(OUTLINE, ['M 62 60 L 90 60 L 86 92 L 66 92 Z']), ('#90a4ae', ['M 64.4 62.4 L 87.6 62.4 L 84 89.6 L 68 89.6 Z']), ('#c5e17a', [ellipse(76, 63, 11.6, 2.6)]), (OUTLINE, [curve(62, 62, 76, 44, 90, 62, 1.6)])]
    layers += [(OUTLINE, ['M 70 40 L 96 18 L 98 22 L 74 44 Z', rect(64, 42, 10, 5, -40)]), ('#cfd8dc', ['M 71.6 40 L 95.6 19.8 L 96.4 21.6 L 73.6 42 Z']), ('#5d4037', [rect(65.4, 43.2, 7.2, 2.6, -40)])]
    return layers


def hornilla():
    """La hornilla: el horno de ladrillo con las pailas hirviendo el guarapo, el fuego de bagazo y el humo de la chimenea."""
    layers = [(OUTLINE, [rect(6, 50, 80, 40), rect(82, 10, 12, 80)]), ('#b5542f', [rect(7.6, 51.6, 76.8, 36.8), rect(83.6, 11.6, 8.8, 76.8)])]
    layers.append(('#8e3b1c', [rect(7.6, 60 + 8 * k, 76.8, 1.2) for k in range(4)] + [rect(83.6, 20 + 10 * k, 8.8, 1.2) for k in range(7)]))
    for x in (22, 46, 70):
        layers += [(OUTLINE, [ellipse(x, 50, 11, 4.4)]), ('#78909c', [ellipse(x, 50, 9.6, 3.2)]), ('#d4a017', [ellipse(x, 49.4, 8, 2.2)])]
        layers.append(('#eceff1', [f'M {x - 3} 44 Q {x - 7} 36 {x - 2} 30 Q {x + 1} 26 {x - 1} 22 L {x + 1} 22 Q {x + 3} 27 {x} 31 Q {x - 4} 37 {x - 1} 44 Z']))
    layers += [(OUTLINE, ['M 12 90 Q 12 72 24 72 Q 36 72 36 90 Z']), ('#3e2723', ['M 14 90 Q 14 74 24 74 Q 34 74 34 90 Z']), ('#ff7043', ['M 16 90 Q 18 80 22 76 Q 23 82 26 78 Q 30 82 32 90 Z']), ('#ffca28', ['M 20 90 Q 21 84 24 82 Q 26 86 28 90 Z'])]
    layers.append(('#b0bec5', ['M 86 10 Q 82 2 88 0 L 92 0 Q 88 4 90 10 Z']))
    return layers


def panela_block(cx, cy, s=1.0):
    """Un bloque de panela: rectangular, café dorado, con la cara de arriba más clara."""
    def P(*xy):
        return pts([(cx + x * s, cy + y * s) for x, y in zip(xy[0::2], xy[1::2])])
    return [(OUTLINE, [P(-14, -4, 4, -10, 16, -4, 16, 8, -2, 14, -14, 8)]), ('#a0612b', [P(-12.4, -3, 4, -8.4, 14.4, -3, 14.4, 7, -2, 12.4, -12.4, 7)]),
            ('#c8823d', [P(-12.4, -3, 4, -8.4, 14.4, -3, -2, 2.6)]), ('#8a4f22', [P(-2, 2.6, 14.4, -3, 14.4, 7, -2, 12.4)])]


def aguapanela():
    """La aguapanela: el vaso de panela en agua con hielo y limón, y el bloque de panela al lado."""
    layers = [(OUTLINE, [poly(38, 22, 82, 22, 78, 92, 42, 92)]), ('#e3f2f8', [poly(40.6, 24.4, 79.4, 24.4, 75.6, 89.6, 44.4, 89.6)]), ('#c98a3e', [poly(41.6, 36, 78.4, 36, 75.6, 89.6, 44.4, 89.6)])]
    layers += [('#e3f2f8', [rect(48, 40, 9, 9, 15), rect(62, 46, 9, 9, -10), rect(52, 58, 8, 8, 30)]), ('#ffffff', [rect(42.6, 40, 3, 44)])]
    layers += oval(76, 22, 9, 9, '#c0ca33', d=1.8) + [('#f0f4c3', [circle(76, 22, 6.4)]), ('#c0ca33', [rib(70, 22, 82, 22, 0.8), rib(76, 16, 76, 28, 0.8)])]
    layers += panela_block(20, 82, 1.0)
    return layers


def melcocha():
    """La melcocha: la miel de panela estirada a mano en el clavo, en una trenza dorada, y los trocitos torcidos en el papel."""
    layers = [(OUTLINE, [rect(46, 4, 8, 10)]), ('#90a4ae', [rect(47.4, 5.4, 5.2, 7.2)])]
    strand = lambda k: 'M ' + ' L '.join(f'{50 + (10 + 2 * k) * math.sin(t / 6 + k * math.pi):.1f} {14 + t * 1.15:.1f}' for t in range(0, 49)) + ' ' + ' L '.join(f'{50 + (10 + 2 * k) * math.sin(t / 6 + k * math.pi) + 6:.1f} {14 + t * 1.15:.1f}' for t in range(48, -1, -1)) + ' Z'
    layers += [(OUTLINE, [rib(44, 14, 56, 70, 14), rib(56, 14, 44, 70, 14)]), ('#e9b24f', [strand(0), strand(1)])]
    layers.append(('#f9dc8c', [rib(44 + 2 * (k % 2), 18 + 8 * k, 50 + 2 * (k % 2), 22 + 8 * k, 1.6) for k in range(6)]))
    layers += [(OUTLINE, [poly(8, 84, 92, 80, 94, 94, 6, 96)]), ('#fafafa', [poly(10, 85.6, 90.4, 81.8, 92, 92.4, 8, 94.4)])]
    for x in (22, 46, 70):
        layers += [(OUTLINE, [rect(x - 9, 82, 18, 8, -6)]), ('#e9b24f', [rect(x - 7.6, 83.4, 15.2, 5.2, -6)]), ('#f9dc8c', [rib(x - 4 + 4 * k, 83.6, x - 2 + 4 * k, 88.4, 1.2) for k in range(3)])]
    return layers


def gaveras():
    """Las gaveras: el molde de madera con sus huecos llenos de miel que cuaja, y las panelas ya sacadas."""
    layers = [(OUTLINE, [poly(6, 40, 70, 28, 94, 40, 30, 54)]), ('#a1693f', [poly(9, 40.4, 70, 30.4, 90.6, 40.2, 30, 51.6)])]
    layers += [(OUTLINE, [poly(6, 40, 30, 54, 30, 62, 6, 48), poly(30, 54, 94, 40, 94, 48, 30, 62)]), ('#8d5a32', [poly(7.6, 42, 28.6, 54.4, 28.6, 59.6, 7.6, 47.2)]), ('#6d4128', [poly(31.4, 55, 92.4, 41.6, 92.4, 46.8, 31.4, 60.2)])]
    for i in range(3):
        for j in range(2):
            x = 22 + 20 * i + 6 * j
            y = 39 - 3.6 * i + 5 * j
            layers.append(('#5d2f19', [poly(x - 7, y, x + 3, y - 2.2, x + 8, y + 1, x - 2, y + 3.2)]))
    layers += panela_block(24, 80, 0.9) + panela_block(56, 84, 0.9) + panela_block(82, 74, 0.8)
    return layers


def normando():
    """La Normando: la vaca blanca con manchas cafés, de antifaz alrededor de los ojos."""
    body = '#fafafa'
    layers = []
    for lx in (26, 34, 62, 70):
        layers += [(OUTLINE, [rect(lx - 3.4, 56, 6.8, 32)]), (body, [rect(lx - 2, 56, 4, 30.6)]), ('#3e2723', [rect(lx - 2.6, 84, 5.2, 4)])]
    layers += oval(48, 50, 30, 15, body)
    layers.append(('#795548', [ellipse(42, 46, 10, 7, 10), ellipse(62, 54, 8, 6, -20), ellipse(30, 56, 5, 4)]))
    layers += [(OUTLINE, [ellipse(52, 64, 8, 4)]), ('#f8bbd0', [ellipse(52, 64, 6.6, 2.6)])]
    layers += bar(78, 46, 90, 66, 1.6, '#795548') + oval(90, 68, 2.4, 3.4, '#3e2723', d=1)
    layers += oval(16, 38, 11, 13, body, -15)
    layers.append(('#795548', [ellipse(12, 34, 5, 4.4), ellipse(21, 36, 4, 3.6)]))
    layers += oval(10, 48, 6, 4.4, '#f8bbd0', -15, 1.6) + [('#5d4037', [circle(8, 48, 1), circle(12, 49, 1)])]
    layers += [('#1b1b1b', [circle(12, 34, 1.4), circle(21, 36, 1.2)])]
    layers += [(OUTLINE, [poly(24, 28, 34, 24, 28, 32), poly(6, 28, 2, 22, 10, 26)]), ('#795548', [poly(25.6, 28, 31.4, 25.6, 28, 30.4)])]
    layers += [(OUTLINE, [curve(10, 26, 6, 16, 12, 12, 2.6), curve(22, 26, 26, 16, 20, 12, 2.6)]), ('#efe6d2', [curve(10, 26, 6.6, 17, 12, 13, 1.2), curve(22, 26, 25.4, 17, 20, 13, 1.2)])]
    return layers


def ordeno():
    """El ordeño: la ubre de la vaca, el chorro de leche que cae al balde de aluminio y el banquito."""
    layers = [(OUTLINE, ['M 4 4 L 96 4 L 96 24 Q 50 34 4 24 Z']), ('#fafafa', ['M 4 6 L 96 6 L 96 22.4 Q 50 32 4 22.4 Z']), ('#795548', [ellipse(70, 12, 14, 6)])]
    layers += [(OUTLINE, ['M 34 24 Q 50 52 66 24 Z']), ('#f8bbd0', ['M 36.6 25 Q 50 48.6 63.4 25 Z'])]
    layers += [(OUTLINE, [rect(39, 34, 5, 12, 10), rect(55, 34, 5, 12, -10)]), ('#f48fb1', [rect(40.4, 35.4, 2.2, 9.6, 10), rect(56.4, 35.4, 2.2, 9.6, -10)])]
    layers.append(('#ffffff', [rib(41, 46, 46, 70, 1.6), rib(58, 46, 54, 70, 1.6)]))
    layers += [(OUTLINE, ['M 30 66 L 70 66 L 66 94 L 34 94 Z']), ('#b0bec5', ['M 32.4 68.4 L 67.6 68.4 L 64 91.6 L 36 91.6 Z']), ('#eceff1', [rect(35, 70, 3, 18)])]
    layers += [(OUTLINE, [ellipse(50, 67, 20, 4)]), ('#fafafa', [ellipse(50, 67, 18, 2.6)])]
    layers += [(OUTLINE, [rect(74, 74, 22, 5), rect(76, 78, 3.4, 16), rect(91, 78, 3.4, 16)]), ('#a1693f', [rect(75.4, 75.4, 19.2, 2.2)])]
    return layers


def cuajada_melao():
    """Cuajada con melao: la tajada de queso fresco blanco en el plato, bañada en miel de panela."""
    layers = oval(50, 74, 44, 14, '#e3f2f8') + [('#cfe3ec', [ellipse(50, 74, 32, 8)])]
    layers += [(OUTLINE, [poly(20, 48, 62, 38, 82, 52, 82, 66, 40, 78, 20, 64)]), ('#fffdf5', [poly(22.4, 49.4, 62, 40.4, 79.6, 52.8, 79.6, 64.4, 40, 75.6, 22.4, 62.6)]), ('#f2ebd9', [poly(40, 62, 79.6, 52.8, 79.6, 64.4, 40, 75.6)])]
    layers.append(('#7a3a12', ['M 26 50 Q 40 46 60 42 Q 74 48 78 54 Q 70 56 64 54 Q 66 62 62 64 Q 58 58 50 58 Q 44 60 40 62 Q 38 68 34 66 Q 34 60 28 58 Q 22 56 26 50 Z']))
    layers.append(('#b5651d', [ellipse(46, 50, 8, 2.4, -12), ellipse(64, 48, 4, 1.4)]))
    return layers


def pandebono(cx, cy, s=1.0):
    """Un pandebono: el pan redondo de queso, dorado y abombado."""
    return oval(cx, cy, 13 * s, 10 * s, '#e3a64b', d=1.8) + [('#f5cb7a', [ellipse(cx - 3 * s, cy - 3 * s, 6 * s, 3.4 * s)]), ('#b97a2c', [circle(cx + 4 * s, cy + 3 * s, 1.2 * s), circle(cx - 5 * s, cy + 4 * s, 1 * s)])]


def kumis():
    """El kumis: el vaso de leche fermentada espesa, con su capa de canela, y el pandebono al lado."""
    layers = [(OUTLINE, [poly(22, 18, 64, 18, 60, 92, 26, 92)]), ('#e3f2f8', [poly(24.6, 20.4, 61.4, 20.4, 57.6, 89.6, 28.4, 89.6)]), ('#fdf8ec', [poly(25.2, 30, 60.8, 30, 57.6, 89.6, 28.4, 89.6)])]
    layers += [('#c8a165', [ellipse(43, 30, 17.6, 2.6)]), ('#ffffff', [rect(28, 34, 3, 50)])]
    layers += pandebono(76, 80, 1.2)
    return layers


def arequipe_jar():
    """El arequipe: el frasco lleno de dulce de leche color caramelo, con la cuchara adentro."""
    layers = [(OUTLINE, [rect(20, 30, 60, 62)]), ('#e3f2f8', [rect(22.4, 32.4, 55.2, 57.2)]), ('#b5651d', [rect(22.4, 40, 55.2, 49.6)]), ('#d08a3c', [ellipse(50, 40, 27.6, 4)])]
    layers += [(OUTLINE, [rect(16, 22, 68, 10)]), ('#d32f2f', [rect(18, 24, 64, 6)]), ('#ffffff', [circle(28 + 10 * i, 27, 1.2) for i in range(6)])]
    layers += [('#f0b56a', [rect(26, 46, 3, 38)])]
    layers += bar(58, 46, 78, 6, 3, '#b0bec5') + [(OUTLINE, [ellipse(56, 50, 6, 4, -60)]), ('#cfd8dc', [ellipse(56, 50, 4.6, 2.8, -60)]), ('#b5651d', [ellipse(56, 51, 3, 1.6, -60)])]
    return layers


def cantina():
    """La cantina: el tarro de aluminio de la leche, con su tapa, las asas y una abolladura."""
    layers = [(OUTLINE, ['M 28 92 L 28 44 Q 28 36 38 32 L 38 18 L 62 18 L 62 32 Q 72 36 72 44 L 72 92 Z'])]
    layers.append(('#b0bec5', ['M 30.6 89.4 L 30.6 44.6 Q 30.6 38 40.6 34.4 L 40.6 20.6 L 59.4 20.6 L 59.4 34.4 Q 69.4 38 69.4 44.6 L 69.4 89.4 Z']))
    layers.append(('#eceff1', [rect(36, 46, 4, 40), rect(44, 22, 3, 10)]))
    layers.append(('#90a4ae', [rect(30.6, 56, 38.8, 3), rect(30.6, 78, 38.8, 3), ellipse(60, 66, 4, 6)]))
    layers += [(OUTLINE, [rect(34, 10, 32, 10), rect(46, 4, 8, 8)]), ('#cfd8dc', [rect(35.6, 11.6, 28.8, 6.8), rect(47.4, 5.4, 5.2, 5.4)])]
    layers += [(OUTLINE, [curve(26, 48, 16, 52, 26, 60, 3.6), curve(74, 48, 84, 52, 74, 60, 3.6)]), ('#cfd8dc', [curve(26, 48.4, 18, 52, 26, 59.6, 1.4), curve(74, 48.4, 82, 52, 74, 59.6, 1.4)])]
    return layers


def molinillo_shape(cx, cy, s=1.0, rot=0):
    """El molinillo de madera: el palo, la cabeza tallada con sus anillos sueltos."""
    a = math.radians(rot)
    def R(x, y):
        return (cx + (x * math.cos(a) - y * math.sin(a)) * s, cy + (x * math.sin(a) + y * math.cos(a)) * s)
    def P(*xy):
        return pts([R(x, y) for x, y in zip(xy[0::2], xy[1::2])])
    def C(x, y, r):
        return pts([R(x + r * math.cos(t * math.pi / 16), y + r * math.sin(t * math.pi / 16)) for t in range(32)])
    layers = [(OUTLINE, [P(-3, -46, 3, -46, 3, 14, -3, 14), C(0, -48, 4.4)]), ('#c8945a', [P(-1.6, -46, 1.6, -46, 1.6, 14, -1.6, 14), C(0, -48, 3)])]
    layers += [(OUTLINE, [P(-10, 14, 10, 14, 12, 26, 8, 38, -8, 38, -12, 26)]), ('#b07a42', [P(-8.6, 15.4, 8.6, 15.4, 10.4, 26, 6.8, 36.6, -6.8, 36.6, -10.4, 26)])]
    layers.append(('#8d5a32', [P(-10.4, 22, 10.4, 22, 10.4, 24, -10.4, 24), P(-9.6, 30, 9.6, 30, 9.2, 32, -9.2, 32)]))
    for y in (8, 42):
        layers += [(OUTLINE, [P(-8, y - 2.4, 8, y - 2.4, 8, y + 2.4, -8, y + 2.4)]), ('#d9a96b', [P(-6.6, y - 1.2, 6.6, y - 1.2, 6.6, y + 1.2, -6.6, y + 1.2)])]
    return layers


def molinillo():
    """El molinillo: el batidor de madera tallada, con sus anillos, que se frota entre las manos para hacer espuma."""
    layers = molinillo_shape(50, 50, 1.0, 20)
    layers.append(('#ffffff', [poly(80, 24, 82, 30, 88, 32, 82, 34, 80, 40, 78, 34, 72, 32, 78, 30)]))
    return layers


def taza(cx, cy, s=1.0, drink='#5d4037', cup='#ffffff', plate=True):
    """Pocillo con su plato: la bebida, el asa y el vapor."""
    def S(v):
        return v * s
    layers = []
    if plate:
        layers += oval(cx, cy + S(14), S(26), S(5), '#eceff1', d=1.6)
    layers += [(OUTLINE, [f'M {cx - S(18)} {cy - S(12)} L {cx + S(18)} {cy - S(12)} Q {cx + S(17)} {cy + S(14)} {cx} {cy + S(14)} Q {cx - S(17)} {cy + S(14)} {cx - S(18)} {cy - S(12)} Z', curve(cx + S(16), cy - S(6), cx + S(28), cy - S(2), cx + S(15), cy + S(6), S(4.4))]),
               (cup, [f'M {cx - S(16)} {cy - S(10.4)} L {cx + S(16)} {cy - S(10.4)} Q {cx + S(15)} {cy + S(12)} {cx} {cy + S(12)} Q {cx - S(15)} {cy + S(12)} {cx - S(16)} {cy - S(10.4)} Z', curve(cx + S(16), cy - S(6), cx + S(25), cy - S(2), cx + S(15), cy + S(5.4), S(1.6))]),
               (OUTLINE, [ellipse(cx, cy - S(11), S(17.6), S(4))]), (drink, [ellipse(cx, cy - S(11), S(16), S(2.8))])]
    layers.append(('#b0bec5', [f'M {cx - S(4)} {cy - S(16)} Q {cx - S(9)} {cy - S(24)} {cx - S(3)} {cy - S(30)} Q {cx + S(1)} {cy - S(34)} {cx - S(2)} {cy - S(38)} L {cx + S(1)} {cy - S(38)} Q {cx + S(4)} {cy - S(33)} {cx - S(0.5)} {cy - S(29)} Q {cx - S(6)} {cy - S(23)} {cx - S(1)} {cy - S(16)} Z']))
    return layers


def santafereno():
    """El chocolate santafereño: la taza de chocolate caliente con los cuadros de queso que se derriten, y la almojábana."""
    layers = taza(40, 52, 1.35, '#6d3b1e')
    layers.append(('#fffde7', [rect(28, 42, 7, 4, -10), rect(40, 44, 7, 4, 12), rect(46, 40, 6, 3.6, -5)]))
    layers += oval(82, 82, 12, 10, '#f0c56b') + [('#f8dfa1', [ellipse(79, 79, 5, 3)])]
    return layers


def chocolatera():
    """La chocolatera: la olla de aluminio de boca ancha y mango largo, con el molinillo adentro y la espuma."""
    layers = [(OUTLINE, ['M 22 40 L 70 40 L 66 90 Q 46 96 26 90 Z']), ('#b0bec5', ['M 24.6 42.4 L 67.4 42.4 L 63.8 87.8 Q 46 93.2 28.2 87.8 Z']), ('#eceff1', [rect(30, 46, 4, 38)])]
    layers += [(OUTLINE, [ellipse(46, 40, 26, 6)]), ('#8d4f2a', [ellipse(46, 40, 24, 4.4)]), ('#d7a77a', [ellipse(42, 39, 12, 2.2)])]
    layers += [(OUTLINE, [rect(68, 44, 28, 7, -8)]), ('#5d4037', [rect(69.6, 45.6, 24.8, 3.8, -8)])]
    layers += molinillo_shape(46, 24, 0.55, 8)
    return layers


def cacao_fino():
    """Fino de aroma: la mazorca de cacao abierta con sus granos en pulpa blanca, el aroma y el sello de calidad."""
    layers = [(OUTLINE, ['M 8 60 Q 30 20 64 34 Q 82 44 76 64 Q 60 90 22 80 Q 4 72 8 60 Z']), ('#e0a428', ['M 10.6 60 Q 31 23 63 36.4 Q 79 45 73.6 63 Q 58.6 87 23 77.6 Q 7 70.6 10.6 60 Z'])]
    layers += [(OUTLINE, [ellipse(42, 56, 24, 13, -15)]), ('#fff8e1', [ellipse(42, 56, 22, 11, -15)])]
    layers.append(('#6d3b1e', [ellipse(x, y, 4, 2.6, -15) for x, y in [(28, 60), (36, 56), (44, 54), (52, 50), (32, 64), (40, 62), (48, 60), (56, 56)]]))
    layers.append(('#c98a2a', [curve(20, 40, 36, 30, 60, 38, 1.4)]))
    layers.append(('#a1887f', [curve(70, 30, 76, 22, 70, 14, 1.6), curve(78, 32, 86, 22, 80, 12, 1.6)]))
    layers += oval(84, 76, 12, 12, '#fbc02d') + [('#f57f17', [circle(84, 76, 8)]), (OUTLINE, [poly(78, 86, 74, 98, 80, 94, 84, 98, 84, 88), poly(90, 86, 94, 98, 88, 94, 84, 98)]), ('#c62828', [poly(79, 87, 76, 95.6, 80.4, 92.4, 83, 95, 83, 88)])]
    layers.append(('#fff59d', [poly(84, 70, 85.6, 74, 90, 74, 86.4, 76.6, 87.8, 81, 84, 78.4, 80.2, 81, 81.6, 76.6, 78, 74, 82.4, 74)]))
    return layers


def lamina_chocolatina():
    """El álbum de chocolatina: la chocolatina en su envoltura y la lámina que salía adentro, con un pájaro."""
    layers = [(OUTLINE, [rect(6, 44, 62, 26, -12)]), ('#c62828', [rect(7.6, 45.6, 58.8, 22.8, -12)]), ('#fdd835', [rect(24, 50, 22, 12, -12)]), ('#6d3b1e', [rect(52, 40, 14, 22, -12)])]
    layers.append(('#4e2a14', [rect(56, 42, 1.6, 18, -12), rect(61, 41, 1.6, 18, -12)]))
    layers += [(OUTLINE, [rect(54, 16, 36, 48, 14)]), ('#ffffff', [rect(55.8, 17.8, 32.4, 44.4, 14)]), ('#81d4fa', [rect(59, 22, 26, 26, 14)])]
    layers += oval(71, 36, 7, 5, '#43a047', 14, 1.4) + [('#fdd835', [poly(77, 34, 82, 36, 77, 37)]), ('#d32f2f', [ellipse(66, 38, 3, 2.4)]), ('#1b1b1b', [circle(74, 34, 0.9)])]
    layers.append(('#9e9e9e', [rect(60, 52, 22, 2, 14), rect(60, 57, 16, 2, 14)]))
    return layers


def budare():
    """El budare: la plancha redonda de barro sobre tres piedras y el fogón, con las arepas asándose."""
    layers = oval(22, 86, 10, 7, '#9e9e9e') + oval(50, 90, 10, 6, '#8d8d8d') + oval(78, 86, 10, 7, '#9e9e9e')
    layers += [('#ff7043', ['M 34 86 Q 38 72 44 70 Q 44 78 50 72 Q 56 70 58 78 Q 62 74 66 86 Z']), ('#ffca28', ['M 42 86 Q 44 80 48 78 Q 50 82 54 80 Q 56 84 58 86 Z'])]
    layers += [(OUTLINE, [ellipse(50, 66, 44, 14)]), ('#8d4a2a', [ellipse(50, 66, 42, 12.4)]), ('#a85a32', [ellipse(50, 64, 40, 10)])]
    for x, y in [(32, 62), (54, 58), (66, 68)]:
        layers += oval(x, y, 11, 4.6, '#f2dca0', d=1.6) + [('#c98a3e', [ellipse(x - 3, y - 1, 2, 1), ellipse(x + 4, y + 1, 1.6, 0.8)])]
    return layers


def mazamorra():
    """La mazamorra: la taza de maíz pilado cocido en leche, con la cuchara, y el pedazo de panela al lado."""
    layers = [(OUTLINE, ['M 8 44 L 72 44 Q 70 90 40 90 Q 10 90 8 44 Z']), ('#fafafa', ['M 10.6 46.4 L 69.4 46.4 Q 67.6 87.6 40 87.6 Q 12.4 87.6 10.6 46.4 Z']), ('#1e88e5', [rect(12, 56, 56, 3)])]
    layers += [(OUTLINE, [ellipse(40, 44, 32, 7)]), ('#fdf6e3', [ellipse(40, 44, 30, 5.4)])]
    layers.append(('#f3e2b3', [ellipse(x, y, 2.6, 1.6) for x, y in [(26, 44), (32, 42), (38, 45), (44, 43), (50, 45), (56, 43), (30, 46), (46, 46)]]))
    layers += bar(54, 42, 70, 16, 3, '#b0bec5')
    layers += panela_block(84, 80, 0.75)
    return layers


def envuelto():
    """El envuelto: la masa de maíz dulce envuelta en hoja y amarrada, y uno abierto mostrando la masa amarilla."""
    layers = [(OUTLINE, [leaf(6, 70, 54, 30, 12)]), ('#c5d58a', [leaf(8, 69, 52, 31, 10)]), ('#9eb35a', [rib(10, 68, 50, 32, 1)])]
    layers += [(OUTLINE, [rect(22, 46, 4, 18, -40), rect(34, 36, 4, 18, -40)]), ('#8d6e63', [rect(23.2, 47.2, 1.6, 15.6, -40), rect(35.2, 37.2, 1.6, 15.6, -40)])]
    layers += [(OUTLINE, [leaf(46, 84, 96, 56, 18)]), ('#9eb35a', [leaf(48, 83, 94, 57, 15.6)])]
    layers += oval(71, 70, 16, 7, '#f4c430', -30, 1.8) + [('#f8dc7a', [ellipse(68, 70, 7, 2.4, -30)])]
    return layers


def pilon():
    """El pilón: el tronco hueco donde se pila el maíz, con la mano de pilón y los granos alrededor."""
    layers = [(OUTLINE, ['M 22 92 L 26 40 L 74 40 L 78 92 Z']), ('#8d5a32', ['M 24.6 89.6 L 28.4 42.4 L 71.6 42.4 L 75.4 89.6 Z']), ('#6d4128', [rect(34, 46, 2, 40), rect(54, 50, 2, 34)])]
    layers += [(OUTLINE, [ellipse(50, 40, 26, 7)]), ('#a1693f', [ellipse(50, 40, 24, 5.4)]), ('#3e2723', [ellipse(50, 40, 16, 3.4)]), ('#f4c430', [ellipse(50, 39, 12, 2)])]
    layers += [(OUTLINE, [rect(46, 2, 9, 40, 8)]), ('#c8945a', [rect(47.6, 3.6, 5.8, 36.8, 8)]), (OUTLINE, [ellipse(48, 4, 7, 4, 8)]), ('#c8945a', [ellipse(48, 4, 5.4, 2.6, 8)])]
    layers.append(('#f4c430', [ellipse(x, y, 2.4, 1.8) for x, y in [(14, 90), (18, 86), (84, 90), (88, 86), (10, 94), (90, 94)]]))
    return layers


def choclo():
    """El choclo: la mazorca tierna asada en la parrilla, con las hojas abiertas, mantequilla y sal."""
    layers = [(OUTLINE, [rect(4, 78, 92, 4), rect(10, 82, 4, 14), rect(86, 82, 4, 14)]), ('#424242', [rect(5.4, 79.4, 89.2, 1.2)])]
    layers += [(OUTLINE, [leaf(70, 56, 98, 30, 10), leaf(70, 56, 96, 70, 9)]), ('#9ccc65', [leaf(71, 55, 96, 32, 8), leaf(71, 57, 94, 69, 7)])]
    layers += oval(42, 56, 32, 13, '#f4c430')
    layers.append(('#e8a317', [ellipse(14 + 6 * i, 50 + 6 * (j % 2), 2.4, 2.8) for i in range(10) for j in range(2)]))
    layers.append(('#a0611c', [ellipse(24, 54, 4, 2), ellipse(44, 60, 5, 2), ellipse(58, 52, 3, 1.6)]))
    layers.append(('#fff59d', [ellipse(38, 50, 9, 3)]))
    layers.append(('#ffffff', [circle(x, y, 0.8) for x, y in [(30, 50), (46, 52), (52, 58), (34, 60), (20, 56)]]))
    return layers


def plaza_pueblo():
    """La plaza del pueblo: la iglesia de dos torres, la palma del parque y el toldo del mercado del domingo."""
    layers = oval(50, 92, 46, 4, '#d7ccc8', d=1.2)
    layers += shape([(26, 90), (26, 34), (74, 34), (74, 90)], '#f5f0e6', 1.8)
    layers += shape([(22, 34), (50, 18), (78, 34)], '#e8dcc4', 1.8)
    for x in (20, 80):
        layers += shape([(x - 7, 90), (x - 7, 26), (x, 16), (x + 7, 26), (x + 7, 90)], '#f5f0e6', 1.8) + [(OUTLINE, [rect(x - 1, 6, 2, 10), rect(x - 4, 9, 8, 2)]), ('#5d4037', [rect(x - 2.5, 34, 5, 8)])]
    layers += [(OUTLINE, ['M 42 90 L 42 68 Q 50 60 58 68 L 58 90 Z']), ('#8d5a32', ['M 43.6 90 L 43.6 68.6 Q 50 62.4 56.4 68.6 L 56.4 90 Z']), ('#c0a060', [circle(50, 48, 5)])]
    layers += shape([(6, 78), (22, 74), (22, 90), (6, 90)], '#ffffff', 1.4) + [(OUTLINE, [poly(2, 76, 14, 66, 26, 74)]), ('#e53935', [poly(5, 75.6, 14, 68, 23, 74)])]
    layers += bar(90, 92, 88, 60, 2, '#795548') + [('#2e7d32', [leaf(88, 60, 74, 56, 4), leaf(88, 60, 98, 52, 4), leaf(88, 60, 82, 48, 3.4)])]
    return layers


def tinto():
    """El tinto: el pocillo de café negro humeante en su plato, con el azúcar al lado."""
    layers = taza(46, 56, 1.4, '#2b1a10')
    layers += [(OUTLINE, [rect(80, 74, 10, 8, 15), rect(82, 62, 10, 8, -10)]), ('#ffffff', [rect(81.4, 75.4, 7.2, 5.2, 15), rect(83.4, 63.4, 7.2, 5.2, -10)])]
    return layers


def chiva_bus():
    """La chiva: el bus de escalera de madera pintado de colores, con gente en las bancas y bultos y gallinas en el techo."""
    layers = [(OUTLINE, [rect(4, 36, 76, 44), poly(80, 54, 96, 56, 96, 80, 80, 80)])]
    layers += [('#fdd835', [rect(6, 38, 72, 40)]), ('#fbc02d', [poly(80, 56, 94.4, 57.6, 94.4, 78.4, 80, 78.4)]), ('#b3e5fc', [poly(82, 58, 92, 59, 92, 66, 82, 66)])]
    layers.append(('#e53935', [rect(6, 38, 72, 4), rect(6, 70, 72, 3)]))
    layers.append(('#1e88e5', [rect(6, 64, 72, 3)]))
    layers.append(('#43a047', [poly(6 + 8 * i, 73, 10 + 8 * i, 78, 14 + 8 * i, 73) for i in range(9)]))
    for x in (10, 26, 42, 58):
        layers += [(OUTLINE, [rect(x, 44, 12, 16)]), ('#4e342e', [rect(x + 1.4, 45.4, 9.2, 13.2)])]
        layers += oval(x + 6, 50, 3.4, 3.6, '#c68642', d=1.2) + [('#f5f5f5', [rect(x + 2.6, 54.2, 6.8, 4.4)])]
    layers += oval(18, 30, 9, 5, '#c8a165', d=1.6) + oval(38, 29, 8, 6, '#a1887f', d=1.6) + oval(58, 30, 9, 5, '#c8a165', d=1.6)
    layers += oval(72, 28, 4.4, 3.6, '#ffffff', d=1.4) + [('#e53935', [poly(74, 24, 76, 22, 76, 25)]), ('#fdd835', [poly(76, 28, 79, 28.6, 76, 29.4)])]
    for x in (20, 70):
        layers += oval(x, 82, 8, 8, '#263238', d=1.8) + [('#b0bec5', [circle(x, 82, 3)])]
    return layers


def fonda():
    """La fonda: la casa del camino con balcón, el letrero, la mesa afuera y la mula amarrada a la puerta."""
    layers = oval(50, 92, 46, 4, '#d7ccc8', d=1.2)
    layers += shape([(8, 90), (8, 40), (62, 40), (62, 90)], '#fafafa', 1.8)
    layers += [(OUTLINE, [poly(2, 42, 35, 20, 68, 42)]), ('#c0592b', [poly(6, 40.6, 35, 23, 64, 40.6)])]
    layers.append(('#2e7d32', [rect(8, 54, 54, 3), rect(8, 40, 54, 3)]))
    layers += [(OUTLINE, [rect(26, 62, 14, 28)]), ('#c62828', [rect(27.6, 63.6, 10.8, 26.4)]), ('#1565c0', [rect(12, 62, 10, 12), rect(46, 62, 10, 12)])]
    layers += [(OUTLINE, [rect(16, 44, 38, 8)]), ('#fff59d', [rect(17.6, 45.6, 34.8, 4.8)]), ('#5d4037', [rect(22 + 6 * i, 47, 3, 1.6) for i in range(5)])]
    layers += mule(82, 70, 0.42, load=False)
    return layers


def balcones():
    """Los balcones: la casa de bahareque de dos pisos, de puertas y balcones de colores y materas de flores."""
    layers = shape([(10, 92), (10, 26), (90, 26), (90, 92)], '#fafafa', 1.8)
    layers += [(OUTLINE, [poly(2, 28, 50, 6, 98, 28)]), ('#c0592b', [poly(6, 27, 50, 9, 94, 27)])]
    layers.append(('#e53935', [rect(10, 86, 80, 6)]))
    for x, c in [(16, '#1e88e5'), (42, '#43a047'), (68, '#e53935')]:
        layers += [(OUTLINE, [rect(x, 32, 16, 18), rect(x, 62, 16, 24)]), (c, [rect(x + 1.4, 33.4, 13.2, 15.2), rect(x + 1.4, 63.4, 13.2, 22.6)])]
        layers.append(('#fdd835', [rect(x + 7.2, 64, 1.6, 22)]))
    layers += [(OUTLINE, [rect(10, 50, 80, 3)] + [rect(12 + 6 * i, 50, 2, 8) for i in range(13)] + [rect(10, 57, 80, 2.4)])]
    layers.append(('#ffca28', [rect(10.6, 50.6, 78.8, 1.6)]))
    layers += [('#d84315', [rect(20 + 26 * i, 45, 8, 5) for i in range(3)]), ('#ec407a', [circle(22 + 26 * i, 43, 2.4) for i in range(3)] + [circle(26 + 26 * i, 43, 2.4) for i in range(3)])]
    return layers


def castillo_polvora():
    """Las fiestas del pueblo: el castillo de pólvora con sus ruedas encendidas, los voladores y las banderitas."""
    layers = [(OUTLINE, [rect(46, 30, 8, 66), rect(26, 50, 48, 4), rect(30, 74, 40, 4)]), ('#8d5a32', [rect(47.6, 31.6, 4.8, 62.8), rect(27.6, 51.6, 44.8, 0.8), rect(31.6, 75.6, 36.8, 0.8)])]
    for cx, cy, c in [(30, 52, '#ffca28'), (70, 52, '#ff7043'), (50, 30, '#ec407a'), (34, 76, '#29b6f6'), (66, 76, '#ffca28')]:
        layers += [(c, [rib(cx, cy, cx + 11 * math.cos(a), cy + 11 * math.sin(a), 1.4) for a in [i * math.pi / 5 for i in range(10)]]), (OUTLINE, [circle(cx, cy, 3)]), ('#fff59d', [circle(cx, cy, 1.8)])]
    for x, y in [(16, 18), (84, 14)]:
        layers += [('#ffe082', [rib(x, y + 12, x, y + 30, 1)]), ('#ff8a65', [circle(x + 6 * math.cos(a), y + 6 * math.sin(a), 1.4) for a in [i * math.pi / 4 for i in range(8)]])]
    layers += [(OUTLINE, [curve(0, 4, 50, 14, 100, 4, 1.2)])]
    layers += [(c, [poly(10 + 16 * i - 4, 6 + 3 * (1 - abs(i - 2.5) / 2.5), 10 + 16 * i + 4, 6 + 3 * (1 - abs(i - 2.5) / 2.5), 10 + 16 * i, 14 + 3 * (1 - abs(i - 2.5) / 2.5))]) for i, c in enumerate(['#e53935', '#fdd835', '#1e88e5', '#43a047', '#8e24aa', '#fb8c00'])]
    return layers



# ---------- Láminas de Santander (v4.3) ----------

def bocadillo_lonja():
    """El bocadillo de lonja: la tajada de dos capas, guayaba roja y guayaba blanca, sobre la hoja de bijao."""
    layers = [(OUTLINE, [leaf(4, 78, 96, 66, 22)]), ('#689f38', [leaf(6, 78, 94, 66, 19.6)]), ('#8bc34a', [rib(8, 77, 92, 67, 1.2)])]
    layers += [(OUTLINE, [poly(20, 46, 70, 36, 84, 46, 84, 70, 34, 80, 20, 70)])]
    layers += [('#c2185b', [poly(22.4, 47.4, 70, 38.4, 81.6, 47, 81.6, 57, 34, 66, 22.4, 57.6)]), ('#f8e1d0', [poly(22.4, 57.6, 34, 66, 81.6, 57, 81.6, 68.6, 34, 77.6, 22.4, 68.6)])]
    layers += [('#e05a8a', [poly(22.4, 47.4, 70, 38.4, 81.6, 47, 34, 56)]), ('#ad1457', [rect(34, 56, 1.4, 22, -12)]), ('#fff3e8', [ellipse(54, 66, 10, 1.6, -12)])]
    return layers


def cajitas():
    """Las cajitas de madera: las cajas de balso apiladas, una abierta con los bocadillos envueltos en bijao."""
    layers = []
    for x, y in [(8, 62), (40, 62), (24, 38)]:
        layers += [(OUTLINE, [poly(x, y, x + 30, y - 6, x + 46, y + 2, x + 16, y + 8), poly(x, y, x + 16, y + 8, x + 16, y + 26, x, y + 18), poly(x + 16, y + 8, x + 46, y + 2, x + 46, y + 20, x + 16, y + 26)]),
                   ('#e8cf9a', [poly(x + 2, y + 0.2, x + 30, y - 4.4, x + 43, y + 2, x + 16, y + 6.6)]), ('#d9b97a', [poly(x + 1.4, y + 2.4, x + 14.6, y + 9, x + 14.6, y + 23.4, x + 1.4, y + 16.8)]), ('#c9a464', [poly(x + 17.4, y + 9, x + 44.6, y + 3.6, x + 44.6, y + 18.6, x + 17.4, y + 24)])]
        layers.append(('#a1793f', [rib(x + 20, y + 16, x + 42, y + 11, 1.2)]))
    layers += [('#558b2f', [poly(30, 37, 52, 33, 62, 38, 40, 42)]), ('#8bc34a', [rib(34, 38, 54, 34.5, 1.2), rib(38, 40, 58, 36, 1.2)])]
    return layers


def velez():
    """Vélez: la capital del bocadillo y del torbellino, con su requinto y los bocadillos en bijao."""
    layers = tiple_shape(34, 58, 0.85, -18)
    for x, y in [(66, 74), (80, 64), (74, 86)]:
        layers += [(OUTLINE, [rect(x - 10, y - 6, 20, 12, 20)]), ('#689f38', [rect(x - 8.6, y - 4.6, 17.2, 9.2, 20)]), ('#c2185b', [rect(x - 5, y - 2.4, 10, 4.8, 20)])]
    layers += note(74, 32, 0.8) + note(88, 22, 0.7)
    return layers


def caney():
    """El caney: el rancho alto de palos y techo de paja donde cuelga la hoja de tabaco a curar."""
    layers = oval(50, 92, 46, 4, '#d7ccc8', d=1.2)
    for x in (12, 50, 88):
        layers += bar(x, 92, x, 34, 3.4, '#795548')
    layers += [(OUTLINE, [poly(2, 38, 50, 6, 98, 38)]), ('#c8a165', [poly(6, 36.4, 50, 9, 94, 36.4)]), ('#a1793f', [rib(12, 34, 50, 10, 1.2), rib(30, 36, 50, 12, 1.2), rib(70, 36, 50, 12, 1.2), rib(88, 34, 50, 10, 1.2)])]
    for k, y in enumerate((44, 62)):
        layers += [(OUTLINE, [rect(10, y - 1.4, 80, 2.8)])]
        for i in range(8):
            x = 15 + 10 * i
            col = ['#7cb342', '#c0a040', '#8d5a32'][(i + k) % 3]
            layers += [(OUTLINE, [leaf(x, y, x, y + 16, 4.4)]), (col, [leaf(x, y + 0.6, x, y + 15, 3.4)])]
    return layers


def galeon():
    """Tabaco para el mundo: el velero de la Colonia, cargado de fardos de tabaco rumbo a Europa."""
    layers = [(OUTLINE, [rect(2, 80, 96, 16)]), ('#4fa3d9', [rect(3.4, 81.4, 93.2, 13.2)]), ('#b3e0f2', [rib(10, 88, 26, 88, 1.4), rib(60, 90, 80, 90, 1.4)])]
    layers += [(OUTLINE, ['M 10 66 L 90 66 L 80 84 L 20 84 Z']), ('#8d5a32', ['M 13 68 L 87 68 L 78.6 82 L 21.4 82 Z']), ('#c8a165', [rect(16, 72, 66, 2)])]
    layers += bar(50, 66, 50, 8, 2.6, '#5d4037') + bar(28, 66, 28, 22, 2, '#5d4037')
    layers += [(OUTLINE, ['M 52 12 Q 76 22 52 46 Z', 'M 52 48 Q 82 54 52 62 Z', 'M 30 26 Q 44 38 30 54 Z'])]
    layers += [('#fafafa', ['M 53.6 15 Q 72 23 53.6 42.6 Z', 'M 53.6 50 Q 77 54 53.6 60 Z', 'M 31.6 29.6 Q 41 38 31.6 50.4 Z'])]
    layers += [(OUTLINE, [rect(48, 2, 12, 6)]), ('#c62828', [rect(49.4, 3.4, 9.2, 3.2)])]
    for x in (62, 72):
        layers += [(OUTLINE, [rect(x, 56, 9, 10)]), ('#a1793f', [rect(x + 1.4, 57.4, 6.2, 7.2)]), ('#5d3a1e', [rib(x + 1.4, 61, x + 7.6, 61, 1)])]
    return layers


def telar():
    """Curití: el telar de madera con los hilos de fique tensos y la tela que va creciendo."""
    layers = [(OUTLINE, [rect(8, 10, 6, 84), rect(86, 10, 6, 84), rect(8, 10, 84, 6), rect(8, 74, 84, 6)]), ('#8d5a32', [rect(9.4, 11.4, 3.2, 81.2), rect(87.4, 11.4, 3.2, 81.2), rect(9.4, 11.4, 81.2, 3.2), rect(9.4, 75.4, 81.2, 3.2)])]
    layers.append(('#e8d9b0', [rect(18 + 4.4 * i, 16, 1.2, 58) for i in range(16)]))
    layers += [(OUTLINE, [rect(16, 44, 70, 30)]), ('#d4b06a', [rect(17.4, 45.4, 67.2, 27.2)])]
    layers.append(('#b5864a', [rect(17.4, 48 + 4 * k, 67.2, 1.4) for k in range(6)]))
    layers.append(('#c62828', [rect(17.4, 58, 67.2, 3)]))
    layers += [(OUTLINE, [rect(14, 38, 74, 5)]), ('#a1693f', [rect(15.4, 39.4, 71.2, 2.2)])]
    layers += [(OUTLINE, [ellipse(52, 30, 12, 4)]), ('#a1693f', [ellipse(52, 30, 10.4, 2.6)]), ('#e8d9b0', [ellipse(52, 30, 6, 1.6)])]
    return layers


def horse_rider():
    """Un caballo de perfil con su jinete de sombrero, para el vaquero y el llanero."""
    layers = mule(54, 60, 0.85, body='#8d5a32', load=False, horse=True)
    layers += [(OUTLINE, [rect(46, 46, 16, 6)]), ('#5d3a1e', [rect(47.4, 47.4, 13.2, 3.2)])]
    layers += shape([(46, 50), (48, 30), (60, 30), (62, 50)], '#f5f5f5', 1.8)
    layers += bar(50, 52, 44, 68, 3.4, '#1565c0')
    layers += bar(58, 34, 72, 26, 3, '#f5f5f5') + oval(74, 24, 3, 3, '#c68642', d=1.2)
    layers.append(('#a1693f', [curve(74, 22, 86, 6, 94, 20, 1.4), ellipse(90, 16, 6, 4)]))
    layers += oval(54, 22, 6, 7, '#c68642', d=1.6)
    layers += oval(54, 16, 12, 2.6, '#6d4c41', d=1.6) + [(OUTLINE, ['M 47 16 Q 47 6 54 6 Q 61 6 61 16 Z']), ('#6d4c41', ['M 48.4 15.6 Q 48.4 7.4 54 7.4 Q 59.6 7.4 59.6 15.6 Z'])]
    return layers


def vaquero():
    """El vaquero: a caballo, con camisa blanca y sombrero, revoleando el lazo por los potreros."""
    return oval(50, 95, 40, 3, '#9ccc65', d=1.2) + horse_rider()


def cabro():
    """El cabro: el chivo de las tierras secas, con sus cachos hacia atrás, la barba y la cola parada."""
    body = '#a1887f'
    layers = oval(50, 93, 36, 3, '#d7a86e', d=1.2)
    for lx in (32, 40, 62, 70):
        layers += [(OUTLINE, [rect(lx - 3, 58, 6, 34)]), (body, [rect(lx - 1.6, 58, 3.2, 32.6)]), ('#3e2723', [rect(lx - 2.2, 88, 4.4, 4)])]
    layers += oval(52, 54, 26, 13, body) + [('#d7ccc8', [ellipse(52, 62, 18, 4)]), ('#6d4c41', [ellipse(60, 46, 12, 4)])]
    layers += [(OUTLINE, [poly(76, 48, 84, 38, 82, 50)]), (body, [poly(77.6, 48, 82.6, 41, 81.4, 48.6)])]
    layers += [(OUTLINE, [poly(30, 50, 22, 30, 30, 26, 36, 46)]), (body, [poly(31.4, 49, 24, 31, 29.4, 28, 34.6, 46)])]
    layers += oval(22, 32, 9, 7, body, -20) + [('#1b1b1b', [circle(20, 30, 1.2)]), ('#5d4037', [ellipse(14, 34, 1.4, 1)])]
    layers += [(OUTLINE, [poly(16, 38, 22, 38, 18, 48)]), ('#efebe9', [poly(17.4, 39, 20.6, 39, 18.2, 45)])]
    layers += [(OUTLINE, [curve(24, 26, 30, 12, 40, 18, 3.6)]), ('#8d8d7a', [curve(24, 26, 30, 13.6, 39, 18.6, 1.6)])]
    layers += [(OUTLINE, [poly(26, 28, 34, 26, 32, 32)]), (body, [poly(27.4, 28.4, 32.6, 27, 31.4, 30.6)])]
    return layers


def plato(cx=50, cy=70, rx=44, ry=14):
    """El plato blanco, de lado."""
    return oval(cx, cy, rx, ry, '#fafafa') + [('#e3eef3', [ellipse(cx, cy, rx * 0.72, ry * 0.6)])]


def pepitoria():
    """La pepitoria: el arroz amarillo revuelto con las menudencias del cabro, con arveja y cilantro, en el plato."""
    layers = plato(50, 70, 44, 15)
    layers += [(OUTLINE, ['M 16 70 Q 18 40 50 36 Q 82 40 84 70 Q 50 80 16 70 Z']), ('#e6b84a', ['M 18.6 69 Q 20.6 42.4 50 38.6 Q 79.4 42.4 81.4 69 Q 50 77.4 18.6 69 Z'])]
    layers.append(('#f3d47a', [ellipse(x, y, 2.2, 1.2) for x, y in [(30, 54), (40, 48), (50, 44), (60, 50), (70, 58), (36, 62), (56, 62), (46, 56), (64, 66)]]))
    layers.append(('#6d3b1e', [ellipse(x, y, 3, 2.2) for x, y in [(34, 58), (48, 50), (62, 56), (44, 66), (70, 64), (56, 44)]]))
    layers.append(('#7cb342', [circle(x, y, 1.8) for x, y in [(28, 64), (42, 56), (58, 58), (66, 50), (52, 68)]]))
    layers.append(('#2e7d32', [leaf(48, 40, 56, 34, 2.4), leaf(48, 40, 42, 34, 2.4)]))
    return layers


def plato_hondo(cx, cy, s, soup):
    """El plato hondo de barro con caldo."""
    def S(v):
        return v * s
    layers = [(OUTLINE, [f'M {cx - S(44)} {cy} Q {cx - S(40)} {cy + S(32)} {cx} {cy + S(32)} Q {cx + S(40)} {cy + S(32)} {cx + S(44)} {cy} Z']), ('#a85a32', [f'M {cx - S(41)} {cy + S(1)} Q {cx - S(37.6)} {cy + S(29.4)} {cx} {cy + S(29.4)} Q {cx + S(37.6)} {cy + S(29.4)} {cx + S(41)} {cy + S(1)} Z'])]
    layers += [(OUTLINE, [ellipse(cx, cy, S(44), S(10))]), (soup, [ellipse(cx, cy, S(41), S(7.6))])]
    return layers


def mute():
    """El mute: la sopa espesa de maíz pelado con carnes, papa y verduras, en el plato hondo, humeando."""
    layers = plato_hondo(50, 54, 1.0, '#e8c27a')
    layers.append(('#fdf3d4', [ellipse(x, y, 2.6, 1.8) for x, y in [(26, 54), (32, 50), (42, 56), (58, 52), (66, 56), (72, 52), (38, 50), (50, 58)]]))
    layers.append(('#8d4a2a', [ellipse(x, y, 4.4, 2.6) for x, y in [(36, 54), (56, 56), (64, 50)]]))
    layers.append(('#f5e6c4', [ellipse(46, 50, 4, 2.4), ellipse(74, 56, 3, 2)]))
    layers.append(('#43a047', [circle(x, y, 1.4) for x, y in [(30, 56), (52, 50), (60, 58), (44, 54)]]))
    layers.append(('#b0bec5', ['M 40 40 Q 34 30 42 22 Q 46 16 42 10 L 46 10 Q 50 17 46 23 Q 38 31 44 40 Z', 'M 60 40 Q 54 32 60 26 L 63 26 Q 58 32 64 40 Z']))
    return layers


def chicamocha():
    """El cañón del Chicamocha: las montañas secas y hondas a lado y lado, el río al fondo y el teleférico cruzando."""
    layers = [(OUTLINE, [pts([(2, 96), (2, 20), (14, 14), (26, 30), (40, 70), (48, 88), (52, 88), (60, 70), (74, 28), (86, 12), (98, 22), (98, 96)])])]
    layers += [('#c9a06a', [pts([(3.4, 94.6), (3.4, 21), (14, 16), (25, 31.6), (38.6, 71), (47, 87), (53, 87), (61.4, 71), (75, 29.6), (86, 14), (96.6, 23), (96.6, 94.6)])])]
    layers += [('#a87d4a', [poly(14, 16, 25, 31.6, 38.6, 71, 47, 87, 30, 94.6, 3.4, 94.6, 3.4, 60)]), ('#8bae5a', [ellipse(14, 22, 10, 4), ellipse(86, 20, 10, 4), ellipse(70, 50, 6, 3), ellipse(28, 50, 5, 3)])]
    layers += [(OUTLINE, [poly(44, 96, 48, 86, 52, 86, 56, 96)]), ('#4fa3d9', [poly(45.6, 96, 48.6, 87.6, 51.4, 87.6, 54.4, 96)])]
    layers.append(('#37474f', [rib(10, 18, 90, 16, 1)]))
    layers += [(OUTLINE, [rect(44, 18, 12, 10)]), ('#e53935', [rect(45.4, 19.4, 9.2, 7.2)]), ('#b3e5fc', [rect(46.4, 20.4, 7.2, 3)]), (OUTLINE, [rect(49.4, 16, 1.2, 3)])]
    return layers


def winged_ant(cx, cy, s=1.0, rot=0):
    """Una hormiga reina con alas, volando."""
    def S(v):
        return v * s
    layers = [('#e3f2fd', [ellipse(cx - S(4), cy - S(8), S(10), S(4), rot - 30), ellipse(cx + S(4), cy - S(8), S(10), S(4), rot + 30)]), ('#90a4ae', [rib(cx - S(4), cy - S(4), cx - S(12), cy - S(12), S(0.8)), rib(cx + S(4), cy - S(4), cx + S(12), cy - S(12), S(0.8))])]
    layers += [(OUTLINE, [ellipse(cx, cy + S(7), S(4.6), S(6.6), rot), circle(cx, cy - S(1), S(3.4)), circle(cx, cy - S(6), S(3))]), ('#8d3b1e', [ellipse(cx, cy + S(7), S(3.4), S(5.4), rot), circle(cx, cy - S(1), S(2.2)), circle(cx, cy - S(6), S(1.9))])]
    return layers


def salida():
    """La salida de las hormigas: con las primeras lluvias las reinas salen volando del hormiguero."""
    layers = oval(30, 18, 16, 8, '#cfd8dc') + oval(44, 14, 12, 8, '#cfd8dc', d=0)
    layers.append(('#4fa3d9', [ellipse(x, y, 1.2, 3) for x, y in [(22, 32), (32, 36), (40, 30), (50, 34), (28, 44)]]))
    layers += [(OUTLINE, ['M 10 94 Q 30 64 50 62 Q 70 64 90 94 Z']), ('#a0522d', ['M 13 92.6 Q 31 66.4 50 64.4 Q 69 66.4 87 92.6 Z']), ('#5d2f19', [ellipse(50, 66, 5, 2), ellipse(36, 78, 3, 1.4), ellipse(62, 80, 3, 1.4)])]
    layers += winged_ant(70, 30, 1.2) + winged_ant(54, 46, 0.9) + winged_ant(82, 54, 0.8)
    return layers


def recoleccion():
    """La recolección: al amanecer, con sombrero y tarro, se recogen las reinas a la salida del hormiguero."""
    layers = oval(76, 20, 9, 9, '#ffb74d', d=1.6)
    layers += [(OUTLINE, ['M 46 94 Q 64 70 80 70 Q 94 72 98 94 Z']), ('#a0522d', ['M 49.4 92.6 Q 65 72.4 80 72.4 Q 92.6 74.4 96 92.6 Z']), ('#5d2f19', [ellipse(76, 74, 4, 1.6)])]
    layers.append(('#5d2f19', [ellipse(x, y, 1.6, 1) for x, y in [(70, 80), (84, 84), (78, 88), (90, 80), (62, 88)]]))
    layers += shape([(14, 94), (16, 66), (36, 66), (38, 94)], '#3e2723', 1.6)
    layers += shape([(12, 70), (14, 40), (38, 40), (40, 70)], '#1e88e5', 1.8)
    layers += bar(38, 46, 52, 62, 3.4, '#1e88e5') + [(OUTLINE, [rect(50, 58, 12, 16)]), ('#b0bec5', [rect(51.4, 59.4, 9.2, 13.2)]), ('#8d3b1e', [ellipse(56, 66, 1.6, 2.4), ellipse(54, 62, 1.4, 2)])]
    layers += oval(26, 30, 8, 9, '#c68642', d=1.8)
    layers += oval(26, 24, 15, 3, '#e8d9b0', d=1.6) + [(OUTLINE, ['M 18 24 Q 18 12 26 12 Q 34 12 34 24 Z']), ('#e8d9b0', ['M 19.4 23.6 Q 19.4 13.4 26 13.4 Q 32.6 13.4 32.6 23.6 Z']), ('#5d4037', [rect(19.4, 20, 13.2, 2.4)])]
    layers.append(('#2b1d14', [circle(23, 30, 1), circle(29, 30, 1), curve(23, 35, 26, 37, 29, 35, 1.1)]))
    return layers


def rafting():
    """San Gil: el bote de rafting bajando los rápidos del río, con sus remos y los cascos."""
    layers = [(OUTLINE, [rect(2, 54, 96, 42)]), ('#4fa3d9', [rect(3.4, 55.4, 93.2, 39.2)])]
    layers.append(('#e3f2fd', ['M 4 70 Q 14 62 22 70 Q 30 78 40 68 L 40 72 Q 30 82 22 74 Q 14 66 4 74 Z', 'M 56 86 Q 66 78 76 86 Q 86 94 96 84 L 96 88 Q 86 98 76 90 Q 66 82 56 90 Z', 'M 70 62 Q 78 56 86 62 L 86 65 Q 78 59 70 65 Z']))
    layers += [(OUTLINE, ['M 10 66 Q 50 92 90 66 Q 92 54 84 52 L 16 52 Q 8 54 10 66 Z']), ('#ffca28', ['M 12.6 65 Q 50 89 87.4 65 Q 89 56 83.4 54.4 L 16.6 54.4 Q 11 56 12.6 65 Z']), ('#f57f17', [rect(16, 56, 68, 3)])]
    for x, c in [(30, '#e53935'), (50, '#1e88e5'), (70, '#43a047')]:
        layers += shape([(x - 6, 54), (x - 5, 40), (x + 5, 40), (x + 6, 54)], '#fafafa', 1.6) + oval(x, 34, 5, 5.4, '#c68642', d=1.4) + [(OUTLINE, [f'M {x - 6} 33 Q {x - 6} 24 {x} 24 Q {x + 6} 24 {x + 6} 33 Z']), (c, [f'M {x - 4.8} 32 Q {x - 4.8} 25.4 {x} 25.4 Q {x + 4.8} 25.4 {x + 4.8} 32 Z'])]
        layers += bar(x + 4, 42, x + 14, 70, 1.6, '#5d4037') + [(OUTLINE, [ellipse(x + 15, 72, 3.4, 6, -20)]), ('#37474f', [ellipse(x + 15, 72, 2.2, 4.6, -20)])]
    return layers


def piedra_amarilla():
    """La piedra amarilla de Barichara: los bloques de piedra labrada, apilados, con el cincel y el mazo."""
    layers = []
    for x, y, w in [(6, 70, 30), (38, 70, 30), (70, 70, 26), (20, 48, 30), (52, 48, 30), (36, 26, 30)]:
        layers += [(OUTLINE, [rect(x, y, w, 20)]), ('#e8c46a', [rect(x + 1.6, y + 1.6, w - 3.2, 16.8)]), ('#d4a845', [rect(x + 1.6, y + 14, w - 3.2, 4.4)]), ('#f3d98f', [rect(x + 4, y + 4, w * 0.4, 2)])]
        layers.append(('#c9993a', [circle(x + w * 0.7, y + 9, 1), circle(x + w * 0.3, y + 11, 0.8)]))
    layers += bar(74, 30, 92, 12, 3, '#90a4ae') + bar(80, 44, 92, 30, 4, '#8d6e63') + [(OUTLINE, [rect(86, 22, 12, 9, 40)]), ('#6d4c41', [rect(87.6, 23.6, 8.8, 5.8, 40)])]
    return layers


def tapia():
    """La tapia pisada: el muro de tierra apisonada por capas dentro de su molde de tablas, con el pisón."""
    layers = [(OUTLINE, [rect(6, 50, 88, 44)]), ('#c98d5a', [rect(7.6, 51.6, 84.8, 40.8)])]
    layers.append(('#a86d3e', [rect(7.6, 58 + 9 * k, 84.8, 1.6) for k in range(4)]))
    layers.append(('#dba679', [ellipse(x, y, 2, 1.2) for x, y in [(20, 62), (44, 72), (70, 64), (34, 84), (80, 82), (58, 54)]]))
    layers += [(OUTLINE, [rect(2, 26, 96, 24)]), ('#d9b97a', [rect(3.4, 27.4, 93.2, 21.2)]), ('#b8975a', [rect(3.4, 34, 93.2, 1.2), rect(3.4, 41, 93.2, 1.2)])]
    layers += [(OUTLINE, [rect(10, 20, 5, 34), rect(85, 20, 5, 34)]), ('#8d5a32', [rect(11.4, 21.4, 2.2, 31.2), rect(86.4, 21.4, 2.2, 31.2)])]
    layers += bar(50, 4, 52, 34, 3, '#8d6e63') + [(OUTLINE, [rect(44, 30, 16, 10)]), ('#6d4c41', [rect(45.4, 31.4, 13.2, 7.2)])]
    return layers


def amonita():
    """Guane y su museo: la amonita, el fósil en espiral de cuando el cañón era mar, sobre su piedra."""
    layers = shape([(6, 84), (12, 30), (40, 14), (80, 18), (96, 46), (90, 84), (50, 94)], '#d7c49a')
    layers += oval(50, 54, 30, 30, '#b59b6a')
    pts_sp = []
    for t in range(0, 260):
        a = t / 18
        r = 28 * math.exp(-a / 5.6)
        pts_sp.append((50 + r * math.cos(a), 54 + r * math.sin(a)))
    layers.append(('#8a6d40', ['M ' + ' L '.join(f'{x:.1f} {y:.1f}' for x, y in pts_sp) + ' ' + ' L '.join(f'{50 + (x - 50) * 0.92:.1f} {54 + (y - 54) * 0.92:.1f}' for x, y in reversed(pts_sp)) + ' Z']))
    layers.append(('#d9c08f', [rib(50 + 26 * math.cos(a), 54 + 26 * math.sin(a), 50 + 18 * math.cos(a), 54 + 18 * math.sin(a), 1.2) for a in [i * math.pi / 8 for i in range(16)]]))
    layers.append(('#c9ae7c', [circle(50, 54, 4)]))
    return layers


def vasija_guane():
    """Los guanes: la vasija de cerámica pintada con figuras rojas y negras, y la mota de algodón que tejían."""
    layers = [(OUTLINE, ['M 30 90 Q 10 80 14 56 Q 18 36 34 30 L 34 20 L 58 20 L 58 30 Q 74 36 78 56 Q 82 80 62 90 Z']), ('#f0dfc0', ['M 31 87.6 Q 12.6 78.6 16.4 56 Q 20.4 38 36.4 32.4 L 36.4 22.4 L 55.6 22.4 L 55.6 32.4 Q 71.6 38 75.6 56 Q 79.4 78.6 61 87.6 Z'])]
    layers.append(('#a0371c', [rect(16.4, 50, 59.2, 4), rect(18, 66, 56, 4)]))
    layers.append(('#2b1d14', [poly(22 + 10 * i, 56, 27 + 10 * i, 64, 32 + 10 * i, 56) for i in range(5)] + [rect(36.4, 26, 19.2, 2)]))
    layers.append(('#a0371c', [circle(30 + 8 * i, 44, 1.6) for i in range(5)]))
    layers += oval(84, 30, 8, 7, '#fafafa', d=1.6) + oval(78, 24, 6, 5, '#fafafa', d=1.4) + oval(90, 22, 6, 5, '#fafafa', d=1.4)
    layers += [('#8d6e63', [poly(78, 36, 90, 36, 84, 46)])]
    return layers


def mirador():
    """El mirador de Barichara: la baranda de piedra al borde del pueblo y el valle del río Suárez al atardecer."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#ffcc80', [rect(3.6, 3.6, 92.8, 50)]), ('#ffb74d', [rect(3.6, 34, 92.8, 20)])]
    layers += oval(50, 40, 10, 10, '#fff176', d=0)
    layers += [('#8d9a6a', [poly(3.6, 54, 20, 40, 40, 50, 60, 38, 80, 48, 96.4, 40, 96.4, 70, 3.6, 70)]), ('#6f8a4a', [poly(3.6, 62, 30, 52, 58, 60, 82, 52, 96.4, 58, 96.4, 74, 3.6, 74)])]
    layers.append(('#4fa3d9', ['M 3.6 70 Q 40 62 96.4 68 L 96.4 72 Q 40 66 3.6 74 Z']))
    layers += [(OUTLINE, [rect(2, 74, 96, 24)]), ('#e8c46a', [rect(3.6, 75.6, 92.8, 20.8)]), ('#d4a845', [rect(3.6, 84, 92.8, 1.4)] + [rect(14 + 18 * i, 75.6, 1.4, 8.4) for i in range(5)] + [rect(5 + 18 * i, 85.4, 1.4, 11) for i in range(6)])]
    return layers



# ---------- Láminas de la Costa (v4.3) ----------

def water_rect(x, y, w, h, color='#4fa3d9'):
    """Un rectángulo de agua con su borde y unas ondas."""
    return [(OUTLINE, [rect(x, y, w, h)]), (color, [rect(x + 1.4, y + 1.4, w - 2.8, h - 2.8)]), ('#b3e0f2', [rib(x + w * 0.1, y + h * 0.4, x + w * 0.3, y + h * 0.4, 1.2), rib(x + w * 0.55, y + h * 0.7, x + w * 0.8, y + h * 0.7, 1.2)])]


def palm(x, y, h, lean=0, s=1.0):
    """Palma de coco: el tronco curvo y las hojas."""
    top = (x + lean, y - h)
    layers = [(OUTLINE, [curve(x, y, x + lean * 0.2, y - h * 0.5, top[0], top[1], 4.6 * s)]), ('#8d6e63', [curve(x, y, x + lean * 0.2, y - h * 0.5, top[0], top[1], 2.4 * s)])]
    layers.append(('#2e7d32', [leaf(top[0], top[1], top[0] - 16 * s, top[1] + 6 * s, 4 * s), leaf(top[0], top[1], top[0] + 16 * s, top[1] + 4 * s, 4 * s), leaf(top[0], top[1], top[0] - 8 * s, top[1] - 12 * s, 3.4 * s), leaf(top[0], top[1], top[0] + 10 * s, top[1] - 12 * s, 3.4 * s), leaf(top[0], top[1], top[0] + 2 * s, top[1] - 16 * s, 3 * s)]))
    layers.append(('#795548', [circle(top[0] - 2 * s, top[1] + 3 * s, 2 * s), circle(top[0] + 2 * s, top[1] + 3 * s, 2 * s)]))
    return layers


def rio_sinu():
    """El río Sinú: el río que riega las vegas verdes de Córdoba, con los cuadros de arroz y una canoa."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#9ccc65', [rect(3.6, 3.6, 92.8, 92.8)])]
    for x, y in [(8, 8), (30, 8), (8, 28), (64, 60), (80, 76), (62, 80)]:
        layers += [('#c5e17a', [rect(x, y, 18, 16)]), ('#7cb342', [rib(x + 2, y + 4 + 4 * k, x + 16, y + 4 + 4 * k, 1) for k in range(3)])]
    layers += [(OUTLINE, ['M 56 3.6 Q 40 30 60 46 Q 78 62 46 96.4 L 30 96.4 Q 62 62 46 48 Q 26 30 40 3.6 Z']), ('#4fa3d9', ['M 54 3.6 Q 37.6 30 58.4 47 Q 75.4 62 44 96.4 L 32.4 96.4 Q 64 62 48 48 Q 28.4 30 42.4 3.6 Z'])]
    layers += [(OUTLINE, ['M 42 56 L 58 52 L 56 58 L 44 61 Z']), ('#8d5a32', ['M 43.6 56.6 L 56 53.6 L 54.8 57 L 45 59.4 Z'])]
    layers += palm(84, 40, 26, -4, 0.8)
    return layers


def garza():
    """La garza blanca: de pie en el arrozal inundado, con su cuello largo y el pico amarillo, buscando bichos."""
    layers = [(OUTLINE, [rect(2, 70, 96, 26)]), ('#81c784', [rect(3.4, 71.4, 93.2, 23.2)]), ('#4fa3d9', [rect(3.4, 82, 93.2, 12.6)])]
    layers.append(('#558b2f', [rib(8 + 9 * i, 82, 6 + 9 * i, 66, 1.4) for i in range(10)] + [rib(10 + 9 * i, 82, 12 + 9 * i, 68, 1.2) for i in range(10)]))
    layers += bar(46, 64, 44, 88, 1.6, '#3e2723') + bar(54, 64, 56, 88, 1.6, '#3e2723')
    layers += oval(52, 54, 18, 11, '#fafafa', -15)
    layers.append(('#eceff1', [leaf(40, 52, 70, 64, 4)]))
    layers += [(OUTLINE, [curve(40, 50, 26, 34, 36, 20, 6.4)]), ('#fafafa', [curve(40, 50, 26.6, 34, 36, 20.6, 3.6)])]
    layers += oval(38, 18, 6, 5, '#fafafa', d=1.6) + [(OUTLINE, [poly(42, 16, 60, 18, 42, 21)]), ('#fdd835', [poly(43, 17, 57.6, 18.4, 43, 20)]), ('#1b1b1b', [circle(38, 17, 1.2)])]
    return layers


def pilon_shape(grain='#f4c430'):
    """El pilón de madera con su mano y los granos (de maíz o de arroz)."""
    layers = [(OUTLINE, ['M 22 92 L 26 40 L 74 40 L 78 92 Z']), ('#8d5a32', ['M 24.6 89.6 L 28.4 42.4 L 71.6 42.4 L 75.4 89.6 Z']), ('#6d4128', [rect(34, 46, 2, 40), rect(54, 50, 2, 34)])]
    layers += [(OUTLINE, [ellipse(50, 40, 26, 7)]), ('#a1693f', [ellipse(50, 40, 24, 5.4)]), ('#3e2723', [ellipse(50, 40, 16, 3.4)]), (grain, [ellipse(50, 39, 12, 2)])]
    layers += [(OUTLINE, [rect(46, 2, 9, 40, 8)]), ('#c8945a', [rect(47.6, 3.6, 5.8, 36.8, 8)]), (OUTLINE, [ellipse(48, 4, 7, 4, 8)]), ('#c8945a', [ellipse(48, 4, 5.4, 2.6, 8)])]
    layers.append((grain, [ellipse(x, y, 2.4, 1.4) for x, y in [(14, 90), (18, 86), (84, 90), (88, 86), (10, 94), (90, 94), (22, 94)]]))
    return layers


def pilon_arroz():
    """El pilón del arroz: el tronco hueco y la mano de pilón con que se pilaba el arroz, con el grano blanco."""
    layers = pilon_shape('#fafafa')
    layers += [(OUTLINE, [ellipse(88, 70, 9, 6)]), ('#c8a165', [ellipse(88, 70, 7.6, 4.6)]), ('#fafafa', [ellipse(88, 68, 6, 2.6)])]
    return layers


def smoked_fish(cx, cy, s=1.0, rot=0, color='#b0753a'):
    """Un pescado ahumado, dorado, de lado."""
    def S(v):
        return v * s
    layers = oval(cx, cy, S(18), S(6.4), color, rot, 1.6)
    a = math.radians(rot)
    tx, ty = cx + math.cos(a) * S(18), cy + math.sin(a) * S(18)
    layers += [(OUTLINE, [poly(tx - 1, ty, tx + S(9) * math.cos(a) - S(6) * math.sin(a), ty + S(9) * math.sin(a) + S(6) * math.cos(a), tx + S(9) * math.cos(a) + S(6) * math.sin(a), ty + S(9) * math.sin(a) - S(6) * math.cos(a))]),
               (color, [poly(tx, ty, tx + S(7.4) * math.cos(a) - S(4.6) * math.sin(a), ty + S(7.4) * math.sin(a) + S(4.6) * math.cos(a), tx + S(7.4) * math.cos(a) + S(4.6) * math.sin(a), ty + S(7.4) * math.sin(a) - S(4.6) * math.cos(a))])]
    hx, hy = cx - math.cos(a) * S(12), cy - math.sin(a) * S(12)
    layers.append(('#1b1b1b', [circle(hx, hy - S(1), S(1.3))]))
    layers.append(('#7a4a1c', [rib(cx - S(6), cy - S(3), cx - S(2), cy + S(3), S(0.9)), rib(cx, cy - S(3), cx + S(4), cy + S(3), S(0.9)), rib(cx + S(6), cy - S(3), cx + S(10), cy + S(3), S(0.9))]))
    return layers


def arroz_lisa():
    """El arroz de lisa: el arroz revuelto con la lisa ahumada desmenuzada, con la lisa entera encima, en el plato."""
    layers = plato(50, 72, 44, 15)
    layers += [(OUTLINE, ['M 14 72 Q 16 46 50 42 Q 84 46 86 72 Q 50 82 14 72 Z']), ('#f2dfb0', ['M 16.6 71 Q 18.6 48.4 50 44.6 Q 81.4 48.4 83.4 71 Q 50 79.4 16.6 71 Z'])]
    layers.append(('#b0753a', [ellipse(x, y, 3, 1.6) for x, y in [(28, 64), (40, 58), (58, 62), (70, 66), (46, 70), (34, 70)]]))
    layers.append(('#e65100', [circle(x, y, 1.2) for x, y in [(24, 66), (52, 66), (66, 58), (38, 64)]]))
    layers += smoked_fish(52, 46, 1.3, -8)
    return layers


def mompox():
    """Mompox: la iglesia de Santa Bárbara de torre amarilla con balcón, a la orilla del río Magdalena."""
    layers = water_rect(2, 78, 96, 18)
    layers += shape([(10, 78), (10, 48), (52, 48), (52, 78)], '#fff3c4', 1.8) + [(OUTLINE, [poly(6, 50, 31, 36, 56, 50)]), ('#c0592b', [poly(10, 48.6, 31, 38.6, 52, 48.6)])]
    layers += shape([(56, 78), (56, 30), (80, 30), (80, 78)], '#fbc02d', 1.8)
    layers += shape([(58, 30), (58, 16), (78, 16), (78, 30)], '#fdd835', 1.8) + [(OUTLINE, ['M 60 16 Q 68 0 76 16 Z']), ('#fbc02d', ['M 61.6 15.6 Q 68 3.4 74.4 15.6 Z'])]
    layers += [(OUTLINE, [rect(54, 44, 28, 3), rect(56, 47, 2, 6), rect(64, 47, 2, 6), rect(72, 47, 2, 6), rect(78, 47, 2, 6)]), ('#8d5a32', [rect(55, 44.8, 26, 1.4)])]
    layers += [('#5d4037', [rect(64, 20, 8, 8), rect(63, 58, 10, 20), rect(26, 60, 10, 18)]), ('#ffffff', [rect(66.6, 34, 3, 6)])]
    layers += [(OUTLINE, [rect(67, 0, 2, 4)])]
    return layers


def champan():
    """El río Magdalena: el champán, la barca de techo curvo de palma, con el boga empujando con la vara."""
    layers = water_rect(2, 64, 96, 32)
    layers += [(OUTLINE, ['M 6 62 L 94 62 Q 88 76 74 78 L 26 78 Q 12 76 6 62 Z']), ('#8d5a32', ['M 9.4 64 L 90.6 64 Q 85.6 74.4 73.6 75.8 L 26.4 75.8 Q 14.4 74.4 9.4 64 Z']), ('#a1693f', [rect(12, 64, 76, 2)])]
    layers += [(OUTLINE, ['M 22 62 Q 22 34 50 32 Q 78 34 78 62 Z']), ('#d4b06a', ['M 24.4 62 Q 24.4 36.4 50 34.4 Q 75.6 36.4 75.6 62 Z'])]
    layers.append(('#b08c46', [curve(26, 58, 50, 40, 74, 58, 1.2), curve(28, 50, 50, 36, 72, 50, 1.2)]))
    layers += [(OUTLINE, [rect(30, 48, 12, 14), rect(46, 48, 12, 14)]), ('#c8a165', [rect(31.4, 49.4, 9.2, 11.2)]), ('#fafafa', [rect(47.4, 49.4, 9.2, 11.2)])]
    layers += shape([(84, 62), (85, 44), (91, 44), (92, 62)], '#fafafa', 1.4) + oval(88, 38, 4, 4.4, '#8d5a32', d=1.4)
    layers += bar(80, 30, 72, 92, 1.8, '#795548')
    return layers


def enyucado():
    """El enyucado: la tajada de torta de yuca con coco y queso, dorada por encima, con semillas de anís."""
    layers = plato(50, 72, 44, 14)
    layers += [(OUTLINE, [poly(18, 52, 70, 42, 84, 52, 84, 68, 32, 80, 18, 68)])]
    layers += [('#f6e7b4', [poly(20.4, 53.4, 70, 44.4, 81.6, 52.8, 81.6, 66.4, 32, 77.6, 20.4, 66.6)]), ('#e3a64b', [poly(20.4, 53.4, 70, 44.4, 81.6, 52.8, 32, 61)]), ('#c98a2a', [ellipse(46, 52, 10, 2.4, -12), ellipse(64, 50, 5, 1.4, -12)])]
    layers.append(('#fff8e1', [ellipse(x, y, 1.6, 0.9) for x, y in [(36, 68), (50, 64), (62, 66), (44, 72), (72, 62)]]))
    layers.append(('#5d4037', [ellipse(x, y, 1.3, 0.6, 30) for x, y in [(34, 54), (48, 52), (58, 50), (40, 58), (66, 54)]]))
    return layers


def playa_tolu():
    """Tolú y Coveñas: la playa de arena con palmas de coco, el mar del golfo de Morrosquillo y una lancha."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#b3e5fc', [rect(3.6, 3.6, 92.8, 40)]), ('#29b6f6', [rect(3.6, 40, 92.8, 26)]), ('#f3dfa2', ['M 3.6 66 Q 50 56 96.4 66 L 96.4 96.4 L 3.6 96.4 Z'])]
    layers.append(('#e1f5fe', [rib(10, 50, 30, 50, 1.4), rib(50, 56, 70, 56, 1.4), rib(70, 46, 86, 46, 1.4)]))
    layers += oval(78, 18, 8, 8, '#ffca28', d=0)
    layers += [(OUTLINE, ['M 36 48 L 56 48 L 52 54 L 40 54 Z']), ('#e53935', ['M 37.6 49 L 54.4 49 L 51.4 52.8 L 40.6 52.8 Z'])]
    layers += palm(18, 90, 52, 10, 1.0) + palm(80, 92, 40, -10, 0.8)
    return layers


def palafitos():
    """Los palafitos: las casas de madera sobre pilotes en medio de la ciénaga, con la canoa amarrada."""
    layers = water_rect(2, 62, 96, 34)
    for x, c in [(8, '#4fc3f7'), (54, '#ffb74d')]:
        for px in (x + 4, x + 18, x + 32):
            layers += bar(px, 58, px, 84, 2.6, '#6d4c41')
        layers += shape([(x, 58), (x, 34), (x + 38, 34), (x + 38, 58)], c, 1.8)
        layers += [(OUTLINE, [poly(x - 4, 36, x + 19, 20, x + 42, 36)]), ('#a1887f', [poly(x - 0.6, 34.6, x + 19, 22.6, x + 38.6, 34.6)])]
        layers += [('#5d4037', [rect(x + 15, 42, 8, 16)]), ('#fafafa', [rect(x + 4, 40, 7, 7), rect(x + 27, 40, 7, 7)])]
    layers += [(OUTLINE, ['M 36 80 L 62 78 L 58 86 L 40 87 Z']), ('#8d5a32', ['M 38 81 L 60 79.4 L 57 84.6 L 41 85.4 Z'])]
    return layers


def mangle_raices(cx, base, s=1.0):
    """Un mangle con sus raíces en arco metidas en el agua y la copa verde."""
    def S(v):
        return v * s
    layers = []
    for dx in (-14, -7, 0, 7, 14):
        layers += [(OUTLINE, [curve(cx, base - S(24), cx + S(dx) * 0.6, base - S(18), cx + S(dx), base, S(3.4))]), ('#6d4c41', [curve(cx, base - S(24), cx + S(dx) * 0.6, base - S(18), cx + S(dx), base, S(1.6))])]
    layers += bar(cx, base - S(22), cx, base - S(40), S(3.4), '#6d4c41')
    blobs = [(cx, base - S(50), S(14)), (cx - S(12), base - S(42), S(10)), (cx + S(12), base - S(42), S(10))]
    layers += [(OUTLINE, [circle(x, y, r + 2) for x, y, r in blobs]), ('#388e3c', [circle(x, y, r) for x, y, r in blobs]), ('#66bb6a', [circle(cx - S(4), base - S(54), S(4))])]
    return layers


def manglar():
    """El manglar: los mangles con las raíces en el agua salobre, donde se crían los peces."""
    layers = water_rect(2, 70, 96, 26, '#5fa8a0')
    layers += mangle_raices(28, 78, 1.0) + mangle_raices(72, 76, 0.9)
    layers += [(OUTLINE, [ellipse(52, 88, 6, 2.6)]), ('#ffb74d', [ellipse(52, 88, 4.6, 1.6)]), ('#1b1b1b', [circle(49, 87.6, 0.6)])]
    return layers


def cienaga_grande():
    """La Ciénaga Grande: la laguna inmensa, el pescador lanzando la atarraya desde la canoa y las aves."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#c8e6f5', [rect(3.6, 3.6, 92.8, 40)]), ('#4fa3d9', [rect(3.6, 42, 92.8, 54.4)]), ('#7cb342', [rect(3.6, 40, 92.8, 4)])]
    layers.append(('#37474f', [curve(16, 18, 20, 14, 24, 18, 1.2), curve(24, 18, 28, 14, 32, 18, 1.2), curve(40, 12, 44, 8, 48, 12, 1.2), curve(48, 12, 52, 8, 56, 12, 1.2)]))
    layers += [(OUTLINE, ['M 18 78 L 66 76 L 60 84 L 24 85 Z']), ('#8d5a32', ['M 20 79 L 63.4 77.2 L 59 82.6 L 25 83.4 Z'])]
    layers += shape([(30, 78), (31, 60), (39, 60), (40, 78)], '#fafafa', 1.4) + oval(35, 55, 4, 4.4, '#8d5a32', d=1.4)
    layers += bar(38, 64, 52, 50, 2, '#8d5a32')
    layers.append(('#eceff1', ['M 52 50 Q 70 46 86 60 Q 80 74 66 76 Q 58 64 52 50 Z']))
    layers.append(('#90a4ae', [rib(52, 50, 66 + 4 * k, 76 - 3 * k, 0.8) for k in range(5)] + [curve(58, 56, 72, 58, 84, 62, 0.8), curve(62, 64, 74, 66, 82, 70, 0.8)]))
    return layers


def suero_taza():
    """El suero costeño: la taza de crema agria blanca y espesa, con los trozos de yuca y el bollo al lado."""
    layers = [(OUTLINE, ['M 6 44 L 66 44 Q 64 86 36 86 Q 8 86 6 44 Z']), ('#8d4a2a', ['M 8.6 46.4 L 63.4 46.4 Q 61.6 83.6 36 83.6 Q 10.4 83.6 8.6 46.4 Z'])]
    layers += [(OUTLINE, [ellipse(36, 44, 30, 7)]), ('#fffdf5', [ellipse(36, 44, 28, 5.4)]), ('#f1ead8', [ellipse(42, 45, 10, 2)])]
    for x, y, r in [(70, 76, -20), (84, 66, 10)]:
        layers += oval(x, y, 11, 6, '#fff3d6', r, 1.8) + [('#e8d3a0', [ellipse(x + 2, y + 1, 5, 1.6, r)])]
    layers += [(OUTLINE, [leaf(60, 92, 96, 84, 7)]), ('#c5d58a', [leaf(61, 91, 95, 84.6, 5.4)])]
    return layers


def bollo_limpio():
    """El bollo limpio: la masa de maíz envuelta en la hoja y amarrada, uno abierto, y la tajada de queso costeño."""
    layers = [(OUTLINE, [rect(8, 30, 54, 18, -15)]), ('#c5d58a', [rect(9.6, 31.6, 50.8, 14.8, -15)]), ('#9eb35a', [rib(12, 42, 58, 30, 1.2)])]
    layers += [(OUTLINE, [rect(24, 28, 3.6, 22, -15), rect(42, 23, 3.6, 22, -15)]), ('#8d6e63', [rect(25, 29, 1.6, 20, -15), rect(43, 24, 1.6, 20, -15)])]
    layers += [(OUTLINE, [leaf(20, 78, 74, 62, 14)]), ('#c5d58a', [leaf(22, 77, 72, 62.6, 12)])]
    layers += oval(46, 70, 20, 7, '#fff3c4', -15, 1.8) + [('#f4dc8a', [ellipse(42, 70, 9, 2.4, -15)])]
    layers += [(OUTLINE, [poly(66, 70, 92, 62, 96, 76, 70, 84)]), ('#fffdf5', [poly(67.8, 71, 90.8, 64, 94, 75, 71, 82)]), ('#f1ead8', [poly(70, 78, 94, 71, 94, 75, 71, 82)])]
    return layers


def trompeta(cx, cy, s=1.0):
    """La trompeta dorada de la banda."""
    def S(v):
        return v * s
    return [(OUTLINE, [f'M {cx - S(30)} {cy - S(3)} L {cx + S(16)} {cy - S(3)} L {cx + S(30)} {cy - S(12)} L {cx + S(30)} {cy + S(12)} L {cx + S(16)} {cy + S(3)} L {cx - S(30)} {cy + S(3)} Z', rect(cx - S(14), cy - S(12), S(20), S(14))]),
            ('#fbc02d', [f'M {cx - S(28.6)} {cy - S(1.6)} L {cx + S(16.4)} {cy - S(1.6)} L {cx + S(28.6)} {cy - S(9.6)} L {cx + S(28.6)} {cy + S(9.6)} L {cx + S(16.4)} {cy + S(1.6)} L {cx - S(28.6)} {cy + S(1.6)} Z', rect(cx - S(12.6), cy - S(10.6), S(17.2), S(11.2))]),
            ('#fff176', [rect(cx - S(12.6), cy - S(10.6), S(17.2), S(2)), rect(cx - S(26), cy - S(1.6), S(20), S(1))]), ('#f57f17', [rect(cx - S(8), cy - S(16), S(2), S(6)), rect(cx - S(3), cy - S(16), S(2), S(6)), rect(cx + S(2), cy - S(16), S(2), S(6))])]


def redoblante(cx, cy, s=1.0):
    """El redoblante: el tambor de la banda con su aro rojo y las baquetas."""
    def S(v):
        return v * s
    layers = bar(cx - S(10), cy - S(14), cx + S(14), cy - S(34), S(2.4), '#8d6e63') + bar(cx + S(10), cy - S(14), cx - S(12), cy - S(32), S(2.4), '#8d6e63')
    layers += [(OUTLINE, [rect(cx - S(22), cy - S(10), S(44), S(22)), ellipse(cx, cy + S(12), S(22), S(6))]), ('#e53935', [rect(cx - S(20.6), cy - S(8.6), S(41.2), S(20.6)), ellipse(cx, cy + S(12), S(20.6), S(4.6))])]
    layers += oval(cx, cy - S(10), S(22), S(6), '#f5f5f5', d=1.6)
    layers.append(('#fafafa', [rib(cx - S(20) + S(8) * i, cy - S(6), cx - S(16) + S(8) * i, cy + S(10), S(1.2)) for i in range(5)]))
    return layers


def porro():
    """El porro: la música de banda de la sabana, con la trompeta, el bombardino y el redoblante."""
    layers = redoblante(68, 74, 0.9)
    layers += trompeta(38, 30, 0.95)
    layers += [(OUTLINE, ['M 10 90 Q 6 60 18 50 L 24 50 Q 16 62 20 86 Q 30 92 34 80 L 30 62 L 36 62 L 40 84 Q 34 98 10 90 Z']), ('#fbc02d', ['M 12 88.4 Q 8.6 61 19 52.4 L 21 52.4 Q 14 62 18 87.4 Q 30 94 36 80.6 L 32 63.6 L 34.4 63.6 L 38.4 84 Q 33 96 12 88.4 Z'])]
    layers += note(56, 42, 0.8) + note(84, 30, 0.7)
    return layers


def pintas():
    """Las pintas: la trenza de caña flecha con sus figuras negras y blancas, cada una con su nombre."""
    layers = []
    for k, y in enumerate((16, 44, 72)):
        layers += [(OUTLINE, [rect(6, y, 88, 18)]), ('#f3ead2', [rect(7.6, y + 1.6, 84.8, 14.8)])]
        if k == 0:
            layers.append(('#1b1b1b', [poly(10 + 12 * i, y + 15, 16 + 12 * i, y + 3, 22 + 12 * i, y + 15) for i in range(7)]))
        elif k == 1:
            layers.append(('#1b1b1b', [rect(12 + 14 * i, y + 4, 8, 8, 45) for i in range(6)]))
            layers.append(('#f3ead2', [rect(14.4 + 14 * i, y + 6.4, 3.2, 3.2, 45) for i in range(6)]))
        else:
            layers.append(('#1b1b1b', [rect(10 + 10 * i, y + 3 + 6 * (i % 2), 6, 6) for i in range(8)]))
        layers.append(('#d4c49a', [rib(7.6, y + 1.6 + 3.7 * j, 92.4, y + 1.6 + 3.7 * j, 0.5) for j in range(1, 4)]))
    return layers


def oro_zenu():
    """Los zenúes: la orejera de oro en filigrana, el trabajo de orfebrería del pueblo de las ciénagas."""
    layers = [(OUTLINE, [circle(50, 50, 46)]), ('#3e2a1e', [circle(50, 50, 44)])]
    layers += [(OUTLINE, ['M 18 40 Q 50 4 82 40 Q 86 70 50 92 Q 14 70 18 40 Z']), ('#e0a800', ['M 20.6 40.6 Q 50 8 79.4 40.6 Q 83 68.4 50 89 Q 17 68.4 20.6 40.6 Z'])]
    layers += [(OUTLINE, [circle(50, 46, 14)]), ('#3e2a1e', [circle(50, 46, 11.6)])]
    layers.append(('#ffd54f', [curve(26, 44, 34, 30, 44, 26, 1.6), curve(74, 44, 66, 30, 56, 26, 1.6), curve(28, 62, 38, 76, 50, 82, 1.6), curve(72, 62, 62, 76, 50, 82, 1.6)]))
    layers.append(('#ffd54f', [circle(30 + 10 * math.cos(a), 52 + 10 * math.sin(a), 1.4) for a in [i * math.pi / 4 for i in range(8)]] + [circle(70 + 6 * math.cos(a), 52 + 6 * math.sin(a), 1.2) for a in [i * math.pi / 4 for i in range(8)]]))
    layers.append(('#ffe082', [circle(50, 46, 4), rib(50, 34, 50, 40, 1.2), rib(50, 52, 50, 58, 1.2), rib(38, 46, 44, 46, 1.2), rib(56, 46, 62, 46, 1.2)]))
    return layers


def vueltiao_small(cx, cy, s=1.0):
    """El sombrero vueltiao, chico, con sus trenzas negras y blancas."""
    def S(v):
        return v * s
    layers = oval(cx, cy, S(24), S(7), '#f3ead2', d=1.6)
    layers.append(('#1b1b1b', [ellipse(cx, cy, S(19), S(4.6)), ellipse(cx, cy, S(13), S(3))]))
    layers.append(('#f3ead2', [ellipse(cx, cy, S(16), S(3.6))]))
    layers += [(OUTLINE, [f'M {cx - S(12)} {cy} Q {cx - S(12)} {cy - S(16)} {cx} {cy - S(16)} Q {cx + S(12)} {cy - S(16)} {cx + S(12)} {cy} Z']), ('#f3ead2', [f'M {cx - S(10.6)} {cy - S(0.6)} Q {cx - S(10.6)} {cy - S(14.6)} {cx} {cy - S(14.6)} Q {cx + S(10.6)} {cy - S(14.6)} {cx + S(10.6)} {cy - S(0.6)} Z'])]
    layers.append(('#1b1b1b', [rect(cx - S(10.6), cy - S(6), S(21.2), S(2)), rect(cx - S(9), cy - S(11), S(18), S(1.6))]))
    return layers


def tuchin():
    """Tuchín: el pueblo zenú de los sombreros vueltiaos, con la tienda que los cuelga a la vista."""
    layers = oval(50, 92, 46, 4, '#d7ccc8', d=1.2)
    layers += shape([(6, 90), (6, 46), (94, 46), (94, 90)], '#fafafa', 1.8)
    layers += [(OUTLINE, [poly(2, 48, 50, 22, 98, 48)]), ('#c8a165', [poly(6, 46.6, 50, 25, 94, 46.6)]), ('#a1793f', [rib(14, 44, 50, 26, 1), rib(86, 44, 50, 26, 1)])]
    layers += [('#5d4037', [rect(42, 66, 16, 24)])]
    layers += vueltiao_small(22, 64, 0.7) + vueltiao_small(78, 64, 0.7) + vueltiao_small(22, 82, 0.6) + vueltiao_small(78, 82, 0.6)
    layers += [(OUTLINE, [rect(34, 50, 32, 10)]), ('#fdd835', [rect(35.6, 51.6, 28.8, 6.8)]), ('#1b1b1b', [poly(38 + 6 * i, 57, 41 + 6 * i, 53, 44 + 6 * i, 57) for i in range(4)])]
    return layers


def murallas():
    """Las murallas de Cartagena: el muro de piedra coralina con su garita, frente al mar."""
    layers = water_rect(2, 80, 96, 16)
    layers += [(OUTLINE, [poly(2, 82, 2, 40, 98, 40, 98, 82)]), ('#d9c79b', [poly(3.6, 80.6, 3.6, 41.6, 96.4, 41.6, 96.4, 80.6)])]
    layers.append(('#bba57a', [rect(3.6, 52 + 10 * k, 92.8, 1.4) for k in range(3)] + [rect(10 + 16 * i + 8 * (k % 2), 42 + 10 * k, 1.4, 10) for k in range(4) for i in range(6)]))
    layers += [(OUTLINE, [rect(2, 34, 96, 7)] + [rect(4 + 12 * i, 28, 7, 7) for i in range(8)]), ('#e8d9b0', [rect(3.6, 35.6, 92.8, 3.8)])]
    layers += [(OUTLINE, ['M 56 40 L 56 18 L 76 18 L 76 40 Z', 'M 54 18 Q 66 0 78 18 Z']), ('#e8d9b0', [rect(57.6, 19.6, 16.8, 20)]), ('#d9c79b', ['M 56.4 17 Q 66 3.4 75.6 17 Z']), ('#3e2723', [rect(63, 24, 6, 8)])]
    return layers


def palenquera():
    """La palenquera: con su vestido de colores y la ponchera de frutas en la cabeza; viene de San Basilio de Palenque."""
    layers = oval(50, 95, 30, 3, '#d7ccc8', d=1.2)
    layers += [(OUTLINE, ['M 20 94 Q 24 60 36 54 L 64 54 Q 76 60 80 94 Z']), ('#fdd835', ['M 22.6 92.6 Q 26.4 61.6 37 56.4 L 63 56.4 Q 73.6 61.6 77.4 92.6 Z']), ('#1e88e5', ['M 24 80 Q 50 76 76 80 L 77 86 Q 50 82 23.2 86 Z']), ('#e53935', ['M 22.8 88 Q 50 84 77.2 88 L 77.4 92.6 L 22.6 92.6 Z'])]
    layers += shape([(34, 58), (36, 40), (64, 40), (66, 58)], '#e53935', 1.8) + [('#ffffff', [circle(42, 48, 1.6), circle(50, 52, 1.6), circle(58, 46, 1.6)])]
    layers += bar(36, 44, 26, 20, 3.4, '#5d3a24') + bar(64, 44, 74, 20, 3.4, '#5d3a24')
    layers += oval(50, 30, 8, 9, '#5d3a24', d=1.8) + [('#2b1d14', [circle(47, 29, 1), circle(53, 29, 1), curve(47, 34, 50, 36, 53, 34, 1.2)])]
    layers += [(OUTLINE, ['M 36 22 Q 50 14 64 22 L 64 24 L 36 24 Z']), ('#fafafa', ['M 37.6 22.4 Q 50 16 62.4 22.4 L 62.4 23 L 37.6 23 Z'])]
    layers += [(OUTLINE, ['M 22 18 L 78 18 Q 74 26 50 26 Q 26 26 22 18 Z']), ('#cfd8dc', ['M 24.6 19.4 L 75.4 19.4 Q 72 24.4 50 24.4 Q 28 24.4 24.6 19.4 Z'])]
    layers += oval(34, 13, 6, 5, '#e53935', d=1.4) + oval(48, 10, 7, 6, '#ff9800', d=1.4) + oval(62, 12, 6, 5, '#7cb342', d=1.4)
    layers += [(OUTLINE, [leaf(54, 8, 72, 2, 4)]), ('#fdd835', [leaf(55, 8, 71, 3, 3)])]
    return layers


def balcon_cartagena():
    """Los balcones de Cartagena: la casa colonial de colores con el balcón de madera cubierto de bugambilias."""
    layers = shape([(6, 94), (6, 8), (94, 8), (94, 94)], '#ffd180', 1.8)
    layers += [(OUTLINE, [rect(2, 4, 96, 6)]), ('#e8a050', [rect(3.4, 5.4, 93.2, 3.2)])]
    for x in (16, 58):
        layers += [(OUTLINE, [rect(x, 18, 26, 26)]), ('#2e7d32', [rect(x + 1.6, 19.6, 22.8, 22.8)]), ('#1b5e20', [rect(x + 12, 19.6, 1.4, 22.8)])]
    layers += [(OUTLINE, [rect(8, 42, 84, 8), rect(8, 50, 84, 2)] + [rect(11 + 6 * i, 50, 2, 10) for i in range(14)] + [rect(8, 60, 84, 3)]), ('#8d5a32', [rect(9.6, 43.6, 80.8, 4.8)])]
    layers += [('#ec407a', [circle(x, y, 3.4) for x, y in [(12, 40), (18, 36), (24, 42), (70, 38), (78, 34), (86, 40), (90, 46), (8, 48)]]), ('#f48fb1', [circle(x, y, 1.6) for x, y in [(14, 38), (22, 40), (74, 36), (84, 38)]]), ('#43a047', [leaf(20, 40, 30, 34, 2.4), leaf(80, 36, 70, 30, 2.4)])]
    layers += [(OUTLINE, ['M 38 94 L 38 72 Q 50 64 62 72 L 62 94 Z']), ('#5d4037', ['M 39.6 94 L 39.6 72.6 Q 50 66 60.4 72.6 L 60.4 94 Z'])]
    return layers


def san_felipe():
    """El castillo de San Felipe: la fortaleza de piedra en escalones sobre el cerro, con sus garitas y la bandera."""
    layers = [(OUTLINE, [poly(2, 94, 2, 80, 98, 80, 98, 94)]), ('#7cb342', [poly(3.6, 92.6, 3.6, 81.6, 96.4, 81.6, 96.4, 92.6)])]
    for x0, x1, y in [(4, 96, 62), (16, 84, 44), (30, 70, 28)]:
        layers += [(OUTLINE, [poly(x0, 82 if y == 62 else y + 18, x0 + 4, y, x1 - 4, y, x1, 82 if y == 62 else y + 18)]), ('#c9b38a', [poly(x0 + 1.8, 81 if y == 62 else y + 17, x0 + 5.4, y + 1.6, x1 - 5.4, y + 1.6, x1 - 1.8, 81 if y == 62 else y + 17)])]
        layers.append(('#a8916a', [rect(x0 + 6, y + 6, x1 - x0 - 12, 1.2)]))
    for x, y in [(8, 56), (88, 56), (20, 38), (78, 38)]:
        layers += [(OUTLINE, ['M %s %s L %s %s L %s %s L %s %s Z' % (x - 4, y + 8, x - 4, y, x + 4, y, x + 4, y + 8), 'M %s %s Q %s %s %s %s Z' % (x - 5, y, x, y - 8, x + 5, y)]), ('#e8d9b0', [rect(x - 2.6, y + 1, 5.2, 6), 'M %s %s Q %s %s %s %s Z' % (x - 3.6, y - 0.4, x, y - 6, x + 3.6, y - 0.4)])]
    layers += bar(50, 28, 50, 6, 1.6, '#5d4037') + [(OUTLINE, [rect(51, 6, 14, 9)]), ('#fdd835', [rect(52.2, 7.2, 11.6, 3.4)]), ('#1e88e5', [rect(52.2, 10.6, 11.6, 1.8)]), ('#e53935', [rect(52.2, 12.4, 11.6, 1.8)])]
    layers.append(('#5d4037', [rect(46, 36, 8, 8), rect(30, 52, 6, 6), rect(64, 52, 6, 6)]))
    return layers


def islas_rosario():
    """Las Islas del Rosario: la isla de arena blanca con su palma en el mar turquesa, los corales y la lancha."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#b3e5fc', [rect(3.6, 3.6, 92.8, 34)]), ('#26c6da', [rect(3.6, 36, 92.8, 60.4)]), ('#80deea', [ellipse(50, 70, 40, 14)])]
    layers += oval(46, 68, 26, 8, '#fff3d6')
    layers.append(('#ff8a80', [ellipse(20, 86, 4, 2), ellipse(78, 88, 5, 2), ellipse(84, 80, 3, 1.4)]))
    layers += palm(44, 66, 40, 8, 0.9)
    layers += [(OUTLINE, ['M 66 50 L 90 50 L 86 56 L 70 56 Z']), ('#fafafa', ['M 67.6 51 L 88.4 51 L 85.4 54.8 L 70.6 54.8 Z']), ('#1e88e5', [rect(70, 52.6, 16, 1.4)])]
    return layers



# ---------- Láminas de Boyacá (v4.3) ----------

def ruana_person(cx, base, ruana='#8d6e63', stripe='#5d4037', hat='#5d4037', skin='#d9a46c'):
    """Una persona de ruana y sombrero, de frente (el campesino del altiplano)."""
    layers = shape([(cx - 9, base), (cx - 8, base - 22), (cx + 8, base - 22), (cx + 9, base)], '#37474f', 1.6)
    layers += [(OUTLINE, [f'M {cx - 22} {base - 18} Q {cx - 20} {base - 48} {cx} {base - 50} Q {cx + 20} {base - 48} {cx + 22} {base - 18} Z']), (ruana, [f'M {cx - 19.6} {base - 19.6} Q {cx - 17.6} {base - 46} {cx} {base - 47.6} Q {cx + 17.6} {base - 46} {cx + 19.6} {base - 19.6} Z'])]
    layers.append((stripe, [rect(cx - 19, base - 28, 38, 2.4), rect(cx - 18, base - 33, 36, 1.4)]))
    layers += oval(cx, base - 56, 7.4, 8, skin, d=1.8) + [('#2b1d14', [circle(cx - 2.6, base - 56, 1), circle(cx + 2.6, base - 56, 1), curve(cx - 2.6, base - 52, cx, base - 50.4, cx + 2.6, base - 52, 1)])]
    layers += oval(cx, base - 62, 13, 2.6, hat, d=1.6) + [(OUTLINE, [f'M {cx - 7} {base - 62} Q {cx - 7} {base - 72} {cx} {base - 72} Q {cx + 7} {base - 72} {cx + 7} {base - 62} Z']), (hat, [f'M {cx - 5.6} {base - 62.4} Q {cx - 5.6} {base - 70.6} {cx} {base - 70.6} Q {cx + 5.6} {base - 70.6} {cx + 5.6} {base - 62.4} Z'])]
    return layers


def papa_pieza(cx, cy, rx, ry, color='#c9a06a', rot=0):
    """Una papa con sus ojitos."""
    return oval(cx, cy, rx, ry, color, rot, 1.6) + [(tone(color, 0.75), [circle(cx - rx * 0.3, cy - ry * 0.2, 0.9), circle(cx + rx * 0.35, cy + ry * 0.25, 0.9)])]


def tone(color, k):
    """El mismo color más oscuro (k < 1) o más claro (k > 1)."""
    c = color.lstrip('#')
    r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    f = lambda v: max(0, min(255, round(v * k if k <= 1 else v + (255 - v) * (k - 1))))
    return '#%02x%02x%02x' % (f(r), f(g), f(b))


def papicultor():
    """El papicultor: de ruana y sombrero, con el azadón, junto a las matas de papa y el bulto de la cosecha."""
    layers = oval(50, 94, 46, 3.6, '#8d6e63', d=1.2)
    layers += bar(66, 36, 70, 92, 2.4, '#8d6e63') + [(OUTLINE, [poly(62, 88, 80, 88, 78, 96, 64, 96)]), ('#90a4ae', [poly(63.6, 89.4, 78.4, 89.4, 77, 94.6, 65, 94.6)])]
    layers += ruana_person(40, 92, '#795548', '#d7ccc8', '#3e2723')
    layers += [(OUTLINE, [poly(78, 92, 80, 64, 96, 64, 98, 92)]), ('#c8a165', [poly(79.6, 90.6, 81.4, 65.6, 94.6, 65.6, 96.4, 90.6)]), ('#a1793f', [rib(80, 72, 96, 72, 1.2)])]
    layers += papa_pieza(14, 90, 5, 3.6) + papa_pieza(24, 92, 4, 3)
    layers.append(('#558b2f', [leaf(8, 82, 2, 70, 3), leaf(8, 82, 14, 70, 3)]))
    return layers


def cocido():
    """El cocido boyacense: en la bandeja, papas, mazorca, habas, cubios, chuguas y carnes, cocinados juntos."""
    layers = oval(50, 70, 46, 18, '#a1693f')
    layers += [('#8d5a32', [ellipse(50, 70, 40, 13)])]
    layers += oval(30, 58, 14, 6, '#f4c430', -20, 1.6) + [('#e8a317', [ellipse(22 + 4 * i, 61 - 1.6 * i, 1.6, 2) for i in range(5)])]
    layers += papa_pieza(56, 60, 8, 6) + papa_pieza(70, 66, 7, 5, '#d4a65a') + papa_pieza(44, 74, 6, 4.4, '#fbc02d')
    layers += oval(26, 76, 6, 3, '#e57373', 30, 1.4) + oval(34, 82, 5, 2.6, '#fdd835', -20, 1.4) + oval(78, 76, 5, 3, '#ef9a9a', 10, 1.4)
    layers += oval(60, 80, 9, 5, '#8d4a2a', -10, 1.6) + oval(80, 58, 7, 4, '#a0522d', 20, 1.4)
    layers.append(('#9ccc65', [ellipse(x, y, 2.6, 1.6, 30) for x, y in [(46, 64), (50, 82), (68, 74), (38, 66)]]))
    return layers


def cubios():
    """Cubios y chuguas: los tubérculos del altiplano, los cubios largos y pintados, y las chuguas redondas de colores."""
    layers = []
    for x, y, r in [(26, 34, 30), (50, 30, -10), (70, 40, 50)]:
        layers += oval(x, y, 16, 7, '#f2d65c', r, 1.8) + [('#9c4fb5', [ellipse(x + 8 * math.cos(math.radians(r)) * (k - 1) * 0.6, y + 8 * math.sin(math.radians(r)) * (k - 1) * 0.6, 1.4, 6, r) for k in range(3)])]
    for x, y, c in [(22, 74, '#fdd835'), (40, 80, '#e53935'), (58, 74, '#fb8c00'), (76, 80, '#fdd835'), (32, 64, '#ef5350'), (66, 62, '#ffca28')]:
        layers += oval(x, y, 7, 6, c, d=1.6) + [('#ffffff', [ellipse(x - 2, y - 2, 2, 1.2)])]
    return layers


def frailejon_plant(cx, base, s=1.0):
    """Un frailejón: el tallo cubierto de hojas secas y la roseta de hojas peludas, con sus flores amarillas."""
    def S(v):
        return v * s
    layers = [(OUTLINE, [rect(cx - S(6), base - S(40), S(12), S(40))]), ('#8d6e63', [rect(cx - S(4.6), base - S(40), S(9.2), S(38.6))]), ('#6d4c41', [rect(cx - S(4.6), base - S(36) + S(8) * k, S(9.2), S(1.4)) for k in range(5)])]
    leaves = [leaf(cx, base - S(40), cx + S(18) * math.cos(a), base - S(40) + S(12) * math.sin(a), S(4.4)) for a in [math.pi + i * math.pi / 6 for i in range(7)]]
    layers += [(OUTLINE, [leaf(cx, base - S(40), cx + S(20) * math.cos(a), base - S(40) + S(13) * math.sin(a), S(6)) for a in [math.pi + i * math.pi / 6 for i in range(7)]]), ('#b5c4a0', leaves)]
    layers.append(('#e3ead6', [leaf(cx, base - S(40), cx + S(14) * math.cos(a), base - S(40) + S(9) * math.sin(a), S(1.6)) for a in [math.pi + i * math.pi / 6 for i in range(7)]]))
    for dx in (-8, 0, 8):
        layers += bar(cx + S(dx * 0.4), base - S(44), cx + S(dx), base - S(56), S(1), '#7c8b5c', 1) + oval(cx + S(dx), base - S(58), S(2.6), S(2.6), '#fdd835', d=1.2)
    return layers


def frailejon():
    """El frailejón: la planta peluda del páramo, que guarda el agua de la neblina."""
    layers = oval(50, 92, 44, 5, '#8bae5a', d=1.4)
    layers += frailejon_plant(60, 92, 1.3) + frailejon_plant(22, 90, 0.8)
    return layers


def neblina():
    """La neblina del páramo: los frailejones y las lomas en la madrugada fría, cubiertos de niebla."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#cfd8dc', [rect(3.6, 3.6, 92.8, 92.8)]), ('#9aa88a', [poly(3.6, 60, 30, 40, 56, 54, 80, 36, 96.4, 48, 96.4, 96.4, 3.6, 96.4)]), ('#7c8b5c', [poly(3.6, 76, 40, 62, 70, 74, 96.4, 64, 96.4, 96.4, 3.6, 96.4)])]
    layers += frailejon_plant(30, 92, 0.7) + frailejon_plant(70, 94, 0.8)
    layers.append(('#eceff1', [rect(3.6, 46, 92.8, 6), rect(3.6, 70, 92.8, 7), rect(3.6, 24, 70, 5)]))
    layers.append(('#f5f7f8', [rect(20, 58, 76.4, 4), rect(3.6, 84, 60, 4)]))
    return layers


def tunjo():
    """Los muiscas: el tunjo de oro, la figurita plana que ofrecían, delante del sol que adoraban."""
    layers = oval(50, 46, 40, 40, '#ffe082', d=0)
    layers.append(('#ffca28', [rib(50 + 30 * math.cos(a), 46 + 30 * math.sin(a), 50 + 44 * math.cos(a), 46 + 44 * math.sin(a), 3) for a in [i * math.pi / 8 for i in range(16)]]))
    body = [(36, 92), (38, 34), (32, 22), (40, 12), (60, 12), (68, 22), (62, 34), (64, 92), (56, 92), (54, 60), (46, 60), (44, 92)]
    layers += shape(body, '#d4a017', 2.2)
    layers.append(('#a87d00', [rect(42, 22, 4, 2), rect(54, 22, 4, 2), rect(46, 30, 8, 2), rect(40, 40, 20, 1.6), rect(40, 48, 20, 1.6), rect(36, 16, 28, 1.6)]))
    layers += bar(38, 40, 26, 58, 2.4, '#d4a017') + bar(62, 40, 74, 58, 2.4, '#d4a017')
    return layers


def mucura(cx, cy, s=1.0, color='#b5653a'):
    """La múcura: la vasija de barro de cuello angosto."""
    def S(v):
        return v * s
    return [(OUTLINE, [f'M {cx - S(8)} {cy - S(30)} L {cx + S(8)} {cy - S(30)} L {cx + S(8)} {cy - S(22)} Q {cx + S(24)} {cy - S(14)} {cx + S(22)} {cy + S(6)} Q {cx + S(18)} {cy + S(22)} {cx} {cy + S(22)} Q {cx - S(18)} {cy + S(22)} {cx - S(22)} {cy + S(6)} Q {cx - S(24)} {cy - S(14)} {cx - S(8)} {cy - S(22)} Z']),
            (color, [f'M {cx - S(6.4)} {cy - S(28.4)} L {cx + S(6.4)} {cy - S(28.4)} L {cx + S(6.4)} {cy - S(20.6)} Q {cx + S(22)} {cy - S(13)} {cx + S(20)} {cy + S(5.4)} Q {cx + S(16.6)} {cy + S(19.6)} {cx} {cy + S(19.6)} Q {cx - S(16.6)} {cy + S(19.6)} {cx - S(20)} {cy + S(5.4)} Q {cx - S(22)} {cy - S(13)} {cx - S(6.4)} {cy - S(20.6)} Z']),
            (tone(color, 0.75), [rect(cx - S(20), cy - S(4), S(40), S(2)), rect(cx - S(18), cy + S(4), S(36), S(1.4))]), (tone(color, 1.3), [ellipse(cx - S(10), cy - S(8), S(3), S(6), 20)])]


def chicha():
    """La chicha: la múcura de barro donde fermenta el maíz y la totuma servida, con las mazorcas al lado."""
    layers = mucura(36, 62, 1.25)
    layers += [(OUTLINE, ['M 62 70 Q 64 92 80 92 Q 96 92 98 70 Z']), ('#8d5a32', ['M 64.6 71.4 Q 66.4 89.6 80 89.6 Q 93.6 89.6 95.4 71.4 Z'])]
    layers += [(OUTLINE, [ellipse(80, 70, 18, 4.4)]), ('#f3e2a0', [ellipse(80, 70, 16.4, 3)]), ('#fffbe6', [ellipse(76, 69.6, 6, 1.2)])]
    layers += oval(78, 34, 14, 6, '#f4c430', -30, 1.6) + [('#e8a317', [ellipse(72 + 4 * i, 38 - 2.4 * i, 1.6, 2) for i in range(4)]), ('#c5d58a', [leaf(90, 26, 98, 12, 3)])]
    return layers


def guarapo_olla():
    """El guarapo: la olla grande de barro donde fermenta el jugo de caña con panela, espumoso, y la totuma."""
    layers = [(OUTLINE, ['M 10 40 L 70 40 Q 74 70 62 88 L 18 88 Q 6 70 10 40 Z']), ('#a85a32', ['M 12.6 42.4 L 67.4 42.4 Q 71 70 60.4 85.6 L 19.6 85.6 Q 9 70 12.6 42.4 Z']), ('#8d4a2a', [rect(12, 56, 56, 2.4)])]
    layers += [(OUTLINE, [ellipse(40, 40, 32, 7)]), ('#c9a24a', [ellipse(40, 40, 30, 5.4)]), ('#f6efd8', [ellipse(x, y, 4, 1.8) for x, y in [(28, 39), (38, 41), (48, 38), (54, 41), (34, 37)]])]
    layers += [(OUTLINE, ['M 72 76 Q 74 94 86 94 Q 98 94 98 76 Z']), ('#8d5a32', ['M 74.4 77.4 Q 76 91.6 86 91.6 Q 95.6 91.6 95.6 77.4 Z']), (OUTLINE, [ellipse(85, 76, 13, 3.4)]), ('#c9a24a', [ellipse(85, 76, 11.4, 2.2)])]
    layers += bar(76, 66, 92, 14, 3.4, '#9ccc65') + [('#558b2f', [rect(78 + 3 * k, 54 - 12 * k, 4, 1.4, -17) for k in range(4)])]
    return layers


def tejo():
    """El tejo: la cancha de greda con el bocín, las mechas rojas de pólvora y el tejo de hierro que va a totear."""
    layers = [(OUTLINE, [poly(6, 70, 50, 54, 94, 70, 50, 90)]), ('#8d6e63', [poly(9.6, 70, 50, 56.6, 90.4, 70, 50, 87.4)]), ('#b5917a', [poly(16, 70, 50, 59, 84, 70, 50, 83)])]
    layers += [(OUTLINE, [ellipse(50, 70, 12, 5)]), ('#5d4037', [ellipse(50, 70, 10.4, 3.6)])]
    for x, y in [(38, 66), (62, 66), (50, 77)]:
        layers += [(OUTLINE, [poly(x - 6, y + 2, x + 6, y + 2, x, y - 8)]), ('#fafafa', [poly(x - 4.4, y + 1, x + 4.4, y + 1, x, y - 5.6)]), ('#e53935', [poly(x - 2.4, y + 1, x + 2.4, y + 1, x, y - 2.6)])]
    layers += oval(76, 24, 12, 6, '#78909c', -20) + [('#b0bec5', [ellipse(72, 22, 5, 2, -20)])]
    layers.append(('#ff7043', [poly(56, 48, 60, 40, 62, 48, 70, 44, 64, 52, 72, 56, 62, 56, 60, 64, 56, 56, 48, 56, 54, 52, 46, 44)]))
    layers.append(('#ffca28', [poly(58, 50, 60, 46, 61, 50, 65, 49, 62, 52, 66, 54, 61, 54, 60, 58, 58, 54, 54, 54, 57, 52, 53, 49)]))
    return layers


def feijoa(cx, cy, s=1.0, rot=0):
    """La feijoa: la fruta verde ovalada con su corona."""
    def S(v):
        return v * s
    return oval(cx, cy, S(12), S(16), '#689f38', rot, 1.8) + [('#8bc34a', [ellipse(cx - S(4), cy - S(4), S(3), S(7), rot)]), ('#3e2723', [circle(cx + S(16) * math.sin(math.radians(rot)), cy - S(16) * math.cos(math.radians(rot)), S(2))])]


def tibasosa():
    """Tibasosa: la feijoa, entera y partida con su pulpa clara, delante de una casa blanca del pueblo."""
    layers = shape([(44, 70), (44, 36), (92, 36), (92, 70)], '#fafafa', 1.8) + [(OUTLINE, [poly(40, 38, 68, 20, 96, 38)]), ('#c0592b', [poly(44, 36.6, 68, 22.6, 92, 36.6)]), ('#2e7d32', [rect(62, 50, 12, 20), rect(50, 44, 7, 7), rect(80, 44, 7, 7)])]
    layers += feijoa(24, 70, 1.4, -15)
    layers += oval(62, 82, 16, 11, '#689f38') + [('#f1f0d4', [ellipse(62, 82, 13, 8.6)]), ('#d9d6a0', [ellipse(62, 82, 7, 4)]), ('#8a8455', [circle(62 + 4 * math.cos(a), 82 + 2.4 * math.sin(a), 0.7) for a in [i * math.pi / 4 for i in range(8)]])]
    return layers


def alfarera():
    """La alfarera: sentada al torno, amasando y subiendo la olla de barro con las manos mojadas."""
    layers = oval(50, 94, 40, 3, '#a1887f', d=1.2)
    layers += [(OUTLINE, [rect(42, 74, 16, 20), ellipse(50, 74, 22, 5)]), ('#6d4c41', [rect(43.6, 75.6, 12.8, 18)]), ('#8d6e63', [ellipse(50, 74, 20.4, 3.6)])]
    layers += [(OUTLINE, ['M 38 72 Q 34 56 42 46 L 58 46 Q 66 56 62 72 Z']), ('#b5653a', ['M 40.4 70.6 Q 36.6 56.6 43.6 48.4 L 56.4 48.4 Q 63.4 56.6 59.6 70.6 Z']), ('#d98552', [ellipse(46, 58, 2.4, 6)])]
    layers += [(OUTLINE, [ellipse(50, 46, 8, 2.4)]), ('#7a3e1e', [ellipse(50, 46, 6.4, 1.4)])]
    layers += shape([(14, 92), (16, 56), (34, 56), (36, 92)], '#e53935', 1.8) + [('#fdd835', [rect(16, 80, 19, 3)])]
    layers += bar(30, 62, 40, 56, 3, '#c68642') + bar(30, 70, 40, 66, 3, '#c68642')
    layers += oval(25, 44, 8, 9, '#c68642', d=1.8) + [('#2b1d14', ['M 16 44 Q 16 30 25 30 Q 34 30 34 44 Q 30 36 25 36 Q 20 36 16 44 Z', circle(27, 44, 1), curve(22, 49, 25, 51, 28, 49, 1.1)])]
    layers += [(OUTLINE, [rect(14, 30, 3, 26)]), ('#2b1d14', [rect(14.8, 30.8, 1.4, 24.4)])]
    return layers


def alcancia():
    """La alcancía: el marranito de barro con la ranura en el lomo, para guardar las monedas."""
    layers = oval(48, 58, 34, 24, '#c8693a')
    layers += [(OUTLINE, [rect(26, 76, 8, 12), rect(58, 76, 8, 12)]), ('#b0582d', [rect(27.4, 77.4, 5.2, 9.2), rect(59.4, 77.4, 5.2, 9.2)])]
    layers += oval(48, 58, 34, 24, '#c8693a')
    layers.append(('#e08a52', [ellipse(40, 46, 14, 6, -10)]))
    layers += oval(14, 58, 7, 9, '#d9784a', d=1.6) + [('#7a3e1e', [ellipse(12, 55, 1.2, 2), ellipse(12, 61, 1.2, 2)])]
    layers += [(OUTLINE, [poly(22, 40, 26, 26, 34, 38)]), ('#b0582d', [poly(23.6, 39.4, 26.6, 29.4, 32, 38)])]
    layers += [('#1b1b1b', [circle(24, 48, 1.6)]), (OUTLINE, [rect(44, 34, 14, 3, -5)]), ('#3e2723', [rect(45, 34.8, 12, 1.4, -5)])]
    layers += [(OUTLINE, [curve(82, 54, 92, 50, 88, 42, 2.6)]), ('#c8693a', [curve(82, 54, 91, 50, 88, 43, 1)])]
    layers.append(('#2196f3', [rib(30 + 8 * i, 64, 34 + 8 * i, 70, 1.4) for i in range(4)]))
    layers += oval(84, 86, 7, 2.6, '#fbc02d', d=1.4) + oval(84, 82, 7, 2.6, '#fdd835', d=1.4) + oval(74, 90, 6, 2.4, '#fbc02d', d=1.4)
    return layers


def candelaria():
    """La Candelaria: el monasterio blanco de tejas en medio del desierto, con sus arcos y los cactus."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#ffe0b2', [rect(3.6, 3.6, 92.8, 50)]), ('#d9a86c', [poly(3.6, 64, 30, 54, 70, 58, 96.4, 52, 96.4, 96.4, 3.6, 96.4)])]
    layers += shape([(14, 82), (14, 50), (78, 50), (78, 82)], '#fafafa', 1.8) + [(OUTLINE, [rect(10, 44, 72, 8)]), ('#c0592b', [rect(11.6, 45.6, 68.8, 4.8)])]
    layers += shape([(64, 50), (64, 24), (80, 24), (80, 50)], '#fafafa', 1.8) + [(OUTLINE, [poly(60, 26, 72, 14, 84, 26)]), ('#c0592b', [poly(63, 25, 72, 17, 81, 25)]), ('#5d4037', [rect(69, 30, 6, 8)])]
    layers.append(('#a1887f', ['M %s 82 L %s 66 Q %s 60 %s 66 L %s 82 Z' % (20 + 12 * i, 20 + 12 * i, 25 + 12 * i, 30 + 12 * i, 30 + 12 * i) for i in range(4)]))
    layers += bar(90, 92, 90, 70, 3.4, '#558b2f') + bar(8, 94, 8, 78, 3, '#558b2f')
    return layers


def raquira():
    """Ráquira: el pueblo de las ollas, con las casas pintadas de colores vivos y las vasijas a la puerta."""
    layers = oval(50, 92, 46, 4, '#d7ccc8', d=1.2)
    layers += house_front(6, 50, 30, 34, '#ec407a', '#c0592b', '#1e88e5') + house_front(40, 46, 26, 38, '#fdd835', '#c0592b', '#43a047') + house_front(70, 52, 26, 32, '#29b6f6', '#c0592b', '#e53935')
    layers += mucura(20, 86, 0.32) + mucura(52, 86, 0.36, '#c8693a') + mucura(84, 86, 0.3)
    return layers


def kumis_almojabana():
    """El kumis de Paipa: el vaso de leche fermentada con canela y la almojábana al lado."""
    layers = [(OUTLINE, [poly(22, 18, 64, 18, 60, 92, 26, 92)]), ('#e3f2f8', [poly(24.6, 20.4, 61.4, 20.4, 57.6, 89.6, 28.4, 89.6)]), ('#fdf8ec', [poly(25.2, 30, 60.8, 30, 57.6, 89.6, 28.4, 89.6)])]
    layers += [('#c8a165', [ellipse(43, 30, 17.6, 2.6)]), ('#ffffff', [rect(28, 34, 3, 50)])]
    layers += oval(78, 80, 16, 12, '#f2c66d') + [('#f9e2a8', [ellipse(74, 76, 7, 4)]), ('#d9a441', [curve(68, 82, 78, 86, 88, 82, 1.2)])]
    return layers


def termales():
    """Los termales de Paipa: la poza de agua caliente que sale de la tierra con vapor, entre las piedras."""
    layers = oval(50, 72, 44, 20, '#9e9e9e')
    layers += [('#757575', [ellipse(20, 64, 8, 5), ellipse(80, 66, 9, 5), ellipse(50, 88, 10, 4)])]
    layers += [(OUTLINE, [ellipse(50, 70, 34, 12)]), ('#4dd0e1', [ellipse(50, 70, 32.4, 10.6)]), ('#b2ebf2', [ellipse(42, 68, 10, 2.4), ellipse(60, 73, 8, 1.8)])]
    for x in (34, 50, 66):
        layers.append(('#eceff1', [f'M {x - 3} 62 Q {x - 9} 50 {x - 2} 40 Q {x + 3} 32 {x - 2} 22 L {x + 2} 22 Q {x + 7} 32 {x + 2} 41 Q {x - 4} 50 {x + 1} 62 Z']))
    return layers


def lanceros():
    """El Pantano de Vargas: el monumento de bronce de los catorce lanceros, el jinete con la lanza sobre su pedestal."""
    layers = [(OUTLINE, [rect(18, 78, 64, 18), rect(12, 90, 76, 6)]), ('#b0a99a', [rect(19.6, 79.6, 60.8, 14.8), rect(13.6, 91.6, 72.8, 2.8)])]
    layers += mule(52, 58, 0.62, body='#7d6a4a', load=False, horse=True)
    layers += shape([(46, 50), (48, 34), (58, 34), (60, 50)], '#8a7650', 1.6) + oval(53, 28, 5, 5.6, '#8a7650', d=1.4)
    layers += bar(30, 6, 74, 52, 1.8, '#5d5240') + [(OUTLINE, [poly(26, 2, 34, 6, 30, 10)]), ('#8a7650', [poly(27.6, 3.4, 32.6, 6, 30, 8.6)])]
    layers += bar(56, 38, 64, 30, 2.4, '#8a7650')
    layers.append(('#a0905e', [ellipse(44, 52, 3, 6, 20)]))
    return layers


def telar_lana():
    """El telar de la ruana: el telar de madera donde la ruana de lana crece franja por franja."""
    layers = [(OUTLINE, [rect(6, 12, 6, 82), rect(88, 12, 6, 82), rect(6, 12, 88, 6), rect(6, 72, 88, 6)]), ('#8d5a32', [rect(7.4, 13.4, 3.2, 79.2), rect(89.4, 13.4, 3.2, 79.2), rect(7.4, 13.4, 85.2, 3.2), rect(7.4, 73.4, 85.2, 3.2)])]
    layers.append(('#d7ccc8', [rect(16 + 4.4 * i, 18, 1.2, 54) for i in range(17)]))
    layers += [(OUTLINE, [rect(14, 40, 72, 32)]), ('#8d6e63', [rect(15.4, 41.4, 69.2, 29.2)])]
    layers.append(('#d7ccc8', [rect(15.4, 46, 69.2, 3), rect(15.4, 60, 69.2, 3)]))
    layers.append(('#5d4037', [rect(15.4, 53, 69.2, 2)]))
    layers += [(OUTLINE, [rect(12, 34, 76, 5)]), ('#a1693f', [rect(13.4, 35.4, 73.2, 2.2)])]
    layers += [(OUTLINE, [ellipse(52, 26, 12, 4)]), ('#a1693f', [ellipse(52, 26, 10.4, 2.6)]), ('#8d6e63', [ellipse(52, 26, 6, 1.6)])]
    layers += oval(84, 88, 8, 6, '#bcaaa4', d=1.6) + [('#8d6e63', [curve(78, 86, 84, 84, 90, 88, 0.8)])]
    return layers


def nobsa():
    """Nobsa: las ruanas de colores colgadas a la puerta del taller, en el pueblo de las ruanas."""
    layers = oval(50, 92, 46, 4, '#d7ccc8', d=1.2)
    layers += shape([(10, 90), (10, 40), (90, 40), (90, 90)], '#fafafa', 1.8) + [(OUTLINE, [poly(4, 42, 50, 18, 96, 42)]), ('#c0592b', [poly(8, 40.6, 50, 21, 92, 40.6)])]
    layers += [(OUTLINE, [rect(8, 46, 84, 2.4)])]
    for x, c, st in [(14, '#8d6e63', '#d7ccc8'), (40, '#455a64', '#e53935'), (66, '#d7ccc8', '#5d4037')]:
        layers += [(OUTLINE, [rect(x, 47, 22, 34)]), (c, [rect(x + 1.4, 48.4, 19.2, 31.2)]), (st, [rect(x + 1.4, 70, 19.2, 3), rect(x + 1.4, 75, 19.2, 1.6)])]
        layers.append(('#fafafa', [rect(x + 10, 48.4, 2, 6)]))
    return layers


def plaza_empedrada():
    """La plaza de Villa de Leyva: la plaza grande toda de piedra, con la pila en el centro y las casas blancas."""
    layers = [(OUTLINE, [poly(2, 96, 14, 54, 86, 54, 98, 96)]), ('#c9b98f', [poly(4, 94.6, 15.4, 55.6, 84.6, 55.6, 96, 94.6)])]
    layers.append(('#a8986e', [ellipse(14 + 8 * i + 4 * (j % 2), 62 + 7 * j, 3, 1.6) for j in range(5) for i in range(10) if 8 + 8 * i < 90]))
    layers += shape([(2, 54), (2, 26), (98, 26), (98, 54)], '#fafafa', 1.6) + [(OUTLINE, [rect(0, 22, 100, 6)]), ('#c0592b', [rect(1.4, 23.4, 97.2, 3.2)])]
    layers += [('#2e7d32', [rect(8 + 14 * i, 34, 6, 10) for i in range(7)]), ('#5d4037', [rect(10 + 14 * i, 46, 4, 8) for i in range(7)])]
    layers += [(OUTLINE, [ellipse(50, 78, 14, 5), rect(46, 62, 8, 16), ellipse(50, 62, 8, 3)]), ('#e0d6c0', [ellipse(50, 78, 12.4, 3.6), rect(47.4, 63, 5.2, 14), ellipse(50, 62, 6.6, 1.8)]), ('#4fa3d9', [ellipse(50, 77.6, 9, 2)])]
    return layers


def cometa(cx, cy, s, color, accent, rot=0):
    """Una cometa de rombo con su cola de moñitos."""
    def S(v):
        return v * s
    pts_k = [(cx, cy - S(14)), (cx + S(10), cy - S(2)), (cx, cy + S(16)), (cx - S(10), cy - S(2))]
    layers = shape(pts_k, color, 1.6) + [(accent, [poly(cx, cy - S(14), cx + S(10), cy - S(2), cx, cy - S(2))]), (OUTLINE, [rib(cx, cy - S(14), cx, cy + S(16), 0.8), rib(cx - S(10), cy - S(2), cx + S(10), cy - S(2), 0.8)])]
    layers.append((OUTLINE, [curve(cx, cy + S(16), cx - S(6), cy + S(26), cx + S(2), cy + S(36), 0.8)]))
    layers.append((accent, [poly(cx - S(3), cy + S(22), cx + S(3), cy + S(20), cx + S(1), cy + S(25)), poly(cx - S(2), cy + S(30), cx + S(4), cy + S(29), cx + S(1), cy + S(33))]))
    return layers


def cometas():
    """Las cometas de Villa de Leyva: en agosto el cielo se llena de cometas de colores sobre las lomas."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#b3e5fc', [rect(3.6, 3.6, 92.8, 92.8)]), ('#c9a86a', [poly(3.6, 80, 30, 66, 60, 76, 96.4, 64, 96.4, 96.4, 3.6, 96.4)])]
    layers += oval(16, 18, 7, 4, '#ffffff', d=0) + oval(80, 76, 4, 4, '#fafafa', d=0)
    layers += cometa(30, 30, 1.2, '#e53935', '#fdd835', 0) + cometa(70, 24, 1.0, '#1e88e5', '#ffffff') + cometa(56, 54, 0.8, '#43a047', '#fdd835')
    layers.append((OUTLINE, [rib(30, 49, 40, 94, 0.6), rib(70, 40, 60, 94, 0.6)]))
    return layers


def pozos_azules():
    """Los Pozos Azules: las lagunitas de agua azul turquesa en medio del desierto ocre, cerca de Villa de Leyva."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#ffe0b2', [rect(3.6, 3.6, 92.8, 30)]), ('#d9a86c', [rect(3.6, 30, 92.8, 66.4)]), ('#c08d50', [poly(3.6, 36, 30, 26, 56, 32, 80, 24, 96.4, 30, 96.4, 40, 3.6, 40)])]
    for x, y, rx, ry in [(30, 56, 20, 9), (68, 72, 22, 10), (34, 84, 12, 5)]:
        layers += [(OUTLINE, [ellipse(x, y, rx + 2, ry + 2)]), ('#26c6da', [ellipse(x, y, rx, ry)]), ('#80deea', [ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.4, ry * 0.25)])]
    layers.append(('#7cb342', [ellipse(14, 66, 4, 2), ellipse(88, 54, 5, 2)]))
    return layers


def casa_terracota():
    """La Casa Terracota: la casa entera hecha de barro cocido, de formas redondas como una gran vasija."""
    layers = oval(50, 92, 46, 4, '#d9a86c', d=1.2)
    layers += [(OUTLINE, ['M 8 90 Q 4 56 22 46 Q 30 22 52 24 Q 66 10 80 26 Q 98 38 92 90 Z']), ('#c8693a', ['M 10.6 88 Q 7 57 24 48 Q 32 25 52 26.6 Q 66 13.4 79 28 Q 95 40 89.6 88 Z'])]
    layers.append(('#e08a52', [ellipse(36, 40, 10, 4, -20), ellipse(70, 34, 6, 3)]))
    layers += [(OUTLINE, [circle(32, 60, 7), circle(64, 52, 6), circle(78, 68, 5)]), ('#ffe082', [circle(32, 60, 5.4), circle(64, 52, 4.4), circle(78, 68, 3.6)])]
    layers += [(OUTLINE, ['M 44 90 L 44 72 Q 52 62 60 72 L 60 90 Z']), ('#7a3e1e', ['M 45.6 90 L 45.6 72.6 Q 52 64.6 58.4 72.6 L 58.4 90 Z'])]
    layers.append(('#a0522d', [curve(14, 76, 30, 80, 42, 78, 1.4), curve(62, 80, 76, 84, 88, 78, 1.4)]))
    return layers



# ---------- Láminas de los Llanos (v4.3) ----------

def moriche_palm(cx, base, h, s=1.0):
    """La palma de moriche: tronco alto y recto y la copa de hojas en abanico."""
    def S(v):
        return v * s
    top = base - h
    layers = bar(cx, base, cx, top, S(3.4), '#8d6e63')
    for a in [-150, -120, -90, -60, -30, -170, -10]:
        r = math.radians(a)
        x1, y1 = cx + S(18) * math.cos(r), top + S(14) * math.sin(r)
        layers += [(OUTLINE, [leaf(cx, top, x1, y1, S(6))]), ('#388e3c', [leaf(cx, top, x1, y1, S(4.6))]), ('#66bb6a', [rib(cx, top, x1, y1, S(0.8))])]
    layers.append(('#a1693f', [circle(cx - S(2), top + S(3), S(2)), circle(cx + S(2), top + S(4), S(2))]))
    return layers


def moriche():
    """La palma de moriche: crece en los morichales, en el agua donde nace el agua del Llano."""
    layers = [(OUTLINE, [ellipse(50, 86, 46, 10)]), ('#5fa8a0', [ellipse(50, 86, 44, 8.4)]), ('#b2dfdb', [rib(20, 86, 40, 86, 1.2), rib(60, 88, 78, 88, 1.2)])]
    layers += moriche_palm(34, 86, 62, 1.0) + moriche_palm(70, 86, 46, 0.8)
    return layers


def comejenera():
    """La comejenera: el montículo de tierra roja que levantan los comejenes en la sabana."""
    layers = oval(50, 90, 44, 5, '#c5d58a', d=1.2)
    layers += [(OUTLINE, ['M 22 90 Q 24 50 34 40 Q 38 20 50 18 Q 62 20 64 40 Q 76 52 78 90 Z']), ('#c0582e', ['M 24.6 88.6 Q 26.6 51 36 42 Q 40 22.6 50 20.6 Q 60 22.6 62 42 Q 74 53 75.4 88.6 Z'])]
    layers.append(('#a2471f', [curve(36, 46, 42, 60, 38, 84, 1.6), curve(56, 30, 60, 50, 58, 84, 1.6), curve(48, 24, 46, 40, 50, 56, 1.2)]))
    layers.append(('#d9784a', [ellipse(44, 36, 3, 6), ellipse(66, 64, 3, 8)]))
    layers.append(('#3e2723', [circle(x, y, 1) for x, y in [(30, 80), (70, 78), (60, 70), (40, 70)]]))
    layers += [('#c5d58a', [leaf(14, 90, 10, 78, 2.4), leaf(86, 90, 90, 76, 2.4)])]
    return layers


def corocora():
    """La corocora: el ave roja de los esteros, de pico largo y curvo, volando sobre el agua al atardecer."""
    layers = oval(76, 22, 10, 10, '#ffb74d', d=0)
    layers += [(OUTLINE, [ellipse(50, 84, 46, 10)]), ('#5fa8a0', [ellipse(50, 84, 44, 8.4)])]
    layers += [(OUTLINE, ['M 20 30 Q 40 46 52 50 Q 40 56 28 62 Q 44 62 56 56 Q 70 62 86 56 Q 74 50 62 48 Q 56 40 40 20 Z']), ('#e53935', ['M 22.6 31.4 Q 40.6 45.6 51.6 48.6 Q 41 54 31.6 60 Q 44 60 55.4 54.4 Q 69 60 82 56 Q 72 50 61 47 Q 55 39.6 39.6 22.4 Z'])]
    layers += oval(56, 50, 12, 6, '#e53935', -10, 1.6)
    layers += [(OUTLINE, [circle(70, 46, 5)]), ('#e53935', [circle(70, 46, 3.6)]), ('#1b1b1b', [circle(71, 45, 0.9)])]
    layers += [(OUTLINE, [curve(74, 47, 84, 50, 92, 58, 2.6)]), ('#3e2723', [curve(74, 47, 84, 50.4, 91.4, 57.4, 1)])]
    layers.append(('#b71c1c', [leaf(22, 32, 34, 40, 2), leaf(32, 58, 44, 54, 2)]))
    return layers


def atardecer_llanero():
    """El atardecer llanero: el sol rojo que se pone sobre la sabana sin fin, con las palmas y el ganado."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#ff8a65', [rect(3.6, 3.6, 92.8, 92.8)]), ('#ffb74d', [rect(3.6, 30, 92.8, 40)]), ('#ffcc80', [rect(3.6, 52, 92.8, 18)])]
    layers += [('#e53935', [circle(50, 64, 18)]), ('#ff7043', [circle(50, 64, 14)])]
    layers += [('#5d3a24', [rect(3.6, 66, 92.8, 30.4)]), ('#6d4a2a', [rect(3.6, 66, 92.8, 4)])]
    for x, h in [(16, 40), (24, 30), (84, 36)]:
        layers += [('#3e2723', [rect(x - 0.8, 66 - h, 1.6, h)] + [leaf(x, 66 - h, x + 10 * math.cos(a), 66 - h + 6 * math.sin(a), 2.4) for a in [math.pi + i * math.pi / 5 for i in range(6)]])]
    for x in (44, 60):
        layers += [('#3e2723', [ellipse(x, 62, 6, 3), rect(x - 5, 62, 1.4, 5), rect(x + 3.6, 62, 1.4, 5), ellipse(x - 7, 60, 2.4, 2)])]
    return layers


def mango_fruit(cx, cy, s=1.0, rot=0):
    """Un mango maduro, rojo y amarillo, con su hoja."""
    def S(v):
        return v * s
    return oval(cx, cy, S(14), S(11), '#ffb300', rot, 1.8) + [('#e53935', [ellipse(cx + S(4), cy - S(3), S(8), S(6), rot)]), ('#ffe082', [ellipse(cx - S(5), cy - S(3), S(3), S(2), rot)]), ('#2e7d32', [leaf(cx + S(8), cy - S(10), cx + S(22), cy - S(18), S(4))])]


def mango_llanero():
    """El mango: el palo de mango que da sombra y fruta en la finca, y los mangos maduros."""
    layers = oval(50, 92, 40, 4, '#9ccc65', d=1.2)
    layers += bar(40, 90, 40, 56, 5, '#6d4c41') + bar(40, 64, 26, 52, 3, '#6d4c41')
    blobs = [(40, 36, 24), (20, 44, 14), (58, 44, 14), (30, 24, 14), (50, 22, 14)]
    layers += [(OUTLINE, [circle(x, y, r + 2) for x, y, r in blobs]), ('#2e7d32', [circle(x, y, r) for x, y, r in blobs]), ('#43a047', [circle(34, 30, 6), circle(48, 40, 5)])]
    layers.append(('#ffb300', [ellipse(x, y, 2.6, 3.2) for x, y in [(26, 46), (46, 30), (54, 48), (34, 40)]]))
    layers += mango_fruit(78, 78, 1.0, -20)
    return layers


def pina():
    """La piña del Meta: dulce, con su cáscara de escamas y su corona de hojas."""
    layers = [(OUTLINE, [leaf(50, 40, 50, 4, 7), leaf(50, 40, 34, 10, 6), leaf(50, 40, 66, 10, 6), leaf(50, 40, 40, 18, 5), leaf(50, 40, 62, 18, 5)]), ('#43a047', [leaf(50, 39, 50, 6, 5.4), leaf(50, 39, 35.4, 11.6, 4.4), leaf(50, 39, 64.6, 11.6, 4.4)]), ('#66bb6a', [leaf(50, 39, 41, 19, 3.6), leaf(50, 39, 61, 19, 3.6)])]
    layers += oval(50, 66, 22, 28, '#f9a825')
    cells = [(x, y) for y in range(46, 90, 8) for x in range(32 + (4 if (y // 8) % 2 else 0), 70, 8) if ((x - 50) / 20) ** 2 + ((y - 66) / 25) ** 2 < 0.8]
    layers.append(('#e08a00', [poly(x - 3.6, y, x, y - 3.6, x + 3.6, y, x, y + 3.6) for x, y in cells]))
    layers.append(('#fff59d', [circle(x, y, 0.9) for x, y in cells]))
    return layers


def araza():
    """El arazá: la fruta amarilla y ácida de la Orinoquía, entera y partida, para jugos y helados."""
    layers = oval(38, 52, 26, 22, '#fdd835') + [('#fbc02d', [curve(30, 32, 26, 52, 32, 72, 1.4), curve(48, 32, 52, 52, 46, 72, 1.4)]), ('#fff59d', [ellipse(28, 44, 6, 3, -30)])]
    layers += bar(38, 30, 40, 22, 2, '#6d4c41') + [('#558b2f', [leaf(40, 24, 56, 18, 5)])]
    layers += oval(72, 74, 20, 15, '#fdd835') + [('#fff8c4', [ellipse(72, 74, 16, 11)]), ('#e8d26a', [ellipse(72, 74, 8, 5)]), ('#8d6e63', [ellipse(68, 72, 2, 3), ellipse(76, 76, 2, 3)])]
    return layers


def pan_arroz():
    """El pan de arroz: el pan redondo de harina de arroz y queso, dorado, el del desayuno llanero."""
    layers = plato(50, 76, 44, 12)
    layers += oval(50, 58, 34, 18, '#e8b25a') + [('#f5d08f', [ellipse(44, 52, 18, 7)]), ('#c98a2a', [curve(26, 60, 50, 66, 74, 60, 1.6)])]
    layers.append(('#fffde7', [ellipse(x, y, 3, 1.8) for x, y in [(36, 50), (52, 48), (62, 54), (44, 58)]]))
    return layers


def masato():
    """El masato: la bebida espesa de arroz fermentado, servida fría en el vaso, con canela y el arroz."""
    layers = [(OUTLINE, [poly(24, 20, 66, 20, 62, 92, 28, 92)]), ('#e3f2f8', [poly(26.6, 22.4, 63.4, 22.4, 59.6, 89.6, 30.4, 89.6)]), ('#f3e3c0', [poly(27.2, 30, 62.8, 30, 59.6, 89.6, 30.4, 89.6)])]
    layers += [('#c8945a', [ellipse(45, 30, 17.6, 2.6)]), ('#ffffff', [rect(30, 34, 3, 50)]), ('#a1693f', [rect(48, 10, 3, 26, 10), rect(54, 12, 3, 22, 20)])]
    layers += [(OUTLINE, [ellipse(82, 82, 14, 8)]), ('#8d5a32', [ellipse(82, 82, 12.4, 6.4)]), ('#fafafa', [ellipse(82, 80, 10, 3.6)])]
    return layers


def rio_meta():
    """El río Meta: el río ancho de los Llanos con el planchón que pasa el camión de una orilla a la otra."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#b3e5fc', [rect(3.6, 3.6, 92.8, 30)]), ('#9ccc65', [rect(3.6, 32, 92.8, 10)]), ('#a1887f', [rect(3.6, 40, 92.8, 56.4)]), ('#8d9a5a', [rect(3.6, 84, 92.8, 12.4)])]
    layers += [(OUTLINE, [rect(14, 60, 72, 10)]), ('#78909c', [rect(15.6, 61.6, 68.8, 6.8)]), ('#546e7a', [rect(15.6, 66, 68.8, 2.4)])]
    layers += [(OUTLINE, [rect(26, 44, 30, 16), rect(56, 48, 14, 12)]), ('#fdd835', [rect(27.4, 45.4, 27.2, 13.2)]), ('#e53935', [rect(57.4, 49.4, 11.2, 9.2)]), ('#b3e5fc', [rect(60, 51, 6, 4)])]
    layers += oval(34, 60, 4, 4, '#263238', d=1.2) + oval(62, 60, 4, 4, '#263238', d=1.2)
    layers.append(('#d7ccc8', [rib(8, 76, 24, 76, 1.2), rib(70, 80, 90, 80, 1.2)]))
    layers += moriche_palm(84, 42, 22, 0.5)
    return layers


def chiguiro():
    """El chigüiro: el roedor más grande del mundo, de cuerpo redondo y hocico chato, a la orilla del agua."""
    body = '#8d6e63'
    layers = [(OUTLINE, [ellipse(50, 90, 46, 6)]), ('#5fa8a0', [ellipse(50, 90, 44, 4.6)])]
    for lx in (30, 40, 62, 70):
        layers += [(OUTLINE, [rect(lx - 3.4, 64, 6.8, 22)]), (body, [rect(lx - 2, 64, 4, 20.6)])]
    layers += oval(52, 58, 30, 18, body) + [('#a1887f', [ellipse(50, 50, 18, 5)])]
    layers += oval(20, 52, 14, 12, body, -10) + [('#6d4c41', [ellipse(10, 56, 5, 6)]), ('#1b1b1b', [circle(18, 46, 1.6), ellipse(8, 54, 1, 1.4)])]
    layers += [(OUTLINE, [circle(26, 40, 4)]), ('#6d4c41', [circle(26, 40, 2.6)])]
    return layers


def babilla():
    """La babilla: el caimán pequeño de los esteros, asoleándose en la orilla con la boca entreabierta."""
    body = '#6b8e4e'
    layers = [(OUTLINE, [ellipse(50, 84, 46, 10)]), ('#5fa8a0', [ellipse(50, 84, 44, 8.4)])]
    layers += [(OUTLINE, ['M 6 66 Q 20 56 40 56 L 80 58 Q 96 62 98 70 Q 80 66 70 70 L 40 72 Q 20 72 6 66 Z']), (body, ['M 9 65.6 Q 21 58 40 58 L 79.6 60 Q 93 63 95 67.6 Q 80 64 69.6 68 L 40 70 Q 21 70 9 65.6 Z'])]
    layers += [(OUTLINE, ['M 6 66 Q 4 60 14 58 L 30 58 L 30 64 Z']), ('#5a7a40', ['M 8.6 64 Q 7 61 14 60 L 28.4 60 L 28.4 63 Z'])]
    layers.append(('#4a6634', [poly(42 + 7 * i, 56.6, 45 + 7 * i, 52, 48 + 7 * i, 56.6) for i in range(6)]))
    layers += [(OUTLINE, [circle(30, 54, 3.4)]), ('#fdd835', [circle(30, 54, 2.2)]), ('#1b1b1b', [rect(29.6, 52.4, 0.8, 3.2)])]
    layers += [(OUTLINE, [rect(40, 70, 6, 8), rect(66, 70, 6, 8)]), (body, [rect(41.4, 70, 3.2, 6.6), rect(67.4, 70, 3.2, 6.6)])]
    layers.append(('#fafafa', [poly(12, 63.6, 14, 61, 16, 63.6), poly(18, 63.6, 20, 61, 22, 63.6)]))
    return layers


def tonina():
    """La tonina: el delfín rosado de los ríos de la Orinoquía, de pico largo, saltando del agua."""
    layers = [(OUTLINE, [rect(2, 70, 96, 26)]), ('#8d6e4a', [rect(3.4, 71.4, 93.2, 23.2)]), ('#a1887f', [rib(10, 80, 30, 80, 1.4), rib(64, 86, 88, 86, 1.4)])]
    layers += [(OUTLINE, ['M 14 74 Q 26 36 62 32 Q 82 32 86 40 Q 90 46 96 46 Q 88 52 80 48 Q 70 70 30 80 Z']), ('#f48fb1', ['M 17.6 72.6 Q 28.4 38.6 62 34.6 Q 80 34.6 83.6 41.4 Q 87 46.6 91.4 47.4 Q 86 50 79 46 Q 68.6 68 30 77.6 Z'])]
    layers += [(OUTLINE, [poly(44, 36, 52, 22, 58, 34)]), ('#f48fb1', [poly(46, 35.6, 51.6, 25.6, 56, 34)])]
    layers += [(OUTLINE, [poly(14, 74, 2, 66, 6, 82)]), ('#f48fb1', [poly(12.4, 74, 4.6, 68.6, 7.4, 79.4)])]
    layers.append(('#f8bbd0', [ellipse(50, 50, 18, 5, -20)]))
    layers.append(('#1b1b1b', [circle(78, 40, 1.4)]))
    layers.append(('#e3f2fd', [circle(10, 66, 2), circle(20, 60, 1.6), circle(94, 60, 1.6)]))
    return layers


def anaconda():
    """La anaconda: la gran serpiente verde de manchas negras, enrollada y asomando del agua del estero."""
    layers = [(OUTLINE, [ellipse(50, 84, 46, 10)]), ('#5fa8a0', [ellipse(50, 84, 44, 8.4)])]
    for rx, ry, y in [(38, 12, 72), (30, 10, 60), (22, 8, 49)]:
        layers += [(OUTLINE, [ellipse(50, y, rx + 4, ry + 4)]), ('#6b8e23', [ellipse(50, y, rx, ry)]), ('#fff8ec', [ellipse(50, y - 1, rx - 8, ry - 6)])]
        layers.append(('#2e3b16', [ellipse(50 + rx * 0.9 * math.cos(a), y + ry * 0.9 * math.sin(a), 2.4, 1.6) for a in [i * math.pi / 5 for i in range(10)]]))
    layers += bar(52, 44, 60, 22, 7, '#6b8e23')
    layers += oval(64, 18, 9, 6, '#6b8e23', 20) + [('#1b1b1b', [circle(66, 15, 1.2)]), ('#e53935', [rib(72, 21, 80, 24, 0.8)])]
    return layers


def llanero_rider(hat='#f5e6c4', shirt='#fafafa', singing=False):
    """El llanero a caballo, con sombrero de ala ancha, camisa y cotizas."""
    layers = mule(54, 60, 0.85, body='#a1693f', load=False, horse=True)
    layers += [(OUTLINE, [rect(46, 46, 16, 6)]), ('#5d3a1e', [rect(47.4, 47.4, 13.2, 3.2)])]
    layers += shape([(46, 50), (48, 30), (60, 30), (62, 50)], shirt, 1.8)
    layers += bar(50, 52, 44, 68, 3.4, '#3e2723') + oval(44, 70, 3, 1.8, '#c8a165', d=1)
    layers += oval(54, 22, 6, 7, '#c68642', d=1.6)
    if singing:
        layers.append(('#3e2723', [ellipse(51, 25, 1.6, 2)]))
    layers += oval(54, 16, 15, 2.6, hat, d=1.6) + [(OUTLINE, ['M 47 16 Q 47 8 54 8 Q 61 8 61 16 Z']), (hat, ['M 48.4 15.6 Q 48.4 9.4 54 9.4 Q 59.6 9.4 59.6 15.6 Z']), ('#3e2723', [rect(48.4, 13.2, 11.2, 1.6)])]
    return layers


def vaquero_llanero():
    """El vaquero llanero: a caballo por la sabana, con sombrero de ala ancha, arreando el ganado y cantando."""
    layers = oval(50, 95, 40, 3, '#c5d58a', d=1.2) + llanero_rider()
    layers += bar(58, 34, 74, 28, 3, '#fafafa') + oval(76, 26, 3, 3, '#c68642', d=1.2)
    layers.append(('#a1693f', [curve(76, 24, 88, 10, 96, 22, 1.4), ellipse(92, 18, 6, 4)]))
    return layers


def res(cx, cy, s, body, horns='#efe6d2', spots=None):
    """Una res de perfil, mirando a la izquierda, con sus cachos."""
    def P(*xy):
        return pts([(cx + x * s, cy + y * s) for x, y in zip(xy[0::2], xy[1::2])])
    def E(x, y, rx, ry, rot=0):
        return ellipse(cx + x * s, cy + y * s, rx * s, ry * s, rot)
    layers = []
    for lx in (-18, -10, 14, 22):
        layers += [(OUTLINE, [P(lx - 3.4, 0, lx + 3.4, 0, lx + 3.4, 30, lx - 3.4, 30)]), (body, [P(lx - 2, 0, lx + 2, 0, lx + 2, 28.6, lx - 2, 28.6)]), ('#3e2723', [P(lx - 2.6, 26, lx + 2.6, 26, lx + 2.6, 30, lx - 2.6, 30)])]
    layers += [(OUTLINE, [E(2, -2, 30, 15)]), (body, [E(2, -2, 28, 13)])]
    if spots:
        layers.append((spots, [E(-4, -6, 10, 6), E(16, 2, 7, 5)]))
    layers += [(OUTLINE, [E(-32, -10, 11, 12, -15)]), (body, [E(-32, -10, 9.4, 10.4, -15)])]
    layers += [(OUTLINE, [E(-38, -2, 6, 5, -15)]), ('#d7a68a', [E(-38, -2, 4.6, 3.6, -15)])]
    layers += [('#1b1b1b', [E(-34, -14, 1.4, 1.4)]), (OUTLINE, [P(-24, -18, -14, -26, -10, -24, -20, -14), P(-40, -18, -46, -30, -42, -30, -36, -18)]), (horns, [P(-23, -18.6, -14.4, -24.4, -12.4, -23.4, -20.6, -15.4), P(-39, -18.6, -44.4, -28.4, -42.6, -28.6, -37.4, -18.6)])]
    layers += [(OUTLINE, [P(30, -6, 40, 10, 38, 22, 34, 8)]), (body, [P(31, -4, 38.4, 10, 36.6, 19, 33.6, 8)])]
    return layers


def sanmartinero():
    """El sanmartinero: el ganado criollo rojizo de San Martín, criado en el Llano desde hace siglos."""
    return oval(50, 92, 40, 3, '#c5d58a', d=1.2) + res(56, 58, 0.95, '#a0522d')


def cabrestero():
    """El cabrestero: el llanero que va adelante del ganado, cantando para guiarlo por la sabana."""
    layers = oval(50, 95, 46, 3, '#c5d58a', d=1.2)
    layers += res(86, 66, 0.5, '#5d4037') + res(76, 74, 0.55, '#a0522d')
    layers += llanero_rider('#d7ccc8', '#fafafa', True)
    layers += note(22, 22, 0.8) + note(12, 38, 0.7)
    return layers


def hallaca():
    """La hallaca: la masa de maíz rellena de carne, envuelta en hoja de plátano y amarrada en cruz."""
    layers = [(OUTLINE, [rect(10, 30, 50, 34, -10)]), ('#4e8a34', [rect(11.6, 31.6, 46.8, 30.8, -10)]), ('#6aa84f', [rect(14, 34, 42, 4, -10)])]
    layers += [(OUTLINE, [rect(32, 26, 3.6, 42, -10), rect(10, 44, 50, 3.6, -10)]), ('#f5e6c4', [rect(33, 27, 1.6, 40, -10), rect(11, 45, 48, 1.6, -10)])]
    layers += [(OUTLINE, [leaf(44, 86, 98, 62, 18)]), ('#4e8a34', [leaf(46, 85, 96, 63, 15.6)])]
    layers += oval(70, 74, 18, 9, '#f4c430', -20, 1.8) + [('#a1452a', [ellipse(70, 74, 9, 4, -20)]), ('#7cb342', [circle(64, 74, 1.6), circle(76, 72, 1.6)]), ('#fafafa', [ellipse(72, 70, 3, 1.6, -20)])]
    return layers


def caballo_criollo():
    """El caballo criollo: pequeño y fuerte, con su crin, el compañero del llanero en la sabana."""
    layers = oval(50, 93, 40, 3, '#c5d58a', d=1.2) + mule(56, 56, 0.95, body='#a1693f', load=False, horse=True)
    layers += [(OUTLINE, [rect(42, 40, 26, 8)]), ('#5d3a1e', [rect(43.4, 41.4, 23.2, 5.2)])]
    return layers


def cotiza(cx, cy, s=1.0, rot=0):
    """Una cotiza: la suela de cuero con las tiras."""
    def S(v):
        return v * s
    return oval(cx, cy, S(12), S(26), '#8d5a32', rot, 2) + [('#a1693f', [ellipse(cx, cy, S(9), S(22), rot)]), (OUTLINE, [rect(cx - S(12), cy - S(12), S(24), S(5), rot), rect(cx - S(11), cy + S(2), S(22), S(5), rot)]), ('#5d3a1e', [rect(cx - S(10.6), cy - S(11), S(21.2), S(3), rot), rect(cx - S(9.6), cy + S(3), S(19.2), S(3), rot)])]


def cotizas():
    """Las cotizas: las alpargatas del llanero, de suela y tiras de cuero."""
    return cotiza(34, 52, 1.2, -12) + cotiza(68, 50, 1.2, 12)


def sombrero_llanero():
    """El sombrero llanero: de ala ancha y copa baja, el de pelo de guama, para el sol de la sabana."""
    layers = oval(50, 64, 46, 13, '#5d5348')
    layers.append(('#4a4238', [ellipse(50, 64, 34, 8)]))
    layers += [(OUTLINE, ['M 28 64 Q 26 36 50 34 Q 74 36 72 64 Z']), ('#6b6055', ['M 29.6 63 Q 28 38 50 36.4 Q 72 38 70.4 63 Z'])]
    layers.append(('#3e2723', ['M 29 54 Q 50 58 71 54 L 71.4 60 Q 50 64 28.6 60 Z']))
    layers.append(('#867b6e', [ellipse(42, 44, 4, 6, 15)]))
    return layers


def coleo():
    """El coleo: el toro que corre en la manga y el jinete que lo tumba halándolo por la cola, a todo galope."""
    layers = oval(50, 94, 46, 3, '#c9a86a', d=1.2)
    layers += res(34, 62, 0.8, '#3e2723', '#efe6d2')
    layers += [(OUTLINE, [curve(60, 56, 70, 50, 76, 58, 3)]), ('#3e2723', [curve(60, 56, 70, 51, 76, 57.4, 1.4)])]
    layers += [(OUTLINE, [ellipse(86, 46, 10, 12, 20)]), ('#a1693f', [ellipse(86, 46, 8.6, 10.6, 20)]), ('#1b1b1b', [circle(84, 40, 1.2)])]
    layers += bar(80, 30, 76, 58, 3.4, '#fafafa') + oval(76, 60, 3.4, 3.4, '#c68642', d=1.2)
    layers += oval(84, 20, 10, 2.4, '#f5e6c4', d=1.4) + oval(84, 26, 5, 5.4, '#c68642', d=1.4)
    layers.append(('#d7ccc8', [ellipse(14, 88, 8, 3), ellipse(24, 92, 6, 2)]))
    return layers


def puerta_llano():
    """La Puerta del Llano: el arco a la entrada de Villavicencio y, al otro lado, la sabana que empieza."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#b3e5fc', [rect(3.6, 3.6, 92.8, 50)]), ('#c5d58a', [rect(3.6, 52, 92.8, 44.4)]), ('#a1887f', [poly(40, 96.4, 48, 52, 52, 52, 60, 96.4)])]
    layers += moriche_palm(80, 56, 16, 0.4) + moriche_palm(20, 58, 12, 0.35)
    layers += [(OUTLINE, ['M 14 96 L 14 34 Q 50 4 86 34 L 86 96 L 70 96 L 70 40 Q 50 22 30 40 L 30 96 Z']), ('#f5e6c4', ['M 15.6 96 L 15.6 34.8 Q 50 6.4 84.4 34.8 L 84.4 96 L 71.6 96 L 71.6 39.4 Q 50 20 28.4 39.4 L 28.4 96 Z'])]
    layers.append(('#e8d3a0', [rect(15.6, 60, 12.8, 2), rect(71.6, 60, 12.8, 2)]))
    return layers


def joropo():
    """El joropo: la pareja zapateando, ella con la falda blanca de flores y él con liquiliqui y sombrero."""
    layers = oval(50, 94, 44, 4, '#d7ccc8', d=1.2)
    layers += shape([(4, 92), (16, 58), (36, 58), (46, 92)], '#fafafa')
    layers.append(('#e53935', [circle(x, y, 2.2) for x, y in [(16, 72), (28, 80), (38, 70), (12, 86), (34, 88), (24, 66)]]))
    layers.append(('#43a047', [leaf(x, y, x + 4, y - 3, 1.4) for x, y in [(18, 72), (30, 80), (40, 70)]]))
    layers += shape([(18, 60), (20, 42), (32, 42), (34, 60)], '#e53935', 1.8)
    layers += bar(20, 46, 8, 32, 3, '#a1693f') + bar(32, 46, 42, 40, 3, '#a1693f')
    layers += oval(26, 34, 7, 7.6, '#a1693f', d=1.8) + [('#2b1d14', ['M 18 32 Q 26 20 34 32 Q 30 27 26 27 Q 22 27 18 32 Z', circle(32, 28, 3.4)]), ('#fdd835', [circle(19, 28, 2.4)])]
    layers += shape([(60, 92), (61, 66), (69, 66), (68, 90)], '#fafafa', 1.6) + shape([(71, 90), (70, 66), (78, 66), (82, 86)], '#fafafa', 1.6)
    layers += shape([(58, 68), (60, 42), (80, 42), (82, 68)], '#fafafa', 1.8) + [('#d7ccc8', [rect(69.4, 44, 1.4, 22)])]
    layers += bar(60, 46, 48, 40, 3, '#a1693f') + bar(80, 46, 90, 32, 3, '#a1693f')
    layers += oval(70, 34, 7, 7.6, '#a1693f', d=1.8)
    layers += oval(70, 26, 15, 3, '#5d5348', d=1.6) + [(OUTLINE, ['M 62 26 Q 62 16 70 16 Q 78 16 78 26 Z']), ('#5d5348', ['M 63.4 25.4 Q 63.4 17.4 70 17.4 Q 76.6 17.4 76.6 25.4 Z'])]
    layers.append(('#5d3a24', [ellipse(64, 92, 5, 2), ellipse(76, 90, 5, 2)]))
    return layers


def arpa():
    """El arpa llanera: el marco de madera con sus muchas cuerdas, que lleva la melodía del joropo."""
    layers = [(OUTLINE, ['M 20 92 L 30 10 L 38 12 L 30 92 Z', 'M 30 12 Q 60 12 86 50 L 82 54 Q 60 22 34 20 Z', 'M 26 88 L 82 52 L 86 56 L 30 94 Z'])]
    layers += [('#a1693f', ['M 22 90 L 31.4 12.4 L 35.6 13.4 L 28.4 90 Z', 'M 32 13.6 Q 59.6 14 84 50 L 82.4 51.6 Q 59.6 20.4 34 18.4 Z', 'M 28 89 L 82 54 L 83.6 55.6 L 30 92 Z'])]
    layers.append(('#fafafa', [rib(30 + 6 * i, 88 - 3.8 * i, 34 + 6 * i, 18 + 2.4 * i + (i * i) * 0.35, 0.8) for i in range(9)]))
    layers += [(OUTLINE, [ellipse(24, 92, 8, 3)]), ('#8d5a32', [ellipse(24, 92, 6.6, 1.8)])]
    layers += note(80, 22, 0.7)
    return layers


def cuatro():
    """El cuatro: la guitarrita de cuatro cuerdas que rasguea el ritmo del joropo, con las maracas."""
    layers = tiple_shape(42, 58, 0.95, -15)
    for x, y in [(80, 60), (88, 76)]:
        layers += bar(x - 10, y + 18, x, y, 2.4, '#8d6e63') + oval(x, y - 4, 8, 9, '#ef6c00', 20, 1.8) + [('#fdd835', [rect(x - 6, y - 6, 12, 2, 20)])]
    return layers


def macarena():
    """La Macarena: la sierra antigua de mesetas entre los Andes, el Llano y la selva, con el caño de colores."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#b3e5fc', [rect(3.6, 3.6, 92.8, 40)])]
    layers += [('#6d8f4e', [poly(3.6, 50, 14, 30, 40, 28, 48, 42, 60, 24, 86, 22, 96.4, 36, 96.4, 70, 3.6, 70)]), ('#55783c', [poly(3.6, 50, 14, 30, 20, 30, 16, 52, 3.6, 60), poly(60, 24, 66, 24, 62, 46, 54, 40)])]
    layers += [('#2e7d32', [rect(3.6, 62, 92.8, 34.4)]), ('#388e3c', [circle(10 + 12 * i, 64, 7) for i in range(8)])]
    layers += [(OUTLINE, ['M 40 96 Q 46 80 60 74 Q 72 70 76 62 L 80 64 Q 76 74 62 78 Q 50 84 46 96 Z']), ('#e53935', ['M 42 96 Q 47.6 81 60.6 75.6 Q 73 71.6 77 64 L 78.6 64.8 Q 75 72.6 61.6 76.4 Q 49 82.6 44.4 96 Z'])]
    layers.append(('#fdd835', [circle(52, 84, 1.4), circle(66, 74, 1.4)]))
    return layers



# ---------- Láminas del Pacífico (v4.3) ----------

def chontaduro():
    """El chontaduro: el racimo de frutos rojos y anaranjados de la palma espinosa, y uno cocido partido con sal y miel."""
    layers = bar(30, 10, 34, 40, 2.4, '#6d4c41')
    for x, y, c in [(22, 46, '#e64a19'), (36, 44, '#ff7043'), (28, 58, '#f4511e'), (42, 58, '#ff8a65'), (16, 60, '#ff7043'), (34, 72, '#e64a19'), (48, 72, '#ff7043')]:
        layers += oval(x, y, 8, 7, c, d=1.6) + [('#ffccbc', [ellipse(x - 3, y - 3, 2, 1.4)]), ('#3e2723', [circle(x, y - 7, 1.2)])]
    layers += plato(72, 80, 24, 9)
    layers += oval(72, 70, 12, 9, '#ff7043') + [('#ffd180', [ellipse(72, 68, 9, 5.4)]), ('#fafafa', [circle(70, 66, 1), circle(74, 68, 1)])]
    layers.append(('#d68a1a', [curve(64, 64, 70, 60, 80, 66, 1.6)]))
    return layers


def borojo():
    """El borojó: la fruta parda y redonda del Chocó, y el jugo espeso servido en el vaso."""
    layers = oval(34, 58, 26, 24, '#6d4c41') + [('#8d6e63', [ellipse(26, 48, 8, 5, -20)]), ('#4e342e', [curve(18, 66, 30, 74, 46, 70, 1.4)])]
    layers += bar(34, 34, 36, 24, 2.2, '#3e2723') + [('#558b2f', [leaf(36, 26, 52, 20, 5)])]
    layers += [(OUTLINE, [poly(66, 40, 92, 40, 88, 92, 70, 92)]), ('#e3f2f8', [poly(68.4, 42.4, 89.6, 42.4, 85.8, 89.6, 72.2, 89.6)]), ('#8d5a3a', [poly(68.8, 50, 89.2, 50, 85.8, 89.6, 72.2, 89.6)]), ('#a1754f', [ellipse(79, 50, 10, 1.8)])]
    return layers


def rana_dorada():
    """La rana dorada: pequeña, amarilla y venenosa, sobre una hoja de la selva del Pacífico."""
    layers = [(OUTLINE, [leaf(4, 86, 96, 64, 22)]), ('#2e7d32', [leaf(6, 85, 94, 65, 19.6)]), ('#66bb6a', [rib(8, 84, 92, 66, 1.4)])]
    layers += oval(50, 58, 24, 16, '#fdd835')
    layers += [(OUTLINE, [ellipse(26, 70, 10, 5, 20), ellipse(74, 70, 10, 5, -20), ellipse(34, 52, 6, 4, -40), ellipse(66, 52, 6, 4, 40)]), ('#fbc02d', [ellipse(26, 70, 8.6, 3.6, 20), ellipse(74, 70, 8.6, 3.6, -20), ellipse(34, 52, 4.6, 2.6, -40), ellipse(66, 52, 4.6, 2.6, 40)])]
    layers += oval(50, 44, 16, 11, '#fdd835')
    for x in (42, 58):
        layers += [(OUTLINE, [circle(x, 36, 5)]), ('#fdd835', [circle(x, 36, 3.8)]), ('#1b1b1b', [circle(x, 36, 2.4)]), ('#ffffff', [circle(x - 0.8, 35, 0.8)])]
    layers.append(('#f9a825', [ellipse(50, 60, 10, 5)]))
    layers.append(('#5d4037', [curve(44, 48, 50, 51, 56, 48, 1.1)]))
    return layers


def lluvia_choco():
    """La lluvia del Chocó: los nubarrones que descargan sobre la selva, una de las más lluviosas del mundo."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#90a4ae', [rect(3.6, 3.6, 92.8, 92.8)])]
    puffs = [(24, 22, 14), (44, 16, 16), (66, 20, 14), (84, 26, 10), (34, 30, 12), (58, 30, 12)]
    layers += [(OUTLINE, [circle(x, y, r + 2) for x, y, r in puffs]), ('#cfd8dc', [circle(x, y, r) for x, y, r in puffs]), ('#b0bec5', [ellipse(50, 36, 34, 5)])]
    layers.append(('#4fa3d9', [rib(14 + 7 * i + 3 * (j % 2), 44 + 12 * j, 10 + 7 * i + 3 * (j % 2), 52 + 12 * j, 1.4) for i in range(12) for j in range(3)]))
    layers += [('#2e7d32', [circle(10 + 12 * i, 92, 10) for i in range(8)]), ('#388e3c', [circle(16 + 12 * i, 86, 7) for i in range(7)])]
    return layers


def heliconia():
    """La heliconia: la flor roja y amarilla de brácteas en zigzag, con el colibrí que la visita."""
    layers = bar(40, 96, 40, 20, 2.4, '#558b2f')
    layers += [(OUTLINE, [leaf(40, 80, 6, 50, 10), leaf(40, 70, 70, 40, 9)]), ('#43a047', [leaf(40, 79, 8, 51, 8), leaf(40, 69, 68, 41, 7.4)])]
    for i, y in enumerate((26, 38, 50, 62)):
        side = -1 if i % 2 else 1
        tip = 40 + side * 20
        layers += [(OUTLINE, [poly(40, y - 6, tip, y + 4, 40, y + 6)]), ('#e53935', [poly(40.6, y - 4, tip - side * 2.6, y + 3.4, 40.6, y + 4.6)]), ('#fdd835', [poly(tip - side * 2.6, y + 3.4, tip - side * 8, y + 1.4, tip - side * 7, y + 3.8)])]
    layers += oval(76, 22, 8, 4, '#26a69a', -15, 1.6) + [('#00897b', [leaf(74, 20, 66, 6, 4), leaf(76, 20, 84, 8, 4)]), ('#1b1b1b', [circle(80, 20, 0.9), rib(83, 21, 94, 26, 0.9)])]
    return layers


def arroz_clavado():
    """El arroz clavado: el arroz con queso costeño derretido y rodajas de longaniza, como se hace en el Chocó."""
    layers = plato(50, 72, 44, 15)
    layers += [(OUTLINE, ['M 14 72 Q 16 46 50 42 Q 84 46 86 72 Q 50 82 14 72 Z']), ('#fbf3dc', ['M 16.6 71 Q 18.6 48.4 50 44.6 Q 81.4 48.4 83.4 71 Q 50 79.4 16.6 71 Z'])]
    layers.append(('#fff8e1', [rect(x, y, 6, 4, 15) for x, y in [(28, 56), (44, 50), (60, 58), (36, 66), (54, 66)]]))
    for x, y in [(32, 60), (50, 56), (66, 64), (42, 70), (60, 50)]:
        layers += oval(x, y, 4.4, 3.4, '#b23c22', d=1.2) + [('#e57373', [circle(x - 1, y - 1, 1)])]
    layers.append(('#7cb342', [circle(x, y, 1.2) for x, y in [(38, 54), (56, 60), (46, 62)]]))
    return layers


def viche():
    """El viche: el destilado tradicional de caña, en su botella con la tusa de corcho, junto a la caña y las hierbas."""
    layers = bar(78, 94, 84, 12, 4, '#9ccc65') + [('#558b2f', [rect(78 + 1.2 * k, 30 + 16 * k, 6, 1.4, 4) for k in range(4)])]
    layers += [(OUTLINE, ['M 30 92 L 30 46 Q 30 38 38 34 L 38 16 L 52 16 L 52 34 Q 60 38 60 46 L 60 92 Z']), ('#e8f5e9', ['M 32.4 89.6 L 32.4 46.6 Q 32.4 40 40.4 36.2 L 40.4 18.4 L 49.6 18.4 L 49.6 36.2 Q 57.6 40 57.6 46.6 L 57.6 89.6 Z'])]
    layers += [('#f5ecc8', [rect(32.4, 52, 25.2, 37.6)]), ('#43a047', [leaf(38, 86, 44, 60, 2.4), leaf(48, 86, 52, 62, 2.4)]), ('#ffffff', [rect(34, 46, 3, 40)])]
    layers += [(OUTLINE, [rect(36, 6, 18, 12)]), ('#c8a165', [rect(37.6, 7.6, 14.8, 8.8)])]
    layers += [(OUTLINE, [rect(30, 62, 30, 14)]), ('#fdd835', [rect(31.6, 63.6, 26.8, 10.8)]), ('#1e88e5', [rect(31.6, 69, 26.8, 2)])]
    return layers


def potrillo():
    """El potrillo: la canoa chica de un solo tronco, con su canalete, en el estero entre los mangles."""
    layers = water_rect(2, 56, 96, 40, '#5fa8a0')
    layers += mangle_raices(14, 62, 0.55) + mangle_raices(86, 60, 0.5)
    layers += [(OUTLINE, ['M 8 70 Q 50 92 92 70 Q 50 78 8 70 Z']), ('#8d5a32', ['M 11.6 71.4 Q 50 89 88.4 71.4 Q 50 78 11.6 71.4 Z']), ('#5d3a1e', [ellipse(50, 74, 34, 2.4)])]
    layers += bar(58, 40, 76, 86, 2, '#a1693f') + [(OUTLINE, [leaf(72, 76, 80, 96, 5)]), ('#a1693f', [leaf(72.6, 77, 79.4, 94.6, 3.6)])]
    return layers


def tortuga_marina():
    """La tortuga marina: llega de noche a la playa a poner sus huevos en la arena, bajo la luna."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#1a2350', [rect(3.6, 3.6, 92.8, 40)]), ('#1f5f8b', [rect(3.6, 40, 92.8, 18)]), ('#e8d3a0', [rect(3.6, 56, 92.8, 40.4)])]
    layers += [('#fff9c4', [circle(78, 18, 8)]), ('#1a2350', [circle(82, 16, 7)]), ('#ffffff', [circle(20, 14, 1), circle(40, 24, 1.2), circle(60, 10, 0.9)])]
    layers += [(OUTLINE, [ellipse(26, 58, 8, 3, -20), ellipse(74, 58, 8, 3, 20), ellipse(28, 82, 7, 3, 20), ellipse(72, 82, 7, 3, -20)]), ('#6b8e4e', [ellipse(26, 58, 6.6, 1.8, -20), ellipse(74, 58, 6.6, 1.8, 20), ellipse(28, 82, 5.6, 1.8, 20), ellipse(72, 82, 5.6, 1.8, -20)])]
    layers += oval(50, 70, 22, 16, '#5d7a3a')
    layers.append(('#7a9a4e', [pts([(50 + 7 * math.cos(a), 70 + 6 * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]])] + [pts([(x + 5 * math.cos(a), y + 4 * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]]) for x, y in [(38, 64), (62, 64), (38, 76), (62, 76)]]))
    layers += oval(50, 50, 7, 6, '#6b8e4e') + [('#1b1b1b', [circle(47, 49, 1), circle(53, 49, 1)])]
    layers.append(('#fafafa', [circle(x, y, 2) for x, y in [(44, 92), (50, 93), (56, 92)]]))
    return layers


def marimba():
    """La marimba de chonta: las tablas de palma sobre el marco, con los tubos de guadua debajo y los tacos."""
    layers = [(OUTLINE, [poly(6, 46, 94, 36, 94, 42, 6, 54)]), ('#8d5a32', [poly(7.6, 47.4, 92.4, 37.8, 92.4, 40.8, 7.6, 52.4)])]
    for i in range(9):
        x = 12 + 9.4 * i
        y = 50 - 1.1 * i
        layers += [(OUTLINE, [rect(x - 1.6, y + 4, 6.4, 34 - 2.6 * i)]), ('#d4b06a', [rect(x - 0.4, y + 4, 4, 32.6 - 2.6 * i)]), ('#b08c46', [rect(x - 0.4, y + 14, 4, 1.2)])]
        layers += [(OUTLINE, [rect(x - 3, y - 8, 8, 12)]), ('#5d3a1e', [rect(x - 1.6, y - 6.6, 5.2, 9.2)])]
    for x, a in [(30, -30), (66, 20)]:
        layers += bar(x, 22, x + 14 * math.cos(math.radians(a - 60)), 22 - 14 * math.sin(math.radians(a - 60)), 2, '#a1693f') + oval(x, 22, 4, 4, '#3e2723', d=1.2)
    return layers


def cununo():
    """El cununo: el tambor de un solo parche, de forma de cono, que se toca con las manos."""
    layers = [(OUTLINE, ['M 22 24 L 78 24 L 64 94 L 36 94 Z']), ('#8d5a32', ['M 24.6 26.4 L 75.4 26.4 L 62 91.6 L 38 91.6 Z'])]
    layers.append(('#f5e6c4', [rib(26 + 8 * i, 30, 38 + 4 * i, 88, 1.4) for i in range(7)] + [rib(74 - 8 * i, 30, 62 - 4 * i, 88, 1.4) for i in range(7)]))
    layers += [(OUTLINE, [rect(20, 26, 60, 6)]), ('#5d3a1e', [rect(21.4, 27.4, 57.2, 3.2)])]
    layers += oval(50, 24, 28, 7, '#f3e5c8')
    layers += [(OUTLINE, [ellipse(36, 14, 7, 5, -20), ellipse(64, 14, 7, 5, 20)]), ('#5d3a24', [ellipse(36, 14, 5.6, 3.6, -20), ellipse(64, 14, 5.6, 3.6, 20)])]
    return layers


def guasa():
    """El guasá: el tubo de guadua con semillas adentro, decorado, que sacuden las cantadoras."""
    layers = [(OUTLINE, [rect(16, 34, 68, 24, -18)]), ('#c9b26a', [rect(17.6, 35.6, 64.8, 20.8, -18)])]
    layers.append(('#a8914a', [rect(34, 32, 2, 26, -18), rect(56, 25, 2, 26, -18)]))
    layers.append(('#e53935', [rect(22, 42, 6, 12, -18), rect(66, 28, 6, 12, -18)]))
    layers.append(('#1b1b1b', [rect(40 + 4 * i, 42 - 1.3 * i, 2, 10, -18) for i in range(3)]))
    layers += oval(16, 54, 4, 12, '#a8914a', -18, 1.6) + oval(84, 32, 4, 12, '#a8914a', -18, 1.6)
    layers.append(('#5d4037', [circle(x, y, 1.6) for x, y in [(20, 72), (30, 78), (72, 18), (82, 12)]]))
    layers.append((OUTLINE, [curve(16, 66, 22, 70, 26, 76, 0.8), curve(84, 20, 80, 16, 76, 14, 0.8)]))
    return layers


def currulao():
    """El currulao: la cantadora bailando con la falda blanca que gira, el turbante y el pañuelo en la mano."""
    layers = oval(50, 94, 40, 4, '#d7ccc8', d=1.2)
    layers += [(OUTLINE, ['M 10 92 Q 20 70 40 62 L 60 62 Q 80 70 90 92 Z']), ('#fafafa', ['M 13.4 90.6 Q 22.6 72 40.6 64.4 L 59.4 64.4 Q 77.4 72 86.6 90.6 Z']), ('#e0e0e0', [curve(30, 70, 34, 80, 28, 90, 1.2), curve(50, 66, 52, 78, 50, 90, 1.2), curve(70, 70, 66, 80, 72, 90, 1.2)])]
    layers += shape([(40, 64), (42, 40), (58, 40), (60, 64)], '#fdd835', 1.8)
    layers += bar(42, 44, 26, 26, 3.4, '#5d3a24') + bar(58, 44, 72, 30, 3.4, '#5d3a24')
    layers += [(OUTLINE, [poly(20, 24, 30, 16, 28, 30)]), ('#fafafa', [poly(21.6, 23.6, 28.6, 18, 27, 28)])]
    layers += oval(50, 30, 8, 9, '#5d3a24', d=1.8) + [('#2b1d14', [circle(47, 30, 1), circle(53, 30, 1), curve(47, 35, 50, 37, 53, 35, 1.1)])]
    layers += [(OUTLINE, ['M 40 26 Q 40 8 52 10 Q 64 12 60 26 Z']), ('#e53935', ['M 41.6 25 Q 42 10 52 11.6 Q 62 13.4 58.6 25 Z']), ('#fdd835', [rect(42, 20, 16, 2.4)])]
    return layers


def chirimia():
    """La chirimía: la banda del Chocó con el clarinete, el bombardino y los platillos."""
    layers = [(OUTLINE, [rect(46, 6, 7, 72, 15)]), ('#212121', [rect(47.4, 7.4, 4.2, 69.2, 15)]), ('#b0bec5', [rect(47.4, 24 + 10 * k, 4.2, 1.4, 15) for k in range(4)])]
    layers += [(OUTLINE, [f'M 34 82 L 46 76 L 52 92 L 32 94 Z']), ('#212121', ['M 35.6 83 L 45 78.4 L 49.6 90.6 L 34 92.4 Z'])]
    layers += [(OUTLINE, ['M 62 92 Q 58 62 70 52 L 76 52 Q 68 64 72 86 Q 82 92 86 80 L 82 62 L 88 62 L 92 84 Q 86 98 62 92 Z']), ('#fbc02d', ['M 64 90.4 Q 60.6 63 71 54.4 L 73 54.4 Q 66 64 70 87.4 Q 82 94 88 80.6 L 84 63.6 L 86.4 63.6 L 90.4 84 Q 85 96 64 90.4 Z'])]
    for cx, cy in [(18, 30), (22, 50)]:
        layers += oval(cx, cy, 14, 4, '#f9a825', -15, 1.8) + [('#fff59d', [ellipse(cx - 4, cy - 1, 5, 1.2, -15)]), (OUTLINE, [circle(cx, cy, 2)])]
    return layers


def san_pacho():
    """San Pacho: las fiestas de Quibdó, con banderas de colores, la balsada por el río Atrato y la chirimía."""
    layers = water_rect(2, 66, 96, 30, '#6d8a8a')
    layers += [(OUTLINE, [curve(2, 10, 50, 26, 98, 10, 1.2)])]
    layers += [(c, [poly(10 + 14 * i - 5, 12 + 6 * (1 - abs(i - 3) / 3), 10 + 14 * i + 5, 12 + 6 * (1 - abs(i - 3) / 3), 10 + 14 * i, 22 + 6 * (1 - abs(i - 3) / 3))]) for i, c in enumerate(['#e53935', '#fdd835', '#1e88e5', '#43a047', '#8e24aa', '#fb8c00', '#e53935'])]
    layers += [(OUTLINE, ['M 14 66 L 86 66 L 78 76 L 22 76 Z']), ('#8d5a32', ['M 17 67.4 L 83 67.4 L 77 74.6 L 23 74.6 Z'])]
    layers += [(OUTLINE, [rect(22, 42, 56, 24)]), ('#fdd835', [rect(23.6, 43.6, 52.8, 20.8)]), ('#e53935', [rect(23.6, 50, 52.8, 4)]), ('#1e88e5', [rect(23.6, 56, 52.8, 4)])]
    layers += [(OUTLINE, [poly(20, 44, 50, 28, 80, 44)]), ('#43a047', [poly(24, 42.6, 50, 30.6, 76, 42.6)])]
    layers += bar(50, 28, 50, 14, 1.4, '#5d4037') + [(OUTLINE, [rect(51, 14, 12, 8)]), ('#fafafa', [rect(52.2, 15.2, 9.6, 5.6)]), ('#43a047', [rect(52.2, 15.2, 9.6, 1.8)])]
    return layers


def tambo():
    """El tambo: la casa redonda sobre pilotes, abierta, con su techo cónico de palma y la escalera de tronco."""
    layers = oval(50, 92, 44, 4, '#8d6e63', d=1.2)
    for x in (22, 38, 62, 78):
        layers += bar(x, 92, x, 58, 3, '#6d4c41')
    layers += [(OUTLINE, [rect(14, 56, 72, 6)]), ('#a1693f', [rect(15.4, 57.4, 69.2, 3.2)])]
    layers += bar(20, 54, 20, 40, 2, '#6d4c41') + bar(80, 54, 80, 40, 2, '#6d4c41') + bar(50, 54, 50, 40, 2, '#6d4c41')
    layers += [(OUTLINE, ['M 6 44 Q 30 32 50 4 Q 70 32 94 44 Z']), ('#c8a165', ['M 10 42.4 Q 32 31 50 8 Q 68 31 90 42.4 Z']), ('#a1793f', [curve(14, 40, 34, 28, 50, 10, 1), curve(86, 40, 66, 28, 50, 10, 1), curve(24, 41, 40, 30, 50, 14, 0.8), curve(76, 41, 60, 30, 50, 14, 0.8)])]
    layers += bar(88, 92, 76, 60, 3, '#8d6e63') + [('#5d4037', [rect(80 + 2 * k, 66 + 6 * k, 6, 1.4, -18) for k in range(4)])]
    return layers


def catanga():
    """La catanga: el canasto que la piangüera lleva a la espalda, con sus correas y lleno de pianguas."""
    layers = [(OUTLINE, [curve(30, 40, 22, 10, 40, 6, 3.4), curve(70, 40, 78, 10, 60, 6, 3.4)]), ('#8d5a32', [curve(30, 40, 23, 11, 40, 7, 1.6), curve(70, 40, 77, 11, 60, 7, 1.6)])]
    layers += [(OUTLINE, ['M 18 36 L 82 36 L 72 94 L 28 94 Z']), ('#c8a165', ['M 20.6 38.4 L 79.4 38.4 L 70 91.6 L 30 91.6 Z'])]
    layers.append(('#a1793f', [poly(21 + 0.8 * k, 46 + 9 * k, 79 - 0.8 * k, 46 + 9 * k, 78.4 - 1.6 * k, 49 + 9 * k, 21.6 + 1.6 * k, 49 + 9 * k) for k in range(5)]))
    layers.append(('#e2c68e', [rib(26 + 6 * i, 39, 32 + 4.4 * i, 91, 1.2) for i in range(9)]))
    for x, y in [(30, 34), (42, 30), (54, 32), (66, 34), (36, 26), (60, 26), (48, 22)]:
        layers += oval(x, y, 6, 4.4, '#2b2b2b', d=1.2) + [('#5d5d5d', [rib(x - 4, y, x + 4, y, 0.8)])]
    return layers


def canalete():
    """El canalete: el remo tallado en una sola pieza de madera, con la pala en forma de hoja y su puño."""
    layers = [(OUTLINE, [rect(46, 4, 8, 52), rect(42, 2, 16, 6)]), ('#a1693f', [rect(47.6, 5.6, 4.8, 49), rect(43.6, 3.6, 12.8, 2.8)])]
    layers += [(OUTLINE, [leaf(50, 46, 50, 98, 16)]), ('#b5793f', [leaf(50, 48, 50, 95.6, 13.6)]), ('#8d5a32', [rib(50, 52, 50, 92, 1.2)])]
    layers.append(('#5d3a1e', [poly(40, 68, 50, 60, 60, 68, 50, 76), rect(44, 80, 12, 2)]))
    layers.append(('#e53935', [poly(44, 68, 50, 63, 56, 68, 50, 73)]))
    return layers


def casa_pilotes():
    """La casa en pilotes: la casa de tablas de colores alzada sobre palos para que no la alcance el agua."""
    layers = [(OUTLINE, [rect(2, 76, 96, 20)]), ('#6d8a8a', [rect(3.4, 77.4, 93.2, 17.2)]), ('#8d6e63', [ellipse(50, 78, 40, 3)])]
    for x in (18, 34, 50, 66, 82):
        layers += bar(x, 94, x, 62, 3, '#5d4037')
    layers += [(OUTLINE, [rect(10, 60, 80, 5)]), ('#8d5a32', [rect(11.4, 61.4, 77.2, 2.2)])]
    layers += shape([(14, 60), (14, 30), (86, 30), (86, 60)], '#26a69a', 1.8)
    layers.append(('#00897b', [rect(14 + 6 * i, 30, 1.2, 30) for i in range(12)]))
    layers += [(OUTLINE, [poly(6, 32, 50, 10, 94, 32)]), ('#90a4ae', [poly(10, 30.6, 50, 13, 90, 30.6)]), ('#b0bec5', [rib(20, 26, 50, 13, 1), rib(80, 26, 50, 13, 1)])]
    layers += [(OUTLINE, [rect(42, 38, 16, 22), rect(20, 38, 14, 12), rect(66, 38, 14, 12)]), ('#fdd835', [rect(43.4, 39.4, 13.2, 20.6)]), ('#e53935', [rect(21.4, 39.4, 11.2, 9.2), rect(67.4, 39.4, 11.2, 9.2)])]
    return layers


def jagua_achiote():
    """La jagua y el achiote: el fruto de jagua partido que tiñe de negro, la cápsula de achiote con sus semillas rojas y el trazo pintado."""
    layers = oval(30, 40, 22, 20, '#8d7a5a') + [('#e8e0c8', [ellipse(30, 40, 16, 14)]), ('#3e3a5a', [ellipse(30, 40, 8, 7)]), ('#5d5a7a', [circle(30 + 5 * math.cos(a), 40 + 4 * math.sin(a), 1.2) for a in [i * math.pi / 4 for i in range(8)]])]
    layers += [(OUTLINE, ['M 58 30 Q 70 6 88 26 Q 96 44 80 58 Q 62 60 58 30 Z']), ('#c62828', ['M 60.6 31 Q 71 10 86 27 Q 93 43 79 55.6 Q 64 57.4 60.6 31 Z'])]
    layers += [(OUTLINE, [ellipse(74, 36, 10, 12, 20)]), ('#e53935', [ellipse(74, 36, 8.6, 10.6, 20)])]
    layers.append(('#b71c1c', [circle(x, y, 1.8) for x, y in [(70, 30), (76, 32), (72, 38), (78, 40), (74, 44)]]))
    layers += [(OUTLINE, ['M 10 92 Q 50 70 90 92 Z']), ('#c8945a', ['M 13 90.6 Q 50 73 87 90.6 Z'])]
    layers.append(('#1b1b1b', [poly(20 + 12 * i, 88, 26 + 12 * i, 80, 32 + 12 * i, 88) for i in range(5)]))
    layers.append(('#c62828', [circle(26 + 12 * i, 86, 1.4) for i in range(5)]))
    return layers


def puerto_buenaventura():
    """El puerto de Buenaventura: el buque de contenedores atracado y la grúa pórtico que los carga, sobre el Pacífico."""
    layers = water_rect(2, 70, 96, 26)
    layers += [(OUTLINE, ['M 4 58 L 86 58 L 80 76 L 12 76 Z']), ('#c62828', ['M 6.6 60.4 L 83.4 60.4 L 78.4 73.6 L 13.6 73.6 Z']), ('#1b1b1b', [rect(10, 68, 70, 2)])]
    layers += [(OUTLINE, [rect(64, 40, 16, 18)]), ('#fafafa', [rect(65.4, 41.4, 13.2, 15.2)]), ('#4fa3d9', [rect(67, 44, 10, 3)])]
    for i, c in enumerate(['#1e88e5', '#43a047', '#fb8c00', '#fdd835', '#e53935', '#8e24aa']):
        x = 12 + 9 * (i % 5)
        y = 48 if i < 5 else 38
        layers += [(OUTLINE, [rect(x, y, 9, 10)]), (c, [rect(x + 1.2, y + 1.2, 6.6, 7.6)])]
    layers += [(OUTLINE, [rect(86, 10, 4, 60), rect(30, 8, 66, 5), rect(54, 13, 2, 22)]), ('#fbc02d', [rect(87.2, 11.2, 1.6, 57.6), rect(31.2, 9.2, 63.6, 2.6)]), (OUTLINE, [rect(49, 34, 12, 6)]), ('#1e88e5', [rect(50.2, 35.2, 9.6, 3.6)])]
    return layers


def malecon_pacifico():
    """El malecón de Buenaventura: el paseo al atardecer sobre el mar, con la baranda, la palma y el vasito de ceviche."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#ff8a65', [rect(3.6, 3.6, 92.8, 42)]), ('#ffb74d', [rect(3.6, 30, 92.8, 16)]), ('#1f6f9b', [rect(3.6, 46, 92.8, 26)])]
    layers += [('#ffe082', [circle(50, 46, 10)]), ('#ffcc80', [rect(30, 52, 40, 1.4), rect(36, 58, 28, 1.4)])]
    layers += [('#a1887f', [rect(3.6, 72, 92.8, 24.4)]), (OUTLINE, [rect(3.6, 66, 92.8, 2)] + [rect(8 + 12 * i, 66, 1.6, 8) for i in range(8)])]
    layers += palm(14, 74, 48, 6, 0.8)
    layers += [(OUTLINE, [poly(66, 74, 86, 74, 83, 94, 69, 94)]), ('#e3f2f8', [poly(68, 75.6, 84, 75.6, 81.6, 92.4, 70.4, 92.4)]), ('#ffccbc', [poly(68.6, 80, 83.4, 80, 81.6, 92.4, 70.4, 92.4)]), ('#e53935', [circle(72, 84, 1.4), circle(78, 86, 1.4)]), ('#7cb342', [circle(75, 82, 1.2), circle(80, 82, 1)])]
    return layers


def juanchaco():
    """Juanchaco y Ladrilleros: la playa de arena oscura al pie de la selva, a donde se llega en lancha."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#b3e5fc', [rect(3.6, 3.6, 92.8, 30)]), ('#2e7d32', [poly(3.6, 34, 20, 20, 40, 30, 62, 16, 84, 26, 96.4, 22, 96.4, 52, 3.6, 52)]), ('#388e3c', [circle(10 + 14 * i, 46, 9) for i in range(7)])]
    layers += [('#cbb48a', [poly(3.6, 52, 96.4, 52, 96.4, 64, 3.6, 70)]), ('#29b6f6', [poly(3.6, 70, 96.4, 64, 96.4, 96.4, 3.6, 96.4)]), ('#e1f5fe', [rib(10, 72, 40, 69, 1.4), rib(56, 68, 90, 66, 1.4)])]
    layers += [(OUTLINE, ['M 30 80 L 76 78 L 70 88 L 36 89 Z']), ('#fafafa', ['M 32.6 81.4 L 73.4 79.6 L 69 86.6 L 37 87.4 Z']), ('#1e88e5', [rect(36, 83, 34, 1.4)]), (OUTLINE, [rect(70, 72, 4, 8)]), ('#37474f', [rect(70.8, 72.8, 2.4, 6.4)])]
    return layers


def festival_pacifico():
    """El Festival Folclórico del puerto: la corona de la reina, el cununo y el pañuelo blanco del currulao."""
    layers = [(OUTLINE, ['M 8 56 L 40 56 L 34 94 L 14 94 Z']), ('#8d5a32', ['M 10.4 58.4 L 37.6 58.4 L 32 91.6 L 16 91.6 Z']), ('#f5e6c4', [rib(12 + 5 * i, 60, 18 + 3 * i, 90, 1.2) for i in range(5)])]
    layers += oval(24, 56, 16, 4, '#f3e5c8')
    layers += [(OUTLINE, ['M 50 30 Q 60 16 76 22 Q 92 30 86 48 Q 74 40 64 48 Q 54 42 50 30 Z']), ('#fafafa', ['M 52.6 30.6 Q 61 18.6 75.4 24 Q 89 31 84.6 45 Q 74 37.6 64 45.4 Q 55.6 40.4 52.6 30.6 Z'])]
    crown = [(48, 92), (44, 66), (56, 76), (68, 58), (80, 76), (92, 66), (88, 92)]
    layers += shape(crown, '#fbc02d') + [('#f57f17', [rect(48, 86, 40, 3)]), ('#e53935', [circle(68, 78, 3)]), ('#29b6f6', [circle(56, 82, 2), circle(80, 82, 2)])]
    layers += note(14, 30, 0.7) + note(34, 18, 0.8)
    return layers



# ---------- Láminas del Amazonas (v4.3) ----------

def ceiba():
    """La ceiba: el árbol gigante de la selva, de copa ancha y raíces de tabla, junto a una persona chiquita."""
    layers = oval(50, 94, 46, 3, '#6d8f4e', d=1.2)
    layers += [(OUTLINE, ['M 40 94 L 44 40 L 56 40 L 60 94 Z', 'M 44 80 Q 30 86 22 94 L 42 94 Z', 'M 56 80 Q 70 86 78 94 L 58 94 Z']), ('#8d7a62', ['M 41.6 92.6 L 45.4 41.4 L 54.6 41.4 L 58.4 92.6 Z', 'M 44 82 Q 32 87 26 92.6 L 42 92.6 Z', 'M 56 82 Q 68 87 74 92.6 L 58 92.6 Z'])]
    layers.append(('#76654f', [rect(48, 50, 1.4, 40), rect(52, 46, 1.2, 30)]))
    layers += bar(46, 46, 22, 36, 3, '#8d7a62') + bar(54, 46, 78, 36, 3, '#8d7a62')
    blobs = [(50, 24, 20), (24, 30, 14), (76, 30, 14), (36, 16, 12), (64, 16, 12)]
    layers += [(OUTLINE, [circle(x, y, r + 2) for x, y, r in blobs]), ('#2e7d32', [circle(x, y, r) for x, y, r in blobs]), ('#43a047', [circle(44, 20, 6), circle(70, 26, 5)])]
    layers += oval(86, 90, 2, 2, '#c68642', d=1) + [(OUTLINE, [rect(84.4, 92, 3.2, 4)]), ('#1e88e5', [rect(85, 92.4, 2, 3.4)])]
    return layers


def victoria_regia():
    """La victoria regia: el nenúfar gigante de los lagos, con sus hojas redondas de borde alzado y la flor."""
    layers = [(OUTLINE, [rect(2, 30, 96, 66)]), ('#4e6a5a', [rect(3.4, 31.4, 93.2, 63.2)])]
    for cx, cy, rx, ry in [(36, 70, 30, 12), (76, 50, 20, 8), (78, 86, 16, 6)]:
        layers += [(OUTLINE, [ellipse(cx, cy, rx + 2, ry + 2)]), ('#c0583c', [ellipse(cx, cy, rx, ry)]), ('#558b2f', [ellipse(cx, cy + 1, rx - 2.4, ry - 2.4)]), ('#7cb342', [rib(cx, cy + 1, cx + (rx - 3) * math.cos(a), cy + 1 + (ry - 3) * math.sin(a), 0.8) for a in [i * math.pi / 6 for i in range(12)]])]
    layers += [(OUTLINE, [leaf(52, 46, 46, 30, 6), leaf(52, 46, 58, 30, 6), leaf(52, 46, 52, 28, 6)]), ('#fafafa', [leaf(52, 45, 46.6, 31.6, 4.6), leaf(52, 45, 57.4, 31.6, 4.6)]), ('#f8bbd0', [leaf(52, 45, 52, 30, 4.6)])]
    return layers


def jaguar():
    """El jaguar: el gran felino de la selva, amarillo con rosetas negras, caminando por la orilla del río."""
    body = '#e0a536'
    layers = oval(50, 92, 46, 4, '#6d8f4e', d=1.2)
    for lx in (26, 34, 62, 70):
        layers += [(OUTLINE, [rect(lx - 3.6, 58, 7.2, 32)]), (body, [rect(lx - 2.2, 58, 4.4, 30.6)])]
    layers += oval(50, 56, 30, 14, body)
    layers.append(('#fff3d6', [ellipse(48, 66, 18, 4)]))
    rosettes = [(36, 50), (48, 46), (60, 50), (42, 58), (56, 60), (68, 56), (30, 58)]
    layers.append(('#3e2723', [pts([(x + 3.4 * math.cos(a), y + 2.8 * math.sin(a)) for a in [i * math.pi / 4 for i in range(8)]]) for x, y in rosettes]))
    layers.append((body, [circle(x, y, 1.4) for x, y in rosettes]))
    layers += [(OUTLINE, [curve(78, 52, 94, 50, 92, 32, 4.4)]), (body, [curve(78, 52, 93, 50, 91.6, 33, 2.6)])]
    layers += oval(16, 44, 12, 11, body)
    layers += [(OUTLINE, [circle(10, 34, 4), circle(22, 34, 4)]), (body, [circle(10, 34, 2.6), circle(22, 34, 2.6)])]
    layers.append(('#fff3d6', [ellipse(13, 50, 6, 4)]))
    layers.append(('#3e2723', [ellipse(10, 48, 2.4, 1.6), circle(12, 42, 1.4), circle(20, 42, 1.4), circle(18, 36, 1.2), circle(24, 46, 1.2)]))
    return layers


def guacamaya():
    """La guacamaya: roja, azul y amarilla, de cola larga, posada en la rama."""
    layers = bar(4, 56, 96, 52, 4, '#6d4c41')
    layers += [(OUTLINE, [poly(44, 56, 56, 56, 62, 98, 50, 98)]), ('#e53935', [poly(45.6, 57.4, 54.6, 57.4, 59.6, 96.6, 51.6, 96.6)]), ('#1e88e5', [poly(50, 76, 56, 76, 59.6, 96.6, 53, 96.6)])]
    layers += oval(48, 40, 13, 19, '#e53935')
    layers += [(OUTLINE, [leaf(54, 32, 66, 66, 8)]), ('#fdd835', [leaf(54.6, 33, 65, 50, 6)]), ('#1e88e5', [leaf(60, 48, 65.6, 64.6, 4.6)])]
    layers += oval(42, 18, 11, 10, '#e53935')
    layers += [(OUTLINE, [ellipse(37, 20, 6, 5)]), ('#fafafa', [ellipse(37, 20, 4.8, 3.8)]), ('#1b1b1b', [circle(37, 19, 1.4)])]
    layers += [(OUTLINE, ['M 30 14 Q 20 16 22 30 Q 26 24 30 24 Z']), ('#eceff1', ['M 29.4 15.6 Q 22 17.4 23.6 27 Q 26.4 22.6 29.4 22.6 Z']), ('#212121', ['M 26 24 Q 24 30 28 30 Q 28 26 30 25 Z'])]
    layers += [(OUTLINE, [rect(42, 54, 4, 6), rect(50, 54, 4, 6)])]
    return layers


def perezoso():
    """El perezoso: colgado del yarumo con sus garras largas, con la cara de antifaz y sonriendo."""
    layers = bar(2, 16, 98, 22, 4, '#6d4c41') + [('#43a047', [leaf(80, 20, 92, 34, 5), leaf(70, 20, 76, 36, 4.4), leaf(20, 18, 10, 32, 4.4)])]
    layers += oval(50, 52, 20, 24, '#a1887f')
    layers.append(('#8d6e63', [rib(36 + 4 * i, 40, 34 + 4 * i, 70, 1) for i in range(8)]))
    for x0, x1 in [(38, 34), (62, 66)]:
        layers += bar(x0, 40, x1, 20, 4.4, '#a1887f')
        layers += [(OUTLINE, [curve(x1 - 3, 20, x1 - 4, 14, x1 - 1, 12, 1.6), curve(x1 + 1, 20, x1, 14, x1 + 3, 12, 1.6)])]
    layers += oval(50, 74, 14, 12, '#d7ccc8')
    layers += [(OUTLINE, [ellipse(44, 72, 5, 3.4, -20), ellipse(56, 72, 5, 3.4, 20)]), ('#4e342e', [ellipse(44, 72, 3.8, 2.2, -20), ellipse(56, 72, 3.8, 2.2, 20)]), ('#1b1b1b', [circle(44, 72, 1.2), circle(56, 72, 1.2), ellipse(50, 78, 2.4, 1.6)]), ('#3e2723', [curve(46, 82, 50, 84, 54, 82, 1)])]
    return layers


def farina():
    """La fariña: los granitos de yuca rallada y tostada en la totuma, y el colador de yarumo al lado."""
    layers = [(OUTLINE, ['M 6 44 Q 8 86 40 86 Q 72 86 74 44 Z']), ('#8d5a32', ['M 8.6 46.4 Q 10.6 83.4 40 83.4 Q 69.4 83.4 71.4 46.4 Z'])]
    layers += [(OUTLINE, [ellipse(40, 44, 34, 8)]), ('#f2c94c', [ellipse(40, 44, 32, 6.4)])]
    layers.append(('#d9a52b', [circle(18 + 4 * (i % 13) + (2 if (i // 13) % 2 else 0), 41 + 2.4 * (i // 13), 0.9) for i in range(39)]))
    layers += [(OUTLINE, [ellipse(80, 76, 16, 14)]), ('#c8a165', [ellipse(80, 76, 14.4, 12.4)])]
    layers.append(('#a1793f', [rib(68 + 4 * i, 66, 70 + 4 * i, 86, 1) for i in range(6)] + [rib(68, 70 + 4 * j, 92, 70 + 4 * j, 1) for j in range(4)]))
    layers.append(('#f2c94c', [circle(x, y, 1) for x, y in [(60, 90), (64, 94), (88, 94), (54, 92)]]))
    return layers


def camu_camu():
    """El camu camu: la rama de la orilla inundada con sus frutos redondos rojos y morados, llenos de vitamina C."""
    layers = bar(6, 30, 94, 22, 3, '#6d4c41') + bar(40, 27, 46, 46, 2, '#6d4c41') + bar(70, 24, 74, 44, 2, '#6d4c41')
    layers += [('#43a047', [leaf(20, 28, 10, 14, 4), leaf(56, 25, 64, 10, 4), leaf(84, 22, 94, 8, 4)])]
    for x, y, c in [(30, 50, '#c62828'), (44, 56, '#8e24aa'), (38, 70, '#d81b60'), (66, 52, '#c62828'), (78, 60, '#6a1b9a'), (60, 70, '#d81b60'), (50, 82, '#c62828')]:
        layers += oval(x, y, 8, 8, c, d=1.8) + [('#ffffff', [ellipse(x - 3, y - 3, 2, 1.4)]), ('#3e2723', [circle(x, y - 8, 1)])]
    return layers


def copoazu():
    """El copoazú: el fruto pariente del cacao, de cáscara parda, entero y partido con su pulpa blanca y ácida."""
    layers = oval(34, 50, 28, 20, '#8d5a32', -20) + [('#a1754f', [ellipse(26, 44, 10, 5, -20)]), ('#6d4128', [curve(14, 58, 30, 66, 52, 54, 1.2)])]
    layers += bar(58, 38, 66, 30, 2.4, '#5d4037')
    layers += oval(72, 74, 22, 16, '#8d5a32') + [('#fafafa', [ellipse(72, 74, 18, 12.4)]), ('#efe7d6', [ellipse(76, 78, 8, 5)])]
    layers.append(('#6d4128', [ellipse(x, y, 2.6, 1.6) for x, y in [(66, 72), (72, 70), (78, 72), (70, 78), (76, 76)]]))
    return layers


def chicha_chontaduro():
    """La chicha de chontaduro: la olla de barro con la chicha anaranjada, los chontaduros cocinados y la totuma."""
    layers = [(OUTLINE, ['M 12 40 L 64 40 Q 70 70 58 90 L 18 90 Q 6 70 12 40 Z']), ('#8d4a2a', ['M 14.6 42.4 L 61.4 42.4 Q 67 70 56.4 87.6 L 19.6 87.6 Q 9 70 14.6 42.4 Z']), ('#6d3820', [rect(14, 56, 50, 2.4)])]
    layers += [(OUTLINE, [ellipse(38, 40, 28, 6)]), ('#ff8a3d', [ellipse(38, 40, 26.4, 4.6)]), ('#ffb27a', [ellipse(32, 39, 8, 1.4)])]
    for x, y in [(72, 84), (84, 80), (80, 92), (92, 90)]:
        layers += oval(x, y, 6, 5, '#e64a19', d=1.4) + [('#ffccbc', [ellipse(x - 2, y - 2, 1.4, 1)])]
    layers += [(OUTLINE, ['M 66 46 Q 68 62 80 62 Q 92 62 94 46 Z']), ('#8d5a32', ['M 68.4 47.4 Q 70 59.6 80 59.6 Q 90 59.6 91.6 47.4 Z']), (OUTLINE, [ellipse(80, 46, 14, 3.4)]), ('#ff8a3d', [ellipse(80, 46, 12.4, 2.2)])]
    return layers


def canoa_amazonas():
    """La canoa del Amazonas: tallada de un solo tronco, con el remero en el río café y la selva al fondo."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#b3e5fc', [rect(3.6, 3.6, 92.8, 30)]), ('#2e7d32', [rect(3.6, 30, 92.8, 18)]), ('#388e3c', [circle(10 + 12 * i, 32, 8) for i in range(8)]), ('#8d6e4a', [rect(3.6, 48, 92.8, 48.4)])]
    layers.append(('#a1887f', [rib(8, 60, 30, 60, 1.4), rib(60, 90, 86, 90, 1.4)]))
    layers += [(OUTLINE, ['M 10 72 Q 50 90 90 72 Q 50 80 10 72 Z']), ('#6d4128', ['M 13.6 73.4 Q 50 87 86.4 73.4 Q 50 80 13.6 73.4 Z'])]
    layers += shape([(42, 76), (44, 58), (54, 58), (56, 76)], '#fdd835', 1.6) + oval(49, 52, 5, 5.6, '#a1693f', d=1.4)
    layers += bar(60, 44, 40, 90, 2, '#a1693f') + [(OUTLINE, [leaf(42, 82, 36, 96, 4)]), ('#a1693f', [leaf(41.6, 83, 36.6, 94.6, 2.8)])]
    return layers


def delfin_rosado():
    """El delfín rosado del Amazonas: el bufeo de pico largo y frente redonda, saliendo del agua oscura del río."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#ffccbc', [rect(3.6, 3.6, 92.8, 40)]), ('#5d4a3a', [rect(3.6, 42, 92.8, 54.4)])]
    layers += [(OUTLINE, ['M 10 86 Q 20 44 54 38 Q 70 36 74 44 L 92 50 Q 82 54 72 52 Q 66 76 30 90 Z']), ('#f48fb1', ['M 13.6 84.6 Q 22.6 46.6 54 40.6 Q 68.4 38.6 71.6 45.6 L 86.6 50.4 Q 80 52 70.6 49.4 Q 64.6 74 30 87.6 Z'])]
    layers += [(OUTLINE, [circle(62, 42, 8)]), ('#f48fb1', [circle(62, 42, 6.6)]), ('#f8bbd0', [ellipse(46, 56, 12, 4, -30)]), ('#1b1b1b', [circle(66, 44, 1.2)])]
    layers += [(OUTLINE, [poly(30, 56, 40, 50, 42, 62)]), ('#f06292', [poly(31.6, 56, 39, 51.6, 40.6, 60)])]
    layers.append(('#d7ccc8', [ellipse(20, 88, 10, 2), ellipse(60, 80, 14, 2)]))
    return layers


def pirana():
    """La piraña: el pez de dientes afilados, de lomo gris y panza roja, que se pesca con carne y se come frito."""
    layers = [(OUTLINE, ['M 18 50 Q 30 18 62 22 Q 78 28 80 50 Q 78 72 62 78 Q 30 82 18 50 Z']), ('#90a4ae', ['M 20.6 50 Q 32 21 62 24.6 Q 76 30 77.4 50 Q 76 70 62 75.4 Q 32 79 20.6 50 Z']), ('#e53935', ['M 22 56 Q 40 74 62 72 Q 74 68 76 56 Q 50 64 22 56 Z'])]
    layers.append(('#b0bec5', [circle(x, y, 1.4) for x, y in [(40, 34), (50, 30), (60, 34), (44, 42), (56, 42), (66, 40)]]))
    layers += [(OUTLINE, [poly(78, 50, 96, 32, 92, 50, 96, 68)]), ('#78909c', [poly(80.6, 50, 93.6, 36.4, 90, 50, 93.6, 63.6)])]
    layers += [(OUTLINE, [poly(44, 22, 54, 10, 60, 24)]), ('#78909c', [poly(46, 22, 53.6, 13, 57.6, 23)])]
    layers += [(OUTLINE, [circle(32, 42, 5)]), ('#fdd835', [circle(32, 42, 3.6)]), ('#1b1b1b', [circle(32, 42, 2)])]
    layers += [(OUTLINE, ['M 18 50 L 30 52 L 18 58 Z']), ('#5d4037', ['M 19.6 51 L 27 52.4 L 19.6 56 Z'])]
    layers.append(('#fafafa', [poly(20 + 2.4 * i, 50.6, 21.2 + 2.4 * i, 53.4, 22.4 + 2.4 * i, 50.6) for i in range(4)]))
    return layers


def tarapoto():
    """Los lagos de Tarapoto: el lago de agua negra rodeado de selva, con la aleta del delfín y el cielo reflejado."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#ffe0b2', [rect(3.6, 3.6, 92.8, 36)]), ('#2e7d32', [rect(3.6, 30, 92.8, 16)]), ('#1b5e20', [circle(8 + 10 * i, 34, 7) for i in range(10)]), ('#2b2a25', [rect(3.6, 46, 92.8, 50.4)])]
    layers.append(('#5d5a4a', [rect(3.6, 48, 92.8, 4), ellipse(70, 62, 14, 2), ellipse(30, 80, 18, 2)]))
    layers += moriche_palm(84, 46, 18, 0.45)
    layers += [(OUTLINE, ['M 40 76 Q 46 62 56 66 L 58 76 Z']), ('#f48fb1', ['M 42.6 75 Q 47 64.4 55 67.6 L 56.4 75 Z'])]
    layers.append(('#8d8a7a', [ellipse(50, 78, 14, 1.6)]))
    return layers


def creciente():
    """La creciente: el río sube más de diez metros y se mete a la selva; los árboles quedan con el agua al tronco."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#c8e6f5', [rect(3.6, 3.6, 92.8, 92.8)])]
    for x, h in [(18, 70), (46, 80), (76, 66)]:
        layers += bar(x, 96, x, 96 - h, 3.4, '#6d4c41')
        blobs = [(x, 96 - h, 12), (x - 8, 96 - h + 6, 8), (x + 8, 96 - h + 6, 8)]
        layers += [(OUTLINE, [circle(a, b, r + 2) for a, b, r in blobs]), ('#2e7d32', [circle(a, b, r) for a, b, r in blobs])]
    layers += [('#6d8a8a', [rect(3.6, 56, 92.8, 40.4)]), ('#b2dfdb', [rib(10, 66, 30, 66, 1.4), rib(56, 74, 80, 74, 1.4), rib(30, 86, 50, 86, 1.4)])]
    layers.append(('#a1887f', [rect(3.6, 52, 92.8, 1.6)]))
    layers += [(OUTLINE, [rect(88, 20, 4, 56)]), ('#fafafa', [rect(88.8, 20.8, 2.4, 54.4)]), ('#e53935', [rect(88.8, 24 + 8 * k, 2.4, 3) for k in range(6)])]
    return layers


def maloca():
    """La maloca: la casa grande y redonda de la comunidad, con techo de palma hasta el suelo y la fachada pintada."""
    layers = oval(50, 92, 46, 4, '#8d6e63', d=1.2)
    layers += [(OUTLINE, ['M 4 92 Q 10 30 50 6 Q 90 30 96 92 Z']), ('#c8a165', ['M 7.4 90.6 Q 13 32 50 9.6 Q 87 32 92.6 90.6 Z'])]
    layers.append(('#a1793f', [curve(12 + 8 * i, 90, 20 + 6 * i, 40, 50, 10, 0.9) for i in range(5)] + [curve(88 - 8 * i, 90, 80 - 6 * i, 40, 50, 10, 0.9) for i in range(5)]))
    layers += [(OUTLINE, [poly(32, 92, 32, 58, 68, 58, 68, 92)]), ('#efe3c2', [poly(33.6, 92, 33.6, 59.6, 66.4, 59.6, 66.4, 92)])]
    layers.append(('#1b1b1b', [poly(36 + 8 * i, 66, 40 + 8 * i, 60.6, 44 + 8 * i, 66) for i in range(4)] + [rect(33.6, 74, 32.8, 1.6)]))
    layers.append(('#c62828', [poly(36 + 8 * i, 70, 40 + 8 * i, 76, 44 + 8 * i, 70) for i in range(4)]))
    layers += [('#3e2723', [rect(45, 80, 10, 12)])]
    return layers


def mascara_pelazon(cx, cy, s, face, paint):
    """Una máscara de la Pelazón: de corteza de yanchama, con la cara pintada y su melena de fibras."""
    def S(v):
        return v * s
    layers = [('#a1887f', [rib(cx - S(12) + S(4) * i, cy + S(10), cx - S(14) + S(5) * i, cy + S(34), S(2)) for i in range(7)])]
    layers += oval(cx, cy, S(14), S(18), face)
    layers += [(OUTLINE, [circle(cx - S(5), cy - S(4), S(3.4)), circle(cx + S(5), cy - S(4), S(3.4)), ellipse(cx, cy + S(9), S(5), S(2.4))]), ('#fafafa', [circle(cx - S(5), cy - S(4), S(2)), circle(cx + S(5), cy - S(4), S(2))])]
    layers.append((paint, [rect(cx - S(12), cy - S(12), S(24), S(2)), poly(cx - S(12), cy + S(2), cx - S(6), cy + S(6), cx - S(12), cy + S(8)), poly(cx + S(12), cy + S(2), cx + S(6), cy + S(6), cx + S(12), cy + S(8))]))
    return layers


def pelazon():
    """La Pelazón: la fiesta ticuna de la muchacha que se vuelve mujer, con las máscaras de corteza pintada."""
    layers = mascara_pelazon(30, 40, 1.4, '#e8d9b0', '#c62828') + mascara_pelazon(72, 46, 1.2, '#d7c49a', '#1b1b1b')
    layers += note(50, 82, 0.6)
    return layers


def manguare():
    """El manguaré: los dos troncos ahuecados que se golpean con mazos y se oyen a kilómetros por la selva."""
    layers = oval(50, 92, 46, 3, '#8d6e63', d=1.2)
    for y, w in [(66, 84), (44, 74)]:
        x = 50 - w / 2
        layers += bar(x + 6, y + 22, x + 6, y, 3, '#6d4c41') + bar(x + w - 6, y + 22, x + w - 6, y, 3, '#6d4c41')
        layers += [(OUTLINE, [rect(x, y - 10, w, 18)]), ('#8d5a32', [rect(x + 1.6, y - 8.4, w - 3.2, 14.8)]), ('#3e2723', [rect(x + 10, y - 9, w - 20, 3)]), ('#a1693f', [rect(x + 1.6, y + 2, w - 3.2, 2)])]
        layers.append(('#c62828', [poly(x + 4, y + 4, x + 8, y - 4, x + 12, y + 4), poly(x + w - 12, y + 4, x + w - 8, y - 4, x + w - 4, y + 4)]))
    layers += bar(62, 26, 78, 6, 2.4, '#a1693f') + oval(60, 28, 5, 5, '#3e2723', d=1.4)
    return layers


def uitoto():
    """Los uitoto: el abuelo sabedor con su corona de plumas, que cuenta en la maloca las historias del sol, el río y la anaconda."""
    layers = oval(40, 94, 30, 3, '#8d6e63', d=1.2)
    layers += [(OUTLINE, ['M 16 94 Q 18 62 40 60 Q 62 62 64 94 Z']), ('#c8945a', ['M 18.6 92.6 Q 20.6 64.6 40 62.6 Q 59.4 64.6 61.4 92.6 Z'])]
    layers.append(('#1b1b1b', [rect(20, 76, 40, 2)] + [poly(22 + 6 * i, 80, 25 + 6 * i, 86, 28 + 6 * i, 80) for i in range(6)]))
    layers += oval(40, 46, 10, 12, '#a1693f', d=1.8) + [('#1b1b1b', [circle(36, 45, 1.1), circle(44, 45, 1.1), curve(36, 52, 40, 54, 44, 52, 1.1)]), ('#c62828', [rect(32, 48, 4, 1.4), rect(44, 48, 4, 1.4)])]
    for i, c in enumerate(['#e53935', '#fdd835', '#1e88e5', '#43a047', '#fdd835', '#e53935']):
        a = math.radians(-160 + i * 28)
        layers += [(OUTLINE, [leaf(40, 36, 40 + 18 * math.cos(a), 36 + 16 * math.sin(a), 4.4)]), (c, [leaf(40, 36, 40 + 16.4 * math.cos(a), 36 + 14.6 * math.sin(a), 3)])]
    layers += [(OUTLINE, [rect(28, 34, 24, 5)]), ('#fafafa', [rect(29.4, 35.4, 21.2, 2.2)])]
    layers += oval(80, 18, 7, 7, '#fdd835') + [('#fbc02d', [rib(80 + 9 * math.cos(a), 18 + 9 * math.sin(a), 80 + 12 * math.cos(a), 18 + 12 * math.sin(a), 1.4) for a in [i * math.pi / 4 for i in range(8)]])]
    layers += [(OUTLINE, [curve(68, 44, 80, 36, 92, 46, 3)]), ('#6b8e23', [curve(68, 44, 80, 37, 92, 46, 1.4)])]
    layers += smoked_fish(80, 66, 0.6, 0, '#4fa3d9')
    return layers


def chambira():
    """La chambira: las madejas de fibra de palma, cruda y teñida, y la mochila tejida con ellas."""
    layers = []
    for x, y, c in [(22, 26, '#e8dcb0'), (44, 22, '#c62828'), (66, 28, '#f9a825')]:
        layers += oval(x, y, 10, 14, c, 20) + [(tone(c, 0.8), [curve(x - 6, y - 8, x, y, x + 6, y + 8, 1), curve(x - 4, y - 12, x + 2, y, x + 4, y + 12, 1)])]
    layers += [(OUTLINE, [curve(34, 56, 50, 30, 66, 56, 3.4)]), ('#d9c48a', [curve(34, 56, 50, 31.6, 66, 56, 1.6)])]
    layers += [(OUTLINE, ['M 26 52 L 74 52 L 70 94 L 30 94 Z']), ('#d9c48a', ['M 28.4 54.4 L 71.6 54.4 L 67.8 91.6 L 32.2 91.6 Z'])]
    layers.append(('#c62828', [rect(29, 62, 42, 3), rect(30, 78, 40, 3)]))
    layers.append(('#1b1b1b', [poly(32 + 8 * i, 74, 36 + 8 * i, 68, 40 + 8 * i, 74) for i in range(5)]))
    layers.append(('#b8a56c', [rib(30, 58 + 4 * k, 70, 58 + 4 * k, 0.6) for k in range(9)]))
    return layers


def cerbatana():
    """La cerbatana: el tubo largo de madera para cazar soplando, con la aljaba de dardos y el algodón."""
    layers = [(OUTLINE, [rect(46, 2, 8, 96, 18)]), ('#6d4c41', [rect(47.6, 3.6, 4.8, 92.8, 18)]), ('#8d6e63', [rect(48.6, 3.6, 1.2, 92.8, 18)])]
    layers += [(OUTLINE, [rect(70, 52, 16, 40)]), ('#c8a165', [rect(71.6, 53.6, 12.8, 36.8)]), ('#a1793f', [rect(71.6, 62 + 8 * k, 12.8, 1.4) for k in range(3)])]
    for x in (73, 77, 81):
        layers += bar(x, 54, x - 2, 34, 1, '#efe6d2', 0.8) + oval(x - 2, 32, 2.4, 3, '#fafafa', d=1)
    layers += oval(18, 82, 9, 7, '#fafafa', d=1.6) + oval(26, 78, 6, 5, '#fafafa', d=1.4)
    return layers


def palo_sangre():
    """Las tallas de palo sangre: el delfín, el pez y la tortuga tallados en madera roja y pulida."""
    wood = '#9c2f20'
    layers = oval(50, 92, 46, 3, '#d7ccc8', d=1.2)
    layers += [(OUTLINE, ['M 10 50 Q 22 22 48 24 L 60 18 L 58 28 Q 62 40 50 46 Q 30 54 10 50 Z']), (wood, ['M 13 49 Q 24 25 48 26.4 L 57 22 L 55.6 28.6 Q 58.6 39 49 44 Q 31 51.6 13 49 Z']), ('#c0483a', [ellipse(32, 36, 10, 3, -20)]), ('#1b1b1b', [circle(46, 32, 1)])]
    layers += [(OUTLINE, ['M 58 66 Q 70 52 86 60 L 96 52 L 94 68 L 96 82 L 86 74 Q 70 82 58 66 Z']), (wood, ['M 60.6 66 Q 71 55 85 61.6 L 93 56 L 91.6 68 L 93 78 L 85 72 Q 71 79 60.6 66 Z']), ('#c0483a', [rib(70, 62, 72, 70, 1), rib(76, 60, 78, 72, 1)]), ('#1b1b1b', [circle(66, 64, 1)])]
    layers += oval(26, 78, 14, 9, wood) + [('#c0483a', [pts([(26 + 5 * math.cos(a), 78 + 4 * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]])])] + oval(10, 76, 4, 3.4, wood, d=1.4) + oval(38, 88, 3, 2, wood, d=1.2) + oval(14, 88, 3, 2, wood, d=1.2)
    return layers


def collar_semillas():
    """Los collares de semillas: semillas de la selva de colores y formas distintas, ensartadas en un hilo."""
    layers = [(OUTLINE, [curve(10, 14, 50, 110, 90, 14, 1.2)])]
    seeds = [('#c62828', 'h'), ('#3e2723', 'o'), ('#9e9e9e', 'o'), ('#c62828', 'h'), ('#f9a825', 'l'), ('#3e2723', 'o'), ('#c62828', 'h'), ('#9e9e9e', 'o'), ('#f9a825', 'l'), ('#3e2723', 'o'), ('#c62828', 'h')]
    for i, (c, kind) in enumerate(seeds):
        t = (i + 0.5) / len(seeds)
        x = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 50 + t * t * 90
        y = (1 - t) ** 2 * 14 + 2 * (1 - t) * t * 110 + t * t * 14
        if kind == 'l':
            layers += oval(x, y, 3.4, 6, c, math.degrees(math.atan2(110 - 14, 0)) * 0, 1.4)
        else:
            layers += oval(x, y, 5, 4.4, c, d=1.4)
        if kind == 'h':
            layers.append(('#1b1b1b', [ellipse(x + 1.6, y - 1, 2, 2.4)]))
        layers.append(('#ffffff', [ellipse(x - 1.6, y - 1.6, 1.2, 0.8)]))
    return layers


def triple_frontera():
    """La triple frontera: el río Amazonas donde se juntan Colombia, Brasil y Perú, cada uno con su bandera."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#9ccc65', [rect(3.6, 3.6, 92.8, 92.8)])]
    layers += [(OUTLINE, ['M 3.6 54 Q 30 46 50 56 Q 70 66 96.4 60 L 96.4 74 Q 70 80 50 70 Q 30 60 3.6 68 Z']), ('#8d6e4a', ['M 3.6 56 Q 30 48.4 50 58 Q 70 68 96.4 62 L 96.4 72 Q 70 78 50 68 Q 30 58 3.6 66 Z'])]
    layers.append(('#7cb342', [rect(46, 3.6, 2, 52)]))
    for x, y, f in [(22, 20, 'co'), (70, 20, 'br'), (40, 70, 'pe')]:
        layers += bar(x, y + 22, x, y - 6, 1.6, '#5d4037') + [(OUTLINE, [rect(x + 1, y - 6, 22, 14)])]
        if f == 'co':
            layers += [('#fdd835', [rect(x + 2.2, y - 4.8, 19.6, 6)]), ('#1e88e5', [rect(x + 2.2, y + 1.2, 19.6, 3)]), ('#e53935', [rect(x + 2.2, y + 4.2, 19.6, 2.6)])]
        elif f == 'br':
            layers += [('#43a047', [rect(x + 2.2, y - 4.8, 19.6, 11.6)]), ('#fdd835', [poly(x + 4, y + 1, x + 12, y - 4, x + 20, y + 1, x + 12, y + 6)]), ('#1e88e5', [circle(x + 12, y + 1, 2.6)])]
        else:
            layers += [('#e53935', [rect(x + 2.2, y - 4.8, 6.6, 11.6), rect(x + 15.2, y - 4.8, 6.6, 11.6)]), ('#fafafa', [rect(x + 8.8, y - 4.8, 6.4, 11.6)])]
    return layers


def parque_santander():
    """El parque Santander de Leticia: al atardecer llegan miles de loros a dormir en sus árboles."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#ffcc80', [rect(3.6, 3.6, 92.8, 92.8)]), ('#a1887f', [rect(3.6, 84, 92.8, 12.4)])]
    layers += bar(50, 90, 50, 50, 5, '#6d4c41')
    blobs = [(50, 36, 26), (26, 46, 16), (74, 46, 16), (36, 22, 14), (64, 22, 14)]
    layers += [(OUTLINE, [circle(x, y, r + 2) for x, y, r in blobs]), ('#2e7d32', [circle(x, y, r) for x, y, r in blobs])]
    for x, y in [(30, 30), (44, 20), (60, 28), (70, 40), (38, 44), (54, 42), (24, 50), (78, 52), (62, 16)]:
        layers += [(OUTLINE, [ellipse(x, y, 3.6, 2.6)]), ('#76ff03', [ellipse(x, y, 2.6, 1.6)]), ('#fdd835', [circle(x - 2.6, y - 0.6, 0.8)])]
    for x, y in [(12, 12), (20, 8), (84, 10), (90, 18)]:
        layers.append(('#33691e', [curve(x - 3, y, x, y - 3, x + 3, y, 1.2)]))
    return layers


def tabatinga():
    """Tabatinga: la calle que sigue de Leticia a Brasil sin puesto de frontera, con el hito y las dos banderas."""
    layers = oval(50, 94, 46, 3, '#d7ccc8', d=1.2)
    layers += [('#9e9e9e', [poly(30, 96, 44, 50, 56, 50, 70, 96)]), ('#fafafa', [rect(49, 56 + 10 * k, 2, 5) for k in range(4)])]
    layers += house_front(2, 56, 26, 30, '#ffe082', '#c0592b', '#1e88e5') + house_front(72, 56, 26, 30, '#a5d6a7', '#c0592b', '#e53935')
    layers += [(OUTLINE, [poly(46, 50, 48, 18, 52, 18, 54, 50)]), ('#fafafa', [poly(47.6, 49, 49.4, 19.6, 50.6, 19.6, 52.4, 49)])]
    for x, f in [(30, 'co'), (64, 'br')]:
        layers += bar(x, 50, x, 20, 1.4, '#5d4037') + [(OUTLINE, [rect(x + 1, 20, 14, 10)])]
        layers += [('#fdd835', [rect(x + 2, 21, 12, 4)]), ('#1e88e5', [rect(x + 2, 25, 12, 2)]), ('#e53935', [rect(x + 2, 27, 12, 2)])] if f == 'co' else [('#43a047', [rect(x + 2, 21, 12, 8)]), ('#fdd835', [poly(x + 3, 25, x + 8, 22, x + 13, 25, x + 8, 28)]), ('#1e88e5', [circle(x + 8, 25, 1.6)])]
    return layers


def puerto_narino():
    """Puerto Nariño: el pueblo sin carros, de andenes de cemento entre jardines y casas de colores, junto al río."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#b3e5fc', [rect(3.6, 3.6, 92.8, 30)]), ('#8bc34a', [rect(3.6, 32, 92.8, 46)]), ('#8d6e4a', [rect(3.6, 78, 92.8, 18.4)])]
    layers += house_front(8, 42, 22, 22, '#ef9a9a', '#5d4037', '#1e88e5') + house_front(62, 40, 24, 24, '#90caf9', '#5d4037', '#43a047')
    layers += [(OUTLINE, [poly(36, 78, 42, 34, 54, 34, 60, 78)]), ('#eceff1', [poly(37.6, 78, 43.4, 35.6, 52.6, 35.6, 58.4, 78)])]
    layers.append(('#ec407a', [circle(x, y, 2.2) for x, y in [(32, 70), (64, 72), (30, 60), (68, 62), (34, 50)]]))
    layers.append(('#fdd835', [circle(x, y, 1.8) for x, y in [(28, 74), (70, 68), (66, 56)]]))
    layers.append(('#a1887f', [rib(10, 86, 30, 86, 1.4), rib(60, 90, 86, 90, 1.4)]))
    return layers


def mico_ardilla():
    """La isla de los Micos: el mico ardilla de brazos amarillos y cara blanca de hocico negro, colgado de la rama."""
    layers = bar(2, 30, 98, 24, 4, '#6d4c41') + [('#43a047', [leaf(80, 26, 96, 40, 5), leaf(14, 30, 4, 44, 4.4)])]
    layers += [(OUTLINE, [curve(60, 74, 86, 86, 80, 56, 3.4)]), ('#8d8d7a', [curve(60, 74, 85, 85, 80, 57, 1.6)]), ('#1b1b1b', [circle(80, 56, 2)])]
    layers += oval(50, 66, 14, 16, '#9e9e8a')
    layers += bar(40, 58, 34, 30, 3.4, '#f9a825') + bar(60, 58, 64, 30, 3.4, '#f9a825') + bar(44, 80, 40, 94, 3.4, '#f9a825') + bar(56, 80, 60, 94, 3.4, '#f9a825')
    layers += oval(50, 46, 12, 11, '#9e9e8a') + [('#fafafa', [ellipse(46, 44, 4.6, 5.4), ellipse(54, 44, 4.6, 5.4)]), ('#1b1b1b', [ellipse(50, 51, 5, 4), circle(46, 44, 1.6), circle(54, 44, 1.6)])]
    layers += [(OUTLINE, [circle(38, 42, 3.4), circle(62, 42, 3.4)]), ('#fafafa', [circle(38, 42, 2), circle(62, 42, 2)])]
    return layers


def amacayacu():
    """Amacayacu: el puente colgante de cuerdas y tablas entre los árboles gigantes de la selva inundada."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#c8e6c9', [rect(3.6, 3.6, 92.8, 92.8)]), ('#6d8a8a', [rect(3.6, 76, 92.8, 20.4)])]
    for x in (14, 86):
        layers += bar(x, 96, x, 20, 6, '#6d4c41')
        layers += [(OUTLINE, [circle(x, 18, 14)]), ('#2e7d32', [circle(x, 18, 12)])]
    layers += [(OUTLINE, [curve(16, 40, 50, 64, 84, 40, 1.2), curve(16, 50, 50, 74, 84, 50, 1.2)])]
    layers.append(('#a1693f', [rect(20 + 6.4 * i, 50 + 12 * (1 - ((20 + 6.4 * i - 50) / 34) ** 2) - 1, 4, 3) for i in range(11)]))
    layers.append((OUTLINE, [rib(20 + 6.4 * i, 40 + 12 * (1 - ((20 + 6.4 * i - 50) / 34) ** 2), 22 + 6.4 * i, 50 + 12 * (1 - ((20 + 6.4 * i - 50) / 34) ** 2), 0.6) for i in range(11)]))
    layers.append(('#388e3c', [circle(10 + 14 * i, 78, 6) for i in range(7)]))
    return layers



# ---------- Emojis propios: interfaz (v4.3) ----------

GOLD, GOLD_D, SILVER, BRONZE = '#fbc02d', '#f57f17', '#b0bec5', '#cd7f32'


def star_pts(cx, cy, r1, r2, n=5, rot=-90):
    return [(cx + (r1 if i % 2 == 0 else r2) * math.cos(math.radians(rot + i * 180 / n)), cy + (r1 if i % 2 == 0 else r2) * math.sin(math.radians(rot + i * 180 / n))) for i in range(2 * n)]


def e_star():
    """Estrella dorada (Renombre)."""
    return shape(star_pts(50, 54, 44, 19), GOLD, 2.6) + [('#fff59d', [pts(star_pts(44, 46, 14, 6))])]


def medal(color, ribbon='#1e88e5', label=None):
    layers = [(OUTLINE, [poly(26, 4, 42, 4, 54, 46, 38, 46), poly(74, 4, 58, 4, 46, 46, 62, 46)]), (ribbon, [poly(28, 6, 40, 6, 51, 44, 40, 44)]), ('#e53935', [poly(72, 6, 60, 6, 49, 44, 60, 44)])]
    layers += oval(50, 66, 28, 28, color) + [(tone(color, 0.8), [circle(50, 66, 20)]), (color, [circle(50, 66, 17)])]
    if label:
        layers.append((tone(color, 0.6), [label]))
    else:
        layers.append((tone(color, 1.35), [pts(star_pts(50, 66, 12, 5))]))
    return layers


def e_medal():
    """Medalla de los eventos."""
    return medal(GOLD)


def digit_path(d, cx, cy, s):
    """Un número 1, 2 o 3 sencillo, de trazo grueso."""
    if d == 1:
        return pts([(cx - 2 * s, cy - 10 * s), (cx + 3 * s, cy - 12 * s), (cx + 3 * s, cy + 10 * s), (cx - 2 * s, cy + 10 * s)])
    if d == 2:
        return f'M {cx - 7 * s} {cy - 6 * s} Q {cx - 6 * s} {cy - 13 * s} {cx} {cy - 13 * s} Q {cx + 8 * s} {cy - 12 * s} {cx + 6 * s} {cy - 3 * s} L {cx - 2 * s} {cy + 5 * s} L {cx + 8 * s} {cy + 5 * s} L {cx + 8 * s} {cy + 11 * s} L {cx - 8 * s} {cy + 11 * s} L {cx - 8 * s} {cy + 6 * s} L {cx + 1 * s} {cy - 4 * s} Q {cx + 2 * s} {cy - 8 * s} {cx} {cy - 8 * s} Q {cx - 2 * s} {cy - 8 * s} {cx - 2 * s} {cy - 6 * s} Z'
    return f'M {cx - 7 * s} {cy - 8 * s} Q {cx - 4 * s} {cy - 13 * s} {cx + 1 * s} {cy - 13 * s} Q {cx + 8 * s} {cy - 12 * s} {cx + 6 * s} {cy - 3 * s} Q {cx + 9 * s} {cy + 2 * s} {cx + 6 * s} {cy + 8 * s} Q {cx} {cy + 14 * s} {cx - 8 * s} {cy + 8 * s} L {cx - 6 * s} {cy + 3 * s} Q {cx} {cy + 8 * s} {cx + 1 * s} {cy + 3 * s} Q {cx + 2 * s} {cy - 1 * s} {cx - 3 * s} {cy - 1 * s} L {cx - 3 * s} {cy - 5 * s} Q {cx + 2 * s} {cy - 5 * s} {cx + 1 * s} {cy - 8 * s} Q {cx - 1 * s} {cy - 10 * s} {cx - 5 * s} {cy - 5 * s} Z'


def e_gold():
    """Medalla de oro."""
    return medal(GOLD, label=digit_path(1, 50, 66, 1.2))


def e_silver():
    """Medalla de plata."""
    return medal(SILVER, label=digit_path(2, 50, 66, 1.1))


def e_bronze():
    """Medalla de bronce."""
    return medal(BRONZE, label=digit_path(3, 50, 66, 1.1))


def e_money():
    """El costal de la plata, con su signo de pesos."""
    layers = [(OUTLINE, ['M 34 26 Q 26 14 36 10 L 64 10 Q 74 14 66 26 Q 92 40 90 70 Q 88 94 50 94 Q 12 94 10 70 Q 8 40 34 26 Z']), ('#fbc02d', ['M 36.6 26.6 Q 30 15.6 37 12.6 L 63 12.6 Q 70 15.6 63.4 26.6 Q 87.6 40.6 87.4 70 Q 85.4 91.4 50 91.4 Q 14.6 91.4 12.6 70 Q 12.4 40.6 36.6 26.6 Z'])]
    layers += [(OUTLINE, [rect(32, 24, 36, 6)]), ('#8d5a32', [rect(33.4, 25.4, 33.2, 3.2)]), ('#fff59d', [ellipse(30, 56, 6, 12, 20)])]
    layers.append(('#2e7d32', ['M 58 46 Q 52 40 46 42 Q 38 46 44 54 L 56 60 Q 62 66 54 70 Q 46 72 40 66 L 36 70 Q 44 78 54 76 Q 68 72 64 60 Q 62 54 52 50 Q 44 46 48 44 Q 54 44 56 50 Z', rect(48, 32, 4, 50)]))
    return layers


def e_check():
    """Hecho: el chulo verde en su cuadro."""
    return [(OUTLINE, [rect(6, 6, 88, 88)]), ('#43a047', [rect(8.6, 8.6, 82.8, 82.8)]), ('#ffffff', [poly(22, 50, 30, 42, 44, 56, 72, 26, 80, 34, 44, 72)])]


def e_flag_finish():
    """Bandera de cuadros (al máximo)."""
    layers = bar(18, 96, 18, 6, 3, '#e53935') + [(OUTLINE, [poly(20, 8, 88, 12, 86, 52, 20, 48)]), ('#fafafa', [poly(22, 10, 86, 14, 84.4, 50, 22, 46)])]
    layers.append(('#1b1b1b', [rect(22 + 16 * i + (8 if j % 2 else 0), 10 + 9 * j + 0.5 * i, 8, 9) for i in range(4) for j in range(4) if 22 + 16 * i + (8 if j % 2 else 0) < 84]))
    return layers


def e_flag_red():
    """Bandera roja (zona completada)."""
    return bar(18, 96, 18, 6, 3, '#5d4037') + [(OUTLINE, ['M 20 8 Q 54 0 88 14 L 86 50 Q 54 38 20 46 Z']), ('#e53935', ['M 22 10 Q 54 3 86 15.6 L 84.4 47.6 Q 54 36 22 43.6 Z']), ('#ef9a9a', ['M 26 14 Q 50 9 70 14 L 70 18 Q 50 13 26 18 Z'])]


def e_lock():
    """Candado: cerrado, por abrir."""
    return [(OUTLINE, [curve(30, 48, 50, 0, 70, 48, 8)]), ('#90a4ae', [curve(30, 48, 50, 2, 70, 48, 4)])] + shape([(18, 44), (82, 44), (82, 92), (18, 92)], GOLD, 2.4) + [(OUTLINE, [circle(50, 62, 6), rect(47, 64, 6, 14)]), ('#fff59d', [rect(22, 48, 4, 40)])]


def e_pause():
    """Pausa: dos barras en el cuadro azul."""
    return [(OUTLINE, [rect(6, 6, 88, 88)]), ('#1e88e5', [rect(8.6, 8.6, 82.8, 82.8)]), ('#ffffff', [rect(30, 26, 14, 48), rect(56, 26, 14, 48)])]


def e_stop_sq():
    """Detener: el cuadro en el botón azul."""
    return [(OUTLINE, [rect(6, 6, 88, 88)]), ('#1e88e5', [rect(8.6, 8.6, 82.8, 82.8)]), ('#ffffff', [rect(28, 28, 44, 44)])]


def e_fast():
    """Rápido: dos flechas adelante."""
    return [(OUTLINE, [rect(6, 6, 88, 88)]), ('#1e88e5', [rect(8.6, 8.6, 82.8, 82.8)]), ('#ffffff', [poly(22, 26, 50, 50, 22, 74), poly(50, 26, 78, 50, 50, 74)])]


def e_no():
    """Prohibido: el círculo rojo con la raya blanca."""
    return oval(50, 50, 44, 44, '#e53935') + [('#ffffff', [rect(18, 42, 64, 16)])]


def e_red_dot():
    """El punto rojo (lo que frena)."""
    return oval(50, 50, 38, 38, '#e53935') + [('#ef9a9a', [ellipse(38, 36, 10, 6, -30)])]


def e_map():
    """El mapa doblado, con el camino punteado y la equis."""
    layers = [(OUTLINE, [poly(4, 22, 34, 12, 66, 22, 96, 12, 96, 82, 66, 92, 34, 82, 4, 92)]), ('#c5e1a5', [poly(6.6, 24, 34, 14.6, 34, 79.6, 6.6, 89)]), ('#e6ee9c', [poly(34, 14.6, 66, 24.6, 66, 89.4, 34, 79.6)]), ('#a5d6a7', [poly(66, 24.6, 93.4, 15.6, 93.4, 80, 66, 89.4)])]
    layers.append(('#4fa3d9', ['M 6.6 60 Q 30 50 40 64 Q 52 80 66 70 L 66 74 Q 52 86 38 68 Q 28 56 6.6 64 Z']))
    layers.append(('#e53935', [rect(16 + 8 * i, 40 - 2 * i, 4, 3) for i in range(6)] + [poly(70, 30, 74, 34, 82, 26, 86, 30, 78, 38, 86, 46, 82, 50, 74, 42, 70, 46, 66, 42, 74, 38, 66, 30)]))
    return layers


def e_micro():
    """Microscopio (las investigaciones)."""
    layers = [(OUTLINE, [rect(16, 86, 60, 8), rect(54, 40, 8, 48)]), ('#546e7a', [rect(17.4, 87.4, 57.2, 5.2), rect(55.4, 41.4, 5.2, 45.2)])]
    layers += [(OUTLINE, [rect(30, 10, 14, 50, -25)]), ('#78909c', [rect(31.6, 11.6, 10.8, 46.8, -25)]), (OUTLINE, [rect(34, 56, 26, 6)]), ('#90a4ae', [rect(35.4, 57.4, 23.2, 3.2)])]
    layers += [(OUTLINE, [curve(60, 60, 76, 72, 60, 86, 4)]), ('#546e7a', [curve(60, 60, 74, 72, 60, 86, 2)]), ('#4fa3d9', [circle(42, 68, 3)])]
    return layers


def e_bolt():
    """Rayo (electricidad, banda eléctrica)."""
    return shape([(58, 4), (20, 56), (46, 56), (36, 96), (82, 40), (54, 40)], '#fdd835', 2.6) + [('#fff59d', [poly(52, 14, 30, 50, 44, 50)])]


def e_crown():
    """Corona dorada."""
    return shape([(10, 82), (8, 28), (30, 52), (50, 18), (70, 52), (92, 28), (90, 82)], GOLD, 2.6) + [(GOLD_D, [rect(12, 72, 76, 6)]), ('#e53935', [circle(50, 58, 5)]), ('#1e88e5', [circle(28, 62, 4), circle(72, 62, 4)]), ('#fff59d', [circle(8, 28, 4), circle(50, 18, 4), circle(92, 28, 4)])]


def e_trophy():
    """Trofeo (logros)."""
    layers = [(OUTLINE, [curve(24, 22, 4, 30, 26, 52, 5), curve(76, 22, 96, 30, 74, 52, 5)]), (GOLD, [curve(24, 22, 7, 30, 26, 51, 2.4), curve(76, 22, 93, 30, 74, 51, 2.4)])]
    layers += [(OUTLINE, ['M 20 10 L 80 10 Q 80 56 50 62 Q 20 56 20 10 Z', rect(44, 60, 12, 16), rect(28, 76, 44, 16)]), (GOLD, ['M 22.6 12.6 L 77.4 12.6 Q 77.4 54 50 59.4 Q 22.6 54 22.6 12.6 Z', rect(45.4, 61.4, 9.2, 14.6)]), ('#8d5a32', [rect(29.4, 77.4, 41.2, 13.2)]), ('#fff59d', [rect(30, 16, 6, 30)]), (GOLD, [rect(38, 82, 24, 4)])]
    return layers


def e_cycle():
    """Repetir: dos flechas en círculo."""
    layers = [(OUTLINE, [rect(6, 6, 88, 88)]), ('#1e88e5', [rect(8.6, 8.6, 82.8, 82.8)])]
    layers.append(('#ffffff', ['M 24 50 Q 24 26 50 26 L 62 26 L 62 16 L 80 32 L 62 48 L 62 38 L 50 38 Q 36 38 36 50 Z', 'M 76 50 Q 76 74 50 74 L 38 74 L 38 84 L 20 68 L 38 52 L 38 62 L 50 62 Q 64 62 64 50 Z']))
    return layers


def e_crane():
    """La grúa de construcción (construir)."""
    layers = [(OUTLINE, [rect(26, 14, 8, 82), rect(8, 14, 84, 8), rect(18, 88, 26, 8)]), (GOLD, [rect(27.4, 15.4, 5.2, 72.6), rect(9.4, 15.4, 81.2, 5.2)]), ('#5d4037', [rect(19.4, 89.4, 23.2, 5.2)])]
    layers.append((GOLD_D, [rib(27.6, 22 + 8 * k, 32.4, 30 + 8 * k, 1.2) for k in range(8)] + [rib(40 + 8 * k, 15.6, 48 + 8 * k, 20.4, 1.2) for k in range(6)]))
    layers += [(OUTLINE, [rect(70, 22, 1.6, 30)])] + shape([(60, 52), (82, 52), (82, 70), (60, 70)], '#e53935', 1.6)
    return layers


def e_box():
    """La caja de cartón (bodega)."""
    return [(OUTLINE, [poly(6, 30, 50, 14, 94, 30, 94, 76, 50, 94, 6, 76)]), ('#d9a56b', [poly(9, 31.6, 50, 17, 91, 31.6, 50, 47)]), ('#c08850', [poly(9, 34, 48.6, 49, 48.6, 90, 9, 74.4)]), ('#a8743f', [poly(51.4, 49, 91, 34, 91, 74.4, 51.4, 90)]), ('#f5deb3', [poly(22, 26, 64, 12, 72, 16, 30, 31)]), (OUTLINE, [rib(50, 47, 50, 92, 1.6)])]


def e_door():
    """La puerta (salir)."""
    return [(OUTLINE, [rect(16, 6, 68, 90)]), ('#8d5a32', [rect(18.6, 8.6, 62.8, 84.8)]), ('#a1693f', [rect(26, 16, 48, 30), rect(26, 54, 48, 32)]), ('#fdd835', [circle(70, 54, 4)])]


def e_warning():
    """Cuidado: el triángulo amarillo con el signo."""
    return shape([(50, 8), (96, 88), (4, 88)], '#fdd835', 3) + [('#1b1b1b', [rect(45, 34, 10, 30), circle(50, 74, 5.4)])]


def e_refresh():
    """Volver a empezar: la flecha que da la vuelta."""
    layers = [(OUTLINE, [rect(6, 6, 88, 88)]), ('#1e88e5', [rect(8.6, 8.6, 82.8, 82.8)])]
    pts_c = [(50 + 26 * math.cos(math.radians(a)), 52 + 26 * math.sin(math.radians(a))) for a in range(-60, 241, 10)]
    inner = [(50 + 16 * math.cos(math.radians(a)), 52 + 16 * math.sin(math.radians(a))) for a in range(240, -61, -10)]
    layers.append(('#ffffff', [pts(pts_c + inner), poly(58, 14, 82, 26, 60, 40)]))
    return layers


def e_bulb():
    """Bombillo (la mejora recomendada, la idea)."""
    return oval(50, 40, 30, 32, '#fff176') + [('#fffde7', [ellipse(40, 30, 8, 10, -20)]), (OUTLINE, [rect(36, 68, 28, 22)]), ('#90a4ae', [rect(37.4, 69.4, 25.2, 19.2)]), ('#607d8b', [rect(37.4, 74, 25.2, 2), rect(37.4, 80, 25.2, 2)]), ('#f9a825', [curve(42, 66, 46, 50, 50, 56, 1.6), curve(50, 56, 54, 50, 58, 66, 1.6)])]


def e_alarm():
    """Despertador (las horas)."""
    layers = [(OUTLINE, [circle(24, 18, 12), circle(76, 18, 12)]), ('#e53935', [circle(24, 18, 10), circle(76, 18, 10)])]
    layers += bar(26, 80, 18, 94, 3, '#e53935') + bar(74, 80, 82, 94, 3, '#e53935')
    layers += oval(50, 54, 38, 38, '#e53935') + [('#fafafa', [circle(50, 54, 30)]), ('#1b1b1b', [rect(48, 32, 4, 24), rect(48, 52, 18, 4, 30)]), ('#e53935', [circle(50, 54, 3)])]
    return layers


def clock_face(hour_a=-60, minute_a=-90, color='#fafafa', ring='#90a4ae'):
    layers = oval(50, 50, 44, 44, ring) + [(color, [circle(50, 50, 36)])]
    layers.append(('#5d4037', [rect(48.4, 16, 3.2, 6), rect(48.4, 78, 3.2, 6), rect(16, 48.4, 6, 3.2), rect(78, 48.4, 6, 3.2)]))
    layers.append(('#1b1b1b', [rib(50, 50, 50 + 20 * math.cos(math.radians(hour_a)), 50 + 20 * math.sin(math.radians(hour_a)), 4), rib(50, 50, 50 + 30 * math.cos(math.radians(minute_a)), 50 + 30 * math.sin(math.radians(minute_a)), 2.6), circle(50, 50, 3.4)]))
    return layers


def e_clock():
    """Reloj (una hora en punto)."""
    return clock_face(-60, -90)


def e_stopwatch():
    """Cronómetro (el reloj del evento)."""
    layers = [(OUTLINE, [rect(42, 2, 16, 10), rect(46, 10, 8, 10)]), ('#90a4ae', [rect(43.4, 3.4, 13.2, 7.2)])]
    layers += oval(50, 58, 38, 38, '#78909c') + [('#fafafa', [circle(50, 58, 30)]), ('#e53935', [rib(50, 58, 66, 38, 3), circle(50, 58, 3.4)]), ('#5d4037', [rect(48.4, 30, 3.2, 6), rect(48.4, 80, 3.2, 6)])]
    return layers


def e_hourglass():
    """Reloj de arena (en espera)."""
    layers = [(OUTLINE, [rect(18, 4, 64, 10), rect(18, 86, 64, 10)]), ('#8d5a32', [rect(19.4, 5.4, 61.2, 7.2), rect(19.4, 87.4, 61.2, 7.2)])]
    layers += [(OUTLINE, ['M 26 14 L 74 14 Q 74 40 54 50 Q 74 60 74 86 L 26 86 Q 26 60 46 50 Q 26 40 26 14 Z']), ('#e3f2fd', ['M 28.6 16 L 71.4 16 Q 71 39 52 50 Q 71 61 71.4 84 L 28.6 84 Q 29 61 48 50 Q 29 39 28.6 16 Z'])]
    layers.append(('#fbc02d', ['M 34 28 L 66 28 Q 62 40 50 46 Q 38 40 34 28 Z', 'M 32 84 Q 40 66 50 64 Q 60 66 68 84 Z', rect(49, 46, 2, 18)]))
    return layers


def e_fire():
    """Fuego (algo que se calienta, una racha)."""
    return [(OUTLINE, ['M 50 4 Q 62 26 74 36 Q 92 54 84 76 Q 74 98 50 96 Q 24 96 16 76 Q 8 56 26 40 Q 28 54 38 56 Q 34 30 50 4 Z']), ('#ff7043', ['M 50 9 Q 61 29 72 38 Q 89 55 81.6 75 Q 72.6 95 50 93.4 Q 26 93.4 18.4 75 Q 11.6 57 25 44 Q 28.6 57 40 59 Q 36 32 50 9 Z']), ('#ffca28', ['M 50 48 Q 60 60 66 70 Q 70 86 50 88 Q 30 86 34 70 Q 38 62 44 66 Q 44 56 50 48 Z'])]


def e_target():
    """La diana (los objetivos y los retos)."""
    layers = oval(46, 54, 40, 40, '#fafafa') + [('#e53935', [circle(46, 54, 34)]), ('#fafafa', [circle(46, 54, 24)]), ('#e53935', [circle(46, 54, 14)]), ('#fafafa', [circle(46, 54, 5)])]
    layers += bar(46, 54, 84, 16, 3, '#5d4037') + [('#1e88e5', [poly(80, 10, 94, 6, 90, 20), poly(84, 16, 96, 16, 88, 24)])]
    return layers


def e_gear():
    """Engranaje (el menú)."""
    teeth = []
    for i in range(8):
        a = math.radians(i * 45)
        teeth.append(rect(50 - 7, 4, 14, 20))
    layers = [(OUTLINE, [rect(43 + 0 * i, 4, 14, 20, i * 45, 50, 50) for i in range(8)] + [circle(50, 50, 34)])]
    layers += [('#78909c', [rect(44.6, 5.6, 10.8, 18, i * 45, 50, 50) for i in range(8)] + [circle(50, 50, 31.6)]), ('#fafafa', [circle(50, 50, 13)]), (OUTLINE, [circle(50, 50, 10)]), ('#fff8ec', [circle(50, 50, 8)])]
    return layers


def e_clipboard():
    """Tablilla con la lista (los objetivos)."""
    layers = [(OUTLINE, [rect(14, 10, 72, 86)]), ('#8d5a32', [rect(16.6, 12.6, 66.8, 80.8)]), (OUTLINE, [rect(22, 20, 56, 70)]), ('#fafafa', [rect(23.6, 21.6, 52.8, 66.8)])]
    layers += [(OUTLINE, [rect(34, 4, 32, 14)]), ('#b0bec5', [rect(35.6, 5.6, 28.8, 10.8)])]
    for k in range(4):
        layers += [('#43a047' if k < 2 else '#b0bec5', [rect(28, 30 + 14 * k, 8, 8)]), ('#78909c', [rect(40, 32 + 14 * k, 30, 4)])]
    return layers


def e_book():
    """El libro abierto (el álbum)."""
    return [(OUTLINE, ['M 4 20 Q 28 12 50 24 Q 72 12 96 20 L 96 86 Q 72 78 50 90 Q 28 78 4 86 Z']), ('#fafafa', ['M 7 22.4 Q 28 15.4 48.6 26 L 48.6 86.4 Q 28 76 7 82.6 Z', 'M 51.4 26 Q 72 15.4 93 22.4 L 93 82.6 Q 72 76 51.4 86.4 Z']), ('#1e88e5', [rect(14, 34, 26, 16), rect(60, 32, 24, 18)]), ('#90a4ae', [rect(14, 56, 26, 3), rect(14, 64, 20, 3), rect(60, 56, 24, 3), rect(60, 64, 18, 3)]), ('#e53935', [rect(48.4, 24, 3.2, 70)])]


def e_link():
    """Dos eslabones (la cadena)."""
    layers = []
    for cx, cy, rot in [(34, 60, -40), (66, 40, -40)]:
        layers += [(OUTLINE, [ellipse(cx, cy, 26, 14, rot)]), ('#90a4ae', [ellipse(cx, cy, 23, 11, rot)]), ('#fff8ec', [ellipse(cx, cy, 14, 4.4, rot)])]
    layers.append(('#cfd8dc', [ellipse(58, 34, 8, 2, -40), ellipse(26, 54, 8, 2, -40)]))
    return layers


def e_calendar():
    """El calendario (las temporadas)."""
    layers = [(OUTLINE, [rect(8, 14, 84, 80)]), ('#fafafa', [rect(10.6, 16.6, 78.8, 74.8)]), ('#e53935', [rect(10.6, 16.6, 78.8, 18)])]
    layers += [(OUTLINE, [rect(24, 6, 8, 18), rect(68, 6, 8, 18)]), ('#90a4ae', [rect(25.4, 7.4, 5.2, 15.2), rect(69.4, 7.4, 5.2, 15.2)])]
    layers.append(('#90a4ae', [rect(16 + 15 * i, 42 + 12 * j, 10, 8) for i in range(5) for j in range(4)]))
    layers.append(('#1e88e5', [rect(46, 54, 10, 8)]))
    return layers


def e_pin():
    """El alfiler rojo del mapa (aquí estás)."""
    return [(OUTLINE, ['M 50 96 Q 18 58 18 36 Q 18 6 50 6 Q 82 6 82 36 Q 82 58 50 96 Z']), ('#e53935', ['M 50 91 Q 21 57 21 36 Q 21 9 50 9 Q 79 9 79 36 Q 79 57 50 91 Z']), ('#fafafa', [circle(50, 36, 12)]), ('#ef9a9a', [ellipse(34, 26, 4, 8, 20)])]


def e_tools():
    """Martillo y llave (arreglar, construir)."""
    layers = bar(20, 84, 74, 24, 6, '#8d5a32') + [(OUTLINE, [rect(58, 10, 30, 16, 45)]), ('#78909c', [rect(60, 12, 26, 12, 45)])]
    layers += bar(80, 84, 30, 30, 6, '#90a4ae') + [(OUTLINE, [circle(26, 26, 13)]), ('#90a4ae', [circle(26, 26, 10.4)]), ('#fff8ec', [rect(16, 16, 10, 10, 45)])]
    return layers


def e_parking():
    """La P de parqueo (un lugar para dejar)."""
    return [(OUTLINE, [rect(6, 6, 88, 88)]), ('#1e88e5', [rect(8.6, 8.6, 82.8, 82.8)]), ('#ffffff', ['M 30 20 L 56 20 Q 76 20 76 40 Q 76 60 56 60 L 44 60 L 44 82 L 30 82 Z']), ('#1e88e5', ['M 44 32 L 54 32 Q 62 32 62 40 Q 62 48 54 48 L 44 48 Z'])]


def e_info():
    """Información: la i en el cuadro azul."""
    return [(OUTLINE, [rect(6, 6, 88, 88)]), ('#1e88e5', [rect(8.6, 8.6, 82.8, 82.8)]), ('#ffffff', [circle(50, 26, 8), rect(42, 40, 16, 40), rect(36, 40, 10, 8), rect(36, 74, 28, 8)])]


def e_globe():
    """El globo terráqueo con meridianos (el idioma)."""
    layers = oval(50, 50, 44, 44, '#4fa3d9') + [('#81c784', ['M 20 30 Q 34 20 46 26 Q 50 40 38 48 Q 30 60 22 52 Q 14 42 20 30 Z', 'M 58 56 Q 74 50 82 62 Q 78 82 62 86 Q 56 72 58 56 Z', 'M 60 16 Q 74 18 80 30 Q 70 32 62 26 Z'])]
    layers.append(('#e3f2fd', [ellipse(50, 50, 18, 42.6), ellipse(50, 50, 2, 42.6), rect(7.4, 49, 85.2, 2), rect(12, 28, 76, 1.6), rect(12, 71, 76, 1.6)]))
    layers.append(('#4fa3d9', [ellipse(50, 50, 16, 41)]))
    return layers


def e_signal():
    """Barras de señal (internet)."""
    return [(OUTLINE, [rect(6, 6, 88, 88)]), ('#1e88e5', [rect(8.6, 8.6, 82.8, 82.8)]), ('#ffffff', [rect(18 + 17 * i, 70 - 14 * i, 11, 12 + 14 * i) for i in range(4)])]


def e_money_wings():
    """El billete que se va volando (un gasto)."""
    layers = [(OUTLINE, ['M 28 40 Q 10 20 4 30 Q 14 40 30 52 Z', 'M 72 40 Q 90 20 96 30 Q 86 40 70 52 Z']), ('#fafafa', ['M 27 42 Q 12 24 7.6 30.6 Q 16 39 29 49 Z', 'M 73 42 Q 88 24 92.4 30.6 Q 84 39 71 49 Z'])]
    layers += [(OUTLINE, [rect(18, 36, 64, 40, -6)]), ('#66bb6a', [rect(20.6, 38.6, 58.8, 34.8, -6)]), ('#a5d6a7', [circle(50, 56, 10)]), ('#2e7d32', [rect(48, 46, 4, 20, -6), rect(26, 42, 8, 4, -6), rect(66, 66, 8, 4, -6)])]
    return layers


def e_trash():
    """La caneca de la basura (borrar)."""
    layers = [(OUTLINE, [rect(14, 18, 72, 10), rect(40, 8, 20, 12)]), ('#90a4ae', [rect(15.4, 19.4, 69.2, 7.2)])]
    layers += [(OUTLINE, ['M 20 28 L 80 28 L 74 94 L 26 94 Z']), ('#b0bec5', ['M 22.6 30.6 L 77.4 30.6 L 71.6 91.4 L 28.4 91.4 Z']), ('#78909c', [rect(36, 36, 4, 50), rect(48, 36, 4, 50), rect(60, 36, 4, 50)])]
    return layers


def e_question():
    """La pregunta: el signo rojo."""
    return [(OUTLINE, ['M 26 32 Q 26 8 50 8 Q 76 8 76 32 Q 76 46 58 54 L 58 66 L 42 66 L 42 48 Q 60 42 60 32 Q 60 22 50 22 Q 40 22 40 34 Z', circle(50, 82, 10)]), ('#e53935', ['M 28.6 32 Q 28.6 10.6 50 10.6 Q 73.4 10.6 73.4 32 Q 73.4 44.6 55.4 52.4 L 55.4 63.4 L 44.6 63.4 L 44.6 49.6 Q 62.6 43.4 62.6 32 Q 62.6 19.4 50 19.4 Q 37.4 19.4 37.4 31.4 Z', circle(50, 82, 7.4)])]


def e_phone():
    """El celular."""
    return [(OUTLINE, [rect(24, 4, 52, 92)]), ('#37474f', [rect(26.6, 6.6, 46.8, 86.8)]), ('#81d4fa', [rect(30, 14, 40, 66)]), ('#fafafa', [circle(50, 87, 3)]), ('#4fc3f7', [rect(34, 20, 14, 10), rect(52, 20, 14, 10), rect(34, 34, 14, 10)])]


def e_person():
    """La silueta de una persona (el perfil)."""
    return oval(50, 30, 18, 20, '#90a4ae') + [(OUTLINE, ['M 10 96 Q 12 56 50 54 Q 88 56 90 96 Z']), ('#90a4ae', ['M 13 93.4 Q 15 59 50 57 Q 85 59 87 93.4 Z'])]


def e_mail():
    """El sobre (escribir, el correo)."""
    return [(OUTLINE, [rect(6, 20, 88, 62)]), ('#fafafa', [rect(8.6, 22.6, 82.8, 56.8)]), (OUTLINE, [poly(8, 24, 50, 56, 92, 24, 92, 30, 50, 62, 8, 30)]), ('#e0e0e0', [poly(10, 26, 50, 56, 90, 26, 50, 52)])]


def e_headphones():
    """Los audífonos (la música para descargar)."""
    layers = [(OUTLINE, [curve(16, 60, 50, -10, 84, 60, 8)]), ('#37474f', [curve(16, 60, 50, -7, 84, 60, 4)])]
    for x in (18, 82):
        layers += oval(x, 66, 12, 18, '#e53935') + [('#b71c1c', [ellipse(x, 66, 6, 10)])]
    return layers


def e_abc():
    """Las letras (el idioma de los textos)."""
    return [(OUTLINE, [rect(6, 6, 88, 88)]), ('#1e88e5', [rect(8.6, 8.6, 82.8, 82.8)]), ('#ffffff', ['M 14 74 L 26 26 L 36 26 L 48 74 L 38 74 L 35 62 L 27 62 L 24 74 Z', 'M 54 26 L 70 26 Q 84 26 84 38 Q 84 46 78 49 Q 86 52 86 62 Q 86 74 70 74 L 54 74 Z']), ('#1e88e5', [poly(29, 52, 31, 40, 33, 52), rect(63, 34, 10, 10), rect(63, 54, 12, 12)])]


def e_scroll():
    """El pergamino (la historia, los créditos)."""
    return [(OUTLINE, [rect(18, 14, 64, 72)]), ('#f3e2b3', [rect(20.6, 16.6, 58.8, 66.8)]), ('#a1887f', [rect(28, 28, 44, 3), rect(28, 38, 44, 3), rect(28, 48, 36, 3), rect(28, 58, 40, 3)])] + oval(50, 14, 38, 7, '#e8cf8f') + oval(50, 86, 38, 7, '#e8cf8f')


def e_gamepad():
    """El control de juego."""
    layers = [(OUTLINE, ['M 20 30 L 80 30 Q 96 30 96 56 Q 96 82 82 82 Q 72 82 66 66 L 34 66 Q 28 82 18 82 Q 4 82 4 56 Q 4 30 20 30 Z']), ('#546e7a', ['M 20 32.6 L 80 32.6 Q 93.4 32.6 93.4 56 Q 93.4 79.4 82 79.4 Q 74 79.4 68 63.4 L 32 63.4 Q 26 79.4 18 79.4 Q 6.6 79.4 6.6 56 Q 6.6 32.6 20 32.6 Z'])]
    layers += [('#eceff1', [rect(22, 40, 6, 20), rect(15, 47, 20, 6)]), ('#e53935', [circle(72, 44, 5)]), ('#43a047', [circle(82, 54, 5)]), ('#fdd835', [circle(62, 54, 5)]), ('#1e88e5', [circle(72, 62, 4)])]
    return layers


def e_eyes():
    """Los ojos (mirar)."""
    layers = []
    for x in (30, 70):
        layers += oval(x, 50, 18, 26, '#fafafa') + [('#3e2723', [ellipse(x + 4, 56, 8, 11)]), ('#fafafa', [circle(x + 6, 52, 2.6)])]
    return layers


def e_paws():
    """Las huellas de patitas (las mascotas)."""
    layers = []
    for cx, cy in [(32, 64), (68, 36)]:
        layers += [('#795548', [ellipse(cx, cy + 6, 11, 9)] + [ellipse(cx + dx, cy + dy, 4.4, 5.4) for dx, dy in [(-12, -6), (-5, -13), (5, -13), (12, -6)]])]
    return layers


def e_cart():
    """El carrito de mercado (comprar)."""
    layers = [(OUTLINE, ['M 4 14 L 18 14 L 26 62 L 82 62 L 92 26 L 22 26 L 20 20 L 4 20 Z']), ('#90a4ae', ['M 23 28.6 L 88.6 28.6 L 80 59.4 L 28 59.4 Z'])]
    layers.append(('#cfd8dc', [rect(32 + 12 * i, 30, 2, 28) for i in range(5)] + [rect(26, 40, 58, 2), rect(28, 50, 54, 2)]))
    layers += [(OUTLINE, [rect(24, 62, 58, 6)])] + oval(32, 82, 8, 8, '#37474f', d=1.8) + oval(74, 82, 8, 8, '#37474f', d=1.8)
    return layers


def e_bags():
    """Las bolsas de compras (la tienda)."""
    layers = []
    for x, y, c in [(10, 36, '#e53935'), (42, 28, '#1e88e5')]:
        layers += [(OUTLINE, [curve(x + 12, y + 2, x + 22, y - 18, x + 32, y + 2, 4)])] + shape([(x, y), (x + 44, y), (x + 48, y + 62), (x - 4, y + 62)], c, 2.4)
    layers.append(('#fafafa', [rect(54, 50, 20, 4), rect(54, 58, 14, 4)]))
    return layers


def e_backpack():
    """El morral."""
    layers = [(OUTLINE, [curve(34, 22, 50, 0, 66, 22, 4)])] + shape([(20, 26), (80, 26), (84, 94), (16, 94)], '#e53935', 2.4)
    layers += shape([(30, 58), (70, 58), (72, 86), (28, 86)], '#c62828', 1.8) + [('#fdd835', [rect(46, 60, 8, 4)])]
    return layers


def e_megaphone():
    """Sonido: el parlante con sus ondas."""
    layers = shape([(10, 36), (30, 36), (56, 14), (56, 86), (30, 64), (10, 64)], '#546e7a', 2.4)
    layers.append(('#1e88e5', [curve(66, 34, 74, 50, 66, 66, 4), curve(78, 24, 92, 50, 78, 76, 4)]))
    return layers


def e_mute():
    """Sin sonido: el parlante tachado."""
    return shape([(10, 36), (30, 36), (56, 14), (56, 86), (30, 64), (10, 64)], '#546e7a', 2.4) + [('#e53935', [rib(64, 34, 94, 66, 6), rib(94, 34, 64, 66, 6)])]


def e_bell_off():
    """La campana tachada (sin avisos)."""
    layers = [(OUTLINE, ['M 50 8 Q 78 10 78 46 L 78 66 L 88 78 L 12 78 L 22 66 L 22 46 Q 22 10 50 8 Z', circle(50, 86, 8)]), (GOLD, ['M 50 10.6 Q 75.4 12.6 75.4 46 L 75.4 67 L 82.6 75.4 L 17.4 75.4 L 24.6 67 L 24.6 46 Q 24.6 12.6 50 10.6 Z', circle(50, 86, 5.4)])]
    return layers + [('#e53935', [rib(12, 12, 88, 88, 7)])]


def e_magnifier():
    """La lupa (buscar)."""
    return bar(60, 60, 90, 90, 10, '#8d5a32') + oval(40, 40, 30, 30, '#90a4ae') + [('#e3f2fd', [circle(40, 40, 22)]), ('#ffffff', [ellipse(32, 30, 8, 5, -40)])]


def e_wrench():
    """La llave de tuercas (mejorar)."""
    return [(OUTLINE, ['M 26 8 Q 6 12 8 32 L 20 24 L 30 32 L 28 46 L 14 50 Q 26 62 40 52 L 80 94 L 94 80 L 52 40 Q 60 22 46 10 L 38 22 L 26 18 Z']), ('#90a4ae', ['M 25 11.6 Q 10 16 11.4 28.6 L 20.6 21.4 L 33 31 L 30.6 48.6 L 19 51.6 Q 28 58 40.6 48.6 L 80 90.4 L 90.4 80 L 48.6 40.6 Q 55 24.6 46 14 L 39.4 25.4 L 25 21 Z'])]


def e_speech():
    """El globo de diálogo."""
    return [(OUTLINE, ['M 14 12 L 86 12 Q 96 12 96 22 L 96 62 Q 96 72 86 72 L 44 72 L 22 92 L 26 72 L 14 72 Q 4 72 4 62 L 4 22 Q 4 12 14 12 Z']), ('#fafafa', ['M 14 14.6 L 86 14.6 Q 93.4 14.6 93.4 22 L 93.4 62 Q 93.4 69.4 86 69.4 L 43 69.4 L 26.4 84 L 29.4 69.4 L 14 69.4 Q 6.6 69.4 6.6 62 L 6.6 22 Q 6.6 14.6 14 14.6 Z']), ('#90a4ae', [circle(30, 42, 6), circle(50, 42, 6), circle(70, 42, 6)])]


def e_newspaper():
    """El periódico (las novedades)."""
    return [(OUTLINE, [rect(8, 14, 84, 74)]), ('#fafafa', [rect(10.6, 16.6, 78.8, 68.8)]), ('#37474f', [rect(16, 22, 68, 10)]), ('#90a4ae', [rect(16, 38, 30, 26)] + [rect(52, 38 + 7 * k, 32, 3) for k in range(4)] + [rect(16, 70 + 7 * k, 68, 3) for k in range(2)])]


def e_sparkles():
    """Destellos (algo nuevo)."""
    return shape(star_pts(40, 56, 34, 10, 4, -90), GOLD, 2) + shape(star_pts(78, 22, 16, 5, 4, -90), '#fff176', 1.6) + shape(star_pts(80, 80, 10, 3, 4, -90), '#fff176', 1.4)


def e_gift():
    """El regalo con su moño."""
    layers = shape([(10, 40), (90, 40), (90, 94), (10, 94)], '#e53935', 2.4) + shape([(6, 28), (94, 28), (94, 42), (6, 42)], '#ef5350', 2.4)
    layers.append((GOLD, [rect(44, 28, 12, 66)]))
    layers += [(OUTLINE, [ellipse(36, 20, 14, 9, 20), ellipse(64, 20, 14, 9, -20)]), (GOLD, [ellipse(36, 20, 11, 6, 20), ellipse(64, 20, 11, 6, -20)])]
    return layers


def e_bow():
    """El moño (la decoración)."""
    return [(OUTLINE, [poly(50, 50, 6, 20, 6, 80), poly(50, 50, 94, 20, 94, 80), poly(46, 54, 30, 96, 42, 92, 50, 60), poly(54, 54, 70, 96, 58, 92, 50, 60)]), ('#ec407a', [poly(48, 50, 9, 24.6, 9, 75.4), poly(52, 50, 91, 24.6, 91, 75.4), poly(46.4, 57, 33.4, 92.6, 41, 90, 49, 62), poly(53.6, 57, 66.6, 92.6, 59, 90, 51, 62)])] + oval(50, 50, 10, 10, '#d81b60')


def e_ribbon():
    """El lazo conmemorativo."""
    return [(OUTLINE, ['M 50 30 Q 30 4 22 20 Q 18 34 44 52 L 20 94 L 34 94 L 50 64 L 66 94 L 80 94 L 56 52 Q 82 34 78 20 Q 70 4 50 30 Z']), (GOLD, ['M 50 34 Q 31 8 25 21 Q 22 33 46.6 52 L 24 91.4 L 32.6 91.4 L 50 59.4 L 67.4 91.4 L 76 91.4 L 53.4 52 Q 78 33 75 21 Q 69 8 50 34 Z'])]


def e_military_medal():
    """La condecoración: medalla con estrella y cinta de rayas."""
    layers = [(OUTLINE, [rect(30, 4, 40, 36)]), ('#1e88e5', [rect(31.6, 5.6, 36.8, 32.8)]), ('#fdd835', [rect(38, 5.6, 6, 32.8), rect(56, 5.6, 6, 32.8)]), ('#e53935', [rect(47, 5.6, 6, 32.8)])]
    return layers + shape(star_pts(50, 66, 30, 13), GOLD, 2.4) + [('#fff59d', [circle(50, 66, 7)])]


def e_ticket():
    """La boleta (entrada a un evento)."""
    return [(OUTLINE, ['M 6 26 L 94 26 L 94 40 Q 86 50 94 60 L 94 74 L 6 74 L 6 60 Q 14 50 6 40 Z']), ('#fdd835', ['M 8.6 28.6 L 91.4 28.6 L 91.4 39 Q 83 50 91.4 61 L 91.4 71.4 L 8.6 71.4 L 8.6 61 Q 17 50 8.6 39 Z']), ('#f57f17', [rect(66, 30, 2, 40)] + [rect(20, 40, 36, 4), rect(20, 50, 28, 4), rect(20, 60, 32, 4)])]


def e_compass():
    """La brújula."""
    return oval(50, 50, 44, 44, '#a1693f') + [('#fafafa', [circle(50, 50, 34)]), ('#e53935', [poly(50, 18, 58, 50, 42, 50)]), ('#546e7a', [poly(50, 82, 58, 50, 42, 50)]), (OUTLINE, [circle(50, 50, 4)])]


def e_flask():
    """El frasco de laboratorio."""
    return [(OUTLINE, ['M 38 6 L 62 6 L 62 12 L 58 12 L 58 36 L 86 84 Q 90 94 80 94 L 20 94 Q 10 94 14 84 L 42 36 L 42 12 L 38 12 Z']), ('#e3f2fd', ['M 44.6 14 L 55.4 14 L 55.4 37 L 83 84.6 Q 85 91.4 80 91.4 L 20 91.4 Q 15 91.4 17 84.6 L 44.6 37 Z']), ('#66bb6a', ['M 30 62 L 70 62 L 83 84.6 Q 85 91.4 80 91.4 L 20 91.4 Q 15 91.4 17 84.6 Z']), ('#a5d6a7', [circle(40, 76, 3), circle(56, 70, 2.4), circle(62, 82, 3)])]


def e_thread():
    """El carrete de hilo con la aguja."""
    layers = [(OUTLINE, [rect(22, 14, 56, 10), rect(22, 76, 56, 10)]), ('#a1693f', [rect(23.6, 15.6, 52.8, 6.8), rect(23.6, 77.6, 52.8, 6.8)])]
    layers += [(OUTLINE, [rect(28, 24, 44, 52)]), ('#e53935', [rect(29.6, 25.6, 40.8, 48.8)]), ('#c62828', [rect(29.6, 30 + 8 * k, 40.8, 2) for k in range(6)])]
    return layers


def e_yarn():
    """El ovillo de lana."""
    layers = oval(48, 50, 38, 38, '#8e6bbf')
    layers.append(('#b39ddb', [curve(16, 40, 48, 20, 80, 46, 2), curve(14, 56, 48, 40, 84, 64, 2), curve(24, 76, 50, 60, 78, 80, 2), curve(30, 18, 40, 50, 30, 84, 2)]))
    layers += [(OUTLINE, [curve(76, 72, 90, 84, 96, 94, 2.4)])]
    return layers


def e_scissors():
    """Las tijeras."""
    layers = [(OUTLINE, [circle(26, 76, 14), circle(56, 84, 12)]), ('#e53935', [circle(26, 76, 11)]), ('#e53935', [circle(56, 84, 9)]), ('#fff8ec', [circle(26, 76, 6), circle(56, 84, 4.6)])]
    layers += [(OUTLINE, [poly(34, 66, 90, 8, 94, 12, 44, 72), poly(50, 74, 70, 6, 76, 8, 58, 78)]), ('#b0bec5', [poly(36, 66, 90, 10.4, 92, 12.4, 43, 70.6), poly(51.6, 73.4, 71, 8.6, 74.4, 9.6, 57, 76)])]
    return layers


def e_needle():
    """La aguja con su hilo."""
    return bar(14, 86, 86, 14, 3, '#b0bec5') + [(OUTLINE, [ellipse(82, 18, 5, 2.4, -45)]), ('#fff8ec', [ellipse(82, 18, 3, 1, -45)])] + [(OUTLINE, [curve(82, 18, 60, 60, 20, 50, 1.6)]), ('#e53935', [curve(82, 18, 60, 59, 21, 50, 0.8)])]


def e_pick():
    """La pica (minería, sal)."""
    return bar(30, 94, 60, 30, 5, '#8d5a32') + [(OUTLINE, ['M 20 30 Q 50 6 90 18 Q 60 18 52 34 Z']), ('#90a4ae', ['M 23.6 29 Q 50 9.4 84 18.4 Q 58 19.6 51 31 Z'])]


def e_axe():
    """El hacha."""
    return bar(22, 94, 66, 18, 5, '#8d5a32') + [(OUTLINE, ['M 56 10 Q 86 4 92 30 Q 80 26 70 36 Z']), ('#90a4ae', ['M 59 11.6 Q 84 7 89 27 Q 79 24 70.4 32 Z'])]


def e_ladder():
    """La escalera de mano."""
    return bar(28, 96, 40, 4, 3, '#8d5a32') + bar(72, 96, 84, 4, 3, '#8d5a32') + [(OUTLINE, [rect(30 + 1.4 * k, 84 - 14 * k, 44, 4) for k in range(6)]), ('#a1693f', [rect(31 + 1.4 * k, 85 - 14 * k, 42, 2) for k in range(6)])]


def e_knot():
    """El nudo de lazo."""
    return [(OUTLINE, [curve(6, 70, 40, 20, 60, 50, 6), curve(60, 50, 80, 80, 94, 30, 6), ellipse(50, 50, 14, 10)]), ('#c8a165', [curve(6, 70, 40, 21, 60, 50, 3), curve(60, 50, 80, 79, 94, 30, 3), ellipse(50, 50, 11, 7.4)]), ('#a1793f', [rib(42, 46, 58, 54, 1.4)])]


def e_boomerang():
    """El bumerán."""
    return shape([(10, 20), (30, 12), (52, 60), (88, 72), (84, 92), (40, 82)], '#c8945a', 2.4)


def e_knife():
    """El cuchillo de cocina."""
    return [(OUTLINE, ['M 8 82 L 62 28 Q 88 6 94 10 Q 92 28 66 46 L 30 82 Z']), ('#b0bec5', ['M 12 81 L 63 30 Q 86 10 90.4 12.6 Q 88 27 65 44 L 34 79 Z'])] + bar(6, 94, 26, 74, 8, '#5d4037')


def e_clamp():
    """La prensa (comprimir)."""
    return [(OUTLINE, [rect(14, 10, 72, 12), rect(14, 78, 72, 12), rect(14, 10, 12, 80)]), ('#546e7a', [rect(15.6, 11.6, 68.8, 8.8), rect(15.6, 79.6, 68.8, 8.8), rect(15.6, 11.6, 8.8, 76.8)])] + bar(60, 22, 60, 64, 4, '#90a4ae') + [(OUTLINE, [rect(46, 62, 28, 8)]), ('#e53935', [rect(47.6, 63.6, 24.8, 4.8)])]


def e_trap():
    """La trampa de ratón."""
    return [(OUTLINE, [rect(6, 60, 88, 20)]), ('#c8945a', [rect(7.6, 61.6, 84.8, 16.8)]), (OUTLINE, [curve(18, 60, 50, 26, 82, 60, 3)]), ('#b0bec5', [curve(18, 60, 50, 27.6, 82, 60, 1.4)])] + oval(72, 54, 10, 6, '#fdd835', d=1.6)


def e_sign():
    """El letrero de madera clavado."""
    return bar(50, 96, 50, 50, 5, '#8d5a32') + shape([(10, 14), (90, 14), (90, 56), (10, 56)], '#c8945a', 2.4) + [('#8d5a32', [rect(18, 24, 64, 4), rect(18, 34, 50, 4), rect(18, 44, 56, 4)])]


def e_works():
    """En obra: la barrera de rayas."""
    return bar(20, 96, 20, 30, 4, '#5d4037') + bar(80, 96, 80, 30, 4, '#5d4037') + [(OUTLINE, [rect(6, 34, 88, 22)]), ('#fafafa', [rect(7.6, 35.6, 84.8, 18.8)]), ('#ff7043', [poly(10 + 16 * i, 54.4, 18 + 16 * i, 35.6, 26 + 16 * i, 35.6, 18 + 16 * i, 54.4) for i in range(5)])] + oval(20, 26, 5, 5, '#fdd835', d=1.6) + oval(80, 26, 5, 5, '#fdd835', d=1.6)


def e_traffic():
    """El semáforo."""
    return [(OUTLINE, [rect(30, 4, 40, 84), rect(46, 88, 8, 10)]), ('#37474f', [rect(32.6, 6.6, 34.8, 78.8)]), ('#e53935', [circle(50, 20, 10)]), ('#fdd835', [circle(50, 45, 10)]), ('#43a047', [circle(50, 70, 10)])]


def e_road():
    """La carretera que se pierde en el horizonte."""
    return [(OUTLINE, [rect(2, 2, 96, 96)]), ('#b3e5fc', [rect(3.6, 3.6, 92.8, 40)]), ('#9ccc65', [rect(3.6, 40, 92.8, 56.4)]), ('#607d8b', [poly(20, 96.4, 46, 40, 54, 40, 80, 96.4)]), ('#fafafa', [poly(48.8, 48, 51.2, 48, 51.6, 56, 48.4, 56), poly(48.2, 64, 51.8, 64, 52.6, 76, 47.4, 76), poly(47.2, 84, 52.8, 84, 53.6, 96.4, 46.4, 96.4)])]


def e_hole():
    """El hueco en el piso."""
    return oval(50, 64, 44, 18, '#8d6e63') + [('#1b1b1b', [ellipse(50, 66, 34, 12)]), ('#3e2723', [ellipse(50, 60, 34, 6)])]


def e_handshake():
    """El apretón de manos (un trato)."""
    return [(OUTLINE, ['M 4 40 L 30 28 L 56 40 L 70 30 L 96 42 L 96 62 L 80 62 L 58 82 Q 48 88 40 80 L 18 62 L 4 62 Z']), ('#e0a36c', ['M 6.6 42 L 30 31 L 54 42 L 50 46 Q 40 40 34 48 L 52 66 Q 56 70 60 66 L 80 50 L 93.4 59.4 L 79 59.4 L 57 79.4 Q 48 85 41.6 78.4 L 19.6 59.4 L 6.6 59.4 Z']), ('#c68642', ['M 56 42 L 70 33 L 93.4 44 L 93.4 59 L 80 48 L 60 64 Q 56 66 54 62 L 38 48 Q 44 42 50 46 Z']), ('#1e88e5', [rect(2, 40, 8, 24), rect(90, 40, 8, 24)])]


def e_hands():
    """Las manos abiertas, juntas (ofrecer)."""
    return [(OUTLINE, ['M 8 48 Q 6 30 14 28 L 22 30 L 34 62 L 48 58 L 50 84 L 30 92 Q 12 84 8 48 Z', 'M 92 48 Q 94 30 86 28 L 78 30 L 66 62 L 52 58 L 50 84 L 70 92 Q 88 84 92 48 Z']), ('#e0a36c', ['M 10.6 48 Q 9 32 15 31 L 20 32.4 L 32.6 64.6 L 45.6 61 L 47.4 82 L 30 89.4 Q 14.6 82 10.6 48 Z', 'M 89.4 48 Q 91 32 85 31 L 80 32.4 L 67.4 64.6 L 54.4 61 L 52.6 82 L 70 89.4 Q 85.4 82 89.4 48 Z'])]


def e_nose():
    """La nariz (el olor)."""
    return [(OUTLINE, ['M 46 8 Q 52 8 54 20 L 72 70 Q 80 86 64 90 Q 54 92 50 86 Q 46 92 36 90 Q 22 86 30 72 L 40 22 Q 42 8 46 8 Z']), ('#e0a36c', ['M 47 11 Q 50.6 11 51.6 21 L 69.6 71 Q 76 84 64 87.4 Q 55 89 50 82 Q 45 89 36 87.4 Q 25 84 32.6 72.6 L 42.6 22.6 Q 44 11 47 11 Z']), ('#8d5a32', [ellipse(42, 82, 4, 2.4), ellipse(58, 82, 4, 2.4)])]


def e_vest():
    """El chaleco reflectivo."""
    return [(OUTLINE, ['M 20 10 L 36 10 Q 50 30 64 10 L 80 10 L 92 40 L 84 94 L 16 94 L 8 40 Z']), ('#ff7043', ['M 22 12.6 L 34.6 12.6 Q 50 34 65.4 12.6 L 78 12.6 L 89.4 40 L 81.6 91.4 L 18.4 91.4 L 10.6 40 Z']), ('#fff59d', [rect(10, 56, 80, 6), rect(12, 72, 76, 6)]), ('#e64a19', [rect(48.6, 30, 2.8, 62)])]



# ---------- Emojis propios: vehículos, animales y clima (v4.3) ----------

def wheel(cx, cy, r):
    """Una llanta con su rin."""
    return [(OUTLINE, [circle(cx, cy, r + 1.8)]), ('#37474f', [circle(cx, cy, r)]), ('#b0bec5', [circle(cx, cy, r * 0.45)])]


def rot_pts(points, a, cx=50, cy=50):
    r = math.radians(a)
    return [(cx + (x - cx) * math.cos(r) - (y - cy) * math.sin(r), cy + (x - cx) * math.sin(r) + (y - cy) * math.cos(r)) for x, y in points]


def e_willys():
    """El Willys de los cafeteros."""
    return willys_side(50, 70, 1.15)


def e_truck():
    """El camión de estacas, con el furgón y la cabina."""
    layers = shape([(8, 28), (62, 28), (62, 72), (8, 72)], '#fafafa')
    layers.append(('#fbc02d', [rect(8, 48, 54, 6)]))
    layers += shape([(64, 42), (80, 42), (92, 56), (92, 72), (64, 72)], '#1e88e5')
    layers.append(('#b3e5fc', [poly(68, 46, 78, 46, 86, 56, 68, 56)]))
    layers.append(('#fff59d', [rect(88, 62, 4, 4)]))
    return layers + wheel(24, 76, 9) + wheel(78, 76, 9)


def e_tractomula():
    """La tractomula: el remolque largo y el cabezote con la cabina dormitorio."""
    layers = shape([(4, 30), (66, 30), (66, 70), (4, 70)], '#eceff1')
    layers.append(('#e53935', [rect(4, 44, 62, 5)]))
    layers += shape([(68, 34), (80, 34), (82, 46), (94, 52), (94, 72), (68, 72)], '#e53935')
    layers.append(('#b3e5fc', [poly(81, 38, 81, 48, 91, 53, 91, 56, 82, 56, 82, 48)]))
    layers.append(('#b3e5fc', [poly(80, 48, 90, 53, 90, 58, 80, 58)]))
    layers.append((OUTLINE, [rect(74, 20, 3, 14)]))
    return layers + wheel(14, 76, 7) + wheel(30, 76, 7) + wheel(56, 76, 7) + wheel(84, 76, 7)


def e_tractor():
    """El tractor verde: llanta grande atrás, cabina y el exhosto."""
    layers = shape([(30, 30), (54, 30), (54, 56), (30, 56)], '#c8e6c9')
    layers += shape([(26, 26), (58, 26), (58, 30), (26, 30)], '#43a047')
    layers += shape([(30, 50), (88, 50), (90, 68), (30, 68)], '#43a047')
    layers += bar(76, 50, 76, 32, 3, '#546e7a')
    layers.append(('#fdd835', [rect(80, 56, 8, 3)]))
    return layers + wheel(32, 68, 22) + wheel(80, 76, 12)


def e_speedboat():
    """La lancha rápida, con su raya roja, sobre las olas."""
    layers = [(OUTLINE, [rect(2, 72, 96, 22)]), ('#1e88e5', [rect(3.6, 73.6, 92.8, 18.8)])]
    layers += shape([(6, 50), (78, 50), (96, 44), (84, 72), (14, 72)], '#fafafa')
    layers.append(('#e53935', [poly(10, 58, 88, 58, 86, 63, 12, 63)]))
    layers += shape([(30, 50), (40, 36), (54, 36), (58, 50)], '#b3e5fc', 1.8)
    layers.append(('#bbdefb', [rib(10, 84, 26, 84, 2), rib(44, 88, 62, 88, 2), rib(74, 82, 90, 82, 2)]))
    return layers


def e_pickup():
    """La camioneta de platón."""
    layers = shape([(6, 52), (50, 52), (52, 36), (72, 36), (84, 52), (94, 54), (94, 72), (6, 72)], '#8e24aa')
    layers.append(('#b3e5fc', [poly(56, 40, 70, 40, 79, 52, 56, 52)]))
    layers.append(('#6a1b9a', [rect(8, 56, 40, 3)]))
    layers.append(('#fff59d', [rect(90, 58, 4, 4)]))
    return layers + wheel(24, 74, 10) + wheel(76, 74, 10)


def e_mototaxi():
    """El mototaxi de tres ruedas, con su techo de lona."""
    layers = shape([(14, 26), (78, 26), (80, 32), (12, 32)], '#2e7d32')
    layers += bar(18, 32, 18, 60, 2.4, '#455a64') + bar(70, 32, 74, 56, 2.4, '#455a64')
    layers += shape([(10, 56), (58, 56), (62, 40), (72, 40), (90, 62), (90, 72), (10, 72)], '#fdd835')
    layers.append(('#b3e5fc', [poly(64, 44, 70, 44, 82, 58, 64, 58)]))
    layers += shape([(22, 44), (44, 44), (44, 56), (22, 56)], '#6d4c41', 1.6)
    return layers + wheel(24, 76, 9) + wheel(80, 76, 9)


def e_plane():
    """El avión, visto desde arriba, rumbo al noreste."""
    wing = rot_pts([(50, 36), (94, 56), (94, 64), (50, 54), (6, 64), (6, 56)], 45)
    tail = rot_pts([(50, 76), (68, 88), (68, 93), (50, 86), (32, 93), (32, 88)], 45)
    layers = shape(wing, '#cfd8dc') + shape(tail, '#cfd8dc')
    layers += oval(50, 50, 7, 42, '#eceff1', rot=45)
    layers.append(('#1e88e5', [ellipse(50 + 22 * 0.707, 50 - 22 * 0.707, 3, 7, 45)]))
    layers.append(('#e53935', [ellipse(50 - 30 * 0.707, 50 + 30 * 0.707, 2.6, 7, 45)]))
    return layers


def e_ant():
    """La hormiga arriera, con su pedacito de hoja."""
    layers = [(OUTLINE, [rib(26, 60, 18, 84, 2.4), rib(40, 60, 40, 86, 2.4), rib(54, 60, 64, 84, 2.4), rib(32, 58, 22, 40, 2), rib(44, 58, 54, 38, 2),
                         curve(70, 46, 76, 30, 84, 26, 2), curve(74, 48, 86, 36, 94, 38, 2)])]
    layers += oval(22, 58, 16, 12, '#6d2b1a') + oval(44, 58, 8, 7, '#6d2b1a') + oval(66, 52, 11, 10, '#6d2b1a')
    layers.append(('#ffffff', [circle(70, 49, 2.2)]))
    layers += shape([(54, 18), (78, 6), (82, 22), (62, 30)], '#7cb342', 1.6)
    return layers


def e_whale():
    """La ballena jorobada, echando su chorro."""
    body = 'M 6 58 Q 8 34 40 34 Q 66 34 78 50 L 92 36 L 94 66 L 82 60 Q 74 80 44 82 Q 8 82 6 58 Z'
    layers = [(OUTLINE, [body]), ('#1e88e5', ['M 9 58 Q 11 37 40 37 Q 64 37 76 53 L 90 41 L 91.5 62.5 L 80 56.5 Q 72 77 44 79 Q 11 79 9 58 Z'])]
    layers.append(('#bbdefb', ['M 12 64 Q 30 70 56 66 Q 50 78 40 78 Q 16 78 12 64 Z']))
    layers.append(('#0d2b45', [circle(22, 54, 2.6)]))
    layers.append(('#4fc3f7', [curve(34, 32, 30, 18, 22, 12, 3), curve(34, 32, 36, 18, 44, 12, 3), curve(34, 32, 33, 18, 33, 8, 3)]))
    return layers


def e_fish():
    """El pescado, con su aleta y la cola."""
    layers = shape([(70, 50), (94, 30), (90, 50), (94, 70)], '#ff8a65')
    layers += oval(44, 50, 34, 20, '#ffab91')
    layers.append(('#ff7043', [poly(40, 31, 56, 22, 60, 32), poly(46, 52, 58, 60, 44, 62)]))
    layers.append(('#ffffff', [circle(22, 46, 5)]))
    layers.append(('#263238', [circle(21, 46, 2.6)]))
    layers.append(('#e64a19', [curve(32, 38, 36, 50, 32, 62, 1.6)]))
    return layers


def e_cat():
    """Un gato atigrado, sentado."""
    layers = [(OUTLINE, [curve(70, 86, 94, 78, 88, 54, 7.6)]), ('#fb8c00', [curve(70, 86, 94, 78, 88, 54, 4.2)])]
    layers += oval(50, 72, 21, 20, '#ffa726')
    layers += shape([(28, 26), (30, 8), (42, 20)], '#ffa726', 1.8) + shape([(72, 26), (70, 8), (58, 20)], '#ffa726', 1.8)
    layers += oval(50, 36, 24, 20, '#ffa726')
    layers.append(('#fb8c00', [rib(40, 18, 42, 26, 2.4), rib(50, 16, 50, 26, 2.4), rib(60, 18, 58, 26, 2.4), rib(36, 66, 44, 68, 2.6), rib(36, 76, 46, 78, 2.6), rib(66, 66, 58, 68, 2.6)]))
    layers.append(('#2e7d32', [ellipse(41, 36, 3.6, 4.6), ellipse(59, 36, 3.6, 4.6)]))
    layers.append(('#1b1b1b', [ellipse(41, 36, 1.2, 3.6), ellipse(59, 36, 1.2, 3.6), poly(47, 44, 53, 44, 50, 47)]))
    layers.append((OUTLINE, [rib(18, 44, 36, 46, 1), rib(18, 50, 36, 48, 1), rib(82, 44, 64, 46, 1), rib(82, 50, 64, 48, 1)]))
    return layers


def e_bird():
    """Un pajarito azul, de perfil."""
    layers = shape([(70, 52), (94, 40), (90, 60)], '#1565c0', 1.8)
    layers += oval(52, 56, 26, 20, '#42a5f5')
    layers += oval(32, 40, 15, 14, '#42a5f5')
    layers += shape([(17, 38), (6, 43), (18, 46)], '#fbc02d', 1.6)
    layers.append(('#1565c0', ['M 44 52 Q 60 44 76 54 Q 64 70 46 62 Z']))
    layers.append(('#e3f2fd', [ellipse(50, 66, 14, 8)]))
    layers.append(('#ffffff', [circle(30, 37, 4)]))
    layers.append(('#0d2b45', [circle(29, 37, 2.2)]))
    layers += bar(46, 74, 42, 90, 1.6, '#fb8c00') + bar(58, 74, 60, 90, 1.6, '#fb8c00')
    return layers


def e_beetle():
    """El cucarrón, visto desde arriba."""
    legs = [(30, 40, 14, 30), (30, 56, 10, 56), (32, 70, 16, 86), (70, 40, 86, 30), (70, 56, 90, 56), (68, 70, 84, 86)]
    layers = [(OUTLINE, [rib(*l, 3) for l in legs] + [curve(44, 22, 38, 10, 30, 8, 2), curve(56, 22, 62, 10, 70, 8, 2)])]
    layers += oval(50, 26, 10, 8, '#263238')
    layers += oval(50, 60, 24, 30, '#2e7d32')
    layers.append((OUTLINE, [rect(49, 32, 2, 56)]))
    layers.append(('#81c784', [ellipse(40, 50, 4, 9, 10), ellipse(60, 50, 4, 9, -10)]))
    return layers


def e_fly():
    """La mosca, con sus alas transparentes."""
    layers = [(OUTLINE, [ellipse(32, 36, 18, 10, 35), ellipse(68, 36, 18, 10, -35)]), ('#e1f5fe', [ellipse(32, 36, 16, 8, 35), ellipse(68, 36, 16, 8, -35)])]
    layers.append((OUTLINE, [rib(42, 56, 26, 66, 2.4), rib(58, 56, 74, 66, 2.4), rib(44, 66, 30, 82, 2.4), rib(56, 66, 70, 82, 2.4)]))
    layers += oval(50, 62, 11, 20, '#455a64')
    layers.append(('#263238', [rib(40, 62, 60, 62, 2.4), rib(42, 70, 58, 70, 2.4)]))
    layers += oval(50, 34, 11, 9, '#37474f')
    layers.append(('#c62828', [circle(42, 32, 5), circle(58, 32, 5)]))
    return layers


def e_microbe():
    """El microbio verde, con sus pelitos."""
    spikes = [(50 + 36 * math.cos(math.radians(a)), 50 + 32 * math.sin(math.radians(a)), 50 + 44 * math.cos(math.radians(a)), 50 + 40 * math.sin(math.radians(a))) for a in range(0, 360, 30)]
    layers = [(OUTLINE, [rib(x0, y0, x1, y1, 3.6) for x0, y0, x1, y1 in spikes] + [circle(x1, y1, 3.6) for _, _, x1, y1 in spikes])]
    layers.append(('#9ccc65', [circle(x1, y1, 2) for _, _, x1, y1 in spikes]))
    blob = [(50 + (34 + 3 * math.sin(math.radians(a * 5))) * math.cos(math.radians(a)), 50 + (30 + 3 * math.sin(math.radians(a * 5))) * math.sin(math.radians(a))) for a in range(0, 360, 6)]
    layers += shape(blob, '#7cb342')
    layers.append(('#558b2f', [circle(38, 42, 5), circle(60, 38, 4), circle(56, 62, 6), circle(36, 62, 3)]))
    return layers


def e_worm():
    """La lombriz rosada, culebreando."""
    path = [(12, 70), (30, 50), (48, 70), (66, 50), (84, 64)]
    def band(w):
        return [curve(path[0][0], path[0][1], 21, 40, 30, 50, w), curve(30, 50, 39, 74, 48, 70, w), curve(48, 70, 57, 40, 66, 50, w), curve(66, 50, 75, 64, 84, 64, w)]
    layers = [(OUTLINE, band(17) + [circle(12, 70, 8.5), circle(84, 64, 8.5)]), ('#f48fb1', band(12) + [circle(12, 70, 6), circle(84, 64, 6)])]
    layers.append(('#ec407a', [rib(26, 44, 24, 56, 2), rib(42, 66, 50, 74, 2), rib(60, 44, 58, 56, 2)]))
    layers.append(('#2b1d14', [circle(86, 61, 1.6)]))
    return layers


def sun_shape(cx, cy, r, rays=12):
    out_r = r * 1.45
    tri = []
    for i in range(rays):
        a = math.radians(i * 360 / rays)
        b1, b2 = a - math.pi / rays * 0.55, a + math.pi / rays * 0.55
        tri.append(poly(cx + r * 1.08 * math.cos(b1), cy + r * 1.08 * math.sin(b1), cx + out_r * math.cos(a), cy + out_r * math.sin(a), cx + r * 1.08 * math.cos(b2), cy + r * 1.08 * math.sin(b2)))
    grown = []
    for i in range(rays):
        a = math.radians(i * 360 / rays)
        b1, b2 = a - math.pi / rays * 0.75, a + math.pi / rays * 0.75
        grown.append(poly(cx + r * math.cos(b1), cy + r * math.sin(b1), cx + (out_r + 3) * math.cos(a), cy + (out_r + 3) * math.sin(a), cx + r * math.cos(b2), cy + r * math.sin(b2)))
    return [(OUTLINE, grown + [circle(cx, cy, r + 2)]), ('#ffb300', tri), ('#fdd835', [circle(cx, cy, r)]), ('#fff59d', [ellipse(cx - r * 0.3, cy - r * 0.3, r * 0.35, r * 0.25, -30)])]


def cloud(cx, cy, s=1.0, color='#eceff1'):
    puffs = [(-18, 4, 12), (-4, -6, 16), (14, 0, 13), (24, 8, 9)]
    base = rect(cx - 28 * s, cy + 2 * s, 54 * s, 14 * s)
    return [(OUTLINE, [circle(cx + x * s, cy + y * s, (r + 2.2) * s) for x, y, r in puffs] + [rect(cx - 30.2 * s, cy - 0.2 * s, 58.4 * s, 18.4 * s)]),
            (color, [circle(cx + x * s, cy + y * s, r * s) for x, y, r in puffs] + [base]), ('#ffffff', [ellipse(cx - 6 * s, cy - 12 * s, 7 * s, 3 * s, -10)])]


def rain_drops(spots):
    return [(OUTLINE, [rib(x, y, x - 4, y + 12, 5) for x, y in spots]), ('#29b6f6', [rib(x, y, x - 4, y + 12, 2.6) for x, y in spots])]


def e_sun():
    """El sol."""
    return sun_shape(50, 50, 24)


def e_rain():
    """La nube con aguacero."""
    return cloud(50, 36, 1.3, '#b0bec5') + rain_drops([(30, 66), (46, 70), (62, 66), (78, 70), (38, 84), (58, 84)])


def e_sun_rain():
    """Sol y lluvia: el clima de montaña."""
    return sun_shape(34, 32, 16) + cloud(56, 48, 1.15, '#cfd8dc') + rain_drops([(38, 74), (54, 78), (70, 74)])


def e_sun_cloud():
    """Sol con una nubecita."""
    return sun_shape(40, 40, 22) + cloud(66, 66, 0.9)


def crescent(c1, r1, c2, r2, n=180):
    theta0 = math.atan2(c1[1] - c2[1], c1[0] - c2[0])
    outer = []
    for i in range(n + 1):
        a = theta0 - math.pi + 2 * math.pi * i / n
        p = (c1[0] + r1 * math.cos(a), c1[1] + r1 * math.sin(a))
        if math.hypot(p[0] - c2[0], p[1] - c2[1]) > r2:
            outer.append(p)
    inner = []
    for i in range(n + 1):
        a = theta0 + math.pi - 2 * math.pi * i / n
        p = (c2[0] + r2 * math.cos(a), c2[1] + r2 * math.sin(a))
        if math.hypot(p[0] - c1[0], p[1] - c1[1]) < r1:
            inner.append(p)
    if math.dist(inner[0], outer[-1]) > math.dist(inner[-1], outer[-1]):
        inner.reverse()
    return pts(outer + inner)


def e_moon():
    """La luna en cuarto creciente."""
    return [(OUTLINE, [crescent((44, 52), 40, (66, 40), 32)]), ('#fdd835', [crescent((44, 52), 37.4, (66, 40), 34.6)]),
            ('#fff59d', [ellipse(20, 54, 3, 8, 10)])]


def e_snow():
    """El copo de nieve de los páramos."""
    arms = []
    for i in range(6):
        a = math.radians(i * 60 - 90)
        x1, y1 = 50 + 40 * math.cos(a), 50 + 40 * math.sin(a)
        arms.append((50, 50, x1, y1))
        for k, d in ((0.55, 12), (0.8, 8)):
            bx, by = 50 + 40 * k * math.cos(a), 50 + 40 * k * math.sin(a)
            for s in (-1, 1):
                b = a + s * math.radians(50)
                arms.append((bx, by, bx + d * math.cos(b), by + d * math.sin(b)))
    return [(OUTLINE, [rib(*r, 8) for r in arms]), ('#81d4fa', [rib(*r, 4) for r in arms]), ('#e1f5fe', [circle(50, 50, 5)])]


def e_thermo():
    """El termómetro."""
    layers = [(OUTLINE, [rect(40, 6, 20, 70), circle(50, 78, 16), circle(50, 8, 10)]), ('#fafafa', [rect(42.4, 8, 15.2, 68), circle(50, 78, 13.6), circle(50, 8, 7.6)])]
    layers.append(('#e53935', [rect(46, 34, 8, 44), circle(50, 78, 10)]))
    layers.append(('#90a4ae', [rect(60, 20, 8, 2), rect(60, 32, 6, 2), rect(60, 44, 8, 2), rect(60, 56, 6, 2)]))
    return layers


def e_wind():
    """El viento: tres ráfagas con su rizo."""
    def gust(y, x1, k):
        return [curve(8, y, 40, y + 2, x1, y, k), f'M {x1} {y + k / 2} Q {x1 + 12} {y - 2} {x1 + 4} {y - 12} Q {x1 - 4} {y - 16} {x1 - 8} {y - 8} L {x1 - 8 + k * 0.8} {y - 8} Q {x1 - 2} {y - 12} {x1 + 2} {y - 8} Q {x1 + 6} {y - 2} {x1} {y - k / 2} Z']
    layers = [(OUTLINE, gust(34, 64, 9) + gust(56, 80, 9) + gust(76, 52, 9))]
    layers.append(('#b3e5fc', gust(34, 64, 4.6) + gust(56, 80, 4.6) + gust(76, 52, 4.6)))
    return layers


def spiral_band(cx, cy, a0, a1, r0, r1, w):
    out, inn = [], []
    n = 120
    for i in range(n + 1):
        t = a0 + (a1 - a0) * i / n
        r = r0 + (r1 - r0) * i / n
        ww = w * (0.35 + 0.65 * i / n)
        out.append((cx + (r + ww / 2) * math.cos(t), cy + (r + ww / 2) * math.sin(t)))
        inn.append((cx + (r - ww / 2) * math.cos(t), cy + (r - ww / 2) * math.sin(t)))
    return pts(out + inn[::-1])


def e_cyclone():
    """El remolino."""
    return [(OUTLINE, [spiral_band(50, 50, 0, 4 * math.pi, 2, 38, 18)]), ('#42a5f5', [spiral_band(50, 50, 0.1, 4 * math.pi - 0.05, 2.2, 38, 12)])]


def drop_path(cx, cy, s):
    def P(x, y):
        return f'{cx + x * s:.2f} {cy + y * s:.2f}'
    return f'M {P(0, -42)} Q {P(8, -20)} {P(24, 2)} Q {P(36, 30)} {P(12, 40)} Q {P(0, 44)} {P(-12, 40)} Q {P(-36, 30)} {P(-24, 2)} Q {P(-8, -20)} {P(0, -42)} Z'


def e_drop():
    """La gota de agua."""
    return [(OUTLINE, [drop_path(50, 50, 1.06)]), ('#4fc3f7', [drop_path(50, 51, 0.98)]), ('#e1f5fe', [ellipse(36, 58, 4, 9, 20)])]


def e_wave():
    """La ola que se encrespa."""
    body = 'M 4 92 L 4 64 Q 10 28 44 22 Q 76 18 90 42 Q 74 34 62 42 Q 52 52 62 62 Q 76 70 94 60 L 96 92 Z'
    layers = [(OUTLINE, [body]), ('#1e88e5', ['M 6.6 89.6 L 6.6 64 Q 12.4 30.4 44 24.6 Q 70 21 84 37 Q 72 33 60 40 Q 48 52 60 64 Q 76 73 93 63 L 93.4 89.6 Z'])]
    layers.append(('#ffffff', ['M 44 24.6 Q 70 21 84 37 Q 74 34 64 38 Q 66 30 44 24.6 Z', rib(14, 80, 30, 80, 2.4), rib(40, 84, 58, 84, 2.4)]))
    layers.append(('#64b5f6', ['M 12 70 Q 18 44 40 36 Q 30 50 30 70 Z']))
    return layers



# ---------- Emojis propios: naturaleza, lugares, comida y objetos (v4.3) ----------

def e_palm():
    """La palma de coco."""
    layers = [(OUTLINE, [ellipse(50, 92, 30, 4)]), ('#e6c88a', [ellipse(50, 92, 28, 3)])]
    return layers + palm(44, 92, 52, lean=10, s=2.2) + oval(50, 44, 4, 4, '#8d6e63', d=1.4) + oval(58, 44, 4, 4, '#8d6e63', d=1.4)


def e_tree():
    """Un árbol frondoso."""
    layers = shape([(44, 92), (46, 56), (54, 56), (56, 92)], '#8d6e63')
    puffs = [(50, 30, 22), (30, 46, 18), (70, 46, 18), (50, 54, 18)]
    layers += [(OUTLINE, [circle(x, y, r + 2.4) for x, y, r in puffs]), ('#43a047', [circle(x, y, r) for x, y, r in puffs])]
    layers.append(('#66bb6a', [circle(44, 24, 8), circle(26, 42, 6), circle(64, 40, 7)]))
    return layers


def e_hibiscus():
    """La flor de cayeno, roja."""
    layers = []
    for i in range(5):
        a = math.radians(i * 72 - 90)
        x, y = 50 + 22 * math.cos(a), 50 + 22 * math.sin(a)
        layers += oval(x, y, 20, 15, '#e53935', rot=i * 72)
    layers.append(('#c62828', [circle(50, 50, 12)]))
    layers += bar(50, 50, 72, 26, 2.4, '#fdd835')
    layers.append(('#fbc02d', [circle(72, 26, 3), circle(66, 24, 2.4), circle(74, 32, 2.4)]))
    return layers


def e_seedling():
    """La matica que brota."""
    layers = [(OUTLINE, ['M 14 92 Q 50 66 86 92 Z']), ('#8d6e63', ['M 18 90.4 Q 50 70 82 90.4 Z'])]
    layers += bar(50, 82, 50, 46, 3, '#558b2f')
    layers += [(OUTLINE, [leaf(50, 50, 14, 30, 13), leaf(50, 46, 86, 22, 14)]), ('#7cb342', [leaf(50, 50, 17, 31.5, 10), leaf(50, 46, 83, 23.5, 11)])]
    layers.append(('#558b2f', [rib(50, 50, 22, 34, 1.4), rib(50, 46, 78, 26, 1.4)]))
    return layers


def e_leaves():
    """Dos hojas que se lleva el viento."""
    layers = [(OUTLINE, [leaf(14, 84, 58, 30, 18), leaf(44, 88, 92, 54, 14)]), ('#66bb6a', [leaf(17, 81, 56, 33, 15)]), ('#43a047', [leaf(47, 86, 89, 56, 11)])]
    layers.append(('#2e7d32', [rib(17, 81, 52, 37, 1.6), rib(47, 86, 86, 58, 1.6)]))
    layers.append((OUTLINE, [curve(56, 12, 72, 6, 90, 14, 2.4), curve(64, 24, 78, 20, 94, 28, 2.4)]))
    return layers


def e_fallen_leaves():
    """Hojas secas que caen."""
    layers = [(OUTLINE, [leaf(10, 70, 56, 30, 16), leaf(40, 90, 90, 64, 14), leaf(50, 46, 86, 10, 12)])]
    layers.append(('#ef6c00', [leaf(13, 68, 53, 33, 13)]))
    layers.append(('#a1572a', [leaf(43, 88, 87, 66, 11)]))
    layers.append(('#fbc02d', [leaf(53, 44, 83, 13, 9)]))
    layers.append(('#6d3b14', [rib(13, 68, 50, 36, 1.4), rib(43, 88, 84, 68, 1.4), rib(53, 44, 80, 16, 1.4)]))
    return layers


def e_mushroom():
    """El hongo de sombrero rojo con pintas."""
    layers = shape([(40, 90), (42, 52), (58, 52), (60, 90)], '#f5ead6')
    layers += [(OUTLINE, ['M 6 58 Q 6 10 50 10 Q 94 10 94 58 Z']), ('#e53935', ['M 9 55.6 Q 9 13 50 13 Q 91 13 91 55.6 Z'])]
    layers.append(('#ffffff', [ellipse(30, 34, 7, 5), ellipse(56, 24, 6, 4), ellipse(72, 42, 7, 5), ellipse(46, 46, 5, 4)]))
    return layers


def e_guadua():
    """La guadua: cañas con sus nudos y hojitas."""
    layers = []
    for x, top in ((30, 8), (52, 18), (72, 4)):
        layers += shape([(x - 6, 94), (x - 6, top), (x + 6, top), (x + 6, 94)], '#7cb342', 1.8)
        layers.append(('#558b2f', [rect(x - 6, y, 12, 2.6) for y in range(top + 16, 92, 18)]))
        layers.append(('#aed581', [rect(x - 3, top + 4, 2.4, 86 - top)]))
    layers += [(OUTLINE, [leaf(36, 30, 50, 6, 6), leaf(58, 40, 80, 30, 6), leaf(78, 22, 96, 16, 5)]), ('#43a047', [leaf(37, 28, 49, 9, 4), leaf(60, 39, 78, 31, 4), leaf(80, 21, 94, 17, 3)])]
    return layers


def e_log():
    """Un tronco de madera, con sus anillos."""
    layers = shape([(14, 36), (78, 36), (78, 76), (14, 76)], '#a1693f')
    layers.append(('#7a4a26', [rib(20, 48, 70, 48, 2), rib(24, 62, 74, 62, 2)]))
    layers += oval(78, 56, 14, 20, '#e0b27a')
    layers += [('#a1693f', [ellipse(78, 56, 9, 13)]), ('#e0b27a', [ellipse(78, 56, 6, 9)]), ('#a1693f', [ellipse(78, 56, 2.4, 3.6)])]
    layers += oval(14, 56, 6, 20, '#a1693f')
    return layers


def e_brick():
    """Los ladrillos de la tapia."""
    layers = [(OUTLINE, [rect(6, 18, 88, 66)]), ('#e8d9c0', [rect(8, 20, 84, 62)])]
    bricks = []
    for row in range(4):
        y = 21 + row * 15.4
        off = 0 if row % 2 == 0 else -10
        for c in range(5):
            x = 9 + off + c * 20.6
            x0, x1 = max(9, x), min(91, x + 18.6)
            bricks.append(rect(x0, y, x1 - x0, 13.4))
    layers.append(('#c0573a', bricks))
    layers.append(('#d9775a', [rect(12, 23, 8, 2), rect(54, 38, 8, 2), rect(32, 69, 8, 2)]))
    return layers


def e_rock():
    """Una piedra."""
    layers = shape([(10, 84), (14, 56), (30, 30), (52, 20), (74, 30), (90, 56), (92, 84)], '#90a4ae')
    layers.append(('#b0bec5', [poly(30, 34, 52, 24, 60, 32, 40, 46)]))
    layers.append(('#78909c', [poly(60, 60, 88, 62, 90, 82, 56, 82)]))
    return layers


def windows(x0, y0, cols, rows, w, h, gx, gy, color='#b3e5fc'):
    return [rect(x0 + c * gx, y0 + r * gy, w, h) for c in range(cols) for r in range(rows)]


def e_hotel():
    """El hotel, con su letrero."""
    layers = shape([(16, 94), (16, 18), (84, 18), (84, 94)], '#ffcc80')
    layers.append(('#b3e5fc', windows(22, 40, 4, 3, 10, 9, 15.4, 14)))
    layers += shape([(34, 6), (66, 6), (66, 26), (34, 26)], '#e53935', 1.8)
    layers.append(('#ffffff', [rect(42, 10, 3, 12), rect(55, 10, 3, 12), rect(42, 14.6, 16, 3)]))
    layers += shape([(42, 94), (42, 80), (58, 80), (58, 94)], '#6d4c41', 1.6)
    return layers


def e_factory():
    """La fábrica: techo de sierra y la chimenea humeando."""
    layers = [(OUTLINE, [circle(80, 16, 7), circle(88, 8, 5)]), ('#cfd8dc', [circle(80, 16, 5), circle(88, 8, 3.4)])]
    layers += shape([(72, 94), (72, 24), (84, 24), (84, 94)], '#8d6e63')
    layers += shape([(6, 94), (6, 50), (24, 38), (24, 50), (42, 38), (42, 50), (60, 38), (60, 50), (76, 50), (76, 94)], '#bcaaa4')
    layers.append(('#ffe082', windows(12, 62, 4, 2, 9, 8, 15.6, 14)))
    return layers


def e_old_house():
    """La casa abandonada: tablas, tejas caídas y la ventana rota."""
    layers = shape([(14, 94), (14, 46), (50, 18), (86, 46), (86, 94)], '#a1887f')
    layers.append(('#795548', [poly(10, 48, 50, 14, 66, 28, 62, 30, 50, 22, 14, 52)]))
    layers += shape([(26, 54), (44, 54), (44, 70), (26, 70)], '#37474f', 1.6)
    layers.append(('#a1887f', [poly(26, 54, 34, 54, 26, 64)]))
    layers += shape([(56, 94), (56, 64), (72, 64), (72, 94)], '#5d4037', 1.6)
    layers.append(('#d7ccc8', [rect(24, 62, 22, 3, 25), rect(54, 76, 20, 3, -20)]))
    layers.append((OUTLINE, [rib(60, 40, 66, 52, 1.4), rib(66, 52, 62, 58, 1.4)]))
    return layers


def e_bridge():
    """El puente colgante sobre el río."""
    layers = [(OUTLINE, [rect(2, 70, 96, 26)]), ('#4fa3d9', [rect(3.6, 71.6, 92.8, 22.8)]), ('#b3e0f2', [rib(10, 84, 26, 84, 2), rib(60, 88, 80, 88, 2)])]
    def cy(x):
        t = (x - 22) / 56
        return (1 - t) ** 2 * 22 + 2 * t * (1 - t) * 82 + t * t * 22
    layers.append(('#5d4037', [rect(x - 0.8, cy(x), 1.6, 58 - cy(x)) for x in range(29, 76, 7)]))
    cables = [curve(22, 22, 50, 82, 78, 22, 2), curve(4, 58, 12, 40, 22, 22, 2), curve(78, 22, 88, 40, 96, 58, 2)]
    layers += [(OUTLINE, [curve(22, 22, 50, 82, 78, 22, 4), curve(4, 58, 12, 40, 22, 22, 4), curve(78, 22, 88, 40, 96, 58, 4)]), ('#e53935', cables)]
    layers += shape([(18, 70), (18, 18), (26, 18), (26, 70)], '#8d6e63', 1.8) + shape([(74, 70), (74, 18), (82, 18), (82, 70)], '#8d6e63', 1.8)
    layers += shape([(2, 58), (98, 58), (98, 64), (2, 64)], '#6d4c41', 1.8)
    return layers


def e_city_sunset():
    """La ciudad al atardecer."""
    layers = [(OUTLINE, [rect(2, 8, 96, 86)]), ('#ffb74d', [rect(3.6, 9.6, 92.8, 82.8)]), ('#ff8a65', [rect(3.6, 9.6, 92.8, 28)])]
    layers.append(('#fff176', [circle(50, 56, 16)]))
    for x, w, h in ((4, 16, 40), (20, 12, 56), (32, 18, 32), (52, 14, 60), (66, 16, 44), (82, 14.4, 52)):
        layers.append(('#5d4037', [rect(x, 92.4 - h, w, h)]))
        layers.append(('#ffe082', windows(x + 3, 96 - h, max(1, int(w // 6)), max(1, int(h // 12)), 2.6, 3.4, 5.4, 10)))
    return layers


def mountain(points, color, snow=None):
    layers = shape(points, color)
    if snow:
        layers.append(('#ffffff', [poly(*snow)]))
    return layers


def e_mountain():
    """La montaña de nieve, con la loma verde."""
    layers = mountain([(4, 90), (46, 14), (94, 90)], '#78909c', (46, 14, 58, 36, 50, 32, 44, 40, 36, 32))
    layers += mountain([(30, 90), (70, 46), (98, 90)], '#689f38')
    return layers


def e_sunrise_mtn():
    """El amanecer entre montañas."""
    layers = [(OUTLINE, [rect(2, 8, 96, 86)]), ('#ffe0b2', [rect(3.6, 9.6, 92.8, 82.8)])]
    layers += sun_shape(50, 56, 15)
    layers.append(('#7cb342', [poly(3.6, 92.4, 3.6, 50, 30, 36, 56, 70, 72, 46, 96.4, 64, 96.4, 92.4)]))
    layers.append(('#558b2f', [poly(3.6, 92.4, 3.6, 72, 40, 62, 96.4, 80, 96.4, 92.4)]))
    return layers


def e_butter():
    """El bloque de mantequilla en su platico."""
    layers = oval(50, 74, 44, 12, '#e3f2fd')
    layers += shape([(18, 70), (18, 46), (34, 32), (82, 32), (82, 58), (66, 70)], '#fff176')
    layers.append(('#fdd835', [poly(66, 46, 82, 32, 82, 58, 66, 70)]))
    layers.append(('#fff9c4', [poly(18, 46, 34, 32, 82, 32, 66, 46)]))
    layers.append((OUTLINE, [rib(66, 46, 66, 70, 1.4), rib(18, 46, 66, 46, 1.4), rib(66, 46, 82, 32, 1.4)]))
    return layers


def e_honey():
    """La olla de miel, con el cucharón y el chorrito."""
    layers = oval(50, 64, 34, 28, '#ffb300')
    layers += shape([(26, 34), (74, 34), (74, 44), (26, 44)], '#ffca28')
    layers.append(('#ff8f00', ['M 22 50 Q 34 58 44 52 Q 46 62 50 54 Q 60 60 78 50 L 78 46 L 22 46 Z']))
    layers += bar(58, 40, 82, 6, 3, '#a1693f')
    layers.append(('#fff3c4', [ellipse(36, 72, 4, 8, 20)]))
    return layers


def e_flan():
    """El flan de caramelo."""
    layers = oval(50, 80, 44, 10, '#e3f2fd')
    layers += [(OUTLINE, ['M 18 80 L 28 34 Q 50 26 72 34 L 82 80 Z']), ('#ffd54f', ['M 21 78 L 30.4 36 Q 50 29 69.6 36 L 79 78 Z'])]
    layers.append(('#8d4a17', ['M 30.4 36 Q 50 29 69.6 36 L 70.6 42 Q 64 52 60 44 Q 54 56 48 44 Q 40 54 36 44 Q 32 50 29.4 42 Z']))
    layers.append(('#fff59d', [rect(28, 54, 4, 18, 12)]))
    return layers


def e_egg_pan():
    """La paila con el huevo frito."""
    layers = bar(70, 62, 96, 82, 6, '#37474f')
    layers += oval(42, 52, 38, 36, '#455a64')
    layers.append(('#607d8b', [circle(42, 52, 32)]))
    layers += [(OUTLINE, ['M 22 50 Q 18 30 38 30 Q 52 22 60 38 Q 72 50 60 66 Q 46 78 30 68 Q 20 62 22 50 Z']), ('#ffffff', ['M 24 50 Q 21 32 38 32.6 Q 51 25 58 39 Q 69 50 58.6 64 Q 46 75 31 66 Q 22 61 24 50 Z'])]
    layers += oval(42, 50, 10, 10, '#fbc02d', d=1.6)
    layers.append(('#fff59d', [circle(38, 46, 3)]))
    return layers


def e_arepa():
    """La arepa asada, con su cuadriculado de parrilla y la mantequilla."""
    layers = oval(50, 54, 42, 34, '#f5d58a')
    layers.append(('#e6b85c', [ellipse(50, 54, 36, 28)]))
    layers.append(('#f5d58a', [ellipse(50, 54, 33, 25)]))
    layers.append(('#a0662a', [rib(26, 38, 48, 76, 3), rib(42, 32, 66, 74, 3), rib(60, 32, 78, 64, 3), rib(22, 60, 70, 30, 3), rib(32, 76, 80, 48, 3)]))
    layers += shape([(44, 44), (60, 40), (64, 52), (48, 56)], '#fff176', 1.6)
    return layers


def e_beans():
    """Los fríjoles rojos."""
    layers = []
    for x, y, r in ((30, 40, -20), (58, 32, 15), (72, 58, -30), (44, 64, 10), (24, 72, 40)):
        layers += [(OUTLINE, [f'M {x - 14} {y} Q {x - 14} {y - 12} {x} {y - 11} Q {x + 14} {y - 10} {x + 14} {y + 2} Q {x + 12} {y + 12} {x} {y + 8} Q {x - 4} {y + 6} {x - 8} {y + 10} Q {x - 15} {y + 10} {x - 14} {y} Z'])]
        layers.append(('#a32e2a', [f'M {x - 12} {y} Q {x - 12} {y - 9.6} {x} {y - 8.8} Q {x + 11.6} {y - 8} {x + 11.6} {y + 2} Q {x + 10} {y + 9.6} {x} {y + 6} Q {x - 4} {y + 4} {x - 8} {y + 7.6} Q {x - 12.6} {y + 7.6} {x - 12} {y} Z']))
        layers.append(('#d0605a', [ellipse(x - 2, y - 4, 5, 2.2)]))
    return layers


def e_meat():
    """La posta de carne con su hueso."""
    layers = [(OUTLINE, ['M 12 50 Q 10 20 44 18 Q 84 18 88 46 Q 92 78 56 84 Q 16 88 12 50 Z']), ('#e57373', ['M 14.6 50 Q 13 22.6 44 20.6 Q 81.6 20.6 85.4 46 Q 89 75.6 56 81.4 Q 18.6 85 14.6 50 Z'])]
    layers.append(('#ffcdd2', ['M 20 46 Q 30 30 50 34 Q 40 40 36 54 Q 30 60 20 46 Z', rib(52, 60, 76, 50, 3)]))
    layers += oval(66, 40, 9, 9, '#f5f0e6') + [('#e0d6c2', [circle(66, 40, 4)])]
    return layers


def e_dinner():
    """El plato con el tenedor y el cuchillo."""
    layers = oval(50, 54, 32, 32, '#fafafa') + [('#e0e0e0', [circle(50, 54, 22)]), ('#fafafa', [circle(50, 54, 19)])]
    layers += [(OUTLINE, [rect(6, 20, 10, 72), rect(84, 20, 10, 72)])]
    layers.append(('#b0bec5', [rect(9, 50, 4, 40), rect(7.6, 22, 1.8, 18), rect(10.1, 22, 1.8, 18), rect(12.6, 22, 1.8, 18), rect(7.6, 38, 6.8, 12), rect(87, 50, 4, 40), 'M 87 22 Q 93 30 91 50 L 87 50 Z']))
    return layers


def e_bed():
    """La cama con su almohada y la cobija."""
    layers = shape([(8, 86), (8, 34), (16, 34), (16, 86)], '#8d6e63', 1.8) + shape([(84, 86), (84, 52), (92, 52), (92, 86)], '#8d6e63', 1.8)
    layers += shape([(10, 72), (90, 72), (90, 58), (10, 58)], '#fafafa')
    layers += shape([(18, 58), (18, 46), (38, 46), (38, 58)], '#fafafa', 1.8)
    layers += shape([(36, 74), (36, 52), (90, 56), (90, 74)], '#1e88e5')
    layers.append(('#64b5f6', [rect(40, 60, 46, 3)]))
    return layers


def e_barrel():
    """La caneca de aceite."""
    layers = shape([(24, 92), (24, 14), (76, 14), (76, 92)], '#1e88e5')
    layers.append(('#1565c0', [rect(24, 34, 52, 4), rect(24, 68, 52, 4)]))
    layers += oval(50, 14, 26, 6, '#64b5f6', d=2)
    layers.append(('#90caf9', [rect(30, 20, 4, 66)]))
    return layers


def e_boot():
    """La bota de caucho para el barro."""
    layers = shape([(30, 8), (58, 8), (58, 64), (90, 72), (92, 90), (28, 90)], '#2e3b33')
    layers.append(('#455a50', [rect(34, 12, 4, 48)]))
    layers.append(('#fbc02d', [rect(28, 84, 64, 4)]))
    layers.append(('#4b5d52', [rect(30, 8, 28, 6)]))
    return layers


def e_music():
    """Notas musicales."""
    return [(OUTLINE, [ellipse(28, 76, 12, 9, -20), ellipse(72, 66, 12, 9, -20), rect(34, 18, 7, 58), rect(78, 10, 7, 58), poly(34, 18, 85, 8, 85, 22, 34, 32)]),
            ('#5e35b1', [ellipse(28, 76, 9.6, 6.6, -20), ellipse(72, 66, 9.6, 6.6, -20), rect(35.6, 20, 3.8, 56), rect(79.6, 12, 3.8, 56), poly(35.6, 20, 83.4, 10.4, 83.4, 20, 35.6, 29.6)])]


def e_fishing():
    """La caña de pescar con el pescado picando."""
    layers = bar(10, 90, 66, 10, 3, '#8d6e63')
    layers.append((OUTLINE, [rib(66, 10, 76, 48, 1.2)]))
    layers += oval(14, 84, 5, 5, '#455a64', d=1.6)
    fish = e_fish()
    return layers + scale_layers(fish, 0.48, 46, 50)


def scale_layers(layers, s, dx, dy):
    """Encoge unas capas (para dibujar un ícono dentro de otro)."""
    import re
    def fix(d):
        nums = re.split(r'(-?\d+(?:\.\d+)?)', d)
        out, k = [], 0
        for tok in nums:
            if re.fullmatch(r'-?\d+(?:\.\d+)?', tok):
                v = float(tok)
                out.append(f'{(v * s + (dx if k % 2 == 0 else dy)):.2f}')
                k += 1
            else:
                out.append(tok)
        return ''.join(out)
    return [(c, [fix(d) for d in ds]) for c, ds in layers]


def e_shower():
    """La ducha con su chorro."""
    layers = bar(20, 94, 20, 20, 4, '#90a4ae') + bar(20, 20, 50, 20, 4, '#90a4ae')
    layers += [(OUTLINE, ['M 34 40 Q 34 24 50 24 Q 66 24 66 40 Z']), ('#b0bec5', ['M 36.4 38 Q 36.4 26.4 50 26.4 Q 63.6 26.4 63.6 38 Z'])]
    return layers + rain_drops([(42, 48), (52, 48), (62, 48), (46, 66), (58, 66), (52, 82)])


def e_ice():
    """Los cubos de hielo."""
    layers = []
    for x, y, s in ((14, 40, 36), (50, 24, 36), (36, 56, 34)):
        layers += shape([(x, y), (x + s, y - 4), (x + s + 4, y + s - 4), (x + 4, y + s)], '#b3e5fc', 2)
        layers.append(('#e1f5fe', [poly(x + 4, y + 3, x + 14, y + 2, x + 6, y + 14)]))
    return layers


def e_window():
    """La ventana de cuatro vidrios."""
    layers = shape([(14, 10), (86, 10), (86, 90), (14, 90)], '#8d6e63')
    layers.append(('#b3e5fc', [rect(20, 16, 27, 33), rect(53, 16, 27, 33), rect(20, 55, 27, 29), rect(53, 55, 27, 29)]))
    layers.append(('#e1f5fe', [poly(22, 30, 34, 18, 38, 18, 22, 34), poly(55, 30, 67, 18, 71, 18, 55, 34)]))
    return layers


def e_cross():
    """La cruz."""
    return shape([(42, 6), (58, 6), (58, 28), (80, 28), (80, 44), (58, 44), (58, 94), (42, 94), (42, 44), (20, 44), (20, 28), (42, 28)], '#8d5a32') + [('#a87447', [rect(46, 10, 3, 80)])]


def e_palette():
    """La paleta de pintor."""
    body = 'M 50 8 Q 92 8 94 46 Q 94 70 74 70 Q 62 70 64 82 Q 64 94 46 92 Q 6 88 6 50 Q 8 8 50 8 Z'
    layers = [(OUTLINE, [body]), ('#d7a86e', ['M 50 10.6 Q 89.6 10.6 91.4 46 Q 91.4 67.4 74 67.4 Q 59.4 67.4 61.4 82 Q 61.4 91.4 46 89.4 Q 8.6 85.6 8.6 50 Q 10.6 10.6 50 10.6 Z'])]
    for x, y, c in ((30, 30, '#e53935'), (52, 22, '#fdd835'), (74, 32, '#1e88e5'), (22, 54, '#43a047'), (32, 74, '#8e24aa')):
        layers += oval(x, y, 7, 6, c, d=1.6)
    layers.append(('#f5ead6', [ellipse(70, 52, 6, 5)]))
    return layers


def e_windsock():
    """El pez de tela en su palo (la manga de viento)."""
    layers = bar(12, 94, 12, 8, 3, '#8d6e63')
    layers += [(OUTLINE, ['M 14 14 Q 50 6 80 22 L 96 14 L 90 34 L 96 52 L 80 44 Q 50 54 14 44 Z']), ('#e53935', ['M 16 16.6 Q 50 9 79 24.6 L 92 18 L 87.4 34 L 92 48 L 79 41.6 Q 50 51 16 41.4 Z'])]
    layers.append(('#ffffff', [circle(26, 26, 4.6), rib(40, 16, 44, 44, 2), rib(56, 16, 60, 44, 2)]))
    layers.append(('#263238', [circle(26, 26, 2.4)]))
    return layers


def e_briefcase():
    """El maletín."""
    layers = [(OUTLINE, [rect(36, 14, 28, 16)]), ('#fff8ec', [rect(40, 18, 20, 10)])]
    layers += shape([(8, 28), (92, 28), (92, 88), (8, 88)], '#8d5a32')
    layers.append(('#6d4224', [rect(8, 50, 84, 4)]))
    layers += shape([(44, 46), (56, 46), (56, 58), (44, 58)], '#fbc02d', 1.6)
    return layers



# ---------- Emojis propios: personas (con los cinco tonos de piel) y banderas (v4.3) ----------

SKIN = {None: '#efbd85', 1: '#f3d0b0', 2: '#e2b48a', 3: '#c68642', 4: '#8d5524', 5: '#5c3a21'}
HAIR_DARK, HAIR_GRAY, HAIR_WHITE = '#3e2723', '#9e9e9e', '#eeeeee'


def bust(skin, kind='person', extra=None, hair=None):
    """Una persona de medio cuerpo, de frente. kind: woman, man, person, old_man, old_woman, older, beard.
    extra: farmer (sombrero y espiga), cook (gorro), office (corbata), pilot (gorra), worker (casco)."""
    old = kind in ('old_man', 'old_woman', 'older')
    hair = hair or (HAIR_GRAY if old else '#5d4037' if kind == 'woman' else HAIR_DARK)
    shirt = {'woman': '#e91e63', 'man': '#1e88e5', 'person': '#43a047', 'old_man': '#8d6e63', 'old_woman': '#7e57c2', 'older': '#00897b', 'beard': '#f57c00'}[kind]
    if extra == 'farmer':
        shirt = '#fafafa'
    if extra == 'cook':
        shirt = '#fafafa'
    if extra in ('office', 'pilot'):
        shirt = '#263238'
    if extra == 'worker':
        shirt = '#ff7043'
    feat = '#2b1d14' if skin not in (SKIN[4], SKIN[5]) else '#140a05'
    if hair == HAIR_DARK and skin in (SKIN[4], SKIN[5]):
        hair = '#1a0f0a'
    layers = []
    if kind == 'woman' and extra != 'cook':
        layers += [(OUTLINE, ['M 22 62 Q 18 14 50 12 Q 82 14 78 62 Z']), (hair, ['M 24.4 60 Q 21 16.6 50 14.6 Q 79 16.6 75.6 60 Z'])]
    if kind == 'old_woman':
        layers += oval(50, 12, 10, 8, hair, d=2)
    layers += [(OUTLINE, ['M 8 98 Q 8 70 34 66 L 66 66 Q 92 70 92 98 Z']), (shirt, ['M 10.6 98 Q 11 72.4 34.4 68.4 L 65.6 68.4 Q 89 72.4 89.4 98 Z'])]
    layers += shape([(42, 70), (42, 58), (58, 58), (58, 70)], skin, 1.8)
    if extra == 'office':
        layers.append(('#fafafa', [poly(40, 68, 60, 68, 50, 90)]))
        layers.append(('#c62828', [poly(47, 68, 53, 68, 54, 74, 52, 90, 48, 90, 46, 74)]))
    if extra == 'pilot':
        layers.append(('#fafafa', [poly(42, 68, 58, 68, 50, 82)]))
        layers.append(('#fbc02d', [rect(14, 86, 14, 3), rect(72, 86, 14, 3)]))
    if extra == 'farmer':
        layers.append(('#795548', [rect(30, 68, 4, 30), rect(66, 68, 4, 30)]))
    if extra == 'worker':
        layers.append(('#fff176', [rect(22, 80, 56, 4), rect(30, 68, 4, 30), rect(66, 68, 4, 30)]))
    if kind == 'person':
        layers += [(OUTLINE, ['M 24 46 Q 20 14 50 14 Q 80 14 76 46 Z']), (hair, ['M 26.4 44 Q 23 16.6 50 16.6 Q 77 16.6 73.6 44 Z'])]
    layers += oval(50, 40, 21, 24, skin)
    layers += oval(29, 42, 3, 5, skin, d=1.6) + oval(71, 42, 3, 5, skin, d=1.6)
    if kind in ('woman',):
        layers.append((hair, ['M 28 36 Q 28 14 50 14 Q 72 14 72 36 Q 62 24 50 26 Q 38 24 28 36 Z']))
    elif kind in ('man', 'beard'):
        layers += [(OUTLINE, ['M 27 38 Q 26 13 50 13 Q 74 13 73 38 Q 66 22 50 23 Q 34 22 27 38 Z']), (hair, ['M 29 34 Q 29 15.4 50 15.4 Q 71 15.4 71 34 Q 64 21 50 21 Q 36 21 29 34 Z'])]
    elif kind == 'person':
        layers.append((hair, ['M 29 34 Q 30 16 50 16 Q 70 16 71 34 Q 60 22 46 26 Q 36 26 29 34 Z']))
    elif kind == 'old_man':
        layers += [(OUTLINE, [ellipse(29, 32, 5, 9), ellipse(71, 32, 5, 9)]), (hair, [ellipse(29, 32, 3.4, 7.4), ellipse(71, 32, 3.4, 7.4)])]
        layers.append((tone(skin, 0.85), [rib(42, 24, 58, 24, 1.2), rib(44, 28, 56, 28, 1.2)]))
    elif kind == 'old_woman':
        layers.append((hair, ['M 28 38 Q 26 16 50 16 Q 74 16 72 38 Q 66 24 50 24 Q 34 24 28 38 Z']))
    elif kind == 'older':
        layers.append((hair, ['M 28 34 Q 28 17 50 17 Q 72 17 72 34 Q 62 26 50 25 Q 38 26 28 34 Z']))
    if kind == 'beard':
        layers += [(OUTLINE, ['M 28 42 Q 30 70 50 70 Q 70 70 72 42 Q 66 56 50 56 Q 34 56 28 42 Z']), (hair, ['M 30.4 45 Q 32 67.6 50 67.6 Q 68 67.6 69.6 45 Q 64 58.4 50 58.4 Q 36 58.4 30.4 45 Z'])]
    layers.append((feat, [ellipse(42, 40, 2.2, 3), ellipse(58, 40, 2.2, 3)]))
    if kind == 'beard':
        layers.append(('#b0473d', [curve(43, 54, 50, 58, 57, 54, 2)]))
    else:
        layers.append((feat, [curve(42, 51, 50, 57, 58, 51, 1.8)]))
        layers.append(((tone(skin, 0.8) if skin in (SKIN[4], SKIN[5]) else '#f48fb1'), [ellipse(35, 49, 3.4, 2.2), ellipse(65, 49, 3.4, 2.2)]))
    if kind in ('old_woman', 'older'):
        layers += [(OUTLINE, [circle(42, 40, 6.4), circle(58, 40, 6.4), rect(47, 39, 6, 1.6)]), ('#e3f2fd', [circle(42, 40, 4.8), circle(58, 40, 4.8)]), (feat, [ellipse(42, 40, 2, 2.6), ellipse(58, 40, 2, 2.6)])]
    if extra == 'farmer':
        layers += oval(50, 22, 34, 6, '#f2d78a', d=2) + [(OUTLINE, ['M 32 22 Q 32 2 50 2 Q 68 2 68 22 Z']), ('#f2d78a', ['M 34.4 21 Q 34.4 4.4 50 4.4 Q 65.6 4.4 65.6 21 Z']), ('#8d6e63', [rect(34, 16, 32, 4)])]
        layers += bar(84, 98, 90, 60, 1.6, '#c9a227')
        layers += [(OUTLINE, [ellipse(90, 56, 5, 10, 8)]), ('#e8c34a', [ellipse(90, 56, 3.4, 8.4, 8)]), ('#c9a227', [rib(88, 50, 92, 62, 1)])]
    if extra == 'cook':
        layers += [(OUTLINE, [circle(36, 12, 11), circle(50, 7, 12), circle(64, 12, 11), rect(32, 12, 36, 14)]), ('#fafafa', [circle(36, 12, 9), circle(50, 7, 10), circle(64, 12, 9), rect(34.4, 12, 31.2, 11.6)])]
    if extra == 'pilot':
        layers += [(OUTLINE, ['M 26 24 Q 28 6 50 6 Q 72 6 74 24 Z', rect(26, 22, 48, 6)]), ('#263238', ['M 28.4 22.4 Q 30 8.4 50 8.4 Q 70 8.4 71.6 22.4 Z']), ('#111111', [rect(28, 23.4, 44, 3.2)]), ('#fbc02d', [ellipse(50, 15, 4, 3)])]
    if extra == 'worker':
        layers += [(OUTLINE, ['M 24 26 Q 24 4 50 4 Q 76 4 76 26 Z', rect(20, 23, 60, 6)]), ('#fdd835', ['M 26.4 24 Q 26.4 6.4 50 6.4 Q 73.6 6.4 73.6 24 Z', rect(22, 24.4, 56, 3.2)]), ('#fbc02d', [rect(47, 6, 6, 18)])]
    return layers


def curly(skin, hair=HAIR_DARK):
    """La mujer de pelo crespo."""
    puffs = [(28, 30), (34, 18), (46, 12), (58, 12), (68, 18), (74, 30), (76, 44), (24, 44), (26, 58), (74, 58)]
    layers = [(OUTLINE, [circle(x, y, 11) for x, y in puffs]), (hair, [circle(x, y, 9) for x, y in puffs])]
    return layers + _curly_rest(skin, hair)


def _curly_rest(skin, hair):
    feat = '#2b1d14' if skin not in (SKIN[4], SKIN[5]) else '#140a05'
    base = [(OUTLINE, ['M 8 98 Q 8 70 34 66 L 66 66 Q 92 70 92 98 Z']), ('#ffb300', ['M 10.6 98 Q 11 72.4 34.4 68.4 L 65.6 68.4 Q 89 72.4 89.4 98 Z'])]
    base += shape([(42, 70), (42, 58), (58, 58), (58, 70)], skin, 1.8)
    base += oval(50, 40, 21, 24, skin)
    base.append((hair, [circle(36, 22, 7), circle(48, 18, 7), circle(60, 20, 7), circle(66, 28, 5)]))
    base.append((feat, [ellipse(42, 40, 2.2, 3), ellipse(58, 40, 2.2, 3), curve(42, 51, 50, 57, 58, 51, 1.8)]))
    base.append(((tone(skin, 0.8) if skin in (SKIN[4], SKIN[5]) else '#f48fb1'), [ellipse(35, 49, 3.4, 2.2), ellipse(65, 49, 3.4, 2.2)]))
    return base


def standing(skin=SKIN[None]):
    """Una persona de pie, de cuerpo entero."""
    layers = shape([(36, 94), (38, 60), (62, 60), (64, 94), (52, 94), (50, 72), (48, 94)], '#3949ab', 1.8)
    layers += shape([(34, 64), (32, 32), (68, 32), (66, 64)], '#43a047')
    layers += bar(32, 36, 24, 62, 6, '#43a047') + bar(68, 36, 76, 62, 6, '#43a047')
    layers += oval(24, 64, 4, 4, skin, d=1.6) + oval(76, 64, 4, 4, skin, d=1.6)
    layers += oval(50, 18, 12, 13, skin)
    layers.append((HAIR_DARK, ['M 38 16 Q 38 4 50 4 Q 62 4 62 16 Q 56 10 50 11 Q 44 10 38 16 Z']))
    layers.append(('#2b1d14', [circle(45, 18, 1.4), circle(55, 18, 1.4), curve(46, 23, 50, 26, 54, 23, 1.2)]))
    return layers


def e_cowboy():
    """La cara sonriente con sombrero llanero."""
    layers = oval(50, 58, 34, 34, '#fdd835')
    layers += oval(50, 30, 46, 8, '#a1693f') + [(OUTLINE, ['M 28 30 Q 28 4 50 4 Q 72 4 72 30 Z']), ('#a1693f', ['M 30.4 28.6 Q 30.4 6.4 50 6.4 Q 69.6 6.4 69.6 28.6 Z']), ('#5d4037', [rect(30, 22, 40, 4)])]
    layers.append(('#5d4037', [ellipse(38, 54, 3, 4.4), ellipse(62, 54, 3, 4.4), 'M 32 66 Q 50 86 68 66 Q 50 76 32 66 Z']))
    return layers


def hair_tuft(color, curly_hair=False):
    if curly_hair:
        puffs = [(30, 40), (42, 30), (56, 30), (70, 40), (36, 54), (50, 46), (64, 54)]
        return [(OUTLINE, [circle(x, y, 12) for x, y in puffs]), (color, [circle(x, y, 10) for x, y in puffs])]
    return [(OUTLINE, ['M 16 80 Q 10 20 50 18 Q 90 20 84 80 Q 74 44 50 44 Q 26 44 16 80 Z']), (color, ['M 19 74 Q 14 22.6 50 20.6 Q 86 22.6 81 74 Q 72 41.4 50 41.4 Q 28 41.4 19 74 Z'])]


def e_hair_white():
    """El pelo blanco."""
    return hair_tuft(HAIR_WHITE)


def e_hair_curly():
    """El pelo crespo."""
    return hair_tuft(HAIR_DARK, True)


def flag_frame(inner):
    return [(OUTLINE, [rect(6, 20, 88, 60)])] + inner


def e_flag_co():
    """La bandera de Colombia."""
    return flag_frame([('#fcd116', [rect(8, 22, 84, 28)]), ('#003893', [rect(8, 50, 84, 14)]), ('#ce1126', [rect(8, 64, 84, 14)])])


def e_flag_gb():
    """La bandera del Reino Unido."""
    return flag_frame([('#012169', [rect(8, 22, 84, 56)]),
                       ('#ffffff', [poly(8, 22, 16, 22, 92, 72, 92, 78, 84, 78, 8, 28), poly(92, 22, 84, 22, 8, 72, 8, 78, 16, 78, 92, 28)]),
                       ('#c8102e', [poly(8, 22, 11, 22, 92, 75, 92, 78, 89, 78, 8, 25), poly(92, 22, 89, 22, 8, 75, 8, 78, 11, 78, 92, 25)]),
                       ('#ffffff', [rect(42, 22, 16, 56), rect(8, 41, 84, 18)]), ('#c8102e', [rect(45, 22, 10, 56), rect(8, 44, 84, 12)])])


def e_flag_br():
    """La bandera de Brasil."""
    return flag_frame([('#009c3b', [rect(8, 22, 84, 56)]), ('#ffdf00', [poly(50, 26, 88, 50, 50, 74, 12, 50)]), ('#002776', [circle(50, 50, 14)]),
                       ('#ffffff', [curve(37, 47, 50, 42, 63, 52, 2)])])


def e_flag_fr():
    """La bandera de Francia."""
    return flag_frame([('#0055a4', [rect(8, 22, 28, 56)]), ('#ffffff', [rect(36, 22, 28, 56)]), ('#ef4135', [rect(64, 22, 28, 56)])])



# ---------- Cundinamarca · Las Flores de la Sabana (v4.4) ----------

ROSE, ROSE_D, ROSE_L = '#d81b3c', '#9e0f2a', '#f06275'


def rose_head(cx, cy, r, color=ROSE):
    """Una rosa vista de lado: el botón con sus pétalos envueltos y los dos de afuera abiertos."""
    dark, light = tone(color, 0.7), tone(color, 1.35)
    layers = [(OUTLINE, [f'M {cx - r * 1.15:.2f} {cy - r * 0.1:.2f} Q {cx - r * 1.2:.2f} {cy + r * 0.95:.2f} {cx:.2f} {cy + r * 1.05:.2f} Q {cx + r * 1.2:.2f} {cy + r * 0.95:.2f} {cx + r * 1.15:.2f} {cy - r * 0.1:.2f} Q {cx + r * 0.9:.2f} {cy - r * 1.2:.2f} {cx:.2f} {cy - r * 1.15:.2f} Q {cx - r * 0.9:.2f} {cy - r * 1.2:.2f} {cx - r * 1.15:.2f} {cy - r * 0.1:.2f} Z'])]
    layers.append((color, [f'M {cx - r:.2f} {cy - r * 0.05:.2f} Q {cx - r * 1.05:.2f} {cy + r * 0.85:.2f} {cx:.2f} {cy + r * 0.92:.2f} Q {cx + r * 1.05:.2f} {cy + r * 0.85:.2f} {cx + r:.2f} {cy - r * 0.05:.2f} Q {cx + r * 0.8:.2f} {cy - r * 1.02:.2f} {cx:.2f} {cy - r:.2f} Q {cx - r * 0.8:.2f} {cy - r * 1.02:.2f} {cx - r:.2f} {cy - r * 0.05:.2f} Z']))
    layers.append((dark, [f'M {cx - r * 0.55:.2f} {cy - r * 0.35:.2f} Q {cx:.2f} {cy + r * 0.2:.2f} {cx + r * 0.55:.2f} {cy - r * 0.35:.2f} Q {cx + r * 0.3:.2f} {cy - r * 0.05:.2f} {cx:.2f} {cy:.2f} Q {cx - r * 0.3:.2f} {cy - r * 0.05:.2f} {cx - r * 0.55:.2f} {cy - r * 0.35:.2f} Z',
                           f'M {cx - r * 0.9:.2f} {cy + r * 0.1:.2f} Q {cx - r * 0.3:.2f} {cy + r * 0.75:.2f} {cx + r * 0.2:.2f} {cy + r * 0.6:.2f} Q {cx - r * 0.35:.2f} {cy + r * 0.45:.2f} {cx - r * 0.9:.2f} {cy + r * 0.1:.2f} Z']))
    layers.append((light, [f'M {cx - r * 0.4:.2f} {cy - r * 0.75:.2f} Q {cx:.2f} {cy - r * 0.95:.2f} {cx + r * 0.35:.2f} {cy - r * 0.7:.2f} Q {cx:.2f} {cy - r * 0.6:.2f} {cx - r * 0.4:.2f} {cy - r * 0.75:.2f} Z']))
    return layers


def rose_stem(x0, y0, x1, y1, w=2.4, leaves=()):
    """El tallo largo de la rosa de exportación, con sus hojas dentadas."""
    layers = bar(x0, y0, x1, y1, w, '#3f7f3a', 1.2)
    for lx, ly, ex, ey in leaves:
        layers += [(OUTLINE, [leaf(lx, ly, ex, ey, 4.2)]), ('#4e9a3e', [leaf(lx, ly, ex, ey, 3)]), ('#2e6b2a', [rib(lx, ly, ex - (ex - lx) * 0.2, ey - (ey - ly) * 0.2, 0.8)])]
    return layers


def rosal():
    """El invernadero de rosas: la nave de plástico sobre los rosales en flor."""
    layers = [(OUTLINE, [rect(4, 84, 92, 10)]), ('#6d4c41', [rect(5.4, 85.4, 89.2, 7.2)])]
    for x in (18, 38, 58, 78):
        layers += rose_stem(x, 86, x, 52, 2, [(x, 72, x - 9, 66), (x, 66, x + 9, 60)])
    for x, y in ((18, 48), (38, 44), (58, 48), (78, 44)):
        layers += rose_head(x, y, 7)
    # La nave de plástico, transparente, con los arcos.
    layers.append(('#dff2f7', ['M 6 86 L 6 34 Q 50 2 94 34 L 94 86 L 90 86 L 90 36 Q 50 8 10 36 L 10 86 Z']))
    layers.append((OUTLINE, ['M 4 86 L 4 33 Q 50 -1 96 33 L 96 86 L 94 86 L 94 34 Q 50 2 6 34 L 6 86 Z', rect(48.8, 4, 2.4, 82)]))
    return layers


def rosa():
    """Una rosa roja de tallo largo."""
    return rose_stem(52, 96, 48, 40, 3, [(50, 70, 32, 60), (49, 58, 66, 50)]) + rose_head(48, 28, 20)


def rosas_cortadas():
    """Las rosas recién cortadas, con los tallos largos, sobre la mesa de corte."""
    layers = [(OUTLINE, [poly(4, 74, 96, 74, 92, 86, 8, 86)]), ('#a1693f', [poly(6.4, 75.6, 93.6, 75.6, 90.4, 84.4, 9.6, 84.4)])]
    for i, (x0, y0, x1, y1) in enumerate(((10, 70, 70, 52), (14, 66, 76, 40), (12, 60, 66, 30))):
        layers += rose_stem(x0, y0, x1, y1, 2.4, [((x0 + x1) / 2, (y0 + y1) / 2, (x0 + x1) / 2 - 4, (y0 + y1) / 2 - 9)])
        layers += rose_head(x1 + 7, y1 - 4, 9)
    layers += [(OUTLINE, [rect(72, 60, 22, 6, -20)]), ('#b0bec5', [rect(73, 61, 20, 4, -20)])]
    return layers


def rosa_hidratada():
    """Las rosas puestas en la tina de agua con la solución que las hidrata."""
    layers = []
    for x, y in ((34, 26), (52, 18), (68, 28)):
        layers += rose_stem(x, 60, x, y + 6, 2.4)
        layers += rose_head(x, y, 9)
    layers += [(OUTLINE, ['M 18 50 L 82 50 L 76 94 L 24 94 Z']), ('#4fc3f7', ['M 20.6 52.4 L 79.4 52.4 L 74 91.6 L 26 91.6 Z']), ('#b3e5fc', ['M 20.6 52.4 L 79.4 52.4 L 78.6 58 L 21.4 58 Z']), ('#e1f5fe', [ellipse(32, 72, 3, 9, 8)])]
    return layers


def rosa_clasificada():
    """Las rosas clasificadas por el largo del tallo, en la regla de medir."""
    layers = [(OUTLINE, [rect(6, 80, 88, 12)]), ('#fdd835', [rect(7.4, 81.4, 85.2, 9.2)])]
    layers.append(('#3e2723', [rect(8 + i * 8.4, 81.4, 1.2, 4 if i % 2 else 7) for i in range(11)]))
    for x, top, c in ((22, 26, ROSE), (44, 34, '#f06292'), (66, 42, '#fafafa'), (84, 50, '#fbc02d')):
        layers += rose_stem(x, 80, x, top + 6, 2.4, [(x, 64, x + 8, 58)])
        layers += rose_head(x, top, 7.5, c)
    return layers


def bonche_rosas():
    """El bonche: veinticinco rosas apretadas, envueltas en el cartón corrugado."""
    layers = []
    for x, y in ((34, 20), (50, 14), (66, 20), (42, 30), (58, 30)):
        layers += rose_head(x, y, 9)
    layers += [(OUTLINE, ['M 22 28 L 78 28 L 64 76 L 36 76 Z']), ('#f5e6c8', ['M 25 30.4 L 75 30.4 L 62.2 73.6 L 37.8 73.6 Z'])]
    layers.append(('#d7bf94', [rib(30 + i * 7, 32, 38 + i * 4, 72, 1.2) for i in range(6)]))
    layers += bar(46, 74, 44, 96, 2.4, '#3f7f3a', 1.2) + bar(54, 74, 56, 96, 2.4, '#3f7f3a', 1.2) + bar(50, 74, 50, 96, 2.4, '#3f7f3a', 1.2)
    layers += [(OUTLINE, [rect(38, 64, 24, 6)]), ('#e53935', [rect(39.4, 65.4, 21.2, 3.2)])]
    return layers


def ramo_rosas():
    """El ramo de rosas listo para regalar, con su papel y el moño."""
    layers = rose_stem(50, 70, 46, 96, 2.4) + rose_stem(50, 70, 54, 96, 2.4)
    layers += [(OUTLINE, ['M 20 30 L 80 30 L 56 80 L 44 80 Z']), ('#f8bbd0', ['M 23.4 32.4 L 76.6 32.4 L 54.6 77.6 L 45.4 77.6 Z']), ('#f48fb1', ['M 50 32.4 L 76.6 32.4 L 54.6 77.6 Z'])]
    for x, y, c in ((32, 26, ROSE), (50, 18, '#f06292'), (68, 26, ROSE), (40, 34, '#f06292'), (60, 34, ROSE)):
        layers += rose_head(x, y, 9, c)
    layers += [(OUTLINE, [ellipse(42, 78, 8, 5, -25), ellipse(58, 78, 8, 5, 25)]), ('#e53935', [ellipse(42, 78, 6.4, 3.4, -25), ellipse(58, 78, 6.4, 3.4, 25)]), (OUTLINE, [circle(50, 78, 4)]), ('#c62828', [circle(50, 78, 2.6)])]
    return layers


def caja_flores():
    """La caja larga de exportación, con los bonches adentro y el sello del avión."""
    layers = []
    for x in (30, 48, 66):
        layers += rose_head(x, 32, 8)
    layers += [(OUTLINE, [poly(6, 40, 94, 40, 94, 84, 6, 84)]), ('#c8a26a', [poly(8, 42, 92, 42, 92, 82, 8, 82)]), ('#b08850', [rect(8, 42, 84, 6)])]
    layers += [(OUTLINE, [poly(6, 40, 20, 28, 86, 28, 94, 40)]), ('#d9b97f', [poly(10, 39, 22, 30, 84, 30, 90, 39)])]
    layers += [(OUTLINE, [rect(54, 56, 30, 18)]), ('#fafafa', [rect(55.4, 57.4, 27.2, 15.2)])]
    layers.append(('#1e88e5', [pts(rot_pts([(69, 58), (71, 64), (80, 66), (80, 68), (71, 67), (70, 72), (72, 73), (72, 74), (66, 73), (66, 72), (68, 71), (67, 67), (58, 68), (58, 66), (67, 64)], 0))]))
    layers.append(('#e53935', [rect(14, 56, 32, 4), rect(14, 64, 24, 4)]))
    return layers



# ---------- Cundinamarca · Los Freseros de Sibaté (v4.4) ----------

def strawberry(cx, cy, s=1.0, color='#e53935', rot=0, seeds=True, leaves=True):
    """Una fresa: el corazón rojo con sus semillas amarillas y la corona de hojas verdes."""
    def P(x, y):
        a = math.radians(rot)
        return (cx + (x * math.cos(a) - y * math.sin(a)) * s, cy + (x * math.sin(a) + y * math.cos(a)) * s)
    def path(pts_):
        (x0, y0), *rest = pts_
        out = f'M {x0:.2f} {y0:.2f}'
        for i in range(0, len(rest), 2):
            (qx, qy), (x1, y1) = rest[i], rest[i + 1]
            out += f' Q {qx:.2f} {qy:.2f} {x1:.2f} {y1:.2f}'
        return out + ' Z'
    body = [P(-10, -6), P(-12, 4), P(0, 14), P(12, 4), P(10, -6), P(0, -10), P(-10, -6)]
    outline = [P(-11.8, -6.8), P(-14, 4.5), P(0, 16.4), P(14, 4.5), P(11.8, -6.8), P(0, -12), P(-11.8, -6.8)]
    layers = [(OUTLINE, [path(outline)]), (color, [path(body)]), (tone(color, 1.3), [ellipse(*P(-4, -2), 2.2 * s, 4 * s, rot + 20)])]
    if seeds:
        layers.append(('#ffe082', [ellipse(*P(x, y), 0.8 * s, 1.2 * s, rot) for x, y in ((-5, 0), (0, -3), (5, 0), (-6, 5), (0, 3), (6, 5), (-2, 9), (3, 9), (0, 12))]))
    if leaves:
        lv = [leaf(*P(0, -8), *P(dx, dy), 2.8 * s) for dx, dy in ((-10, -10), (10, -10), (-4, -14), (4, -14))]
        layers += [(OUTLINE, [leaf(*P(0, -8), *P(dx * 1.12, dy * 1.12), 3.8 * s) for dx, dy in ((-10, -10), (10, -10), (-4, -14), (4, -14))]), ('#43a047', lv)]
    return layers


def fresal():
    """El fresal: las matas sobre el lomo cubierto de plástico, bajo el macrotúnel."""
    layers = [(OUTLINE, ['M 4 86 Q 50 70 96 86 L 96 94 L 4 94 Z']), ('#37474f', ['M 6 87 Q 50 72.6 94 87 L 94 92 L 6 92 Z'])]
    for x in (20, 50, 80):
        layers += [(OUTLINE, [circle(x - 7, 70, 9), circle(x + 7, 70, 9), circle(x, 62, 10)]), ('#43a047', [circle(x - 7, 70, 7.5), circle(x + 7, 70, 7.5), circle(x, 62, 8.5)])]
        layers.append(('#2e7d32', [rib(x, 72, x, 58, 1), rib(x - 7, 72, x - 11, 66, 1), rib(x + 7, 72, x + 11, 66, 1)]))
        layers += strawberry(x - 6, 80, 0.45, leaves=False) + strawberry(x + 7, 79, 0.42, leaves=False)
    layers.append(('#e8f2f6', ['M 4 86 L 4 40 Q 50 6 96 40 L 96 86 L 92 86 L 92 42 Q 50 12 8 42 L 8 86 Z']))
    layers.append((OUTLINE, ['M 2 86 L 2 39 Q 50 3 98 39 L 98 86 L 96 86 L 96 40 Q 50 6 4 40 L 4 86 Z']))
    return layers


def fresa():
    """Una fresa roja con su corona."""
    return strawberry(50, 54, 3)


def fresa_lavada():
    """Las fresas lavadas en el colador, escurriendo agua."""
    layers = []
    for x, y, r in ((36, 40, -15), (54, 34, 10), (66, 46, 25)):
        layers += strawberry(x, y, 1.3, rot=r)
    layers += [(OUTLINE, ['M 8 48 L 92 48 Q 88 92 50 92 Q 12 92 8 48 Z']), ('#eceff1', ['M 11 50.6 L 89 50.6 Q 85.4 89.4 50 89.4 Q 14.6 89.4 11 50.6 Z'])]
    layers.append(('#b0bec5', [circle(30 + (i % 5) * 10, 62 + (i // 5) * 10, 2) for i in range(10)]))
    layers += [(OUTLINE, [rect(2, 46, 10, 6), rect(88, 46, 10, 6)]), ('#cfd8dc', [rect(3.4, 47.4, 7.2, 3.2), rect(89.4, 47.4, 7.2, 3.2)])]
    layers.append(('#4fc3f7', [drop_path(34, 97, 0.12), drop_path(50, 98, 0.14), drop_path(66, 97, 0.12)]))
    return layers


def fresa_seleccionada():
    """Las fresas grandes, escogidas una por una, en la canastilla."""
    layers = []
    for x, y in ((26, 36), (44, 30), (62, 32), (78, 38), (36, 44), (54, 42), (70, 46)):
        layers += strawberry(x, y, 1.05)
    layers += [(OUTLINE, [poly(6, 46, 94, 46, 88, 90, 12, 90)]), ('#43a047', [poly(9, 48.6, 91, 48.6, 85.6, 87.4, 14.4, 87.4)])]
    layers.append(('#2e7d32', [rect(14 + i * 9, 54, 4, 28) for i in range(8)]))
    return layers


def bandeja_fresas():
    """La bandeja de fresas, tapada con su plástico transparente y la etiqueta."""
    layers = [(OUTLINE, [poly(6, 56, 94, 56, 88, 86, 12, 86)]), ('#eceff1', [poly(8.6, 58.4, 91.4, 58.4, 86, 83.4, 14, 83.4)])]
    for x, y in ((22, 50), (38, 46), (54, 48), (70, 46), (84, 50), (30, 56), (46, 56), (62, 56), (76, 56)):
        layers += strawberry(x, y, 0.75, leaves=y < 52)
    layers.append(('#e1f5fe', ['M 6 56 Q 50 28 94 56 Z']))
    layers.append((OUTLINE, ['M 6 56 Q 50 26 94 56 L 94 57.6 Q 50 29.6 6 57.6 Z']))
    layers += [(OUTLINE, [rect(36, 66, 28, 12)]), ('#fafafa', [rect(37.4, 67.4, 25.2, 9.2)]), ('#e53935', [rect(40, 70, 20, 3)])]
    return layers


def fresas_crema():
    """El vaso de fresas con crema, como en Sibaté: la crema batida, las fresas picadas y la cucharita."""
    layers = [(OUTLINE, ['M 22 44 L 78 44 L 68 94 L 32 94 Z']), ('#fafafa', ['M 25 46.4 L 75 46.4 L 65.8 91.6 L 34.2 91.6 Z'])]
    layers.append(('#ef5350', [poly(28, 60, 72, 60, 70, 70, 30, 70), poly(31, 80, 69, 80, 67.6, 88, 32.4, 88)]))
    layers.append(('#fff3e0', [poly(29.5, 70, 70.5, 70, 69, 80, 31, 80)]))
    layers += [(OUTLINE, [circle(36, 40, 11), circle(50, 34, 13), circle(64, 40, 11)]), ('#fff8e7', [circle(36, 40, 9), circle(50, 34, 11), circle(64, 40, 9)])]
    layers += strawberry(50, 20, 0.9)
    layers += bar(66, 32, 86, 10, 2.4, '#b0bec5', 1.2)
    return layers


def fresa_segunda():
    """La fresa de segunda: las pequeñas y las magulladas, que van para la mermelada."""
    layers = []
    for x, y, r, c in ((30, 50, -20, '#c62828'), (60, 44, 15, '#e53935'), (46, 68, 5, '#d84315'), (72, 66, -10, '#c62828')):
        layers += strawberry(x, y, 1.2, color=c, rot=r)
    layers.append(('#7b1f1f', [ellipse(64, 48, 3, 2), ellipse(28, 54, 2.4, 2)]))
    return layers


def mermelada_fresa():
    """El frasco de mermelada de fresa, con su tapa de cuadros."""
    layers = [(OUTLINE, ['M 24 30 L 76 30 L 80 40 Q 84 52 82 70 Q 80 92 50 92 Q 20 92 18 70 Q 16 52 20 40 Z']), ('#c62828', ['M 26.4 32.4 L 73.6 32.4 L 77.4 41 Q 81.4 52 79.6 70 Q 78 89.4 50 89.4 Q 22 89.4 20.4 70 Q 18.6 52 22.6 41 Z'])]
    layers.append(('#ef9a9a', [ellipse(32, 60, 3.4, 12, 6)]))
    layers += [(OUTLINE, [rect(18, 14, 64, 20)]), ('#fafafa', [rect(19.6, 15.6, 60.8, 16.8)])]
    layers.append(('#e53935', [rect(19.6 + i * 15.2, 15.6 + (j * 8.4), 7.6, 8.4) for i in range(4) for j in range(2) if (i + j) % 2 == 0]))
    layers += [(OUTLINE, [rect(30, 54, 40, 22)]), ('#fffde7', [rect(31.4, 55.4, 37.2, 19.2)])]
    layers += strawberry(50, 64, 0.5)
    return layers



# ---------- Cundinamarca · Las Truchas de Guatavita (v4.4) ----------

def trout(cx, cy, s=1.0, flip=False, body='#8d9c6a', clean=False):
    """La trucha arcoíris de lado: el lomo verde oliva con pintas, la franja rosada y la aleta de la cola."""
    f = -1 if flip else 1
    def X(x):
        return cx + f * x * s
    def Y(y):
        return cy + y * s
    out_body = f'M {X(-34):.2f} {Y(0):.2f} Q {X(-20):.2f} {Y(-16):.2f} {X(8):.2f} {Y(-14):.2f} Q {X(26):.2f} {Y(-12):.2f} {X(34):.2f} {Y(-2):.2f} Q {X(26):.2f} {Y(10):.2f} {X(8):.2f} {Y(12):.2f} Q {X(-20):.2f} {Y(14):.2f} {X(-34):.2f} {Y(0):.2f} Z'
    in_body = f'M {X(-31):.2f} {Y(0):.2f} Q {X(-19):.2f} {Y(-13.6):.2f} {X(8):.2f} {Y(-11.6):.2f} Q {X(24):.2f} {Y(-10):.2f} {X(31):.2f} {Y(-2):.2f} Q {X(24):.2f} {Y(8):.2f} {X(8):.2f} {Y(9.6):.2f} Q {X(-19):.2f} {Y(11.6):.2f} {X(-31):.2f} {Y(0):.2f} Z'
    tail_o = pts([(X(-30), Y(0)), (X(-46), Y(-12)), (X(-42), Y(0)), (X(-46), Y(12))])
    tail_i = pts([(X(-31), Y(0)), (X(-43.4), Y(-8.6)), (X(-40), Y(0)), (X(-43.4), Y(8.6))])
    layers = [(OUTLINE, [tail_o, out_body]), (body if not clean else '#cfd8dc', [tail_i, in_body])]
    if clean:
        layers.append(('#f8bbd0', [f'M {X(-26):.2f} {Y(2):.2f} Q {X(0):.2f} {Y(8):.2f} {X(26):.2f} {Y(1):.2f} Q {X(0):.2f} {Y(5):.2f} {X(-26):.2f} {Y(2):.2f} Z']))
    else:
        layers.append(('#e8f0dc', [f'M {X(-28):.2f} {Y(3):.2f} Q {X(0):.2f} {Y(12):.2f} {X(28):.2f} {Y(1):.2f} Q {X(0):.2f} {Y(7):.2f} {X(-28):.2f} {Y(3):.2f} Z']))
        layers.append(('#f06292', [f'M {X(-28):.2f} {Y(0):.2f} Q {X(0):.2f} {Y(2):.2f} {X(28):.2f} {Y(-2):.2f} Q {X(0):.2f} {Y(5):.2f} {X(-28):.2f} {Y(0):.2f} Z']))
        layers.append(('#3e4a2a', [circle(X(x), Y(y), 1.1 * s) for x, y in ((-18, -6), (-10, -9), (-2, -7), (6, -10), (14, -7), (-14, -3), (2, -3), (-24, -2), (18, -4))]))
    layers.append(('#ffffff', [circle(X(24), Y(-5), 3.2 * s)]))
    layers.append(('#1b1b1b', [circle(X(24.6), Y(-5), 1.8 * s)]))
    layers.append((tone(body, 0.75), [pts([(X(2), Y(-11)), (X(10), Y(-20)), (X(14), Y(-11))])]))
    return layers


def estanques_trucha():
    """Los estanques de agua fría donde se crían las truchas, con el chorro que entra y una trucha saltando."""
    layers = [(OUTLINE, [poly(4, 48, 96, 48, 96, 92, 4, 92)]), ('#9e9e9e', [poly(6, 50, 94, 50, 94, 90, 6, 90)])]
    layers += [('#4fc3f7', [rect(10, 54, 36, 32), rect(54, 54, 36, 32)]), ('#81d4fa', [rib(14, 62, 30, 62, 1.6), rib(60, 74, 80, 74, 1.6), rib(18, 78, 36, 78, 1.6)])]
    layers += bar(4, 30, 30, 30, 4, '#78909c') + [('#4fc3f7', [poly(28, 30, 32, 30, 34, 54, 26, 54)])]
    layers += trout(66, 34, 0.55, flip=True)
    layers.append(('#e1f5fe', [ellipse(66, 52, 10, 2.4)]))
    return layers


def trucha():
    """Una trucha arcoíris."""
    return trout(54, 52, 1.25)


def trucha_limpia():
    """La trucha limpia, abierta, sobre la tabla."""
    layers = [(OUTLINE, [rect(8, 60, 84, 24, -6)]), ('#c8a26a', [rect(10, 62, 80, 20, -6)])]
    return layers + trout(52, 52, 1.05, clean=True)


def filete_trucha():
    """Los filetes rosados de trucha, sin espinas."""
    layers = [(OUTLINE, [rect(6, 70, 88, 14)]), ('#eceff1', [rect(7.4, 71.4, 85.2, 11.2)])]
    for k, (cx, cy) in enumerate(((34, 48), (66, 40))):
        layers += [(OUTLINE, [f'M {cx - 28} {cy + 6} Q {cx - 10} {cy - 16} {cx + 26} {cy - 6} Q {cx + 30} {cy + 4} {cx + 18} {cy + 10} Q {cx - 6} {cy + 16} {cx - 28} {cy + 6} Z']),
                   ('#f8a5a5', [f'M {cx - 24} {cy + 5} Q {cx - 9} {cy - 13} {cx + 23} {cy - 5} Q {cx + 26.6} {cy + 3} {cx + 16} {cy + 7.6} Q {cx - 6} {cy + 13} {cx - 24} {cy + 5} Z'])]
        layers.append(('#fce4ec', [rib(cx - 18 + i * 9, cy + 6 - i, cx - 12 + i * 9, cy - 6 - i, 1.6) for i in range(5)]))
    return layers


def ceviche_trucha():
    """La copa de ceviche de trucha, con cebolla morada, cilantro y el limón."""
    layers = [(OUTLINE, ['M 14 40 L 86 40 Q 82 74 50 76 Q 18 74 14 40 Z']), ('#e1f5fe', ['M 17 42.6 L 83 42.6 Q 79.4 71.6 50 73.4 Q 20.6 71.6 17 42.6 Z'])]
    layers += bar(50, 76, 50, 90, 4, '#e1f5fe', 1.6) + oval(50, 92, 18, 4, '#e1f5fe', d=1.6)
    layers.append(('#f8bbd0', [ellipse(36, 50, 7, 5), ellipse(52, 48, 7, 5), ellipse(66, 52, 7, 5), ellipse(44, 58, 7, 5), ellipse(60, 60, 6, 4.4)]))
    layers.append(('#8e24aa', [rib(30, 56, 38, 52, 1.6), rib(56, 54, 64, 50, 1.6), rib(46, 64, 54, 62, 1.6)]))
    layers.append(('#43a047', [leaf(40, 46, 46, 40, 2), leaf(62, 46, 68, 40, 2), leaf(52, 62, 58, 56, 2)]))
    layers += oval(76, 34, 11, 11, '#9ccc65') + [('#dcedc8', [circle(76, 34, 7.6)]), ('#9ccc65', [rib(76, 27, 76, 41, 1), rib(69, 34, 83, 34, 1), rib(71, 29, 81, 39, 1), rib(81, 29, 71, 39, 1)])]
    return layers


def trucha_ahumada():
    """La trucha ahumada, dorada por el humo, colgada del gancho."""
    layers = bar(50, 4, 50, 16, 2.4, '#8d6e63') + [(OUTLINE, [f'M 44 16 Q 50 10 56 16 L 54 18 Q 50 14 46 18 Z'])]
    layers += trout(50, 54, 1.0, body='#b8742a')
    layers.append(('#ffcc80', [ellipse(46, 46, 14, 3, -5)]))
    layers.append(('#cfd8dc', [f'M 20 30 Q 14 22 22 16 Q 18 24 24 28 Z', f'M 78 30 Q 84 22 76 16 Q 80 24 74 28 Z']))
    return layers


def almuerzo_trucha():
    """El almuerzo de trucha frita con papa salada, ensalada y el limón."""
    layers = oval(50, 64, 46, 22, '#fafafa') + [('#eceff1', [ellipse(50, 64, 38, 16)]), ('#fafafa', [ellipse(50, 64, 35, 14)])]
    layers += trout(46, 58, 0.72, body='#c08a3e')
    for x, y in ((74, 70), (80, 62), (68, 76)):
        layers += oval(x, y, 5.4, 4.4, '#e6c26a', d=1.2) + [('#fafafa', [circle(x - 1.4, y - 1, 1.1)])]
    layers.append(('#66bb6a', [leaf(20, 70, 30, 76, 4), leaf(24, 66, 34, 72, 4)]))
    layers += oval(26, 54, 6, 6, '#9ccc65', d=1.4) + [('#dcedc8', [circle(26, 54, 3.6)])]
    return layers



# ---------- Cundinamarca · Las Salinas de Nemocón (v4.4) ----------

SALT, SALT_D = '#f4f1ea', '#cfc8bb'


def salt_rock(cx, cy, s=1.0, color='#e8e2d6'):
    """Un trozo de roca de sal: facetado, blanco grisáceo, con vetas."""
    p = [(cx - 14 * s, cy + 8 * s), (cx - 16 * s, cy - 2 * s), (cx - 6 * s, cy - 12 * s), (cx + 8 * s, cy - 11 * s), (cx + 16 * s, cy - 1 * s), (cx + 12 * s, cy + 10 * s)]
    layers = shape(p, color, 2)
    layers.append((tone(color, 0.85), [poly(cx - 6 * s, cy - 12 * s, cx + 8 * s, cy - 11 * s, cx + 2 * s, cy - 2 * s, cx - 4 * s, cy - 3 * s), poly(cx + 2 * s, cy - 2 * s, cx + 16 * s, cy - 1 * s, cx + 12 * s, cy + 10 * s, cx + 4 * s, cy + 6 * s)]))
    layers.append(('#ffffff', [poly(cx - 13 * s, cy - 1 * s, cx - 6 * s, cy - 9 * s, cx - 4 * s, cy - 6 * s, cx - 10 * s, cy + 1 * s)]))
    layers.append(('#b0a898', [rib(cx - 10 * s, cy + 4 * s, cx + 2 * s, cy - 2 * s, 0.8 * s)]))
    return layers


def socavon_sal():
    """La boca del socavón en la montaña de sal, con sus vigas y la vagoneta cargada."""
    layers = [(OUTLINE, ['M 2 90 L 2 52 Q 18 18 50 14 Q 82 18 98 52 L 98 90 Z']), ('#a1887f', ['M 4.4 88 L 4.4 52.6 Q 19.6 21 50 17 Q 80.4 21 95.6 52.6 L 95.6 88 Z'])]
    layers.append(('#bcaaa4', ['M 10 50 Q 24 26 50 22 Q 40 34 30 52 Z']))
    layers += [(OUTLINE, ['M 30 90 L 30 54 Q 50 38 70 54 L 70 90 Z']), ('#2b1d14', ['M 33 88 L 33 55.4 Q 50 42 67 55.4 L 67 88 Z'])]
    layers += bar(31, 90, 31, 54, 4, '#8d6e4a') + bar(69, 90, 69, 54, 4, '#8d6e4a') + bar(28, 54, 72, 54, 4, '#8d6e4a')
    layers.append(('#ffe082', [circle(50, 62, 2.4)]))
    layers += [(OUTLINE, [rect(36, 92, 30, 2.4), rect(38, 96, 26, 2)])]
    layers += shape([(40, 90), (60, 90), (58, 78), (42, 78)], '#607d8b', 1.6)
    layers += salt_rock(46, 74, 0.35) + salt_rock(55, 75, 0.3)
    layers += wheel(44, 92, 2.6) + wheel(56, 92, 2.6)
    return layers


def roca_sal():
    """La roca de sal, recién sacada del socavón."""
    return salt_rock(50, 54, 2.6)


def salmuera():
    """El balde de salmuera: el agua con la sal disuelta, con los cristalitos en el borde."""
    layers = [(OUTLINE, ['M 18 32 L 82 32 L 74 92 L 26 92 Z']), ('#90a4ae', ['M 20.6 34.4 L 79.4 34.4 L 71.8 89.6 L 28.2 89.6 Z'])]
    layers.append(('#b3e5fc', ['M 21.6 40 L 78.4 40 L 77.8 44 L 22.2 44 Z']))
    layers.append(('#4fc3f7', ['M 22.2 44 L 77.8 44 L 71.8 89.6 L 28.2 89.6 Z']))
    layers.append(('#ffffff', [rect(28 + i * 9, 36 + (i % 2), 4, 3, 45) for i in range(6)]))
    layers += [(OUTLINE, ['M 18 32 Q 50 4 82 32 L 79 32 Q 50 8 21 32 Z'])]
    layers.append(('#e1f5fe', [ellipse(34, 64, 3, 12, 8)]))
    return layers


def bloque_sal():
    """El bloque de sal cortado para tallar."""
    layers = [(OUTLINE, [poly(14, 40, 50, 24, 88, 38, 88, 76, 52, 94, 14, 78)])]
    layers.append((SALT, [poly(16.4, 41.6, 50, 26.6, 85.6, 39.6, 52, 55, 16.4, 42)]))
    layers.append((SALT_D, [poly(52, 55, 85.6, 39.6, 85.6, 75, 52, 91)]))
    layers.append(('#e2dccf', [poly(16.4, 42, 52, 55, 52, 91, 16.4, 76.6)]))
    layers.append(('#b0a898', [rib(24, 60, 44, 68, 1), rib(60, 70, 80, 60, 1)]))
    return layers


def figura_sal():
    """La figura tallada en sal: una cruz pequeña sobre su base, como las de la mina."""
    layers = shape([(22, 92), (78, 92), (72, 78), (28, 78)], SALT_D, 2)
    layers += shape([(42, 78), (42, 46), (24, 46), (24, 36), (42, 36), (42, 16), (58, 16), (58, 36), (76, 36), (76, 46), (58, 46), (58, 78)], SALT, 2.2)
    layers.append(('#ffffff', [rect(45, 20, 3, 54), rect(28, 39, 44, 2.4)]))
    layers.append(('#b0a898', [rib(54, 50, 54, 74, 1)]))
    return layers


def sal_refinada():
    """El costalito de sal refinada, abierto, con la sal blanca y fina."""
    layers = [(OUTLINE, ['M 22 36 Q 16 64 22 92 L 78 92 Q 84 64 78 36 Z']), ('#e8d8b8', ['M 24.4 38.4 Q 18.6 64 24.4 89.6 L 75.6 89.6 Q 81.4 64 75.6 38.4 Z'])]
    layers += [(OUTLINE, [ellipse(50, 36, 30, 10)]), ('#ffffff', [ellipse(50, 36, 27.6, 7.8)]), ('#eeeeee', [ellipse(50, 30, 16, 6)])]
    layers += [(OUTLINE, [rect(30, 58, 40, 18)]), ('#fafafa', [rect(31.4, 59.4, 37.2, 15.2)]), ('#1e88e5', [rect(36, 64, 28, 4)])]
    return layers


def pan_sal():
    """El pan de sal de los muiscas: el cono de sal compacta que salía de la gacha de barro."""
    layers = [(OUTLINE, ['M 50 8 L 82 86 Q 50 98 18 86 Z']), (SALT, ['M 50 13 L 79 84.6 Q 50 95.4 21 84.6 Z'])]
    layers.append((SALT_D, ['M 50 13 L 79 84.6 Q 66 91 54 92.6 Z']))
    layers.append(('#ffffff', ['M 46 22 L 34 70 L 38 70 L 48 26 Z']))
    layers += [(OUTLINE, [ellipse(72, 84, 14, 6)]), ('#a1693f', [ellipse(72, 84, 12, 4.4)])]
    return layers


def cofre_sal():
    """El cofre de regalo: la cajita de madera con la sal y la figurita tallada."""
    layers = [(OUTLINE, [poly(8, 50, 92, 50, 92, 90, 8, 90)]), ('#a1693f', [poly(10.4, 52.4, 89.6, 52.4, 89.6, 87.6, 10.4, 87.6)])]
    layers.append(('#8d5a32', [rect(10.4, 70, 79.2, 3)]))
    layers += [(OUTLINE, [poly(8, 50, 16, 16, 84, 16, 92, 50)]), ('#c08b5c', [poly(11, 48, 18, 19, 82, 19, 89, 48)])]
    layers.append(('#ffffff', [ellipse(32, 50, 16, 5), ellipse(68, 50, 14, 5)]))
    layers += shape([(46, 52), (46, 34), (38, 34), (38, 28), (46, 28), (46, 20), (54, 20), (54, 28), (62, 28), (62, 34), (54, 34), (54, 52)], SALT, 1.6)
    layers += [(OUTLINE, [rect(44, 64, 12, 12)]), ('#fbc02d', [rect(45.4, 65.4, 9.2, 9.2)])]
    return layers


def canasta_sabanera():
    """La canasta de regalo de la Sabana: el pan de sal, las rosas y la bandeja de fresas."""
    layers = []
    for x, y in ((24, 30), (34, 22)):
        layers += rose_head(x, y, 7)
    layers += [(OUTLINE, ['M 50 10 L 66 52 L 34 52 Z']), (SALT, ['M 50 15 L 62.6 49.6 L 37.4 49.6 Z'])]
    layers += strawberry(74, 38, 0.6) + strawberry(82, 44, 0.55) + strawberry(70, 46, 0.5, leaves=False)
    layers += [(OUTLINE, [f'M 22 44 Q 20 0 50 0 Q 80 0 78 44 L 74 44 Q 76 4 50 4 Q 24 4 26 44 Z'])]
    layers += [(OUTLINE, ['M 8 46 L 92 46 L 82 92 L 18 92 Z']), ('#c9a26a', ['M 11 48.4 L 89 48.4 L 79.8 89.6 L 20.2 89.6 Z'])]
    layers.append(('#a07a46', [rib(14, 60, 86, 60, 2), rib(16, 72, 84, 72, 2), rib(18, 84, 82, 84, 2)]))
    layers.append(('#a07a46', [rib(30 + i * 10, 49, 32 + i * 8, 89, 1.6) for i in range(5)]))
    layers += [(OUTLINE, [ellipse(50, 50, 14, 5)]), ('#e53935', [ellipse(50, 50, 12, 3.4)])]
    return layers



# ---------- Cundinamarca · La Cocina de la Sabana (v4.4) ----------

def olla(cx, cy, w, h, color='#78909c'):
    """La olla de aluminio con sus dos orejas."""
    layers = [(OUTLINE, [rect(cx - w / 2 - 6, cy - h * 0.15, 8, 5), rect(cx + w / 2 - 2, cy - h * 0.15, 8, 5)])]
    layers += [(OUTLINE, [f'M {cx - w / 2} {cy - h / 2} L {cx + w / 2} {cy - h / 2} L {cx + w / 2 - 3} {cy + h / 2} Q {cx} {cy + h / 2 + 5} {cx - w / 2 + 3} {cy + h / 2} Z']),
               (color, [f'M {cx - w / 2 + 2.4} {cy - h / 2 + 2} L {cx + w / 2 - 2.4} {cy - h / 2 + 2} L {cx + w / 2 - 5} {cy + h / 2 - 2} Q {cx} {cy + h / 2 + 2.6} {cx - w / 2 + 5} {cy + h / 2 - 2} Z']),
               (tone(color, 1.3), [rect(cx - w / 2 + 6, cy - h / 2 + 4, 4, h - 10)])]
    layers += oval(cx, cy - h / 2, w / 2, 5, tone(color, 0.85), d=2)
    return layers


def caldo_papas():
    """El caldo de las tres papas en la olla, humeando: la pastusa, la sabanera y la criolla que lo espesa."""
    layers = olla(50, 62, 64, 40)
    layers.append(('#f2d36b', [ellipse(50, 42, 28, 3.6)]))
    layers += oval(40, 41, 5, 3, '#fdd835', d=1.2) + oval(56, 42, 6, 3, '#e8d6a8', d=1.2)
    layers.append(('#eceff1', ['M 34 30 Q 28 22 34 16 Q 32 24 38 28 Z', 'M 50 28 Q 44 18 52 10 Q 48 20 54 26 Z', 'M 66 30 Q 60 22 66 16 Q 64 24 70 28 Z']))
    return layers


def ajiaco():
    """La olla del ajiaco santafereño: el caldo amarillo con la mazorca, el pollo y las ramas de guascas."""
    layers = olla(50, 62, 64, 40, '#8d6e63')
    layers.append(('#f2c94c', [ellipse(50, 42, 28, 3.6)]))
    layers += [(OUTLINE, [rect(30, 30, 22, 9, -20)]), ('#fbc02d', [rect(31.4, 31.4, 19.2, 6.2, -20)])]
    layers.append(('#f57f17', [circle(34 + i * 4, 37 - i * 1.4, 1.1) for i in range(4)]))
    layers += [(OUTLINE, [leaf(62, 40, 72, 22, 4.4), leaf(66, 40, 80, 30, 4)]), ('#558b2f', [leaf(62, 40, 72, 22, 3.2), leaf(66, 40, 80, 30, 2.8)])]
    layers.append(('#eceff1', ['M 44 28 Q 38 18 46 10 Q 42 20 48 26 Z']))
    return layers


def plato_ajiaco():
    """El ajiaco servido: el plato hondo con la crema, las alcaparras, el aguacate y la mazorca al lado."""
    layers = plato_hondo(50, 58, 1.1, '#f2c94c')
    layers += [(OUTLINE, [ellipse(42, 50, 9, 5)]), ('#fffaf0', [ellipse(42, 50, 7.4, 3.6)])]
    layers.append(('#558b2f', [circle(54 + (i % 3) * 3, 48 + (i // 3) * 3, 1.3) for i in range(6)]))
    layers += [(OUTLINE, [ellipse(72, 30, 12, 8, -20)]), ('#c5e1a5', [ellipse(72, 30, 10, 6, -20)]), ('#8bc34a', [ellipse(72, 30, 6, 3.6, -20)]), ('#6d4c41', [circle(74, 29, 2.6)])]
    layers += [(OUTLINE, [rect(14, 24, 26, 10, 25)]), ('#fbc02d', [rect(15.4, 25.4, 23.2, 7.2, 25)])]
    return layers


def almuerzo_sabanero():
    """El almuerzo sabanero del restaurante: el ajiaco, la trucha ahumada y el ceviche, en la mesa de mantel de cuadros."""
    layers = [(OUTLINE, [poly(4, 70, 96, 70, 96, 96, 4, 96)]), ('#fafafa', [poly(5.6, 71.6, 94.4, 71.6, 94.4, 94.4, 5.6, 94.4)])]
    layers.append(('#e53935', [rect(5.6 + i * 11, 71.6 + j * 7.6, 5.5, 3.8) for i in range(8) for j in range(3)]))
    layers += plato_hondo(32, 54, 0.75, '#f2c94c')
    layers += [(OUTLINE, [ellipse(26, 48, 6, 3.4)]), ('#fffaf0', [ellipse(26, 48, 4.8, 2.4)])]
    layers += oval(72, 62, 22, 8, '#fafafa', d=1.8)
    layers += trout(72, 56, 0.45, body='#b8742a')
    layers += [(OUTLINE, ['M 56 20 L 80 20 Q 78 36 68 37 Q 58 36 56 20 Z']), ('#e1f5fe', ['M 58.4 22.2 L 77.6 22.2 Q 75.8 34.4 68 35 Q 60.2 34.4 58.4 22.2 Z']), ('#f8bbd0', [ellipse(64, 26, 3.6, 2.4), ellipse(71, 26, 3.6, 2.4), ellipse(68, 30, 3.6, 2.4)])]
    layers += bar(68, 37, 68, 44, 2.4, '#e1f5fe', 1.2)
    return layers



# ---------- Cundinamarca · Zipaquirá (v4.4) ----------

def arreglo_floral():
    """El arreglo de flores en su jarrón, para las mesas de la plaza."""
    layers = []
    for x, y, c in ((30, 34, ROSE), (50, 24, '#f06292'), (70, 34, ROSE), (40, 44, '#fbc02d'), (60, 44, '#fafafa'), (50, 38, ROSE)):
        layers += rose_head(x, y, 8, c)
    layers += [(OUTLINE, [leaf(50, 56, 20, 50, 5), leaf(50, 56, 80, 50, 5)]), ('#43a047', [leaf(50, 56, 22, 50.6, 3.6), leaf(50, 56, 78, 50.6, 3.6)])]
    layers += [(OUTLINE, ['M 34 54 L 66 54 Q 72 74 60 94 L 40 94 Q 28 74 34 54 Z']), ('#5c8dd6', ['M 36.4 56.4 L 63.6 56.4 Q 69 74 58.4 91.6 L 41.6 91.6 Q 31 74 36.4 56.4 Z']), ('#bbdefb', [ellipse(42, 70, 2.4, 9, 6)])]
    return layers


def noche_zipaquira():
    """La noche en Zipaquirá: la casona blanca de balcones verdes en la plaza, con la catedral y la luna."""
    layers = [(OUTLINE, [rect(2, 8, 96, 86)]), ('#283593', [rect(3.6, 9.6, 92.8, 82.8)])]
    layers.append(('#fff59d', [crescent((76, 24), 9, (80, 20), 8)]))
    layers.append(('#fafafa', [circle(20, 20, 1.2), circle(40, 14, 1), circle(58, 24, 1.2)]))
    layers += [(OUTLINE, [rect(10, 38, 34, 54)]), ('#fbf8f1', [rect(11.6, 39.6, 30.8, 50.8)]), ('#8d6e63', [poly(8, 40, 27, 26, 46, 40)])]
    layers += [(OUTLINE, [rect(50, 46, 44, 46)]), ('#fbf8f1', [rect(51.6, 47.6, 40.8, 42.8)]), ('#b5512e', [poly(48, 48, 72, 36, 96, 48)])]
    layers.append(('#2f7d4f', [rect(54, 56, 36, 4), rect(54, 60, 36, 2)]))
    layers.append(('#ffe082', [rect(56 + i * 9, 64, 6, 8) for i in range(4)] + [rect(16, 50, 8, 10), rect(30, 50, 8, 10), rect(22, 72, 10, 20)]))
    layers += [(OUTLINE, [rect(25, 14, 4, 14), rect(21, 18, 12, 4)])]
    return layers


def almuerzo_plaza_zipa():
    """El almuerzo de la plaza de mercado: el piquete con pollo, papa criolla, mazorca y la trucha frita."""
    layers = oval(50, 62, 46, 22, '#c8a26a') + [('#a07a46', [ellipse(50, 62, 38, 16)]), ('#c8a26a', [ellipse(50, 62, 35, 14)])]
    layers += trout(42, 58, 0.55, body='#c08a3e')
    for x, y in ((66, 66), (72, 58), (60, 72)):
        layers += oval(x, y, 4.6, 3.8, '#fdd835', d=1.2)
    layers += [(OUTLINE, [rect(22, 64, 22, 8, 25)]), ('#fbc02d', [rect(23.4, 65.4, 19.2, 5.2, 25)])]
    layers += oval(76, 70, 6, 5, '#d7a86e', d=1.2)
    return layers


def mochila_paseo():
    """La mochila del paseo a la mina: con la canasta, el cofre de sal y la ruana doblada."""
    layers = [(OUTLINE, ['M 22 30 Q 50 18 78 30 L 84 88 Q 50 98 16 88 Z']), ('#8d6e63', ['M 24.6 32 Q 50 21 75.4 32 L 81 86 Q 50 95 19 86 Z'])]
    layers.append(('#d7ccc8', [rect(28 + i * 10, 50, 5, 34) for i in range(5)]))
    layers += [(OUTLINE, ['M 30 32 Q 26 6 50 6 Q 74 6 70 32 L 66 32 Q 68 10 50 10 Q 32 10 34 32 Z'])]
    layers += [(OUTLINE, [rect(34, 18, 32, 16)]), ('#a1693f', [rect(35.4, 19.4, 29.2, 13.2)]), ('#f4f1ea', [rect(47, 21, 6, 10), rect(44, 24, 12, 3)])]
    layers.append(('#e53935', [rib(22, 44, 78, 44, 4)]))
    return layers


def catedral_sal():
    """La Catedral de Sal de Zipaquirá: la gran cruz tallada en la roca, iluminada de azul, en lo hondo de la mina."""
    layers = [(OUTLINE, [rect(2, 2, 96, 96)]), ('#1a1f3a', [rect(3.6, 3.6, 92.8, 92.8)])]
    layers.append(('#283593', ['M 3.6 96.4 L 3.6 30 Q 50 -6 96.4 30 L 96.4 96.4 Z']))
    layers.append(('#3949ab', ['M 14 96.4 L 14 40 Q 50 10 86 40 L 86 96.4 Z']))
    layers.append(('#5c6bc0', ['M 26 96.4 L 26 50 Q 50 28 74 50 L 74 96.4 Z']))
    layers += [(OUTLINE, [rect(42, 18, 16, 72), rect(26, 36, 48, 14)]), ('#e8eaf6', [rect(44.4, 20.4, 11.2, 67.2), rect(28.4, 38.4, 43.2, 9.2)])]
    layers.append(('#ffffff', [rect(46, 22, 3, 64), rect(30, 40, 40, 2.4)]))
    layers.append(('#7986cb', [ellipse(50, 94, 34, 4)]))
    layers += [(OUTLINE, [rect(8, 86, 14, 6), rect(78, 86, 14, 6)]), ('#9fa8da', [rect(9.4, 87.4, 11.2, 3.2), rect(79.4, 87.4, 11.2, 3.2)])]
    return layers



# ---------- Bogotá · La Candelaria (v4.5) ----------

def cafe_capitalino():
    """El café capitalino: la bolsa de café recién tostado del tostadero, abierta, con el pocillo humeando al lado."""
    layers = [(OUTLINE, ['M 12 30 L 56 30 L 60 94 L 8 94 Z']), ('#c8956a', ['M 14.4 32.4 L 53.6 32.4 L 57.4 91.6 L 10.6 91.6 Z']), ('#ad7a52', ['M 44 32.4 L 53.6 32.4 L 57.4 91.6 L 47 91.6 Z'])]
    layers += [(OUTLINE, [ellipse(34, 30, 23, 6)]), ('#4e2c17', [ellipse(34, 30, 20.6, 4)])]
    layers.append(('#6d3b1e', [ellipse(28 + k * 6, 29 + (k % 2), 2.4, 1.6, -20) for k in range(3)]))
    layers += [('#fff3d6', [rect(17, 50, 30, 26)]), ('#283593', [rect(17, 50, 30, 6)]), ('#fdd835', [rect(17, 56, 30, 2)])]
    layers.append(('#6d3b1e', [ellipse(32, 67, 6, 4, -25)]))
    layers += taza(76, 72, 0.85, '#2b1a10')
    return layers


def tinto_bizcochos():
    """El tinto con bizcochos: el pocillo de café negro de la cafetería y los bizcochos de achira en el plato."""
    layers = oval(50, 82, 44, 12, '#eceff1', d=2)
    layers += taza(36, 58, 1.15, '#2b1a10', plate=False)
    for cx, cy, rot in [(70, 74, -15), (82, 80, 10), (64, 84, 25)]:
        layers += biscuit(cx, cy, 0.85, rot)
    return layers


def onces_bogotanas():
    """Las onces bogotanas: la bandeja con el chocolate, la almojábana, el bocadillo y la cocada."""
    layers = [(OUTLINE, [poly(4, 70, 50, 52, 96, 70, 50, 92)]), ('#a1693f', [poly(9, 70, 50, 54.6, 91, 70, 50, 89.4)]), ('#c08b5c', [poly(14, 70, 50, 57.6, 86, 70, 50, 86)])]
    layers += taza(34, 50, 0.8, '#6d3b1e', plate=False)
    layers.append(('#fffde7', [rect(28, 39.4, 4, 2.4, -10), rect(34, 40.2, 4, 2.4, 12)]))
    layers += oval(66, 62, 10, 7, '#e8a53a', d=1.8) + [('#f6c66a', [ellipse(63, 60, 4, 2.4)])]
    layers += [(OUTLINE, [poly(40, 76, 54, 70, 58, 76, 44, 82)]), ('#b4302f', [poly(41.6, 76, 53.6, 71.4, 56, 75.6, 44.4, 80.4)])]
    layers += oval(74, 76, 8, 5, '#fbfaf6', d=1.6)
    return layers


def tarde_candelaria():
    """La tarde en La Candelaria: la casa colonial de colores, con su balcón de madera, las flores y el farol."""
    layers = [(OUTLINE, [rect(10, 34, 80, 62)]), ('#f2c94c', [rect(12.4, 36.4, 75.2, 57.2)])]
    layers += [(OUTLINE, [poly(4, 38, 50, 14, 96, 38)]), ('#b5512e', [poly(9, 36, 50, 17.4, 91, 36)]), ('#8f3c22', [rib(18, 31, 82, 31, 1.4), rib(30, 25, 70, 25, 1.4)])]
    layers += [(OUTLINE, [rect(18, 58, 18, 36), rect(60, 58, 22, 22)]), ('#1e5aa8', [rect(20, 60, 14, 34)]), ('#bfe3f2', [rect(62, 60, 18, 18)]), ('#1e5aa8', [rect(70, 60, 2, 18), rect(62, 68, 18, 2)])]
    layers += [(OUTLINE, [rect(14, 44, 72, 6)]), ('#5d4037', [rect(15.4, 45.4, 69.2, 3.2)])]
    layers.append(('#5d4037', [rect(18 + k * 9, 38, 2, 7) for k in range(8)]))
    for x in (24, 44, 64, 80):
        layers.append(('#e53935', [circle(x, 42, 2.6), circle(x + 3.4, 41, 2.2)]))
        layers.append(('#43a047', [leaf(x - 2, 44, x - 7, 40, 1.6)]))
    layers += [(OUTLINE, [rect(42, 52, 8, 12)]), ('#ffe082', [rect(43.4, 53.4, 5.2, 9.2)]), ('#37474f', [rib(46, 46, 46, 52, 1.4)])]
    return layers


def monserrate():
    """Monserrate: el cerro verde con la iglesia blanca en la cumbre y el funicular que sube."""
    layers = [(OUTLINE, ['M 0 96 L 0 76 Q 18 60 32 40 Q 42 24 52 22 Q 64 22 74 40 Q 86 58 100 66 L 100 96 Z']), ('#4e8a34', ['M 2.4 93.6 L 2.4 77 Q 20 61.6 34 42 Q 43 26.4 52 24.4 Q 62.6 24.4 71.8 41.4 Q 84 59.6 97.6 67.4 L 97.6 93.6 Z'])]
    layers.append(('#3d6e29', ['M 52 24.4 Q 62.6 24.4 71.8 41.4 Q 84 59.6 97.6 67.4 L 97.6 93.6 L 58 93.6 Q 66 60 52 24.4 Z']))
    layers.append(('#2e5a20', [circle(x, y, 3.4) for x, y in [(20, 74), (30, 62), (40, 48), (66, 50), (78, 64), (88, 74), (14, 84), (70, 80)]]))
    layers += [(OUTLINE, [rect(38, 12, 28, 16), rect(46, 2, 12, 12)]), ('#fafafa', [rect(40.4, 14.4, 23.2, 11.6), rect(48.4, 4.4, 7.2, 9.6)])]
    layers += [(OUTLINE, [poly(36, 14, 52, 6, 68, 14)]), ('#b5512e', [poly(40, 13, 52, 8, 64, 13)]), ('#5d4037', [rect(50, 18, 4, 8)])]
    layers.append(('#37474f', [rib(10, 92, 46, 30, 1.6)]))
    layers += [(OUTLINE, [rect(22, 62, 12, 9, -55)]), ('#d7263d', [rect(23.4, 63.4, 9.2, 6.2, -55)])]
    return layers



# ---------- Bogotá · Chapinero y la Zona G (v4.5) ----------

def salsas_casa():
    """Las salsas de la casa: los tres frascos de la despensa, el ají negro, el aliño verde y el hogao rojo."""
    layers = []
    for x, col, lid in ((22, '#3e2723', '#d7263d'), (50, '#7cb342', '#fbc02d'), (78, '#e53935', '#2f7d4f')):
        layers += [(OUTLINE, [f'M {x - 14} 40 L {x + 14} 40 L {x + 15} 90 Q {x} 96 {x - 15} 90 Z']), ('#e3f2fd', [f'M {x - 11.6} 42.4 L {x + 11.6} 42.4 L {x + 12.6} 88 Q {x} 93 {x - 12.6} 88 Z'])]
        layers.append((col, [f'M {x - 12} 54 L {x + 12} 54 L {x + 12.6} 88 Q {x} 93 {x - 12.6} 88 Z']))
        layers += [(OUTLINE, [rect(x - 12, 28, 24, 13)]), (lid, [rect(x - 9.6, 30.4, 19.2, 8.2)])]
        layers.append(('#ffffff', [rect(x - 8, 60, 4, 20)]))
    return layers


def picada_casa():
    """La picada de la casa: la tabla de madera con las papitas criollas, los patacones con hogao y las hormigas."""
    layers = [(OUTLINE, [ellipse(50, 66, 46, 24)]), ('#a1693f', [ellipse(50, 66, 43, 21.4)]), ('#c08b5c', [ellipse(50, 63, 38, 16)])]
    for x, y in ((30, 60), (38, 70), (26, 72), (34, 52)):
        layers += oval(x, y, 5.4, 4.6, '#fdd835', d=1.4)
    for x, y in ((60, 56), (72, 64)):
        layers += oval(x, y, 9, 6, '#e6c26a', d=1.6) + [('#e53935', [ellipse(x, y - 1, 4.6, 2.6)])]
    layers += [(OUTLINE, [poly(52, 74, 66, 70, 70, 80, 56, 84)]), ('#f5ecd7', [poly(53.4, 74.6, 65, 71.6, 68.2, 79.4, 56.6, 82.4)])]
    layers.append(('#3e2723', [ellipse(58 + k * 3, 77 - (k % 2) * 2, 1.6, 1.1) for k in range(4)]))
    return layers


def plato_fuerte():
    """El plato fuerte: el asado a la llanera con el arroz blanco, la ensalada y la papa."""
    layers = oval(50, 64, 46, 22, '#fafafa') + [('#eceff1', [ellipse(50, 64, 38, 16)]), ('#fafafa', [ellipse(50, 64, 35, 14)])]
    layers += [(OUTLINE, ['M 26 56 Q 34 44 52 48 Q 62 52 58 64 Q 46 72 30 66 Q 22 62 26 56 Z']), ('#8d4f2a', ['M 28.4 56.6 Q 35 46.6 51 50.2 Q 59.4 53.6 56 63 Q 45.6 69.6 31 64 Q 24.8 60.8 28.4 56.6 Z'])]
    layers.append(('#5d2f17', [rib(32 + k * 6, 54, 30 + k * 6, 64, 1.4) for k in range(4)]))
    layers += oval(70, 62, 12, 8, '#ffffff', d=1.6) + [('#eeeeee', [circle(66, 60, 1.6), circle(72, 64, 1.6), circle(74, 59, 1.4)])]
    layers.append(('#66bb6a', [leaf(50, 76, 60, 70, 3.4), leaf(54, 78, 66, 76, 3.4)]))
    layers += oval(40, 74, 6, 4.4, '#fdd835', d=1.3)
    return layers


def menu_completo():
    """El menú completo: el plato fuerte, el tazón de asaí con banano y el jugo de maracuyá."""
    layers = oval(40, 72, 34, 15, '#fafafa') + [('#eceff1', [ellipse(40, 72, 27, 10.4)])]
    layers += [(OUTLINE, ['M 24 70 Q 30 60 44 63 Q 52 66 48 74 Q 38 80 28 76 Z']), ('#8d4f2a', ['M 26.4 70.2 Q 31 62.6 43 65.2 Q 49.4 67.6 46 73 Q 38 77.6 29.4 74.6 Z'])]
    layers += oval(56, 72, 7, 5, '#ffffff', d=1.4)
    layers += [(OUTLINE, ['M 58 40 L 92 40 Q 90 60 75 61 Q 60 60 58 40 Z']), ('#ffffff', ['M 60.6 42.4 L 89.4 42.4 Q 87.6 58 75 58.8 Q 62.4 58 60.6 42.4 Z'])]
    layers += [(OUTLINE, [ellipse(75, 40, 17, 6)]), ('#6a1b9a', [ellipse(75, 40, 15, 4.4)])]
    layers.append(('#fff59d', [circle(70, 38.6, 2.4), circle(78, 39.6, 2.4), circle(74, 41.4, 2)]))
    layers.append(('#c8a26a', [circle(66, 41, 1.2), circle(83, 41, 1.2), circle(80, 37.6, 1)]))
    layers += [(OUTLINE, ['M 10 18 L 30 18 L 28 50 L 12 50 Z']), ('#fbc02d', ['M 12.4 22 L 27.6 22 L 26 47.6 L 14 47.6 Z']), ('#e1f5fe', [rect(12.4, 20.4, 15.2, 3)])]
    layers.append(('#4e342e', [rib(24, 10, 21, 30, 1.6)]))
    return layers


def cena_zona_g():
    """La cena en la Zona G: la mesa del restaurante con mantel, la vela encendida, el plato servido y el tinto."""
    layers = [(OUTLINE, [poly(4, 64, 50, 46, 96, 64, 50, 86)]), ('#fafafa', [poly(9, 64, 50, 48.6, 91, 64, 50, 83.4)])]
    layers += [(OUTLINE, [poly(4, 64, 50, 86, 50, 96, 4, 74)]), ('#e0e0e0', [poly(6.4, 66.4, 48.6, 87, 48.6, 93.6, 6.4, 72.4)])]
    layers += [(OUTLINE, [poly(50, 86, 96, 64, 96, 74, 50, 96)]), ('#bdbdbd', [poly(51.4, 87, 93.6, 66.4, 93.6, 72.4, 51.4, 93.6)])]
    layers += oval(40, 64, 16, 7, '#ffffff', d=1.6) + [('#8d4f2a', [ellipse(38, 62, 7, 3.4)]), ('#66bb6a', [ellipse(46, 64, 4, 2)])]
    layers += [(OUTLINE, [rect(64, 34, 8, 22)]), ('#fff8e1', [rect(65.6, 35.6, 4.8, 18.8)]), ('#ff9800', [leaf(68, 34, 68, 22, 3)]), ('#ffeb3b', [leaf(68, 33, 68, 26, 1.6)])]
    layers += taza(80, 62, 0.4, '#2b1a10')
    return layers



# ---------- Bogotá · Usaquén (v4.5) ----------

def surtido_tejidos():
    """El surtido de tejidos: la ruana doblada de lana con sus rayas y el par de alpargatas encima."""
    layers = [(OUTLINE, [poly(8, 56, 50, 40, 92, 56, 50, 76)]), ('#5d4037', [poly(12, 56, 50, 42.6, 88, 56, 50, 73.4)])]
    layers += [(OUTLINE, [poly(8, 56, 50, 76, 50, 94, 8, 74)]), ('#4e342e', [poly(10.4, 58.6, 47.6, 77, 47.6, 90.4, 10.4, 72.4)])]
    layers += [(OUTLINE, [poly(50, 76, 92, 56, 92, 74, 50, 94)]), ('#3e2723', [poly(52.4, 77, 89.6, 58.6, 89.6, 72.4, 52.4, 90.4)])]
    layers.append(('#f4f1ea', [poly(10.4, 64, 47.6, 82, 47.6, 84, 10.4, 66), poly(52.4, 82, 89.6, 64, 89.6, 66, 52.4, 84)]))
    for cx in (36, 62):
        layers += [(OUTLINE, [ellipse(cx, 46, 12, 6, -10)]), ('#f4f1ea', [ellipse(cx, 46, 10, 4.4, -10)]), ('#2e4fa8', [ellipse(cx + 3, 45, 6, 3, -10)])]
        layers.append(('#c8a26a', [ellipse(cx, 50.4, 11, 2.2, -10)]))
    return layers


def surtido_feria():
    """El surtido de la feria: el sombrero vueltiao sobre la silla de montar de cuero."""
    layers = [(OUTLINE, ['M 12 70 Q 30 50 50 54 Q 70 50 88 70 L 84 86 Q 50 76 16 86 Z']), ('#8d5a32', ['M 15 71 Q 31 53.4 50 57 Q 69 53.4 85 71 L 82 83 Q 50 73.6 18 83 Z'])]
    layers.append(('#5d3a1e', [rib(20, 78, 80, 78, 2), rib(50, 58, 50, 76, 2)]))
    layers += [(OUTLINE, [ellipse(50, 46, 40, 11)]), ('#f4efe6', [ellipse(50, 46, 37.6, 8.8)])]
    layers.append(('#3e2723', [ellipse(50, 46, 32, 6.4), ellipse(50, 46, 26, 4.6)]))
    layers.append(('#f4efe6', [ellipse(50, 46, 29, 5.4), ellipse(50, 46, 22, 3.6)]))
    layers += [(OUTLINE, ['M 34 46 Q 34 22 50 22 Q 66 22 66 46 Z']), ('#f4efe6', ['M 36.4 45 Q 36.4 24.4 50 24.4 Q 63.6 24.4 63.6 45 Z'])]
    layers.append(('#3e2723', [rib(37, 34, 63, 34, 1.6), rib(36.6, 40, 63.4, 40, 1.6), rib(38, 28, 62, 28, 1.6)]))
    return layers


def surtido_loza():
    """El surtido con loza: la olla de loza negra de La Chamba y la canasta de regalo del Eje."""
    layers = [(OUTLINE, ['M 10 50 Q 6 74 18 88 Q 34 98 50 88 Q 60 74 56 50 Z']), ('#2b2b2b', ['M 12.6 52.4 Q 9 74 20 85.6 Q 34 94.6 48 85.6 Q 57 74 53.4 52.4 Z'])]
    layers += [(OUTLINE, [ellipse(33, 50, 25, 7)]), ('#424242', [ellipse(33, 50, 22.6, 5)])]
    layers.append(('#757575', [ellipse(22, 66, 3, 10, 10)]))
    layers += [(OUTLINE, [rect(6, 56, 8, 5), rect(52, 56, 8, 5)])]
    layers += [(OUTLINE, ['M 54 56 L 94 56 L 88 92 L 60 92 Z']), ('#c9a26a', ['M 57 58.4 L 91 58.4 L 85.8 89.6 L 62.2 89.6 Z'])]
    layers.append(('#a07a46', [rib(58, 68, 90, 68, 1.6), rib(59, 78, 88, 78, 1.6)]))
    layers += [(OUTLINE, ['M 60 56 Q 74 30 88 56 L 84 56 Q 74 36 64 56 Z'])]
    layers += [(OUTLINE, [rect(64, 44, 10, 14)]), ('#c8956a', [rect(65.4, 45.4, 7.2, 11.2)]), ('#d7263d', [circle(80, 50, 4.4)]), ('#fdd835', [circle(80, 50, 1.8)])]
    return layers


def gran_surtido():
    """El gran surtido artesanal: el huacal de madera con la máscara ticuna, el jarrón de werregue y el sombrero."""
    layers = [(OUTLINE, [poly(6, 54, 94, 54, 88, 94, 12, 94)]), ('#c08b5c', [poly(9, 56.4, 91, 56.4, 85.8, 91.6, 14.2, 91.6)])]
    layers.append(('#8d5a32', [rect(9, 66, 82, 3), rect(9, 78, 80, 3)]))
    layers += [(OUTLINE, ['M 18 54 Q 16 22 30 16 Q 44 22 42 54 Z']), ('#e0c08a', ['M 20.4 52 Q 18.6 24 30 18.6 Q 41.4 24 39.6 52 Z'])]
    layers.append(('#3e2723', [ellipse(25, 32, 3, 2), ellipse(35, 32, 3, 2), rib(26, 42, 34, 42, 1.6)]))
    layers.append(('#d7263d', [rib(22, 26, 38, 26, 1.4), rib(22, 48, 38, 48, 1.4)]))
    layers += [(OUTLINE, ['M 50 54 Q 46 30 56 22 L 64 22 Q 74 30 70 54 Z']), ('#e8b04c', ['M 52.6 52 Q 49 31 57.4 24.4 L 62.6 24.4 Q 71 31 67.4 52 Z'])]
    layers.append(('#3e2723', [rib(52, 34, 68, 34, 1.6), rib(51, 42, 69, 42, 1.6)]))
    layers += [(OUTLINE, [ellipse(82, 40, 14, 5)]), ('#f4efe6', [ellipse(82, 40, 12, 3.4)])]
    layers += [(OUTLINE, ['M 74 40 Q 74 26 82 26 Q 90 26 90 40 Z']), ('#f4efe6', ['M 75.8 39 Q 75.8 28 82 28 Q 88.2 28 88.2 39 Z']), ('#3e2723', [rib(76, 34, 88, 34, 1.4)])]
    return layers


def domingo_usaquen():
    """El domingo en Usaquén: el toldo blanco del mercado de pulgas con sus cosas y la torre de la iglesia del pueblo."""
    layers = [(OUTLINE, [rect(70, 12, 18, 60), poly(66, 14, 79, 2, 92, 14)]), ('#fbf8f1', [rect(72.4, 14.4, 13.2, 55.2)]), ('#b5512e', [poly(70, 13, 79, 5, 88, 13)])]
    layers.append(('#5d4037', [rect(76, 24, 6, 10), rect(77, 50, 4, 20)]))
    layers += [(OUTLINE, [poly(4, 46, 34, 28, 64, 46)]), ('#fafafa', [poly(8, 45, 34, 31, 60, 45)]), ('#d7263d', [poly(20, 45, 34, 31, 34, 45)])]
    layers += bar(8, 46, 8, 90, 2.4, '#8d6e63') + bar(60, 46, 60, 90, 2.4, '#8d6e63')
    layers += [(OUTLINE, [rect(10, 68, 48, 8)]), ('#a1693f', [rect(11.4, 69.4, 45.2, 5.2)])]
    for x, col in ((16, '#2e4fa8'), (26, '#e8b04c'), (36, '#2b2b2b'), (46, '#d7263d')):
        layers += [(OUTLINE, [rect(x - 3.6, 58, 9, 10.6)]), (col, [rect(x - 2.2, 59.4, 6.2, 7.8)])]
    layers.append(('#4e8a34', [circle(20, 92, 4), circle(48, 92, 4)]))
    return layers


ICONS = [
    (0xE001, 'cherry', cherry),
    (0xE002, 'guarapo', guarapo),
    (0xE003, 'panela', panela),
    (0xE004, 'panela_powder', panela_powder),
    (0xE005, 'cheese', cheese),
    (0xE006, 'milk', milk),
    (0xE007, 'cream', cream),
    (0xE008, 'cacao_dry', cacao_dry),
    (0xE009, 'cacao_roasted', cacao_roasted),
    (0xE00A, 'milk_chocolate', milk_chocolate),
    (0xE00B, 'cheese_arepa', cheese_arepa),
    (0xE00C, 'arepa', arepa),
    (0xE00D, 'washed', washed),
    (0xE00E, 'pulp', pulp),
    (0xE00F, 'parchment', parchment),
    (0xE010, 'green_coffee', green),
    (0xE011, 'roasted_coffee', coffee_roasted),
    (0xE012, 'ground_coffee', ground),
    (0xE013, 'coffee_bag', coffee_bag),
    (0xE014, 'compost', compost),
    (0xE015, 'bagasse', bagasse),
    (0xE016, 'corn_kernels', corn_kernels),
    (0xE017, 'corn_hulled', corn_hulled),
    (0xE018, 'corn_dough', corn_dough),
    (0xE019, 'cacao_pod', cacao_pod),
    (0xE01A, 'cacao_paste', cacao_paste),
    (0xE01B, 'cafe_origen', cafe_origen),
    (0xE01C, 'raw_milk', raw_milk),
    (0xE01D, 'container', container),
    (0xE01E, 'breakfast', breakfast),
    (0xE01F, 'coffee_plant', coffee_plant),
    (0xE020, 'guava_tree', guava_tree),
    (0xE021, 'guava', guava),
    (0xE022, 'guava_pulp', guava_pulp),
    (0xE023, 'guava_jelly', guava_jelly),
    (0xE024, 'bocadillo_block', bocadillo_block),
    (0xE025, 'bocadillo', bocadillo),
    (0xE026, 'bocadillo_bijao', bocadillo_bijao),
    (0xE027, 'bocadillo_crate', bocadillo_crate),
    (0xE028, 'tobacco_plant', tobacco_plant),
    (0xE029, 'tobacco_leaf', tobacco_leaf),
    (0xE02A, 'cured_leaf', cured_leaf),
    (0xE02B, 'stripped_leaf', stripped_leaf),
    (0xE02C, 'fermented_tobacco', fermented_tobacco),
    (0xE02D, 'cigar', cigar),
    (0xE02E, 'fique_plant', fique_plant),
    (0xE02F, 'fique_leaf', fique_leaf),
    (0xE030, 'fique_fiber', fique_fiber),
    (0xE031, 'fique_yarn', fique_yarn),
    (0xE032, 'alpargatas', alpargatas),
    (0xE033, 'fique_sack', fique_sack),
    (0xE034, 'tobacco_bale', tobacco_bale),
    (0xE035, 'salted_beef', salted_beef),
    (0xE036, 'carne_oreada', carne_oreada),
    (0xE037, 'grilled_oreada', grilled_oreada),
    (0xE038, 'almuerzo', almuerzo),
    (0xE039, 'fiambre', fiambre),
    (0xE03A, 'ant_queen', ant_queen),
    (0xE03B, 'ant_clean', ant_clean),
    (0xE03C, 'ant_brine', ant_brine),
    (0xE03D, 'toasted_ants', toasted_ants),
    (0xE03E, 'ant_cone', ant_cone),
    (0xE03F, 'recuerdo', recuerdo),
    (0xE040, 'dulces_tipicos', dulces_tipicos),
    (0xE041, 'sobremesa', sobremesa),
    (0xE042, 'estadia', estadia),
    (0xE043, 'caja_surtida', caja_surtida),
    (0xE044, 'canasta_caminante', canasta_caminante),
    (0xE045, 'excursion', excursion),
    (0xE046, 'rice_plant', rice_plant),
    (0xE047, 'paddy', paddy),
    (0xE048, 'dry_paddy', dry_paddy),
    (0xE049, 'brown_rice', brown_rice),
    (0xE04A, 'white_rice', white_rice),
    (0xE04B, 'premium_rice', premium_rice),
    (0xE04C, 'rice_bag', rice_bag),
    (0xE04D, 'rice_sack', rice_sack),
    (0xE04E, 'coconut_palm', coconut_palm),
    (0xE04F, 'coconut', coconut),
    (0xE050, 'peeled_coconut', peeled_coconut),
    (0xE051, 'grated_coconut', grated_coconut),
    (0xE052, 'coconut_milk', coconut_milk),
    (0xE053, 'cocada', cocada),
    (0xE054, 'canoe', canoe),
    (0xE055, 'fish', fish),
    (0xE056, 'clean_fish', clean_fish),
    (0xE057, 'fish_fillet', fish_fillet),
    (0xE058, 'fried_fish', fried_fish),
    (0xE059, 'salted_fish', salted_fish),
    (0xE05A, 'fish_in_coconut', fish_in_coconut),
    (0xE05B, 'cebu', cebu),
    (0xE05C, 'ordeno_milk', ordeno_milk),
    (0xE05D, 'cuajada', cuajada),
    (0xE05E, 'salted_curd', salted_curd),
    (0xE05F, 'queso_costeno', queso_costeno),
    (0xE060, 'mote_queso', mote_queso),
    (0xE061, 'almuerzo_costeno', almuerzo_costeno),
    (0xE062, 'bandeja_costena', bandeja_costena),
    (0xE063, 'cana_flecha_plant', cana_flecha_plant),
    (0xE064, 'cana_flecha', cana_flecha),
    (0xE065, 'cana_fiber', cana_fiber),
    (0xE066, 'dyed_fiber', dyed_fiber),
    (0xE067, 'trenza', trenza),
    (0xE068, 'sombrero_vueltiao', sombrero_vueltiao),
    (0xE069, 'recuerdo_costa', recuerdo_costa),
    (0xE06A, 'torre_reloj', torre_reloj),
    (0xE06B, 'arroz_con_coco', arroz_con_coco),
    (0xE06C, 'cena_muralla', cena_muralla),
    (0xE06D, 'noche_hotel', noche_hotel),
    (0xE06E, 'almuerzo_bahia', almuerzo_bahia),
    (0xE06F, 'lonchera_paseo', lonchera_paseo),
    (0xE070, 'paseo_islas', paseo_islas),
    (0xE071, 'potato_plant', potato_plant),
    (0xE072, 'potato', potato),
    (0xE073, 'washed_potato', washed_potato),
    (0xE074, 'graded_potato', graded_potato),
    (0xE075, 'peeled_potato', peeled_potato),
    (0xE076, 'criollas', criollas),
    (0xE077, 'criollas_bag', criollas_bag),
    (0xE078, 'criollas_box', criollas_box),
    (0xE079, 'barley_plant', barley_plant),
    (0xE07A, 'barley', barley),
    (0xE07B, 'malt', malt),
    (0xE07C, 'wort', wort),
    (0xE07D, 'beer', beer),
    (0xE07E, 'beer_crate', beer_crate),
    (0xE07F, 'caballito', caballito),
    (0xE080, 'greda', greda),
    (0xE081, 'barro', barro),
    (0xE082, 'olla_barro', olla_barro),
    (0xE083, 'pieza_torneada', pieza_torneada),
    (0xE084, 'matera', matera),
    (0xE085, 'jarra_cerveza', jarra_cerveza),
    (0xE086, 'molded_cheese', molded_cheese),
    (0xE087, 'queso_paipa', queso_paipa),
    (0xE088, 'almojabana', almojabana),
    (0xE089, 'piquete', piquete),
    (0xE08A, 'amasijos', amasijos),
    (0xE08B, 'sheep', sheep),
    (0xE08C, 'wool', wool),
    (0xE08D, 'clean_wool', clean_wool),
    (0xE08E, 'carded_wool', carded_wool),
    (0xE08F, 'wool_yarn', wool_yarn),
    (0xE090, 'ruana', ruana),
    (0xE091, 'recuerdo_boyaca', recuerdo_boyaca),
    (0xE092, 'iglesia_villa', iglesia_villa),
    (0xE093, 'onces', onces),
    (0xE094, 'tarde_plaza', tarde_plaza),
    (0xE095, 'noche_villa', noche_villa),
    (0xE096, 'canasta_mercado', canasta_mercado),
    (0xE097, 'fiambre_paseo', fiambre_paseo),
    (0xE098, 'excursion_fosil', excursion_fosil),
    (0xE099, 'oil_palm', oil_palm),
    (0xE09A, 'palm_bunch', palm_bunch),
    (0xE09B, 'palm_fruit', palm_fruit),
    (0xE09C, 'cooked_fruit', cooked_fruit),
    (0xE09D, 'palm_oil', palm_oil),
    (0xE09E, 'oil_bottle', oil_bottle),
    (0xE09F, 'oil_box', oil_box),
    (0xE0A0, 'passion_vine', passion_vine),
    (0xE0A1, 'passion_fruit', passion_fruit),
    (0xE0A2, 'passion_pulp', passion_pulp),
    (0xE0A3, 'past_pulp', past_pulp),
    (0xE0A4, 'passion_juice', passion_juice),
    (0xE0A5, 'juice_box', juice_box),
    (0xE0A6, 'cachama', cachama),
    (0xE0A7, 'clean_cachama', clean_cachama),
    (0xE0A8, 'cachama_fillet', cachama_fillet),
    (0xE0A9, 'smoked_cachama', smoked_cachama),
    (0xE0AA, 'pisillo', pisillo),
    (0xE0AB, 'cachama_maracuya', cachama_maracuya),
    (0xE0AC, 'adobada', adobada),
    (0xE0AD, 'mamona', mamona),
    (0xE0AE, 'carne_llanera', carne_llanera),
    (0xE0AF, 'almuerzo_llanero', almuerzo_llanero),
    (0xE0B0, 'parranda', parranda),
    (0xE0B1, 'raw_hide', raw_hide),
    (0xE0B2, 'leather', leather),
    (0xE0B3, 'leather_pieces', leather_pieces),
    (0xE0B4, 'tooled_leather', tooled_leather),
    (0xE0B5, 'saddle', saddle),
    (0xE0B6, 'recuerdo_llano', recuerdo_llano),
    (0xE0B7, 'empanadas', empanadas),
    (0xE0B8, 'tarde_parque', tarde_parque),
    (0xE0B9, 'noche_villavo', noche_villavo),
    (0xE0BA, 'almuerzo_plaza', almuerzo_plaza),
    (0xE0BB, 'fiambre_viaje', fiambre_viaje),
    (0xE0BC, 'cano_cristales', cano_cristales),
    (0xE0BD, 'plantain_plant', plantain_plant),
    (0xE0BE, 'plantain_bunch', plantain_bunch),
    (0xE0BF, 'plantain_hand', plantain_hand),
    (0xE0C0, 'washed_plantain', washed_plantain),
    (0xE0C1, 'peeled_plantain', peeled_plantain),
    (0xE0C2, 'patacon', patacon),
    (0xE0C3, 'patacon_bag', patacon_bag),
    (0xE0C4, 'patacon_box', patacon_box),
    (0xE0C5, 'azotea', azotea),
    (0xE0C6, 'herbs', herbs),
    (0xE0C7, 'washed_herbs', washed_herbs),
    (0xE0C8, 'pounded_herbs', pounded_herbs),
    (0xE0C9, 'alino', alino),
    (0xE0CA, 'alino_box', alino_box),
    (0xE0CB, 'pargo', pargo),
    (0xE0CC, 'clean_pargo', clean_pargo),
    (0xE0CD, 'pargo_fillet', pargo_fillet),
    (0xE0CE, 'smoked_pargo', smoked_pargo),
    (0xE0CF, 'dried_fish', dried_fish),
    (0xE0D0, 'tapao', tapao),
    (0xE0D1, 'mangrove', mangrove),
    (0xE0D2, 'piangua', piangua),
    (0xE0D3, 'cooked_piangua', cooked_piangua),
    (0xE0D4, 'piangua_meat', piangua_meat),
    (0xE0D5, 'encocado', encocado),
    (0xE0D6, 'arroz_piangua', arroz_piangua),
    (0xE0D7, 'cazuela', cazuela),
    (0xE0D8, 'werregue_palm', werregue_palm),
    (0xE0D9, 'werregue_fiber', werregue_fiber),
    (0xE0DA, 'dyed_werregue', dyed_werregue),
    (0xE0DB, 'werregue_thread', werregue_thread),
    (0xE0DC, 'werregue_jar', werregue_jar),
    (0xE0DD, 'recuerdo_pacifico', recuerdo_pacifico),
    (0xE0DE, 'marranitas', marranitas),
    (0xE0DF, 'ceviche', ceviche),
    (0xE0E0, 'noche_buenaventura', noche_buenaventura),
    (0xE0E1, 'almuerzo_galeria', almuerzo_galeria),
    (0xE0E2, 'lonchera_lancha', lonchera_lancha),
    (0xE0E3, 'ballenas', ballenas),
    (0xE0E4, 'asai_palm', asai_palm),
    (0xE0E5, 'asai_bunch', asai_bunch),
    (0xE0E6, 'asai_fruit', asai_fruit),
    (0xE0E7, 'soaked_asai', soaked_asai),
    (0xE0E8, 'asai_pulp', asai_pulp),
    (0xE0E9, 'asai_shake', asai_shake),
    (0xE0EA, 'asai_bag', asai_bag),
    (0xE0EB, 'asai_box', asai_box),
    (0xE0EC, 'aji_plant', aji_plant),
    (0xE0ED, 'aji_peppers', aji_peppers),
    (0xE0EE, 'ground_aji', ground_aji),
    (0xE0EF, 'aji_negro', aji_negro),
    (0xE0F0, 'aji_box', aji_box),
    (0xE0F1, 'pirarucu', pirarucu),
    (0xE0F2, 'clean_pirarucu', clean_pirarucu),
    (0xE0F3, 'pirarucu_fillet', pirarucu_fillet),
    (0xE0F4, 'moqueado', moqueado),
    (0xE0F5, 'salted_pirarucu', salted_pirarucu),
    (0xE0F6, 'pirarucu_aji', pirarucu_aji),
    (0xE0F7, 'yuca_plant', yuca_plant),
    (0xE0F8, 'yuca_brava', yuca_brava),
    (0xE0F9, 'peeled_yuca', peeled_yuca),
    (0xE0FA, 'yuca_mass', yuca_mass),
    (0xE0FB, 'tipiti', tipiti),
    (0xE0FC, 'casabe', casabe),
    (0xE0FD, 'desayuno_amazonico', desayuno_amazonico),
    (0xE0FE, 'banquete_maloca', banquete_maloca),
    (0xE0FF, 'yanchama_tree', yanchama_tree),
    (0xE100, 'yanchama_bark', yanchama_bark),
    (0xE101, 'bark_cloth', bark_cloth),
    (0xE102, 'painted_cloth', painted_cloth),
    (0xE103, 'ticuna_mask', ticuna_mask),
    (0xE104, 'recuerdo_amazonas', recuerdo_amazonas),
    (0xE105, 'helado_asai', helado_asai),
    (0xE106, 'cena_ribera', cena_ribera),
    (0xE107, 'noche_leticia', noche_leticia),
    (0xE108, 'almuerzo_mercado', almuerzo_mercado),
    (0xE109, 'provision_canoa', provision_canoa),
    (0xE10A, 'delfines', delfines),
    (0xE10B, 'suero_costeno', suero_costeno),
    (0xE10C, 'palmiste', palmiste),
    (0xE10D, 'fresh_hide', fresh_hide),
    (0xE10E, 'bagazo_cervecero', bagazo_cervecero),
    (0xE10F, 'achira_plant', achira_plant),
    (0xE110, 'achira_root', achira_root),
    (0xE111, 'achira_mash', achira_mash),
    (0xE112, 'wet_starch', wet_starch),
    (0xE113, 'achira_starch', achira_starch),
    (0xE114, 'bizcocho_dough', bizcocho_dough),
    (0xE115, 'bizcochos', bizcochos),
    (0xE116, 'bizcocho_box', bizcocho_box),
    (0xE117, 'cafe_excelso', cafe_excelso),
    (0xE118, 'cafe_especial', cafe_especial),
    (0xE119, 'cascara', cascara),
    (0xE11A, 'te_cascara', te_cascara),
    (0xE11B, 'tilapia', tilapia),
    (0xE11C, 'clean_tilapia', clean_tilapia),
    (0xE11D, 'tilapia_fillet', tilapia_fillet),
    (0xE11E, 'escabeche', escabeche),
    (0xE11F, 'tilapia_ahumada', tilapia_ahumada),
    (0xE120, 'almuerzo_represa', almuerzo_represa),
    (0xE121, 'cerdo', cerdo),
    (0xE122, 'carne_cerdo', carne_cerdo),
    (0xE123, 'cuero_cerdo', cuero_cerdo),
    (0xE124, 'cuero_limpio', cuero_limpio),
    (0xE125, 'relleno', relleno),
    (0xE126, 'tamal', tamal),
    (0xE127, 'lechona', lechona_v2),
    (0xE128, 'desayuno_tolimense', desayuno_tolimense),
    (0xE129, 'arcilla', arcilla),
    (0xE12A, 'barro_pisado', barro_pisado),
    (0xE12B, 'pieza_cruda', pieza_cruda),
    (0xE12C, 'pieza_brunida', pieza_brunida),
    (0xE12D, 'loza_negra', loza_negra),
    (0xE12E, 'recuerdo_tolima', recuerdo_tolima),
    (0xE12F, 'merienda_malecon', merienda_malecon),
    (0xE130, 'cena_opita', cena_opita),
    (0xE131, 'noche_sanpedro', noche_sanpedro),
    (0xE132, 'almuerzo_opita', almuerzo_opita),
    (0xE133, 'fiambre_tatacoa', fiambre_tatacoa),
    (0xE134, 'tatacoa', tatacoa),
    # Láminas del álbum del Tolima Grande (v4.3)
    (0xE135, 'nevado_tolima', nevado_tolima),
    (0xE136, 'rio_magdalena', rio_magdalena),
    (0xE137, 'desierto_tatacoa', desierto_tatacoa),
    (0xE138, 'estatua_agustin', estatua_agustin),
    (0xE139, 'guayacan', guayacan),
    (0xE13A, 'estrecho_magdalena', estrecho_magdalena),
    (0xE13B, 'insulso', insulso),
    (0xE13C, 'asado_huilense', asado_huilense),
    (0xE13D, 'cholupa', cholupa),
    (0xE13E, 'mistela', mistela),
    (0xE13F, 'pueblo_natagaima', pueblo_natagaima),
    (0xE140, 'pijao', pijao),
    (0xE141, 'horno_barro', horno_barro),
    (0xE142, 'sanjuanero', sanjuanero),
    (0xE143, 'rajalena', rajalena),
    (0xE144, 'bambuco', bambuco),
    (0xE145, 'tiple', tiple),
    (0xE146, 'tambora', tambora),
    (0xE147, 'ibague_musical', ibague_musical),
    (0xE148, 'sombrero_suaza', sombrero_suaza),
    (0xE149, 'chiva_pitalito', chiva_pitalito),
    (0xE14A, 'brunido', brunido),
    (0xE14B, 'canasto', canasto),
    (0xE14C, 'rejo', rejo),
    (0xE14D, 'malecon_neiva', malecon_neiva),
    (0xE14E, 'fiesta_sanpedro', fiesta_sanpedro),
    (0xE14F, 'observatorio', observatorio),
    (0xE150, 'fosil_tortuga', fosil_tortuga),
    (0xE151, 'hoyos_tatacoa', hoyos_tatacoa),
    (0xE152, 'cardon', cardon),
    # Láminas del álbum del Eje Cafetero (v4.3)
    (0xE153, 'arriero', arriero),
    (0xE154, 'mula', mula),
    (0xE155, 'chapolera', chapolera),
    (0xE156, 'carriel', carriel),
    (0xE157, 'aguadeno', aguadeno),
    (0xE158, 'yipao', yipao),
    (0xE159, 'trapiche_mill', trapiche_mill),
    (0xE15A, 'molienda', molienda),
    (0xE15B, 'hornilla', hornilla),
    (0xE15C, 'aguapanela', aguapanela),
    (0xE15D, 'melcocha', melcocha),
    (0xE15E, 'gaveras', gaveras),
    (0xE15F, 'normando', normando),
    (0xE160, 'ordeno', ordeno),
    (0xE161, 'cuajada_melao', cuajada_melao),
    (0xE162, 'kumis', kumis),
    (0xE163, 'arequipe_jar', arequipe_jar),
    (0xE164, 'cantina', cantina),
    (0xE165, 'molinillo', molinillo),
    (0xE166, 'santafereno', santafereno),
    (0xE167, 'chocolatera', chocolatera),
    (0xE168, 'cacao_fino', cacao_fino),
    (0xE169, 'lamina_chocolatina', lamina_chocolatina),
    (0xE16A, 'budare', budare),
    (0xE16B, 'mazamorra', mazamorra),
    (0xE16C, 'envuelto', envuelto),
    (0xE16D, 'pilon', pilon),
    (0xE16E, 'choclo', choclo),
    (0xE16F, 'plaza_pueblo', plaza_pueblo),
    (0xE170, 'tinto', tinto),
    (0xE171, 'chiva_bus', chiva_bus),
    (0xE172, 'fonda', fonda),
    (0xE173, 'balcones', balcones),
    (0xE174, 'castillo_polvora', castillo_polvora),
    # Láminas del álbum de Santander (v4.3)
    (0xE175, 'bocadillo_lonja', bocadillo_lonja),
    (0xE176, 'cajitas', cajitas),
    (0xE177, 'velez', velez),
    (0xE178, 'caney', caney),
    (0xE179, 'galeon', galeon),
    (0xE17A, 'telar', telar),
    (0xE17B, 'vaquero', vaquero),
    (0xE17C, 'cabro', cabro),
    (0xE17D, 'pepitoria', pepitoria),
    (0xE17E, 'mute', mute),
    (0xE17F, 'chicamocha', chicamocha),
    (0xE180, 'salida', salida),
    (0xE181, 'recoleccion', recoleccion),
    (0xE182, 'rafting', rafting),
    (0xE183, 'piedra_amarilla', piedra_amarilla),
    (0xE184, 'tapia', tapia),
    (0xE185, 'amonita', amonita),
    (0xE186, 'vasija_guane', vasija_guane),
    (0xE187, 'mirador', mirador),
    # Láminas del álbum de la Costa (v4.3)
    (0xE188, 'rio_sinu', rio_sinu),
    (0xE189, 'garza', garza),
    (0xE18A, 'pilon_arroz', pilon_arroz),
    (0xE18B, 'arroz_lisa', arroz_lisa),
    (0xE18C, 'mompox', mompox),
    (0xE18D, 'champan', champan),
    (0xE18E, 'enyucado', enyucado),
    (0xE18F, 'playa_tolu', playa_tolu),
    (0xE190, 'palafitos', palafitos),
    (0xE191, 'manglar', manglar),
    (0xE192, 'cienaga_grande', cienaga_grande),
    (0xE193, 'suero_taza', suero_taza),
    (0xE194, 'bollo_limpio', bollo_limpio),
    (0xE195, 'porro', porro),
    (0xE196, 'pintas', pintas),
    (0xE197, 'oro_zenu', oro_zenu),
    (0xE198, 'tuchin', tuchin),
    (0xE199, 'murallas', murallas),
    (0xE19A, 'palenquera', palenquera),
    (0xE19B, 'balcon_cartagena', balcon_cartagena),
    (0xE19C, 'san_felipe', san_felipe),
    (0xE19D, 'islas_rosario', islas_rosario),
    # Láminas del álbum de Boyacá (v4.3)
    (0xE19E, 'papicultor', papicultor),
    (0xE19F, 'cocido', cocido),
    (0xE1A0, 'cubios', cubios),
    (0xE1A1, 'neblina', neblina),
    (0xE1A2, 'tunjo', tunjo),
    (0xE1A3, 'chicha', chicha),
    (0xE1A4, 'guarapo_olla', guarapo_olla),
    (0xE1A5, 'tejo', tejo),
    (0xE1A6, 'tibasosa', tibasosa),
    (0xE1A7, 'alfarera', alfarera),
    (0xE1A8, 'alcancia', alcancia),
    (0xE1A9, 'candelaria', candelaria),
    (0xE1AA, 'raquira', raquira),
    (0xE1AB, 'kumis_almojabana', kumis_almojabana),
    (0xE1AC, 'termales', termales),
    (0xE1AD, 'lanceros', lanceros),
    (0xE1AE, 'telar_lana', telar_lana),
    (0xE1AF, 'frailejon', frailejon),
    (0xE1B0, 'nobsa', nobsa),
    (0xE1B1, 'plaza_empedrada', plaza_empedrada),
    (0xE1B2, 'cometas', cometas),
    (0xE1B3, 'pozos_azules', pozos_azules),
    (0xE1B4, 'casa_terracota', casa_terracota),
    # Láminas del álbum de los Llanos (v4.3)
    (0xE1B5, 'moriche', moriche),
    (0xE1B6, 'comejenera', comejenera),
    (0xE1B7, 'corocora', corocora),
    (0xE1B8, 'atardecer_llanero', atardecer_llanero),
    (0xE1B9, 'mango_llanero', mango_llanero),
    (0xE1BA, 'pina', pina),
    (0xE1BB, 'araza', araza),
    (0xE1BC, 'pan_arroz', pan_arroz),
    (0xE1BD, 'masato', masato),
    (0xE1BE, 'rio_meta', rio_meta),
    (0xE1BF, 'chiguiro', chiguiro),
    (0xE1C0, 'babilla', babilla),
    (0xE1C1, 'tonina', tonina),
    (0xE1C2, 'anaconda', anaconda),
    (0xE1C3, 'vaquero_llanero', vaquero_llanero),
    (0xE1C4, 'sanmartinero', sanmartinero),
    (0xE1C5, 'cabrestero', cabrestero),
    (0xE1C6, 'hallaca', hallaca),
    (0xE1C7, 'caballo_criollo', caballo_criollo),
    (0xE1C8, 'cotizas', cotizas),
    (0xE1C9, 'sombrero_llanero', sombrero_llanero),
    (0xE1CA, 'coleo', coleo),
    (0xE1CB, 'puerta_llano', puerta_llano),
    (0xE1CC, 'joropo', joropo),
    (0xE1CD, 'arpa', arpa),
    (0xE1CE, 'cuatro', cuatro),
    (0xE1CF, 'macarena', macarena),
    # Láminas del álbum de el Pacífico (v4.3)
    (0xE1D0, 'chontaduro', chontaduro),
    (0xE1D1, 'borojo', borojo),
    (0xE1D2, 'rana_dorada', rana_dorada),
    (0xE1D3, 'lluvia_choco', lluvia_choco),
    (0xE1D4, 'heliconia', heliconia),
    (0xE1D5, 'arroz_clavado', arroz_clavado),
    (0xE1D6, 'viche', viche),
    (0xE1D7, 'potrillo', potrillo),
    (0xE1D8, 'tortuga_marina', tortuga_marina),
    (0xE1D9, 'marimba', marimba),
    (0xE1DA, 'cununo', cununo),
    (0xE1DB, 'guasa', guasa),
    (0xE1DC, 'currulao', currulao),
    (0xE1DD, 'chirimia', chirimia),
    (0xE1DE, 'san_pacho', san_pacho),
    (0xE1DF, 'tambo', tambo),
    (0xE1E0, 'catanga', catanga),
    (0xE1E1, 'canalete', canalete),
    (0xE1E2, 'casa_pilotes', casa_pilotes),
    (0xE1E3, 'jagua_achiote', jagua_achiote),
    (0xE1E4, 'puerto_buenaventura', puerto_buenaventura),
    (0xE1E5, 'malecon_pacifico', malecon_pacifico),
    (0xE1E6, 'juanchaco', juanchaco),
    (0xE1E7, 'festival_pacifico', festival_pacifico),
    # Láminas del álbum de el Amazonas (v4.3)
    (0xE1E8, 'ceiba', ceiba),
    (0xE1E9, 'victoria_regia', victoria_regia),
    (0xE1EA, 'jaguar', jaguar),
    (0xE1EB, 'guacamaya', guacamaya),
    (0xE1EC, 'perezoso', perezoso),
    (0xE1ED, 'farina', farina),
    (0xE1EE, 'camu_camu', camu_camu),
    (0xE1EF, 'copoazu', copoazu),
    (0xE1F0, 'chicha_chontaduro', chicha_chontaduro),
    (0xE1F1, 'canoa_amazonas', canoa_amazonas),
    (0xE1F2, 'delfin_rosado', delfin_rosado),
    (0xE1F3, 'pirana', pirana),
    (0xE1F4, 'tarapoto', tarapoto),
    (0xE1F5, 'creciente', creciente),
    (0xE1F6, 'maloca', maloca),
    (0xE1F7, 'pelazon', pelazon),
    (0xE1F8, 'manguare', manguare),
    (0xE1F9, 'uitoto', uitoto),
    (0xE1FA, 'chambira', chambira),
    (0xE1FB, 'cerbatana', cerbatana),
    (0xE1FC, 'palo_sangre', palo_sangre),
    (0xE1FD, 'collar_semillas', collar_semillas),
    (0xE1FE, 'triple_frontera', triple_frontera),
    (0xE1FF, 'parque_santander', parque_santander),
    (0xE200, 'tabatinga', tabatinga),
    (0xE201, 'puerto_narino', puerto_narino),
    (0xE202, 'mico_ardilla', mico_ardilla),
    (0xE203, 'amacayacu', amacayacu),
    # Cundinamarca · Las Flores de la Sabana (v4.4)
    (0xE204, 'rosal', rosal),
    (0xE205, 'rosa', rosa),
    (0xE206, 'rosas_cortadas', rosas_cortadas),
    (0xE207, 'rosa_hidratada', rosa_hidratada),
    (0xE208, 'rosa_clasificada', rosa_clasificada),
    (0xE209, 'bonche_rosas', bonche_rosas),
    (0xE20A, 'ramo_rosas', ramo_rosas),
    (0xE20B, 'caja_flores', caja_flores),
    # Cundinamarca · Los Freseros de Sibaté (v4.4)
    (0xE20C, 'fresal', fresal),
    (0xE20D, 'fresa', fresa),
    (0xE20E, 'fresa_lavada', fresa_lavada),
    (0xE20F, 'fresa_seleccionada', fresa_seleccionada),
    (0xE210, 'bandeja_fresas', bandeja_fresas),
    (0xE211, 'fresas_crema', fresas_crema),
    (0xE212, 'fresa_segunda', fresa_segunda),
    (0xE213, 'mermelada_fresa', mermelada_fresa),
    # Cundinamarca · Las Truchas de Guatavita (v4.4)
    (0xE214, 'estanques_trucha', estanques_trucha),
    (0xE215, 'trucha', trucha),
    (0xE216, 'trucha_limpia', trucha_limpia),
    (0xE217, 'filete_trucha', filete_trucha),
    (0xE218, 'ceviche_trucha', ceviche_trucha),
    (0xE219, 'trucha_ahumada', trucha_ahumada),
    (0xE21A, 'almuerzo_trucha', almuerzo_trucha),
    # Cundinamarca · Las Salinas de Nemocón (v4.4)
    (0xE21B, 'socavon_sal', socavon_sal),
    (0xE21C, 'roca_sal', roca_sal),
    (0xE21D, 'salmuera', salmuera),
    (0xE21E, 'bloque_sal', bloque_sal),
    (0xE21F, 'figura_sal', figura_sal),
    (0xE220, 'sal_refinada', sal_refinada),
    (0xE221, 'pan_sal', pan_sal),
    (0xE222, 'cofre_sal', cofre_sal),
    (0xE223, 'canasta_sabanera', canasta_sabanera),
    # Cundinamarca · La Cocina de la Sabana (v4.4)
    (0xE224, 'caldo_papas', caldo_papas),
    (0xE225, 'ajiaco', ajiaco),
    (0xE226, 'plato_ajiaco', plato_ajiaco),
    (0xE227, 'almuerzo_sabanero', almuerzo_sabanero),
    # Cundinamarca · Zipaquirá (v4.4)
    (0xE228, 'arreglo_floral', arreglo_floral),
    (0xE229, 'noche_zipaquira', noche_zipaquira),
    (0xE22A, 'almuerzo_plaza_zipa', almuerzo_plaza_zipa),
    (0xE22B, 'mochila_paseo', mochila_paseo),
    (0xE22C, 'catedral_sal', catedral_sal),
    # Bogotá · La Candelaria (v4.5)
    (0xE22D, 'cafe_capitalino', cafe_capitalino),
    (0xE22E, 'tinto_bizcochos', tinto_bizcochos),
    (0xE22F, 'onces_bogotanas', onces_bogotanas),
    (0xE230, 'tarde_candelaria', tarde_candelaria),
    (0xE231, 'monserrate', monserrate),
    # Bogotá · Chapinero y la Zona G (v4.5)
    (0xE232, 'salsas_casa', salsas_casa),
    (0xE233, 'picada_casa', picada_casa),
    (0xE234, 'plato_fuerte', plato_fuerte),
    (0xE235, 'menu_completo', menu_completo),
    (0xE236, 'cena_zona_g', cena_zona_g),
    # Bogotá · Usaquén (v4.5)
    (0xE237, 'surtido_tejidos', surtido_tejidos),
    (0xE238, 'surtido_feria', surtido_feria),
    (0xE239, 'surtido_loza', surtido_loza),
    (0xE23A, 'gran_surtido', gran_surtido),
    (0xE23B, 'domingo_usaquen', domingo_usaquen),
]


# ---------- Construcción de la fuente ----------

def color_tuple(hex_color):
    h = hex_color.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
    return (r, g, b, a)


def draw_glyph(paths):
    pen = TTGlyphPen(None)
    # SVG (y hacia abajo, 0..100) → fuente (y hacia arriba, unidades de 1000).
    tpen = TransformPen(Cu2QuPen(pen, max_err=1.0, reverse_direction=True), (SCALE, 0, 0, -SCALE, (ADVANCE - 100 * SCALE) / 2, TOP))
    for d in paths:
        parse_path(d, tpen)
    return pen.glyph()


# ---------- Emojis propios (v4.3) ----------
# Los emojis que usa el juego (en textos, botones y avisos) se dibujan aquí con su mismo carácter: la fuente va
# primero en la lista de fuentes, así que el navegador usa estos dibujos y no los del teléfono. Cada entrada es
# (secuencia, dibujo); las secuencias de varias partes (tono de piel, unión, banderas) se arman con ligaduras.
EMOJI = []


def emoji(seq, make):
    EMOJI.append((seq, make))


# Las partes que no se ven solas: el selector de emoji, la unión y los tonos de piel (cada uno distinto, para
# que las ligaduras distingan 👩🏽 de 👩🏾) y las letras de las banderas.
INVISIBLE = {0xFE0F: 'vs16', 0x200D: 'zwj', **{0x1F3FB + i: f'tone{i + 1}' for i in range(5)}, **{0x1F1E6 + i: f'ri_{chr(65 + i)}' for i in range(26)}}


def emoji_name(seq):
    return 'emo_' + '_'.join(f'{ord(c):04X}' for c in seq if ord(c) != 0xFE0F)


def build():
    glyph_order = ['.notdef', 'space']
    glyphs = {'.notdef': TTGlyphPen(None).glyph(), 'space': TTGlyphPen(None).glyph()}
    metrics = {'.notdef': (ADVANCE, 0), 'space': (ADVANCE, 0)}
    cmap = {0x20: 'space'}
    palette = []
    colr = {}
    for code, name, make in ICONS:
        layers = make()
        base = f'icon_{name}'
        glyph_order.append(base)
        glyphs[base] = draw_glyph([d for _, ds in layers for d in ds])  # en una sola tinta, por si no hay color
        metrics[base] = (ADVANCE, 0)
        cmap[code] = base
        colr[base] = []
        for i, (color, ds) in enumerate(layers):
            lname = f'{base}.{i}'
            glyph_order.append(lname)
            glyphs[lname] = draw_glyph(ds)
            metrics[lname] = (ADVANCE, 0)
            c = color_tuple(color)
            if c not in palette:
                palette.append(c)
            colr[base].append((lname, palette.index(c)))

    # Emojis propios: un glifo por secuencia; los de un solo carácter, directo en el cmap; los demás, por ligadura.
    for code, gname in INVISIBLE.items():
        glyph_order.append(gname)
        glyphs[gname] = TTGlyphPen(None).glyph()
        metrics[gname] = (0, 0)
        cmap[code] = gname
    ligatures = []
    for seq, make in EMOJI:
        base = emoji_name(seq)
        if base in glyphs:
            continue
        layers = make()
        glyph_order.append(base)
        glyphs[base] = draw_glyph([d for _, ds in layers for d in ds])
        metrics[base] = (ADVANCE, 0)
        colr[base] = []
        for i, (color, ds) in enumerate(layers):
            lname = f'{base}.{i}'
            glyph_order.append(lname)
            glyphs[lname] = draw_glyph(ds)
            metrics[lname] = (ADVANCE, 0)
            c = color_tuple(color)
            if c not in palette:
                palette.append(c)
            colr[base].append((lname, palette.index(c)))
        parts = [ord(c) for c in seq if ord(c) != 0xFE0F]
        if len(parts) == 1:
            cmap[parts[0]] = base
        else:
            ligatures.append((seq, base))
    for seq, base in ligatures:
        for c in seq:
            if ord(c) not in cmap:
                raise SystemExit(f'falta el emoji suelto {c} ({ord(c):X}) para la secuencia {seq}')

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    for name in glyph_order:
        g = fb.font['glyf'][name]
        g.recalcBounds(fb.font['glyf'])
        metrics[name] = (ADVANCE, getattr(g, 'xMin', 0))
    fb.setupHorizontalMetrics(metrics)
    descent = round(100 * SCALE - TOP)
    fb.setupHorizontalHeader(ascent=TOP, descent=-descent)
    fb.setupNameTable({'familyName': 'MiTierrita Icons', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=TOP, sTypoDescender=-descent, usWinAscent=TOP, usWinDescent=descent)
    fb.setupPost()
    if ligatures:
        from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
        rules = []
        # Con y sin el selector de emoji (FE0F), que unos textos traen y otros no.
        variants = {}
        for seq, base in ligatures:
            variants.setdefault(seq, base)
            variants.setdefault(seq.replace('\ufe0f', ''), base)
        for seq, base in sorted(variants.items(), key=lambda x: -len(x[0])):
            names = [cmap[ord(c)] for c in seq]
            if len(names) > 1:
                rules.append(f"    sub {' '.join(names)} by {base};")
        fea = 'languagesystem DFLT dflt;\nlanguagesystem latn dflt;\nfeature ccmp {\n' + '\n'.join(rules) + '\n} ccmp;\n'
        addOpenTypeFeaturesFromString(fb.font, fea)
    fb.font['COLR'] = buildCOLR(colr, version=0)
    fb.font['CPAL'] = buildCPAL([palette])
    out = ROOT / 'src/assets/mitierrita-icons.woff2'
    out.parent.mkdir(parents=True, exist_ok=True)
    fb.font.flavor = 'woff2'
    fb.save(out)
    print(f'{out.relative_to(ROOT)}: {out.stat().st_size} bytes, {len(ICONS)} íconos, {len(EMOJI)} emojis')


def preview():
    """Todos los íconos lado a lado (grande y pequeño), para revisarlos en el navegador."""
    cells = []
    for i, (code, name, make) in enumerate(ICONS):
        body = ''.join(f'<path fill="{color}" d="{d}"/>' for color, ds in make() for d in ds)
        x = i * 120
        cells.append(f'<g transform="translate({x} 0)"><rect width="110" height="110" fill="#fff8ec"/>'
                     f'<g transform="translate(5 5)">{body}</g>'
                     f'<g transform="translate(35 120) scale(0.24)">{body}</g>'
                     f'<text x="55" y="160" font-size="11" text-anchor="middle" font-family="sans-serif">{name}</text></g>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{len(ICONS) * 120}" height="170" viewBox="0 0 {len(ICONS) * 120} 170">{"".join(cells)}</svg>'
    (ROOT / 'tools/icons/preview.svg').write_text(svg)


def icons_js():
    """src/data/icons.js: el código de cada ícono, con la primera línea de su descripción."""
    camel = lambda name: name.split('_')[0] + ''.join(w.title() for w in name.split('_')[1:])
    rows = []
    for code, name, make in ICONS:
        doc = (make.__doc__ or '').strip().splitlines()[0].rstrip('.')
        rows.append(f"  {camel(name)}: '\\u{code:04X}', // {doc}")
    src = (
        '// Generado por tools/icons/build_icons.py (no editar a mano).\n'
        '// Íconos propios (fuente «MiTierrita Icons», src/assets/mitierrita-icons.woff2) para los productos que no\n'
        '// tienen un emoji parecido. Son letras de uso privado, así que funcionan en cualquier texto (paneles,\n'
        '// objetivos, textos del mapa) igual que un emoji, siempre que la fuente esté en la lista de fuentes\n'
        '// (ver styles.css y FONT).\n'
        'export const ICON = {\n' + '\n'.join(rows) + '\n};\n\n'
        "export const ICON_FONT = 'MiTierrita Icons';\n"
    )
    (ROOT / 'src/data/icons.js').write_text(src)


# Los emojis que el juego dibuja a su manera: cada uno con su mismo carácter (o secuencia), así el texto no cambia.
_ALBUM = {name: make for code, name, make in ICONS}
for _seq, _make in [
    ('🏅', e_medal), ('⭐', e_star), ('💰', e_money), ('✅', e_check), ('🏁', e_flag_finish), ('🔒', e_lock), ('⏸️', e_pause), ('⛔', e_no),
    ('🗺️', e_map), ('🔬', e_micro), ('⚡', e_bolt), ('👑', e_crown), ('🏆', e_trophy), ('🔁', e_cycle), ('🏗️', e_crane), ('📦', e_box),
    ('🚪', e_door), ('⚠️', e_warning), ('🔄', e_refresh), ('💡', e_bulb), ('⏰', e_alarm), ('🥇', e_gold), ('🥈', e_silver), ('🥉', e_bronze),
    ('🚩', e_flag_red), ('🔥', e_fire), ('🎯', e_target), ('⚙️', e_gear), ('📋', e_clipboard), ('📖', e_book), ('⏳', e_hourglass), ('🔗', e_link),
    ('📅', e_calendar), ('📍', e_pin), ('🛠️', e_tools), ('🅿️', e_parking), ('🕐', e_clock), ('🔴', e_red_dot), ('⏱', e_stopwatch), ('⏩', e_fast),
    ('ℹ️', e_info), ('🌐', e_globe), ('📶', e_signal), ('💸', e_money_wings), ('⏹️', e_stop_sq), ('🛒', e_cart), ('🗑️', e_trash), ('❓', e_question),
    ('📱', e_phone), ('👤', e_person), ('✉️', e_mail), ('🎧', e_headphones), ('🔤', e_abc), ('📜', e_scroll), ('🎮', e_gamepad), ('👀', e_eyes),
    ('🐾', e_paws), ('🛍️', e_bags), ('🎒', e_backpack), ('🔊', e_megaphone), ('🔇', e_mute), ('🔕', e_bell_off), ('🔍', e_magnifier), ('🔧', e_wrench),
    ('💬', e_speech), ('📰', e_newspaper), ('✨', e_sparkles), ('🎁', e_gift), ('🎀', e_bow), ('🎗️', e_ribbon), ('🎖️', e_military_medal), ('🎫', e_ticket),
    ('🧭', e_compass), ('🧪', e_flask), ('🧵', e_thread), ('🧶', e_yarn), ('✂️', e_scissors), ('🪡', e_needle), ('⛏️', e_pick), ('🪓', e_axe),
    ('🪜', e_ladder), ('🪢', e_knot), ('🪃', e_boomerang), ('🔪', e_knife), ('🗜️', e_clamp), ('🪤', e_trap), ('🪧', e_sign), ('🚧', e_works),
    ('🚦', e_traffic), ('🛣️', e_road), ('🕳️', e_hole), ('🤝', e_handshake), ('🤲', e_hands), ('👃', e_nose), ('🦺', e_vest),
    ('🚙', e_willys), ('🚚', e_truck), ('🚛', e_tractomula), ('🚜', e_tractor), ('🚤', e_speedboat), ('🛥️', e_speedboat), ('🛻', e_pickup), ('🛺', e_mototaxi),
    ('✈️', e_plane), ('🐜', e_ant), ('🐋', e_whale), ('🐟', e_fish), ('🐈', e_cat), ('🐦', e_bird), ('🪲', e_beetle), ('🪰', e_fly), ('🦠', e_microbe), ('🪱', e_worm),
    ('☀️', e_sun), ('🌧️', e_rain), ('🌦️', e_sun_rain), ('🌤️', e_sun_cloud), ('🌙', e_moon), ('❄️', e_snow), ('🌡️', e_thermo), ('🌬️', e_wind),
    ('🌀', e_cyclone), ('💧', e_drop), ('🌊', e_wave), ('🌴', e_palm), ('🌳', e_tree), ('🌺', e_hibiscus), ('🌱', e_seedling), ('🍃', e_leaves),
    ('🍂', e_fallen_leaves), ('🍄', e_mushroom), ('🎋', e_guadua), ('🪵', e_log), ('🧱', e_brick), ('🪨', e_rock), ('🏨', e_hotel), ('🏭', e_factory),
    ('🏚️', e_old_house), ('🌉', e_bridge), ('🌇', e_city_sunset), ('⛰️', e_mountain), ('🌄', e_sunrise_mtn), ('🧈', e_butter), ('🍯', e_honey), ('🍮', e_flan),
    ('🍳', e_egg_pan), ('🫓', e_arepa), ('🫘', e_beans), ('🥩', e_meat), ('🍽️', e_dinner), ('🛏️', e_bed), ('🛢️', e_barrel), ('🥾', e_boot),
    ('🎵', e_music), ('🎣', e_fishing), ('🚿', e_shower), ('🧊', e_ice), ('🪟', e_window), ('✝️', e_cross), ('🎨', e_palette), ('🎏', e_windsock),
    ('💼', e_briefcase), ('🤠', e_cowboy), ('🧍', standing), ('🦳', e_hair_white), ('🦱', e_hair_curly),
    ('🇨🇴', e_flag_co), ('🇬🇧', e_flag_gb), ('🇧🇷', e_flag_br), ('🇫🇷', e_flag_fr),
]:
    emoji(_seq, _make)
for _seq, _name in [
    ('🚌', 'chiva_bus'), ('🐴', 'mula'), ('☕', 'tinto'), ('🐄', 'normando'), ('🐮', 'normando'), ('🐂', 'sanmartinero'), ('🐎', 'caballo_criollo'),
    ('🌽', 'choclo'), ('🦜', 'guacamaya'), ('🐬', 'tonina'), ('🐢', 'tortuga_marina'), ('🌾', 'rice_plant'), ('🍫', 'milk_chocolate'), ('🧀', 'cheese'),
    ('🍒', 'cherry'), ('🍲', 'mute'), ('🛶', 'potrillo'), ('⛴️', 'rio_meta'), ('🛳️', 'puerto_buenaventura'), ('🚡', 'chicamocha'), ('🛖', 'tambo'),
    ('⛪', 'plaza_pueblo'), ('🏛️', 'ibague_musical'), ('🏜️', 'desierto_tatacoa'), ('🌵', 'cardon'), ('🌅', 'atardecer_llanero'), ('🏊', 'hoyos_tatacoa'),
    ('🔭', 'observatorio'), ('🎭', 'pelazon'), ('🪁', 'cometas'), ('🎉', 'fiesta_sanpedro'), ('🥁', 'tambora'), ('💃', 'currulao'), ('💃🏽', 'currulao'),
    ('🌹', 'rosa'), ('🧺', 'canasto'), ('🏺', 'vasija_guane'), ('👒', 'aguadeno'), ('♨️', 'termales'),
]:
    emoji(_seq, _ALBUM[_name])

# Las personas: cada base con los cinco tonos de piel, y los oficios y peinados unidos con ZWJ.
_BASES = {'👩': 'woman', '👨': 'man', '🧑': 'person', '👴': 'old_man', '👵': 'old_woman', '🧓': 'older', '🧔': 'beard'}
_TONES = [('', None)] + [(chr(0x1F3FB + i), i + 1) for i in range(5)]
_EXTRAS = {'🌾': 'farmer', '🍳': 'cook', '💼': 'office', '✈️': 'pilot', '🦳': 'white', '🦱': 'curly'}
for _b, _kind in _BASES.items():
    for _t, _k in _TONES:
        emoji(_b + _t, (lambda kind=_kind, k=_k: bust(SKIN[k], kind)))
        if _b in ('👩', '👨', '🧑'):
            for _e, _x in _EXTRAS.items():
                if _x == 'white':
                    make = (lambda kind=_kind, k=_k: bust(SKIN[k], kind, hair=HAIR_WHITE))
                elif _x == 'curly':
                    make = (lambda k=_k: curly(SKIN[k]))
                else:
                    make = (lambda kind=_kind, k=_k, x=_x: bust(SKIN[k], kind, x))
                emoji(_b + _t + '‍' + _e, make)
for _t, _k in _TONES:
    emoji('👷' + _t, (lambda k=_k: bust(SKIN[k], 'man', 'worker')))
    emoji('🧍' + _t, (lambda k=_k: standing(SKIN[k])))


if __name__ == '__main__':
    build()
    icons_js()
    preview()
