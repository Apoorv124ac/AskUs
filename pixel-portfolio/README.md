# Office Quest — Days 1–2

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
