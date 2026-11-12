// The map of Sylvaren Grove: an elven town among giant trees (art/bosquet-automne, art/bosquet-printemps: the world is
// x -1000 to 4000, 400 logical px high, with the immersive bands; 1 art px = 1 logical px), and its looks. Read through
// lieux.js. Hand-edited, but for the bake's own data (carte-bosquet-data.js, from maps/bosquet.json by
// tools/bake_map.py), referenced here. The layout, west to east: a sunlit glade (the raid boss's west lair), the barn
// and its garden, the mage tower, the forge, the town hall, the market on its flagstone square, the tavern, the
// moonlit shrine with its reflecting pool (the landmark: a live glow at night), the temple, the barracks, a second
// glade (the east lair). Giant trees stand behind the buildings, off every walk; the old forest fills the north band,
// a lake the south band, its shore along the strip's foot. The flagstone road runs out through both glades to the
// world's ends. Buildings stand at their layout point `at`, with Valbrume's offsets (the grove's models keep the
// village's shapes: box, chimneys, glows, standards).

import { WORLD, TILES, FRONTS, EXT } from "./carte-bosquet-data.js";

export const BOSQUET = {
  id: "bosquet",
  nom: "bosquet", // i18n maps
  /** Its looks (tools/bake_map.py maps/bosquet.json --look automne | printemps): red and gold autumn, and spring
   *  blossom with petals drifting over the view (petales, place.js). Fish leap in the lake in both. */
  looks: [
    { id: "automne", nom: "automne", dossier: "bosquet-automne", neige: false, poissons: true, fond: "#3c4a26" },
    { id: "printemps", nom: "printemps", dossier: "bosquet-printemps", neige: false, poissons: true, petales: true, fond: "#3f6b2c" },
  ],
  WORLD, TILES, FRONTS, EXT,

  /** The buildings, as carte-valbrume.js's (box, spots, fumees, lueurs, bannieres offsets from `at`); the spots are
   *  this layout's, on open ground in front of each building. The shrine (sanctuaire) is a building too: its hit box,
   *  and its moonstone's live glow at night. */
  batiments: {
    grange: { at: [300, 215], box: [-110, -155, 220, 200],
      spots: [[-60, 85], [60, 80], [150, 60], [-120, 75], [220, 85]] },
    tour: { at: [630, 345], box: [-55, -333, 110, 350],
      spots: [[130, 24], [80, -6], [185, 4], [-90, -10], [40, 30]],
      lueurs: [{ at: [-2, -188], size: 70, color: "#a86bff", period: 2200 }] },
    atelier: { at: [900, 215], box: [-110, -145, 230, 200],
      spots: [[150, 85], [75, 75], [200, 57], [-40, 81], [230, 97]],
      fumees: [[-33, -120]],
      lueurs: [{ at: [-45, 21], size: 60, color: "#ff8a2b", period: 650 }] },
    hotel: { at: [1300, 285], box: [-165, -270, 330, 320],
      bannieres: [[-108, 46], [-18, 54], [-140, 60]] },
    taverne: { at: [1900, 240], box: [-135, -205, 230, 250],
      fumees: [[-20, -198], [29, -145]] },
    sanctuaire: { at: [2180, 275], box: [-95, -235, 190, 325],
      lueurs: [{ at: [0, -47], size: 120, color: "#9fd0ff", period: 3200 }] },
    temple: { at: [2520, 292], box: [-140, -282, 270, 350],
      spots: [[150, 60], [205, 40], [60, 88], [250, 44], [140, 50]] },
    caserne: { at: [2830, 255], box: [-140, -162, 240, 220],
      spots: [[130, 76], [0, 83], [230, 56], [-90, 90], [60, 106], [190, 104], [280, 83], [-40, 118]] },
  },
  /** The market on the flagstone square, at the red stall's point: its box (the red and blue stalls) and the rogues'
   *  spots, on the square. */
  marche: { at: [1560, 300], box: [-60, -80, 190, 110],
    spots: [[-50, 45], [40, 48], [130, 55], [-90, 25], [180, 25]] },

  /** Where idle heroes stroll: the west glade (above and below the road), the barn's garden, between the tower and
   *  the forge, the square, by the tavern and the shrine, the temple's shore, the east glade. */
  FLANE: [
    [-900, 250], [-760, 350], [-620, 250], [-480, 350], [-330, 250], [-200, 350], [-60, 250], [60, 355], [430, 300],
    [760, 320], [1060, 300], [1560, 345], [2000, 300], [2060, 330], [2300, 335], [2620, 395], [2960, 250], [3080, 355],
    [3200, 250], [3340, 355], [3480, 250], [3620, 355], [3760, 250], [3900, 350],
  ],
  /** The flagstone road across the world (feet points, the baked path's centre): through the west glade, past the
   *  barn, below the tower, along the forge and the town hall, across the square, past the tavern, the shrine's pool
   *  and the temple by the shore, the barracks, and through the east glade. */
  ROAD: [
    [-1000, 300], [-860, 306], [-700, 298], [-540, 304], [-380, 298], [-230, 304], [-100, 300], [20, 308], [140, 320],
    [260, 330], [400, 338], [520, 360], [630, 388], [740, 372], [860, 345], [980, 336], [1100, 345], [1200, 362],
    [1300, 374], [1420, 360], [1520, 340], [1640, 338], [1760, 340], [1880, 325], [1990, 330], [2080, 350], [2190, 385],
    [2300, 382], [2420, 382], [2540, 384], [2660, 372], [2760, 345], [2860, 330], [2960, 312], [3060, 302], [3200, 298],
    [3350, 304], [3500, 298], [3650, 304], [3800, 298], [3900, 302], [4000, 300],
  ],
  /** The water (maps/bosquet.json's lake, map px): its north shore along the strip's foot, a cove in each glade. */
  EAU: [
    { polygone: [[-1060, 392], [-800, 388], [-600, 382], [-420, 372], [-300, 362], [-180, 364], [-60, 378], [100, 398],
      [300, 410], [600, 418], [900, 414], [1200, 418], [1500, 418], [1800, 414], [2100, 414], [2400, 418], [2700, 414],
      [3000, 404], [3200, 392], [3350, 378], [3480, 366], [3620, 370], [3760, 384], [3900, 392], [4060, 396], [4060, 820],
      [-1060, 820]] },
  ],
  DECK: [],
  SPOT_R: 60, ROAD_R: 30,

  /** The victory-day standards: open ground 25+ px off the road, 40+ px from every stroll and work spot, out of the
   *  water and the building boxes (checked on the bake). */
  VICTOIRE: [
    [-860, 210], // the west glade, under the forest's edge
    [-380, 220], // the west glade, east of the giant
    [-10, 220], // the glade's end, by the forest path
    [480, 320], // the barn's garden, below the field
    [900, 310], // in front of the forge, west of its door's path
    [1480, 280], // the square's west corner, by the town hall
    [1810, 360], // the square's east edge, by the tavern
    [2030, 250], // between the tavern and the shrine
    [2350, 320], // between the shrine and the temple
    [2680, 300], // between the temple and the barracks
    [3090, 260], // the east glade's west end
    [3700, 330], // the east glade, below the road
  ],

  /** A fighting hero's creature stands on its right, on its left past this x: 300 px short of the world's east edge
   *  (Valbrume's rule). */
  BASCULE: 3700,
  /** The raid boss's lairs (activite.js antre): the two glades, along the road and their stroll spots. */
  ANTRE: { ouest: { x: [-650, -200], y: [295, 325] }, est: { x: [3230, 3680], y: [295, 325] } },

  // village life (ambiance.js): walkers along the road and the square, the hens by the barn and the tavern cat (as in
  // Valbrume, from their buildings), the roaming cats (garden and tower; square and tavern; shrine, temple and the
  // east glade), the stag in the east glade by the forest's edge, the fish leaping in the coves and off the shore, the
  // treasury in front of the town hall, the fair's pennants over the square, the sparrows over the garden
  MARCHEURS: {
    paysanne: [[1420, 360], [1520, 340], [1640, 338], [1760, 340], [1880, 325]],
    fermier: [[140, 320], [260, 330], [400, 338], [520, 360], [630, 388]],
    marchand: [[1520, 340], [1640, 338], [1760, 340], [1880, 325], [1990, 330]],
    garde: [[1200, 362], [1300, 374], [1420, 360], [1520, 340], [1640, 338]],
  },
  HENS: [[315, 255, 2600], [349, 263, 3100], [286, 267, 3700]],
  CAT: [1916, 285],
  CATS: [
    { stops: [[430, 300], [240, 300], [760, 320], [710, 339]], speed: 24 },
    { stops: [[1560, 345], [1470, 325], [2000, 300], [1740, 325]], speed: 28 },
    { stops: [[2060, 330], [2300, 335], [2620, 395], [2960, 250]], speed: 22 },
  ],
  STAG: [3560, 215],
  FISH: [[-280, 385, 4200], [1500, 440, 5300], [3500, 390, 4700]],
  TREASURY: [1282, 352],
  FAIR: [[1500, 300], [1740, 300]],
  MOINEAUX: [400, 180],
};
