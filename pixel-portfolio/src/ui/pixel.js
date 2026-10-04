import Phaser from 'phaser';

export const FONT = '"Press Start 2P"';

export function txt(scene, x, y, s, o = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT,
    fontSize: `${o.size || 8}px`,
    color: o.color || '#fcfcfc',
    align: o.align || 'left',
    lineSpacing: o.lineSpacing ?? 3,
    wordWrap: o.wrap ? { width: o.wrap } : undefined,
  });
  if (o.origin !== undefined) t.setOrigin(...[].concat(o.origin));
  if (o.shadow !== false) t.setShadow(o.size > 12 ? 3 : 1, o.size > 12 ? 3 : 1, '#0f0f1b', 0);
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
