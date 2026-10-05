import Phaser from 'phaser';
import { PRINTER_BOSS as B, PALETTE as C } from '../config.js';
import dialogue from '../data/dialogue.json';

const FLOOR = 192;

/**
 * FINAL BOSS: the Printer Monster. It lobs paper jams at you (arc) and rolls Deadline clocks along the floor.
 * You fight back with the mouse tool (see Thrower): every paper plane that hits takes one point of HP.
 * Three phases (more HP lost = faster, more attacks). Planes also pop incoming jams (1 hit) and deadlines (2 hits).
 */
export class PrinterBoss {
  constructor(scene, x, feetY) {
    this.scene = scene;
    this.hp = this.maxHp = B.hp;
    this.phase = 0; this.dead = false; this.t = 0;
    this.jamTimer = 1.6; this.deadlineTimer = 3.6; this.flash = 0; this.fire = 0;

    this.sprite = scene.physics.add.sprite(x, feetY - 34, 'printer_boss', 0).setDepth(4);
    this.sprite.body.setAllowGravity(false); this.sprite.body.setImmovable(true);
    this.sprite.body.setSize(54, 56); this.sprite.body.setOffset(7, 10);
    this.homeY = this.sprite.y;
    this.jams = scene.physics.add.group();
    this.deadlines = scene.physics.add.group();
  }

  get frac() { return this.hp / this.maxHp; }

  update(dt) {
    if (this.dead) return;
    const s = this.scene, calm = s.sv.save.settings.reducedMotion, p = s.player;
    this.t += dt;
    this.sprite.y = this.homeY + (calm ? 0 : Math.sin(this.t * 2.2) * 2);
    this.fire = Math.max(0, this.fire - dt);
    this.sprite.setFrame(this.fire > 0 ? 1 : 0);

    this.jamTimer -= dt; this.deadlineTimer -= dt;
    if (this.jamTimer <= 0) { this.jamTimer = B.jamEvery[this.phase]; this.lobJam(p.x + Phaser.Math.Between(-18, 18)); if (this.phase === 2) { this.lobJam(p.x - 70); this.lobJam(p.x + 70); } }
    if (this.deadlineTimer <= 0) { this.deadlineTimer = B.deadlineEvery[this.phase]; this.rollDeadline(); }

    this.jams.getChildren().forEach((j) => { j.angle += 7; if (j.y > FLOOR - 4 || j.x < -20) { s.fx.burst(j.x, j.y, { count: 5, colors: [C.white, C.lgrey], gravity: 100, life: 250 }); j.destroy(); } });
    this.deadlines.getChildren().forEach((d) => { d.setFrame(Math.floor(this.t * 8) % 2); d.y = FLOOR - 8; if (d.x < -20) d.destroy(); });
  }

  lobJam(targetX) {
    const s = this.scene, x0 = this.sprite.x - 20, y0 = this.sprite.y - 16, t = 1.15, g = 320;
    const j = this.jams.create(x0, y0, 'jam').setDepth(6);
    j.body.setAllowGravity(true); j.body.setGravityY(g); j.body.setCircle(5, 2, 2);
    const vy = (FLOOR - 10 - y0 - 0.5 * g * t * t) / t;
    j.body.setVelocity((Phaser.Math.Clamp(targetX, 16, 240) - x0) / t * (B.jamSpeed / 80), vy);
    this.fire = 0.25; s.audio.sfx('bump');
  }

  rollDeadline() {
    const d = this.deadlines.create(this.sprite.x - 36, FLOOR - 8, 'deadline').setDepth(6);
    d.body.setAllowGravity(false); d.body.setSize(12, 12); d.body.setVelocityX(-B.deadlineSpeed);
    d.setData('hp', 2);
    this.fire = 0.25; this.scene.audio.sfx('boss');
  }

