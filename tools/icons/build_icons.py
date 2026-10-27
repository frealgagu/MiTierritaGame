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
