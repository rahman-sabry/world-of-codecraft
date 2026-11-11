// The map of Valbrume: where things are in its baked world (art/monde, art/monde-hiver: the village is x 0-3000 of a
// world from -1000 to 4000, 400 logical px high; 1 art px = 1 logical px), and its looks. Read through lieux.js.
// Hand-edited, but for the bake's own data (monde-data.js, terre-data.js), referenced here.
// Buildings are placed by their bake point (tools/village-art/compose2.py scene(): the object's (u, v), world
// coordinates; bake_lands.py and bake_wide.py widen the canvas, not the coordinates); their hit box, work spots,
// chimneys, glows and standards are offsets from it, so another layout places the buildings and gets these with them.

import { WORLD, TILES, FRONTS } from "./monde-data.js";
import { EXT } from "./terre-data.js";

export const VALBRUME = {
  id: "valbrume",
  nom: "valbrume", // i18n maps
  /** Its looks, each baked into its own folder of art/ (tools/bake_*.py, THEME=hiver for the winter one): nom (i18n
   *  looks), snow falling, fish leaping in the river, and the view's background under the world. */
  looks: [
    { id: "ete", nom: "ete", dossier: "monde", neige: false, poissons: true, fond: "#3f6b2c" },
    { id: "hiver", nom: "hiver", dossier: "monde-hiver", neige: true, poissons: false, fond: "#c9d3df" },
  ],
  // the bake: world extent, tiles, front cut-outs, the bands around the village
  WORLD, TILES, FRONTS, EXT,

  /** The buildings (hit boxes for the tooltip and the double-click recruit, the chronicle's tags), each at its bake
   *  point `at`; offsets from it: box [dx, dy, w, h], spots (feet points where the demo heroes of the class working
   *  there stand while working / blocked / done, first free wins; with FLANE and ROAD, the walkable points a working
   *  hero moves between), fumees (chimney tops), lueurs (live glows at night: at, size, color, period), bannieres (the
   *  trophy standards' pole feet in front of the door, in the order they are earned: left of the steps, right of
   *  them, then further left, clear of the lanterns and the road). */
  batiments: {
    grange: { at: [180, 230], box: [-110, -155, 220, 200], // barn and archery spot (ranger)
      spots: [[240, 115], [110, 70], [340, 82], [170, 148], [290, 150]] },
    tour: { at: [560, 348], box: [-55, -333, 110, 350], // mage tower (mage)
      spots: [[130, 24], [80, -6], [185, 4], [-90, -10], [40, 42]],
      lueurs: [{ at: [-2, -188], size: 70, color: "#a86bff", period: 2200 }] }, // tower windows
    atelier: { at: [860, 215], box: [-110, -145, 230, 200], // forge-workshop (artificer)
      spots: [[150, 85], [75, 75], [200, 57], [-40, 81], [230, 97]],
      fumees: [[-33, -120]],
      lueurs: [{ at: [-45, 21], size: 60, color: "#ff8a2b", period: 650 }] }, // forge hearth
    hotel: { at: [1280, 290], box: [-165, -270, 330, 320], // town hall
      bannieres: [[-108, 46], [-18, 54], [-140, 60]] },
    taverne: { at: [1610, 245], box: [-135, -205, 230, 250],
      fumees: [[-20, -198], [29, -145]] },
    temple: { at: [2030, 292], box: [-140, -282, 270, 350], // temple (priest)
      spots: [[160, 80], [205, 46], [80, 96], [260, 70], [130, 38]] },
    caserne: { at: [2470, 262], box: [-140, -162, 240, 220], // barracks (warrior, shells on guard)
      spots: [[130, 76], [0, 83], [230, 56], [-90, 90], [60, 106], [190, 104], [280, 83], [-40, 118]] },
  },
  /** The market, at the red stall's bake point: its box (the red and blue stalls; a chronicle tag, no hit box) and the
   *  rogues' spots (class building etal1). */
  marche: { at: [1730, 395], box: [-83, -86, 317, 91],
    spots: [[290, 0], [5, -75], [-690, -77], [-770, -79], [-540, -3]] },

  /** Where idle heroes stroll (feet points on open ground, in front of every object of the new lands): the
   *  village (road, square, in front of the buildings), the farmland west (fields, the windmill's door) and,
   *  over the footbridge, the east lands (by the jetty, the lake's south and east shores, along the lane). */
  FLANE: [
    [330, 335], [640, 350], [900, 340], [1200, 380], [1520, 335], [1598, 352], [1680, 342], [1900, 352], [2150, 375],
    [2450, 360], [2700, 305], [-180, 345], [-260, 325], [-460, 365], [-505, 322], [-640, 330], [-800, 345], [-920, 346],
    [3400, 250], [3545, 292], [3700, 316], [3835, 228], [3920, 322],
  ],
  /** The dirt road along the front of the village (screen feet points), walked between spots; west, it follows
   *  the baked road through the farmland (kept a little north at -620 to pass behind no bush); east, the baked
   *  path over the footbridge (its ramps at 3054 and 3168, the deck 7 px up: feet on the planks, behind the
   *  front rail's cut-outs) to the lane by the lake (tools/bake_wide.py, CROSSING and LANE). */
  ROAD: [
    [-1000, 350], [-840, 340], [-620, 354], [-400, 338], [-180, 352], [0, 330], [200, 320], [420, 372], [640, 345], [900, 330], [1060, 360], [1350, 380], [1500, 372],
    [1610, 392], [1720, 360], [1900, 350], [2150, 372], [2330, 340], [2560, 330], [2700, 300],
    [2840, 288], [2950, 256], [3054, 201], [3063, 199], [3159, 247], [3168, 259], [3250, 284], [3340, 282], [3426, 252], [3600, 322], [3800, 310], [4000, 335],
  ],
  // The water, measured on the baked world (tools/bake_wide.py): the river's centre line and half width, the lake's
  // ellipse [cx, cy, rx, ry], and the footbridge's deck (walkable over the river).
  RIVER: [[3420, 20], [3300, 110], [3130, 190], [3070, 260], [3020, 330], [2860, 380], [2740, 410]],
  RIVER_R: 36,
  LAKE: [3570, 165, 245, 130],
  DECK: [[3054, 201], [3168, 259]],
  // walkable ground: within SPOT_R of a stroll or work spot, ROAD_R of the road
  SPOT_R: 60, ROAD_R: 30,

  /** The victory-day standards (place.js etendards: one red cup standard each, on a day the boss is slain): the feet of
   *  their poles around the whole world, both looks, on open ground 25+ px off the road, 40+ px from every stroll and
   *  work spot, out of the water and the building boxes, no door hidden (checked on the bake). */
  VICTOIRE: [
    [-820, 305], // west farmland, in front of the west field's fence
    [-440, 300], // by the windmill, between it and the east field
    [360, 300], // along the road, by the barn's hay
    [660, 300], // along the road, right of the mage tower
    [1462, 300], // the market square, between the town hall and the tavern
    [2190, 300], // by the temple, right of its steps
    [2600, 280], // by the barracks, right of its tower
    [3020, 190], // the footbridge's west end, north of the ramp
    [3222, 247], // the footbridge's east end, between the river and the road
    [3348, 246], // the lake shore, west of the jetty
    [3790, 278], // the lake's east shore, above the lane
    [3890, 372], // the east lane, south side among the bushes
  ],

  /** A fighting hero's creature stands on its right, on its left past this x: the old 3000 px world's right edge
   *  minus 300, kept as it was when the world grew to 4000 (activite.js, the apprentices' side in place.js). */
  BASCULE: 2700,

  // village life (ambiance.js): the walkers' stops by walker, the hens [x, y, peck period] by the barn, the tavern
  // cat, the roaming cats' stops (windmill fields and barn; barn, tavern and market; market, jetty and lake shore)
  // and speed (px/s), the stag at the forest edge, the fish in the river [x, y, period], the treasury in front of the
  // town hall, the fair's pennant line over the square, the sparrows' first circle centre over the fields
  MARCHEURS: {
    paysanne: [[1010, 368], [1215, 340], [1360, 382], [1500, 374], [1735, 366]],
    fermier: [[80, 332], [210, 322], [330, 348], [430, 374], [560, 356]],
    marchand: [[1760, 360], [1900, 352], [2040, 372], [2160, 374]],
    garde: [[1215, 340], [1400, 384], [1610, 394], [1735, 366]],
  },
  HENS: [[195, 270, 2600], [229, 278, 3100], [166, 282, 3700]],
  CAT: [1626, 290],
  CATS: [
    { stops: [[-505, 322], [-460, 365], [-180, 345], [290, 300], [330, 335]], speed: 24 },
    { stops: [[290, 300], [1520, 335], [1598, 352], [1680, 342], [1735, 320]], speed: 28 },
    { stops: [[1680, 342], [1900, 352], [3400, 250], [3545, 292], [3700, 316]], speed: 22 },
  ],
  STAG: [2790, 252],
  FISH: [[2858, 372, 4200], [2912, 350, 5300]],
  TREASURY: [1262, 352],
  FAIR: [[1508, 300], [1700, 300]],
  MOINEAUX: [180, 150],
};
