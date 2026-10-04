/**
 * Procedural placeholder art, drawn with canvas rects in the project palette.
 * Everything here is replaceable through assets/manifest.js (set a `url`).
 * A shared outline pass gives every sprite the 1px dark outline from the style guide.
 */
import { PALETTE as C } from '../config.js';

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
// Career-ladder looks: shirt colour, lanyard, badge, tie, blazer...
const TIERS = [
  { shirt: C.cyan,  lanyard: null,     badge: false, tie: null,     blazer: null,      star: false }, // Intern
  { shirt: C.white, lanyard: C.lgrey,  badge: true,  tie: null,     blazer: null,      star: false }, // Junior
  { shirt: C.white, lanyard: C.blue,   badge: true,  tie: null,     blazer: null,      star: false }, // Associate
  { shirt: C.white, lanyard: C.blue,   badge: true,  tie: C.red,     blazer: null,      star: false }, // Senior
  { shirt: C.white, lanyard: C.green,  badge: true,  tie: C.red,     blazer: C.navy,    star: false }, // Lead
  { shirt: C.white, lanyard: C.yellow, badge: true,  tie: C.yellow,  blazer: C.purple,  star: true  }, // Hired!
];
const POSES = ['idle', 'walkA', 'walkB', 'jump', 'skid'];

function drawHero(ctx, ox, pose, t) {
  const r = (color, x, y, w, h) => rect(ctx, color, ox + x, y, w, h);
  const lean = pose === 'skid' ? -1 : 0;
  // legs + shoes
  const leg = (x, y, h) => { r('#003058', x, y, 3, h); r(C.black, x - (pose === 'jump' ? 1 : 0), y + h, 4, 2); };
  if (pose === 'walkA') { leg(4, 22, 7); leg(10, 22, 5); }
  else if (pose === 'walkB') { leg(7, 22, 5); leg(5, 22, 7); }
  else if (pose === 'jump') { leg(4, 22, 5); leg(10, 21, 4); }
  else if (pose === 'skid') { leg(3, 22, 7); leg(10, 22, 7); }
  else { leg(5, 22, 7); leg(9, 22, 7); }
  // torso (blazer or shirt)
  const body = TIERS_CURRENT.blazer ?? TIERS_CURRENT.shirt;
  r(body, 5 + lean, 11, 7, 11);
  if (TIERS_CURRENT.blazer) r(TIERS_CURRENT.shirt, 7 + lean, 11, 3, 6);   // shirt V under the blazer
  // arm
  const armY = pose === 'jump' ? 9 : 12;
  const swing = pose === 'walkA' ? 1 : pose === 'walkB' ? -1 : 0;
  r(body, 3 + lean + swing, armY, 2, 7);
  r(C.cream, 3 + lean + swing, armY + 7, 2, 2);
  // lanyard, badge, tie
  if (TIERS_CURRENT.lanyard) { r(TIERS_CURRENT.lanyard, 7 + lean, 11, 1, 6); r(TIERS_CURRENT.lanyard, 10 + lean, 11, 1, 6); r(C.white, 7 + lean, 17, 4, 3); r(C.blue, 7 + lean, 17, 4, 1); }
  if (TIERS_CURRENT.tie) { r(TIERS_CURRENT.tie, 8 + lean, 11, 2, 7); }
  if (TIERS_CURRENT.star) { r(C.yellow, 5 + lean, 13, 1, 1); r(C.yellow, 11 + lean, 13, 1, 1); }
  // head
  r(C.cream, 5 + lean, 5, 7, 6);
  r(C.black, 5 + lean, 2, 8, 3);          // hair
  r(C.black, 4 + lean, 3, 2, 6);
  r(C.black, 9 + lean, 6, 1, 2);          // eye
  r(C.orange, 8 + lean, 8, 2, 1);         // mouth/nose hint
}
let TIERS_CURRENT = TIERS[0];

export function generateHero(scene, key, tier) {
  TIERS_CURRENT = TIERS[tier];
  const t = canvasTex(scene.textures, key, 16 * POSES.length, 32, (ctx) => {
    POSES.forEach((p, i) => { drawHero(ctx, i * 16, p, TIERS_CURRENT); outline(ctx, i * 16, 0, 16, 32); });
  });
  POSES.forEach((_, i) => t.add(i, 0, i * 16, 0, 16, 32));
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
