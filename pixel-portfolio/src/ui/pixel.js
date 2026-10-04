import Phaser from 'phaser';

// Two fonts: Silkscreen = compact body/label text (crisp at 8px),
// Press Start 2P = big headlines only.
export const FONT = 'Silkscreen, monospace';
export const FONT_DISPLAY = '"Press Start 2P", monospace';

export const COLORS = {
  ink: '#0f0f1b',
  white: '#fcfcfc',
  gold: '#f8d878',
  green: '#58d854',
  red: '#f83800',
  blue: '#58b0f8',
  grey: '#bcbcbc',
  dim: '#7c7c7c',
};

// Text with the project defaults. o: size, color, display (Press Start 2P), bold, origin, wrap, align, shadow, depth
export function txt(scene, x, y, s, o = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: o.display ? FONT_DISPLAY : FONT,
    fontStyle: o.bold ? 'bold' : 'normal',
    fontSize: `${o.size || 8}px`,
    color: o.color || COLORS.white,
    align: o.align || 'left',
    lineSpacing: o.lineSpacing ?? 2,
    wordWrap: o.wrap ? { width: o.wrap } : undefined,
  });
  if (o.origin !== undefined) t.setOrigin(...[].concat(o.origin));
  if (o.shadow !== false) t.setShadow(1, 1, COLORS.ink, 0);
  return t.setDepth(o.depth ?? 10);
}

const notched = (g, color, x, y, w, h) => {
  g.fillStyle(color);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
};

// Pixel-bordered box with notched corners: ink outline, light frame, fill.
export function panel(scene, x, y, w, h, { fill = 0x1c2250, frame = 0xfcfcfc, alpha = 1, depth = 5 } = {}) {
  const g = scene.add.graphics().setDepth(depth);
  notched(g, 0x0f0f1b, x - 1, y - 1, w + 2, h + 2);
  notched(g, frame, x, y, w, h);
  g.fillStyle(fill, alpha).fillRect(x + 2, y + 2, w - 4, h - 4);
  return g;
}

// --- animation helpers ------------------------------------------------------
// Scale-pop an object in (0 -> overshoot -> 1).
export function popIn(scene, target, { delay = 0, duration = 260, from = 0 } = {}) {
  target.setScale(from);
  return scene.tweens.add({ targets: target, scale: 1, delay, duration, ease: 'Back.out' });
}

// Quick "bump" (e.g. a counter that just changed).
export function bump(scene, target, amount = 1.35) {
  scene.tweens.killTweensOf(target);
  target.setScale(amount);
  scene.tweens.add({ targets: target, scale: 1, duration: 220, ease: 'Back.out' });
}

// Little square confetti/spark burst.
export function burst(scene, x, y, { n = 10, colors = [0xf8d878, 0xfcfcfc, 0xfca044], spread = 22, depth = 20 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const d = spread * (0.6 + Math.random() * 0.6);
    const sq = scene.add.rectangle(x, y, 2, 2, Phaser.Utils.Array.GetRandom(colors)).setDepth(depth);
    scene.tweens.add({
      targets: sq,
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d - 4,
      alpha: 0,
      duration: 420 + Math.random() * 160,
      ease: 'Cubic.out',
      onComplete: () => sq.destroy(),
    });
  }
}

// Word-wrapped text where *starred phrases* are highlighted, and words pop in one by one.
// Returns { container, words, height, reveal(), done() }.
export function richText(scene, x, y, str, { width = 200, color = COLORS.white, hi = COLORS.gold, lineH = 10, depth = 12, popMs = 38 } = {}) {
  const container = scene.add.container(x, y).setDepth(depth);
  const tokens = [];
  str.split('*').forEach((chunk, i) => {
    const words = chunk.split(/\s+/).filter(Boolean);
    // punctuation right after a *highlight* sticks to it (no gap)
    const glue = i > 0 && !/^\s/.test(chunk);
    words.forEach((w, k) => tokens.push({ w, hi: i % 2 === 1, glue: glue && k === 0 }));
  });
  const words = [];
  const space = 4;
  let cx = 0;
  let line = 0;
  tokens.forEach((tk) => {
    const t = txt(scene, 0, 0, tk.w, { color: tk.hi ? hi : color, bold: tk.hi, shadow: false, depth });
    if (tk.glue && cx > 0) cx -= space;
    if (cx > 0 && cx + t.width > width) {
      cx = 0;
      line++;
    }
    t.setPosition(cx, line * lineH);
    cx += t.width + space;
    container.add(t);
    words.push(t);
  });
  const height = (line + 1) * lineH;
  words.forEach((w) => w.setAlpha(0));
  const reveal = () =>
    words.forEach((w, i) => {
      const y0 = w.y;
      w.y = y0 + 4;
      scene.tweens.add({ targets: w, alpha: 1, y: y0, delay: i * popMs, duration: 180, ease: 'Back.out' });
    });
  return { container, words, height, reveal };
}

// Fade the camera out, then switch scene (guards against double triggers).
export function go(scene, key, data) {
  if (scene._leaving) return;
  scene._leaving = true;
  scene.cameras.main.fadeOut(220, 15, 15, 27);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

// Two scrolling skyline layers behind everything.
export function skyline(scene, { near = true } = {}) {
  const layers = [['skyline-far', 0.15]];
  if (near) layers.push(['skyline-near', 0.4]);
  const sprites = layers.map(([key, f], i) => ({
    ts: scene.add.tileSprite(0, 0, 256, 224, key).setOrigin(0).setDepth(i),
    f,
  }));
  return (dt) => sprites.forEach(({ ts, f }) => (ts.tilePositionX += f * dt * 0.06));
}

export const groundStrip = (scene, y = 192) => {
  scene.add.tileSprite(0, y, 256, 16, 'tile-ground').setOrigin(0).setDepth(3);
  scene.add.tileSprite(0, y + 16, 256, 224 - y - 16, 'tile-dirt').setOrigin(0).setDepth(3);
};

export const blink = (scene, target) =>
  scene.tweens.add({ targets: target, alpha: 0.15, duration: 450, yoyo: true, repeat: -1 });

export { Phaser };
