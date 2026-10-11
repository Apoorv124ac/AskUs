import Phaser from 'phaser';
import { save } from '../systems/save.js';
import { sfx, music, duck } from '../systems/audio.js';
import { PTR_COLORS } from '../systems/mouse.js';
import { touch, showTouch } from '../systems/touch.js';
import { txt, burst, COLORS, viewCam } from '../ui/pixel.js';
import { TOOLS } from './content.js';
import { finishStage } from './flow.js';

// Stage 4 (software skills): fly a little plane, fire design arrows, shoot the six tool balloons.
// Enemies fly too and come straight for you. Crash and you restart the current wave, never the stage.
const W = 256;
const H = 224;
const WAVES = 6;

export default class PlaneScene extends Phaser.Scene {
  constructor() {
    super('Plane');
  }

  create() {
    viewCam(this);
    this._leaving = false;
    this.cameras.main.setBackgroundColor(0x58b6f2).fadeIn(300, 15, 15, 27);
    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    const reg = this.registry;
    reg.set('bossBar', null);
    reg.set('skillBars', null);
    reg.set('factsTotal', 0);
    reg.set('hudInfo', 'TOOLS 0/6');
    reg.set('playScene', 'Plane');
    this.got = new Set();
    this.wave = 0;
    this.hp = 5;
    this.maxHp = 5;
    this.invuln = 0;
    this.nextFire = 0;
    this.spawnLeft = 0;
    this.nextSpawn = 0;
    this.waveClearedAt = 0;
    this.state = 'intro';
    this.shotN = 0;

    // pixel sky: gradient, sun, three parallax layers (hills, far clouds, near clouds)
    const bg = this.add.graphics().setDepth(0);
    [[0x58b6f2, 0], [0x78c8f8, 60], [0x98d8fc, 110], [0xc8ecff, 160]].forEach(([c, y]) => bg.fillStyle(c).fillRect(0, y, W, H - y));
    this.add.circle(206, 38, 16, 0xfff0a0).setDepth(0.2).setStrokeStyle(3, 0xffe070);
    this.makeHills();
    this.hills1 = this.add.tileSprite(0, H - 64, W, 64, 'pk-hills1').setOrigin(0).setDepth(0.5);
    this.hills2 = this.add.tileSprite(0, H - 40, W, 40, 'pk-hills2').setOrigin(0).setDepth(0.6);
    this.clouds = [];
    for (let i = 0; i < 7; i++) {
      const c = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(14, 130), 'pk-cloud').setDepth(i % 2 ? 0.8 : 0.7).setAlpha(0.95).setScale(i % 2 ? 0.8 : 1.2);
      c.speed = i % 2 ? 22 : 12;
      this.clouds.push(c);
    }

