"""Approximate reachability check for Jumpin' Jack levels: every coin and the
door must be reachable from the start with jumps of <=3 tiles up / <=4 across."""
import json, os, re, sys, collections
src = open(os.path.join(os.path.dirname(__file__), '../../games/_extras/jumpin-jack/game.js')).read()
block = src[src.index('const LEVELS = [') + len('const LEVELS = '):src.index('];', src.index('const LEVELS')) + 1]
levels = json.loads(block.replace("'", '"').replace('\n', ' ').replace(',  ]', ']').replace(', ]', ']'))
W, H = 20, 14
ok_all = True
for li, L in enumerate(levels):
    rows = list(L)
    while len(rows) < H: rows.insert(0, '')
    m = [list(r.ljust(W)[:W]) for r in rows]
    solid = lambda x, y: x < 0 or x >= W or (0 <= y < H and m[y][x] == '#')
    plat = lambda x, y: 0 <= y < H and 0 <= x < W and m[y][x] in '#='
    def stand(x, y):
        return 0 <= x < W and 0 <= y < H - 1 and m[y][x] not in '#^' and plat(x, y + 1)
    coins, door, start = [], None, None
    for y in range(H):
        for x in range(W):
            if m[y][x] == 'o': coins.append((x, y))
            if m[y][x] == 'D': door = (x, y)
            if m[y][x] == 'P': start = (x, y)
    seen = {start}; q = collections.deque([start])
    while q:
        x, y = q.popleft()
        for dx in range(-4, 5):
            for dy in range(-3, H):
                nx, ny = x + dx, y + dy
                if not stand(nx, ny) or (nx, ny) in seen: continue
                if dy < 0 and abs(dx) > 4: continue
                # crude: require headroom above the take-off cell when jumping up
                if dy < 0 and any(solid(x, y - k) for k in range(1, -dy + 1)): continue
                seen.add((nx, ny)); q.append((nx, ny))
    def reach(t):
        tx, ty = t
        return any(abs(sx - tx) <= 4 and 0 <= sy - ty <= 3 for sx, sy in seen)
    bad = [c for c in coins if not reach(c)]
    d = reach(door) if door else False
    print(f'level {li+1}: {len(coins)} coins, unreachable {bad}, door {"ok" if d else "UNREACHABLE"}')
    ok_all = ok_all and not bad and d
sys.exit(0 if ok_all else 1)
