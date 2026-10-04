import { PHYSICS as P } from '../config.js';

const approach = (v, target, delta) =>
  v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);

/**
 * Pure platformer movement model (no Phaser). Feed it the current body state and the
 * player's input each frame; it returns the new velocity plus a list of events.
 * Keeping it engine-free makes the "feel" unit-testable (see tests/run.mjs).
 *
 * state : { vx, vy, onGround, ceiling }
 * input : { dir: -1|0|1, run: bool, jumpPressed: bool, jumpHeld: bool }
 * mods  : { speedMult: number, canAirJump: bool }   (coffee power-up)
 */
export class MovementController {
  constructor(cfg = P) {
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    this.coyote = 0;          // time left in which a ledge-jump is still allowed
    this.buffer = 0;          // time left in which an early jump press is remembered
    this.bufferLong = false;  // was Shift held when the buffered press happened?
    this.jumping = false;     // currently in a jump arc (enables variable height)
    this.cutDone = false;
    this.longJump = false;
    this.airJumpUsed = false;
    this.facing = 1;
    this.skidding = false;
    this.wasGround = false;
    this.lastVy = 0;
  }

  step(state, input, mods, dt) {
    const c = this.cfg;
    const events = [];
    let { vx, vy } = state;
    const { onGround } = state;
    const { dir, run, jumpPressed, jumpHeld } = input;

    // ---- timers -------------------------------------------------------------
    if (onGround) {
      if (!this.wasGround) events.push({ type: 'land', speed: Math.max(0, this.lastVy) });
      this.coyote = c.coyoteTime;
      this.airJumpUsed = false;
      this.jumping = false;
      this.longJump = false;
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
    }
    this.wasGround = onGround;

    if (jumpPressed) {
      this.buffer = c.jumpBuffer;
      this.bufferLong = run;
    } else {
      this.buffer = Math.max(0, this.buffer - dt);
    }

    // ---- jumping ------------------------------------------------------------
    if (this.buffer > 0 && this.coyote > 0) {
      const long = this.bufferLong;
      vy = -(long ? c.longJumpVelocity : c.jumpVelocity);
      if (long) {
        this.longJump = true;
        if (dir !== 0) vx = dir * Math.max(Math.abs(vx), c.longJumpMinSpeed * mods.speedMult);
      }
      this.jumping = true;
      this.cutDone = false;
      this.buffer = 0;
      this.coyote = 0;
      events.push({ type: 'jump', long });
    } else if (jumpPressed && !onGround && this.coyote <= 0 && mods.canAirJump && !this.airJumpUsed) {
      vy = -c.airJumpVelocity;
      this.airJumpUsed = true;
      this.jumping = true;
      this.cutDone = false;
      this.buffer = 0;
      events.push({ type: 'airjump' });
    }

    // variable jump height: releasing early cuts the rise
    if (this.jumping && !jumpHeld && vy < 0 && !this.cutDone) {
      vy *= c.jumpCutMultiplier;
      this.cutDone = true;
    }

    // ---- horizontal ---------------------------------------------------------
    const mult = mods.speedMult;
    let cap = (run ? c.runSpeed : c.walkSpeed) * mult;
    if (!onGround && this.longJump) cap = c.longJumpAirSpeed * mult;
    const target = dir * cap;
    let accel;
    this.skidding = false;
    if (dir === 0) {
      accel = onGround ? c.groundFriction : c.airFriction;
    } else if (vx !== 0 && Math.sign(vx) !== dir) {
      accel = onGround ? c.turnAccel : c.airTurnAccel;
      this.skidding = onGround && Math.abs(vx) > c.skidSpeedThreshold;
    } else if (Math.abs(vx) > Math.abs(target)) {
      accel = onGround ? c.groundFriction : c.airFriction; // easing back down to the cap
    } else {
      accel = onGround ? (run ? c.runAccel : c.walkAccel) : c.airAccel;
    }
    vx = approach(vx, target, accel * dt);
    if (dir !== 0) this.facing = dir;

    // ---- gravity ------------------------------------------------------------
    let g = c.gravity;
    if (vy > 0) g *= c.fallGravityMult;
    else if (Math.abs(vy) < c.apexThreshold && jumpHeld) g *= c.apexGravityMult;
    vy = Math.min(vy + g * dt, c.maxFallSpeed);

    if (state.ceiling && vy < 0) {
      if (this.lastVy < -60) events.push({ type: 'bump' });
      vy = 0;
    }

    this.lastVy = vy;
    return { vx, vy, events };
  }
}