    // the plane (with Apoorv's head in the cockpit)
    this.plane = this.physics.add.sprite(46, 100, 'pk-plane', 0).setDepth(5);
    this.plane.anims.play('pk-plane-fly');
    this.plane.body.setSize(30, 12).setOffset(5, 5);
    this.plane.body.setAllowGravity(false);
    this.plane.setCollideWorldBounds(true);
    this.pilot = this.add.sprite(46, 100, 'hero', 0).setDepth(5.2).setCrop(5, 2, 14, 13).setScale(0.62);
    this.physics.world.setBounds(4, 20, W - 8, H - 50);
    this.arrows = this.physics.add.group({ allowGravity: false });
    this.foes = this.physics.add.group({ allowGravity: false });
    this.balloons = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.arrows, this.foes, (a, e) => this.hitFoe(a.texture?.key === 'ptr' ? a : e, a.texture?.key === 'ptr' ? e : a));
    this.physics.add.overlap(this.arrows, this.balloons, (a, e) => this.hitBalloon(a.texture?.key === 'ptr' ? a : e, a.texture?.key === 'ptr' ? e : a));
    this.physics.add.overlap(this.plane, this.foes, (_, e) => this.crash(e));
    this.physics.add.overlap(this.plane, this.balloons, (_, e) => this.crash(e));

    // HUD pieces drawn here (hearts) - coins/xp come from the shared UI scene
    this.hearts = this.add.graphics().setDepth(20);
    this.drawHearts();
    this.bar = this.add.graphics().setDepth(20);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,X,Z,SPACE');
    this.input.addPointer(2);
    showTouch(true, { fire: true, plane: true });
    this.events.once('shutdown', () => showTouch(false));
    music('play', 5);
    this.events.once('shutdown', () => duck(false));

    this.time.delayedCall(500, () => this.game.events.emit('chapter', { title: 'STAGE 4', sub: 'SOFTWARE SKILLS IN THE AIR' }));
    this.time.delayedCall(2600, () => {
      this.game.events.emit('banner', 'SHOOT THE BALLOONS!\nEACH ONE HOLDS A TOOL');
      this.state = 'play';
      this.startWave();
    });
    this.explain = txt(this, 128, 34, 'MOVE WITH THE ARROWS. HOLD THROW TO FIRE.', { origin: 0.5, color: '#fcfcfc', depth: 25 });
    this.tweens.add({ targets: this.explain, alpha: 0, delay: 5200, duration: 600 });
  }

  makeHills() {
    if (this.textures.exists('pk-hills1')) return;
    const mk = (key, h, c1, c2, seed) => {
      const t = this.textures.createCanvas(key, 128, h);
      const c = t.getContext();
      c.imageSmoothingEnabled = false;
      for (let x = 0; x < 128; x++) {
        const top = Math.round(h * 0.45 + Math.sin(x / 128 * Math.PI * 2 * seed) * h * 0.22 + Math.sin(x / 9) * 2);
        c.fillStyle = c1;
        c.fillRect(x, top, 1, h - top);
        c.fillStyle = c2;
        c.fillRect(x, top, 1, 2);
      }
      // tiny pixel trees
      for (let i = 0; i < 7; i++) {
        const x = (i * 19 + seed * 5) % 124;
        c.fillStyle = '#2c8a3c';
        c.fillRect(x, h - 14, 5, 5);
        c.fillStyle = '#6a4220';
        c.fillRect(x + 2, h - 9, 1, 3);
      }
      t.refresh();
    };
    mk('pk-hills1', 64, '#7cc384', '#9ed79b', 1);
    mk('pk-hills2', 40, '#4fa85c', '#6fc26f', 2);
  }

  drawHearts() {
    this.hearts.clear();
    for (let i = 0; i < this.maxHp; i++) {
      this.hearts.fillStyle(i < this.hp ? 0xf83800 : 0x3a2030).fillRect(124 + i * 9, 3, 7, 7);
      if (i < this.hp) this.hearts.fillStyle(0xff9a8a).fillRect(125 + i * 9, 4, 2, 2);
    }
  }

  // the pause menu's "back to checkpoint": replay the current wave
  returnToCheckpoint() {
    this.hp = this.maxHp;
    this.drawHearts();
    this.foes.clear(true, true);
    this.balloons.children.each((b) => {
      b.label && b.label.destroy();
      b.destroy();
    });
    this.state = 'between';
    this.time.delayedCall(800, () => this.startWave());
  }

  // ---------------------------------------------------------------- waves
  startWave() {
    if (this.wave >= WAVES) return this.land();
    this.state = 'play';
    this.spawnLeft = 5 + this.wave * 2;
    this.nextSpawn = this.time.now + 700;
    this.balloonOut = false;
    this.balloonAt = Math.floor(this.spawnLeft * 0.6);
    this.registry.set('hudInfo', `TOOLS ${this.got.size}/${WAVES}  WAVE ${this.wave + 1}`);
  }

  spawnFoe() {
    const y = Phaser.Math.Between(34, H - 56);
    const kind = this.wave > 1 && Math.random() < 0.4 ? 'pk-drone' : 'pk-crow';
    const e = this.foes.create(W + 14, y, kind, 0).setDepth(4);
    e.anims.play(kind === 'pk-drone' ? 'pk-drone-fly' : 'pk-crow-fly');
    e.body.setSize(12, 9);
    e.kind = kind;
    e.hp = kind === 'pk-drone' ? 2 : 1;
    e.speed = 46 + this.wave * 6;
    e.chase = kind === 'pk-drone' ? 0.9 : 0.35;
    e.wob = Math.random() * 6;
  }

  spawnBalloon() {
    const tool = TOOLS[this.wave];
    const b = this.balloons.create(W + 16, Phaser.Math.Between(50, H - 90), 'pk-balloon', 0).setDepth(4);
    b.body.setSize(16, 22).setOffset(2, 1);
    b.setTint(tool.color);
    b.tool = this.wave;
    b.hp = 3;
    b.label = txt(this, b.x, b.y + 4, tool.name.split(' ').pop().slice(0, 7), { origin: 0.5, color: '#0f0f1b', bold: true, depth: 5, size: 6, shadow: false });
  }

  hitFoe(a, e) {
    if (!a.active || !e.active) return;
    this.pop(a);
    e.hp--;
    if (e.hp > 0) {
      e.setTintFill(0xffffff);
      this.time.delayedCall(70, () => e.active && e.clearTint());
      return;
    }
    this.explode(e.x, e.y);
    e.destroy();
    sfx('pop');
    this.award();
  }

  hitBalloon(a, b) {
    if (!a.active || !b.active) return;
    this.pop(a);
    b.hp--;
    b.setTintFill(0xffffff);
    this.time.delayedCall(70, () => b.active && b.setTint(TOOLS[b.tool].color));
    if (b.hp > 0) return;
    const t = TOOLS[b.tool];
    this.explode(b.x, b.y, 1.5);
    b.label.destroy();
    b.destroy();
    this.got.add(b.tool);
    this.award();
    sfx('fact');
    this.game.events.emit('fact', { icon: 'badge', title: `SKILL ${this.got.size}/${WAVES}`, label: t.name, tag: 'TOOL', text: t.text });
    this.registry.set('hudInfo', `TOOLS ${this.got.size}/${WAVES}`);
    // the rest of the wave flees, the next one starts after the card
    this.foes.clear(true, true);
    this.wave++;
    this.state = 'between';
    this.time.delayedCall(3200, () => this.startWave());
  }

  explode(x, y, k = 1) {
    const b = this.add.sprite(x, y, 'pk-boom', 0).setDepth(9).setScale(k);
    b.anims.play('pk-boom-burn');
    b.once('animationcomplete', () => b.destroy());
    this.cameras.main.shake(70, 0.003);
  }

  pop(a) {
    burst(this, a.x, a.y, { n: 3, spread: 8, colors: [0xfcfcfc, 0xfca044] });
    a.destroy();
  }

  award() {
    const reg = this.registry;
    reg.set('coins', reg.get('coins') + 1);
    reg.set('xp', reg.get('xp') + 1);
  }

  crash(e) {
    const now = this.time.now;
    if (now < this.invuln || this.state === 'land') return;
    this.invuln = now + 1400;
    if (e.active && e.kind) {
      this.explode(e.x, e.y);
      e.destroy();
    }
    this.hp--;
    sfx('hurt');
    this.cameras.main.shake(160, 0.008);
    this.drawHearts();
    this.tweens.add({ targets: [this.plane, this.pilot], alpha: 0.3, yoyo: true, repeat: 6, duration: 100, onComplete: () => [this.plane, this.pilot].forEach((o) => o.setAlpha(1)) });
    if (this.hp <= 0) {
      // never "game over": patch up and replay the current wave
      this.game.events.emit('banner', 'CRASH LANDING!\nTRY THIS WAVE AGAIN');
      this.hp = this.maxHp;
      this.drawHearts();
      this.foes.clear(true, true);
      this.balloons.children.each((b) => {
        b.label && b.label.destroy();
        b.destroy();
      });
      this.state = 'between';
      this.time.delayedCall(2200, () => this.startWave());
    }
  }

  land() {
    if (this.state === 'land') return;
    this.state = 'land';
    this.registry.set('hudInfo', 'ALL 6 TOOLS!');
    sfx('win');
    this.game.events.emit('banner', 'ALL TOOLS UNLOCKED!\nCLEAR FOR LANDING');
    this.tweens.add({ targets: this.plane, x: 150, y: 150, duration: 1800, ease: 'Sine.inOut' });
    finishStage(this, 4);
  }

  // ---------------------------------------------------------------- loop
  fire() {
    const now = this.time.now;
    if (now < this.nextFire) return;
    this.nextFire = now + 190;
    const a = this.arrows.create(this.plane.x + 20, this.plane.y + 2, 'ptr', this.shotN++ % PTR_COLORS.length).setDepth(8);
    a.body.setSize(8, 8).setOffset(2, 4);
    a.setRotation((3 * Math.PI) / 4 + 0);
    a.setVelocity(300, 0);
    a.born = now;
    sfx('throw');
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.hills1.tilePositionX += dt * 14;
    this.hills2.tilePositionX += dt * 30;
    this.clouds.forEach((c) => {
      c.x -= c.speed * dt;
      if (c.x < -40) {
        c.x = W + 40;
        c.y = Phaser.Math.Between(14, 130);
      }
    });
    if (this.state === 'land') {
      this.pilot.setPosition(this.plane.x + 2, this.plane.y - 3);
      return;
    }
    const k = this.cursors;
    const dx = (k.right.isDown || this.keys.D.isDown || touch.right ? 1 : 0) - (k.left.isDown || this.keys.A.isDown || touch.left ? 1 : 0);
    const dy = (k.down.isDown || this.keys.S.isDown || touch.down ? 1 : 0) - (k.up.isDown || this.keys.W.isDown || touch.up || touch.jump ? 1 : 0);
    const sp = 96;
    this.plane.body.setVelocity(dx * sp, dy * sp);
    this.plane.setAngle(dy * 8);
    this.pilot.setPosition(this.plane.x + 2, this.plane.y - 3);
    if (touch.fire || this.keys.X.isDown || this.keys.Z.isDown || this.keys.SPACE.isDown) this.fire();

    // spawn
    if (this.state === 'play') {
      if (this.spawnLeft > 0 && time > this.nextSpawn) {
        this.spawnFoe();
        this.spawnLeft--;
        this.nextSpawn = time + Math.max(520, 1150 - this.wave * 90);
        if (!this.balloonOut && this.spawnLeft <= this.balloonAt) {
          this.balloonOut = true;
          this.spawnBalloon();
        }
      }
    }
    const p = this.plane;
    this.foes.children.each((e) => {
      if (!e.active) return;
      const ty = p.y;
      e.body.setVelocity(-e.speed, Math.sign(ty - e.y) * Math.min(Math.abs(ty - e.y), 40) * e.chase + Math.sin(time / 300 + e.wob) * 10);
      if (e.x < -20) e.destroy();
    });
    this.balloons.children.each((b) => {
      if (!b.active) return;
      b.body.setVelocity(-24, Math.sin(time / 500 + b.tool) * 14);
      b.label.setPosition(b.x, b.y - 2);
      if (b.x < -24) {
        // the balloon got away: a new one floats in
        b.label.destroy();
        b.destroy();
        this.spawnBalloon();
      }
    });
    this.arrows.children.each((a) => a.active && (a.x > W + 10 || time - a.born > 1600) && a.destroy());
  }
}
