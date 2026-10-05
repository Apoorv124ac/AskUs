// Day 11: every bonus room is its own little game (no coin hunting):
//   memory  - TOOLKIT room      : copy the order the tool pads light up (jump onto them)
//   lights  - IDEA LAB          : bump switches from below to light all six bulbs (lights-out puzzle)
//   whack   - DESIGN CRAFT room : stomp the bugs that pop out of the floor before time runs out
//   rope    - LEADERSHIP room   : jump the swinging "deadline" rope, ten clean jumps
//   rhythm  - TOOLKIT cabinet   : hit the arrow keys in time (like keyboard shortcuts)
// The room's usual reward items stay hidden until you win, then they fly to the hero by themselves.
import Phaser from 'phaser';
import { burst, txt } from '../ui/pixel.js';
import { save } from './save.js';
import { sfx } from './audio.js';

const FLOOR = 192;
const COLORS = [0xf83800, 0xfca044, 0xf8d878, 0x58d854, 0x58b0f8];
const rnd = (n) => Math.floor(Math.random() * n);

class Mini {
  constructor(scene, help) {
    this.s = scene;
    this.p = scene.player;
    this.lock = false;
    this.hudText = '';
    scene.registry.set('factsTotal', 0); // the room's own progress replaces the HUD counter
    this.won = false;
    this.rewards = this.findRewards();
    this.solved = this.rewards.length === 0;
    this.rewards.forEach((r) => {
      r.it.setVisible(false);
      if (r.it.body) r.it.body.enable = false;
    });
    this.help = txt(scene, 16, 46, help, { color: '#bcbcbc', depth: 6, lineSpacing: 3 });
    this.status = txt(scene, 16, 72, '', { color: '#f8d878', bold: true, depth: 6 });
    if (this.solved) {
      this.status.setText('SOLVED ALREADY. NICE WORK!');
      this.help.setText('GO BACK UP THE PIPE.');
    } else if (save.recruiter) {
      this.hintK = txt(scene, 304, 214, 'K  SKIP (RECRUITER)', { origin: [1, 0], color: '#58d854', depth: 6 });
      const onK = () => this.win();
      scene.input.keyboard.on('keydown-K', onK);
      scene.events.once('shutdown', () => scene.input.keyboard.off('keydown-K', onK));
    }
  }

  get live() {
    return !this.solved && !this.won;
  }

  findRewards() {
    const s = this.s;
    const out = [];
    s.toolItems?.getChildren().forEach((it) => out.push({ it, collect: () => s.collectTool(it) }));
    s.campus?.bulbs.getChildren().forEach((it) => out.push({ it, collect: () => s.campus.collect(it, 'bulb') }));
    s.arcade?.group.getChildren().forEach((it) => out.push({ it, collect: () => s.arcade.collect(it) }));
    return out;
  }

  hud(text) {
    this.hudText = text;
    this.s.registry.set('hudInfo', text);
  }

  // other systems (campus, arcade) write the HUD too: keep ours on top
  hudNow() {
    if (this.hudText) this.s.registry.set('hudInfo', this.hudText);
  }

  say(text) {
    this.status.setText(text);
    this.s.tweens.add({ targets: this.status, scale: { from: 1.15, to: 1 }, duration: 160, ease: 'Back.out' });
  }

  win() {
    if (this.won || this.solved) return;
    const { s, p } = this;
    this.won = true;
    this.lock = false;
    sfx('win');
    this.say('SOLVED!');
    this.hud('SOLVED!');
    s.lockAnim('celebrate', 1400);
    s.time.delayedCall(500, () => s.game.events.emit('banner', 'MINI-GAME WON!\nREWARD UNLOCKED'));
    this.rewards.forEach((r, i) =>
      s.time.delayedCall(1500 + i * 1500, () => {
        if (!r.it.active) return;
        r.it.setPosition(p.x, p.y - 24).setVisible(true);
        burst(s, p.x, p.y - 24, { n: 10, spread: 26 });
        r.collect();
      })
    );
  }

