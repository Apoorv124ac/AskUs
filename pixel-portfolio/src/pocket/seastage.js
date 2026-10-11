// Stage 3 (underwater): fish carry Apoorv's skills, the Fish Dragon guards the exit.
// Beat a carrier fish to reveal a skill. Hit the dragon three times for the last three skills.
import Phaser from 'phaser';
import { burst } from '../ui/pixel.js';
import { sfx, music } from '../systems/audio.js';
import { SKILLS } from './content.js';

const GATE_ROWS = [3, 4, 5, 6, 7, 8, 9, 10, 11];

export class SeaStage {
  constructor(scene) {
    this.s = scene;
    this.cfg = scene.level.sea;
    this.got = new Set();
    this.onDown = (e) => e.skill !== undefined && this.reveal(e.skill, e.x, e.y);
    scene.events.on('enemy-down', this.onDown);
    scene.events.once('shutdown', () => scene.events.off('enemy-down', this.onDown));
    this.gates = scene.physics.add.staticGroup();
    this.gateTiles = GATE_ROWS.map((r) => this.gates.create(this.cfg.gateCol * 16 + 8, r * 16 + 8, 'tile-gate').setDepth(3));
    scene.physics.add.collider(scene.player, this.gates);
    this.boss = new SeaBoss(scene, this);
    this.hud();
  }

  hud() {
    this.s.registry.set('hudInfo', `SKILLS ${this.got.size}/${SKILLS.length}`);
  }

  reveal(i, x, y) {
    const s = this.s;
    if (this.got.has(i) || !SKILLS[i]) return;
    this.got.add(i);
    s.popText(x, y - 10, 'SKILL!');
    s.game.events.emit('fact', { icon: 'badge', title: `SKILL ${this.got.size}/${SKILLS.length}`, label: SKILLS[i].name, tag: 'SKILL', text: SKILLS[i].text });
    s.award();
    this.hud();
  }

  openGate() {
    const s = this.s;
    this.gateTiles.forEach((t, i) => {
      this.gates.remove(t);
      t.body.enable = false;
      s.tweens.add({ targets: t, y: t.y - 40, alpha: 0, delay: i * 40, duration: 400, onComplete: () => t.destroy() });
    });
  }

  update(time, delta) {
    this.boss.update(time, delta);
  }
}

class SeaBoss {
  constructor(scene, stage) {
    this.s = scene;
    this.stage = stage;
    const cfg = stage.cfg;
    this.x0 = cfg.arena[0] * 16;
    this.x1 = cfg.arena[1] * 16;
    this.max = 6;
    this.hp = this.max;
    this.alive = true;
    this.state = 'sleep';
    this.since = 0;
    this.invuln = 0;
    this.nextAttack = 0;
    this.t = 0;
    const sp = scene.physics.add.sprite(this.x1 - 40, 90, 'pk-seadragon', 0).setDepth(4);
    sp.body.setAllowGravity(false).setSize(46, 30).setOffset(8, 10);
    sp.anims.play('pk-sea-swim');
    this.sprite = sp;
    this.orbs = scene.physics.add.group({ allowGravity: false });
    scene.physics.add.overlap(scene.player, sp, () => this.state !== 'sleep' && this.alive && scene.hurtPlayer(sp.x));
    scene.physics.add.overlap(scene.player, this.orbs, (_, o) => {
      scene.hurtPlayer(o.x);
      this.popOrb(o);
    });
    if (scene.gun) {
      scene.physics.add.overlap(scene.gun.group, sp, (a, b) => {
        const arrow = a.texture?.key === 'ptr' ? a : b;
        if (arrow.active && this.state !== 'sleep') {
          scene.gun.pop(arrow);
          this.hit();
        }
      });
      scene.physics.add.overlap(scene.gun.group, this.orbs, (a, b) => {
        const arrow = a.texture?.key === 'ptr' ? a : b;
        const orb = a.texture?.key === 'ptr' ? b : a;
        scene.gun.pop(arrow);
        this.popOrb(orb);
      });
    }
  }

  bar() {
    this.s.registry.set('bossBar', { name: 'THE FISH DRAGON', hp: this.hp, max: this.max });
  }

  popOrb(o) {
    if (!o.active) return;
    burst(this.s, o.x, o.y, { n: 5, spread: 10, colors: [0xa8e0ff, 0xfcfcfc] });
    o.destroy();
  }

