// The map of Emberdeep (Braisefonde): a dwarven forge city in a cavern hall under a mountain (art/forge-forge,
// art/forge-braises: the world is x -1000 to 4000, 400 logical px high, with the immersive bands; 1 art px = 1 logical
// px), and its looks. Read through lieux.js. Hand-edited, but for the bake's own data (carte-forge-data.js, from
// maps/forge.json by tools/bake_map.py), referenced here. The layout, west to east: a flagstone side hall (the raid
// boss's west lair) with a smelter; the barn (the hall's stores), a lava channel under a stone bridge, the mage
// tower, the forge workshop, the tavern; the Great Forge on its dais (fed by a lava runnel from a third channel) and
// the market square; the town hall, the temple; a second channel and bridge, the barracks, a flagstone side hall
// (the east lair) with the other smelter. The cavern's basalt walls fill the north band, a lava lake the south band.
// Buildings stand at their layout point `at`, with the same offsets as in Valbrume where the art is the same (box,
// chimneys, glows, standards).

import { WORLD, TILES, FRONTS, EXT } from "./carte-forge-data.js";

export const FORGE = {
  id: "forge",
  nom: "forge", // i18n maps
  /** Its looks (tools/bake_map.py maps/forge.json --look forge | braises): roaring forges, and banked embers (dimmer
   *  lava and fires, sparks drifting up: `braises`). No fish, no snow. */
  looks: [
    { id: "forge", nom: "forge", dossier: "forge-forge", neige: false, poissons: false, fond: "#1c1618" },
    { id: "braises", nom: "braises", dossier: "forge-braises", neige: false, poissons: false, braises: true, fond: "#161214" },
  ],
  WORLD, TILES, FRONTS, EXT,

  /** The buildings, as carte-valbrume.js's (box, spots, fumees, lueurs, bannieres offsets from `at`); the spots are
   *  this layout's, on open ground in front of each building, clear of the lava. Glows with `jour` glow by day too
   *  (forges and lava under a mountain); `looks: ["forge"]` ones only while the forges roar. The Great Forge and the
   *  two smelters are buildings too (hit boxes, chimneys, glows). */
  batiments: {
    grange: { at: [90, 205], box: [-110, -155, 220, 200],
      spots: [[-60, 80], [60, 95], [140, 62], [-150, 62], [-10, 120]],
      lueurs: [{ at: [312, -40], size: 90, color: "#ff7a1a", period: 3100, jour: 0.6, looks: ["forge"] }] }, // channel A
    tour: { at: [620, 300], box: [-55, -333, 110, 350],
      spots: [[130, 24], [80, -6], [185, 4], [-90, -10], [40, 30]],
      lueurs: [{ at: [-2, -188], size: 70, color: "#a86bff", period: 2200 }] },
    atelier: { at: [880, 222], box: [-110, -145, 230, 200],
      spots: [[150, 85], [75, 75], [110, 100], [-40, 81], [230, 97]],
      fumees: [[-33, -120]],
      lueurs: [{ at: [-45, 21], size: 60, color: "#ff8a2b", period: 650, jour: 0.5 }] },
    hotel: { at: [2190, 268], box: [-165, -270, 330, 320],
      bannieres: [[-108, 46], [-18, 54], [-140, 60]] },
    taverne: { at: [1150, 238], box: [-135, -205, 230, 250],
      fumees: [[-20, -198], [29, -145]] },
    temple: { at: [2540, 272], box: [-140, -282, 270, 350],
      spots: [[-90, 95], [0, 100], [60, 92], [-150, 85], [110, 80]] },
    caserne: { at: [2985, 228], box: [-140, -162, 240, 220],
      spots: [[130, 70], [0, 80], [210, 50], [-90, 85], [60, 95], [100, 110], [270, 40], [-40, 100]],
      lueurs: [{ at: [-200, 120], size: 90, color: "#ff7a1a", period: 3400, jour: 0.6, looks: ["forge"] }] }, // channel B
    grandeforge: { at: [1470, 245], box: [-150, -310, 300, 380],
      fumees: [[6, -305]],
      lueurs: [
        { at: [-29, -48], size: 90, color: "#ff8a2b", period: 900, jour: 0.55 }, // the furnace mouth
        { at: [22, -11], size: 70, color: "#ffb43a", period: 1500, jour: 0.5 }, // the crucible
        { at: [6, -298], size: 60, color: "#ff8a2b", period: 1900, jour: 0.4, looks: ["forge"] }, // the flue's crown
        { at: [162, -33], size: 70, color: "#ff7a1a", period: 2600, jour: 0.5, looks: ["forge"] }, // the runnel's pool
      ] },
    fonderie: { at: [-60, 150], box: [-45, -205, 90, 225],
      fumees: [[0, -200]],
      lueurs: [{ at: [-18, -8], size: 50, color: "#ff8a2b", period: 800, jour: 0.45 }] },
    fonderie2: { at: [3330, 150], box: [-45, -205, 90, 225],
      fumees: [[0, -200]],
      lueurs: [{ at: [-18, -8], size: 50, color: "#ff8a2b", period: 850, jour: 0.45 }] },
  },
  /** The market on the square east of the Great Forge, at the red stall's point: its box and the rogues' spots. */
  marche: { at: [1790, 300], box: [-110, -50, 290, 110],
    spots: [[-50, 61], [45, 88], [-105, 33], [125, 75], [-145, 5]] },

  /** Where idle heroes stroll: the west side hall, the village road and the fronts of its buildings, the Great
   *  Forge's square and the market, past the second bridge, the east side hall. */
  FLANE: [
    [-880, 340], [-720, 250], [-560, 345], [-470, 355], [-370, 360], [-400, 252], [-250, 340], [-140, 300], [20, 330], [180, 320], [500, 300],
    [720, 370], [960, 360], [1150, 370], [1225, 378], [1300, 370], [1560, 385], [1780, 380], [2050, 380], [2300, 330], [2470, 385],
    [2880, 385], [3060, 360], [3200, 270], [3360, 360], [3480, 255], [3620, 365], [3720, 255], [3880, 360],
  ],
  /** The road across the world (feet points, the baked road's centre): through the west hall, over the first bridge,
   *  along the village, in front of the Great Forge and through the market, past the town hall and the temple, over
   *  the second bridge, past the barracks and through the east hall. The bridges' decks are on it. */
  ROAD: [
    [-1000, 300], [-800, 296], [-600, 302], [-400, 298], [-200, 294], [0, 292], [150, 288], [210, 280], [268, 269],
    [392, 331], [470, 338], [620, 342], [760, 330], [900, 318], [1000, 315], [1140, 326], [1260, 332], [1380, 356],
    [1480, 362], [1600, 360], [1700, 352], [1820, 350], [1960, 342], [2060, 352], [2180, 362], [2300, 364],
    [2440, 366], [2560, 360], [2630, 340], [2683, 314], [2807, 376], [2880, 345], [2960, 330], [3060, 322],
    [3200, 318], [3400, 322], [3600, 316], [3800, 320], [4000, 318],
  ],
  /** Where no unit stands (maps/forge.json's lava, map px): the two channels, each left open where its bridge's deck
   *  crosses it (lines up to 60 px from the deck, then the lava beside the deck as two parallelograms), the channel
   *  feeding the Great Forge and its pool, and the lava lake along the south. The road over a deck is walkable as
   *  road (no DECK: lieux.js has one deck line, and there are two bridges). */
  EAU: [
    { ligne: [[440, -420], [470, -220], [430, -40], [410, 120], [400, 230], [384, 273]], demi: 32 },
    { ligne: [[276, 327], [262, 380], [240, 440]], demi: 32 },
    { polygone: [[286, 290], [244, 311], [309, 343], [351, 322]] },
    { polygone: [[351, 257], [309, 278], [374, 310], [416, 289]] },
    { ligne: [[2840, -420], [2870, -200], [2820, -20], [2810, 140], [2800, 260], [2799, 318]], demi: 32 },
    { ligne: [[2691, 372], [2680, 420], [2660, 460]], demi: 32 },
    { polygone: [[2701, 335], [2659, 356], [2724, 388], [2766, 367]] },
    { polygone: [[2766, 302], [2724, 323], [2789, 355], [2831, 334]] },
    { ligne: [[1720, -420], [1700, -200], [1690, -20], [1660, 100], [1640, 190]], demi: 22 },
    { ellipse: [1632, 212, 30, 20] },
    { polygone: [[-1060, 406], [-560, 408], [-60, 399], [330, 396], [700, 398], [880, 382], [980, 378], [1080, 392],
      [1500, 406], [2050, 402], [2500, 389], [2600, 386], [2700, 396], [3150, 402], [3700, 402], [4060, 406],
      [4060, 820], [-1060, 820]] },
  ],
  DECK: [],
  SPOT_R: 60, ROAD_R: 30,

  /** The victory-day standards: open ground 25+ px off the road, 40+ px from every stroll and work spot, off the lava
   *  and out of the building boxes (checked on the bake). */
  VICTOIRE: [
    [-950, 270], // the west hall, by its far pillar
    [-750, 210], // the west hall's back
    [-250, 380], // the west hall's mouth, by the lava shore
    [0, 375], // below the barn, on the shore side of the road
    [500, 250], // between the first bridge and the mage tower
    [750, 275], // between the mage tower and the forge workshop
    [1550, 330], // the Great Forge's dais, by the casting moulds
    [2000, 380], // the market's east end, by the shore
    [2340, 330], // in front of the town hall, right of its steps
    [3010, 370], // below the barracks, past the second bridge
    [3500, 290], // the east hall
    [3750, 290], // the east hall, by its pillar
  ],

  /** A fighting hero's creature stands on its right, on its left past this x: 300 px short of the world's east edge. */
  BASCULE: 3700,
  /** The raid boss's lairs (activite.js antre): the two flagstone side halls, along the road and their stroll spots. */
  ANTRE: { ouest: { x: [-650, -200], y: [300, 330] }, est: { x: [3240, 3690], y: [315, 340] } },

  // village life (ambiance.js): walkers along the road (a miner over the first bridge, a guard by night), no hens
  // (HENS empty), the tavern cat, the roaming cats (west village; the forge's square; the market and the town hall),
  // no stag and no sparrows under the mountain (STAG, MOINEAUX null), no fish (no water), the treasury in front of
  // the town hall, the fair's pennants over the market
  MARCHEURS: {
    paysanne: [[1480, 362], [1600, 360], [1700, 352], [1820, 350], [1960, 342]],
    fermier: [[0, 292], [150, 288], [210, 280], [268, 269], [392, 331], [470, 338], [620, 342]],
    marchand: [[1820, 350], [1960, 342], [2060, 352], [2180, 362], [2300, 364]],
    garde: [[1140, 326], [1260, 332], [1380, 356], [1480, 362], [1600, 360]],
  },
  HENS: [],
  CAT: [1166, 283],
  CATS: [
    { stops: [[20, 330], [180, 320], [500, 300], [720, 370]], speed: 24 },
    { stops: [[960, 360], [1150, 370], [1225, 378], [1300, 370], [1560, 385]], speed: 28 },
    { stops: [[1780, 380], [2050, 380], [2300, 330], [2470, 385]], speed: 22 },
  ],
  STAG: null,
  FISH: [],
  TREASURY: [2172, 330],
  FAIR: [[1655, 323], [1865, 323]],
  MOINEAUX: null,
};
