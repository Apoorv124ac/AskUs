# Office Quest — Day 1

Playable engine demo: controls, movement feel, pickups, pipes, HUD. Art is
placeholder (generated in code); the hero is swapped for the real sprite in Day 2.

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
