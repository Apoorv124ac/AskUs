/**
 * Procedural placeholder art, drawn with canvas rects in the project palette.
 * Everything here is replaceable through assets/manifest.js (set a `url`).
 * A shared outline pass gives every sprite the 1px dark outline from the style guide.
 */
import { PALETTE as C } from '../config.js';
import { drawHeroFrame, HERO_POSES } from './heroArt.js';

const OUTLINE = [15, 15, 27];

function canvasTex(textures, key, w, h, draw) {
  const t = textures.createCanvas(key, w, h);
  draw(t.context);
  t.refresh();
  return t;
}
const rect = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

/** Adds a 1px dark outline around opaque pixels inside a frame region. */
function outline(ctx, x, y, w, h) {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data, out = new Uint8ClampedArray(d);
  const a = (px, py) => (px < 0 || py < 0 || px >= w || py >= h ? 0 : d[(py * w + px) * 4 + 3]);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    if (a(px, py) === 0 && (a(px - 1, py) || a(px + 1, py) || a(px, py - 1) || a(px, py + 1))) {
      const i = (py * w + px) * 4;
      out[i] = OUTLINE[0]; out[i + 1] = OUTLINE[1]; out[i + 2] = OUTLINE[2]; out[i + 3] = 255;
    }
  }
  img.data.set(out);
  ctx.putImageData(img, x, y);
}

/* ------------------------------------------------------------------ hero */
export function generateHero(scene, key, tier) {
  const t = canvasTex(scene.textures, key, 16 * HERO_POSES.length, 32, (ctx) => {
    HERO_POSES.forEach((p, i) => { drawHeroFrame(ctx, i * 16, p, tier); outline(ctx, i * 16, 0, 16, 32); });
  });
  HERO_POSES.forEach((_, i) => t.add(i, 0, i * 16, 0, 16, 32));
}

