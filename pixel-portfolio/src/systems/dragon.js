// World 6 "Dragon's Lair": THE DEADLINE DRAGON.
// Cycle: idle -> wind-up (telegraph) -> breath (floor flames / fireball volley / ember rain) -> tired.
// Stomp its head ONLY while it is tired. Each hit reveals one line of the story.
import Phaser from 'phaser';
import { save, persist } from './save.js';
import resume from '../data/resume.json';
import { burst } from '../ui/pixel.js';
import { PointerPower } from './mouse.js';
import { sfx, music } from './audio.js';

const CHIP_NEED = 4; // pointer-arrow hits per dragon life

const NAME = 'THE DEADLINE DRAGON';
const GATE_ROWS = [3, 4, 5, 6, 7, 8, 9, 10, 11];

export class DragonBoss {
  constructor(scene) {
    this.s = scene;
    const cfg = scene.level.dragon;
    const diff = save.difficulty ?? 1;
    this.slow = [1.25, 1, 0.82][diff]; // time multiplier: relaxed = slower dragon
    this.max = 5 + (diff === 2 ? 1 : 0) - (diff === 0 ? 1 : 0);
    this.hp = this.max;
    this.hits = 0;
    this.state = 'sleep';
    this.done = save.dragonDown;
    this.cards = resume.dragonCards;
    this.invuln = 0;
    this.count = 0;
    this.chip = 0;
    this.attack = 'wave';
    this.since = 0;
    this.x = cfg.col * 16 + 8;
    this.y = 192 - 32;
    this.mouthX = this.x - 40;
    this.mouthY = this.y + 6;
    this.floorY = 192;
    this.arenaLeft = 11 * 16;

    const phys = scene.physics;
    this.hazards = phys.add.group({ allowGravity: false });
    this.balls = phys.add.group({ allowGravity: true });
    this.gates = phys.add.staticGroup();
    this.gateTiles = [];

    if (!this.done) {
      this.gateTiles = GATE_ROWS.map((r) => this.gates.create(cfg.gateCol * 16 + 8, r * 16 + 8, 'tile-gate').setDepth(3));
      this.sprite = scene.add.sprite(this.x, this.y, 'dragon', 0).setDepth(4);
      this.sprite.anims.play('dragon-idle');
      // hit zones: the head is the weak spot, the body is just dangerous
      this.head = scene.add.zone(this.x - 48 + 4 + 18, this.y - 32 + 12 + 16, 36, 32);
      this.body = scene.add.zone(this.x - 48 + 40 + 26, this.y - 32 + 18 + 23, 52, 46);
      phys.add.existing(this.head, true);
      phys.add.existing(this.body, true);
      phys.add.overlap(scene.player, this.head, () => this.onHead());
      phys.add.overlap(scene.player, this.body, () => scene.hurtPlayer(this.x));
      this.bar();
      scene.registry.set('hudInfo', 'BOSS');
      scene.pointerPower = new PointerPower(scene, this);
    } else {
      scene.registry.set('hudInfo', 'DRAGON DOWN');
    }
    phys.add.collider(scene.player, this.gates);
    phys.add.overlap(scene.player, this.hazards, (_, h) => h.dmg && scene.hurtPlayer(h.x));
    phys.add.overlap(scene.player, this.balls, (_, b) => {
      if (b.dead) return;
      this.explode(b);
      scene.hurtPlayer(b.x);
    });
    phys.add.collider(this.balls, scene.solids, (b) => this.explode(b));
  }

  bar() {
    this.s.registry.set('bossBar', { name: NAME, hp: this.hp, max: this.max, chip: this.chip / CHIP_NEED, ammo: this.s.pointerPower?.ammo ?? 6, ammoMax: 6 });
  }

  t(ms) {
    return ms * this.slow;
  }

  // ------------------------------------------------------------------ player contact
  onHead() {
    const { s } = this;
    const p = s.player;
    const now = s.time.now;
    if (this.state === 'dead' || this.state === 'sleep') return;
    const falling = p.body.velocity.y > -30 && p.body.bottom <= this.head.body.top + 14;
    if (this.state === 'tired' && falling && now > this.invuln) return this.hit();
    s.hurtPlayer(this.x);
  }

