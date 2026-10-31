"""Genera los íconos de la app (PWA y Windows): plato de 3 garras sobre fondo azul ROMI con CRT verde."""
import math, sys
from PIL import Image, ImageDraw, ImageFilter

def icon(size):
    s = size; im = Image.new('RGBA', (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    r = int(s * 0.22)
    d.rounded_rectangle([0, 0, s - 1, s - 1], r, fill=(18, 27, 33, 255))
    # pantalla CRT verde
    m = s * 0.12
    d.rounded_rectangle([m, m, s - m, s * 0.62], int(s * 0.07), fill=(3, 22, 10, 255), outline=(52, 58, 62, 255), width=max(2, s // 64))
    # perfil de pieza torneada en verde
    pts = [(0.18, 0.5), (0.18, 0.36), (0.42, 0.36), (0.42, 0.42), (0.6, 0.42), (0.66, 0.3), (0.82, 0.3), (0.82, 0.5)]
    d.polygon([(x * s, y * s) for x, y in pts], fill=(141, 255, 166, 255))
    d.line([(0.16 * s, 0.5 * s), (0.84 * s, 0.5 * s)], fill=(47, 156, 78, 255), width=max(1, s // 96))
    # plato de 3 garras
    cx, cy, R = s * 0.5, s * 0.8, s * 0.13
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(130, 138, 145, 255), outline=(60, 66, 70, 255), width=max(2, s // 80))
    for k in range(3):
        a = -math.pi / 2 + k * 2 * math.pi / 3
        w = R * 0.32
        x1, y1 = cx + math.cos(a) * R * 0.25, cy + math.sin(a) * R * 0.25
        x2, y2 = cx + math.cos(a) * R * 1.05, cy + math.sin(a) * R * 1.05
        nx, ny = -math.sin(a) * w / 2, math.cos(a) * w / 2
        d.polygon([(x1 + nx, y1 + ny), (x2 + nx, y2 + ny), (x2 - nx, y2 - ny), (x1 - nx, y1 - ny)], fill=(61, 180, 214, 255))
    d.ellipse([cx - R * 0.18, cy - R * 0.18, cx + R * 0.18, cy + R * 0.18], fill=(20, 24, 28, 255))
    # botones rojo, naranja, verde
    for i, c in enumerate([(210, 48, 42), (242, 163, 58), (31, 174, 85)]):
        x = s * (0.12 + i * 0.075); d.rounded_rectangle([x, s * 0.84, x + s * 0.055, s * 0.895], max(1, s // 100), fill=c + (255,))
    return im

out = sys.argv[1] if len(sys.argv) > 1 else 'public/icons'
for sz in (192, 512):
    icon(sz).save(f'{out}/icon-{sz}.png')
# ícono "maskable" (con margen de seguridad)
m = Image.new('RGBA', (512, 512), (18, 27, 33, 255)); m.paste(icon(410), (51, 51), icon(410)); m.save(f'{out}/maskable-512.png')
icon(256).save(f'{out}/icon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('ok')
