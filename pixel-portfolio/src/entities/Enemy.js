import Phaser from 'phaser';
import { ENEMIES as E } from '../config.js';

/**
 * Office enemies. Stomp them from above to defeat them; touching them from the side/below costs coins
 * and sends you back to the checkpoint. `mult` scales speeds with the world's difficulty.
 *
 *   bug      patrols, turns at walls and ledges            (World 1+)
 *   clock    "Deadline Clock": same, but fast               (World 2+)
 *   invite   "Meeting Invite": flies a sine swoop            (World 3+)
 *   spam     "Spam Email": hops towards you                  (World 3+)
 *   printer  "Printer Jam": stands still, shoots paper       (World 4+)
 *   megabug / megaclock / megainvite: mini-bosses (3 stomps, brief invulnerability between hits)
 */
const DEFS = {
  bug:        { tex: 'enemy_bug',     fw: 16, w: 12, h: 10, mode: 'walk' },
  clock:      { tex: 'enemy_clock',   fw: 16, w: 12, h: 12, mode: 'walk' },
  invite:     { tex: 'enemy_invite',  fw: 16, w: 12, h: 12, mode: 'fly' },
  spam:       { tex: 'enemy_spam',    fw: 16, w: 12, h: 11, mode: 'hop' },
  printer:    { tex: 'enemy_printer', fw: 16, w: 14, h: 12, mode: 'shoot' },
  megabug:    { tex: 'boss_bug',      fw: 32, w: 24, h: 22, mode: 'boss', speed: E.boss.speed, hop: E.boss.hopEvery },
  megaclock:  { tex: 'boss_clock',    fw: 32, w: 24, h: 24, mode: 'boss', speed: E.boss.speed * 1.5, hop: E.boss.hopEvery * 1.3 },
  megainvite: { tex: 'boss_invite',   fw: 32, w: 24, h: 24, mode: 'boss', speed: E.boss.speed * 1.2, hop: E.boss.hopEvery * 0.8 },
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, feetY, kind, props = {}, mult = 1) {
    const d = DEFS[kind];
    if (!d) throw new Error('Unknown enemy kind: ' + kind);
    super(scene, x, feetY - d.fw / 2, d.tex, 0);
    scene.add.existing(this); scene.physics.add.existing(this);
    this.kind = kind; this.def = d; this.mult = mult; this.props = props;
    this.boss = d.mode === 'boss';
    this.hp = this.boss ? E.boss.hp : 1;
    this.dead = false; this.invulnUntil = 0;
    this.dir = -1; this.t = 0; this.timer = Math.random() * 0.6;
    this.homeX = x; this.homeY = this.y;
    this.range = props.range ? props.range * 16 : 0;
    this.setDepth(5);
    const b = this.body;
    b.setSize(d.w, d.h); b.setOffset((d.fw - d.w) / 2, d.fw - d.h);
    if (d.mode === 'fly') b.setAllowGravity(false); else b.setGravityY(900);
    if (d.mode === 'shoot') { b.setImmovable(true); }
    b.setMaxVelocity(300, 400);
  }

  get cfg() { return E[this.kind] ?? E.bug; }

  edgeAhead() {
    const x = this.x + this.dir * (this.def.w / 2 + 3), y = this.body.bottom + 3;
    return !this.scene.solidAt(x, y);
  }

  update(dt) {
    if (this.dead) return;
    const b = this.body, p = this.scene.player, now = this.scene.time.now, d = this.def;
    this.t += dt; this.timer += dt;
    const onGround = b.blocked.down || b.touching.down;

    if (d.mode === 'walk' || d.mode === 'boss') {
      let sp = (d.speed ?? this.cfg.speed) * this.mult;
      if (this.boss) sp *= (1 + 0.25 * (E.boss.hp - this.hp)) * (this.props.boost ?? 1);
      if (b.blocked.left) this.dir = 1; else if (b.blocked.right) this.dir = -1;
      if (onGround && this.edgeAhead()) this.dir *= -1;
      if (this.range) { if (this.x < this.homeX - this.range) this.dir = 1; else if (this.x > this.homeX + this.range) this.dir = -1; }
      b.setVelocityX(this.dir * sp);
      if (this.boss && onGround && this.timer >= d.hop) { this.timer = 0; b.setVelocityY(-E.boss.hopVy); this.scene.audio?.sfx('bump'); }
      this.setFrame(Math.floor(this.t * (this.boss ? 4 : 6)) % 2);
    } else if (d.mode === 'fly') {
      const w = this.cfg.speed * this.mult;
      b.setVelocity(Math.cos(this.t * w) * this.cfg.rangeX * w, Math.cos(this.t * 2.3) * this.cfg.amplitudeY * 2.3);
      this.dir = Math.cos(this.t * w) >= 0 ? 1 : -1;
      this.setFrame(Math.floor(this.t * 6) % 2);
    } else if (d.mode === 'hop') {
      if (onGround) {
        b.setVelocityX(0);
        if (this.timer >= this.cfg.hopEvery / Math.sqrt(this.mult)) {
          this.timer = 0; this.dir = p.x < this.x ? -1 : 1;
          b.setVelocity(this.dir * this.cfg.hopVx * this.mult, -this.cfg.hopVy);
        }
      }
      this.setFrame(onGround ? 0 : 1);
    } else if (d.mode === 'shoot') {
      const near = Math.abs(p.x - this.x) < this.cfg.range && Math.abs(p.feetY - this.body.bottom) < 40;
      if (near) this.dir = p.x < this.x ? -1 : 1;
      if (near && this.timer >= this.cfg.fireEvery / Math.sqrt(this.mult)) { this.timer = 0; this.jam = now + 350; this.scene.firePaper(this); }
      this.setFrame(now < (this.jam ?? 0) ? 1 : 0);
    }
    this.setFlipX(this.dir < 0);
    if (this.boss) this.setAlpha(now < this.invulnUntil && Math.floor(now / 90) % 2 ? 0.4 : 1);
  }

  /** Called when the hero lands on top. Returns 'dead' | 'hurt' | 'bounce'. */
  stomp() {
    if (this.dead) return 'bounce';
    const now = this.scene.time.now;
    if (this.boss) {
      if (now < this.invulnUntil) return 'bounce';
      this.hp -= 1;
      if (this.hp <= 0) { this.defeat(); return 'dead'; }
      this.invulnUntil = now + E.boss.invulnMs;
      this.body.setVelocityY(-120);
      return 'hurt';
    }
    this.defeat();
    return 'dead';
  }

  defeat() {
    this.dead = true;
    this.body.enable = false;
    this.scene.events.emit('enemy-defeated', this);
    const calm = this.scene.sv.save.settings.reducedMotion;
    this.scene.fx.burst(this.x, this.y, { count: this.boss ? 22 : 8, speed: this.boss ? 110 : 70, colors: ['#F8D878', '#FCFCFC', '#F83800'], life: 450 });
    this.setFrame(0);
    this.scene.tweens.add({ targets: this, scaleY: 0.15, y: this.y + this.def.fw * 0.3, alpha: calm ? 0 : 0.9, duration: calm ? 80 : 160, onComplete: () => this.destroy() });
  }
}

/** Paper shot by a printer. Straight line; vanishes on walls. */
export class Paper extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, dir, speed) {
    super(scene, x, y, 'paper');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.body.setAllowGravity(false); this.body.setSize(6, 6);
    this.setDepth(6).setVelocityX(dir * speed);
    this.life = 4;
  }
  update(dt) {
    this.life -= dt;
    this.angle += 8;
    if (this.life <= 0 || this.scene.solidAt(this.x + Math.sign(this.body.velocity.x) * 4, this.y)) this.destroy();
  }
}