/* ----------------------------------------------------------------- tiles */
const GEN = {
  tiles(scene, key) {
    const t = canvasTex(scene.textures, key, 384, 16, (ctx) => {
      const at = (i, fn) => { ctx.save(); ctx.translate(i * 16, 0); fn(); ctx.restore(); };
      const R = (c, x, y, w, h) => rect(ctx, c, x, y, w, h);
      // 0 floor top (carpet)
      at(0, () => { R(C.grey, 0, 0, 16, 16); R(C.lgrey, 0, 0, 16, 4); R(C.white, 0, 0, 16, 1); R(C.black, 0, 4, 16, 1); R(C.black, 15, 5, 1, 11); for (let i = 2; i < 16; i += 5) R('#6c6c6c', i, 8 + (i % 3) * 2, 2, 1); });
      // 1 floor fill
      at(1, () => { R(C.grey, 0, 0, 16, 16); R('#6c6c6c', 0, 0, 16, 1); R('#6c6c6c', 0, 8, 16, 1); R('#6c6c6c', 8, 0, 1, 8); R('#6c6c6c', 0, 8, 1, 8); R(C.black, 15, 0, 1, 16); });
      // 2 brick
      at(2, () => { R(C.red, 0, 0, 16, 16); R(C.black, 0, 0, 16, 1); R(C.black, 0, 7, 16, 1); R(C.black, 0, 15, 16, 1); R(C.black, 7, 1, 1, 6); R(C.black, 3, 8, 1, 7); R(C.black, 11, 8, 1, 7); R(C.orange, 1, 1, 5, 1); R(C.orange, 1, 8, 1, 1); });
      // 3 desk platform
      at(3, () => { R(C.yellow, 0, 0, 16, 2); R(C.brown, 0, 2, 16, 6); R(C.darkBrown, 0, 8, 16, 2); R(C.black, 0, 10, 16, 1); R(C.black, 0, 0, 16, 1); R(C.cream, 2, 4, 4, 1); R(C.black, 15, 1, 1, 9); });
      // 4/5 pipe top L/R
      at(4, () => { R(C.green, 0, 0, 16, 16); R(C.lime, 2, 1, 3, 14); R(C.darkGreen, 12, 1, 4, 14); R(C.black, 0, 0, 16, 1); R(C.black, 0, 15, 16, 1); R(C.black, 0, 0, 1, 16); });
      at(5, () => { R(C.green, 0, 0, 16, 16); R(C.lime, 1, 1, 2, 14); R(C.darkGreen, 11, 1, 5, 14); R(C.black, 0, 0, 16, 1); R(C.black, 0, 15, 16, 1); R(C.black, 15, 0, 1, 16); });
      // 6/7 pipe body L/R
      at(6, () => { R(C.green, 2, 0, 14, 16); R(C.lime, 4, 0, 3, 16); R(C.darkGreen, 13, 0, 3, 16); R(C.black, 2, 0, 1, 16); });
      at(7, () => { R(C.green, 0, 0, 14, 16); R(C.lime, 2, 0, 2, 16); R(C.darkGreen, 10, 0, 4, 16); R(C.black, 13, 0, 1, 16); });
      // 8 wall
      at(8, () => { R(C.navy, 0, 0, 16, 16); R(C.blue, 0, 0, 16, 1); R(C.blue, 0, 8, 16, 1); R('#00306c', 4, 1, 1, 7); R('#00306c', 12, 9, 1, 7); });
      // 9 ceiling
      at(9, () => { R(C.black, 0, 0, 16, 16); R(C.navy, 0, 12, 16, 4); R(C.blue, 0, 15, 16, 1); });
      // 10 question block, 11 used block
      at(10, () => { R(C.black, 0, 0, 16, 16); R(C.yellow, 1, 1, 14, 14); R(C.orange, 1, 12, 14, 3); R(C.white, 1, 1, 14, 1); R(C.brown, 2, 2, 1, 1); R(C.brown, 13, 2, 1, 1); R(C.brown, 2, 13, 1, 1); R(C.brown, 13, 13, 1, 1);
        R(C.black, 5, 3, 6, 2); R(C.black, 10, 5, 2, 3); R(C.black, 8, 8, 3, 2); R(C.black, 7, 10, 2, 2); R(C.black, 7, 13, 2, 1); });
      at(11, () => { R(C.black, 0, 0, 16, 16); R('#7C5C00', 1, 1, 14, 14); R(C.darkBrown, 1, 12, 14, 3); R(C.brown, 1, 1, 14, 1); R(C.black, 2, 2, 1, 1); R(C.black, 13, 2, 1, 1); });
      // 12/13 wood floor (campus), 14/15 metal floor (server), 16/17 marble floor (gallery), 18/19 roof (rooftop)
      at(12, () => { R(C.brown, 0, 0, 16, 16); R(C.yellow, 0, 0, 16, 2); R(C.black, 0, 4, 16, 1); R(C.darkBrown, 0, 5, 16, 2); R(C.darkBrown, 5, 9, 1, 7); R(C.darkBrown, 12, 12, 1, 4); R(C.black, 15, 5, 1, 11); });
      at(13, () => { R(C.brown, 0, 0, 16, 16); R(C.darkBrown, 0, 0, 16, 1); R(C.darkBrown, 0, 8, 16, 1); R(C.darkBrown, 4, 1, 1, 7); R(C.darkBrown, 11, 9, 1, 7); R(C.black, 15, 0, 1, 16); });
      at(14, () => { R('#2c2c44', 0, 0, 16, 16); R(C.cyan, 0, 0, 16, 2); R(C.white, 0, 0, 16, 1); R(C.black, 0, 4, 16, 1); R(C.grey, 2, 7, 12, 1); R(C.lime, 3, 10, 2, 2); R(C.cyan, 7, 10, 2, 2); R(C.red, 11, 10, 2, 2); R(C.black, 15, 5, 1, 11); });
      at(15, () => { R('#1c1c34', 0, 0, 16, 16); R('#2c2c44', 0, 0, 16, 1); R('#2c2c44', 0, 8, 16, 1); R('#2c2c44', 8, 0, 1, 8); R('#2c2c44', 0, 8, 1, 8); R(C.cyan, 3, 3, 1, 1); R(C.lime, 12, 11, 1, 1); R(C.black, 15, 0, 1, 16); });
      at(16, () => { R(C.lgrey, 0, 0, 16, 16); R(C.white, 0, 0, 16, 5); R(C.yellow, 0, 5, 16, 1); R(C.black, 0, 6, 16, 1); R(C.grey, 3, 9, 6, 1); R(C.grey, 9, 12, 5, 1); R(C.black, 15, 7, 1, 9); });
      at(17, () => { R(C.lgrey, 0, 0, 16, 16); R(C.white, 0, 0, 16, 1); R(C.grey, 2, 3, 7, 1); R(C.grey, 8, 4, 4, 1); R(C.grey, 5, 10, 8, 1); R(C.white, 1, 12, 5, 1); R(C.black, 15, 0, 1, 16); });
      at(18, () => { R('#6c6c6c', 0, 0, 16, 16); R(C.lgrey, 0, 0, 16, 3); R(C.white, 2, 1, 2, 1); R(C.grey, 7, 1, 2, 1); R(C.black, 0, 3, 16, 1); R(C.black, 15, 4, 1, 12); R(C.grey, 4, 8, 3, 1); });
      at(19, () => { R('#6c6c6c', 0, 0, 16, 16); R('#585858', 0, 0, 16, 1); R('#585858', 0, 8, 16, 1); R('#585858', 8, 0, 1, 8); R('#585858', 0, 8, 1, 8); R(C.black, 15, 0, 1, 16); });
      // 20 bookshelf platform, 21 server-rack platform, 22 marble ledge, 23 crate
      at(20, () => { R(C.black, 0, 0, 16, 12); R(C.darkBrown, 1, 1, 14, 10); R(C.brown, 0, 0, 16, 2); R(C.red, 2, 3, 2, 8); R(C.blue, 4, 4, 2, 7); R(C.green, 6, 3, 3, 8); R(C.yellow, 9, 5, 2, 6); R(C.purple, 11, 3, 2, 8); R(C.orange, 13, 4, 2, 7); R(C.black, 0, 11, 16, 1); R(C.yellow, 0, 0, 16, 1); });
      at(21, () => { R(C.black, 0, 0, 16, 12); R('#2c2c44', 1, 1, 14, 10); R(C.lgrey, 0, 0, 16, 2); R(C.lime, 3, 4, 2, 1); R(C.cyan, 7, 4, 2, 1); R(C.lime, 11, 4, 2, 1); R(C.red, 3, 7, 2, 1); R(C.lime, 7, 7, 2, 1); R(C.cyan, 11, 7, 2, 1); R(C.black, 0, 11, 16, 1); R(C.white, 0, 0, 16, 1); });
      at(22, () => { R(C.white, 0, 0, 16, 3); R(C.yellow, 0, 3, 16, 2); R(C.lgrey, 0, 5, 16, 3); R(C.black, 0, 8, 16, 1); R(C.black, 0, 0, 16, 1); R(C.grey, 3, 6, 4, 1); });
      at(23, () => { R(C.black, 0, 0, 16, 12); R(C.brown, 1, 1, 14, 10); R(C.darkBrown, 1, 1, 14, 1); R(C.darkBrown, 2, 2, 2, 8); R(C.darkBrown, 12, 2, 2, 8); R(C.yellow, 0, 0, 16, 1); R(C.black, 0, 11, 16, 1); for (let i = 0; i < 8; i++) R(C.darkBrown, 3 + i, 2 + i, 1, 1); });
    });
    for (let i = 0; i < 24; i++) t.add(i, 0, i * 16, 0, 16, 16);
  },

  coin(scene, key) {
    const t = canvasTex(scene.textures, key, 64, 16, (ctx) => {
      [12, 8, 4, 8].forEach((w, i) => {
        const x = i * 16 + 8 - w / 2;
        rect(ctx, C.yellow, x, 4, w, 8);
        if (w > 2) { rect(ctx, C.yellow, x + 1, 3, w - 2, 1); rect(ctx, C.yellow, x + 1, 12, w - 2, 1); }
        if (w > 4) { rect(ctx, C.white, x + 1, 4, 1, 4); rect(ctx, C.brown, x + w - 2, 5, 1, 7); }
        outline(ctx, i * 16, 0, 16, 16);
      });
    });
    [0, 1, 2, 3].forEach((i) => t.add(i, 0, i * 16, 0, 16, 16));
  },

  coffee(scene, key) {
    canvasTex(scene.textures, key, 16, 16, (ctx) => {
      rect(ctx, C.white, 3, 6, 8, 8); rect(ctx, C.darkBrown, 4, 6, 6, 2); rect(ctx, C.orange, 3, 10, 8, 2);
      rect(ctx, C.white, 11, 8, 3, 1); rect(ctx, C.white, 13, 8, 1, 3); rect(ctx, C.white, 11, 11, 3, 1); // handle
      rect(ctx, C.lgrey, 5, 2, 1, 3); rect(ctx, C.lgrey, 8, 1, 1, 4);                                  // steam
      outline(ctx, 0, 0, 16, 16);
    });
  },

  flag(scene, key) {
    const t = canvasTex(scene.textures, key, 32, 32, (ctx) => {
      [C.red, C.lime].forEach((col, i) => {
        const o = i * 16;
        rect(ctx, C.lgrey, o + 4, 4, 2, 27); rect(ctx, C.yellow, o + 3, 2, 4, 3);
        rect(ctx, col, o + 6, 5, 8, 6); rect(ctx, C.white, o + 7, 6, 3, 1);
        outline(ctx, o, 0, 16, 32);
      });
    });
    t.add(0, 0, 0, 0, 16, 32); t.add(1, 0, 16, 0, 16, 32);
  },

  px(scene, key) { canvasTex(scene.textures, key, 2, 2, (ctx) => rect(ctx, '#ffffff', 0, 0, 2, 2)); },


  /* ------------------------------------------------ cutscene / login / map backdrops */
  lobbyBg(scene, key) {
    canvasTex(scene.textures, key, 256, 224, (ctx) => {
      const R = (c, x, y, w, h) => rect(ctx, c, x, y, w, h);
      R('#BCBCBC', 0, 0, 256, 176);                                  // wall
      R('#7C7C7C', 0, 150, 256, 26); R('#FCFCFC', 0, 150, 256, 1);   // wainscot
      R(C.black, 0, 0, 256, 18); for (let x = 12; x < 256; x += 48) { R(C.white, x, 6, 24, 5); R(C.yellow, x + 2, 11, 20, 1); } // ceiling lights
      R(C.navy, 0, 18, 256, 2);
      // big window with morning sky + skyline
      R(C.black, 118, 38, 100, 66); R(C.cyan, 121, 41, 94, 60); R('#58D0FC', 121, 41, 94, 20);
      [[126, 30], [150, 44], [172, 36], [194, 50]].forEach(([x, h]) => { R(C.blue, x, 101 - h, 18, h); R('#0868F8', x, 101 - h, 18, 2); });
      R(C.black, 166, 38, 3, 66); R(C.black, 118, 70, 100, 3);
      // wall clock
      R(C.black, 74, 40, 24, 24); R(C.white, 76, 42, 20, 20); R(C.black, 85, 46, 2, 9); R(C.black, 85, 53, 7, 2);
      // welcome mat strip + plant
      R(C.darkBrown, 0, 150, 32, 1);
      R(C.darkGreen, 238, 126, 4, 26); R(C.green, 230, 112, 20, 16); R(C.lime, 234, 106, 8, 10); R(C.brown, 232, 148, 16, 10); R(C.black, 232, 158, 16, 1);
      // glass entrance door (left)
      R(C.black, 2, 88, 36, 88); R(C.cyan, 5, 91, 30, 82); R('#58D0FC', 5, 91, 30, 14); R(C.black, 19, 91, 2, 82); R(C.white, 9, 96, 2, 14);
      // floor tiles
      for (let y = 176; y < 224; y += 16) for (let x = 0; x < 256; x += 16) R(((x / 16 + y / 16) % 2) ? '#7C7C7C' : '#BCBCBC', x, y, 16, 16);
      R(C.black, 0, 176, 256, 1);
    });
  },
  receptionDesk(scene, key) {
    canvasTex(scene.textures, key, 80, 24, (ctx) => {
      const R = (c, x, y, w, h) => rect(ctx, c, x, y, w, h);
      R(C.black, 0, 0, 80, 24); R(C.yellow, 1, 1, 78, 3); R(C.brown, 1, 4, 78, 19); R(C.darkBrown, 1, 19, 78, 4);
      R(C.cream, 6, 8, 24, 1); R(C.cream, 50, 8, 24, 1);
      R(C.white, 32, 9, 16, 8); R(C.red, 36, 11, 8, 4);              // little company sign on the desk front
    });
  },
  npcReceptionist(scene, key) {
    canvasTex(scene.textures, key, 16, 32, (ctx) => {
      const R = (c, x, y, w, h) => rect(ctx, c, x, y, w, h);
      R(C.black, 3, 1, 10, 6); R(C.black, 2, 4, 3, 8); R(C.black, 11, 4, 3, 8);  // hair
      R('#F0B880', 5, 5, 6, 7); R(C.black, 6, 8, 1, 1); R(C.black, 9, 8, 1, 1); R(C.red, 7, 10, 2, 1);
      R(C.lgrey, 1, 7, 2, 1); R(C.lgrey, 13, 7, 2, 1); R(C.lgrey, 3, 3, 10, 1);   // headset
      R(C.blue, 3, 13, 10, 11); R(C.white, 6, 13, 4, 3); R('#F0B880', 1, 15, 2, 8); R('#F0B880', 13, 15, 2, 8);
      R(C.blue, 1, 14, 2, 6); R(C.blue, 13, 14, 2, 6);
      outline(ctx, 0, 0, 16, 32);
    });
  },
  deskBg(scene, key) {
    canvasTex(scene.textures, key, 256, 224, (ctx) => {
      const R = (c, x, y, w, h) => rect(ctx, c, x, y, w, h);
      R('#142c58', 0, 0, 256, 176); R(C.navy, 0, 0, 256, 6);
      // night window behind the monitor
      for (let i = 0; i < 12; i++) { const h = 14 + (i * 23) % 36; R('#0c1c40', i * 22, 130 - h, 18, h + 46); for (let w = 0; w < h; w += 8) R(C.yellow, i * 22 + 4, 134 - h + w, 3, 3); }
      R(C.black, 0, 176, 256, 1); R('#503000', 0, 177, 256, 47);
      // desk surface
      R(C.yellow, 0, 168, 216, 2); R(C.brown, 0, 170, 216, 54); R(C.darkBrown, 0, 214, 216, 10); R(C.black, 0, 168, 216, 1);
      R(C.black, 215, 168, 1, 56);
      // monitor
      R(C.black, 14, 8, 200, 124); R(C.lgrey, 16, 10, 196, 120); R(C.grey, 16, 124, 196, 6);
      R(C.black, 22, 16, 184, 100); R('#002058', 24, 18, 180, 96);
      R(C.black, 104, 132, 24, 22); R(C.grey, 106, 132, 20, 20); R(C.black, 88, 152, 56, 6); R(C.lgrey, 90, 152, 52, 4);
      R(C.red, 192, 125, 4, 3);                                      // power LED
      // keyboard, mug, plant
      R(C.black, 56, 176, 104, 14); R(C.lgrey, 58, 178, 100, 10); for (let k = 60; k < 156; k += 6) { R(C.white, k, 179, 4, 3); R(C.white, k + 2, 184, 4, 3); }
      R(C.black, 176, 172, 16, 18); R(C.white, 178, 174, 12, 14); R(C.darkBrown, 179, 175, 10, 3); R(C.white, 190, 177, 5, 2); R(C.white, 193, 177, 2, 6); R(C.white, 190, 181, 5, 2);
      R(C.black, 6, 150, 22, 18); R(C.red, 8, 152, 18, 14);
      R(C.darkGreen, 14, 130, 3, 20); R(C.green, 6, 120, 20, 14); R(C.lime, 10, 114, 10, 10);
    });
  },
  mapBg(scene, key) {
    canvasTex(scene.textures, key, 256, 224, (ctx) => {
      const R = (c, x, y, w, h) => rect(ctx, c, x, y, w, h);
      R('#58D0FC', 0, 0, 256, 224);
      ['#0058F8', '#0868F8', '#1078F8', '#20A0F8', '#00B8F8', '#58D0FC'].forEach((c, i) => R(c, 0, i * 20, 256, 20));
      [[20, 24, 40], [140, 38, 32], [200, 16, 36]].forEach(([x, y, w]) => { R(C.white, x, y, w, 6); R(C.white, x + 6, y - 4, w - 14, 4); });
      // far skyline
      for (let i = 0; i < 9; i++) { const h = 20 + (i * 31) % 38; R('#2c88f8', i * 30, 150 - h, 24, h + 40); R('#58a8fc', i * 30, 150 - h, 24, 2); }
      // rolling hills
      for (let x = 0; x < 256; x++) { const h = 40 + Math.round(10 * Math.sin(x / 22) + 6 * Math.sin(x / 9)); R(C.green, x, 224 - h, 1, h); R(C.lime, x, 224 - h, 1, 2); }
      R(C.darkGreen, 0, 214, 256, 10);
    });
  },


  /* ------------------------------------------------ enemies (16x16, 2 frames) */
  enemyBug(scene, key) {
    const t = canvasTex(scene.textures, key, 32, 16, (ctx) => {
      [0, 1].forEach((f) => {
        const o = f * 16, R = (c, x, y, w, h) => rect(ctx, c, o + x, y, w, h);
        R(C.green, 3, 5, 10, 6); R(C.lime, 4, 5, 6, 2); R(C.darkGreen, 3, 9, 10, 2);       // body
        R(C.green, 10, 3, 5, 5); R(C.white, 12, 4, 2, 2); R(C.black, 13, 5, 1, 1);          // head + eye
        R(C.red, 5, 7, 1, 1); R(C.red, 8, 7, 1, 1);                                          // spots
        R(C.black, 12, 1, 1, 2); R(C.black, 14, 1, 1, 2);                                    // antennae
        const l = f ? 1 : 0;                                                                // legs
        R(C.black, 4 + l, 11, 1, 2); R(C.black, 7 - l, 11, 1, 2); R(C.black, 10 + l, 11, 1, 2);
        outline(ctx, o, 0, 16, 16);
      });
    });
    t.add(0, 0, 0, 0, 16, 16); t.add(1, 0, 16, 0, 16, 16);
  },
  enemyClock(scene, key) {
    const t = canvasTex(scene.textures, key, 32, 16, (ctx) => {
      [0, 1].forEach((f) => {
        const o = f * 16, R = (c, x, y, w, h) => rect(ctx, c, o + x, y, w, h);
        R(C.yellow, 2, 1, 3, 3); R(C.yellow, 11, 1, 3, 3);                                   // bells
        R(C.red, 2, 3, 12, 10); R(C.red, 3, 2, 10, 12); R(C.white, 4, 4, 8, 8);              // case + face
        R(C.black, 8, 5, 1, 4); R(C.black, 8, 8, f ? 3 : 2, 1); R(C.black, 5, 7, 1, 1);      // hands + angry brow
        R(C.black, 4, 4, 3, 1); R(C.black, 10, 4, 3, 1);
        R(C.black, 4 + f, 14, 2, 1); R(C.black, 10 - f, 14, 2, 1);                           // feet
        outline(ctx, o, 0, 16, 16);
      });
    });
    t.add(0, 0, 0, 0, 16, 16); t.add(1, 0, 16, 0, 16, 16);
  },
  enemyInvite(scene, key) {
    const t = canvasTex(scene.textures, key, 32, 16, (ctx) => {
      [0, 1].forEach((f) => {
        const o = f * 16, R = (c, x, y, w, h) => rect(ctx, c, o + x, y, w, h);
        R(C.lgrey, 0, 4 + f * 2, 3, 3); R(C.lgrey, 13, 4 + f * 2, 3, 3);                       // flapping wings
        R(C.white, 3, 3, 10, 11); R(C.purple, 3, 3, 10, 3); R(C.white, 5, 1, 1, 3); R(C.white, 10, 1, 1, 3);
        R(C.black, 5, 8, 2, 2); R(C.black, 9, 8, 2, 2); R(C.red, 6, 12, 4, 1); R(C.grey, 5, 6, 6, 1);
        outline(ctx, o, 0, 16, 16);
      });
    });
    t.add(0, 0, 0, 0, 16, 16); t.add(1, 0, 16, 0, 16, 16);
  },
  enemySpam(scene, key) {
    const t = canvasTex(scene.textures, key, 32, 16, (ctx) => {
      [0, 1].forEach((f) => {
        const o = f * 16, R = (c, x, y, w, h) => rect(ctx, c, o + x, y, w, h);
        const top = f ? 5 : 3, hgt = f ? 8 : 10;                                             // frame 1 = squashed hop
        R(C.yellow, 1, top + 2, 14, hgt); R(C.cream, 1, top + 2, 14, 2);
        R(C.orange, 2, top + 3, 3, 1); R(C.orange, 11, top + 3, 3, 1); R(C.orange, 5, top + 4, 6, 1);
        R(C.red, 4, top + 6, 2, 2); R(C.red, 10, top + 6, 2, 2); R(C.black, 5, top + 6, 1, 1); R(C.black, 11, top + 6, 1, 1);
        R(C.red, 6, top + hgt, 4, 1);
        outline(ctx, o, 0, 16, 16);
      });
    });
    t.add(0, 0, 0, 0, 16, 16); t.add(1, 0, 16, 0, 16, 16);
  },
  enemyPrinter(scene, key) {
    const t = canvasTex(scene.textures, key, 32, 16, (ctx) => {
      [0, 1].forEach((f) => {
        const o = f * 16, R = (c, x, y, w, h) => rect(ctx, c, o + x, y, w, h);
        R(C.lgrey, 1, 5, 14, 9); R(C.grey, 1, 11, 14, 3); R(C.white, 3, 1, 10, 5); R(C.black, 4, 3, 5, 1);
        R(f ? C.red : C.orange, 11, 7, 3, 2); R(C.black, 3, 8, 7, 1);
        if (f) { R(C.white, 12, 11, 4, 3); R(C.black, 13, 12, 2, 1); }                           // jammed paper
        R(C.black, 4, 13 - f, 2, 1);
        outline(ctx, o, 0, 16, 16);
      });
    });
    t.add(0, 0, 0, 0, 16, 16); t.add(1, 0, 16, 0, 16, 16);
  },
  /** 32x32 mini-bosses: a 2x copy of an enemy with an angry brow and a gold crown. */
  boss(scene, key, args) {
    const src = scene.textures.get(args.from).getSourceImage();
    const t = canvasTex(scene.textures, key, 64, 32, (ctx) => {
      ctx.imageSmoothingEnabled = false;
      [0, 1].forEach((f) => {
        ctx.drawImage(src, f * 16, 0, 16, 16, f * 32, 0, 32, 32);
        const o = f * 32, R = (c, x, y, w, h) => rect(ctx, c, o + x, y, w, h);
        R(C.yellow, 8, 0, 16, 3); R(C.yellow, 8, -1 + 1, 3, 3); R(C.yellow, 14, 0, 4, 3); R(C.yellow, 21, 0, 3, 3);
        R(C.black, 8, 3, 16, 1);
        outline(ctx, o, 0, 32, 32);
      });
    });
    t.add(0, 0, 0, 0, 32, 32); t.add(1, 0, 32, 0, 32, 32);
  },

  /* ------------------------------------------------ items & props */
  book(scene, key) {
    canvasTex(scene.textures, key, 16, 16, (ctx) => {
      rect(ctx, C.red, 3, 3, 10, 11); rect(ctx, C.white, 4, 12, 9, 2); rect(ctx, C.yellow, 5, 5, 6, 1); rect(ctx, C.yellow, 5, 7, 4, 1);
      rect(ctx, '#B02800', 3, 3, 2, 11); outline(ctx, 0, 0, 16, 16);
    });
  },
  cert(scene, key) {
    canvasTex(scene.textures, key, 16, 16, (ctx) => {
      rect(ctx, C.white, 2, 3, 12, 9); rect(ctx, C.yellow, 2, 3, 12, 1); rect(ctx, C.grey, 4, 5, 8, 1); rect(ctx, C.grey, 4, 7, 6, 1);
      rect(ctx, C.red, 10, 9, 4, 4); rect(ctx, C.yellow, 11, 10, 2, 2); rect(ctx, C.red, 10, 13, 1, 2); rect(ctx, C.red, 13, 13, 1, 2);
      outline(ctx, 0, 0, 16, 16);
    });
  },
  lever(scene, key) {
    const t = canvasTex(scene.textures, key, 32, 16, (ctx) => {
      [0, 1].forEach((f) => {
        const o = f * 16;
        rect(ctx, C.grey, o + 3, 11, 10, 4); rect(ctx, C.lgrey, o + 3, 11, 10, 1);
        for (let i = 0; i < 7; i++) rect(ctx, C.lgrey, o + (f ? 8 - i : 8 + i) , 10 - i, 2, 2);   // handle left (on) / right (off)
        rect(ctx, f ? C.lime : C.red, o + (f ? 1 : 13), 2, 3, 3);
        outline(ctx, o, 0, 16, 16);
      });
    });
    t.add(0, 0, 0, 0, 16, 16); t.add(1, 0, 16, 0, 16, 16);
  },
  paper(scene, key) { canvasTex(scene.textures, key, 8, 8, (ctx) => { rect(ctx, C.white, 1, 1, 6, 6); rect(ctx, C.grey, 2, 3, 4, 1); outline(ctx, 0, 0, 8, 8); }); },
  trophy(scene, key) {
    const t = canvasTex(scene.textures, key, 32, 16, (ctx) => {
      [[C.grey, C.lgrey], [C.yellow, C.white]].forEach(([a, b], i) => {
        const o = i * 16;
        rect(ctx, a, o + 4, 2, 8, 6); rect(ctx, b, o + 5, 3, 2, 3); rect(ctx, a, o + 2, 3, 2, 3); rect(ctx, a, o + 12, 3, 2, 3);
        rect(ctx, a, o + 7, 8, 2, 3); rect(ctx, a, o + 4, 11, 8, 3); rect(ctx, C.black, o + 5, 12, 6, 1);
        outline(ctx, o, 0, 16, 16);
      });
    });
    t.add(0, 0, 0, 0, 16, 16); t.add(1, 0, 16, 0, 16, 16);
  },
  mplat(scene, key) { canvasTex(scene.textures, key, 32, 8, (ctx) => { rect(ctx, C.black, 0, 0, 32, 8); rect(ctx, C.cyan, 1, 1, 30, 3); rect(ctx, C.blue, 1, 4, 30, 3); rect(ctx, C.white, 1, 1, 30, 1); rect(ctx, C.yellow, 4, 5, 2, 1); rect(ctx, C.yellow, 26, 5, 2, 1); }); },
  terminal(scene, key) {
    canvasTex(scene.textures, key, 16, 16, (ctx) => {
      rect(ctx, C.lgrey, 2, 2, 12, 9); rect(ctx, C.black, 3, 3, 10, 7); rect(ctx, C.lime, 4, 4, 6, 1); rect(ctx, C.lime, 4, 6, 4, 1); rect(ctx, C.lime, 4, 8, 7, 1);
      rect(ctx, C.grey, 6, 11, 4, 2); rect(ctx, C.lgrey, 3, 13, 10, 2); outline(ctx, 0, 0, 16, 16);
    });
  },

  /* ------------------------------------------------ themed 3-layer parallax backgrounds */
  bg(scene, key, args) {
    const { theme, layer } = args;
    if (theme === 'city') return GEN[{ far: 'bgFar', mid: 'bgMid', near: 'bgNear' }[layer]](scene, key);
    canvasTex(scene.textures, key, 256, 224, (ctx) => THEMES[theme][layer](ctx));
  },

  /* ------------------------------------------------ parallax (256x224, tileable) */
  bgFar(scene, key) {
    canvasTex(scene.textures, key, 256, 224, (ctx) => {
      const bands = ['#0058F8', '#0868F8', '#1078F8', '#20A0F8', '#00B8F8', '#58D0FC'];
      bands.forEach((c, i) => rect(ctx, c, 0, i * 28, 256, 28));
      rect(ctx, '#58D0FC', 0, 168, 256, 56);
      // distant skyline
      for (let i = 0; i < 8; i++) {
        const w = 24 + (i * 7) % 16, h = 40 + ((i * 29) % 50), x = i * 32;
        rect(ctx, '#2c88f8', x, 190 - h, w, h + 40);
        rect(ctx, '#58a8fc', x, 190 - h, w, 2);
      }
      // clouds
      [[20, 30, 40], [140, 56, 32], [210, 20, 28]].forEach(([x, y, w]) => { rect(ctx, C.white, x, y, w, 6); rect(ctx, C.white, x + 6, y - 4, w - 14, 4); });
    });
  },
  bgMid(scene, key) {
    canvasTex(scene.textures, key, 256, 224, (ctx) => {
      [[0, 70, 64], [80, 40, 56], [150, 90, 48], [214, 60, 42]].forEach(([x, h, w]) => {
        const top = 192 - h;
        rect(ctx, C.navy, x, top, w, h + 32); rect(ctx, C.blue, x, top, w, 2); rect(ctx, C.black, x, top - 1, w, 1);
        for (let wy = top + 6; wy < 184; wy += 10) for (let wx = x + 5; wx < x + w - 6; wx += 10) rect(ctx, ((wx + wy) % 3 === 0) ? C.yellow : '#2060c8', wx, wy, 5, 5);
      });
    });
  },
  bgNear(scene, key) {
    canvasTex(scene.textures, key, 256, 224, (ctx) => {
      // cubicle partitions + plants silhouette along the floor line
      for (let x = 0; x < 256; x += 64) {
        rect(ctx, '#1c3c78', x + 4, 150, 40, 42); rect(ctx, '#2c58b0', x + 4, 150, 40, 3);
        rect(ctx, '#142c58', x + 4, 188, 40, 4);
        rect(ctx, C.darkGreen, x + 52, 168, 6, 24); rect(ctx, C.green, x + 48, 160, 14, 10); rect(ctx, C.lime, x + 50, 156, 4, 6);
      }
    });
  },
};


