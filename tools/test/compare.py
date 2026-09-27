"""Visual QA: put a region of a reference screenshot next to the same region
of our render, plus a 50/50 blend, so pixel differences are easy to spot.

usage: python3 compare.py ref.png ref_x ref_y ours.png our_x our_y w h out.png [scale]
(ref_x/ref_y and our_x/our_y are the top-left corner of the 970px page box)
"""
import sys
from PIL import Image, ImageChops

ref, rx, ry, ours, ox, oy, w, h, out = sys.argv[1:10]
scale = int(sys.argv[10]) if len(sys.argv) > 10 else 1
rx, ry, ox, oy, w, h = map(int, (rx, ry, ox, oy, w, h))
a = Image.open(ref).convert('RGB').crop((rx, ry, rx + w, ry + h))
b = Image.open(ours).convert('RGB').crop((ox, oy, ox + w, oy + h))
blend = Image.blend(a, b, 0.5)
diff = ImageChops.difference(a, b)
W = w * 3 + 20
canvas = Image.new('RGB', (W, h), (255, 0, 255))
canvas.paste(a, (0, 0))
canvas.paste(b, (w + 10, 0))
canvas.paste(blend, (2 * w + 20, 0))
if scale > 1:
    canvas = canvas.resize((canvas.width * scale, canvas.height * scale), Image.NEAREST)
canvas.save(out)
