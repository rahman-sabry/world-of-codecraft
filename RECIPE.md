# World of Codecraft

A high-fantasy MMO village for Herdr. One big terminal sits in a carved oak and gold
frame. Below it, Valbrume, an isometric pixel-art village, shows every coding agent as
a hero of a race and a class, working wherever it stands. The top bar is a strategy-game
resource bar, spaces are heraldic districts on the left, and day turns to night with
the clock. The art is original: it imitates no existing game.

![World of Codecraft](preview.png)

## What you see

- **Top bar** (48 px, window drag, traffic lights at 16,23). A carved beam with:
  - the crest and the logo "WORLD OF CODECRAFT" in Cinzel Decorative, with
    "village of Valbrume" under it;
  - resource plaques, each an icon, a value and a caption: Gold (Claude account A),
    Wood (account B), Heroes ("1/2", heroes at work out of all heroes) and Fair (time
    until the weekly quota reset); then the day's raid boss (the day's species, "934/1000" and its name, the HP in
    violet / orange and the name led by "Elite" / "Legendary" for a tiered boss; slain: "Slain!" in gold, the creature
    felled; tooltip: name with its tier, HP, the streak at stake, who slew it, time to the next boss, and "Click: reset
    today's boss to full HP"; a click turns the plaque in place into "Reset boss?" with Yes / No, « Relancer le boss ? »
    Oui / Non, which closes by itself after 5 s; no system dialog) and the trophies (a gold cup,
    "3 slain", "streak 2 days"; tooltip). They show only when the bar has room beside everything else (a width
    estimate): the trophies go first (their tooltip then joins the boss's), then the boss;
  - a parchment scroll in the middle with the shown district and quest;
  - on the right, an alert when a hero waits, then the sun or the moon, the canonical
    hour (Matins, Lauds, Terce, Sext, None, Vespers, Compline) and the clock.

  Gold, Wood and Fair are optional and hidden when there is no quota data.
- **Left column** (262 px, iron-framed panel). The "Districts" heading with a session
  count. Then one card per space:
  - a cloth banner with a gold charge, picked by hashing the space;
  - `I · name`, the session and hero counts, and a medallion with the quest count;
  - status chips ("on a quest", "resting", "need help", "to turn in");
  - one row per tab with the hero portrait. The shown tab is highlighted.

  The card frame turns gold when the space is shown and ruby when a hero needs you.
  At the bottom are "+ Quest" (new tab) and "+ District" (new space) buttons.
- **Terminal** (centre). The tab block sits inside four `rail` blocks (14 px gilded
  moulding). Panes use JetBrains Mono on dark oak `#1a1411`, theme
  `World-of-Codecraft`; the text size is left to Herdr's settings. Each pane header (30 px) is an oak plank with rivets and holds:
  - the hero portrait;
  - "Name, Race class", the program and a state gem with its label;
  - the tab title and folder;
  - iron buttons: split right, split down, zoom and close.
- **Village** (bottom, 400 px). On the left, a command panel:
  - "Map of Valbrume": a minimap with unit dots and the camera frame, and under it two switch rows: the map
    (‹ map name ›: "Valbrume", the only map so far, so its arrows are left out) and its look (‹ look name ›:
    "Summer" / "Winter", « Été » / « Hiver »);
  - "Selected unit": the focused agent as a full-length portrait card with name, class
    and race, program, state and quest, plus Go and Next buttons.

  On the right, the world: 5000×400 logical px (x from -1000 to 4000; the village is 0 to 3000)
  with art pixels at 2×, panning horizontally. It contains:
  - buildings: town hall with belfry, mage tower (round, violet cone), forge workshop,
    barracks, Temple of Dawn, tavern, barn with fenced fields, market stalls, a well
    and a notice board;
  - a market square, a road, a river and a forest;
  - west of the village, farmland: fields with fences and a windmill; east, past a wooden footbridge over
    the river at the village road's end, a lake with a jetty and a rowboat;
  - in the top-left corner, a chronicle of the last 4 events on dark tags.

  That layout is the map Valbrume; it has two looks: summer and winter. Winter has snow on the ground and on
  every roof and top, a frozen river and lake, bare oaks, snow-dusted pines, bushes as snowy mounds, slush on the
  road, light snow falling, and no leaping fish. Everything else (heroes, raids, boss, cats, walkers, banners,
  crown, bridge, window glow at night) is the same.

## How it behaves

- **Class comes from the program:**
  - Claude Code: Mage, at the Mage Tower
  - Codex: Artificer, at the Forge Workshop
  - Gemini: Priest, at the Temple of Dawn
  - OpenCode, pi, amp, cursor: Ranger, at the barn and fields
  - any other agent: Rogue, at the market
  - plain shells: Warriors; they stroll the whole world like idle heroes (FLANE spots, 15 to 40 s at each),
    never onto a spot another hero holds or heads for; no chronicle line, the camera does not follow the
    stroll
- **Race and name** come from a hash of the terminal address. The races are Elf, Orc,
  Human, Undead and Dwarf.
- **States:**
  - **working**: the hero plays its `work` animation where it stands when it turns working (mid-walk: at its
    point on the road), with no walk first; when another hero holds or heads for that exact point it is nudged
    to the nearest free walkable point. Every 10 to 20 s (staggered per hero and per stop) it walks to another
    free walkable point within 300 px (any `FLANE` or `SPOTS` point, or a `ROAD` point), never one another hero
    is heading for. It waits for a calm moment: not during a raid, meditation or tests, not while a creature is hurt
    but not yet felled (the move comes after the puff), and not while a hit, a test result, a seal or the
    pigeon shows. No chronicle line; the camera follows a selected hero's walk. Blocked and done heroes stay
    put. Only the demo heroes work at their class building (`SPOTS`).
  - **idle**: it strolls (`idle` while standing): it walks to a spot in the village or the western
    farmland or, over the footbridge, the east lands (lake shore, by the jetty, along the lane: `FLANE` in
    lieux.js), stands 15 to 40 s (staggered per hero), then picks another.
  - **blocked**: `idle` with a red ring, a flashing `!` and a speech bubble.
  - **done**: `idle` with a gold ring, a `?` and sparkles.
- **Movement:** when its spot changes, a hero walks there. Close spots are reached in
  a straight line. Farther ones follow the road, with a 4-direction walk animation.
  Each road leg is a native `left`/`top` transition.
- **Blink in / blink out:** a hero, a warrior or an apprentice (per subagent id) that comes flickers on and off
  about 3 times over 500 ms, then stays solid, with the halo glowing at its feet meanwhile (walking or working,
  in place). One that leaves (agent gone, shell closed, subagent finished or expired) leaves a ghost at its last
  frame and feet point that flickers out over 500 ms; the ghost is not a unit (no click, selection, camera,
  chronicle, minimap dot, agent order or panel bridge). Nothing blinks on a village's first render (a reload, a
  layout switch, a village block shown again), nor for apprentices that appear with
  their hero's first activity read; an apprentice changing slot or pose doesn't blink. In the demo, units appear and disappear at once. `Place.passages` compares each render's units and apprentices
  (keys: address, `hero:subagent id`) with the last live one's.