/* ---------------------------------------------------------------- themed backgrounds */
const bands = (ctx, cols, h0 = 0, bh = 28) => cols.forEach((c, i) => rect(ctx, c, 0, h0 + i * bh, 256, bh));
const THEMES = {
  campus: {
    far(ctx) {
      bands(ctx, ['#58A8FC', '#78C0FC', '#98D4FC', '#B8E4FC', '#D8F0FC', '#FCE0A8', '#FCE0A8', '#FCE0A8'], 0, 28);
      [[20, 34, 40], [120, 22, 36], [200, 50, 30]].forEach(([x, y, w]) => { rect(ctx, C.white, x, y, w, 6); rect(ctx, C.white, x + 6, y - 4, w - 14, 4); });
      for (let x = 0; x < 256; x++) { const h = 44 + Math.round(10 * Math.sin(x / 20) + 5 * Math.sin(x / 7)); rect(ctx, '#58D854', x, 224 - h, 1, h); rect(ctx, '#A8F090', x, 224 - h, 1, 2); }
    },
    mid(ctx) {
      [[0, 60, 56], [76, 80, 44], [136, 56, 60], [204, 70, 52]].forEach(([x, h, w], i) => {
        const top = 190 - h;
        rect(ctx, '#B83800', x, top, w, h + 40); rect(ctx, C.cream, x, top, w, 3); rect(ctx, C.black, x, top - 1, w, 1);
        for (let wy = top + 10; wy < 176; wy += 16) for (let wx = x + 6; wx < x + w - 8; wx += 14) { rect(ctx, C.cream, wx, wy, 8, 10); rect(ctx, C.darkBrown, wx + 1, wy + 1, 6, 9); rect(ctx, C.cream, wx + 3, wy + 1, 2, 9); }
        if (i === 1) { rect(ctx, C.cream, x + 14, top - 22, 16, 22); rect(ctx, C.black, x + 18, top - 18, 8, 8); rect(ctx, C.white, x + 19, top - 17, 6, 6); rect(ctx, C.black, x + 22, top - 17, 1, 3); rect(ctx, C.red, x + 12, top - 28, 20, 6); }
      });
    },
    near(ctx) {
      for (let x = 0; x < 256; x += 64) {
        rect(ctx, C.darkBrown, x + 14, 156, 6, 36); rect(ctx, C.darkGreen, x + 2, 130, 30, 30); rect(ctx, C.green, x + 6, 126, 22, 26); rect(ctx, C.lime, x + 10, 128, 8, 6);
        rect(ctx, C.black, x + 46, 140, 3, 52); rect(ctx, C.black, x + 42, 138, 11, 4); rect(ctx, C.yellow, x + 43, 139, 9, 2);
      }
    },
  },
  office: {
    far(ctx) {
      rect(ctx, '#BCBCBC', 0, 0, 256, 224); rect(ctx, '#7C7C7C', 0, 150, 256, 74); rect(ctx, C.black, 0, 0, 256, 14); rect(ctx, C.white, 0, 14, 256, 1);
      for (let x = 8; x < 256; x += 64) { rect(ctx, C.black, x, 30, 50, 80); rect(ctx, '#58D0FC', x + 3, 33, 44, 74); rect(ctx, C.white, x + 6, 36, 8, 30); [[8, 30], [22, 46], [34, 22]].forEach(([bx, bh]) => rect(ctx, C.blue, x + 3 + bx, 107 - bh, 12, bh)); rect(ctx, C.black, x + 24, 33, 2, 74); rect(ctx, C.black, x + 3, 70, 44, 2); }
    },
    mid(ctx) {
      for (let x = 0; x < 256; x += 64) { rect(ctx, '#7C7C7C', x + 28, 14, 14, 180); rect(ctx, C.lgrey, x + 28, 14, 3, 180); rect(ctx, C.black, x + 41, 14, 1, 180); rect(ctx, C.black, x + 20, 14, 30, 3); rect(ctx, C.yellow, x + 24, 17, 22, 3); }
    },
    near(ctx) {
      for (let x = 0; x < 256; x += 64) {
        rect(ctx, C.blue, x + 2, 150, 44, 42); rect(ctx, '#58A8FC', x + 2, 150, 44, 3); rect(ctx, C.navy, x + 2, 188, 44, 4);
        rect(ctx, C.black, x + 10, 128, 18, 14); rect(ctx, C.lime, x + 12, 130, 8, 1); rect(ctx, C.lime, x + 12, 133, 12, 1); rect(ctx, C.grey, x + 16, 142, 6, 8);
        rect(ctx, C.red, x + 50, 168, 8, 24); rect(ctx, C.black, x + 49, 160, 10, 8);
      }
    },
  },
  server: {
    far(ctx) {
      rect(ctx, C.black, 0, 0, 256, 224);
      for (let x = 0; x < 256; x += 16) rect(ctx, '#161630', x, 0, 1, 224);
      for (let y = 0; y < 224; y += 16) rect(ctx, '#161630', 0, y, 256, 1);
      [[30, 18], [120, 52], [200, 30]].forEach(([x, y]) => { rect(ctx, '#003858', x, y, 40, 2); rect(ctx, C.cyan, x, y, 12, 2); });
    },
    mid(ctx) {
      for (let i = 0; i < 8; i++) {
        const x = i * 32 + 3;
        rect(ctx, C.black, x, 40, 26, 150); rect(ctx, '#2c2c44', x + 1, 41, 24, 148); rect(ctx, '#46466a', x + 1, 41, 24, 2);
        for (let y = 48; y < 184; y += 10) { rect(ctx, C.black, x + 3, y, 20, 7); rect(ctx, '#1c1c34', x + 4, y + 1, 18, 5); [C.lime, C.cyan, C.red, C.yellow][(i + y / 10) % 4 | 0] && rect(ctx, [C.lime, C.cyan, C.red, C.yellow][(i * 3 + y / 10) % 4 | 0], x + 6 + ((i + y) % 3) * 4, y + 2, 2, 3); }
      }
    },
    near(ctx) {
      rect(ctx, C.black, 0, 112, 256, 4); rect(ctx, C.red, 0, 113, 256, 2);
      for (let x = 0; x < 256; x += 64) { rect(ctx, C.black, x + 30, 112, 4, 80); rect(ctx, C.cyan, x + 31, 116, 2, 76); rect(ctx, C.black, x + 10, 150, 40, 3); rect(ctx, C.orange, x + 10, 151, 40, 1); }
    },
  },
  gallery: {
    far(ctx) {
      rect(ctx, '#2C1C58', 0, 0, 256, 224);
      for (let x = 0; x < 256; x += 32) { rect(ctx, '#3C2C78', x, 0, 16, 224); rect(ctx, '#4C3C98', x + 15, 0, 1, 224); }
      rect(ctx, C.black, 0, 0, 256, 12); rect(ctx, C.yellow, 0, 12, 256, 2);
      ctx.fillStyle = 'rgba(248,216,120,0.13)';
      for (let x = 32; x < 256; x += 64) { ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x - 26, 190); ctx.lineTo(x + 26, 190); ctx.closePath(); ctx.fill(); }
    },
    mid(ctx) {
      [[10, 28, 36, 44], [74, 24, 48, 34], [140, 28, 34, 44], [204, 24, 44, 34]].forEach(([x, y, w, h], i) => {
        rect(ctx, C.yellow, x, y + 18, w, h); rect(ctx, C.brown, x + 3, y + 21, w - 6, h - 6);
        const ix = x + 5, iy = y + 23, iw = w - 10, ih = h - 10;
        rect(ctx, ['#58D0FC', '#F8D878', '#F83800', '#6844FC'][i], ix, iy, iw, ih);
        rect(ctx, [C.green, C.red, C.navy, C.cyan][i], ix, iy + ih - 10, iw, 10); rect(ctx, C.white, ix + 4, iy + 4, 8, 4);
      });
    },
    near(ctx) {
      for (let x = 0; x < 256; x += 64) {
        rect(ctx, C.black, x + 6, 156, 5, 36); rect(ctx, C.yellow, x + 4, 152, 9, 5); rect(ctx, C.black, x + 52, 156, 5, 36); rect(ctx, C.yellow, x + 50, 152, 9, 5);
        for (let k = 0; k < 40; k++) rect(ctx, C.red, x + 11 + k, 158 + Math.round(5 * Math.sin((k / 40) * Math.PI)), 1, 2);
      }
    },
  },
  sunset: {
    far(ctx) {
      bands(ctx, ['#1C1450', '#3C1C78', '#6844FC', '#C04898', '#F86038', '#FCA044', '#FCE0A8', '#FCE0A8'], 0, 32);
      rect(ctx, C.yellow, 160, 118, 44, 44); rect(ctx, '#FCE0A8', 166, 124, 32, 32); rect(ctx, C.yellow, 170, 112, 24, 8);
      [[16, 40, 36], [100, 22, 30], [190, 60, 34]].forEach(([x, y, w]) => { rect(ctx, '#F8A8C8', x, y, w, 5); rect(ctx, '#F8A8C8', x + 6, y - 3, w - 14, 3); });
      for (let i = 0; i < 9; i++) { const h = 24 + (i * 37) % 40; rect(ctx, '#2C1C58', i * 30, 180 - h, 24, h + 50); }
    },
    mid(ctx) {
      [[0, 60, 50], [64, 40, 44], [116, 76, 40], [166, 50, 48], [224, 66, 30]].forEach(([x, h, w], i) => {
        const top = 196 - h;
        rect(ctx, '#1C1450', x, top, w, h + 30);
        for (let wy = top + 6; wy < 184; wy += 10) for (let wx = x + 5; wx < x + w - 6; wx += 9) if ((wx + wy * 3 + i) % 7 < 3) rect(ctx, C.yellow, wx, wy, 4, 5);
        if (i === 2) { rect(ctx, '#1C1450', x + 6, top - 16, 3, 16); rect(ctx, '#1C1450', x + 24, top - 16, 3, 16); rect(ctx, '#1C1450', x + 2, top - 30, 28, 16); rect(ctx, '#1C1450', x + 14, top - 36, 4, 6); }
        if (i === 3) { rect(ctx, '#1C1450', x + 20, top - 24, 2, 24); rect(ctx, '#1C1450', x + 12, top - 18, 18, 2); }
      });
    },
    near(ctx) {
      rect(ctx, C.black, 0, 164, 256, 3); for (let x = 0; x < 256; x += 16) rect(ctx, C.black, x + 6, 164, 3, 28);
      for (let x = 0; x < 256; x += 128) { rect(ctx, '#2C1C58', x + 30, 150, 30, 20); rect(ctx, '#46466A', x + 30, 150, 30, 3); rect(ctx, C.black, x + 36, 158, 18, 2); rect(ctx, C.black, x + 100, 120, 2, 50); rect(ctx, C.black, x + 94, 130, 14, 2); }
    },
  },
};

/** Generate a placeholder texture by generator name (used by Boot for entries with url: null). */
export function generatePlaceholder(scene, generator, key, args) {
  if (!GEN[generator]) throw new Error('Unknown placeholder generator: ' + generator);
  GEN[generator](scene, key, args);
}