  update() {}
}

// ---------------------------------------------------------------- 1. memory pads
class MemoryMini extends Mini {
  constructor(scene) {
    super(scene, 'WATCH THE PADS LIGHT UP. THEN JUMP ONTO\nTHEM IN THE SAME ORDER. 3 ROUNDS.');
    this.pads = [];
    ['ID', 'AI', 'PS', 'AE', 'XD'].forEach((name, i) => {
      const x = 40 + i * 32;
      const pad = scene.add.rectangle(x, FLOOR - 4, 20, 8, COLORS[i]).setStrokeStyle(1, 0x0f0f1b).setDepth(4);
      scene.physics.add.existing(pad, true);
      scene.physics.add.collider(scene.player, pad);
      txt(scene, x, FLOOR - 18, name, { origin: 0.5, color: '#fcfcfc', depth: 6, shadow: false });
      pad.baseColor = COLORS[i];
      pad.x0 = x;
      pad.down = false;
      this.pads.push(pad);
    });
    this.rounds = [3, 4, 5];
    this.round = 0;
    this.state = 'wait';
    this.nextAt = scene.time.now + 1800;
    if (this.live) this.say('GET READY...');
  }

  glow(i, ms = 420) {
    const pad = this.pads[i];
    sfx('plate', i);
    pad.setFillStyle(0xfcfcfc);
    this.s.tweens.add({ targets: pad, scaleY: 1.5, yoyo: true, duration: ms / 2 });
    this.s.time.delayedCall(ms, () => pad.setFillStyle(pad.baseColor));
  }

  begin() {
    this.seq = [];
    let last = -1;
    for (let k = 0; k < this.rounds[this.round]; k++) {
      let n;
      do n = rnd(5);
      while (n === last);
      this.seq.push(n);
      last = n;
    }
    this.replay();
  }

  replay() {
    this.state = 'show';
    this.idx = 0;
    this.pos = 0;
    this.nextAt = this.s.time.now + 900;
    this.say('WATCH...');
    this.hud(`ROUND ${this.round + 1}/3`);
  }

  press(i) {
    if (this.state !== 'input') return;
    const now = this.s.time.now;
    this.glow(i, 260);
    if (i === this.seq[this.pos]) {
      this.pos++;
      if (this.pos === this.seq.length) {
        this.round++;
        if (this.round >= this.rounds.length) return this.win();
        this.state = 'wait';
        this.nextAt = now + 1300;
        this.say('NICE! NEXT ROUND...');
        sfx('coin');
      }
    } else {
      sfx('buzz');
      this.s.cameras.main.shake(90, 0.003);
      this.state = 'wait';
      this.replay_ = true;
      this.nextAt = now + 1400;
      this.say('OOPS! WATCH AGAIN...');
    }
  }

  update(time) {
    if (!this.live) return;
    const b = this.p.body;
    this.pads.forEach((pad, i) => {
      const on = b.blocked.down && Math.abs(this.p.x - pad.x0) < 12 && Math.abs(b.bottom - (FLOOR - 8)) < 3;
      if (on && !pad.down) this.press(i);
      pad.down = on;
    });
    if (this.state === 'wait' && time > this.nextAt) {
      if (this.replay_) {
        this.replay_ = false;
        this.replay();
      } else this.begin();
    } else if (this.state === 'show' && time > this.nextAt) {
      if (this.idx >= this.seq.length) {
        this.state = 'input';
        this.say('YOUR TURN! JUMP ON THE PADS');
      } else {
        this.glow(this.seq[this.idx++], 480);
        this.nextAt = time + 750;
      }
    }
  }
}