  // a pointer arrow landed
  onArrow(a) {
    const { s } = this;
    if (this.state === 'dead' || this.state === 'sleep' || this.done) return;
    s.pointerPower.pop(a);
    this.sprite.setTintFill(0xffffff);
    s.time.delayedCall(60, () => this.state !== 'tired' && this.sprite.active && this.sprite.clearTint());
    if (s.time.now < this.invuln) return;
    this.chip++;
    s.popText(a.x, a.y - 8, `${this.chip}/${CHIP_NEED}`);
    if (this.chip >= CHIP_NEED) return this.hit(true);
    this.bar();
  }

  hit(byArrows = false) {
    const { s } = this;
    const p = s.player;
    this.invuln = s.time.now + (byArrows ? 900 : 1300);
    this.chip = 0;
    sfx('boss');
    this.hp--;
    this.hits++;
    this.bar();
    if (!byArrows) {
      p.setVelocityY(-300);
      s.hitStop(110);
    }
    s.cameras.main.shake(260, 0.012);
    burst(s, this.x - 30, this.y - 10, { n: 22, spread: 40, colors: [0xf83800, 0xf8d878, 0xfcfcfc] });
    s.popText(this.x - 30, this.y - 40, 'HIT!');
    s.award();
    const card = this.cards[Math.min(this.hits - 1, this.cards.length - 1)];
    s.game.events.emit('fact', {
      icon: 'badge',
      title: `DRAGON HIT ${this.hits}/${this.max}`,
      label: 'DEADLINE',
      tag: `${this.hits}/${this.max}`,
      text: card,
    });
    this.clearHazards();
    this.setState('hurt');
    this.sprite.anims.play('dragon-hurt');
    this.sprite.setTint(0xffffff);
    s.tweens.add({ targets: this.sprite, x: this.x + 4, yoyo: true, repeat: 6, duration: 40 });
    if (this.hp <= 0) return this.defeat();
    s.time.delayedCall(this.t(1000), () => {
      this.sprite.clearTint();
      if (this.state === 'hurt') this.toIdle();
    });
  }

  // ------------------------------------------------------------------ state machine
  setState(st) {
    this.state = st;
    this.since = this.s.time.now;
  }

  toIdle() {
    this.setState('idle');
    this.sprite.setPosition(this.x, this.y).clearTint();
    this.sprite.anims.play('dragon-idle');
  }

  update(time) {
    const { s } = this;
    if (this.done || this.state === 'dead') return;
    const p = s.player;
    const el = time - (this.since || time);

    if (this.state === 'sleep') {
      if (p.x > (this.x - 48) - 26 * 16) {
        this.setState('roar');
        sfx('roar');
        music('boss');
        s.game.events.emit('banner', `${NAME}!\nSURVIVE THE FIRE. STOMP THE HEAD.`);
        s.cameras.main.shake(900, 0.008);
        s.tweens.add({ targets: this.sprite, scale: 1.08, yoyo: true, repeat: 3, duration: 160 });
        s.registry.set('hudInfo', `DRAGON ${this.hp}/${this.max}`);
      }
      return;
    }
    s.registry.set('hudInfo', `DRAGON ${this.hp}/${this.max}`);
    s.pointerPower.update(time);
    if (s.registry.get('bossBar')?.ammo !== s.pointerPower.ammo) this.bar();
    this.sprite.setPosition(this.sprite.x, this.state === 'tired' ? this.y + 6 : this.y);

    if (this.state === 'roar' && el > 1600) this.toIdle();
    else if (this.state === 'idle' && el > this.t(1300 - this.hits * 110)) {
      this.setState('windup');
      this.sprite.anims.play('dragon-windup');
      // alternate the attack; later hits add the ember rain
      const pool = this.hits < 2 ? ['wave', 'balls'] : ['wave', 'balls', 'rain'];
      this.attack = pool[this.count++ % pool.length];
    } else if (this.state === 'windup') {
      this.sprite.setTint(Math.floor(time / 90) % 2 ? 0xffb090 : 0xffffff);
      if (el > this.t(850)) {
        this.sprite.clearTint();
        this.setState('breath');
        this.sprite.anims.play('dragon-breath');
        this.fire();
      }
    } else if (this.state === 'breath' && el > this.t(1500)) {
      this.setState('tired');
      this.sprite.anims.stop();
      this.sprite.setFrame(0).setTint(0xb8b8ff);
      s.popText(this.x - 30, this.y - 46, 'STOMP HIS HEAD!');
    } else if (this.state === 'tired' && el > this.t(3600)) {
      this.sprite.clearTint();
      this.toIdle();
    }
  }

