#!/bin/sh
# Render the direction A sprites (buildings, props, trees, ground tiles) into tools/village-art/assets/, or with
# THEME=hiver the winter ones into assets-hiver/ (cut to the summer boxes: build the summer assets first).
# A few seconds per model. Needs numpy, scipy, pillow:
#   uv venv tools/village-art/.venv && uv pip install --python tools/village-art/.venv/bin/python numpy scipy pillow
set -eu
cd "$(dirname "$0")"
PY=${PY:-.venv/bin/python}
A=assets
[ "${THEME:-}" = hiver ] && A=assets-hiver
mkdir -p "$A"
for n in tavern townhall magetower forge barracks temple barn stall-red stall-blue stall-green well noticeboard campfire \
         tree-oak tree-pine bush tree-autumn rocks fence-x fence-y windmill dock ruin bridge bridge-rail; do
  OUT=$A/p-$n "$PY" buildings.py "$n" >/dev/null &
done
wait
"$PY" extras.py >/dev/null
A=$A "$PY" - <<'PYEOF'
import glob, json, os, shutil
A = os.environ["A"] + "/"
meta = json.load(open(A + "meta.json")) if os.path.exists(A + "meta.json") else {}
for d in sorted(glob.glob(A + "p-*")):
    for f in glob.glob(d + "/*.png"):
        shutil.copy(f, A)
    meta.update(json.load(open(d + "/meta.json")))
    shutil.rmtree(d)
json.dump(meta, open(A + "meta.json", "w"), indent=1)
print(len(meta), "sprites in", A)
PYEOF
