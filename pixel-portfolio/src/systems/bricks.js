// Breakable bricks: jump up into an ordinary brick (the orange blocks) from below and it shatters.
// Bricks grow back after a few seconds so nobody can lock themselves out of a level.
// Some bricks hide a coin (picked by position, so it is always the same ones, once only).
import Phaser from 'phaser';
import { burst } from '../ui/pixel.js';
import { sfx } from './audio.js';

const SOLID_BELOW = new Set(['#', 'd', 'B', 'p', 'q', 'l', 'r', 'C']);
const REGROW_MS = 8000;
const COLORS = [0xfca044, 0xac7c00, 0x8c5c00, 0xf8d878];

export class Bricks {
  constructor(scene) {
    this.s = scene;
    this.L = scene.level;
    this.gone = new Set();
    scene.events.once('shutdown', () => this.restoreAll());
  }

  // can this grid cell be hit from below? (needs open space under it)
  static breakable(L, r, c) {
    if (L.noBreak || L.grid[r][c] !== 'B' || r < 2) return false;
    const below = L.grid[r + 1]?.[c];
    return below !== undefined && !SOLID_BELOW.has(below);
  }

  // called by the player/solids collider
  hit(tile) {
    const { s } = this;
    const p = s.player;
    if (!tile.brick || !tile.active || !p.body.touching.up || s.prevVy > -80) return;
    if (tile.y > p.body.y || Math.abs(tile.x - p.x) > 10) return;
    this.smash(tile);
  }

  smash(tile) {
    const { s, L } = this;
    const { c, r } = tile.brick;
    const key = `${c},${r}`;
    const x = tile.x;
    const y = tile.y;
    s.solids.remove(tile, true, true);
    L.grid[r][c] = '.';
    this.gone.add(key);
    sfx('brick');
    s.cameras.main.shake(70, 0.004);
    s.player.setVelocityY(70); // a solid knock on the head
    s.squash?.(1.12, 0.9, 120);
    // debris: eight shards fly out and tumble down
    for (let i = 0; i < 8; i++) {
      const sz = 3 + (i % 3);
      const shard = s.add.rectangle(x + (i % 2 ? 4 : -4), y + (i < 4 ? -4 : 4), sz, sz, COLORS[i % COLORS.length]).setDepth(9);
      shard.setStrokeStyle(1, 0x0f0f1b);
      const dx = (i - 3.5) * 7 + Phaser.Math.Between(-4, 4);
      s.tweens.add({ targets: shard, x: shard.x + dx, duration: 650, ease: 'Sine.out' });
      s.tweens.add({ targets: shard, y: shard.y - 22 - (i % 3) * 8, duration: 220, ease: 'Quad.out', yoyo: false, onComplete: () => s.tweens.add({ targets: shard, y: shard.y + 90, alpha: 0, duration: 430, ease: 'Quad.in' }) });
      s.tweens.add({ targets: shard, angle: (i % 2 ? 1 : -1) * 360, duration: 650 });
      s.time.delayedCall(700, () => shard.destroy());
    }
    burst(s, x, y, { n: 6, spread: 16, colors: [0xfcfcfc, 0xfca044] });
    // some bricks hide a coin
    const id = `${L.room}:b${c},${r}`;
    if ((c * 7 + r * 13) % 5 === 0 && !s.collected.has(id)) {
      s.collected.add(id);
      const coin = s.add.sprite(x, y, 'coin', 0).setDepth(9);
      coin.anims.play('coin-spin');
      s.tweens.add({ targets: coin, y: y - 26, duration: 260, ease: 'Quad.out', yoyo: true, hold: 60, onComplete: () => coin.destroy() });
      s.time.delayedCall(260, () => {
        s.popText(x, y - 20, '+1');
        s.award();
      });
    }
    s.time.delayedCall(REGROW_MS, () => this.regrow(c, r));
  }

  regrow(c, r) {
    const { s, L } = this;
    if (!s.scene.isActive() || !this.gone.has(`${c},${r}`)) return;
    const x = c * 16 + 8;
    const y = r * 16 + 8;
    const b = s.player.body;
    const busy = b.right > x - 8 && b.left < x + 8 && b.bottom > y - 8 && b.top < y + 8;
    if (busy) return void s.time.delayedCall(800, () => this.regrow(c, r));
    this.gone.delete(`${c},${r}`);
    L.grid[r][c] = 'B';
    const t = s.solids.create(x, y, 'tile-desk').setDepth(3);
    t.brick = { c, r };
    t.setScale(0.6);
    s.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.out', onUpdate: () => t.refreshBody() });
  }

  restoreAll() {
    this.gone.forEach((k) => {
      const [c, r] = k.split(',').map(Number);
      this.L.grid[r][c] = 'B';
    });
    this.gone.clear();
  }
}
