"""Fuente de íconos del juego (Cafetal Icons): glifos de color (COLR v0 + CPAL) para los productos
que no tienen un emoji que se les parezca (la cereza de café, el guarapo, la panela...).

Cada ícono es una lista de capas (color, trazos) dibujadas en un lienzo de 100 × 100 (y hacia abajo,
como SVG). Se generan:
  src/assets/cafetal-icons.woff2   la fuente (la usan la interfaz y los textos del mapa)
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
    """Tabaco torcido: el puro enrollado a mano, con su anillo y la punta encendida."""
    return [
        ('#ffffff90', ['M 86 30 Q 80 20 88 12 Q 84 22 90 28 Z']),
        (OUTLINE, [rect(6, 50, 82, 18, -25, 47, 59)]),
        ('#7b4a22', [rect(8, 52, 78, 14, -25, 47, 59)]),
        ('#9c6634', [rect(8, 52, 78, 5, -25, 47, 59)]),
        ('#5d3a1a', [rib(22, 74, 26, 62, 1), rib(36, 68, 40, 56, 1), rib(52, 61, 56, 49, 1)]),
        ('#d7263d', [rect(22, 52, 10, 14, -25, 47, 59)]),
        ('#e8b90f', [rect(25, 52, 4, 14, -25, 47, 59)]),
        ('#9e9e9e', [ellipse(84, 41, 4, 7, -25)]),
        ('#ff7043', [ellipse(85.5, 40.5, 2, 4.5, -25)]),
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


# Código de cada ícono (U+E001...), el nombre en src/data/icons.js y cómo se dibuja.
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
    fb.setupNameTable({'familyName': 'Cafetal Icons', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=TOP, sTypoDescender=-descent, usWinAscent=TOP, usWinDescent=descent)
    fb.setupPost()
    fb.font['COLR'] = buildCOLR(colr, version=0)
    fb.font['CPAL'] = buildCPAL([palette])
    out = ROOT / 'src/assets/cafetal-icons.woff2'
    out.parent.mkdir(parents=True, exist_ok=True)
    fb.font.flavor = 'woff2'
    fb.save(out)
    print(f'{out.relative_to(ROOT)}: {out.stat().st_size} bytes, {len(ICONS)} íconos')


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
        '// Íconos propios (fuente «Cafetal Icons», src/assets/cafetal-icons.woff2) para los productos que no\n'
        '// tienen un emoji parecido. Son letras de uso privado, así que funcionan en cualquier texto (paneles,\n'
        '// objetivos, textos del mapa) igual que un emoji, siempre que la fuente esté en la lista de fuentes\n'
        '// (ver styles.css y FONT).\n'
        'export const ICON = {\n' + '\n'.join(rows) + '\n};\n\n'
        "export const ICON_FONT = 'Cafetal Icons';\n"
    )
    (ROOT / 'src/data/icons.js').write_text(src)


if __name__ == '__main__':
    build()
    icons_js()
    preview()
