#!/bin/bash
# usage: sheet.sh out.png id1 id2 ... -> demo screenshots + quick play test for each game
S=/tmp/claude-0/-home-user-MiniClipClassic/9c9feca7-5a73-52ba-81dc-cfd67c185337/scratchpad
out=$1; shift
files=()
for id in "$@"; do
  r1=$(node tools/test/gameshot.mjs $id $S/g_$id-demo.png demo)
  r2=$(node tools/test/gameshot.mjs $id $S/g_$id-play.png play wait300 ArrowLeft ArrowUp Space wait300 click320,240 wait400)
  echo "$id demo:$r1 play:$r2"
  files+=("$S/g_$id-demo.png" "$S/g_$id-play.png")
done
python3 - "$out" "${files[@]}" <<'PY'
import sys
from PIL import Image
out=sys.argv[1]; fs=sys.argv[2:]
cols=4; rows=(len(fs)+cols-1)//cols
sheet=Image.new('RGB',(320*cols,240*rows),(40,40,40))
for i,f in enumerate(fs):
    im=Image.open(f).convert('RGB').resize((320,240))
    sheet.paste(im,((i%cols)*320,(i//cols)*240))
sheet.save(out)
PY
