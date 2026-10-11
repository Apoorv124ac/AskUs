// Living pixel decoration: swaying plants and trees, kelp and coral, torches with a flickering flame.
// A level lists them in `L.decor = [{ t: 'plant', col: 12 }, ...]` (row defaults to the ground).
import Phaser from 'phaser';

const KINDS = {
  plant: ['pk-plant', 'pk-plant-sway', 1.6],
  fern: ['pk-fern', 'pk-fern-sway', 1.6],
  tree: ['pk-tree', 'pk-tree-sway', 1.2],
  bush: ['pk-bush', 'pk-bush-sway', 1.7],
  torch: ['pk-torch', 'pk-torch-burn', 2.4],
  kelp: ['pk-kelp', 'pk-kelp-sway', 1.5],
  coral: ['pk-coral', 'pk-coral-sway', 1.6],
};

export class Decor {
  constructor(scene) {
    this.s = scene;
    this.torches = [];
    (scene.level.decor || []).forEach((d, i) => {
      const k = KINDS[d.t];
      if (!k) return;
      const x = d.col * 16 + 8 + (d.dx || 0);
      const y = (d.row ?? 12) * 16; // y of the surface it stands on
      const sp = scene.add.sprite(x, y + 1, k[0], 0).setOrigin(0.5, 1).setDepth(d.front ? 6 : k[2]);
      if (d.flip) sp.setFlipX(true);
      sp.anims.play(k[1]);
      sp.anims.setProgress(((i * 0.37) % 1 + 1) % 1);
      if (d.t === 'torch') this.torches.push({ sp, glow: scene.add.circle(x, y - 22, 20, 0xfca044, 0.22).setBlendMode(Phaser.BlendModes.ADD).setDepth(1.4), t: i * 1.3, nextEmber: 0 });
    });
  }

  update(time) {
    const s = this.s;
    this.torches.forEach((t) => {
      const flick = 0.2 + 0.07 * Math.sin(time / 90 + t.t) + 0.04 * Math.sin(time / 37 + t.t * 2);
      t.glow.setAlpha(flick).setScale(1 + 0.08 * Math.sin(time / 120 + t.t));
      if (time > t.nextEmber && Math.abs(t.sp.x - s.cameras.main.midPoint.x) < 160) {
        t.nextEmber = time + 260 + Math.random() * 300;
        const e = s.add.rectangle(t.sp.x + Phaser.Math.Between(-3, 3), t.sp.y - 22, 1, 1, Math.random() > 0.5 ? 0xf8d878 : 0xfca044).setDepth(2.2);
        s.tweens.add({ targets: e, y: e.y - Phaser.Math.Between(14, 28), x: e.x + Phaser.Math.Between(-6, 6), alpha: 0, duration: 700, onComplete: () => e.destroy() });
      }
    });
  }
}
