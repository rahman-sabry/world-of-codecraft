#!/bin/sh
# Render the direction A sprites (every model of buildings.py's registry, props, trees, ground tiles) into the look's
# folder (theme.py): unset THEME, the summer ones into tools/village-art/assets/; THEME=hiver the winter ones into
# assets-hiver/ (cut to the summer boxes: build the base look's assets first).
# A few seconds per model. Needs numpy, scipy, pillow:
#   uv venv tools/village-art/.venv && uv pip install --python tools/village-art/.venv/bin/python numpy scipy pillow
set -eu
cd "$(dirname "$0")"
PY=${PY:-.venv/bin/python}
A=$("$PY" -c 'import theme; print(theme.ASSETS.rstrip("/"))')
mkdir -p "$A"
MODELS=$("$PY" -c 'import buildings; print(*buildings.B)')
for n in $MODELS; do
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