  hit() {
    const s = this.s;
    const now = s.time.now;
    if (!this.alive || now < this.invuln) return;
    this.invuln = now + 520;
    this.hp--;
    this.bar();
    sfx('boss');
    s.cameras.main.shake(160, 0.007);
    burst(s, this.sprite.x - 20, this.sprite.y, { n: 12, spread: 30, colors: [0xa8e0ff, 0xfcfcfc, 0x58d8c8] });
    s.popText(this.sprite.x - 20, this.sprite.y - 26, 'HIT!');
    this.sprite.anims.play('pk-sea-hurt');
    this.sprite.setTintFill(0xffffff);
    s.time.delayedCall(140, () => {
      if (!this.alive) return;
      this.sprite.clearTint();
      this.sprite.anims.play('pk-sea-swim');
    });
    if (this.hp === 4) this.stage.reveal(6, this.sprite.x, this.sprite.y);
    if (this.hp === 2) this.stage.reveal(7, this.sprite.x, this.sprite.y);
    if (this.hp <= 0) this.defeat();
  }

  spit() {
    const s = this.s;
    const p = s.player;
    const base = Math.atan2(p.y - 8 - this.sprite.y, p.x - this.sprite.x);
    [-0.28, 0, 0.28].forEach((d, i) => {
      s.time.delayedCall(i * 160, () => {
        if (!this.alive) return;
        const o = this.orbs.create(this.sprite.x - 26, this.sprite.y + 2, 'pk-orb', 0).setDepth(5).setScale(1.6);
        o.body.setSize(6, 6).setOffset(1, 1);
        o.anims.play('pk-orb-spin');
        o.setVelocity(Math.cos(base + d) * 92, Math.sin(base + d) * 92);
        o.born = s.time.now;
        sfx('fire');
      });
    });
  }

  defeat() {
    const s = this.s;
    this.alive = false;
    this.sprite.body.enable = false;
    this.orbs.clear(true, true);
    s.registry.set('bossBar', null);
    s.registry.set('hudInfo', `SKILLS ${this.stage.got.size}/${this.stage.got.size}`);
    sfx('win');
    for (let i = 0; i < 9; i++) {
      s.time.delayedCall(i * 170, () => {
        const b = s.add.sprite(this.sprite.x - 24 + Math.random() * 60, this.sprite.y - 14 + Math.random() * 34, 'pk-boom', 0).setDepth(9).setScale(1.6);
        b.anims.play('pk-boom-burn');
        b.once('animationcomplete', () => b.destroy());
        s.cameras.main.shake(100, 0.006);
      });
    }
    s.tweens.add({ targets: this.sprite, alpha: 0, angle: 18, y: this.sprite.y + 30, delay: 1200, duration: 800, onComplete: () => this.sprite.destroy() });
    this.stage.reveal(8, this.sprite.x, this.sprite.y);
    s.time.delayedCall(900, () => s.game.events.emit('banner', 'FISH DRAGON DOWN!\nTHE WAY IS OPEN'));
    s.time.delayedCall(1900, () => this.stage.openGate());
    music('cave');
  }

  update(time) {
    if (!this.alive) return;
    const s = this.s;
    const p = s.player;
    const sp = this.sprite;
    this.orbs.children.each((o) => o.active && time - o.born > 4200 && o.destroy());
    if (this.state === 'sleep') {
      if (p.x > this.x0 - 90) {
        this.state = 'swim';
        this.since = time;
        this.nextAttack = time + 1800;
        this.bar();
        sfx('roar');
        music('boss');
        s.game.events.emit('banner', 'THE FISH DRAGON!\nSHOOT IT WITH ARROWS');
        s.cameras.main.shake(600, 0.006);
      }
      return;
    }
    this.t += 0.016;
    const cx = (this.x0 + this.x1) / 2 + 28;
    const tx = cx + Math.sin(this.t * 0.55) * (this.x1 - this.x0) * 0.32;
    const ty = 84 + Math.sin(this.t * 0.9 + 1) * 46;
    sp.setVelocity((tx - sp.x) * 1.6, (ty - sp.y) * 1.6);
    if (this.state === 'swim' && time > this.nextAttack) {
      this.state = 'windup';
      this.since = time;
      sp.anims.play('pk-sea-windup');
    } else if (this.state === 'windup') {
      sp.setTint(Math.floor(time / 90) % 2 ? 0xffb090 : 0xffffff);
      if (time - this.since > 760) {
        sp.clearTint();
        this.spit();
        this.state = 'swim';
        this.nextAttack = time + 2300;
        sp.anims.play('pk-sea-swim');
      }
    }
  }
}
