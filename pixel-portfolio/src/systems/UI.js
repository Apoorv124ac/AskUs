import { PALETTE as C } from '../config.js';

export const FONT = '"Press Start 2P", monospace';
const hex = (s) => parseInt(s.slice(1), 16);

/** Pixel-bordered box (NES-style dialogue/menu frame) drawn into a Graphics object. */
export function drawBox(g, x, y, w, h, { fill = C.black, border = C.white, shade = C.grey } = {}) {
  g.fillStyle(hex(C.black)).fillRect(x, y, w, h);
  g.fillStyle(hex(border)).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(hex(shade)).fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(hex(fill)).fillRect(x + 3, y + 3, w - 6, h - 6);
  // chipped corners for that retro look
  g.fillStyle(hex(C.black));
  [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]].forEach(([cx, cy]) => g.fillRect(cx, cy, 1, 1));
  return g;
}

export function text(scene, x, y, str, { size = 8, color = C.white, origin = [0.5, 0.5], shadow = true, align = 'center', backing = false } = {}) {
  const style = { fontFamily: FONT, fontSize: size + 'px', color, align, lineSpacing: 4 };
  if (backing) { style.backgroundColor = 'rgba(15,15,27,0.85)'; style.padding = { x: 4, y: 3 }; }
  const t = scene.add.text(x, y, str, style).setOrigin(...origin);
  if (shadow) t.setShadow(1, 1, C.black, 0, false, true);
  return t;
}

/** Replace {tokens} in a string: fmt('Hi {name}', { name: 'A' }). */
export const fmt = (str, vars = {}) => String(str).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

/** Fade the camera out, then switch scene. */
export function fadeTo(scene, key, data, ms = 250) {
  const cam = scene.cameras.main;
  cam.fadeOut(ms, 15, 15, 27);
  cam.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

/** Chunky pixel disc (no anti-aliasing) drawn into a Graphics object. */
export function disc(g, cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.4));
    g.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
}
