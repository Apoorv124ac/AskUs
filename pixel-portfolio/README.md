# OFFICE QUEST - a playable pixel-platformer portfolio

Phaser 3 + Vite, vanilla JS. 256x224 internal resolution, integer-scaled, Press Start 2P font,
Tiled-JSON maps, everything configurable from `src/config.js`.

> **Status: Segment 2 / Day 2 - "The Front Door".** Day 1: scaffold, full controls, test level, pickups, HUD,
> pause, touch, save. Day 2: hero redesign (Apoorv), Title menu, office-entrance cutscene with a reusable
> dialogue box, login desk (real e-mail field, validation, ACCESS GRANTED, optional POST), world map with
> locked/unlocked worlds, Recruiter Mode, finish flag that clears a world. Worlds 1-6 still use the shared
> test level as a stand-in; enemies, NPCs and credits come in later segments.

## The six worlds (each is its own level, theme and mechanic)

| # | world | theme | mission | difficulty |
|---|---|---|---|---|
| 1 | Intro | city | exactly 10 gold coins, each reveals an about-me fact; 2 bugs | 1 |
| 2 | Education | campus | 3 classroom tasks (collect books / stomp bugs / pull lever) earn 3 degrees and open gates | 2 |
| 3 | Experience | office | 3 floors, each ends in a mini-boss (3 stomps) that reveals a real achievement | 3 |
| 4 | Skills | server room | 4 coloured coin zones fill 4 skill bars; moving platforms, long jumps, 2 bonus pipe rooms | 4 |
| 5 | Awards | gallery | bump `?` blocks for certificates; printers, gaps, trophy hall | 5 |
| 6 | Contact | rooftop sunset | link terminals (Enter), HIRE ME flag, rolling credits | 1 (victory lap) |

Enemies: Bug, Deadline Clock, Meeting Invite, Spam Email, Printer Jam (stomp them; a hit costs 3 coins and sends you to the
last checkpoint - no game over). Enemy speed also scales with world difficulty (`ENEMIES` in `config.js`).
`node tools/validate-maps.mjs` proves every level is beatable (worlds 1-3 and 6 with normal jumps, 4-5 need the long jump) and
that every coin / `?` block / book is reachable, so information is never gated behind difficulty (also run by `npm test`).
Edit layouts in `tools/gen-maps.mjs` (then `node tools/gen-maps.mjs`). Fill in your real content in `src/data/resume.json`.

## The flow

`Title` -> `Entrance` (cutscene, Esc skips) -> `Login` (e-mail or SKIP) -> `WorldMap` -> `Level` (world n) -> finish flag -> `WorldMap`.
Returning visitors get **CONTINUE** (straight to the map). **RECRUITER MODE** on the title (or `R` on the map)
unlocks all worlds, adds `H` = jump to Contact and `V` = classic resume link (set `meta.classicResumeUrl` in `resume.json`).

Login: the e-mail is validated, stored in `localStorage`, and POSTed as JSON **only if** `LOGIN.endpoint` in
`src/config.js` is set (otherwise nothing leaves the device; the on-screen privacy line changes accordingly).
Pause > RESET PROGRESS erases it.

## Run it

```bash
cd pixel-portfolio
npm install
npm run dev          # http://localhost:5173  (hot-reloads on every save, incl. config.js)
```

Other commands:

| command | what it does |
|---|---|
| `npm run build` / `npm run preview` | production build to `dist/` (~400 KB gzipped incl. Phaser) and serve it |
| `npm test` | unit tests for the movement model (pure logic, no browser) |
| `node tests/e2e.mjs` | drives real Chromium through every control; needs `npm run build` first and the Playwright Chromium (`PLAYWRIGHT_BROWSERS_PATH`); screenshots go to `test-output/` |
| `node tools/gen-maps.mjs` | regenerates `public/maps/*.json` (Tiled format) |

URL flags: `?debug` (physics overlay + `window.__oq`), `?reset` (wipe save), `?touch` (force touch controls),
`?canvas` (force Canvas renderer), `?physics` (Arcade debug boxes).

## Controls

| action | keyboard | touch |
|---|---|---|
| walk | Left / Right (or A / D) | D-pad |
| run | hold Shift | B |
| jump (hold = higher) | Up (or W) | A or D-pad up |
| **long jump** (higher + farther) | Shift + Up | B + A |
| enter pipe | Down while standing on it | D-pad down |
| interact / confirm | Enter or Space | OK / A in menus |
| pause / menu | Esc or P | II |
| mute | M | M |
| world map | Left/Right or 1-6, Enter, R recruiter, H contact, V resume | D-pad, A, tap nodes/buttons |
| CRT scanlines | C | pause menu |

Coffee = 12 s of +25 % speed, **double jump** and a glow.

## Tuning the feel

Open `src/config.js` and edit `PHYSICS` (gravity, speeds, accelerations, jump velocities,
`coyoteTime`, `jumpBuffer`, `jumpCutMultiplier`, ...), `COFFEE`, `CAMERA` (look-ahead, lerp, deadzone),
`FX`, `PROGRESSION` (career levels / XP) and `RESPAWN`. Save and the page hot-reloads.
Use `?debug` to see live velocity / coyote / buffer values.

Reference numbers (current defaults): walk jump ~3.2 tiles high, long jump ~4 tiles high and ~6.7 tiles
long. The test level's 5-tile gap needs a long jump.

## Project layout

```
index.html              page shell, CSS (scanlines, touch controls)
public/maps/            Tiled JSON maps (test-level, bonus-room)
tools/gen-maps.mjs      generates the maps (edit them in Tiled afterwards if you prefer)
src/
  main.js               boot: services + Phaser game
  config.js             ALL tunables (physics, camera, XP, palette...)
  assets/manifest.js    single assets manifest (url: null = generated placeholder)
  assets/placeholders.js procedural placeholder art (hero tiers, tiles, parallax, pickups)
  data/resume.json      single source of truth for portfolio content (placeholders)
  data/dialogue.json    all on-screen text
  assets/heroArt.js     hand-drawn hero pixel art (6 career-tier outfits)
  data/worlds.json      world-map entries
  scenes/               Boot, Title, Entrance, Login, WorldMap, Level, HUD, Pause
  entities/Player.js    hero (physics zone + juicy sprite)
  systems/              MovementController (pure), Input, Audio (WebAudio chiptune), Save,
                        GameState, FX, Display (integer scaling, CRT), TouchControls, UI,
                        DialogueBox, LoginSystem (pure), Worlds (pure)
tests/                  unit + e2e tests
```

## Swapping placeholder art

Everything visual is declared in `src/assets/manifest.js`. Set an entry's `url` (relative to `public/`)
and the generated placeholder is skipped. Frame contracts are documented at the top of that file
(hero: 16x32 frames - idle, walkA, walkB, jump, skid - one sheet per career tier).

## Accessibility

Pause menu, mute (M), reduced-motion ("CALM MOTION" - follows `prefers-reduced-motion` by default; turns off
shake, squash, dust, bobbing, spinning), full keyboard play, dark backings behind text for contrast.
