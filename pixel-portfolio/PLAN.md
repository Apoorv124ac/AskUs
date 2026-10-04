# Pixel Portfolio — "Office Quest" (working title)

A playable, Super-Mario-style 2D platformer that is also your interview portfolio.
You play a pixel version of yourself, walking through an office. Each world is a
portfolio section. Coins = skills, coffee = power-ups, NPCs = colleagues who tell
your story.

---

## 1. Core decisions (my recommended defaults — change any you like)

| Topic | Recommendation | Why |
|---|---|---|
| Engine | **Phaser 3** + **Vite** (JavaScript or TypeScript) | Best browser 2D engine: physics, tilemaps, animation, audio, mobile. Runs from a plain URL — perfect for sharing with recruiters |
| Level editor | **Tiled** (free) → JSON tilemaps | Lets you / Claude design levels visually |
| Pixel art | **Aseprite** (paid, ~$20) or **Piskel / LibreSprite** (free) | Sprite sheets + animation |
| Art generation | AI image tool (Canva `generate-image`, Midjourney, DALL·E, Gemini) → cleaned in Aseprite | Photo → pixel character |
| Screens/UI mock-ups | **Figma** (Figma plugins/skills) + Canva | Login, menu, HUD, level-select layouts |
| Sound | **jsfxr / ChipTone** (SFX), **BeepBox / Bosca Ceoil** (chiptune), or Pixabay free CC0 | 8-bit audio, no licensing headaches |
| Fonts | **Press Start 2P** (Google Fonts) | Authentic NES look |
| Hosting | **GitHub Pages** / Netlify / Vercel (free) | One link on your CV |
| Email capture | Client-side + **Formspree / Google Apps Script → Google Sheet** | No backend needed |
| Resolution | **256×224 internal (NES-like), integer-scaled, `pixelArt:true`** | Crisp, authentic, scales on any screen |
| Palette | NES/SNES-inspired 16–24 colours (see §5) | Cohesive 90s feel |

> ⚠️ Originality: take the *feel* of Mario (pipes, coins, power-ups, world map)
> but use **your own** characters, tiles and music. Don't copy Nintendo sprites,
> music or names — it's a legal risk and weaker for a portfolio.

---

## 2. Game design

### 2.1 Controls (as you specified)

| Action | Keys |
|---|---|
| Walk left / right | ← / → |
| Run (fast) | **Shift + ← / →** |
| Jump | ↑ |
| Long jump | **Shift + ↑** (higher/farther arc) |
| Enter pipe | ↓ (standing on a pipe top) |
| Interact / read NPC | Enter or Space (also auto on touch) |
| Pause / Level menu | Esc or P |
| Mute | M |
| Mobile | On-screen D-pad + A/B buttons (auto-shown on touch devices) |

Feel details (this is what makes it "enjoyable"): coyote time (~100 ms),
jump buffering, variable jump height, acceleration/friction, squash & stretch,
dust puffs, screen shake on stomp/power-up, camera look-ahead.

### 2.2 Character states / animations (sprite sheet)

`idle`, `idle-blink`, `walk` (6f), `run` (6f), `jump-up`, `fall`, `long-jump`,
`land`, `crouch/enter-pipe`, `sip-coffee` (power-up), `powered-idle`,
`powered-run`, `celebrate` (coin/achievement), `hurt`, `wave` (hello),
`laptop-typing` (login scene).
Powered state = glow/aura + coffee-cup accessory + faster run speed.

### 2.3 Flow

```
 Boot/Loading → "Press Start" splash (CRT/pixel title)
   → Office Entrance cutscene (you walk in, badge-in animation)
   → LOGIN screen at your desk (computer terminal):
        enter email → Enter → "ACCESS GRANTED, <name>" 
   → World Map / Level Menu  (jump to previous/next, shows progress)
   → Worlds 1…6
   → Credits → back to menu
```

Email: validate format, store in `localStorage`, send to your Sheet/Formspree
(with a clear line: *"Your email is only used so I know who played. No spam."*).
Greet them by name (derived from email) throughout — NPCs say "Nice to see you,
Sarah!". That is the "wow" moment for an interviewer.

### 2.4 Worlds (= portfolio sections)

