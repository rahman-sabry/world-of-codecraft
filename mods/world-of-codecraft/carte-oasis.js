// The map of the Oasis of Sahrim: a desert town round an oasis pool (art/oasis-soleil, art/oasis-tempete: the world is
// x -1000 to 4000, 400 logical px high, with the immersive bands; 1 art px = 1 logical px), and its looks. Read
// through lieux.js. Hand-edited, but for the bake's own data (carte-oasis-data.js, from maps/oasis.json by
// tools/bake_map.py), referenced here. The layout, west to east: a flat of cracked hardpan (the raid boss's west lair),
// the barn and its irrigated plots, the mage tower, the forge, the tavern (a caravanserai with an awning and jars);
// the oasis pool in its ring of date palms, the market on the sandstone square at its east bank with the well; the
// town hall, the temple, the barracks; the ruined temple of the dunes on the east hardpan (the east lair). Dunes fill
// the north band and the far south; the road, a caravan track, runs from end to end. The buildings are the town's
// own models in sandstone and adobe (oasis-<model> in buildings.py: the same volumes), so the offsets from `at` (box,
// chimneys, glows, standards) are Valbrume's.

import { WORLD, TILES, FRONTS, EXT } from "./carte-oasis-data.js";

export const OASIS = {
  id: "oasis",
  nom: "oasis", // i18n maps
  /** Its looks (tools/bake_map.py maps/oasis.json --look soleil | tempete): the midday sun, and the sandstorm (the
   *  bake's dust haze, plus place.js `sable`: a dust veil and blown sand over the view). A fish leaps in the pool by
   *  day; not in the storm. */
  looks: [
    { id: "soleil", nom: "soleil", dossier: "oasis-soleil", neige: false, poissons: true, fond: "#c9a066" },
    { id: "tempete", nom: "tempete", dossier: "oasis-tempete", neige: false, poissons: false, sable: true, fond: "#a9845a" },
  ],
  WORLD, TILES, FRONTS, EXT,

  /** The buildings, as carte-valbrume.js's (box, spots, fumees, lueurs, bannieres offsets from `at`); the spots are
   *  this layout's, on open ground in front of each building. The ruined temple (ruine) is a building too: its hit
   *  box, and its runes' live glow at night. */
  batiments: {
    grange: { at: [150, 205], box: [-110, -155, 220, 200],
      spots: [[-60, 80], [60, 95], [150, 70], [-150, 60], [200, 110]] },
    tour: { at: [520, 345], box: [-55, -333, 110, 350],
      spots: [[130, 24], [80, -6], [185, 4], [-90, -10], [40, 30]],
      lueurs: [{ at: [-2, -188], size: 70, color: "#a86bff", period: 2200 }] },
    atelier: { at: [840, 215], box: [-110, -145, 230, 200],
      spots: [[150, 85], [75, 75], [200, 57], [-40, 81], [230, 97]],
      fumees: [[-33, -120]],
      lueurs: [{ at: [-45, 21], size: 60, color: "#ff8a2b", period: 650 }] },
    hotel: { at: [2200, 290], box: [-165, -270, 330, 320],
      bannieres: [[-108, 46], [-18, 54], [-140, 60]] },
    taverne: { at: [1180, 245], box: [-135, -205, 230, 250],
      fumees: [[-20, -198], [29, -145]] },
    temple: { at: [2580, 292], box: [-140, -282, 270, 350],
      spots: [[150, 60], [205, 40], [60, 88], [250, 44], [140, 50]] },
    caserne: { at: [2880, 245], box: [-140, -162, 240, 220],
      spots: [[130, 70], [0, 80], [210, 50], [-90, 85], [60, 95], [-150, 60], [270, 40], [-40, 100]] },
    ruine: { at: [3450, 150], box: [-200, -200, 400, 300],
      lueurs: [{ at: [44, -70], size: 70, color: "#a86bff", period: 3000 }] },
  },
  /** The market on the sandstone square by the pool, at the red stall's point: its box (the stalls and awnings) and
   *  the rogues' spots, on the square and the pool's bank. */
  marche: { at: [1800, 250], box: [-110, -60, 320, 140],
    spots: [[-50, 61], [45, 88], [-105, 33], [125, 95], [-145, 17]] },

  /** Where idle heroes stroll: the west hardpan, by the barn, the tower and the forge, the caravanserai, the pool's
   *  south bank, the square, in front of the town hall and the temple, behind the barracks, and the east hardpan
   *  below the ruined temple. */
  FLANE: [
    [-900, 245], [-760, 375], [-620, 245], [-480, 375], [-340, 245], [-200, 375], [-60, 250], [280, 250], [700, 330],
    [1000, 345], [1250, 300], [1440, 360], [1700, 380], [1830, 280], [2020, 330], [2380, 360], [2760, 380], [3080, 270],
    [3240, 375], [3380, 262], [3520, 375], [3660, 262], [3800, 375], [3930, 250],
  ],
  /** The road across the world (feet points, the baked track's centre): over the west hardpan, past the barn, behind
   *  the mage tower, along the forge and the tavern, below the pool, across the square, along the town hall and the
   *  temple, past the barracks and over the east hardpan below the ruined temple. */
  ROAD: [
    [-1000, 310], [-800, 312], [-600, 308], [-400, 311], [-220, 309], [-80, 304], [60, 296], [200, 300], [340, 292],
    [460, 288], [600, 284], [720, 295], [840, 300], [960, 300], [1080, 306], [1200, 318], [1320, 326], [1440, 330],
    [1560, 330], [1690, 342], [1800, 362], [1920, 370], [2040, 374], [2160, 380], [2300, 382], [2450, 386], [2600, 388],
    [2740, 372], [2860, 340], [2980, 330], [3100, 318], [3240, 312], [3400, 310], [3560, 309], [3720, 311], [3860, 310],
    [4000, 310],
  ],
  /** The water: the oasis pool (maps/oasis.json's iso circle of radius 117 round [1520, 205]: an ellipse on screen). */
  EAU: [{ ellipse: [1520, 205, 165, 83] }],
  DECK: [],
  SPOT_R: 60, ROAD_R: 30,

  /** The victory-day standards: open ground 25+ px off the road, 40+ px from every stroll and work spot, out of the
   *  water and the building boxes (checked on the bake). */
  VICTOIRE: [
    [-700, 280], // the west hardpan, above the road
    [-430, 370], // the west hardpan, below the road
    [20, 230], // left of the barn
    [300, 200], // right of the barn, behind its plot
    [760, 340], // along the road, below the forge
    [1290, 280], // by the caravanserai's awning
    [1610, 300], // the pool's south bank
    [2000, 280], // the square, right of the stalls
    [2400, 310], // between the town hall and the temple
    [3195, 355], // below the road, right of the barracks
    [3330, 260], // the east hardpan, below the ruined temple
    [3840, 380], // the east hardpan, below the road
  ],

  /** A fighting hero's creature stands on its right, on its left past this x: 300 px short of the world's east edge. */
  BASCULE: 3700,
  /** The raid boss's lairs (activite.js antre): the open hardpan at each end, along the road (which runs through both
   *  at y 310) and their stroll spots above and below it. */
  ANTRE: { ouest: { x: [-680, -230], y: [300, 330] }, est: { x: [3260, 3680], y: [300, 330] } },

  // village life (ambiance.js): walkers along the road and the square, the hens by the barn and the tavern cat (as in
  // Valbrume, from their buildings), the roaming cats (barn and tower; caravanserai, pool and square; square, town hall
  // and temple), the stag among the palms north of the pool, a fish leaping in the pool, the treasury in front of the
  // town hall, the fair's pennants over the square, the sparrows over the barn's plots
  MARCHEURS: {
    paysanne: [[1200, 318], [1320, 326], [1440, 330], [1560, 330], [1690, 342], [1800, 362]],
    fermier: [[-80, 304], [60, 296], [200, 300], [340, 292], [460, 288], [600, 284]],
    marchand: [[1690, 342], [1800, 362], [1920, 370], [2040, 374], [2160, 380], [2300, 382]],
    garde: [[1560, 330], [1690, 342], [1800, 362], [1920, 370], [2040, 374], [2160, 380]],
  },
  HENS: [[165, 245, 2600], [199, 253, 3100], [136, 257, 3700]],
  CAT: [1196, 290],
  CATS: [
    { stops: [[280, 250], [90, 285], [350, 315], [700, 330]], speed: 24 },
    { stops: [[1250, 300], [1440, 360], [1700, 380], [1830, 280]], speed: 28 },
    { stops: [[1830, 280], [2020, 330], [2380, 360], [2730, 352]], speed: 22 },
  ],
  STAG: [1720, 112],
  FISH: [[1520, 225, 4800]],
  TREASURY: [2182, 352],
  FAIR: [[1720, 290], [1960, 290]],
  MOINEAUX: [100, 120],
};
