# Office Quest — 7 worlds, a boss fight and credits

Playable engine demo: controls, movement feel, pickups, pipes, HUD, and the pixel
hero (Apoorv). Level art is still placeholder (generated in code).

## Run
```bash
npm install
npm run dev        # http://localhost:5173   (add ?debug to see hitboxes)
npm run build      # outputs dist/ (static, host anywhere)
```
Free tools only: Phaser 3, Vite, and the Press Start 2P font via @fontsource.

## Controls
| Action | Keys |
|---|---|
| Walk | ← / → |
| Run | Shift + ← / → |
| Jump (hold longer = higher) | ↑ |
| Long jump (higher + farther) | Shift + ↑ |
| Enter pipe (stand on it) | ↓ |
| Pause | P / Esc |

## Tuning the feel
Everything is in `src/config.js` (speeds, gravity, jump heights, coyote time,
coffee duration, level thresholds).

## Layout
- `src/levels.js` — levels built from helpers (swap for Tiled JSON later)
- `src/scenes/` — Preload (textures/anims), Game, UI (HUD)

## Hero (Day 2)
- Sprite sheet: `public/assets/hero.png` (24x32 frames, 8 columns, 28 frames).
- See every animation: run `npm run dev` and open http://localhost:5173/hero-preview.html
- Regenerate after tweaking the art code: `npm run hero`  (`tools/make-hero.mjs`)
- Or paint your own in Piskel / LibreSprite (free): keep the frame size and the
  frame order listed in `src/heroFrames.js`, save over `hero.png`.
- In-game extras: coffee sip, level-up celebrate, hurt on pit fall, crouch (hold ↓),
  wave after 4 s idle, golden aura while caffeinated.

## Content lives in one place (Day 4)
- `src/data/resume.json` — your profile, the 10 World-1 facts (`introFacts`), toolkit,
  experience, education, certifications. Edit text here; no code needed.
- `src/data/dialogue.json` — what Rita, Raju and Meera say (`{name}` = the visitor's name).
- Regenerate NPC art: `npm run npcs` (`tools/make-npcs.mjs`), or paint `public/assets/npcs.png`
  yourself (24x32 frames, 4 per row, order in `src/npcFrames.js`).
- Dev shortcuts: `?reset` clears saved progress, `?scene=Game` jumps into World 1.

## World 2 — Training Campus (Day 5)
Four classrooms, one per degree, each with a task that opens a gate and awards a scroll:
colour swatches (BSc Multimedia), stomp typo bugs (MA Journalism), find ideas incl. a secret
room (IIT Delhi), collect data nodes in order 1-2-3-4 (Data Science). Task logic: `src/systems/campus.js`;
level layout: `buildWorld2()` in `src/levels.js`; degree text: `education` in `src/data/resume.json`.
Typography: Silkscreen for text, Press Start 2P for headlines (`src/ui/pixel.js`).

## World 3 — Office Floors (Day 6)
Five floors, one per role, climbed by elevator. Floor 1 (freelance): collect 4 client badges.
Floors 2-5: a boss tied to a real achievement (Vague Brief, Deadline Clock, Off-Brand Beast,
100-Slide Deck); each stomp reveals one resume bullet. Beating a floor opens its gate and unlocks a
skill. Logic: `src/systems/office.js`; layouts: `buildFloor()` in `src/levels.js`; the first-person
bullets are `experience[].short` in `src/data/resume.json`. Re-entering World 3 resumes at the first
unfinished floor.

## World 4 — Skill Arcade (Day 7)
Three cabinets, 15 skill coins (design craft 5, leadership 4, toolkit 6); some hide in pipe rooms.
Each coin shows where the skill was used. The bars count what you've *found*, not a rating.
Skills + proofs: `skillArcade` in `src/data/resume.json`; logic: `src/systems/arcade.js`.

## Controls added later
Up again in mid-air = double jump (coffee = triple). R = back to the last checkpoint (never stuck).

## Worlds 5 and 6 (Day 8)
- **Trophy Hall:** hit 5 ? blocks from below to release the certificates (`awards` in `src/data/resume.json`).
- **Rooftop:** contact boards (LinkedIn opens, email opens your mail app and copies, phone copies), the
  cheering cast, and the "hire me" flagpole. Raising the flag runs fireworks, then the rolling credits
  with the visitor's final scores (`src/scenes/CreditsScene.js`).
- **Contact data** lives in `contact` in `src/data/resume.json` (email, phone, LinkedIn). Set
  `CLASSIC_RESUME_URL` in `src/config.js` to add a resume board. Clear `email`/`phone` to hide them.
  NOTE: anything in this repo is visible to anyone who can see the repository.

## Enemies, mechanics, boss (Day 8.5)
- Enemies (`src/systems/enemies.js`): turtle (stomp -> shell -> kick), croc (snaps/lunges), spam bat, email hawk
  (dives), spiker (never stomp), piranha plant (hides if you stand on the pipe). Art: `src/art/creatures.js`.
- Mechanics (`src/systems/gimmicks.js`): springs, spikes, crumbling tiles, conveyor belts, moving platforms.
- Levels are in `src/levels.js`; every world has its own mechanic mix. Difficulty (D on the map): relaxed /
  normal / hard changes enemy speed, croc toughness and some extra enemies.
- Boss: `src/systems/dragon.js` (THE DEADLINE DRAGON). Telegraphed attacks; stomp the head only when it's tired.
- Polish: squash-and-stretch + shadow + run dust on the hero, hit-stop on stomps, light motes, vignette.
