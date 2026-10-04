import Phaser from 'phaser';
import { PHYSICS as P, COFFEE, FX as FXCFG, ENEMIES } from '../config.js';
import { MovementController } from '../systems/MovementController.js';

const WALK_CYCLE = [1, 0, 2, 0];
const FRAME = { idle: 0, jump: 3, skid: 4 };

/**
 * The hero. A hidden physics Zone is the collision body (so squash & stretch never
 * distorts the hitbox) and a Sprite follows it for visuals. Movement rules live in
 * MovementController; this class connects them to Phaser, audio and juice.
 */
export class Player {
  constructor(scene, x, y, sv) {
    this.scene = scene;
    this.sv = sv;                 // services: { input, audio, state, save }
    this.ctrl = new MovementController(P);
    const { width, height } = P.hitbox;
    this.h = height;

    this.zone = scene.add.zone(x, y - height / 2, width, height);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body;
    this.body.setCollideWorldBounds(true);

    this.tier = sv.state.tier;
    this.sprite = scene.add.sprite(x, y, `hero_t${this.tier}`, FRAME.idle).setOrigin(0.5, 1).setDepth(5);
    this.aura = scene.add.ellipse(x, y - 14, 24, 36, COFFEE.glowColor, 0.5).setDepth(4.9).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);

