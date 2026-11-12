// The map of Highpass Hold: a dwarven town in a mountain pass (art/col-ete, art/col-hiver: the world is x -1000 to
// 4000, 400 logical px high, with the immersive bands; 1 art px = 1 logical px), and its looks. Read through lieux.js.
// Hand-edited, but for the bake's own data (carte-col-data.js, from maps/col.json by tools/bake_map.py), referenced
// here. The layout, west to east: an alpine meadow (the raid boss's west lair) with two hay fields, the stone barn,
// the mage tower; granite cliffs along the whole north from there, a waterfall falling from a notch into a pool and a
// fast stream crossing the village under a humped stone bridge; the forge, the mine carved into the cliff behind it
// (rails, an ore cart), the tavern, the market on the square under the town hall, the temple, the barracks; past the
// cliffs' end, a second meadow (the east lair). Pines on the plateau above the cliffs and down the slopes to the south.
// Buildings stand at their layout point `at`, with Valbrume's offsets (box, chimneys, glows, standards): the stone and
// slate variants (col-*) are the same models with other materials.

import { WORLD, TILES, FRONTS, EXT } from "./carte-col-data.js";

export const COL = {
  id: "col",
  nom: "col", // i18n maps
  /** Its looks (tools/bake_map.py maps/col.json --look ete | hiver). Summer: the waterfall flows (chute: the live
   *  streaks of CHUTES, tools/col_chute.py) and trout leap in the stream; winter: the fall and the stream's edges freeze,
   *  snow falls. */
  looks: [
    { id: "ete", nom: "ete", dossier: "col-ete", neige: false, poissons: true, chute: true, fond: "#3f5f34" },
    { id: "hiver", nom: "hiver", dossier: "col-hiver", neige: true, poissons: false, chute: false, fond: "#c9d3df" },
  ],
  WORLD, TILES, FRONTS, EXT,

  /** The buildings, as carte-valbrume.js's (box, spots, fumees, lueurs, bannieres offsets from `at`); the spots are this
   *  layout's, on open ground in front of each building. The mine is a building too: its hit box (the portal, the
   *  rails and the cart, where no one walks) and its name. */
  batiments: {
    grange: { at: [150, 272], box: [-110, -155, 220, 200],
      spots: [[-270, 28], [-170, 30], [150, 40], [-350, 28], [-130, 18]] },
    tour: { at: [560, 262], box: [-55, -333, 110, 350],
      spots: [[90, 10], [-90, 28], [140, 53], [-120, 60], [40, 40]],
      lueurs: [{ at: [-2, -188], size: 70, color: "#a86bff", period: 2200 }] },
    atelier: { at: [1170, 252], box: [-110, -145, 230, 200],
      spots: [[150, 48], [70, 70], [-70, 70], [-140, 53], [135, 13]],
      fumees: [[-33, -120]],
      lueurs: [{ at: [-45, 21], size: 60, color: "#ff8a2b", period: 650 }] },
    hotel: { at: [2010, 262], box: [-165, -270, 330, 320],
      bannieres: [[-108, 46], [-18, 54], [-140, 60]] },
    taverne: { at: [1660, 262], box: [-135, -205, 230, 250],
      fumees: [[-20, -198], [29, -145]] },
    temple: { at: [2420, 282], box: [-140, -282, 270, 350],
      spots: [[150, 60], [205, 40], [60, 88], [245, 46], [140, 48]] },
    caserne: { at: [2830, 258], box: [-140, -162, 240, 220],
      spots: [[130, 70], [0, 80], [210, 50], [-90, 85], [60, 95], [-155, 58], [270, 40], [-40, 102]] },
    mine: { at: [1430, 162], box: [-130, -150, 250, 62],
      lueurs: [{ at: [21, -32], size: 40, color: "#ffa12b", period: 900 }] },
  },
  /** The market on the square under the town hall, at the red stall's point: its box (the stalls and the well) and the
   *  rogues' spots, along the square's south edge. */
  marche: { at: [1880, 392], box: [-60, -90, 380, 100],
    spots: [[-50, -27], [70, -22], [170, -20], [270, -24], [370, -32]] },

  /** Where idle heroes stroll: the west meadow (above and below the road), the fields, by the barn and the tower,
   *  both sides of the bridge, along the forge, the tavern, the square, by the temple and the barracks, the east
   *  meadow. */
  FLANE: [
    [-880, 362], [-720, 228], [-560, 365], [-400, 228], [-240, 362], [-110, 232], [30, 372], [330, 280], [460, 360],
    [700, 330], [1000, 300], [1100, 375], [1430, 280], [1560, 375], [1780, 380], [1890, 380], [2010, 330],
    [2280, 330], [2600, 385], [2600, 300], [3000, 280], [3120, 365], [3300, 230], [3440, 362], [3600, 232],
    [3760, 362], [3900, 236],
  ],
  /** The road across the world (feet points, the baked gravel road's centre), over the bridge's deck. */
  ROAD: [
    [-1000, 300], [-850, 306], [-700, 298], [-550, 304], [-400, 298], [-250, 303], [-100, 300], [40, 335], [200, 352],
    [350, 345], [470, 325], [640, 300], [740, 282], [816, 268], [835, 269], [880, 287], [925, 313], [944, 332],
    [1020, 348], [1150, 345], [1300, 342], [1450, 335], [1560, 338], [1700, 345], [1850, 350], [2010, 352],
    [2170, 350], [2300, 352], [2450, 356], [2600, 350], [2750, 342], [2900, 335], [3050, 322], [3200, 310],
    [3350, 302], [3500, 298], [3650, 304], [3800, 298], [3950, 302], [4000, 300],
  ],
  /** What heroes never stand on (map px): the stream and its pool (water), the cliffs along the north (from the
   *  village band's top down to their talus) and the mine's rails and cart. */
  EAU: [
    { ligne: [[860, 170], [868, 205], [890, 245], [922, 279], [838, 321], [812, 365], [828, 420], [800, 520]], demi: 13 },
    { ellipse: [860, 182, 32, 17] },
    { polygone: [[-330, -10], [3330, -10], [3330, 118], [3170, 160], [3010, 168], [2840, 162], [2670, 176],
      [2500, 170], [2330, 162], [2160, 176], [1985, 172], [1810, 162], [1640, 176], [1520, 178], [1340, 178],
      [1200, 172], [1030, 162], [940, 168], [780, 168], [690, 172], [520, 166], [345, 156], [170, 172], [0, 158],
      [-180, 166], [-330, 118]] },
    { polygone: [[1300, 170], [1520, 170], [1500, 200], [1410, 222], [1325, 226], [1300, 205]] },
  ],
  /** The bridge's deck (walkable over the stream): the ramps' feet and its hump, 9 to 13 px up (its flags). */
  DECK: [[816, 268], [835, 269], [880, 287], [925, 313], [944, 332]],
  SPOT_R: 60, ROAD_R: 30,

  /** The live waterfall (tools/col_chute.py): its streaks' box, map px. */
  CHUTES: [{ at: [836, -29], w: 49, h: 206 }],

  /** The victory-day standards: open ground 25+ px off the road, 40+ px from every stroll and work spot, out of the
   *  water, the cliffs and the building boxes (checked on the bake). */
  VICTOIRE: [
    [-760, 270], // the west meadow, above the road
    [-160, 270], // by the hay fields
    [455, 264], // between the barn and the mage tower
    [800, 300], // the bridge's west end
    [960, 300], // the bridge's east end
    [1380, 300], // by the forge, at the mine path's foot
    [1740, 320], // in front of the tavern
    [2240, 300], // the square's east side
    [2560, 280], // by the temple
    [2960, 250], // by the barracks
    [3400, 330], // the east meadow, below the road
    [3800, 270], // the east meadow, above the road
  ],

  /** A fighting hero's creature stands on its right, on its left past this x: 300 px short of the world's east edge. */
  BASCULE: 3700,
  /** The raid boss's lairs: the meadows at both ends, along the road and their stroll spots. */
  ANTRE: { ouest: { x: [-700, -265], y: [298, 326] }, est: { x: [3240, 3690], y: [298, 326] } },

  // village life (ambiance.js): walkers on the road, the hens by the barn and the tavern cat (as in Valbrume, from
  // their buildings), the roaming cats (fields, barn and tower to the bridge; forge, tavern and square; square, temple
  // and barracks), the stag at the west meadow's wood, trout leaping in the pool and the stream, the treasury in front
  // of the town hall, the fair's pennants over the square, the sparrows over the fields
  MARCHEURS: {
    paysanne: [[1450, 335], [1560, 338], [1700, 345], [1850, 350], [2010, 352]],
    fermier: [[-100, 300], [40, 335], [200, 352], [350, 345], [470, 325]],
    marchand: [[1850, 350], [2010, 352], [2170, 350], [2300, 352], [2450, 356]],
    garde: [[1150, 345], [1300, 342], [1450, 335], [1560, 338], [1700, 345]],
  },
  HENS: [[165, 312, 2600], [199, 320, 3100], [136, 324, 3700]],
  CAT: [1676, 307],
  CATS: [
    { stops: [[330, 280], [460, 360], [700, 330], [1000, 300]], speed: 24 },
    { stops: [[1430, 280], [1560, 375], [1780, 380], [2010, 330]], speed: 28 },
    { stops: [[2010, 330], [2280, 330], [2600, 385], [2600, 300]], speed: 22 },
  ],
  STAG: [-450, 190],
  FISH: [[860, 186, 4200], [818, 380, 5100]],
  TREASURY: [1992, 324],
  FAIR: [[1900, 300], [2120, 300]],
  MOINEAUX: [-130, 200],
};