| # | World | Setting | Goal / content | Collectibles |
|---|---|---|---|---|
| 1 | **Intro — "Reception"** | Office lobby, reception | Meet you: name, role, tagline, location, one-line pitch. Receptionist NPC explains controls (tutorial) | **10 coins** (each reveals a fun fact/intro line) |
| 2 | **Education — "Training Campus / Library"** | Classroom corridor, library, lab | One *task* per degree (mini-challenge: e.g. stomp exam-bugs, solve a 3-block puzzle, collect books). Completion awards a **Degree Scroll** that displays college, year, grade | Degree scrolls + book coins |
| 3 | **Experience — "The Office Floors"** | Cubicles, meeting rooms, server room, CEO floor | One floor per company/role (reverse chronological → climb up elevators). Boss-fight style mini-challenge per job tied to a real achievement (e.g. "Reduced load time 40%" = defeat the Lag Monster) | Skill coins per role, coffee power-ups |
| 4 | **Skills — "The Skill Arcade / Tech Lab"** | Arcade/server lab | Coins are skills grouped by category (Languages, Tools, Soft skills). Skill bars level up as you collect. Pipe bonus rooms per category | Skill coins (colour-coded) |
| 5 | **Awards & Certifications — "Trophy Hall"** | Award-ceremony hall | Hit "?" blocks → certificates pop out; trophy cabinet to inspect | Trophies, stars |
| 6 | **Contact & Credits — "Rooftop / Exit Door"** | Rooftop at sunset | Resume download, LinkedIn, GitHub, email, phone; "Hire Me!" flag-pole finish; rolling credits (tools, assets, thanks, "Built with Claude") | Final coin tally |

Hidden **bonus pipe rooms** in each world: personal stuff (hobbies, side
projects, a testimonial). Great for personality.

### 2.5 Progression & scoring ("Coffee & Coins")

- **Coins → Skill XP.** Every coin adds XP to the "Skills" HUD. Level ups happen
  at thresholds; each level-up changes the character slightly (e.g. new badge,
  lanyard colour, tie, laptop bag) — visual proof of growth.
- **Coffee ☕ → Power-up.** 15 s of speed/double-jump/stomp-power, glow aura,
  "CAFFEINATED!" banner; also unlocks hidden blocks.
- **Level-ups per world:** Lv1 Intern → Lv2 Junior → Lv3 Associate → Lv4 Senior →
  Lv5 Lead → Lv6 "Hired!" (title shown on HUD — mirrors a real career ladder).
- **HUD:** coins, XP bar, level title, coffee meter, current world, email name.
- **Save:** localStorage (progress, collected items, unlocked worlds).
- **Menu:** world-map screen with 6 nodes; ◀ ▶ to jump to previous/next world,
  locked/unlocked states. Option "Recruiter Mode" = all worlds unlocked + a
  "Skip to Contact" shortcut (busy interviewers will thank you).

### 2.6 NPCs (all pixel, all with dialogue boxes)

- **Receptionist "Rita"** — tutorial, controls.
- **Office boy / chai-coffee guy** — hands out coffee power-ups, comic relief.
- **Colleagues** (dev, designer, HR, QA) — give testimonials/project stories.
- **Manager** — gives "tasks" in Experience world.
- **Boss / CEO** — final gate in World 3 & cameo in Contact; deadpan jokes.
- **IT guy** — Skills world guide.
- **Security guard** — guards pipe/secret rooms.
- **Enemies (friendly-funny):** Bug, Deadline Clock, Meeting Invite, Spam Email,
  Printer Jam, Monday Blob. Stompable (jump on them), no gore, no real "death":
  getting hit = lose a few coins and respawn at checkpoint (interview-friendly,
  nobody rage-quits).

> Rule: **Never block information behind difficulty.** A recruiter must be able
> to reach every fact in <5 minutes. Keep the game fun, forgiving and short
> (target 10–15 min full playthrough).

---

## 3. Visual style guide

- **Look:** 8-bit/16-bit, NES/SNES era, chunky pixels, 16×16 tiles, 16×32
  character (hero), 1-px dark outline, limited palette, subtle CRT scanline
  toggle.