  damage(n = 1) {
    if (this.dead) return;
    const s = this.scene, calm = s.sv.save.settings.reducedMotion;
    this.hp = Math.max(0, this.hp - n);
    s.audio.sfx('bosshit');
    s.fx.burst(this.sprite.x + Phaser.Math.Between(-18, 18), this.sprite.y + Phaser.Math.Between(-20, 8), { count: 5, colors: [C.white, C.lgrey, C.yellow], gravity: 60, life: 300 });
    this.sprite.setTint(0xff8888); s.time.delayedCall(70, () => this.sprite.clearTint());
    if (!calm) s.fx.shake(40, 0.0025);
    const f = this.frac, ph = f <= B.phaseAt[1] ? 2 : f <= B.phaseAt[0] ? 1 : 0;
    if (ph !== this.phase) {
      this.phase = ph;
      s.audio.sfx('boss');
      s.fx.floatText(128, 52, ph === 1 ? dialogue.boss.phase2 : dialogue.boss.phase3, '#F83800');
      this.jamTimer = Math.min(this.jamTimer, 0.8);
    }
    if (this.hp <= 0) this.defeat();
  }

  defeat() {
    this.dead = true;
    const s = this.scene;
    this.jams.getChildren().forEach((j) => j.destroy());
    this.deadlines.getChildren().forEach((d) => d.destroy());
    s.audio.sfx('levelup');
    s.time.addEvent({ delay: 160, repeat: 10, callback: () => s.fx.burst(this.sprite.x + Phaser.Math.Between(-28, 28), this.sprite.y + Phaser.Math.Between(-28, 20), { count: 16, speed: 110, colors: [C.red, C.orange, C.yellow, C.white], life: 600, gravity: 60 }) });
    s.tweens.add({ targets: this.sprite, alpha: 0, y: this.sprite.y + 20, scaleY: 0.6, duration: 1800, delay: 400 });
    s.time.delayedCall(2100, () => s.bossDefeated());
  }
}

/**
 * The player's mouse tool. Aim with the mouse / finger and click or tap to throw paper planes; hold to auto-fire.
 * Keyboard-only: hold Enter / Space and the planes fly towards the boss.
 */
export class Thrower {
  constructor(scene) {
    this.scene = scene; this.cool = 0; this.shots = 0;
    this.planes = scene.physics.add.group({ allowGravity: false });
    this.reticle = scene.add.graphics().setDepth(95);
    scene.input.setDefaultCursor('crosshair');
    scene.events.once('shutdown', () => scene.input.setDefaultCursor('default'));
  }

  fire(tx, ty) {
    const s = this.scene, p = s.player;
    const x0 = p.x, y0 = p.feetY - 18, ang = Math.atan2(ty - y0, tx - x0);
    const pl = this.planes.create(x0, y0, 'plane').setDepth(7);
    pl.body.setSize(10, 6); pl.setRotation(ang);
    pl.body.setVelocity(Math.cos(ang) * B.planeSpeed, Math.sin(ang) * B.planeSpeed);
    pl.setData('life', 1.6);
    this.shots++;
    s.audio.sfx('throw');
  }

  update(dt, input) {
    const s = this.scene, ptr = s.input.activePointer, boss = s.boss;
    this.cool -= dt;
    const aim = ptr.isDown ? { x: ptr.worldX, y: ptr.worldY } : null;
    const keyFire = input.isDown('interact');
    if ((aim || keyFire) && this.cool <= 0 && !s.finished && !s.respawning) {
      const target = aim ?? (boss && !boss.dead ? { x: boss.sprite.x, y: boss.sprite.y - 8 } : { x: s.player.x + 80 * s.player.facing, y: s.player.feetY - 18 });
      this.fire(target.x, target.y);
      this.cool = B.planeCooldown;
    }
    // planes: cull off-screen / on walls / old
    for (const pl of this.planes.getChildren()) {
      const life = pl.getData('life') - dt; pl.setData('life', life);
      if (life <= 0 || pl.x < -12 || pl.x > 268 || pl.y < -12 || pl.y > 232 || s.solidAt(pl.x, pl.y)) pl.destroy();
    }
    // reticle follows the mouse (desktop only; touch devices just tap)
    const g = this.reticle; g.clear();
    if (!ptr.wasTouch) {
      const x = ptr.worldX, y = ptr.worldY;
      g.lineStyle(1, 0xfce0a8, 1).strokeCircle(x, y, 6); g.fillStyle(0xf83800, 1).fillRect(x - 1, y - 1, 2, 2);
      g.fillStyle(0xfcfcfc, 1).fillRect(x - 10, y, 4, 1).fillRect(x + 6, y, 4, 1).fillRect(x, y - 10, 1, 4).fillRect(x, y + 6, 1, 4);
    }
  }
}
