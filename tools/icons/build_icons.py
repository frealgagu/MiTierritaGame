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
