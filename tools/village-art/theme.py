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
  voile       optional (tools/bake_map.py): a haze over the map's composite, {jour, nuit: its colours, force, contraste}"""
import os

LOOKS = {
    "ete": dict(assets="assets/", monde="monde", base=None, materiaux=None, arbres_nus=False, sol={},
                herbe=dict(sec=(1.07, 1.02, 0.86), dru=(0.92, 1.0, 1.05), brins="#7fb850"), fleurs=True),
    "hiver": dict(assets="assets-hiver/", monde="monde-hiver", base="ete", materiaux="hiver", arbres_nus=True,
                  sol={"grass": "neige", "dirt": "neige", "paved": "neige", "water": "glace", "crop": "neige",
                       "sand": "neige", "sea": "froide"},
                  herbe=dict(sec=(1.03, 1.03, 1.01), dru=(0.92, 0.96, 1.04), brins="#eef3f8"), fleurs=False),
    # the oasis (maps/oasis.json): summer's sprites (its desert models are their own), the grass baked as desert sand,
    # the road a caravan track, the square sandstone flags; the sandstorm adds the 'voile' (mapbake/voile.py): a warm
    # dust haze over the composite, its contrast lowered, drifting streaks of blown sand
    "soleil": dict(assets="assets/", monde="oasis-soleil", base=None, materiaux=None, arbres_nus=False,
                   sol={"grass": "oasis-sable", "dirt": "oasis-piste", "paved": "oasis-dalles"},
                   herbe=dict(sec=(1.04, 1.0, 0.94), dru=(0.97, 0.97, 1.0), brins="#efd6a2"), fleurs=False),
    "tempete": dict(assets="assets/", monde="oasis-tempete", base=None, materiaux=None, arbres_nus=False,
                    sol={"grass": "oasis-sable", "dirt": "oasis-piste", "paved": "oasis-dalles"},
                    herbe=dict(sec=(1.04, 1.0, 0.94), dru=(0.97, 0.97, 1.0), brins="#efd6a2"), fleurs=False,
                    voile=dict(jour="#c79a64", nuit="#3a2e3a", force=0.42, contraste=0.64)),
}

THEME = os.environ.get("THEME", "")
assert THEME == "" or THEME in LOOKS, f"unknown THEME {THEME!r} (unset for summer, or one of {', '.join(LOOKS)})"
LOOK_ID = THEME or "ete"
LOOK = LOOKS[LOOK_ID]
ASSETS = LOOK["assets"]
MONDE = LOOK["monde"]
HIVER = LOOK_ID == "hiver"  # Valbrume's winter checks in the legacy chain (bake_world.py)
