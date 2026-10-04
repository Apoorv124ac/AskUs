# Prompts — Office Quest pixel portfolio

Copy a prompt into Claude Code (or a new chat) one at a time. Always paste the
**Master Prompt** first in a new session; day prompts assume it.

---

## 0. MASTER PROMPT (paste at the start of every session)

```
You are a senior game developer + pixel-art director + UX designer. Help me
build "Office Quest": a playable browser-based 2D pixel platformer that IS my
interview portfolio. Quality bar: polished, fun, instantly understandable,
60fps, loads <3s.

CONCEPT
- Super-Mario-style side-scrolling platformer, set in an office. Original art,
  mechanics inspired by classic 90s Nintendo-era games. Do NOT copy Nintendo
  assets, names or music.
- The player character is a pixel-art version of me (I will provide photos and
  a description; use placeholders until approved).
- Each portfolio section is a world: 1 Intro, 2 Education, 3 Experience,
  4 Skills, 5 Awards/Certifications, 6 Contact + Credits.
- Non-playable characters: receptionist, office boy, colleagues, manager, boss,
  IT guy, security guard. Funny enemies: Bug, Deadline Clock, Meeting Invite,
  Spam Email, Printer Jam. Stomping defeats them; being hit loses a few coins
  and respawns at a checkpoint (no hard game over).

FLOW
Title screen → office entrance cutscene → LOGIN at my desk (user types email,
presses Enter, "ACCESS GRANTED"; validate, store in localStorage, optionally
POST to a configurable endpoint; show a short privacy line) → world-map menu
(jump to previous/next world, locked/unlocked, progress; "Recruiter Mode"
unlocks everything + shortcut to Contact + "View classic resume" link) →
worlds → credits.

CONTROLS
← / → walk; Shift+← / → run; ↑ jump; Shift+↑ long jump (higher + farther);
↓ enters a pipe when standing on it; Enter/Space interact; Esc/P pause/menu;
M mute. Add coyote time, jump buffering, variable jump height, acceleration &
friction. On touch devices show an on-screen D-pad and A/B buttons.

PROGRESSION
- Coins = skill XP. Coffee = temporary power-up (speed, double-jump, glow).
- Career-ladder level titles: Intern → Junior → Associate → Senior → Lead →
  "Hired!". Each level-up changes the hero's look (badge, lanyard, tie…).
- World 1: exactly 10 coins, each reveals an "about me" fact.
- World 2: each degree earned by completing a small task in the level.
- World 3: one floor per job; mini-boss per job linked to a real achievement.
- World 4: skill coins by category; skill bars fill; bonus pipe rooms.
- World 5: "?" blocks release certificates; trophy hall.
- World 6: rooftop sunset; contact links, resume download, "Hire Me" flagpole,
  rolling credits.
- Never gate information behind difficulty. Full playthrough 10–15 min.

TECH
- Phaser 3 + Vite, vanilla JS (or TS if I say so). 256×224 internal
  resolution, pixelArt:true, integer scaling, responsive canvas, Press Start 2P
  font, 16×16 tiles, Tiled JSON maps (or equivalent), sprite atlases.
- All my content in src/data/resume.json (single source of truth). Dialogue
  in dialogue.json. Config in config.js.
- Folder: pixel-portfolio/ (don't touch other files in the repo).
- Clean, commented, modular code (scenes/, entities/, systems/, data/).
- Save/load progress in localStorage.
- Accessibility: pause, mute, reduced-motion, keyboard-only, contrast-safe text.

VISUAL STYLE
NES/SNES palette (≈16–24 colours): #0F0F1B #FCFCFC #F83800 #FCA044 #FCE0A8
#AC7C00 #00A800 #58D854 #00B8F8 #0058F8 #6844FC #7C7C7C #BCBCBC #F8D878.
1px dark outlines, chunky pixels, 3-layer parallax backgrounds, optional CRT
scanline toggle, pixel-bordered dialogue boxes, juicy feedback (particles,
screen shake, squash & stretch, coin sparkle).

WORKING RULES
- Build in small segments (one per day). At the end of each segment: summarise
  what works, how to run it, what's next, and ask me questions.
- Use placeholders if an asset is missing; keep them swappable via a
  single assets manifest.
- Run the game and test before saying it works. Commit + push each segment to
  my designated branch with clear messages.
- Ask me before big decisions; otherwise pick sensible defaults and tell me.
```

