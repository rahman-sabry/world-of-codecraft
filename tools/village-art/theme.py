"""The look being baked: a named record, picked by THEME (unset or "ete": summer; "hiver": Valbrume's winter, the same
layout with snow, ice and bare trees). One process bakes one look: the modules read it when they are imported.

Each look renders its sprites into its own folder (ASSETS) and, for the legacy Valbrume chain (tools/bake_world.py,
bake_lands.py, bake_wide.py), bakes into its own folder of the mod (MONDE); tools/bake_map.py bakes into
art/<map>-<look>/. A look record:
  assets      sprite folder (build_assets.sh renders into it, the compositors read from it)
  monde       the legacy chain's folder of art/
  base        None, or the look whose sprite boxes this one's are cut to (buildings.fit: same size and anchor, so
              a map's layout data serves every look); build the base look's sprites first
  materiaux   None, or a palette transform applied once a model is built (tex.MATERIAUX: "hiver" = snow on faces
              turned up, ice for water)
  arbres_nus  oaks and autumn trees grow a leafless crown (buildings.bare)
  sol         ground-kind texture overrides, kind -> variant of extras.ground_tex ("neige", "glace"; the sea's "froide":
              colder, ice at its edges)
  herbe       grass tint: sec / dru (RGB factors on dry patches / lush hollows), brins (grass blades over edges)
  fleurs      flowers sprinkled on the grass
  teinte      optional: a daylight grade of the composite (bake_map.py): gris (desaturation), froid (RGB factors),
              brume (a colour mixed in by mix)"""
import os

LOOKS = {
    "ete": dict(assets="assets/", monde="monde", base=None, materiaux=None, arbres_nus=False, sol={},
                herbe=dict(sec=(1.07, 1.02, 0.86), dru=(0.92, 1.0, 1.05), brins="#7fb850"), fleurs=True),
    "hiver": dict(assets="assets-hiver/", monde="monde-hiver", base="ete", materiaux="hiver", arbres_nus=True,
                  sol={"grass": "neige", "dirt": "neige", "paved": "neige", "water": "glace", "crop": "neige",
                       "sand": "neige", "sea": "froide"},
                  herbe=dict(sec=(1.03, 1.03, 1.01), dru=(0.92, 0.96, 1.04), brins="#eef3f8"), fleurs=False),
}
# The marsh's autumn fog (maps/marais.json): rust and ochre foliage (tex.MATERIAUX "brume", in buildings.py), dun grass
# and greyer water (mapbake/sol.py), and a muted cold daylight: 'teinte' grades the day composite in bake_map.py
# (desaturation, a cold multiply, a mix towards the fog's colour). The mod drifts fog bands over it (look flag brume).
LOOKS["brume"] = dict(assets="assets-brume/", monde="monde-brume", base="ete", materiaux="brume", arbres_nus=False,
                      sol={"grass": "brume", "marais-eau": "brume"},
                      herbe=dict(sec=(1.04, 0.98, 0.9), dru=(0.94, 0.97, 1.0), brins="#b49a5a"), fleurs=False,
                      teinte=dict(gris=0.28, froid=(0.91, 0.95, 1.02), brume="#aeb6bc", mix=0.12))

THEME = os.environ.get("THEME", "")
assert THEME == "" or THEME in LOOKS, f"unknown THEME {THEME!r} (unset for summer, or one of {', '.join(LOOKS)})"
LOOK_ID = THEME or "ete"
LOOK = LOOKS[LOOK_ID]
ASSETS = LOOK["assets"]
MONDE = LOOK["monde"]
HIVER = LOOK_ID == "hiver"  # Valbrume's winter checks in the legacy chain (bake_world.py)
