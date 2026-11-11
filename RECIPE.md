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
    until the weekly quota reset);
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
  - "Map of Valbrume": a minimap with unit dots and the camera frame;
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

## How it behaves

- **Class comes from the program:**
  - Claude Code: Mage, at the Mage Tower
  - Codex: Artificer, at the Forge Workshop
  - Gemini: Priest, at the Temple of Dawn
  - OpenCode, pi, amp, cursor: Ranger, at the barn and fields
  - any other agent: Rogue, at the market
  - plain shells: Warriors; they stroll the whole world like idle heroes (FLANE spots, 15 to 40 s at each),
    never onto a spot another hero holds or heads for; no chronicle line, the camera does not follow the
    stroll, and with animations off they stand still
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
    put; with animations off nobody moves. Only the demo heroes work at their class building (`SPOTS`).
  - **idle**: it strolls (`idle` while standing): it walks to a spot in the village or the western
    farmland or, over the footbridge, the east lands (lake shore, by the jetty, along the lane: `FLANE` in
    lieux.js), stands 15 to 40 s (staggered per hero), then picks another. With animations off it stands still
    on one spot.
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
  layout switch, a village block shown again, animations turned back on), nor for apprentices that appear with
  their hero's first activity read; an apprentice changing slot or pose doesn't blink. With animations off or in
  the demo, units appear and disappear at once. `Place.passages` compares each render's units and apprentices
  (keys: address, `hero:subagent id`) with the last live one's.
- **Summon and send-off (apprentices only):** an apprentice that comes is summoned over 1.4 s: its hero plays its
  `work` frames for 1 s (not while it walks: its walk wins), a gold ring (`halo.svg`) opens on the ground at the
  apprentice's feet from 10×4 to 120×50 px and fades (under the units there), and 5 sparkles (`etincelle.svg`)
  rise from it and fade, staggered by 80 ms; the apprentice stays hidden 350 ms, then blinks in (with its glow)
  while the ring fades under it. One that leaves gets 4 sparkles rising from its ghost during the 500 ms blink
  out; no cast, no ring. Heroes and warriors keep the plain blink. Same suppression as the blink (first render,
  animations off, hidden, demo).
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
  `outil`, `coups`, `err` / `errT`, `errTache`, `subs`, `subIds`, `tache`, `essai {ok, t}`,
  `commitT`, `pushT`. Without them heroes keep the plain status behaviour.
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
    the hero (red flash, "Ouch!");
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
  - **Raid:** while a hero (not a shell, not a demo hero) has running subagents (the apprentices' rule: ids with an
    event in the last 30 min), whatever its status, it fights a raid boss instead of its scene. It plays `work`
    where it stands and never moves on (a strolling idle hero stops where it is, as when it turns working; it
    strolls again after the raid). The boss is the forest troll drawn at 2× its fight size (`GEANT`: 4×4 screen
    px per art px), feet 170 px from the hero's (`LOIN`) on the creature's side (right; left past x 2700) and
    16 px nearer the viewer, `pret` / `attaque` alternating, depth-sorted by its feet. Over its head, one pip per
    running subagent. A subagent that ends (even when another starts in the same poll) is a blow: `touche` and an
    impact flash for 900 ms, one pip fewer. When the last one ends it falls: the felled puff at its size, 1.2 s,
    then the hero is back to its scene or stroll. The raid wins over thinking, scouting, combat, the dummy and
    meditation (their anti-zapping state keeps running underneath); a test result, the seal, the pigeon and
    "Ouch!" still show. In a raid every apprentice slot is on the side away from the boss (70, 115, 160, 205 px,
    zigzagging 6 px in front and 30 px behind), and no apprentice's feet stand within the boss's half width plus
    25 px of its x, wherever the search pulls or mirrors it. No raid with animations off, in the demo, or for
    shells; no chronicle line.
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
- **« Animations » toggle** under the minimap (store key `wocc.anim`, default on). Off:
  heroes stand on still frames, no walking, no scenes, enemies, apprentices, village life or smoke, and
  no activity polling (about 10 % of a core instead of 27 % on an M2 Pro).

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
  - `lieux.js`: unit spots, the road and building hit boxes;
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
  or is summoned, or a raid boss is hit or falls (its signature drops each window's end: `Activites.fenetres`),
  and stops when its village block (`place` or `place-immersion`) is hidden. The clock ticks every 30 s; the sky and quotas
  update every 60 s.
- **Files read and programs run:** the activity files in `~/.local/state/world-of-codecraft/`
  (if the integrations are installed) and `~/.local/state/claude-duo/quota-{A,B}.json`
  (cduo, if present). Once per start it runs `sh` to read the system language
  (`defaults read -g AppleLanguages`, `$LANG`). No network calls.
- **Repo tooling** (`tools/`, not installed): `install.sh` copies the mod, layout and theme
  into the Herdr home (`--integrations` links the hook and plugin); `sync_creatures.py`,
  `sync_heroes.py`, `bake_world.py`, `bake_lands.py`, `bake_wide.py`, `ui.py` rebuild the art from `tools/sources/`.
- **Art** (`art/`):
  - heroes: 30 race×class sprites with `idle`, `rest`, `work` and 4-way walk frames,
    plus night-graded copies;
  - the baked world: day and night tiles, front cut-outs for depth, the minimap;
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
  fights a creature while editing; the « Animations » toggle stops every animation.