    this.sx = 1; this.sy = 1;     // squash & stretch scale
    this.animT = 0;
    this.yOffset = 0;             // visual sink offset used by pipe animations
    this.locked = false;
    this.facing = 1;
    this.wasOnGround = false;
    this.dustTimer = 0;
    this.platformContact = false; // set by the moving-platform collider each physics step
    this.invulnUntil = 0;
  }

  get x() { return this.body.center.x; }
  get feetY() { return this.body.bottom; }
  // blocked.down is set only by solid tiles; touching.down would also be set by pickup overlaps.
  // Moving platforms are bodies, not tiles, so they report contact through `platformContact`.
  get onGround() { return this.body.blocked.down || this.platformContact; }
  get invulnerable() { return this.scene.time.now < this.invulnUntil; }
  get coffee() { return this.sv.state.coffeeActive; }

  setTier(tier) {
    this.tier = tier;
    this.sprite.setTexture(`hero_t${tier}`);
    this.sx = 1.4; this.sy = 0.7;
    this.scene.fx.burst(this.x, this.feetY - 16, { count: 14, speed: 90, gravity: 0, life: 500 });
  }

  update(dt, input) {
    const { audio } = this.sv;
    const calm = this.scene.sv.save.settings.reducedMotion;
    const coffee = this.coffee;

    if (!this.locked) {
      const inp = { dir: input.dir, run: input.isDown('run'), jumpPressed: input.justPressed('jump'), jumpHeld: input.isDown('jump') };
      const mods = { speedMult: coffee ? COFFEE.speedMult : 1, canAirJump: coffee && COFFEE.doubleJump };
      const out = this.ctrl.step(
        { vx: this.body.velocity.x, vy: this.body.velocity.y, onGround: this.onGround, ceiling: this.body.blocked.up },
        inp, mods, dt,
      );
      this.body.setVelocity(out.vx, out.vy);
      this.facing = this.ctrl.facing;
      for (const e of out.events) this.#onEvent(e);

      // dust while skidding / running
      this.dustTimer -= dt;
      if (this.onGround && this.dustTimer <= 0 && (this.ctrl.skidding || (inp.run && Math.abs(out.vx) > P.runSpeed * 0.9))) {
        this.scene.fx.dust(this.x - this.facing * 4, this.feetY, this.facing, 2);
        this.dustTimer = 0.09;
      }
    }

    // ---- visuals -------------------------------------------------------------
    const vx = this.body.velocity.x;
    let frame = FRAME.idle;
    if (!this.onGround) frame = FRAME.jump;
    else if (this.ctrl.skidding) frame = FRAME.skid;
    else if (Math.abs(vx) > 8) {
      this.animT += dt * (5 + (Math.abs(vx) / P.walkSpeed) * 3);
      frame = WALK_CYCLE[Math.floor(this.animT) % 4];
    } else this.animT = 0;
    this.sprite.setFrame(frame);
    this.sprite.setFlipX(this.facing < 0);

    const k = Math.min(1, dt * 14);
    this.sx += (1 - this.sx) * k; this.sy += (1 - this.sy) * k;
    this.sprite.setScale(calm ? 1 : this.sx, calm ? 1 : this.sy);
    this.sprite.setPosition(Math.round(this.x), Math.round(this.feetY) + this.yOffset);

    // blink while invulnerable after a respawn
    this.sprite.setAlpha(this.invulnerable ? (calm ? 0.6 : (Math.floor(this.scene.time.now / 80) % 2 ? 0.35 : 1)) : 1);
    this.platformContact = false;

    // coffee glow
    this.aura.setVisible(coffee && !this.locked);
    if (coffee) {
      const pulse = calm ? 0.4 : 0.35 + 0.15 * Math.sin(this.scene.time.now / 90);
      this.aura.setAlpha(pulse).setPosition(this.sprite.x, this.sprite.y - 14);
    }
  }

  #onEvent(e) {
    const { audio } = this.sv;
    const fx = this.scene.fx;
    switch (e.type) {
      case 'jump':
        audio.sfx(e.long ? 'longjump' : 'jump');
        if (FXCFG.squash) { this.sx = 0.75; this.sy = 1.3; }
        fx.dust(this.x, this.feetY, 0, 3);
        break;
      case 'airjump':
        audio.sfx('airjump');
        if (FXCFG.squash) { this.sx = 0.8; this.sy = 1.25; }
        fx.burst(this.x, this.feetY, { count: 6, speed: 40, gravity: 0, life: 250, colors: ['#F8D878', '#FCFCFC'] });
        break;
      case 'land': {
        const f = Math.min(1, e.speed / 320);
        if (e.speed > 60) {
          audio.sfx('land');
          if (FXCFG.squash) { this.sx = 1 + 0.35 * f; this.sy = 1 - 0.3 * f; }
          fx.dust(this.x, this.feetY, 0, 3 + Math.round(f * 3));
        }
        if (FXCFG.shakeOnHardLand && e.speed > FXCFG.hardLandSpeed) fx.shake();
        break;
      }
      case 'bump': audio.sfx('bump'); break;
      default: break;
    }
  }

  /** Bounce off a stomped enemy; holding jump bounces higher. */
  bounce(held) {
    this.body.setVelocityY(-(held ? ENEMIES.stompBounceHeld : ENEMIES.stompBounce));
    // without jump held the bounce is a fixed hop (no variable-height cut); holding jump lets you cut it short by releasing
    this.ctrl.jumping = true; this.ctrl.cutDone = !held; this.ctrl.coyote = 0; this.ctrl.airJumpUsed = false;
    if (FXCFG.squash) { this.sx = 0.8; this.sy = 1.25; }
  }

  /** Stand still, no collisions (cutscenes, pipes, transitions). */
  lock() {
    this.locked = true;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
  }
  unlock() { this.locked = false; this.body.enable = true; this.ctrl.reset(); }

  /** Sink into a pipe, then call done(). */
  enterPipe(done) {
    this.lock();
    this.sv.audio.sfx('pipe');
    this.scene.tweens.add({ targets: this, yOffset: 30, duration: this.scene.sv.save.settings.reducedMotion ? 150 : 520, ease: 'Linear', onComplete: done });
  }
  /** Rise out of a pipe, then give control back. */
  emerge(done) {
    this.lock();
    this.yOffset = 30;
    this.sv.audio.sfx('pipe');
    this.scene.tweens.add({
      targets: this, yOffset: 0, duration: this.scene.sv.save.settings.reducedMotion ? 150 : 520, ease: 'Linear',
      onComplete: () => { this.unlock(); done && done(); },
    });
  }

  teleport(x, feetY) {
    // body.reset() positions the Zone by its centre (origin 0.5)
    this.zone.setPosition(x, feetY - this.h / 2);
    this.body.reset(x, feetY - this.h / 2);
    this.body.setVelocity(0, 0);
    this.ctrl.reset();
  }
}
