// "Design arrows": colourful pixel pointer arrows the hero (or the plane) fires. They aim at the
// nearest enemy in range and fly straight otherwise. Used underwater and in the air.
import Phaser from 'phaser';
import { PTR_COLORS } from '../systems/mouse.js';
import { burst } from '../ui/pixel.js';
import { sfx } from '../systems/audio.js';

export class Gun {
  constructor(scene, { rate = 230, speed = 270, range = 190, source = null } = {}) {
    this.s = scene;
    this.rate = rate;
    this.speed = speed;
    this.range = range;
    this.source = source || (() => ({ x: scene.player.x, y: scene.player.y - 6, dir: scene.player.flipX ? -1 : 1 }));
    this.n = 0;
    this.next = 0;
    this.group = scene.physics.add.group({ allowGravity: false });
    if (scene.solids) scene.physics.add.collider(this.group, scene.solids, (a) => this.pop(a));
    if (scene.enemies) {
      scene.physics.add.overlap(this.group, scene.enemies.walkers, (a, e) => this.hit(this.arrowOf(a, e), this.enemyOf(a, e)));
      scene.physics.add.overlap(this.group, scene.enemies.fliers, (a, e) => this.hit(this.arrowOf(a, e), this.enemyOf(a, e)));
    }
    scene.events.once('shutdown', () => this.group.clear(true, true));
  }

  arrowOf(a, b) {
    return a.texture?.key === 'ptr' ? a : b;
  }
  enemyOf(a, b) {
    return a.texture?.key === 'ptr' ? b : a;
  }

  // enemies the arrows can be aimed at (override with `targets` for custom stages)
  targets() {
    const s = this.s;
    const list = (s.enemies?.list || []).filter((e) => e.active && !e.dead);
    if (s.sea?.boss?.alive) list.push(s.sea.boss.sprite);
    return list;
  }

  fire() {
    const s = this.s;
    const now = s.time.now;
    if (now < this.next) return;
    this.next = now + this.rate;
    const o = this.source();
    let ang = o.dir < 0 ? Math.PI : 0;
    let best = null;
    let bd = this.range;
    this.targets().forEach((t) => {
      const d = Phaser.Math.Distance.Between(o.x, o.y, t.x, t.y);
      const ahead = o.free ? true : (t.x - o.x) * o.dir > -20;
      if (d < bd && ahead) {
        bd = d;
        best = t;
      }
    });
    if (best) ang = Math.atan2(best.y - o.y, best.x - o.x);
    const a = this.group.create(o.x, o.y, 'ptr', this.n++ % PTR_COLORS.length).setDepth(8);
    a.body.setSize(8, 8).setOffset(2, 4);
    a.setRotation(ang + (3 * Math.PI) / 4);
    a.setVelocity(Math.cos(ang) * this.speed, Math.sin(ang) * this.speed);
    a.born = now;
    sfx('throw');
  }

  pop(a) {
    if (!a.active) return;
    burst(this.s, a.x, a.y, { n: 4, spread: 10, colors: [0xfcfcfc, 0xfca044] });
    a.destroy();
  }

  hit(a, e) {
    if (!a.active || !e.active || e.dead) return;
    if (e.type === 'piranha' && e.visibleHeight < 6) return;
    this.pop(a);
    e.hp = (e.hp ?? 1) - 1;
    if (e.hp <= 0) this.s.enemies.die(e, 'fall');
    else e.setTintFill(0xffffff), this.s.time.delayedCall(70, () => e.active && e.clearTint());
  }

  update(time, holding) {
    if (holding) this.fire();
    this.group.children.each((a) => a.active && time - a.born > 1400 && a.destroy());
  }
}