// ---------------------------------------------------------------- 2. lights-out switches
class LightsMini extends Mini {
  constructor(scene) {
    super(scene, 'BUMP A SWITCH FROM BELOW. IT FLIPS ITSELF\nAND ITS NEIGHBOURS. LIGHT ALL 6 BULBS.');
    this.n = 6;
    this.on = Array(this.n).fill(true);
    // start from "all lit", then press three different switches: always solvable
    const picks = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);
    picks.forEach((i) => this.flip(i, false));
    if (this.on.every(Boolean)) this.flip(2, false);
    this.blocks = scene.physics.add.staticGroup();
    this.lamps = [];
    for (let i = 0; i < this.n; i++) {
      const x = 40 + i * 32;
      const blk = scene.add.rectangle(x, 136, 16, 16, 0x6a6a8c).setStrokeStyle(1, 0x0f0f1b).setDepth(4);
      scene.add.rectangle(x, 139, 8, 4, 0xf8d878).setDepth(5);
      scene.physics.add.existing(blk, true);
      this.blocks.add(blk);
      blk.i = i;
      const glow = scene.add.circle(x, 100, 13, 0xf8d878, 0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
      const bulb = scene.add.image(x, 102, 'bulb').setDepth(4);
      this.lamps.push({ bulb, glow });
    }
    scene.physics.add.collider(scene.player, this.blocks, (_, blk) => this.bump(blk));
    this.cool = 0;
    this.paint();
    if (this.live) this.say('');
  }

  flip(i, anim = true) {
    [i - 1, i, i + 1].forEach((k) => {
      if (k >= 0 && k < this.n) this.on[k] = !this.on[k];
    });
    if (anim) this.paint();
  }

  paint() {
    this.lamps.forEach((l, i) => {
      const lit = this.on[i];
      l.bulb.setAlpha(lit ? 1 : 0.55);
      lit ? l.bulb.clearTint() : l.bulb.setTint(0x404060);
      l.glow.setVisible(lit);
    });
    this.hud(`LIGHTS ${this.on.filter(Boolean).length}/${this.n}`);
  }

  bump(blk) {
    const { s, p } = this;
    const now = s.time.now;
    if (!this.live || now < this.cool || !p.body.touching.up || s.prevVy > -80 || blk.y > p.body.y) return;
    if (Math.abs(blk.x - p.x) > 11) return;
    this.cool = now + 380;
    sfx('light');
    s.tweens.add({ targets: blk, y: blk.y - 4, yoyo: true, duration: 70, onUpdate: () => blk.body.updateFromGameObject() });
    this.flip(blk.i);
    burst(s, blk.x, blk.y - 6, { n: 4, spread: 10, colors: [0xf8d878, 0xfcfcfc] });
    if (this.on.every(Boolean)) this.win();
  }
}

// ---------------------------------------------------------------- 3. whack-a-bug
class WhackMini extends Mini {
  constructor(scene) {
    super(scene, 'BUGS POP OUT OF THE FLOOR.\nSTOMP 8 OF THEM BEFORE TIME RUNS OUT.');
    this.holes = [40, 88, 136, 184, 232];
    this.holes.forEach((x) => scene.add.ellipse(x, FLOOR + 1, 24, 6, 0x0f0f1b).setDepth(4));
    this.bugs = [];
    this.goal = 8;
    this.count = 0;
    this.state = 'wait';
    this.nextAt = scene.time.now + 2000;
    if (this.live) this.say('GET READY...');
  }

  start() {
    this.state = 'run';
    this.count = 0;
    this.endAt = this.s.time.now + 32000;
    this.nextSpawn = this.s.time.now + 400;
    this.say('STOMP THE BUGS!');
  }

  spawn(time) {
    const free = this.holes.map((x, i) => i).filter((i) => !this.bugs.some((b) => b.hole === i));
    if (!free.length) return;
    const hole = free[rnd(free.length)];
    const x = this.holes[hole];
    const bug = this.s.add.sprite(x, FLOOR + 10, 'bug', 0).setDepth(2);
    bug.anims.play('bug-walk');
    bug.hole = hole;
    bug.x0 = x;
    bug.dead = false;
    const stay = Math.max(750, 1500 - this.count * 90);
    bug.leaveAt = time + 150 + stay;
    this.s.tweens.add({ targets: bug, y: FLOOR - 8, duration: 150, ease: 'Quad.out' });
    this.bugs.push(bug);
  }

