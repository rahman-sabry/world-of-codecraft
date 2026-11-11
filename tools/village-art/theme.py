"""The map being baked: THEME=hiver is Valbrume in winter (same layout, snow, ice, bare trees); unset, the summer map.

Each theme renders its sprites into its own folder (ASSETS) and bakes into its own folder of the mod (MONDE)."""
import os

THEME = os.environ.get("THEME", "")
assert THEME in ("", "hiver"), f"unknown THEME {THEME!r} (unset for summer, or hiver)"
HIVER = THEME == "hiver"
ASSETS = "assets-hiver/" if HIVER else "assets/"
MONDE = "monde-hiver" if HIVER else "monde"