- **Palette (NES-inspired):**
  `#0F0F1B` ink · `#FCFCFC` white · `#F83800` red-orange · `#FCA044` orange ·
  `#FCE0A8` skin-light · `#AC7C00` brown · `#00A800` green · `#58D854` lime ·
  `#00B8F8` sky · `#0058F8` blue · `#6844FC` purple · `#7C7C7C` grey ·
  `#BCBCBC` light grey · `#F8D878` coin-gold.
- **Backgrounds:** parallax (3 layers): skyline/windows → office wall → floor.
  Day→evening colour shift across worlds (world 6 = sunset).
- **Tiles:** carpet floor, desk blocks, "?" blocks (briefcase/envelope),
  breakable cubicle partitions, pipes (office ventilation/green pipes), coffee
  machines, plants, whiteboards, elevator doors, server racks, bookshelves.
- **UI:** pixel-bordered dialogue boxes, Press Start 2P font, blinking "PRESS
  ENTER", coin/XP counters.

---

## 4. Workflow (tools & who does what)

```
 1  REFERENCE   → your photos + resume + style refs
 2  DESIGN      → Figma/Canva screens (login, menu, HUD, dialog, world map)
 3  ART         → hero from photo → pixel sprite sheet → NPCs → tiles → bgs
 4  LEVELS      → Tiled maps (or Claude-coded tilemaps) per world
 5  CODE        → Claude builds in Phaser, day-by-day segments
 6  AUDIO       → jsfxr SFX + chiptune loops
 7  CONTENT     → resume JSON (single source of truth)
 8  TEST        → desktop browsers + mobile + keyboard-only + 60 fps check
 9  DEPLOY      → GitHub Pages/Netlify + short link + QR on resume
10  POLISH      → Recruiter mode, analytics (optional), share card
```

### Use of Figma / Canva / AI
- **Figma:** wireframe & style-tile the 6 screens + HUD at 256×224 (and
  scaled 4×). Export PNG as assets or visual spec for Claude. A Figma
  design-system file holds the palette + pixel UI kit.
- **Canva (connected in this environment):** `generate-image` for hero concept
  art / NPC concepts / backgrounds; `remove-background` for sprites;
  `generate-design` for the title card & social share image.
