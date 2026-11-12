// The map of Mirewick: a marsh town (art/marais-ete, art/marais-brume: the world is x -1000 to 4000, 400 logical px
// high, with the immersive bands; 1 art px = 1 logical px), and its looks. Read through lieux.js.
// Hand-edited, but for the bake's own data (carte-marais-data.js, from maps/marais.json by tools/bake_map.py),
// referenced here. The layout, west to east: a meadow (the raid boss's west lair), the barn and its plot, a boardwalk
// over a reedy inlet, the mage tower, the forge, a boardwalk over the creek that runs through the town, the town hall,
// the market square, the tavern on stilts in its pond, the temple, a boardwalk over a second inlet, the barracks, the
// witch's hut on stilts in a black pool, and a meadow (the east lair). Dense swamp forest with pools in the north band,
// open marsh water with islets and stilt huts in the south band.
// Buildings stand at their layout point `at`, with the same offsets as in Valbrume where the art is the same (box,
// chimneys, glows, standards); the stilt tavern's are 14 px higher (its floor 10 units up).

import { WORLD, TILES, FRONTS, EXT } from "./carte-marais-data.js";

export const MARAIS = {
  id: "marais",
  nom: "marais", // i18n maps
  /** Its looks (tools/bake_map.py maps/marais.json --look ete | brume). The autumn fog drifts bands of mist over the
   *  view (brume); fireflies blink over the water at night in both. */
  looks: [
    { id: "ete", nom: "ete", dossier: "marais-ete", neige: false, poissons: true, fond: "#2c4442" },
    { id: "brume", nom: "brume", dossier: "marais-brume", neige: false, poissons: true, brume: true, fond: "#3a4648" },
  ],
  WORLD, TILES, FRONTS, EXT,

  /** The buildings, as carte-valbrume.js's (box, spots, fumees, lueurs, bannieres offsets from `at`); the spots are
   *  this layout's, on open ground or the road by each building. The witch's hut (sorciere) is a building too: its hit
   *  box, and the green light of its window and cauldron at night. */
  batiments: {
    grange: { at: [300, 245], box: [-110, -155, 220, 200],
      spots: [[-60, 80], [60, 95], [150, 70], [-150, 60], [100, 125]] },
    tour: { at: [775, 280], box: [-55, -333, 110, 350],
      spots: [[130, 24], [80, -6], [175, 30], [-90, -10], [40, 42]],
      lueurs: [{ at: [-2, -188], size: 70, color: "#a86bff", period: 2200 }] },
    atelier: { at: [1060, 230], box: [-110, -145, 230, 200],
      spots: [[150, 85], [75, 75], [-160, 72], [-40, 81], [20, 110]],
      fumees: [[-33, -120]],
      lueurs: [{ at: [-45, 21], size: 60, color: "#ff8a2b", period: 650 }] },
    hotel: { at: [1600, 280], box: [-165, -270, 330, 320],
      bannieres: [[-108, 46], [-18, 54], [-140, 60]] },
    taverne: { at: [2190, 235], box: [-135, -219, 230, 264],
      fumees: [[-20, -212], [29, -159]] },
    temple: { at: [2470, 290], box: [-140, -282, 270, 350],
      spots: [[-130, 75], [-60, 90], [20, 85], [100, 80], [-180, 55]] },
    caserne: { at: [2930, 250], box: [-140, -162, 240, 220],
      spots: [[130, 70], [0, 80], [210, 50], [-90, 85], [60, 95], [270, 40], [-40, 100], [190, 100]] },
    sorciere: { at: [3130, 200], box: [-60, -150, 120, 160],
      lueurs: [{ at: [-19, -47], size: 56, color: "#7dff6a", period: 1900 }, { at: [-24, -19], size: 40, color: "#7dff6a", period: 1300 }] },
  },
  /** The market on the square, at the red stall's point: its box (the three stalls) and the rogues' spots. */
  marche: { at: [1850, 292], box: [-83, -86, 274, 175],
    spots: [[-50, 61], [45, 88], [-105, 33], [125, 80], [190, 40]] },

  /** Where idle heroes stroll: both meadows above and below the road, the barn's plot, the middle of each boardwalk,
   *  the shore south of the road, behind the market, by the temple and the barracks, the witch's pool. */
  FLANE: [
    [-900, 262], [-780, 372], [-640, 258], [-500, 368], [-360, 262], [-220, 370], [-80, 262], [120, 372], [380, 372],
    [450, 262], [558, 362], [700, 375], [880, 377], [1020, 375], [1180, 374], [1318, 282], [1480, 385], [1660, 388],
    [1880, 392], [2100, 388], [2230, 390], [1800, 250], [2640, 295], [2690, 300], [3000, 300], [3120, 272], [3250, 378],
    [3380, 262], [3520, 378], [3660, 262], [3800, 378], [3920, 265],
  ],
  /** The road across the world (feet points, the baked road's centre), its three boardwalks included (2 px up: the
   *  planks): through the west meadow, past the barn, over the inlet, the tower and the forge, over the creek, past the
   *  town hall through the square, along the tavern's pond and the temple, over the second inlet, past the barracks
   *  and through the east meadow. */
  ROAD: [
    [-1000, 322], [-800, 318], [-600, 324], [-400, 320], [-200, 324], [0, 318], [150, 316], [300, 320], [420, 322],
    [470, 320], [558, 364], [646, 320], [720, 330], [850, 338], [1000, 330], [1120, 326], [1230, 328], [1318, 284],
    [1406, 328], [1500, 345], [1620, 352], [1780, 348], [1900, 362], [2050, 352], [2200, 348], [2330, 372], [2480, 376],
    [2570, 352], [2620, 334], [2708, 378], [2796, 334], [2870, 328], [2950, 321], [3100, 322], [3300, 322], [3500, 320],
    [3700, 323], [3850, 321], [4000, 322],
  ],
  /** The water (maps/marais.json's marsh water shapes in the village band, map px): the open marsh along the south
   *  with its two inlets, the creek, the tavern's pond and the witch's pool. */
  EAU: [
    { polygone: [[-1060, 396], [-900, 392], [-760, 398], [-600, 394], [-450, 400], [-300, 393], [-150, 398], [0, 392],
      [150, 396], [300, 402], [420, 398], [480, 395], [500, 350], [520, 312], [560, 300], [600, 305], [625, 330],
      [640, 395], [760, 400], [900, 404], [1050, 398], [1200, 402], [1290, 405], [1400, 410], [1550, 412], [1700, 414],
      [1850, 416], [2000, 412], [2150, 410], [2300, 412], [2450, 414], [2600, 410], [2640, 410], [2665, 360],
      [2680, 330], [2720, 322], [2755, 335], [2770, 370], [2790, 405], [2900, 398], [3050, 394], [3200, 398],
      [3350, 394], [3500, 398], [3650, 393], [3800, 398], [3950, 394], [4060, 396], [4060, 820], [-1060, 820]] },
    { polygone: [[1281, -20], [1280, 50], [1270, 200], [1275, 300], [1270, 380], [1262, 430], [1362, 430], [1365, 380],
      [1365, 300], [1370, 200], [1375, 50], [1378, -20]] },
    { polygone: [[2330, 238], [2313, 274], [2266, 299], [2202, 301], [2142, 315], [2069, 310], [2048, 271], [2040, 238],
      [2051, 206], [2085, 177], [2137, 149], [2207, 163], [2250, 188], [2309, 203]] },
    { polygone: [[3238, 196], [3220, 224], [3172, 236], [3130, 258], [3075, 249], [3047, 222], [3034, 196], [3043, 168],
      [3070, 139], [3130, 146], [3177, 152], [3224, 166]] },
  ],
  /** The boardwalks' decks (walkable over the water), one line: between them it lies over the road, on land. */
  DECK: [[470, 320], [558, 364], [646, 320], [1230, 328], [1318, 284], [1406, 328], [2620, 334], [2708, 378], [2796, 334]],
  SPOT_R: 60, ROAD_R: 30,

  /** The victory-day standards: open ground 25+ px off the road, 40+ px from every stroll and work spot, out of the
   *  water and the building boxes (checked on the bake). */
  VICTOIRE: [
    [-830, 350], // the west meadow, below the road
    [-450, 350], // the west meadow, by the path north
    [200, 350], // below the road, in front of the barn
    [650, 350], // the first boardwalk's east end, on the bank
    [920, 360], // below the road, right of the mage tower
    [1220, 360], // the creek's west bank, below the road
    [1530, 380], // in front of the town hall, on the shore side
    [2020, 385], // the square's south edge
    [2310, 300], // between the tavern's pond and the temple
    [2660, 250], // above the second inlet
    [3200, 360], // below the road, past the witch's pool
    [3600, 350], // the east meadow, below the road
  ],

  /** A fighting hero's creature stands on its right, on its left past this x: 300 px short of the world's east edge. */
  BASCULE: 3700,
  /** The raid boss's lairs (activite.js antre): the two meadows, along the road and their stroll spots. */
  ANTRE: { ouest: { x: [-690, -240], y: [310, 335] }, est: { x: [3240, 3690], y: [310, 335] } },

  // village life (ambiance.js): walkers along the road and the boardwalks, the hens by the barn, the tavern cat at the
  // pond's edge, the roaming cats (barn and inlet; square and tavern; temple and barracks), the stag at the west
  // meadow's edge, fish (and frogs) leaping in the inlets, the creek and the ponds, the treasury before the town hall,
  // the fair's pennants over the square, the sparrows over the barn's plot; fireflies over the water at night
  MARCHEURS: {
    paysanne: [[1500, 345], [1620, 352], [1780, 348], [1900, 362], [2050, 352], [2200, 348]],
    fermier: [[150, 316], [300, 320], [420, 322], [470, 320], [558, 364], [646, 320], [720, 330]],
    marchand: [[1780, 348], [1900, 362], [2050, 352], [2200, 348], [2330, 372], [2480, 376]],
    garde: [[1120, 326], [1230, 328], [1318, 284], [1406, 328], [1500, 345], [1620, 352], [1780, 348]],
  },
  HENS: [[315, 298], [349, 302], [286, 304]].map(([x, y], k) => [x, y, 2600 + k * 500]),
  CAT: [2060, 330],
  CATS: [
    { stops: [[120, 372], [380, 372], [450, 262], [700, 375]], speed: 24 },
    { stops: [[1660, 388], [1880, 392], [1800, 250], [2100, 388]], speed: 28 },
    { stops: [[2230, 390], [2640, 295], [3000, 300], [3120, 272]], speed: 22 },
  ],
  STAG: [-560, 205],
  FISH: [[565, 335, 4200], [1318, 380, 5300], [2120, 220, 4700], [2710, 390, 5900], [3100, 230, 6400]],
  TREASURY: [1582, 342],
  FAIR: [[1790, 260], [2000, 270]],
  MOINEAUX: [100, 170],
  /** Fireflies: where they blink at night, over the banks (place.js lucioles). */
  LUCIOLES: [[530, 300], [610, 350], [1300, 250], [1345, 150], [2060, 300], [2300, 270], [2680, 350], [3050, 250],
    [3220, 250], [-300, 388], [900, 396], [3500, 392], [1700, 400], [-760, 390]],
};
