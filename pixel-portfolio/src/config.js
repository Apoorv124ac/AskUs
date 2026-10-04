/**
 * OFFICE QUEST - central configuration.
 *
 * Every "feel" number lives here. With `npm run dev`, saving this file hot-reloads
 * the page, so you can tune jump height / speed / camera by editing and watching.
 * Units: pixels, seconds, pixels/second, pixels/second^2 (internal 256x224 pixels).
 * This file must stay dependency-free (no Phaser import) so unit tests can load it.
 */

export const GAME = {
  width: 256,
  height: 224,
  tile: 16,
  background: '#0F0F1B',
  title: 'OFFICE QUEST',
};

/** The NES/SNES-style palette from the brief (+ a few shade helpers). */
export const PALETTE = {
  black: '#0F0F1B', white: '#FCFCFC', red: '#F83800', orange: '#FCA044',
  cream: '#FCE0A8', brown: '#AC7C00', green: '#00A800', lime: '#58D854',
  cyan: '#00B8F8', blue: '#0058F8', purple: '#6844FC', grey: '#7C7C7C',
  lgrey: '#BCBCBC', yellow: '#F8D878',
  // helpers
  navy: '#002058', darkBrown: '#503000', darkGreen: '#005800',
};

/** Movement feel. Tune freely. */
export const PHYSICS = {
  // --- gravity ---
  gravity: 900,            // base gravity while rising with jump held
  fallGravityMult: 1.35,   // heavier on the way down = snappier arcs
  apexGravityMult: 0.6,    // lighter near the apex = a little "hang time"
  apexThreshold: 40,       // |vy| below this counts as "near apex"
  maxFallSpeed: 360,

  // --- horizontal ---
  walkSpeed: 80,
  runSpeed: 130,           // hold Shift
  walkAccel: 520,
  runAccel: 380,
  groundFriction: 640,     // deceleration when no direction is held
  turnAccel: 950,          // deceleration when pushing the opposite way (skid)
  airAccel: 400,
  airFriction: 150,
  airTurnAccel: 560,
  skidSpeedThreshold: 60,  // above this, reversing plays the skid pose + dust

  // --- jumping ---
  jumpVelocity: 310,       // normal jump  (~3.3 tiles high)
  jumpCutMultiplier: 0.45, // vy multiplier when the jump key is released early (variable height)
  longJumpVelocity: 360,   // Shift+Up: higher...
  longJumpMinSpeed: 135,   // ...and launches at least this fast horizontally
  longJumpAirSpeed: 150,   // ...with a higher horizontal cap while airborne
  airJumpVelocity: 290,    // coffee double-jump

  // --- forgiveness ---
  coyoteTime: 0.10,        // seconds you can still jump after leaving a ledge
  jumpBuffer: 0.12,        // seconds a too-early jump press is remembered

  // --- body ---
  hitbox: { width: 10, height: 28 },
};

export const COFFEE = {
  durationMs: 12000,
  speedMult: 1.25,
  doubleJump: true,
  glowColor: 0xf8d878,
};

export const CAMERA = {
  lookAhead: 30,           // px the camera leads in the facing direction
  lookAheadMin: 0.35,      // fraction of lookAhead used when standing still
  lookSmoothing: 3.0,      // higher = look-ahead reacts faster
  followLerpX: 0.12,
  followLerpY: 0.12,
  deadzone: { width: 6, height: 36 },
  fadeMs: 220,
};

export const FX = {
  shakeOnHardLand: true,
  hardLandSpeed: 300,      // landing speed that triggers a tiny shake
  shakeDurationMs: 90,
  shakeIntensity: 0.004,
  squash: true,
  dust: true,
  coinSparkle: true,
};

/** Coins are wallet AND skill XP: coins can be lost on hits, XP never goes down. */
export const PROGRESSION = {
  coinValue: 1,
  xpPerCoin: 1,
  // Career ladder. Test thresholds for Day 1; final values depend on total coins in the game.
  // Thresholds match the coins available per world (W1 10, W2 12, W3 15, W4 28, W5 16, W6 8 = 89),
  // so each cleared world roughly earns the next career title. The final flag promotes you to HIRED!.
  levels: [
    { title: 'INTERN',    xp: 0 },
    { title: 'JUNIOR',    xp: 10 },
    { title: 'ASSOCIATE', xp: 22 },
    { title: 'SENIOR',    xp: 37 },
    { title: 'LEAD',      xp: 65 },
    { title: 'HIRED!',    xp: 85 },
  ],
};

/** Enemy tuning. Speeds are multiplied by (1 + speedPerDifficulty * (worldDifficulty - 1)). */
export const ENEMIES = {
  speedPerDifficulty: 0.12,
  stompBounce: 230,        // bounce velocity after stomping
  stompBounceHeld: 320,    // ... with the jump key held
  bug:     { speed: 26 },
  clock:   { speed: 52 },
  invite:  { speed: 1.1, rangeX: 44, amplitudeY: 14 },   // speed = radians/sec of the swoop
  spam:    { hopEvery: 1.3, hopVy: 200, hopVx: 46 },
  printer: { fireEvery: 2.4, range: 150, paperSpeed: 72 },
  boss:    { hp: 3, speed: 38, hopEvery: 1.8, hopVy: 230, invulnMs: 1100 },
};

export const RESPAWN = {
  hitCoinLoss: 3,          // coins lost when an enemy hits you (enemies arrive in a later segment)
  pitCoinLoss: 0,          // falling in a pit is forgiving by default
  respawnDelayMs: 350,
  invulnMs: 1200,
};

export const AUDIO = {
  master: 0.5,
  sfx: 0.8,
  music: 0.35,
  musicEnabled: true,
};

export const UI = {
  typeCharsPerSec: 45,     // dialogue typewriter speed (0 = instant)
};

export const STORAGE = {
  key: 'office-quest-save-v1',
};

/** Optional backend for the login e-mail (segment 3). null = store locally only. */
export const LOGIN = {
  endpoint: null,
};

/** Debug helpers; also switchable with ?debug in the URL. */
export const DEBUG = {
  overlay: false,
};
