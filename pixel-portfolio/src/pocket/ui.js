import { txt, panel, COLORS } from '../ui/pixel.js';
import { sfx } from '../systems/audio.js';

// A big, tappable pixel button. Returns { setLabel, setEnabled, destroy }.
export function button(scene, x, y, w, h, text, onTap, o = {}) {
  const depth = o.depth ?? 10;
  const fill = o.fill ?? 0x1c2250;
  const frame = o.frame ?? 0xfcfcfc;
  const g = panel(scene, x, y, w, h, { fill, frame, depth });
  const t = txt(scene, x + w / 2, y + h / 2 + 0.5, text, { origin: 0.5, color: o.color ?? COLORS.white, bold: true, depth: depth + 1, size: o.size ?? 8, shadow: false });
  const z = scene.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true }).setDepth(depth + 2);
  let on = true;
  z.on('pointerdown', () => {
    if (!on) return;
    t.setScale(0.9);
    scene.time.delayedCall(90, () => t.active && t.setScale(1));
    sfx('select');
    onTap();
  });
  const api = {
    g, t, z,
    setLabel: (s) => t.setText(s),
    setEnabled: (v) => {
      on = v;
      g.setAlpha(v ? 1 : 0.4);
      t.setAlpha(v ? 1 : 0.4);
    },
    destroy: () => [g, t, z].forEach((a) => a.destroy()),
  };
  return api;
}