- **Photo → pixel hero (recommended 3-step):**
  1. Send 3–4 photos (front, side, smiling, full-body; plain background, good
     light) + clothing/signature items (glasses, beard, hairstyle, favourite
     shirt, lanyard).
  2. Generate a *concept* with the image prompt in §6.1 (large "pixel-art
     portrait" first), pick the one that looks like you.
  3. Redraw/clean on a **16×32 grid** in Aseprite/Piskel (or have Claude
     generate the sprite as code/PNG grid you approve), then animate frames.
- **Sprite sheet convention:** one PNG per character, 32×32 frames, rows =
  animations, JSON atlas (Aseprite export) → drop straight into Phaser.

### Repo structure (what Claude will scaffold)
```
pixel-portfolio/
  index.html
  package.json  vite.config.js
  src/
    main.js  config.js
    scenes/ Boot Preload Title Login Menu World1…World6 Credits UI
    entities/ Player NPC Enemy Coin Coffee Pipe Block
    systems/ Input Save Dialogue XP Audio Camera
    data/ resume.json  dialogue.json  levels.json
  public/assets/
    sprites/ tiles/ backgrounds/ ui/ audio/ maps/
  docs/  PLAN.md  PROMPTS.md  ART_BRIEF.md
```
**All portfolio content lives in `data/resume.json`** — edit your content
without touching code.

---

## 5. Build roadmap — day by day

| Day | Segment | Output | Done when |
|---|---|---|---|
| 0 | Answer the questions (§8), supply photos + resume | Inputs ready | — |
| 1 | Scaffold + engine feel | Vite+Phaser project, placeholder-box hero, tilemap test room, **all controls** (walk/run/jump/long jump/pipe), camera, physics tuning | Controls feel like Mario |
| 2 | Hero art | Pixel sprite sheet + animations wired | Hero looks like you, all states animate |
| 3 | Front-of-house screens | Title, Entrance cutscene, **Login (email capture)**, Menu/world map w/ prev-next | Login → menu works, email saved |
| 4 | World 1 (Intro) | Level, 10 coins/facts, Rita NPC tutorial, coffee, HUD | Playable end-to-end |
| 5 | World 2 (Education) | Task-per-degree level, scrolls, NPCs | Each degree has a task |
| 6 | World 3 (Experience) | Multi-floor level, enemies, boss mini-game per job | All roles told |
| 7 | World 4 (Skills) | Skill coins, bars, pipe bonus rooms, XP/level system finalised | Level titles change appearance |
| 8 | Worlds 5 & 6 | Awards hall, Contact rooftop, credits, resume download | Full game loop |
| 9 | Audio + polish | SFX, chiptune, particles, transitions, CRT toggle | Feels "juicy" |
| 10 | QA + deploy | Mobile controls, perf, accessibility, GitHub Pages, QR code | Live link |

Each day = one prompt from `PROMPTS.md`. Review in browser → feedback → next.

---

## 6. Accessibility & interview-friendliness
- Skip/“Recruiter Mode” (all unlocked + jump to contact).
- Key remap hints, pause anywhere, no hard fail states.
- Colour-contrast-safe dialogue boxes; reduce-motion & mute toggles.
- Works offline-after-load; <5 MB total; loads <3 s.
- Provide a plain **"View classic resume"** link (HTML/PDF) at every menu —
  some recruiters won't play, and that's fine.
- Privacy line on login screen.

---

## 7. Software / accounts checklist

| Need | Required? | Notes |
|---|---|---|
| Node.js 18+ and npm | Required (Claude installs in-session if it runs the code) | Builds the game |
| Modern browser (Chrome/Edge/Firefox) | Required | Testing |
| GitHub account + this repo | Required | Hosting via Pages |
| Figma account (free) | Optional | Screens |
| Canva (connected) | Optional | AI concept art, removing backgrounds |
| Aseprite / Piskel / LibreSprite | Recommended | Sprite cleanup |
| Tiled | Optional | Visual level editing |
| jsfxr / BeepBox | Optional | SFX / music |
| Formspree or Google Sheet | Optional | Collect emails remotely |

---

## 8. Questions for you (answer what you can; I'll assume defaults otherwise)

**About you (content)**
1. Name as it should appear, current role/title, tagline, city?
2. Education: each degree (institution, degree, years, grade, anything fun)?
3. Experience: each role (company, title, dates, 2–3 achievements with numbers)?
4. Skills: list + rough proficiency; which are the top 8 for this job?
5. Awards / certifications (name, issuer, year)?
6. Contact: email, phone (public?), LinkedIn, GitHub, resume PDF?
7. The job you're interviewing for (role + company)? I can tailor jokes, NPC names
   and the final "Hire Me" scene to it (e.g. the boss NPC looks like their
   brand colours).

**About your look**
8. 3–5 photos (front/side/full-body) — are you OK with them being used for AI
   generation tools? Glasses, beard, hair, usual outfit, signature items?
9. Pronouns/outfit for the pixel hero? Formal or smart-casual?
10. Real colleagues as NPCs — only if they've agreed; otherwise generic
    characters (recommended).

**About the game**
11. Difficulty: relaxed (recommended) vs. real challenge?
12. Target: desktop only or phones/tablets too?
13. Tone: humorous/witty, professional, or mix?
14. Music: chiptune OK, or silent-by-default with a ♪ toggle (recommended)?
15. Email collection: only local, or send to you (Sheet/Formspree)? Add privacy
    note (recommended)?
16. Language: English only?
17. Is it OK to use "?" blocks, pipes, coins, coffee as mechanics but with
    original art (recommended for legal safety)?

**Permissions**
18. May I create/modify files only under `pixel-portfolio/` in this repo
    (leaving your existing site untouched)? Or should the game replace the
    root site / live at a sub-path?
19. May I commit and push to branch `claude/jolly-wozniak-yh9lac` each day?
20. May I install npm packages (Phaser, Vite) in the session?

---

## 9. Success criteria
- A stranger understands who you are in the first 60 seconds.
- Every resume fact reachable in under 5 minutes.
- Controls feel instantly familiar.
- At least 3 delightful "wow" moments (personalised greeting, coffee
  power-up, boss-of-your-last-job cameo).
- Loads fast, runs 60 fps, shareable via one URL.
