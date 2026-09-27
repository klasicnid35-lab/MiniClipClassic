"""Builds games/flash-bounce/flash-bounce.swf from scratch.

A tiny, original Flash (SWF v8) animation: a bouncing ball, spinning stars
and a sun over a gradient sky. It exists so the site's Ruffle integration can
be tested without shipping anybody else's .swf files.

usage: python3 tools/make-swf.py
"""
import math
import os
import struct

W, H = 550, 400          # stage size in pixels
TW = 20                  # twips per pixel
FPS = 30
FRAMES = 90


class Bits:
    def __init__(self):
        self.bits = []

    def ub(self, v, n):
        for i in range(n - 1, -1, -1):
            self.bits.append((v >> i) & 1)

    def sb(self, v, n):
        self.ub(v & ((1 << n) - 1), n)

    def bytes(self):
        b = self.bits + [0] * (-len(self.bits) % 8)
        return bytes(int(''.join(map(str, b[i:i + 8])), 2) for i in range(0, len(b), 8))


def nbits_signed(*vals):
    n = 1
    for v in vals:
        need = (abs(int(v)).bit_length() + 1) if v else 1
        n = max(n, need)
    return n


def rect(x0, x1, y0, y1):
    b = Bits()
    n = nbits_signed(x0, x1, y0, y1)
    b.ub(n, 5)
    for v in (x0, x1, y0, y1):
        b.sb(v, n)
    return b.bytes()


def matrix(sx=1.0, sy=1.0, rot=0.0, tx=0, ty=0):
    b = Bits()
    a, d = sx * math.cos(rot), sy * math.cos(rot)
    r0, r1 = sx * math.sin(rot), -sy * math.sin(rot)
    fx = lambda f: int(round(f * 65536))
    if abs(a - 1) > 1e-6 or abs(d - 1) > 1e-6:
        b.ub(1, 1)
        n = nbits_signed(fx(a), fx(d))
        b.ub(n, 5); b.sb(fx(a), n); b.sb(fx(d), n)
    else:
        b.ub(0, 1)
    if abs(r0) > 1e-6 or abs(r1) > 1e-6:
        b.ub(1, 1)
        n = nbits_signed(fx(r0), fx(r1))
        b.ub(n, 5); b.sb(fx(r0), n); b.sb(fx(r1), n)
    else:
        b.ub(0, 1)
    n = nbits_signed(tx, ty)
    b.ub(n, 5); b.sb(int(tx), n); b.sb(int(ty), n)
    return b.bytes()


def tag(code, body):
    if len(body) < 63:
        return struct.pack('<H', (code << 6) | len(body)) + body
    return struct.pack('<HI', (code << 6) | 0x3f, len(body)) + body