---

## DAY 1 — Scaffold + controls

```
Day 1. Scaffold pixel-portfolio/ with Phaser 3 + Vite. Create a test level
(tilemap with platforms, a pipe, coins, a coffee) and a placeholder hero
(coloured rectangle or simple 16×32 sprite). Implement ALL controls from the
master prompt: walk, run (Shift), jump, long jump (Shift+↑), pipe entry (↓)
that teleports to a small bonus room and back. Add coyote time, jump buffer,
variable jump, camera follow with look-ahead, coin + coffee pickups, HUD with
coins/XP/coffee meter. Expose all physics numbers in config.js so I can tune
feel. Run it, verify, and give me instructions to run locally. Commit + push.
```

## DAY 2 — Hero from my photos

```
Day 2. I'm attaching photos of me and notes (glasses/hair/outfit). Create the
pixel hero:
1) Describe the design you'll use (palette-limited, 16×32, 1px outline) and
   produce a concept for approval (use the image tools available; else
   produce a pixel grid).
2) After I approve, produce the sprite sheet (32×32 frames) with animations:
   idle, blink, walk, run, jump, fall, long-jump, land, crouch/pipe,
   sip-coffee, powered idle/run, celebrate, hurt, wave, typing.
3) Wire into Phaser via atlas JSON; implement state machine and powered form.
Show a preview page with all animations looping.
```

## DAY 3 — Title, entrance, login, menu

```
Day 3. Build Boot/Preload, Title ("PRESS START"), entrance cutscene (hero walks
into office, badge-in), Login scene (terminal at my desk; email field with
validation; Enter → ACCESS GRANTED, <name>; privacy line; optional POST to
a configurable URL in config.js), and the world-map Menu (6 nodes, prev/next
jump with ◀ ▶ and arrow keys, progress, locked/unlocked, Recruiter Mode toggle,
"View classic resume" link). Persist email + progress in localStorage. Use the
Figma/Canva mock-ups I attach if any.
```

## DAY 4 — World 1 Intro

```
Day 4. Build World 1 "Reception" from resume.json: 10 coins each revealing one
fact about me (use my facts below), receptionist NPC (Rita) that teaches
controls with dialogue boxes, the office boy with coffee power-up, a pipe
bonus room (hobbies), checkpoint, goal door → level-up to Junior. Personalise
dialogue with the user's email name. Facts: <paste 10 facts>
```

## DAY 5 — World 2 Education

```
Day 5. Build World 2 "Training Campus". One task per degree (vary the tasks:
stomp exam-bugs, bookshelf puzzle, collect books in order, etc.). On completion
show a Degree Scroll (institution, degree, years, grade) from resume.json and
award XP. Add a professor NPC and a classmate NPC. Education data: <paste>
```

## DAY 6 — World 3 Experience

```
Day 6. Build World 3 "Office Floors": one floor per job, elevators between
floors. Each job has a mini-boss/challenge mapped to a real achievement
(show achievement text after defeating it), a manager NPC giving the task,
colleagues giving testimonials, and coffee power-ups. Final floor: the CEO.
Experience data: <paste roles + achievements>
```

## DAY 7 — World 4 Skills

```
Day 7. Build World 4 "Skill Arcade". Skill coins colour-coded by category,
skill bars on the HUD fill as collected, pipe bonus rooms per category, IT guy
NPC. Finalise XP/level system and visual level-up changes of the hero.
Skills: <paste with proficiency>
```

## DAY 8 — Worlds 5 & 6