  // ------------------------------------------------------------------ attacks
  fire() {
    const { s } = this;
    sfx('fire');
    s.cameras.main.shake(200, 0.004);
    if (this.attack === 'wave') this.floorWave();
    else if (this.attack === 'balls') this.fireballs();
    else this.emberRain();
  }

  floorWave() {
    const { s } = this;
    const n = Math.floor((this.mouthX - this.arenaLeft) / 16);
    for (let i = 0; i < n; i++) {
      s.time.delayedCall(i * 55, () => {
        if (this.state === 'dead') return;
        const f = this.hazards.create(this.mouthX - i * 16, this.floorY - 8, 'flame', 0).setDepth(5);
        f.dmg = true;
        f.body.setSize(12, 12).setOffset(2, 4);
        f.anims.play('flame-burn');
        f.setAlpha(0.95);
        s.tweens.add({ targets: f, alpha: 0, delay: this.t(900), duration: 300, onComplete: () => f.destroy() });
      });
    }
  }

  fireballs() {
    const { s } = this;
    const count = 3 + (this.hits > 2 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      s.time.delayedCall(i * 260, () => {
        if (this.state === 'dead') return;
        const b = this.balls.create(this.mouthX, this.mouthY, 'fireball', 0).setDepth(5);
        b.body.setSize(8, 8).setOffset(2, 2);
        b.anims.play('fireball-spin');
        b.body.setGravityY(-300); // net gravity ~ +600 total? (world 900 - 300)
        b.setVelocity(-(100 + i * 45), -(150 + i * 20));
        b.dead = false;
      });
    }
  }

  emberRain() {
    const { s } = this;
    for (let i = 0; i < 7; i++) {
      s.time.delayedCall(i * 220, () => {
        if (this.state === 'dead') return;
        const x = Phaser.Math.Between(this.arenaLeft + 20, this.mouthX - 30);
        const b = this.balls.create(x, 24, 'fireball', 0).setDepth(5);
        b.body.setSize(8, 8).setOffset(2, 2);
        b.anims.play('fireball-spin');
        b.setVelocity(0, 40);
        b.dead = false;
      });
    }
  }

  explode(b) {
    if (b.dead) return;
    b.dead = true;
    burst(this.s, b.x, b.y, { n: 8, spread: 16, colors: [0xf83800, 0xf8d878] });
    b.destroy();
  }

  clearHazards() {
    this.hazards.clear(true, true);
    this.balls.clear(true, true);
  }

  defeat() {
    const { s } = this;
    this.setState('dead');
    sfx('win');
    music('play', 3);
    this.sprite.anims.play('dragon-hurt');
    s.registry.set('bossBar', null);
    s.pointerPower.clear();
    s.registry.set('hudInfo', 'DRAGON DOWN');
    // slow-motion blow-up
    for (let i = 0; i < 12; i++) {
      s.time.delayedCall(i * 170, () => {
        burst(s, this.x - 40 + Math.random() * 90, this.y - 20 + Math.random() * 50, { n: 14, spread: 32, colors: [0xf83800, 0xf8d878, 0xfcfcfc, 0xfca044] });
        s.cameras.main.shake(120, 0.008);
      });
    }
    s.tweens.add({ targets: this.sprite, alpha: 0, scale: 0.4, y: this.y + 20, delay: 1500, duration: 800, ease: 'Quad.in' });
    s.tweens.add({ targets: this.sprite, angle: 8, yoyo: true, repeat: 8, duration: 90 });
    s.time.delayedCall(2300, () => {
      this.sprite.destroy();
      this.head.destroy();
      this.body.destroy();
    });
    s.time.delayedCall(900, () => s.game.events.emit('banner', 'DEADLINE MET!\nTHE DRAGON IS DEFEATED'));
    save.dragonDown = true;
    persist();
    for (let i = 0; i < 5; i++) s.award();
    s.time.delayedCall(2200, () => {
      this.gateTiles.forEach((t, i) => {
        s.tweens.add({ targets: t, y: t.y - 40, alpha: 0, delay: i * 40, duration: 400, onComplete: () => t.destroy() });
        this.gates.remove(t);
        t.body.enable = false;
      });
    });
  }
}
