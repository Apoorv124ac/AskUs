// Everything you might want to tune lives here.
export const GAME_W = 256;
export const GAME_H = 224;
export const TILE = 16;

// The game is DRAWN at ZOOM x the logical 256x224 size. Pixel art stays chunky (nearest scaling)
// but text and edges are rendered at 3x resolution, so everything looks much cleaner.
export const ZOOM = 3;

// Movement feel. Distances assume TILE = 16px.
export const PHYSICS = {
  gravity: 900,
  fallExtraGravity: 500, // extra gravity while falling = snappier landings
  maxFallSpeed: 380,

  walkSpeed: 90,
  runSpeed: 150, // Shift + Left/Right
  longJumpSpeed: 185, // horizontal speed locked in during a long jump
  accel: 700,
  friction: 900, // ground deceleration when no key is held
  airDrag: 120,
  airControl: 0.6, // fraction of accel available in mid-air
  skidMultiplier: 1.8, // faster accel when reversing direction

  jumpVelocity: -335, // ~3.9 tiles high
  longJumpVelocity: -365, // Shift + Up: higher AND farther
  baseAirJumps: 1, // everyone gets a double jump (press Up again in mid-air)
  airJumpFactor: 0.92, // the extra jump is slightly weaker
  jumpCutFactor: 0.45, // release Up early = shorter hop
  coyoteMs: 100, // grace period after walking off a ledge
  jumpBufferMs: 110, // Up pressed slightly before landing still counts

  coffeeMs: 15000,
  coffeeSpeedBoost: 1.3,
  coffeeAirJumps: 2, // coffee = triple jump
  coffeeJumpBoost: 1.08,

  pitCoinPenalty: 3, // coins lost when you fall in a pit
};

// Coins are skill XP; level titles mirror a career ladder.
export const PROGRESSION = {
  thresholds: [0, 10, 25, 45, 70, 100],
  titles: ['INTERN', 'JUNIOR', 'ASSOCIATE', 'SENIOR', 'LEAD', 'HIRED!'],
};

export const COLORS = {
  ink: '#0F0F1B',
  white: '#FCFCFC',
  gold: '#F8D878',
};

// --- Day 3 settings ---------------------------------------------------------
export const OWNER_NAME = 'APOORV';

// Paste your Google Apps Script web-app URL here to receive login emails in a
// Google Sheet (see docs/EMAIL_SETUP.md). Leave '' to keep emails on the
// visitor's own device only.
export const EMAIL_ENDPOINT = 'https://script.google.com/macros/s/AKfycbynySs274HusacGnNI9FasB5efNmxb4ph7EfCtw8tiRioG_z5a55ubMWROMem-FRT1D/exec';

// Link to your normal resume (PDF or web page). '' = the button shows "SOON".
export const CLASSIC_RESUME_URL = '';