  update(time) {
    if (!this.live) return this.clearBugs();
    if (this.state === 'wait') {
      if (time > this.nextAt) this.start();
      return;
    }
    const p = this.p;
    const b = p.body;
    // stomp check: falling onto a bug that is out of its hole
    this.bugs.forEach((bug) => {
      if (bug.dead) return;
      if (Math.abs(p.x - bug.x0) < 12 && b.velocity.y > 20 && b.bottom > FLOOR - 16 && b.bottom < FLOOR + 2 && bug.y < FLOOR - 3) {
        bug.dead = true;
        this.count++;
        sfx('whack');
        this.s.popText(bug.x0, FLOOR - 22, `${this.count}/${this.goal}`);
        burst(this.s, bug.x0, FLOOR - 8, { n: 8, spread: 18, colors: [0xf83800, 0xf8d878, 0xfcfcfc] });
        this.s.tweens.add({ targets: bug, scaleY: 0.2, y: FLOOR - 2, alpha: 0, duration: 220, onComplete: () => bug.destroy() });
        p.setVelocityY(-230);
        this.s.refillAirJumps();
        if (this.count >= this.goal) this.win();
      } else if (!bug.dead && time > bug.leaveAt) {
        bug.dead = true;
        this.s.tweens.add({ targets: bug, y: FLOOR + 10, duration: 140, onComplete: () => bug.destroy() });
      }
    });
    this.bugs = this.bugs.filter((x) => x.active);
    if (!this.live) return this.clearBugs();
    const left = Math.max(0, Math.ceil((this.endAt - time) / 1000));
    this.hud(`BUGS ${this.count}/${this.goal} T${left}`);
    if (time > this.nextSpawn) {
      this.spawn(time);
      if (this.count > 4 && Math.random() < 0.5) this.spawn(time);
      this.nextSpawn = time + Math.max(450, 950 - this.count * 55);
    }
    if (time > this.endAt) {
      sfx('buzz');
      this.say('TIME UP! TRY AGAIN...');
      this.state = 'wait';
      this.nextAt = time + 2200;
      this.clearBugs();
    }
  }

  clearBugs() {
    this.bugs.forEach((b) => b.destroy());
    this.bugs = [];
  }
}

// ---------------------------------------------------------------- 4. jump rope
class RopeMini extends Mini {
  constructor(scene) {
    super(scene, 'THE DEADLINE ROPE IS SWINGING.\nJUMP WHEN IT SWEEPS THE FLOOR. 10 CLEAN JUMPS.');
    this.g = scene.add.graphics().setDepth(7);
    ['rita', 'meera'].forEach((id, i) => scene.add.sprite(i ? 304 : 16, FLOOR - 16, 'npcs', 0).setFlipX(!i).anims.play(`${id}-idle`).setDepth(4));
    this.theta = Math.PI; // start with the rope up high
    this.clean = 0;
    this.goal = 10;
    this.trip = false;
    this.state = 'wait';
    this.nextAt = scene.time.now + 2200;
    this.lastCos = -1;
    if (this.live) this.say('GET READY...');
    this.draw();
  }

  ropeY(t) {
    const hand = FLOOR - 26;
    const mid = 144 + 44 * Math.cos(this.theta);
    return hand + (mid - hand) * 4 * t * (1 - t);
  }

