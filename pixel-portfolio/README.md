# OFFICE QUEST - a playable pixel-platformer portfolio

Phaser 3 + Vite, vanilla JS. 256x224 internal resolution, integer-scaled, Press Start 2P font,
Tiled-JSON maps, everything configurable from `src/config.js`.

> **Status: Segment 1 / Day 1 - "Movement Lab".** Scaffold, full controls, test level, bonus room,
> pickups, HUD, pause menu, touch controls, save/load. Worlds 1-6, NPCs, enemies, login and
> credits come in later segments.

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
  scenes/               Boot, Title, Level, HUD, Pause
  entities/Player.js    hero (physics zone + juicy sprite)
  systems/              MovementController (pure), Input, Audio (WebAudio chiptune), Save,
                        GameState, FX, Display (integer scaling, CRT), TouchControls, UI
tests/                  unit + e2e tests
```

## Swapping placeholder art

Everything visual is declared in `src/assets/manifest.js`. Set an entry's `url` (relative to `public/`)
and the generated placeholder is skipped. Frame contracts are documented at the top of that file
(hero: 16x32 frames - idle, walkA, walkB, jump, skid - one sheet per career tier).

## Accessibility

Pause menu, mute (M), reduced-motion ("CALM MOTION" - follows `prefers-reduced-motion` by default; turns off
shake, squash, dust, bobbing, spinning), full keyboard play, dark backings behind text for contrast.
