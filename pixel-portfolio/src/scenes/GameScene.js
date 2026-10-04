import Phaser from 'phaser';
import { TILE, PHYSICS as P, PROGRESSION } from '../config.js';
import { LEVELS } from '../levels.js';
import { save, persist } from '../systems/save.js';

const TILE_TEX = {
  '#': 'tile-ground',
  d: 'tile-dirt',
  B: 'tile-desk',
  p: 'pipe-tl',
  q: 'pipe-tr',
  l: 'pipe-bl',
  r: 'pipe-br',
};
const PIPE_CHARS = new Set(['p', 'q', 'l', 'r']);

const approach = (v, target, step) =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.roomKey = data.room || 'main';
    this.viaPipe = data.viaPipe || null;
  }

  create() {
    const reg = this.registry;
    this.level = LEVELS[this.roomKey];
    const L = this.level;
    this.worldW = L.w * TILE;
    this.worldH = L.h * TILE;

    this.physics.world.setBounds(0, 0, this.worldW, this.worldH + 64);
    this.physics.world.setBoundsCollision(true, true, true, false); // pits are open
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.setBackgroundColor(L.bg);
    cam.fadeIn(250);

    if (!reg.has('collected')) reg.set('collected', new Set());
    this.collected = reg.get('collected');
    this.coffeeMs = reg.get('coffeeMs') || 0;
    this.entering = false;
    this.goalShown = false;
    this.jumpPressedAt = -1e9;
    this.lastGrounded = -1e9;
    this.airJumps = 0;
    this.jumping = false;
    this.longJumping = false;
    this.ljDir = 1;
    this.wasGrounded = true;
    this.prevVy = 0;
    this.animLock = { key: null, until: 0 };
    this.idleSince = 0;

    this.buildBackground();
    this.buildTiles();
    this.buildObjects();
    this.buildPlayer();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.shift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    if (!this.scene.isActive('UI')) this.scene.launch('UI');
  }

  // --- world building ------------------------------------------------------
  buildBackground() {
    this.parallax = [];
    if (this.level.theme !== 'office') return;
    [['skyline-far', 0.15], ['skyline-near', 0.4]].forEach(([key, f], i) => {
      const ts = this.add.tileSprite(0, 0, 256, 224, key).setOrigin(0).setScrollFactor(0).setDepth(i);
      this.parallax.push([ts, f]);
    });
  }

  buildTiles() {
    const L = this.level;
    this.solids = this.physics.add.staticGroup();
    for (let r = 0; r < L.h; r++) {
      for (let c = 0; c < L.w; c++) {
        const tex = TILE_TEX[L.grid[r][c]];
        if (!tex) continue;
        const t = this.solids.create(c * TILE + 8, r * TILE + 8, tex);
        t.setDepth(PIPE_CHARS.has(L.grid[r][c]) ? 6 : 3);
      }
    }
    L.labels.forEach((l) => {
      this.add
        .text(l.x, l.y, l.text, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fcfcfc' })
        .setShadow(1, 1, '#0f0f1b', 0)
        .setDepth(2);
    });
  }

  buildObjects() {
    const L = this.level;
    this.coins = this.physics.add.staticGroup();
    this.coffees = this.physics.add.staticGroup();
    this.flags = this.physics.add.staticGroup();
    this.goals = this.physics.add.staticGroup();

    for (let r = 0; r < L.h; r++) {
      for (let c = 0; c < L.w; c++) {
        const ch = L.grid[r][c];
        const id = `${this.roomKey}:${c},${r}`;
        const x = c * TILE + 8;
        const y = r * TILE + 8;
        if ((ch === 'o' || ch === 'c') && this.collected.has(id)) continue;
        if (ch === 'o') {
          const s = this.coins.create(x, y, 'coin', 0).setDepth(4);
          s.setSize(10, 12);
          s.itemId = id;
          s.anims.play('coin-spin');
          s.anims.setProgress((c % 4) / 4);
        } else if (ch === 'c') {
          const s = this.coffees.create(x, y, 'coffee').setDepth(4);
          s.itemId = id;
          this.tweens.add({ targets: s, y: y - 2, yoyo: true, repeat: -1, duration: 500 });
        } else if (ch === 'F') {
          const s = this.flags.create(x, y - 8, 'flag-off').setDepth(2);
          s.refreshBody();
          s.cp = { x, bottom: (r + 1) * TILE };
        } else if (ch === 'G') {
          this.goals.create(x, y - 8, 'door').setDepth(2).refreshBody();
        }
      }
    }
  }

  buildPlayer() {
    const L = this.level;
    const reg = this.registry;
    let x = L.spawn.col * TILE + 8;
    let bottom = (L.spawn.row + 1) * TILE;

    const cp = reg.get('checkpoint');
    if (this.viaPipe) {
      const pipe = L.pipes.find((p) => p.id === this.viaPipe);
      x = pipe.x + TILE;
      bottom = pipe.y - 4;
    } else if (cp && cp.room === this.roomKey) {
      x = cp.x;
      bottom = cp.bottom;
    }
    this.spawnPoint = { x, bottom };

    const p = this.physics.add.sprite(x, bottom - 16, 'hero', 0).setDepth(5);
    p.body.setSize(10, 28).setOffset(7, 4);
    p.body.setMaxVelocity(400, P.maxFallSpeed);
    p.setCollideWorldBounds(true);
    this.player = p;
    this.aura = this.add.sprite(x, bottom - 16, 'hero', 0).setDepth(4).setVisible(false);
    this.aura.setTint(0xffe080).setBlendMode(Phaser.BlendModes.ADD);
    this.cameras.main.startFollow(p, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(8, 40);

    this.physics.add.collider(p, this.solids);
    this.physics.add.overlap(p, this.coins, (_, coin) => this.collectCoin(coin));
    this.physics.add.overlap(p, this.coffees, (_, cup) => this.collectCoffee(cup));
    this.physics.add.overlap(p, this.flags, (_, flag) => this.hitCheckpoint(flag));
    this.physics.add.overlap(p, this.goals, () => this.hitGoal());
  }

  // --- pickups -------------------------------------------------------------
  collectCoin(coin) {
    this.collected.add(coin.itemId);
    this.popText(coin.x, coin.y - 6, '+1');
    coin.destroy();
    const reg = this.registry;
    reg.set('coins', reg.get('coins') + 1);
    const xp = reg.get('xp') + 1;
    reg.set('xp', xp);
    const lvl = PROGRESSION.thresholds.filter((t) => xp >= t).length - 1;
    if (lvl > reg.get('level')) {
      reg.set('level', lvl);
      this.game.events.emit('banner', `LEVEL UP!\n${PROGRESSION.titles[lvl]}`);
      this.lockAnim('celebrate', 900);
    }
  }

  collectCoffee(cup) {
    this.collected.add(cup.itemId);
    this.popText(cup.x, cup.y - 8, 'COFFEE!');
    cup.destroy();
    this.coffeeMs = P.coffeeMs;
    this.game.events.emit('banner', 'CAFFEINATED!\nFASTER + DOUBLE JUMP');
    this.cameras.main.shake(120, 0.004);
    this.lockAnim('sip', 700);
  }

  hitCheckpoint(flag) {
    if (flag.texture.key === 'flag-on') return;
    flag.setTexture('flag-on');
    this.registry.set('checkpoint', { room: this.roomKey, ...flag.cp });
    this.game.events.emit('banner', 'CHECKPOINT!');
  }

  hitGoal() {
    if (this.goalShown) return;
    this.goalShown = true;
    save.completed[this.level.world] = true;
    save.lastWorld = Math.min(this.level.world + 1, 5);
    persist();
    this.game.events.emit('banner', `WORLD ${this.level.world + 1} COMPLETE!`);
    this.lockAnim('celebrate', 2400);
    this.time.delayedCall(2600, () => {
      this.scene.stop('UI');
      this.cameras.main.fadeOut(250, 15, 15, 27);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
    });
  }

  popText(x, y, msg) {
    const t = this.add
      .text(x, y, msg, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#f8d878' })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({ targets: t, y: y - 14, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }

  dust(x, y, n = 4) {
    for (let i = 0; i < n; i++) {
      const d = this.add.rectangle(x + Phaser.Math.Between(-4, 4), y, 2, 2, 0xfcfcfc).setDepth(4);
      this.tweens.add({
        targets: d,
        x: d.x + Phaser.Math.Between(-8, 8),
        y: y - Phaser.Math.Between(2, 7),
        alpha: 0,
        duration: 300,
        onComplete: () => d.destroy(),
      });
    }
  }

  // --- pipes ---------------------------------------------------------------
  tryEnterPipe() {
    const p = this.player;
    if (this.entering || !this.cursors.down.isDown || !p.body.blocked.down) return;
    for (const pipe of this.level.pipes) {
      if (!pipe.to) continue;
      if (Math.abs(p.x - (pipe.x + TILE)) < 10 && Math.abs(p.body.bottom - pipe.y) < 3) {
        this.enterPipe(pipe);
        return;
      }
    }
  }

  enterPipe(pipe) {
    const p = this.player;
    this.entering = true;
    p.body.enable = false;
    p.setVelocity(0, 0);
    p.anims.play('crouch', true);
    p.x = pipe.x + TILE;
    this.tweens.add({
      targets: p,
      y: p.y + 30,
      duration: 500,
      onComplete: () => {
        this.registry.set('coffeeMs', this.coffeeMs);
        this.cameras.main.fadeOut(200);
        this.cameras.main.once('camerafadeoutcomplete', () =>
          this.scene.start('Game', { room: pipe.to.room, viaPipe: pipe.to.pipe })
        );
      },
    });
  }

  respawn() {
    const reg = this.registry;
    reg.set('coins', Math.max(0, reg.get('coins') - P.pitCoinPenalty));
    const p = this.player;
    p.setVelocity(0, 0);
    p.setPosition(this.spawnPoint.x, this.spawnPoint.bottom - 16);
    this.cameras.main.flash(200, 255, 255, 255);
    this.game.events.emit('banner', `OOPS! -${P.pitCoinPenalty} COINS`);
    this.lockAnim('hurt', 600);
  }

  // --- main loop -----------------------------------------------------------
  update(time, delta) {
    const dt = delta / 1000;
    this.parallax.forEach(([ts, f]) => (ts.tilePositionX = this.cameras.main.scrollX * f));
    if (this.entering) return;

    const p = this.player;
    const b = p.body;
    const c = this.cursors;
    const shift = this.shift.isDown;
    const grounded = b.blocked.down;
    const crouching = grounded && c.down.isDown;
    const dir = crouching ? 0 : (c.right.isDown ? 1 : 0) - (c.left.isDown ? 1 : 0);

    // coffee timer + HUD value
    this.coffeeMs = Math.max(0, this.coffeeMs - delta);
    const powered = this.coffeeMs > 0;
    const ratio = Math.ceil((this.coffeeMs / P.coffeeMs) * 20) / 20;
    if (this.registry.get('coffee') !== ratio) this.registry.set('coffee', ratio);
    // golden aura behind the hero while caffeinated (blinks in the last 2 seconds)
    const auraOn = powered && (this.coffeeMs > 2000 || Math.floor(time / 90) % 2 === 0);
    this.aura.setVisible(auraOn);
    if (auraOn) {
      this.aura.setPosition(p.x, p.y).setFlipX(p.flipX).setFrame(p.frame.name);
      this.aura.setScale(1.18).setAlpha(0.35 + 0.15 * Math.sin(time / 120));
    }

    if (grounded) {
      this.lastGrounded = time;
      this.airJumps = powered ? P.coffeeAirJumps : 0;
      this.longJumping = false;
      this.jumping = false;
      if (!this.wasGrounded && this.prevVy > 150) {
        this.dust(p.x, b.bottom, 5);
        this.lockAnim('land', 90, time);
      }
    }

    // jumping: buffer + coyote + coffee double jump
    let fresh = false;
    if (Phaser.Input.Keyboard.JustDown(c.up)) {
      this.jumpPressedAt = time;
      fresh = true;
    }
    if (time - this.jumpPressedAt <= P.jumpBufferMs) {
      if (time - this.lastGrounded <= P.coyoteMs) {
        this.doJump(shift, dir, powered);
      } else if (fresh && this.airJumps > 0) {
        this.airJumps--;
        this.doJump(false, dir, powered, true);
      }
    }
    // variable jump height: letting go of Up cuts the hop short
    if (this.jumping && c.up.isUp && b.velocity.y < 0) {
      b.setVelocityY(b.velocity.y * P.jumpCutFactor);
      this.jumping = false;
    }
    b.setGravityY(b.velocity.y > 0 ? P.fallExtraGravity : 0);

    // horizontal movement
    const boost = powered ? P.coffeeSpeedBoost : 1;
    let maxSpeed = (shift ? P.runSpeed : P.walkSpeed) * boost;
    let vx = b.velocity.x;
    let accel = P.accel * (grounded ? 1 : P.airControl);
    let target;
    if (this.longJumping && !grounded && (dir === 0 || dir === this.ljDir)) {
      target = this.ljDir * P.longJumpSpeed * boost;
      accel = P.accel;
    } else if (dir === 0) {
      target = 0;
      accel = grounded ? P.friction : P.airDrag;
    } else {
      // keep momentum in the air even if Shift is released
      if (!grounded && Math.sign(vx) === dir) maxSpeed = Math.max(maxSpeed, Math.abs(vx));
      target = dir * maxSpeed;
      if (vx !== 0 && Math.sign(vx) !== dir) accel *= P.skidMultiplier;
    }
    vx = approach(vx, target, accel * dt);
    b.setVelocityX(vx);
    if (dir !== 0) p.setFlipX(dir < 0);

    // animation: a short "lock" (sip, hurt, celebrate...) beats normal movement poses
    const moving = Math.abs(vx) > 8 || !grounded || crouching;
    if (moving) this.idleSince = time;
    if (time >= this.animLock.until && time - this.idleSince > 4000) {
      this.lockAnim('wave', 700, time);
      this.idleSince = time;
    }
    let anim;
    if (time < this.animLock.until) anim = this.animLock.key;
    else if (!grounded) anim = this.longJumping ? 'longjump' : b.velocity.y > 40 ? 'fall' : 'jump';
    else if (crouching) anim = 'crouch';
    else if (Math.abs(vx) > P.walkSpeed * 1.15 * boost * 0.9) anim = 'run';
    else if (Math.abs(vx) > 8) anim = 'walk';
    else anim = 'idle';
    p.anims.play(anim, true);

    // camera look-ahead
    this.cameras.main.setFollowOffset(-Phaser.Math.Clamp(vx * 0.15, -24, 24), 0);

    this.tryEnterPipe();

    if (p.y > this.worldH + 30) this.respawn();

    this.wasGrounded = grounded;
    this.prevVy = b.velocity.y;
  }

  lockAnim(key, ms, now = this.time.now) {
    this.animLock = { key, until: now + ms };
    this.player.anims.play(key, true);
  }

  doJump(long, dir, powered, air = false) {
    const p = this.player;
    const b = p.body;
    let vy = long ? P.longJumpVelocity : P.jumpVelocity;
    if (powered) vy *= P.coffeeJumpBoost;
    b.setVelocityY(vy);
    if (long) {
      this.longJumping = true;
      this.ljDir = dir || (p.flipX ? -1 : 1);
      b.setVelocityX(this.ljDir * Math.max(Math.abs(b.velocity.x), P.longJumpSpeed));
    }
    this.jumping = true;
    this.jumpPressedAt = -1e9;
    this.lastGrounded = -1e9;
    this.dust(p.x, b.bottom, air ? 3 : 4);
  }
}
