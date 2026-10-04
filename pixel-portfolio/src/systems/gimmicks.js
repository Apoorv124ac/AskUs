// Level mechanics: spikes, springs, crumbling tiles, conveyor belts and moving platforms.
// Grid chars:  ^ spikes   S spring   C crumbling tile   > < conveyor belt (right / left)
// Moving platforms come from `L.movers` (see `mover()` in levels.js).
import { burst } from '../ui/pixel.js';

export class Gimmicks {
  constructor(scene) {
    this.s = scene;
    this.L = scene.level;
    const phys = scene.physics;
    const p = scene.player;
    this.spikes = phys.add.group({ allowGravity: false, immovable: true });
    this.springs = phys.add.group({ allowGravity: false, immovable: true });
    this.crumbles = phys.add.staticGroup();
    this.convs = phys.add.staticGroup();
    this.movers = phys.add.group({ allowGravity: false, immovable: true });
    this.convDir = 0;
    this.convUntil = 0;

    const L = this.L;
    for (let r = 0; r < L.h; r++)
      for (let c = 0; c < L.w; c++) {
        const ch = L.grid[r][c];
        const x = c * 16 + 8;
        const y = r * 16 + 8;
        if (ch === '^') {
          const sp = this.spikes.create(x, y, 'spikes').setDepth(3);
          sp.body.setSize(14, 9).setOffset(1, 7);
        } else if (ch === 'S') {
          const sp = this.springs.create(x, y, 'spring', 0).setDepth(3);
          sp.body.setSize(14, 8).setOffset(1, 8);
        } else if (ch === 'C') {
          const t = this.crumbles.create(x, y, 'tile-crumble').setDepth(3);
          t.home = { x, y };
          t.trig = false;
        } else if (ch === '>' || ch === '<') {
          const t = this.convs.create(x, y, 'tile-conveyor', 0).setDepth(3);
          t.dir = ch === '>' ? 1 : -1;
          t.setFlipX(t.dir < 0);
          t.anims.play('conv');
        }
      }
    (L.movers || []).forEach((m) => {
      const w = m.tiles * 16;
      const sp = this.movers.create(m.col * 16 + w / 2, m.row * 16 + 4, 'mover').setDepth(3);
      if (m.tiles !== 3) sp.setCrop(0, 0, w, 8);
      sp.body.setSize(w, 8).setOffset(m.tiles === 3 ? 0 : 0, 0);
      sp.m = { ...m, x0: sp.x, y0: sp.y, t0: m.phase ?? 0 };
      sp.body.friction.x = 1;
      sp.setImmovable(true);
    });

    phys.add.collider(p, this.crumbles, (_, t) => p.body.touching.down && this.crumble(t));
    phys.add.collider(p, this.convs, (_, t) => {
      if (p.body.touching.down) {
        this.convDir = t.dir;
        this.convUntil = scene.time.now + 90;
      }
    });
    phys.add.collider(p, this.movers);
    phys.add.overlap(p, this.spikes, (_, sp) => this.spiked(sp));
    phys.add.overlap(p, this.springs, (_, sp) => this.spring(sp));
  }

  spiked(sp) {
    const { s } = this;
    s.hurtPlayer(sp.x);
    s.player.setVelocityY(-210);
  }

  spring(sp) {
    const { s } = this;
    const p = s.player;
    if (p.body.velocity.y < -20 || p.body.bottom > sp.body.top + 10 || sp.busy) return;
    sp.busy = true;
    p.setVelocityY(-500);
    s.jumping = false;
    s.airJumps = s.coffeeMs > 0 ? 2 : 1;
    sp.setFrame(1);
    s.squash?.(0.8, 1.35);
    s.cameras.main.shake(80, 0.003);
    burst(s, sp.x, sp.y, { n: 6, colors: [0xfcfcfc, 0xf8d878] });
    s.time.delayedCall(220, () => {
      sp.setFrame(0);
      sp.busy = false;
    });
  }

  crumble(t) {
    const { s } = this;
    if (t.trig) return;
    t.trig = true;
    s.tweens.add({ targets: t, x: t.home.x + 1, yoyo: true, repeat: 5, duration: 60 });
    s.time.delayedCall(420, () => {
      t.body.enable = false;
      s.tweens.add({ targets: t, y: t.home.y + 40, alpha: 0, duration: 320 });
      burst(s, t.home.x, t.home.y, { n: 6, colors: [0xac7c00, 0xfca044] });
      s.time.delayedCall(3200, () => {
        t.setPosition(t.home.x, t.home.y).setAlpha(1);
        t.refreshBody();
        t.body.enable = true;
        t.trig = false;
      });
    });
  }

  update(time, delta) {
    const { s } = this;
    const p = s.player;
    const dt = delta / 1000;
    // conveyor belts nudge you along
    // (checked directly each frame: are we standing on a belt tile?)
    if (p.body.blocked.down || p.body.touching.down) {
      const pb = p.body;
      const belt = this.convs.getChildren().find((t) => Math.abs(pb.bottom - (t.y - 8)) < 3 && pb.right > t.x - 8 && pb.left < t.x + 8);
      if (belt) p.x += belt.dir * 42 * dt;
    }
    // moving platforms
    this.movers.getChildren().forEach((sp) => {
      const m = sp.m;
      const t = time / 1000 * m.speed + m.t0;
      const tx = m.axis === 'x' ? m.x0 + Math.sin(t) * m.range * 16 : m.x0;
      const ty = m.axis === 'y' ? m.y0 + Math.sin(t) * m.range * 16 : m.y0;
      sp.body.setVelocity((tx - sp.x) * 12, (ty - sp.y) * 12);
    });
  }
}
