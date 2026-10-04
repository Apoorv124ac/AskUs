// Single source of truth for the hero sprite sheet layout.
// Used by tools/make-hero.mjs (draws the PNG) and the game (animations).
// Replace public/assets/hero.png with hand-drawn art any time: keep 24x32
// frames, 8 columns, and this frame ORDER, and nothing else needs to change.
export const FW = 24;
export const FH = 32;
export const COLS = 8;

export const HERO_FRAMES = [
  'idle', 'blink',
  'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5',
  'run0', 'run1', 'run2', 'run3', 'run4', 'run5',
  'jump', 'fall', 'longjump', 'land', 'crouch',
  'sip0', 'sip1',
  'celebrate0', 'celebrate1',
  'hurt',
  'wave0', 'wave1',
  'type0', 'type1',
];

export const frameIndex = (name) => HERO_FRAMES.indexOf(name);

const seq = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

// name -> { frames, fps, repeat }   (repeat -1 = loop)
export const HERO_ANIMS = {
  idle: { frames: ['idle', 'idle', 'idle', 'idle', 'idle', 'idle', 'idle', 'blink', 'idle'], fps: 4, repeat: -1 },
  walk: { frames: seq('walk', 6), fps: 10, repeat: -1 },
  run: { frames: seq('run', 6), fps: 16, repeat: -1 },
  jump: { frames: ['jump'], fps: 1, repeat: 0 },
  fall: { frames: ['fall'], fps: 1, repeat: 0 },
  longjump: { frames: ['longjump'], fps: 1, repeat: 0 },
  land: { frames: ['land'], fps: 1, repeat: 0 },
  crouch: { frames: ['crouch'], fps: 1, repeat: 0 },
  sip: { frames: ['sip0', 'sip1', 'sip1', 'sip0'], fps: 6, repeat: 0 },
  celebrate: { frames: ['celebrate0', 'celebrate1'], fps: 6, repeat: -1 },
  hurt: { frames: ['hurt'], fps: 1, repeat: 0 },
  wave: { frames: ['wave0', 'wave1', 'wave0', 'wave1'], fps: 6, repeat: 0 },
  type: { frames: ['type0', 'type1'], fps: 8, repeat: -1 },
};
