// The map of Port-Salin: a harbour town on a coast (art/port-ete, art/port-hiver: the world is x 0-4000, 400 logical px
// high, with the immersive bands; 1 art px = 1 logical px), and its looks. Read through lieux.js. Hand-edited, but for
// the bake's own data (carte-port-data.js, from maps/port.json by tools/bake_map.py), referenced here.
// The layout, west to east: a sandy cove with nets drying, the barn and its fields, the mage tower, the forge, the
// tavern on the harbour's west quay; the harbour basin (two quays meeting inland, a pier, two boats moored), the market
// on the quay-side square, the town hall, the temple, the barracks; a headland with the lighthouse. The sea fills the
// south band and comes up into the strip along the whole coast. Buildings stand at their layout point `at`, with the
// same offsets as in Valbrume where the art is the same (box, chimneys, glows, standards).

import { WORLD, TILES, FRONTS, EXT } from "./carte-port-data.js";

export const PORT = {
  id: "port",
  nom: "port", // i18n maps
  /** Its looks (tools/bake_map.py maps/port.json --look ete | hiver). The sea stays open water in winter (ice only at
   *  its edges): the fish leap in both. */
  looks: [
    { id: "ete", nom: "ete", dossier: "port-ete", neige: false, poissons: true, fond: "#1f5d8e" },
    { id: "hiver", nom: "hiver", dossier: "port-hiver", neige: true, poissons: true, fond: "#28506e" },
  ],
  WORLD, TILES, FRONTS, EXT,

  /** The buildings, as carte-valbrume.js's (box, spots, fumees, lueurs, bannieres offsets from `at`); the spots are
   *  this layout's, on open ground in front of each building. The lighthouse (phare) is a building too: its hit box,
   *  and its lamp's live glow at night. */
  batiments: {
    grange: { at: [760, 205], box: [-110, -155, 220, 200],
      spots: [[-60, 80], [60, 95], [150, 70], [-150, 60], [200, 110]] },
    tour: { at: [1130, 348], box: [-55, -333, 110, 350],
      spots: [[130, 24], [80, -6], [185, 4], [-90, -10], [40, 30]],
      lueurs: [{ at: [-2, -188], size: 70, color: "#a86bff", period: 2200 }] },
    atelier: { at: [1480, 210], box: [-110, -145, 230, 200],
      spots: [[150, 85], [75, 75], [200, 57], [-40, 81], [230, 97]],
      fumees: [[-33, -120]],
      lueurs: [{ at: [-45, 21], size: 60, color: "#ff8a2b", period: 650 }] },
    hotel: { at: [2580, 285], box: [-165, -270, 330, 320],
      bannieres: [[-108, 46], [-18, 54], [-140, 60]] },
    taverne: { at: [1860, 240], box: [-135, -205, 230, 250],
      fumees: [[-20, -198], [29, -145]] },
    temple: { at: [2960, 292], box: [-140, -282, 270, 350],
      spots: [[150, 60], [205, 40], [60, 88], [250, 44], [140, 50]] },
    caserne: { at: [3330, 245], box: [-140, -162, 240, 220],
      spots: [[130, 70], [0, 80], [210, 50], [-90, 85], [60, 95], [-150, 60], [270, 40], [-40, 100]] },
    phare: { at: [3800, 300], box: [-50, -258, 100, 290],
      lueurs: [{ at: [0, -200], size: 90, color: "#ffd45e", period: 2600 }] },
  },
  /** The market on the quay-side square, at the red stall's point: its box (the red and blue stalls) and the rogues'
   *  spots, on the square. */
  marche: { at: [2305, 257], box: [-83, -86, 274, 175],
    spots: [[-50, 61], [45, 88], [-105, 33], [125, 95], [-145, 5]] },

  /** Where idle heroes stroll: the cove's beach, the farmland, the village road, the quays and the pier's end, the
   *  square, in front of the town hall and the temple, the bay and the headland. */
  FLANE: [
    [80, 272], [370, 245], [610, 318], [520, 160], [1000, 330], [1360, 330], [1600, 320], [1780, 300], [2000, 316],
    [2128, 361], [2120, 245], [2300, 330], [2520, 360], [2880, 380], [3200, 320], [3480, 320], [3700, 322],
    [3760, 345], [3800, 400],
  ],
  /** The road across the world (feet points, the baked road's centre): along the cove and the village, up the west
   *  quay to the basin's head, down the east quay through the square, along the town hall and the temple, round the
   *  bay to the lighthouse's door. The quays are paved, the rest dirt. */
  ROAD: [
    [0, 236], [150, 222], [300, 214], [450, 222], [560, 250], [640, 284], [760, 300], [880, 302], [990, 296], [1100, 292],
    [1240, 300], [1380, 298], [1550, 300], [1690, 314], [1850, 330], [1966, 329], [2120, 252], [2308, 346], [2390, 362],
    [2420, 370], [2560, 380], [2700, 384], [2850, 388], [3000, 388], [3120, 360], [3250, 330], [3420, 316], [3560, 295],
    [3660, 302], [3740, 328],
  ],
  /** The water (maps/port.json's sea shapes, map px): the sea, its coast round the headland, and the harbour basin
   *  (an iso box: a diamond on screen, its two far sides the quays). */
  EAU: [
    { polygone: [[-60, 345], [40, 340], [110, 318], [190, 292], [290, 278], [400, 282], [500, 304], [580, 336], [660, 362],
      [760, 372], [860, 378], [960, 390], [1060, 404], [1200, 406], [1290, 392], [1360, 366], [1440, 350], [1560, 347],
      [1660, 357], [1730, 380], [1770, 440], [2120, 520], [2470, 440], [2530, 395], [2640, 390], [2760, 395], [2860, 404],
      [2960, 410], [3060, 400], [3150, 380], [3240, 372], [3330, 368], [3420, 362], [3500, 355], [3570, 345], [3640, 345],
      [3700, 345], [3740, 410], [3790, 460], [3840, 470], [3900, 432], [3950, 362], [4000, 350], [4060, 348], [4060, 820],
      [-60, 820]] },
    { polygone: [[2120, 268], [2480, 448], [2120, 628], [1760, 448]] },
  ],
  /** The pier's deck (walkable over the basin): from the west quay out to its lantern, 2 px up (the planks). */
  DECK: [[2030, 311], [2140, 367]],
  SPOT_R: 60, ROAD_R: 30,

  /** The victory-day standards: open ground 25+ px off the road, 40+ px from every stroll and work spot, out of the
   *  water and the building boxes (checked on the bake). */
  VICTOIRE: [
    [150, 250], // the cove's beach, west of the nets
    [480, 260], // the cove's beach, between the nets and the barrels
    [850, 330], // along the road, right of the barn
    [1250, 330], // right of the mage tower, on the shore side of the road
    [1650, 240], // between the forge and the tavern, north of the road
    [1790, 350], // the west quay's foot, by the shore
    [2210, 240], // the basin's head, behind the east quay
    [2740, 360], // in front of the town hall, right of its steps
    [3110, 300], // by the temple, right of its steps
    [3440, 280], // by the barracks, above the bay
    [3650, 270], // the headland's neck
    [3850, 370], // the headland, right of the lighthouse
  ],

  /** A fighting hero's creature stands on its right, on its left past this x: 300 px short of the world's east edge
   *  (Valbrume's rule), so a hero on the headland fights towards the village, not out to sea. */
  BASCULE: 3700,
  /** The raid boss's lairs at the outskirts (map px x ranges): west, the land between the cove's beach and the fields;
   *  east, the open ground by the barracks above the bay. */
  ANTRE: { ouest: [150, 600], est: [3120, 3480] },

  // village life (ambiance.js): walkers along the road and the quays, the hens by the barn and the tavern cat (as in
  // Valbrume, from their buildings), the roaming cats (beach and barn; tavern, quays and square; square, town hall and
  // temple), the stag at the forest's edge by the fields, the fish leaping in the sea (the cove, the basin, the bay),
  // the treasury in front of the town hall, the fair's pennants over the square, the sparrows over the fields
  MARCHEURS: {
    paysanne: [[1850, 330], [1966, 329], [2120, 252], [2308, 346], [2420, 370]],
    fermier: [[300, 214], [450, 222], [560, 250], [640, 284], [760, 300], [880, 302]],
    marchand: [[2250, 316], [2308, 346], [2420, 370], [2560, 380], [2700, 384]],
    garde: [[1966, 329], [2120, 252], [2308, 346], [2420, 370], [2560, 380]],
  },
  HENS: [[775, 245, 2600], [809, 253, 3100], [746, 257, 3700]],
  CAT: [1876, 285],
  CATS: [
    { stops: [[370, 245], [610, 318], [700, 285], [820, 300]], speed: 24 },
    { stops: [[1780, 300], [2000, 316], [2120, 245], [2300, 330]], speed: 28 },
    { stops: [[2300, 330], [2520, 360], [2880, 380], [3110, 352]], speed: 22 },
  ],
  STAG: [980, 190],
  FISH: [[330, 330, 4200], [2110, 398, 5300], [3560, 372, 4700]],
  TREASURY: [2562, 347],
  FAIR: [[2170, 280], [2380, 280]],
  MOINEAUX: [600, 100],
};
