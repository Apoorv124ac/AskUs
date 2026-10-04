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
 *   tiles             384x16 strip (24 tiles of 16x16), ids documented in tools/gen-maps.mjs
 *   enemy_*           32x16 sheets, 2 frames of 16x16     boss_*  64x32, 2 frames of 32x32
 *   coin              4 frames 16x16 (spin)      coffee 16x16      flag 2 frames 16x32 (off, on)
 *   bg_far/mid/near   256x224 horizontally-tileable parallax layers
 */
export const SPRITESHEETS = {
  enemy_bug:     { url: null, frameWidth: 16, frameHeight: 16, generator: 'enemyBug' },
  enemy_clock:   { url: null, frameWidth: 16, frameHeight: 16, generator: 'enemyClock' },
  enemy_invite:  { url: null, frameWidth: 16, frameHeight: 16, generator: 'enemyInvite' },
  enemy_spam:    { url: null, frameWidth: 16, frameHeight: 16, generator: 'enemySpam' },
  enemy_printer: { url: null, frameWidth: 16, frameHeight: 16, generator: 'enemyPrinter' },
  boss_bug:      { url: null, frameWidth: 32, frameHeight: 32, generator: 'boss', args: { from: 'enemy_bug' } },
  boss_clock:    { url: null, frameWidth: 32, frameHeight: 32, generator: 'boss', args: { from: 'enemy_clock' } },
  boss_invite:   { url: null, frameWidth: 32, frameHeight: 32, generator: 'boss', args: { from: 'enemy_invite' } },
  lever:         { url: null, frameWidth: 16, frameHeight: 16, generator: 'lever' },
  trophy:        { url: null, frameWidth: 16, frameHeight: 16, generator: 'trophy' },
  coin:   { url: null, frameWidth: 16, frameHeight: 16, generator: 'coin' },
  flag:   { url: null, frameWidth: 16, frameHeight: 32, generator: 'flag' },
};
export const IMAGES = {
  book:     { url: null, generator: 'book' },
  cert:     { url: null, generator: 'cert' },
  paper:    { url: null, generator: 'paper' },
  mplat:    { url: null, generator: 'mplat' },
  terminal: { url: null, generator: 'terminal' },
  // themed parallax sets: bg_<theme>_far / _mid / _near
  ...Object.fromEntries(['campus', 'office', 'server', 'gallery', 'sunset'].flatMap((theme) =>
    ['far', 'mid', 'near'].map((layer) => [`bg_${theme}_${layer}`, { url: null, generator: 'bg', args: { theme, layer } }]))),
  tiles:   { url: null, generator: 'tiles' },
  coffee:  { url: null, generator: 'coffee' },
  px:      { url: null, generator: 'px' },
  bg_far:  { url: null, generator: 'bgFar' },
  bg_mid:  { url: null, generator: 'bgMid' },
  bg_near: { url: null, generator: 'bgNear' },
  lobby_bg:       { url: null, generator: 'lobbyBg' },
  reception_desk: { url: null, generator: 'receptionDesk' },
  npc_receptionist: { url: null, generator: 'npcReceptionist' },   // 16x32
  desk_bg:        { url: null, generator: 'deskBg' },
  map_bg:         { url: null, generator: 'mapBg' },
};
/** Hero sheets: one per career tier. `{tier}` in url is replaced by 0..5. */
export const HERO = { url: null, tiers: 6, frameWidth: 16, frameHeight: 32 };
/** Tiled JSON maps (served from /public/maps). */
export const MAPS = {
  ...Object.fromEntries(['world1', 'world2', 'world3', 'world4', 'world5', 'world6', 'bonus-skills-a', 'bonus-skills-b'].map((k) => [k, `maps/${k}.json`])),
  'test-level': 'maps/test-level.json',
  'bonus-room': 'maps/bonus-room.json',
};