  draw() {
    const g = this.g;
    g.clear();
    for (let x = 22; x <= 298; x += 3) {
      const y = Math.round(this.ropeY((x - 22) / 276));
      g.fillStyle(0x0f0f1b).fillRect(x - 1, y - 1, 5, 4);
    }
    for (let x = 22; x <= 298; x += 3) {
      const y = Math.round(this.ropeY((x - 22) / 276));
      g.fillStyle(this.trip ? 0xf83800 : 0xfcfcfc).fillRect(x, y, 3, 2);
    }
  }

  update(time, delta) {
    if (!this.live) return;
    if (this.state === 'wait') {
      if (time > this.nextAt) {
        this.state = 'run';
        this.say('JUMP!');
      }
      this.draw();
      return;
    }
    const period = Math.max(1.25, 1.95 - this.clean * 0.07);
    this.theta += ((Math.PI * 2) / period) * (delta / 1000);
    const c = Math.cos(this.theta);
    const p = this.p;
    // low part of the swing: feet must be off the floor
    if (c > 0.85) {
      const ry = this.ropeY((p.x - 22) / 276);
      if (!this.trip && p.body.bottom > ry - 4 && p.x > 24 && p.x < 296) {
        this.trip = true;
        sfx('buzz');
        this.s.cameras.main.shake(100, 0.004);
        this.s.lockAnim('hurt', 450);
        this.clean = Math.max(0, this.clean - 2);
        this.say('TRIPPED! -2');
      }
    }
    // the rope just passed the lowest point
    if (this.lastCos > 0.97 && c < this.lastCos && !this.peaked) {
      this.peaked = true;
      if (!this.trip) {
        this.clean++;
        sfx('coin');
        this.s.popText(p.x, p.y - 26, `${this.clean}/${this.goal}`);
        this.say('CLEAN JUMP!');
        if (this.clean >= this.goal) this.win();
      }
    }
    if (c < 0.3) {
      this.trip = false;
      this.peaked = false;
    }
    this.lastCos = c;
    this.hud(`JUMPS ${this.clean}/${this.goal}`);
    this.draw();
  }
}

// ---------------------------------------------------------------- 5. shortcut rhythm
const CHART = [
  [0, 0.0], [1, 0.7], [2, 1.4], [1, 2.0], [0, 2.6], [2, 3.2], [1, 3.9], [0, 4.4], [1, 4.9], [2, 5.5],
  [2, 6.2], [1, 6.7], [0, 7.2], [0, 7.8], [1, 8.4], [2, 9.0], [0, 9.6], [2, 10.2], [1, 10.8], [1, 11.4],
];
const LANE_X = [124, 160, 196];
const LANE_KEY = ['LEFT', 'UP', 'RIGHT'];
const GLYPH = ['<', '^', '>'];
const HIT_Y = 150;
const SPEED = 90; // pixels per second the notes travel
const WINDOW = 0.17; // seconds either side counts as a hit

class RhythmMini extends Mini {
  constructor(scene) {
    super(scene, 'PRESS ENTER OR TAP. HIT THE ARROW KEYS (OR TAP\nA LANE) AS NOTES REACH THE LINE. HIT 14 OF 20.');
    this.state = 'idle';
    this.notes = [];
    this.parts = [];
    if (this.live) this.say('PRESS ENTER OR TAP TO START');
    const kb = scene.input.keyboard;
    this.onEnter = () => this.live && this.state === 'idle' && this.start();
    kb.on('keydown-ENTER', this.onEnter);
    this.keyFns = LANE_KEY.map((k, lane) => {
      const fn = () => this.hit(lane);
      kb.on(`keydown-${k}`, fn);
      return [k, fn];
    });
    // phones: tap to start, and tap a lane to hit it
    const onTap = (pointer) => {
      if (!this.live) return;
      if (this.state === 'idle') return this.start();
      if (this.state !== 'run') return;
      const w = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      let lane = 0;
      LANE_X.forEach((x, i) => Math.abs(w.x - x) < Math.abs(w.x - LANE_X[lane]) && (lane = i));
      this.hit(lane);
    };
    scene.input.on('pointerdown', onTap);
    scene.events.once('shutdown', () => scene.input.off('pointerdown', onTap));
    scene.events.once('shutdown', () => {
      kb.off('keydown-ENTER', this.onEnter);
      this.keyFns.forEach(([k, fn]) => kb.off(`keydown-${k}`, fn));
    });
  }

