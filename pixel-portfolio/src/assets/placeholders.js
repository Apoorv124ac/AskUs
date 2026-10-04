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
    const t = canvasTex(scene.textures, key, 160, 16, (ctx) => {
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
    });
    for (let i = 0; i < 10; i++) t.add(i, 0, i * 16, 0, 16, 16);
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

/** Generate a placeholder texture by generator name (used by Boot for entries with url: null). */
export function generatePlaceholder(scene, generator, key) {
  if (!GEN[generator]) throw new Error('Unknown placeholder generator: ' + generator);
  GEN[generator](scene, key);
}
