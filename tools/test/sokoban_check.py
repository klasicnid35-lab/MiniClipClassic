"""Verify Box Pusher levels are solvable (BFS over push states).
usage: python3 sokoban_check.py  (reads LEVELS from games/box-pusher/game.js)"""
import re, json, sys, collections, os
src = open(os.path.join(os.path.dirname(__file__), '../../games/box-pusher/game.js')).read()
block = src[src.index('const LEVELS = [') + len('const LEVELS = '):src.index('];') + 1]
levels = json.loads(block.replace("'", '"').replace(',\n]', '\n]'))

def solve(rows, limit=400000):
    walls, goals, boxes = set(), set(), set()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == '#': walls.add((x, y))
            if ch in '.*+': goals.add((x, y))
            if ch in '$*': boxes.add((x, y))
            if ch in '@+': p = (x, y)
    if len(boxes) != len(goals): return f'boxes {len(boxes)} != goals {len(goals)}'
    start = (p, frozenset(boxes))
    seen = {start}; q = collections.deque([(start, 0)])
    D = [(1,0),(-1,0),(0,1),(0,-1)]
    while q:
        (p, bx), d = q.popleft()
        if bx <= goals: return d
        for dx, dy in D:
            n = (p[0]+dx, p[1]+dy)
            if n in walls: continue
            nb = bx
            if n in bx:
                n2 = (n[0]+dx, n[1]+dy)
                if n2 in walls or n2 in bx: continue
                nb = (bx - {n}) | {n2}
            s = (n, nb)
            if s in seen: continue
            if len(seen) > limit: return 'too big'
            seen.add(s); q.append((s, d+1))
    return None

ok = True
for i, L in enumerate(levels):
    r = solve(L)
    print(f'level {i+1}: ' + (f'solvable in {r} moves' if isinstance(r, int) else f'PROBLEM: {r}'))
    ok = ok and isinstance(r, int)
sys.exit(0 if ok else 1)