  start() {
    const { s, p } = this;
    this.state = 'run';
    this.lock = true;
    this.score = 0;
    this.say('');
    p.setPosition(160, FLOOR - 16);
    p.setVelocity(0, 0);
    const mk = (o) => {
      this.parts.push(o);
      return o;
    };
    LANE_X.forEach((x, i) => {
      mk(s.add.rectangle(x, 90, 32, 130, 0x0f0f1b, 0.55).setDepth(5));
      mk(s.add.rectangle(x, HIT_Y, 32, 3, COLORS[i * 2 % 5]).setDepth(6));
      mk(txt(s, x, HIT_Y + 11, GLYPH[i], { origin: 0.5, color: '#fcfcfc', depth: 7, bold: true }));
    });
    this.t0 = s.time.now + 1700; // chart time zero (a lead-in so the first note can fall)
    this.notes = CHART.map(([lane, t]) => {
      const rect = s.add.rectangle(LANE_X[lane], -20, 24, 9, COLORS[lane * 2 % 5]).setStrokeStyle(1, 0x0f0f1b).setDepth(8);
      const g = txt(s, LANE_X[lane], -20, GLYPH[lane], { origin: 0.5, color: '#0f0f1b', depth: 9, bold: true, shadow: false });
      return { lane, t, rect, g, done: false };
    });
    this.endAt = this.t0 + CHART[CHART.length - 1][1] * 1000 + 900;
  }

  hit(lane) {
    if (this.state !== 'run') return;
    const now = this.s.time.now;
    const target = this.notes.find((n) => !n.done && n.lane === lane && Math.abs(now - (this.t0 + n.t * 1000)) < WINDOW * 1000);
    this.s.lockAnim('celebrate', 220);
    if (!target) return;
    target.done = true;
    this.score++;
    sfx('beat', lane);
    this.s.popText(LANE_X[lane], HIT_Y - 12, this.score >= 14 ? 'OK!' : '+');
    this.s.tweens.add({ targets: [target.rect, target.g], scale: 1.6, alpha: 0, duration: 160, onComplete: () => [target.rect, target.g].forEach((o) => o.destroy()) });
  }

  update(time) {
    if (!this.live || this.state !== 'run') return;
    this.notes.forEach((n) => {
      if (!n.rect.active) return;
      // note time n.t (seconds after chart start) is when it reaches the line
      const dt = this.t0 + n.t * 1000 - time; // ms until it reaches the line
      const y = HIT_Y - (dt / 1000) * SPEED;
      n.rect.setY(y);
      n.g.setY(y);
      if (!n.done && dt < -WINDOW * 1000) {
        n.done = true;
        n.rect.setFillStyle(0x7c7c7c);
        this.s.tweens.add({ targets: [n.rect, n.g], alpha: 0, y: y + 30, duration: 300, onComplete: () => [n.rect, n.g].forEach((o) => o.destroy()) });
      }
    });
    this.hud(`HITS ${this.score}/20`);
    if (time > this.endAt) this.finish();
  }

  finish() {
    this.parts.forEach((o) => o.destroy());
    this.parts = [];
    this.notes.forEach((n) => [n.rect, n.g].forEach((o) => o.active && o.destroy()));
    this.notes = [];
    this.lock = false;
    if (this.score >= 14) return this.win();
    sfx('buzz');
    this.state = 'idle';
    this.say(`${this.score}/20. NEED 14. ENTER OR TAP TO RETRY`);
  }
}

export const MINIS = { memory: MemoryMini, lights: LightsMini, whack: WhackMini, rope: RopeMini, rhythm: RhythmMini };