- **Summon and send-off (apprentices only):** an apprentice that comes is summoned over 1.4 s: its hero plays its
  `work` frames for 1 s (not while it walks: its walk wins), a gold ring (`halo.svg`) opens on the ground at the
  apprentice's feet from 10×4 to 120×50 px and fades (under the units there), and 5 sparkles (`etincelle.svg`)
  rise from it and fade, staggered by 80 ms; the apprentice stays hidden 350 ms, then blinks in (with its glow)
  while the ring fades under it. One that leaves gets 4 sparkles rising from its ghost during the 500 ms blink
  out; no cast, no ring. Heroes and warriors keep the plain blink. Same suppression as the blink (first render,
  hidden, demo).
- **Selection:** the selected unit is the focused agent, or the focused pane's shell when it is a warrior on
  guard (`selectedAddress` in kit.js; Herdr's focused agent never goes empty). It gets a green ring and a
  health bar, and the camera glides to it (and follows it while it walks to work, not while it strolls).
- **Camera:** click and drag the village to pan (the camera follows the pointer with no
  glide while dragging), or use the scroll wheel or a minimap click. Any manual pan stops
  the follow until another unit is selected. Units and buttons stop the press, so their
  clicks still work.
- **Clicks:**
  - a unit: `agent.focus` (`pane.focus` for shells), and the camera glides to it, even when it is already
    selected (after a manual pan)
  - double-click the tower, the forge or the barracks: recruit with `tab.new` (claude,
    codex or a shell)
  - a district card: `space.select`
  - a tab row: `tab.select`
  - a chronicle line: focus that hero
  - the top alert: focus the first hero who is waiting
- **Day and night:** night tiles crossfade over day tiles (opacity 1 at night, 0.55 at
  dawn and dusk). Window and forge glows pulse, and chimneys smoke.
- **Chronicle:** it logs arrivals, departures and state changes ("[Mage Tower] Gromdal,
  Dwarf mage (Claude Code) sets out on a quest"); the tag names the building (or the market) nearest to where
  the hero stands, within 200 px, else the village. It is kept in the store key
  `wocc.chronicle`.
- **Language:** French or English, detected once per start (see `i18n.js`): `WOCC_LANG`
  if set, else macOS `AppleLanguages`, else `LC_ALL` / `LC_MESSAGES` / `LANG`; French when
  it starts with `fr`. Shared with every copy of the mod through the store key `wocc.lang`.
  A block's `props.lang` (`"fr"` / `"en"`) forces it.
- **Keys** (`layout:World-of-Codecraft`): ctrl-shift-i switches the immersive mode
  (`world-of-codecraft.mode`), ctrl-shift-j toggles the bottom village, and ctrl-shift-b
  toggles the left column (`gauche`).

## Activity scenes and village life

- **What a hero is doing**, not just its state: while Herdr says `working`, the hero plays
  a scene read from `~/.local/state/world-of-codecraft/<terminal address>.json`, written by
  the optional integrations (`integrations/claude-code/wocc-activity.py`, an async Claude
  Code hook; `integrations/opencode/wocc-activity.js`, an OpenCode plugin). Tests, commits
  and pushes are recognised only as real commands (start of line or after `;` `&` `|` `(`),
  with heredoc bodies and quoted strings removed first, so "git push" in a message doesn't count. Fields: `act`,
  `outil`, `coups`, `err` / `errT`, `errTache`, `subs`, `subIds`, `subCoups`, `tache`, `essai {ok, t}`,
  `commitT`, `pushT`. Without them heroes keep the plain status behaviour. `subCoups` counts every successful
  subagent tool call (`PostToolUse` with an `agent_id`; not the main session's tools, not failures), from 0 on the
  file's first event and never reset (a `SessionEnd` deletes the file, so it starts over): the raid boss's damage.
  Running subagents are tracked by id (`subIds`: `agent_id` -> `{t0, t, act, outil}`: start, last event, and what
  it does, `pense` at the start then the kind of its tools, as the main hero's): added on `SubagentStart`,
  removed on `SubagentStop`, refreshed by the subagent's own tool events, kept when the main turn ends (`Stop`)
  so background subagents stay counted, cleared by a new session (`SessionStart` other than `compact`) or
  `SessionEnd`, and dropped after 30 min with no event (a missed stop). `subs` = how many ids are left.
  - thinking: `idle` + a "· · ·" bubble;
  - reading / searching / web: `idle` where it stands, two ravens circling above it;
  - editing code or running commands: fights a creature drawn per task (mages: imp, wolf, goblin, boar, rust
    golem, spectre; other classes: their district's beasts, `DISTRICT` in activite.js). Each
    successful edit or command is a blow (hit pose + flash), 4 fell it (puff) and the next one comes;
    3+ failed tools in a task bring the forest troll, a boss of 8 blows. A failed tool hits
    the hero (red flash, "Ouch!"). A mage's creature stands 70 px off (the troll 115); other classes nearer or
    further by their class gap minus the mage's (`ECART`, see the raid), held back only where the near edge of the
    creature's `pret` box would come within 10 px of the hero's feet (`proche` in activite.js; never further than a
    mage's for that): sprites may overlap, swings and lunges included, as by the raid boss;
  - running tests: a training dummy beside the hero, struck while they run; the result stays
    5 s: knocked over + "Tests passed!", or "Tests failing";
  - compacting: sits cross-legged (`rest`), sparks orbit, a crystal pulses;
  - git commit: a seal and "Sealed!"; git push: a carrier pigeon flies off east;
  - subagents: apprentices, one full-size hero per running subagent (up to 4, no more sprites past that),
    whatever the hero's status (not shells). Each is tied to its subagent id (oldest first): its race and class
    (any of the 30, by hash of the hero and the id, independent of the hero) and its slot stay while it runs.
    They animate with the heroes' stacked
    frames on the same frame timer, showing what their own subagent does (`subIds[id].act`): `work` while it
    edits, runs commands or tests; `idle` while it thinks, with a small scroll over the head while it reads,
    searches or browses. Slots: 70 and 140 px to each side, alternating, 6 to 30 px in front or behind (the first
    on the side away from the creature), each on walkable ground (`walkable` in lieux.js: the road, the bridge
    deck, or near a stroll or work spot outside the building boxes, never the river or the lake, measured on the
    bake) at least 45 px from the others: else mirrored, pulled in, or the first free point around the hero. On
    the hero's walks they step onto its path, follow it in single file 0.9 to 3.6 s late (walk frames by
    direction) and step out to their slots at the end. Night frames at night. Depth by feet y with the heroes,
    behind front cut-outs like the walkers; not clickable, no chronicle line. When a subagent ends its
    apprentice blinks out (and a new one blinks in). The activity file is read while the hero works, once when it is first seen, and
    while it has subagents (and an event in the last 30 min), so they stay after the main turn ends.
  - **Raid (daily boss):** one boss a day, from local midnight to the next, its species (troll, golem, spectre or
    goblin; `especeBoss` in kit.js) and name (a name and an epithet of that species, "Gruntak the Mossback" / "Gruntak le
    Moussu"; `nomBoss`) by a hash of the date, with `BOSS_HP` = 1000 HP whatever its tier (it was 300, calibrated on
    the person's subagents' median 390 / mean 496 successful tool calls per weekday; raised when every raider came to
    fight one boss). A stored record of today from a lower `BOSS_HP` that still stands reads lifted, the damage done
    kept (234/300 reads 934/1000; `bossDuJour`), and the village's next poll writes it back; a slain one stays as it
    is. Every successful subagent tool call is 1 damage, whichever hero's subagent made it, so more subagents in
    parallel hit faster.
    **One boss, one gathering:** while a hero (not a shell, not a demo hero) has running subagents (the apprentices'
    rule: ids with an event in the last 30 min), whatever its status, and the day's boss still stands, it is in the
    raid and fights the boss instead of its scene. There is one boss in the world (`Activites.arene`): it comes beside
    the first hero to raid (the first in the agent order when several start in one poll), placed as below from where
    that hero stands or is heading (`poser`, from place.js `units`), and stays on that spot until the raid ends. That
    first hero plays `work` where it stands and never moves on (a strolling idle hero stops where it is, as when it
    turns working; it strolls again after the raid). Every other hero that starts raiding while the boss is up walks
    to a slot on a ring round the boss (`place` in activite.js, kept while it raids and never moved: no reshuffling).
    A slot is an angle round the boss on the ground (0 = beside it, + = nearer the viewer) and a ring, and the hero
    stands at its own class gap (`ECART`) past the boss's half width along that angle, the ground flattened to 0.32 of
    the width to fit the strip (`anneau`, centred on the first hero's line, 16 px behind the boss's feet): the inner
    slots (`INNER`: beside the boss on the far side, then ±25° on the first hero's side, then ±25° on the far side)
    go to melee first (warrior, rogue); the others (`OUTER`: ±45°, ±65°, then rings 75 and 150 px further out at 0°
    and ±30°) to the artificer, priest, mage and ranger first, the inner slots last. So a late warrior still takes
    a free inner slot. Each slot on walkable ground inside the 400 px strip, off the boss's body (its `pret` half
    width + 10 px, `corps`) and `ESPACE` (an ellipse 48 px across, 28 px deep) from the first hero and every other
    raider (else the nearest free walkable point within 400 px off its footprint). The walk is an ordinary walk (road legs,
    the frame timer, the camera following a selected hero); the hero then plays `work` there, facing the boss: hero
    work frames face right and Herdr cannot flip an image, so a raider whose boss stands on its left (the boss's x
    below its own) plays the mirrored set `work-g` instead (activite.js `face`, read by place.js `anim`; the first
    hero too, past `BASCULE`). Its apprentices leave its file and fight on their own (`coin`): each takes the free
    point nearest its hero among angles 0 to ±60° in 15° steps on the ring and the two further out (not beside the
    boss on the first ring: the raiders' inner slots), at its own look's class gap, as free as a raider's place and
    `ESPACE` from the other apprentices (kept while both raid; one a new raider's place comes too near moves). It
    walks there (with its hero's walk, else straight, 40 px/s), plays `work` facing the boss (`work-g` on its left)
    whatever its subagent does, and walks back into the file when the raid ends; with no free point it stays in the
    file. A hero whose subagents all end leaves the raid: the first one stays where it is, another walks
    back to the goal it left for its place (place.js `retours`). The boss stays where it is while any raider is
    left. The raid lives in memory, as before (a reload starts it afresh beside the first raider found). Each
    species is drawn as tall as the troll at 2× its fight size (`GEANT`: 4×4 screen px per art px), the factor computed
    from creatures-data heights and rounded to a half so an art px stays whole screen px (`geantDe` in activite.js):
    troll 2× (184 px), golem 3.5× (175), spectre 3.5× (189), goblin 3.5× (196); its feet are its widest pose's half
    width + the first raider's class gap from that hero's (`ECART` in activite.js, keyed by class: warrior 10, rogue
    15, artificer 30, priest 45, mage 50, ranger 65 px; for a mage: troll 170, golem 197, spectre 183, goblin 194; the
    apprentices keep its half width + 25 px clear), on the creature's side (right; left past x 2700, the map's `BASCULE`) and 16 px nearer the viewer, `pret` / `attaque` alternating,
    depth-sorted by its feet, with the day's HP in a bar over its head; drawn once (`geant`), not per hero. A poll that
    deals damage from any raider makes it flinch (`touche` and an impact flash, 900 ms). At 0 HP it falls once where it
    stands: the felled puff at its size and a gold burst (a gold ring opening and 10 sparkles rising, 1.2 s), the
    raiders holding their places meanwhile; then the gathering disperses: each raider walks back to the goal it left
    for its place (the first one is already there); the chronicle says "[Mage Tower]
    Gruntak the Mossback is slain by Aldric, Human mage!"; the trophies count it (`total`, and `streak`: consecutive
    days with a kill, alive while the last kill is today or yesterday); and no raid starts again until midnight.
    **Minions (after the kill):** until midnight a hero with running subagents fights the boss's minions instead
    (`suit` / `sbiresDe` in activite.js), once the boss's fall is over, where it stands again after the dispersal
    (they show once its walk back ends): one per running subagent (oldest first,
    up to 3), of the day's species (golem, spectre, goblin; a troll day brings goblins, three trolls are too wide),
    drawn at a fight creature's size (`BETE` 1.5x), `pret` / `attaque` alternating, each with its 4 blow pips. They
    stand on the hero's open side (`rangs`: the creature's side unless the other one has room for more): the first
    places of `PLACES` (a mage's: 80 px in front, 170 px behind, 170 px further in front, then spares; other classes
    nearer or further as their fight creature, `proche`) on walkable ground whose
    `pret` boxes overlap none taken; the apprentices keep to the other side and off their zone. Once the hero stands
    there, each apprentice whose subagent has a minion leaves the file and walks to it (`det` in `apprentis`): it
    stands past the minion on the same row, at its own look's class distance (`proche`, as a fight creature), facing
    it, and plays `work`; when the minion flees or the hero walks off it walks back into the file (on walkable ground
    only, else it stays in the file). Each
    successful subagent tool call (the same `subCoups` deltas, which no longer hit a slain boss) is a blow on the next
    minion in turn (`touche` and a flash, 900 ms); 4 fell it (the felled puff, 1.2 s) and a fresh one stands in its
    place. A minion whose subagent ends flees like the boss (turns, walks 150 px off, fades, 1.2 s), and a newer
    subagent waiting past the 3 takes the free place; when all end, all flee. The hero plays `work` and stays where it
    stands, its scene waits; it faces its minions as a raider faces the boss (`work-g` when `rangs` puts them on its
    left), and so do its apprentices playing `work`. No HP, no trophies, no streak, no chronicle line, nothing stored; at midnight they go and
    the new day's raid starts. None in the demo, or for shells.
    **Champion's crown:** the hero whose subagent dealt the last blow wears a small gold crown (art/couronne.svg,
    13 × 9) over its head until midnight: in the village (a child of its unit, so it walks and sorts with it; above its
    HP bar when selected, above its `!` / `?` mark; never on apprentices) and on the Selected Unit card (2×, on the
    frame's top edge). The slayer's terminal is `by` in `wocc.boss`; when it closes there is nothing to draw, and the
    tooltip still names it from the stored hero (`heros`). `champion()` in kit.js.
    **Tiers:** by the streak at stake, the one alive when the day began (`serieEnJeu`: a kill today does not change
    it): 3+ = Elite, 7+ = Legendary (`palier`, colours `PALIERS` violet `#b07bff` / orange `#ff9a2e`). The name says it
    ("Elite Gruntak the Mossback" / "Gruntak le Moussu (élite)"), and the fighting boss stands in a pulsing aura of
    that colour at its feet (halo.svg drawn with `svg()` as a mask, twice: 1.3× and 0.8× its width). A colour tint
    of the sprite was tried and dropped: `svg()` of a PNG draws nothing, so there is no silhouette mask.
    **Trophy standards:** cloth banners with the cup (art/ui/banniere-<n>-coupe.png: red, violet, green) at 1.5x
    (39 x 60) hang from wooden poles with a gold finial standing in front of the town hall door (`BANNIERES` in
    lieux.js: the poles' feet, left of the steps, right of them, then further left): one once a boss is slain, a
    second at a current streak of 3, a third at 7 (`bannieres()` in kit.js). World elements at depth = the pole's
    foot, sorted with the units. Dimmed at night (opacity 1 - 0.55 ×
    the night weight: 0.45 at night), a 1 px native sway, none in the demo.
    **Victory-day standards:** on a day the boss is slain (`bossDuJour().slain`), 12 more red standards (the same
    pole and banner, `etendard` in place.js; the slaying champion's framed portrait over the cup, the cup itself on
    records without a `heros`) stand around the whole world until midnight, `VICTOIRE` in lieux.js: the
    west farmland, by the windmill, along the road by the barn and by the mage tower, the market square, by the temple,
    by the barracks, both ends of the footbridge, the lake shore west of the jetty, its east shore and the east lane.
    Each on open ground 25+ px off the road and 40+ px from every stroll and work spot (no unit stands in a pole), out
    of the water and the building boxes, hiding no door, checked composited on both looks' bakes; same layout for
    both looks. Depth, night dimming, sway and demo as the town hall's, which stay as they are.
    When the last raider's subagents end with HP left, the boss flees, once: it turns its back, walks 150 px away
    from its first hero over 1.2 s and fades; its HP stays for the next raid that day, which starts afresh beside its
    own first raider (not before the flight ends).
    The raid wins over thinking, scouting, combat, the dummy and meditation (their anti-zapping state keeps running
    underneath); a test result, the seal, the pigeon and "Ouch!" still show. An apprentice still in its file in a raid
    (no free point) keeps to the side away from the boss (70, 115, 160, 205 px, zigzagging 6 px in front and 30 px
    behind), its feet never within the boss's half width plus 25 px of its x, wherever the search pulls or mirrors
    it. No raid
    in the demo, or for shells.
    **Reset:** "Yes" on the boss plaque's confirmation (fronton.js, `remiseBoss` in kit.js) writes today's record as a
    fresh one, `{day, hp: BOSS_HP, max: BOSS_HP, slain: false}`, and when today's boss had been slain undoes that
    kill's trophy: `wocc.trophees` goes back to the copy stored in the record at the kill (`avant`); a record from
    before that field derives it: `total` - 1, and the streak - 1 ending yesterday when it was 2 or more (the kill
    extended a streak alive yesterday), else streak 0 with no `lastDay` (a streak of 1 means whatever came before was
    already broken, which reads the same). `wocc.boss.vus` stays, so past calls are not counted again. The shown
    village sees today's HP rise in its next poll and drops its raid and minions (`remise`); raiders then start a
    fresh raid. The crown and the victory standards go with the kill.
    - **Store keys** (one writer: the shown, live village, as for the chronicle; the demo and a hidden copy write
      nothing): `wocc.boss` = `{day, hp, max, slain, slainAt, by, heros, avant}` (`by` the slayer's
      terminal address, `heros` its `{name, race, cls}` then, `avant` the trophies before the kill) (the day's boss; another day's or none reads as a
      fresh boss at full HP, `bossDuJour` in kit.js), `wocc.trophees` = `{total, streak, lastDay}`, and
      `wocc.boss.vus` = `{address: subCoups already counted}`. Each poll the writer compares each read file's
      `subCoups` with its stored count: the difference is damage (a lower count means the file started over: all of
      it is new); a terminal seen for the first time with no stored count is only stored; terminals no longer among
      the agents are dropped. So a reload or a switch of village neither recounts nor loses calls.
    - **Limits:** damage is applied only by a shown village, from its activity poll (a hero's file
      is read while it works, once when first seen, and while it has subagents). Calls made meanwhile are caught up
      from the stored counts the next time that hero's file is read, so they may land after midnight on the next
      day's boss. Calls made before a terminal's first sight are not counted.
  - **Anti-zapping:** a scene changes only when asked for 8 s and the current one is 15 s
    old (20 s / 40 s to or from the forest edge); meditation, tests and the end switch at once.
- **Village life** (`ambiance.js`): walkers with pauses on the road (a peasant woman and a
  farmer by day, a merchant when 2+ heroes work, a guard with a lantern at night), hens by the
  barn, the tavern cat, a stag at dawn and dusk, sparrows over the fields, fish leaping in the
  river, a treasury of up to 5 coins (account A's week left, cduo only) and fair pennants the
  day before the weekly reset.
  - **Roaming cats** (`CATS`): three cats, each with its own stops (windmill fields and barn;
    barn, tavern and market; market, jetty and lake shore). A cat walks to its next stop along
    the road the heroes use (`route` from place.js: over the footbridge, never through water or
    buildings; `marche`, mirrored by direction, with a 1 px native bob), sits there (`assis`)
    20-60 s (per cat and stop, by hash), then moves on. One time in three it goes instead to the
    nearest calm hero within 800 px (idle, or a shell on guard, standing, no other cat's), sits
    22 px beside its feet facing it, and gets up early when the hero walks off, starts working
    or leaves. Never by working, blocked or done heroes. Night sprites at night; depth by feet y
    with the heroes, behind front cut-outs like the walkers. The 1 s ambient timer starts each
    leg; no chronicle line, no click.
- **Always animated:** there is no animation switch (the old « Animations » toggle and its store key `wocc.anim` are
  gone; a stored `wocc.anim` is ignored). Only a hidden village block and the demo hold things still.
- **Maps and looks** are two axes. A map is a layout: its data module (`carte-valbrume.js`, the only map so far) and
  its bake. A look is one bake of that layout into its own folder of art/, with its own flags. Kit.js `CARTES` lists
  the maps; each record lists its looks: `{ id, nom (i18n looks), dossier, neige (snow falls), poissons (fish leap),
  fond (the view's background under the world) }`. Valbrume's looks: `ete` (`art/monde/`, fish, `#3f6b2c`) and
  `hiver` (`art/monde-hiver/`, snow, `#c9d3df`).
- **Map and look switches** under the minimap, in both panels (the Workshop one drawn by place.js and the `commande`
  block), two rows of the same style: ‹ map name › cycles the maps (store key `wocc.map`, default `"valbrume"`) and
  ‹ look name › the shown map's looks (`wocc.look`, default its first); a row with a single choice shows only the
  name, the arrows' places left empty. Every copy re-renders at once and the choice survives restarts; the camera
  stays where it is. A stored `wocc.map` of `"hiver"` (from before looks) reads as Valbrume in winter until a look is
  picked; a pick writes both keys. Switching maps keeps the look id when the new map has it, and starts the
  heroes, walkers and cats afresh on its spots. The world's images (tiles, bands, front cut-outs, minimap) come
  from the shown look's folder (`monde()`; same file names in each); only that look's images are referenced. Rings
  and quest marks stay in `art/monde/` (the winter folder has none).
- **Winter (look flags):** no leaping fish (`poissons: false`: the river is frozen), and light snow (`neige: true`)
  over the view, above the world and under the chronicle. A `.loop` swings there and back, so a flake on a `top` loop would climb back up;
  instead each flake stream is a wheel (`art/neige-{0,1,2}.svg`, 7 flakes of 3-4 px on its rim, 480 px, over a dark twin wheel 1 px lower right turning in step, so the flakes show over snow) turned by
  the native `svg.spin` (17-26 s a turn, staggered per wheel) inside a 100×390 px `overflow_hidden` window that
  shows only its right-hand sector, where the rim goes down: flakes drift in and fall along a shallow arc without
  ever rising. Wheels every 90 px across and 330 px down (about 30-40 flakes in view), no timer and no redraw.

## Immersive mode

The same layout, other blocks shown: the left column (`gauche`) keeps the board on top and the command
panel below (its own block, role `commande`, 400 px, hidden in Workshop); on the right the village and the
terminal swap places: a second village block (`place-immersion`, weight 1, `props.immersion: true`, no panel
inside, hidden in Workshop) fills the space above, the framed terminal (`arene`) shrinks to 400 px below
(resizable), and the bottom village (`place`) is hidden. The header's « Immersion » / « Atelier » (Workshop)
button and ctrl-shift-i (`world-of-codecraft.mode`, read by the header) run `layout.show` / `layout.hide` /
`layout.resize`: layout clicks, so the mode survives restarts. Only the shown village writes the chronicle;
a hidden one keeps no timers. The layout sets no terminal text size, so Herdr's settings choose it.
- **No zoom: more map, baked by the village's own engine.** The direction A art pipeline (procedural voxel
  models, GI lighting, tiled procedural ground, `compose3` compositor) lives in `tools/village-art/`
  (rebuilt from the session transcripts on 08/11/2026 and verified pixel-identical to the approved bake).
  `tools/bake_lands.py` runs that compositor on a canvas 400 px taller on each side: the ground over 1200
  rows (north paths continued, a lane south of the market, two more fields, the river on its own line), the
  village's objects drawn whole, a forest to the north and oaks, bushes, rocks and fences to the south. The
  village tiles are rewritten from the composite only after checking no building pixel changed by day (at
  night the glow differs by one step on 85 pixels near the north edge); the only change is the forest's soft
  shadows on the top of the village's grass, which makes the seam invisible. About 9 minutes; `CACHE=x.npz`
  reuses the composite.
- **Wider lands:** `tools/bake_wide.py` runs after it and re-bakes everything on a 5000×1200 canvas: bake_lands.py's
  ground and objects (re-run from its source), the ground over 5000 columns with the road, fields, the lake and
  two trails added, and 1000 px of new land on each side (forest, farmland and the windmill west; the lake, the
  jetty and, in the north band, a ruined watchtower east). The world keeps its coordinates (`WORLD.x = -1000`).
  No new sprite touches the old tiles; it checks the village's building pixels by day before rewriting the tiles.
  The crossing: a dirt path from the village road's end over a wooden footbridge (`b-bridge` in buildings.py) to
  the east lane. The new lands are placed on the ground as it was before that path (same draws, same lands),
  then the few objects standing on it are dropped. Heroes walk there, so it adds front cut-outs (keys `est-*`):
  the bridge's front rail in four pieces (its mask is `b-bridge-rail`, the rail alone) and the objects just in
  front of the walk.
  About 40 seconds (sprite loads are cached); `CACHE=x.npz` reuses the composite.
- **Themes (the winter look):** `tools/village-art/theme.py` reads `THEME` (unset or `ete`: summer; `hiver`: winter)
  and picks that look's record in `LOOKS` (see "Maps from a layout" below for its fields). Each
  look renders its sprites into its own folder (`assets/`, `assets-hiver/`; `build_assets.sh` renders every model of
  buildings.py's registry) and Valbrume's chain bakes into its own folder of the
  mod (`art/monde/`, `art/monde-hiver/`); the summer path is unchanged (its sprites and bakes come out
  pixel-identical). Bake each look with the same chain:

      sh tools/village-art/build_assets.sh                # summer sprites first: winter cuts to their boxes
      P=tools/village-art/.venv/bin/python
      $P tools/bake_world.py && $P tools/bake_lands.py && $P tools/bake_wide.py
      THEME=hiver sh tools/village-art/build_assets.sh
      THEME=hiver $P tools/bake_world.py && THEME=hiver $P tools/bake_lands.py && THEME=hiver $P tools/bake_wide.py

  Winter is palette and texture overrides on the summer models, not new models, except the bare trees:
  - sprites (`tex.hiver(PAL)`, called once a model is built): every non-glowing material but glass, metal and gold
    gets snow (`SNOW`, `#d6e0ec`, a 7-step ramp with the usual cool darks) on the faces turned up (`snowy`: normal z
    over 0.5, 0.38 for roofs, the edge broken by noise), so roofs keep their eaves and outline in their own colour;
    pines are dusted (0.3, patches), bushes snowed over but for their undersides, the well's water is ice;
    `tree-oak` and `tree-autumn` grow a leafless crown (`bare` in buildings.py: forked limbs, snow on the bark);
  - every winter sprite is cut to its summer box (`fit`: same size and anchor), so the layout data does not change;
  - ground (`extras.py`, `compose2.ground`): grass becomes snow (two cool ramps, blue hollows instead of dry
    patches, no flowers, snow lips instead of grass blades), the road packed snow with mud in the ruts, the square's
    cobbles snow in the joints and drifts, the water pale ice with frosted patches and cracks (its foam rim white),
    the fields snow along the ridges with dark soil in the furrows.
  `bake_world.py` checks in winter that every sprite keeps its summer box and silhouette (alpha), the bare trees'
  silhouettes excepted; the building-pixel checks of bake_lands.py and bake_wide.py run within the theme. The
  winter chain rewrites `monde-data.js` and `terre-data.js` with the same content (check with `git diff`).
  Valbrume's chain (bake_world, bake_lands, bake_wide) is frozen: new maps use `bake_map.py`.
- **Maps from a layout (`tools/bake_map.py`):** a new map is baked in one pass from a layout file,
  `layouts/<id>.json`, with the same compositor, lighting, shadows and ground textures (`compose3.compose_sol`,
  `extras.ground_tex`), one look per run (about 20 s for a 2000×1200 canvas):

      sh tools/village-art/build_assets.sh && THEME=hiver sh tools/village-art/build_assets.sh   # sprites per look
      P=tools/village-art/.venv/bin/python
      $P tools/bake_map.py layouts/<id>.json --look ete && $P tools/bake_map.py layouts/<id>.json --look hiver

  `--racine DIR` writes elsewhere than the mod (a test bake). It writes `art/<id>-<look>/` (`jour-<k>`, `nuit-<k>`,
  `nord-<k>-<jour|nuit>`, `sud-<k>-…`, `avant-<key>-<jour|nuit>`, `minicarte.png`: the names place.js reads) and
  `carte-<id>-data.js` (`WORLD`, `TILES`, `FRONTS`, `EXT`, the same for every look: winter sprites keep the summer
  boxes, and the scatter is placed on the base look's sprites). The code: `tools/mapbake/` (`carte.py` the layout,
  `sol.py` the ground, `objets.py` the objects and scatter, `verif.py` the checks).
  - **Coordinates.** Map px `(u, v)` are the mod's `(x, y)`: `u` across the world (`monde.x` to `monde.x + w`), `v`
    down from the village band's top (0 to `h`; the north band is `v < 0`, the south band `v >= h`). Iso ground
    `(x, y)` (world units, `z` up) is the compositor's projection: `u = U0 + x − y`, `v = V0 + (x + y)/2 − z`, with
    `[U0, V0]` = the layout's `origine` (Valbrume's is `[1500, 200]`). Points are map px; an object may give `iso`
    instead of `at`. Ground widths, half sizes and radii are iso units (one iso unit along x is +1, +0.5 px).
    Dithering and hashed ground details are keyed on map px, so the bands and the village band join seamlessly.
  - **Layout schema** (unknown keys fail):
    - `id`; `origine` `[U0, V0]`; `monde` `{x, w, h, nord: 400, sud: 400}` (the canvas: the village band and the
      immersive bands); `tuile` (tile width, 1000).
    - `sol`: ground shapes painted in order (a later one wins), each `{sol: <kind>, <geometry>, demi, bruit, rivage}`.
      Geometry: `ligne` (polyline, `demi` = half width: roads, paths, rivers), `boite` (centre, `demi` `[x, y]` on
      the iso axes: squares, fields), `ellipse` (centre, radii `demi` `[x, y]`: lakes), `polygone` (map px outline:
      lakes, seas). `bruit` scales the edge noise (default per kind), `rivage` adds a slow shore wobble (bake_wide's
      lake: 24). Kinds (`KINDS` in sol.py): `grass` (the default ground), `dirt`, `paved`, `water`, `crop`, each
      with its edges: water kinds share one distance field (bank, foam, shallows), `dirt` and `water` are
      `interdit` (nothing stands on them), `crop` gets a dark top edge. A new kind (sand, a sea shore) is an entry
      in `KINDS` plus its texture (`TEX`, or a branch of `extras.ground_tex`).
    - `batiments` (buildings and landmarks) and `props`: `{modele, at | iso, dp, sur, box, front}`. `modele` is a
      buildings.py name (no `b-`); `dp` the depth bias (drawn at `v + dp`; 30 and 8 by default, as compose2's
      scene: the town hall 60); `sur` the `interdit` kinds it may stand on (a bridge: `["water", "dirt"]`); `box`
      the mod's hit box `[dx, dy, w, h]` for the walkable check (else its ground box); `front` see below.
    - `clotures`: fence runs `{axe: x | y, de | iso, n, pas: 44}`: `n` posts of `fence-<axe>` along that iso axis.
    - `dispersions`: seeded scatter bands `{zone: [u0, u1, v0, v1], essais, max, graine, modeles: {name: weight},
      densite, espacement: [du, dv], herbe: [r, up], dp: 6, exclusions}`: `essais` draws in the zone (seed
      `graine`), kept when a draw under `densite` (a number, or `[top, bottom]` across the zone) passes, the ground
      round the base is all grass (`herbe`: `r` px each way, `r/2` down, `max(up, r/2)` up; trees ask for more, their
      crown hides the ground above the trunk), it is outside every keep-out, `espacement` from every object placed so
      far (explicit ones and earlier bands too) and its ground box clear of every building's; up to `max`.
    - `exclusions`: keep-outs `[u0, u1, v0, v1]` for every band.
    - `heros` (optional): `ROAD`, `ROAD_R`, `FLANE`, `SPOTS`, `SPOT_R`, `DECK` as in `carte-valbrume.js`: where the
      heroes walk, for the checks and the front cut-outs (copy them into the map's `carte-<id>.js`).
  - **Ground box** (`objets.emprise`): a model's opaque pixels at or below its anchor row (the front half of its
    footprint) mirrored above it, on the base look's sprite.
  - **Checks** (the bake stops before writing anything, listing every failure): every model is in buildings.py and
    built for the look; no building's ground box overlaps another's, no prop, fence or scatter overlaps a
    building's; no building's footprint (the inner 80 % of the diamond in its ground box) is on `dirt` or `water`
    unless `sur` says so; no prop, fence or scatter base on them, no scatter in a keep-out; every `FLANE` and `SPOTS`
    point is walkable by lieux.js `walkable()` (the deck; never water, read on the kind map; the road; else near a
    spot and outside every building's box).
  - **Front cut-outs:** an object gets one when a walkable point (the same rule, over the village band) lies within
    32 px of its sides with its feet below the object's top and above `v + dp − 3`: a unit standing there is drawn
    behind it (place.js's test). Without `heros`, bake_world's `FRONT_V` rule: every object based in the lower half
    of the band. `front: true` forces one, `false` drops it, `{masque, pieces}` cuts it from another sprite in column
    pieces at their own feet's depth (the bridge: `{"masque": "bridge-rail", "pieces": 4}`, bake_wide's rail). Cut
    from the composite, kept to the village band, keys as bake_world's (`barn`, `bush-3`, `bridge-0`).
  - **Looks** (`LOOKS` in theme.py, picked by `--look` / `THEME`): `assets` (its sprite folder), `monde` (Valbrume's
    folder), `base` (the look whose boxes its sprites are cut to: `buildings.fit`), `materiaux` (a palette transform,
    `tex.MATERIAUX`: `hiver`), `arbres_nus` (bare oaks and autumn trees), `sol` (ground-kind texture variants:
    `{grass: neige, dirt: neige, paved: neige, water: glace, crop: neige}`), `herbe` (grass tint `sec` / `dru`, blade
    colour `brins`), `fleurs`. `""` and `hiver` build and bake exactly as before (sprites checked byte-identical).
  - **A new map, end to end:** write `layouts/<id>.json`; build the sprites of each look; bake each look with a
    test `--racine` first and look at it (day and night), then into the mod; write `carte-<id>.js` by hand like
    carte-valbrume.js (its looks with `dossier: "<id>-<look>"`, buildings at their layout points with boxes, spots,
    chimneys, glows, standards; FLANE, ROAD, RIVER, LAKE, DECK, walkers, cats...), importing
    `WORLD, TILES, FRONTS, EXT` from `carte-<id>-data.js`; add it to kit.js `CARTES`. `layouts/essai.json` is a
    test layout only (not in the mod).
- **Camera:** horizontal and vertical (drag, two-axis wheel), kept inside the bands; selecting a hero
  brings the village back into view.
- **Panel bridge:** the village publishes its camera and units to the store (`wocc.view`, only when
  they change, at most every 300 ms); the panel's minimap reads it and a click writes `wocc.goto`.

## Built from

- **Layout tree:** a root column made of:
  - `fronton` (block, 48 px);
  - `bourg` (row, 6 px padding and gap), holding:
    - `gauche` (column, 262 px, min 200, max 420): `tableau` (weight 1) and `commande`
      (400 px, hidden outside the immersive mode);
    - `droite` (column): `place-immersion` (weight 1, `props.immersion`, hidden outside the
      immersive mode) and `arene` (weight 1, 400 px in the immersive mode; a column of four
      `rail` blocks around the `main` tab block);
  - `place` (block, 400 px, hidden in the immersive mode).

  The root has `titlebar: none`, background `#120c0e`, `font` JetBrains Mono, `ui_font`
  Alegreya Sans, no `font_size`, and a PNG `preview`. There is one layout file; the
  immersive mode is a set of layout clicks on it.
- **The mod** is `mods/world-of-codecraft`, one mod with roles picked by `props.role`:
  - `fronton.js`: the top bar and the immersive-mode switch
  - `tableau.js`: the districts column
  - `rail`: the gilded moulding
  - `place.js`: the world and the command panel, with `commande.js`
  - `pane.js`: the pane header

  The shared code is:
  - `kit.js`: palette, fonts, hero identity, hours and the optional quota reader;
  - `ui.js`: frames built from 4 corners and cropped edge strips, since Herdr has no
    9-slice;
  - `carte-valbrume.js`: the map of Valbrume, hand-edited: its looks; its buildings, each at its bake point (the
    object's (u, v) in `tools/village-art/compose2.py` scene(), world coordinates) with its hit box, work spots
    (`SPOTS` per class building; the rogues' are the market's, placed at the red stall's point), chimneys, glows
    and trophy standards as offsets from it, so another layout places buildings and gets these with them; the
    stroll spots, the road, the water, the victory standards, `BASCULE` (x past which a fighting hero's creature
    stands on its left: 2700, the old 3000 px world's edge minus 300, kept as it was) and the village life's
    places (walkers' stops, hens, cats, stag, fish, treasury, fair, sparrows). It references the bake's own data,
    `monde-data.js` (`WORLD`, `TILES`, `FRONTS`) and `terre-data.js` (`EXT`), which the bakes write and serve every
    look of the map;
  - `lieux.js`: the shown map's layout (`lieux()`), resolved once per map id and cached: the building-relative
    values made absolute (`SPOTS`, `BUILDINGS`, `MARCHE`, `BANNIERES`, `SMOKE`, `GLOWS`), the road's arc lengths
    (`ROAD_S`) and every known walkable point (`POSTES`); `walkable()`. Every reader goes through it, so a map
    switch needs no reload;
  - `heros-data.js` and `monde-data.js`: animation frame tables and world tiles,
    generated;
  - `activite.js`: the activity scenes; `ambiance.js`: village life;
    `creatures-data.js`: creature and villager sprites, generated;
  - `i18n.js`: every visible string in French and English, and the language detection.
- **Herdr API:**
  - data: `spaces()`, `agents()`, `panes()`, `focused()` and the store;
  - commands: `agent.focus`, `agent.next`, `pane.focus`, `space.select`, `tab.select`,
    `tab.new`, `space.new`, `pane.split`, `pane.zoom` and `pane.close`.
- **Timers:** one shared 100 ms timer runs only while a visible unit animates or walks, or someone blinks in or out
  or is summoned, or a raid boss or a minion is hit, falls or flees (its signature changes at each stage of the fall and the
  flight, and drops each window's end: `Activites.fenetres`),
  and stops when its village block (`place` or `place-immersion`) is hidden. The clock ticks every 30 s; the sky and quotas
  update every 60 s.
- **Files read and programs run:** the activity files in `~/.local/state/world-of-codecraft/`
  (if the integrations are installed) and `~/.local/state/claude-duo/quota-{A,B}.json`
  (cduo, if present). Once per start it runs `sh` to read the system language
  (`defaults read -g AppleLanguages`, `$LANG`). No network calls.
- **Repo tooling** (`tools/`, not installed): `install.sh` copies the mod, layout and theme
  into the Herdr home (`--integrations` links the hook and plugin); `sync_creatures.py`,
  `sync_heroes.py`, `bake_world.py`, `bake_lands.py`, `bake_wide.py`, `ui.py` rebuild the art from `tools/sources/`;
  `bake_map.py` (with `mapbake/`) bakes a map from its layout in `layouts/`.
- **Art** (`art/`):
  - heroes: 30 race×class sprites with `idle`, `rest`, `work` and 4-way walk frames,
    plus night-graded copies; `walk_dr` / `walk_ul` and `work-g` (fighting towards the left) are exact horizontal
    mirrors made by `sync_heroes.py` (`--mirrors` remakes them from the frames already in `art/heros/`, no source);
  - the baked world: day and night tiles, front cut-outs for depth, the minimap, per look (`monde/`,
    `monde-hiver/`); the snow wheels `neige-*.svg`;
  - UI chrome: PNGs at 2×;
  - SVG icons.

  Fonts (OFL, `fonts/`): Cinzel Decorative, Cinzel, Alegreya Sans, Jacquard 24 and
  Jersey 15.

## Watch out

- **Depth:** units sort by their y position. Front cut-outs of buildings are drawn
  again above units standing behind them.
- **Frame swaps:** all frames of the current animation are stacked at opacity 0/1, so
  a swap never loads an image.
- **Breathing:** heroes without frames show the standing sprite with a native 1 px
  breathing loop.
- **Demo (screenshots):** `demo: true` on the `place` block shows only demo heroes with every activity
  scene (`heure: 22` for night, `demo: "marche"` makes them walk); on `tableau`, `commande` and `fronton`
  it shows generic districts, tabs, a selected unit and a chronicle (`demo.js`), so a preview never shows
  anyone's projects. `lang: "en"` forces the language. The preview was taken that way, window 1600×1000.
- **Install real files, not symlinks:** Herdr loads images and hot-reloads mods only from
  real paths inside its home. A symlinked mod shows no images and never reloads.
- **Declare `transition` on every render**, 16 ms while standing: GPUI animates only
  changes made after the transition exists, so adding it with the new target jumps there.
- **Two-frame swaps need both loops:** the top frame `opacity -6 → 7`, the one below
  `7 → -6`, same period, linear, created on the same render (clamped, almost instant).
- **Bounded blinks:** a `.loop` runs forever, so the blink loop (opacity `-6 → 7`, 166 ms) is declared only during
  its 500 ms window, on a zero-size layer every unit and apprentice always has (a stable tree), and the ghost is
  drawn only then. The frame timer's signature includes each window's end, so it redraws once to drop it, then
  stops when nothing else animates.
- **Summon stages:** the ring and the sparkles use no `.loop` (it swings there and back, and its phase is not the
  summon's). They are drawn with ids at a starting size and opacity, and the frame timer's signature includes
  each summon's stage (100 ms: open and rise, 350: blink, 700: fade, 1000: cast ends, 1400: gone; a ghost's
  sparkles: 100 and 300 ms), so each stage redraws once with new targets that native `transition`s on
  width/height/left/top/opacity carry (the sparkles' `delay` staggers them). Centred because left/top move with
  width/height under the same easing.
- **Walkers' depth** comes from where they really are on their leg; the 1 s ambient timer
  redraws when one passes behind or out from behind a front cut-out.
- **Many hot reloads** (dozens) can exhaust the mod's JS heap ("out of memory", then
  "Null"): restart the Herdr window.

## Done when

- `herdr-app check mods/world-of-codecraft` passes and `herdr-app status` shows no
  errors.
- A hero turning working works where it stands, without walking off. Blocked shows `!` and a red ring. Focusing
  another agent glides the camera, and a minimap click moves it.
- Without cduo files, the top bar shows no empty quota plaques.
- With a French system the whole interface is in French, otherwise English.
- The « Immersion » / « Atelier » button swaps the village and the terminal without changing
  layout, and the mode survives a restart. The terminal text size follows Herdr's settings.
- With the Claude Code hook installed, a working Claude hero scouts while reading and
  fights a creature while editing.
