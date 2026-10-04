/**
 * ASSETS MANIFEST - the single place that decides where every graphic comes from.
 *
 * Each entry either points at a real file (`url`, relative to /public) or leaves
 * `url: null`, in which case Boot generates a placeholder with the named generator
 * in placeholders.js. To swap art: drop a PNG into public/ and set its `url` - no
 * other code changes.
 *
 * Contracts (so replacement art drops in):
 *   hero_t0..hero_t5  16x32 frames:  0 idle, 1 walk A, 2 walk B, 3 jump, 4 skid   (one sheet per career tier)
 *   tiles             160x16 strip, 16x16 tiles, ids documented in tools/gen-maps.mjs
 *   coin              4 frames 16x16 (spin)      coffee 16x16      flag 2 frames 16x32 (off, on)
 *   bg_far/mid/near   256x224 horizontally-tileable parallax layers
 */
export const SPRITESHEETS = {
  coin:   { url: null, frameWidth: 16, frameHeight: 16, generator: 'coin' },
  flag:   { url: null, frameWidth: 16, frameHeight: 32, generator: 'flag' },
};
export const IMAGES = {
  tiles:   { url: null, generator: 'tiles' },
  coffee:  { url: null, generator: 'coffee' },
  px:      { url: null, generator: 'px' },
  bg_far:  { url: null, generator: 'bgFar' },
  bg_mid:  { url: null, generator: 'bgMid' },
  bg_near: { url: null, generator: 'bgNear' },
};
/** Hero sheets: one per career tier. `{tier}` in url is replaced by 0..5. */
export const HERO = { url: null, tiers: 6, frameWidth: 16, frameHeight: 32 };
/** Tiled JSON maps (served from /public/maps). */
export const MAPS = {
  'test-level': 'maps/test-level.json',
  'bonus-room': 'maps/bonus-room.json',
};