```
Day 8. Build World 5 "Trophy Hall" (? blocks release certificates, trophy
cabinet inspection) and World 6 "Rooftop" (sunset, contact links, resume
download, "Hire Me" flagpole finish, rolling credits incl. tools used and
thanks). Data: <paste awards + contact>. Tailor the final scene for: <role at
company>.
```

## DAY 9 — Audio + polish

```
Day 9. Add SFX (jump, coin, stomp, coffee, pipe, level-up, dialogue blips)
and chiptune loops per world (generated or CC0; list sources), with mute
default off but a ♪ toggle. Add particles, screen shake, squash & stretch,
scene transitions, CRT toggle, reduced-motion option, loading bar.
```

## DAY 10 — QA + deploy

```
Day 10. QA pass: desktop browsers, mobile touch controls, 60fps, <5MB, no
console errors, keyboard-only play, pause/mute everywhere. Fix bugs. Add
GitHub Pages deployment (Actions workflow), README with run/build/deploy and
how to edit resume.json, and a share image + QR code for my CV.
```

---

## IMAGE PROMPTS (for Canva/Midjourney/DALL·E/Gemini)

### Hero concept (attach photos)
```
Pixel art character sprite of the person in the attached photos, full body,
front view, 16x32 pixel grid look, 8-bit NES/SNES style, limited 16-colour
palette, 1px dark outline, chunky pixels, no anti-aliasing, flat colours,
smart-casual office outfit with lanyard badge, preserve hairstyle, facial hair
and glasses from the photo, friendly smile, plain solid background, game
sprite.
```
### Sprite sheet
```
Sprite sheet of the same pixel character: idle, walk cycle 6 frames, run cycle
6 frames, jump, fall, crouch, sipping coffee, celebrating, waving, typing on a
laptop. Consistent proportions, 32x32 frames in a grid, transparent or solid
magenta background, strict pixel art, no blur.
```
### NPC set
```
Pixel art NPC character sheet, 16x32 sprites, 90s 8-bit game style, same palette
as hero: receptionist with headset, office boy carrying a tea/coffee tray,
developer in hoodie, designer with beret, HR in blazer, manager with clipboard,
CEO in suit with sunglasses, IT guy with glasses and cables, security guard
with cap. Idle + walk frames, plain background.
```
### Tileset
```
Pixel art tileset 16x16 tiles, 8-bit office theme: carpet floor, desk top,
cubicle partition, "?" briefcase block, brick-like filing-cabinet block,
green ventilation pipes (top/body), coffee machine, potted plant, whiteboard,
elevator doors, window with skyline, server rack, bookshelf, stairs, ceiling
lights. NES colour palette, seamless, 1px outline, no anti-aliasing.
```
### Backgrounds (one per world)
```
Parallax pixel-art background layers, 256x224, 8-bit style: [World 1 bright
office lobby with city view | World 2 library and classroom corridor |
World 3 open-plan office floors at day | World 4 neon arcade/server lab |
World 5 award hall with curtains and spotlights | World 6 rooftop at sunset with
skyline]. Three layers (far, mid, near), limited palette, no anti-aliasing.
```
### Items/enemies/UI
```
Pixel art icons 16x16: spinning gold coin (4 frames), steaming coffee cup,
degree scroll, trophy, star, key, heart; enemies: bug, angry clock, meeting
invite envelope, spam email, jammed printer; UI: dialogue box border, button
frames, heart/coin/XP bar, "PRESS START" title logo in chunky pixel lettering.
```

---

## FIGMA PROMPTS (for Figma's AI / plugin / Figma Make)

```
Design 6 screens at 256x224 (shown at 4x), pixel-art UI, NES palette, font
Press Start 2P: (1) Title "OFFICE QUEST – PRESS START"; (2) Login terminal with
email field, blinking cursor, "ACCESS GRANTED"; (3) World map with 6 nodes and
◀ ▶ navigation, locked/unlocked states, "Recruiter Mode" toggle; (4) In-game HUD
(coins, XP bar, level title, coffee meter, world name); (5) Dialogue box with
NPC portrait; (6) Credits/Contact screen with link buttons. Create reusable
components and a colour-style library.
```