def rgba(c):
    c = c.lstrip('#')
    return bytes(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (bytes([int(c[6:8], 16)]) if len(c) == 8 else b'\xff')


class Shape:
    """Collects a path (in twips, relative moves) for one fill style."""

    def __init__(self):
        self.b = Bits()
        self.x = self.y = 0

    def move(self, x, y, fill=1, line=0, first=False):
        b = self.b
        b.ub(0, 1)                      # non-edge record
        b.ub(0, 1)                      # new styles
        b.ub(1 if first else 0, 1)      # line style
        b.ub(1, 1)                      # fill style 1
        b.ub(0, 1)                      # fill style 0
        b.ub(1, 1)                      # move to
        n = nbits_signed(x, y)
        b.ub(n, 5); b.sb(x, n); b.sb(y, n)
        b.ub(fill, 1)                   # FillStyle1 (1 fill bit)
        if first:
            b.ub(line, 1)               # LineStyle (1 line bit)
        self.x, self.y = x, y

    def line(self, x, y):
        dx, dy = int(x - self.x), int(y - self.y)
        n = max(2, nbits_signed(dx, dy))
        b = self.b
        b.ub(1, 1); b.ub(1, 1); b.ub(n - 2, 4); b.ub(1, 1)
        b.sb(dx, n); b.sb(dy, n)
        self.x, self.y = self.x + dx, self.y + dy

    def curve(self, cx, cy, x, y):
        cdx, cdy = int(cx - self.x), int(cy - self.y)
        adx, ady = int(x - cx), int(y - cy)
        n = max(2, nbits_signed(cdx, cdy, adx, ady))
        b = self.b
        b.ub(1, 1); b.ub(0, 1); b.ub(n - 2, 4)
        for v in (cdx, cdy, adx, ady):
            b.sb(v, n)
        self.x, self.y = self.x + cdx + adx, self.y + cdy + ady

    def end(self):
        self.b.ub(0, 6)
        return self.b.bytes()


def circle(sh, cx, cy, r, first=True, fill=1):
    k = 8
    pts = []
    for i in range(k + 1):
        a = i * 2 * math.pi / k
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    sh.move(int(pts[0][0]), int(pts[0][1]), fill=fill, first=first)
    for i in range(1, k + 1):
        am = (i - 0.5) * 2 * math.pi / k
        rc = r / math.cos(math.pi / k)
        sh.curve(cx + rc * math.cos(am), cy + rc * math.sin(am), pts[i][0], pts[i][1])


def define_shape(sid, bounds, fills, draw, line=None):
    """DefineShape3 with the given fill styles (bytes each) and a draw(shape) callback."""
    body = struct.pack('<H', sid) + rect(*bounds)
    body += bytes([len(fills)]) + b''.join(fills)
    if line:
        body += bytes([1]) + struct.pack('<H', line[0] * TW) + rgba(line[1])
    else:
        body += bytes([0])
    b = Bits()
    b.ub(1, 4)   # NumFillBits
    b.ub(1, 4)   # NumLineBits
    head = b.bytes()
    sh = Shape()
    draw(sh)
    return tag(32, body + head + sh.end())


def solid(c):
    return b'\x00' + rgba(c)


def linear(c1, c2, w, h, x0=0, y0=0, vertical=True):
    # the gradient square is -16384..16384 twips; stretch it over the shape box
    if vertical:
        m = matrix(sx=h / 32768, sy=w / 32768, rot=math.pi / 2, tx=int(x0 + w / 2), ty=int(y0 + h / 2))
    else:
        m = matrix(sx=w / 32768, sy=h / 32768, tx=int(x0 + w / 2), ty=int(y0 + h / 2))
    grad = bytes([2]) + bytes([0]) + rgba(c1) + bytes([255]) + rgba(c2)
    return b'\x10' + m + grad


def radial(c1, c2, r):
    m = matrix(sx=r * 2 / 32768, sy=r * 2 / 32768)
    grad = bytes([2]) + bytes([0]) + rgba(c1) + bytes([255]) + rgba(c2)
    return b'\x12' + m + grad


def build():
    tags = []
    tags.append(tag(9, bytes.fromhex('87ceeb')))                     # background colour

    sw, sh_ = W * TW, H * TW
    # 1: sky
    def sky(s):
        s.move(0, 0, first=True); s.line(sw, 0); s.line(sw, sh_); s.line(0, sh_); s.line(0, 0)
    tags.append(define_shape(1, (0, sw, 0, sh_), [linear('#3a8ae8', '#cfeeff', sw, sh_)], sky))
    # 2: ground with hills
    gy = 330 * TW
    def ground(s):
        s.move(0, gy, first=True)
        for i in range(1, 12):
            x = i * sw / 11
            s.curve(x - sw / 22, gy - (40 if i % 2 else 10) * TW, x, gy)
        s.line(sw, sh_); s.line(0, sh_); s.line(0, gy)
    tags.append(define_shape(2, (0, sw, gy - 60 * TW, sh_), [linear('#6ad84a', '#2a8a1a', sw, sh_ - (gy - 40 * TW), 0, gy - 40 * TW)], ground, line=(3, '#1f6a12')))
    # 3: ball (centred on the origin)
    r = 34 * TW
    tags.append(define_shape(3, (-r - 60, r + 60, -r - 60, r + 60), [radial('#ffd0d0', '#e8201a', r)], lambda s: circle(s, 0, 0, r), line=(2, '#8a0a0a')))
    # 4: shadow
    def shadow(s):
        circle(s, 0, 0, 30 * TW)
    tags.append(define_shape(4, (-700, 700, -700, 700), [solid('#00000055')], shadow))
    # 5: star
    def star(s):
        R, rr = 22 * TW, 9 * TW
        pts = [(math.cos(-math.pi / 2 + i * math.pi / 5) * (R if i % 2 == 0 else rr), math.sin(-math.pi / 2 + i * math.pi / 5) * (R if i % 2 == 0 else rr)) for i in range(10)]
        s.move(int(pts[0][0]), int(pts[0][1]), first=True)
        for p in pts[1:] + pts[:1]:
            s.line(int(p[0]), int(p[1]))
    tags.append(define_shape(5, (-500, 500, -500, 500), [solid('#ffe030')], star, line=(2, '#e89a00')))
    # 6: sun
    tags.append(define_shape(6, (-1300, 1300, -1300, 1300), [radial('#fffbd0', '#ffc81a', 55 * TW)], lambda s: circle(s, 0, 0, 55 * TW)))
    # 7: "Flash" badge made from shapes (rounded label)
    def badge(s):
        w2, h2 = 70 * TW, 16 * TW
        s.move(-w2 + h2, -h2, first=True)
        s.line(w2 - h2, -h2); s.curve(w2, -h2, w2, 0); s.curve(w2, h2, w2 - h2, h2)
        s.line(-w2 + h2, h2); s.curve(-w2, h2, -w2, 0); s.curve(-w2, -h2, -w2 + h2, -h2)
    tags.append(define_shape(7, (-1500, 1500, -400, 400), [linear('#ff9a3a', '#e8541a', 140 * TW, 32 * TW, -70 * TW, -16 * TW)], badge, line=(2, '#ffffff')))

    def place(depth, cid, mat, new):
        flags = 0x04 | (0x02 if new else 0) | (0x01 if not new else 0)
        body = bytes([flags]) + struct.pack('<H', depth)
        if new:
            body += struct.pack('<H', cid)
        return tag(26, body + mat)

    first = True
    for f in range(FRAMES):
        t = f / FRAMES
        # ball ping-pongs horizontally and bounces
        bx = 90 + (W - 180) * (0.5 - 0.5 * math.cos(t * 2 * math.pi))
        hop = abs(math.sin(t * 3 * math.pi))
        by = 330 - 34 - hop * 190
        squash = 0.25 * max(0, 1 - hop * 6)
        frame = []
        frame.append(place(1, 1, matrix(), first))
        frame.append(place(2, 6, matrix(tx=450 * TW, ty=80 * TW, rot=t * 2 * math.pi / 3), first))
        frame.append(place(3, 2, matrix(), first))
        s = 1 - hop * 0.5
        frame.append(place(4, 4, matrix(sx=s * 1.3, sy=s * 0.35, tx=int(bx * TW), ty=int(334 * TW)), first))
        frame.append(place(5, 3, matrix(sx=1 + squash, sy=1 - squash, tx=int(bx * TW), ty=int((by + squash * 30) * TW)), first))
        for i in range(3):
            sx = (120 + i * 150) * TW
            sy = (110 + 25 * math.sin(t * 2 * math.pi + i * 2)) * TW
            frame.append(place(6 + i, 5, matrix(rot=t * 2 * math.pi * (1 if i % 2 else -1), tx=int(sx), ty=int(sy)), first))
        frame.append(place(10, 7, matrix(sx=1 + 0.05 * math.sin(t * 4 * math.pi), sy=1 + 0.05 * math.sin(t * 4 * math.pi), tx=100 * TW, ty=40 * TW), first))
        tags.extend(frame)
        tags.append(tag(1, b''))
        first = False
    tags.append(tag(0, b''))

    body = rect(0, W * TW, 0, H * TW) + struct.pack('<HH', FPS << 8, FRAMES) + b''.join(tags)
    data = b'FWS' + bytes([8]) + struct.pack('<I', 8 + len(body)) + body
    out = os.path.join(os.path.dirname(__file__), '..', 'games', 'flash-bounce', 'flash-bounce.swf')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'wb') as fh:
        fh.write(data)
    print('wrote', os.path.normpath(out), len(data), 'bytes')


if __name__ == '__main__':
    build()
