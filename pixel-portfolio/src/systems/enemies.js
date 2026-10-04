// Enemy roster (Mario-style, office-flavoured). Level files list them in `L.enemies`.
//   turtle  - stomp it into a shell, then kick the shell to bowl over other enemies
//   croc    - snaps and lunges when you get close
//   bat     - "spam bat": flies in a wave
//   diver   - "email hawk": hovers, shakes, then dives at you
//   spiker  - spiky beetle: NEVER stomp it (only a sliding shell can beat it)
//   piranha - lives in a pipe; hides if you stand right on top of the pipe
import Phaser from 'phaser';
import { save } from './save.js';
import { burst } from '../ui/pixel.js';

const DIFF = [
  { spd: 0.78, hp: 0 }, // relaxed
  { spd: 1, hp: 0 }, // normal
  { spd: 1.3, hp: 1 }, // hard
];
const SOLID = new Set(['#', 'd', 'B', 'p', 'q', 'l', 'r']);

export class Enemies {
  constructor(scene) {
    this.s = scene;
    this.L = scene.level;
    this.diff = DIFF[save.difficulty ?? 1];
    const phys = scene.physics;
    this.walkers = phys.add.group();
    this.fliers = phys.add.group({ allowGravity: false });
    this.list = [];
    (this.L.enemies || []).forEach((d, i) => {
      if ((d.min ?? 0) > (save.difficulty ?? 1)) return; // some enemies only appear on harder settings
      this.make(d, i);
    });
    phys.add.collider(this.walkers, scene.solids);
    if (scene.gimmicks) {
      phys.add.collider(this.walkers, scene.gimmicks.crumbles);
      phys.add.collider(this.walkers, scene.gimmicks.convs);
      phys.add.collider(this.walkers, scene.gimmicks.movers);
    }
    phys.add.overlap(scene.player, this.walkers, (_, e) => this.touch(e));
    phys.add.overlap(scene.player, this.fliers, (_, e) => this.touch(e));
    phys.add.overlap(this.walkers, this.walkers, (a, b) => this.shellHit(a, b));
    phys.add.overlap(this.walkers, this.fliers, (a, b) => this.shellHit(a, b));
  }

  make(d, i) {
    const s = this.s;
    const x = d.col * 16 + 8;
    const ground = (d.row ?? 11) + 1; // tile row whose top is the floor
    const id = `${this.L.room}:e${i}`;
    let e;
    const dm = this.diff.spd;
    switch (d.type) {
      case 'turtle':
        e = this.walkers.create(x, ground * 16 - 8, 'turtle', 0);
        e.body.setSize(12, 12).setOffset(2, 4);
        e.state = 'walk';
        e.speed = 34 * dm;
        e.anims.play('turtle-walk');
        break;
      case 'croc':
        e = this.walkers.create(x, ground * 16 - 8, 'croc', 0);
        e.body.setSize(20, 10).setOffset(2, 6);
        e.state = 'walk';
        e.speed = 30 * dm;
        e.hp = 1 + this.diff.hp;
        e.nextSnap = s.time.now + 1500 + i * 150;
        e.anims.play('croc-walk');
        break;
      case 'spiker':
        e = this.walkers.create(x, ground * 16 - 8, 'spiker', 0);
        e.body.setSize(12, 10).setOffset(2, 6);
        e.speed = 28 * dm;
        e.anims.play('spiker-walk');
        break;
      case 'bat':
        e = this.fliers.create(x, (d.row ?? 7) * 16 + 8, 'bat', 0);
        e.body.setSize(10, 8).setOffset(3, 5);
        e.y0 = e.y;
        e.x0 = x;
        e.range = (d.range ?? 4) * 16;
        e.speed = 40 * dm;
        e.phase = i;
        e.anims.play('bat-fly');
        break;
      case 'diver':
        e = this.fliers.create(x, (d.row ?? 5) * 16 + 8, 'diver', 0);
        e.body.setSize(10, 10).setOffset(3, 4);
        e.y0 = e.y;
        e.x0 = x;
        e.state = 'hover';
        e.cool = 0;
        e.anims.play('diver-fly');
        break;
      case 'piranha': {
        const top = (d.row ?? 10) * 16; // y of the pipe's top edge
        e = this.fliers.create(x + 8, top + 18, 'piranha', 0).setDepth(5);
        e.body.setSize(10, 16).setOffset(3, 2);
        e.baseY = top + 18; // hidden (inside the pipe)
        e.state = 'hidden';
        e.until = s.time.now + 800 + i * 400;
        e.anims.play('piranha-bite');
        e.visibleHeight = 0;
        break;
      }
      default:
        return;
    }
    e.type = d.type;
    e.dir = d.dir ?? -1;
    e.eid = id;
    e.dead = false;
    e.setDepth(e.depth || 4);
    e.setFlipX(e.dir > 0);
    if (d.type !== 'piranha') e.body.setCollideWorldBounds(true);
    this.list.push(e);
  }

  solidAt(x, y) {
    const c = Math.floor(x / 16);
    const r = Math.floor(y / 16);
    const row = this.L.grid[r];
    if (!row || c < 0 || c >= this.L.w) return false;
    const ch = row[c];
    return SOLID.has(ch) || ch === 'C' || ch === '>' || ch === '<' || ch === 'B';
  }

  // ------------------------------------------------------------------ contact
  touch(e) {
    const { s } = this;
    const p = s.player;
    if (e.dead || s.entering) return;
    const now = s.time.now;
    const falling = p.body.velocity.y > -30 && p.body.bottom <= e.body.top + 12;

    switch (e.type) {
      case 'turtle':
        if (e.state === 'walk') return falling ? (this.bounce(), this.shellUp(e)) : s.hurtPlayer(e.x);
        if (e.state === 'shell') return this.kick(e); // touching a still shell kicks it away
        if (e.state === 'slide') {
          if (now < e.grace) return;
          return falling ? (this.bounce(), this.shellUp(e)) : s.hurtPlayer(e.x);
        }
        return;
      case 'croc':
        if (falling) {
          this.bounce();
          e.hp--;
          if (e.hp <= 0) return this.die(e, 'squish');
          s.popText(e.x, e.y - 12, 'TOUGH!');
          e.speed *= 1.25;
          return;
        }
        return s.hurtPlayer(e.x);
      case 'bat':
      case 'diver':
        if (falling) {
          this.bounce();
          return this.die(e, 'fall');
        }
        return s.hurtPlayer(e.x);
      case 'spiker':
      case 'piranha':
        if (e.type === 'piranha' && e.visibleHeight < 6) return;
        return s.hurtPlayer(e.x);
      default:
    }
  }

  bounce() {
    const { s } = this;
    s.player.setVelocityY(-240);
    s.refillAirJumps();
    s.hitStop(55);
    s.cameras.main.shake(70, 0.003);
  }

  shellUp(e) {
    e.state = 'shell';
    e.body.setVelocityX(0);
    e.body.setSize(12, 9).setOffset(2, 7);
    e.anims.play('turtle-shell');
    e.until = this.s.time.now + 7000;
    this.s.popText(e.x, e.y - 12, 'SHELL!');
    burst(this.s, e.x, e.y, { n: 6, colors: [0x58d854, 0xfcfcfc] });
  }

  kick(e) {
    const { s } = this;
    const p = s.player;
    e.state = 'slide';
    e.dir = p.x < e.x ? 1 : -1;
    e.grace = s.time.now + 380;
    e.until = s.time.now + 6000;
    e.anims.play('turtle-spin');
    s.hitStop(40);
    s.popText(e.x, e.y - 12, 'KICK!');
  }

  // a sliding shell wins every fight
  shellHit(a, b) {
    const shell = a.type === 'turtle' && a.state === 'slide' ? a : b.type === 'turtle' && b.state === 'slide' ? b : null;
    if (!shell) return;
    const other = shell === a ? b : a;
    if (other === shell || other.dead || other.type === 'piranha') return;
    if (other.type === 'turtle' && other.state === 'slide') return;
    this.die(other, 'fall');
  }

  die(e, how) {
    const { s } = this;
    if (e.dead) return;
    e.dead = true;
    e.body.enable = false;
    burst(s, e.x, e.y, { n: 10, colors: [0xf8d878, 0xfcfcfc, 0xf83800] });
    s.popText(e.x, e.y - 12, how === 'squish' ? 'SQUISH!' : 'POW!');
    if (how === 'squish') {
      s.tweens.add({ targets: e, scaleY: 0.2, y: e.y + 6, alpha: 0, duration: 260, onComplete: () => e.destroy() });
    } else {
      s.tweens.add({ targets: e, y: e.y + 120, angle: 540, alpha: 0.2, duration: 700, ease: 'Quad.in', onComplete: () => e.destroy() });
    }
    // reward once per enemy, even if the room is replayed
    if (!s.collected.has(e.eid)) {
      s.collected.add(e.eid);
      s.award();
    }
  }

  // ------------------------------------------------------------------ AI
  update(time, delta) {
    const { s } = this;
    const p = s.player;
    const dt = delta / 1000;
    for (const e of this.list) {
      if (e.dead || !e.active) continue;
      switch (e.type) {
        case 'turtle':
          this.updTurtle(e, time);
          break;
        case 'croc':
          this.updCroc(e, time, p);
          break;
        case 'spiker':
          this.walk(e, e.speed, true);
          break;
        case 'bat':
          this.updBat(e, time);
          break;
        case 'diver':
          this.updDiver(e, time, p, dt);
          break;
        case 'piranha':
          this.updPiranha(e, time, p);
          break;
        default:
      }
    }
  }

  walk(e, speed, ledge) {
    const b = e.body;
    if (b.blocked.left) e.dir = 1;
    else if (b.blocked.right) e.dir = -1;
    else if (ledge && b.blocked.down && !this.solidAt(e.x + e.dir * 10, b.bottom + 2)) e.dir *= -1;
    b.setVelocityX(e.dir * speed);
    e.setFlipX(e.dir > 0);
  }

  updTurtle(e, time) {
    if (e.state === 'walk') return this.walk(e, e.speed, true);
    if (e.state === 'shell') {
      e.body.setVelocityX(0);
      const left = e.until - time;
      e.setAngle(left < 1500 ? Math.sin(time / 40) * 6 : 0);
      if (left <= 0) {
        e.setAngle(0);
        e.state = 'walk';
        e.body.setSize(12, 12).setOffset(2, 4);
        e.anims.play('turtle-walk');
      }
      return;
    }
    if (e.state === 'slide') {
      const b = e.body;
      if (b.blocked.left) e.dir = 1;
      else if (b.blocked.right) e.dir = -1;
      b.setVelocityX(e.dir * 175);
      if (time > e.until) this.shellUp(e);
    }
  }

  updCroc(e, time, p) {
    const near = Math.abs(p.x - e.x) < 70 && Math.abs(p.y - e.y) < 26;
    if (e.state === 'snap') {
      e.body.setVelocityX(e.dir * e.speed * 2.2); // lunge
      if (time > e.snapUntil) {
        e.state = 'walk';
        e.anims.play('croc-walk');
        e.nextSnap = time + 1800;
      }
    } else {
      this.walk(e, e.speed, true);
      if (near && time > e.nextSnap) {
        e.dir = p.x < e.x ? -1 : 1;
        e.setFlipX(e.dir > 0);
        e.state = 'snap';
        e.snapUntil = time + 520;
        e.anims.play('croc-snap');
      }
    }
  }

  updBat(e, time) {
    if (e.x > e.x0 + e.range) e.dir = -1;
    else if (e.x < e.x0 - e.range) e.dir = 1;
    const ty = e.y0 + Math.sin(time / 320 + e.phase) * 16;
    e.body.setVelocity(e.dir * e.speed, (ty - e.y) * 5);
    e.setFlipX(e.dir > 0);
  }

  updDiver(e, time, p) {
    const b = e.body;
    if (e.state === 'hover') {
      const ty = e.y0 + Math.sin(time / 380) * 5;
      b.setVelocity(0, (ty - e.y) * 6);
      e.setFlipX(p.x > e.x);
      if (time > e.cool && Math.abs(p.x - e.x) < 70 && p.y > e.y + 20) {
        e.state = 'tele';
        e.until = time + 480;
        e.anims.stop();
        e.setFrame(0);
      }
    } else if (e.state === 'tele') {
      b.setVelocity(0, 0);
      e.x += Math.sin(time / 25) * 0.6;
      e.setTint(Math.floor(time / 80) % 2 ? 0xff8888 : 0xffffff);
      if (time > e.until) {
        e.clearTint();
        e.state = 'dive';
        e.until = time + 900;
        e.anims.play('diver-dive');
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const len = Math.hypot(dx, dy) || 1;
        const sp = 150 * this.diff.spd;
        b.setVelocity((dx / len) * sp, (dy / len) * sp);
      }
    } else if (e.state === 'dive') {
      if (time > e.until || e.y > 11.2 * 16) {
        e.state = 'rise';
        e.anims.play('diver-fly');
      }
    } else if (e.state === 'rise') {
      const dx = e.x0 - e.x;
      const dy = e.y0 - e.y;
      const len = Math.hypot(dx, dy) || 1;
      b.setVelocity((dx / len) * 80, (dy / len) * 80);
      if (len < 6) {
        e.state = 'hover';
        e.cool = time + 1400;
      }
    }
  }

  updPiranha(e, time, p) {
    const lift = 20;
    const safe = Math.abs(p.x - e.x) < 22 && p.body.bottom <= e.baseY - 14; // you're standing on the pipe
    if (e.state === 'hidden') {
      if (time > e.until && !safe) {
        e.state = 'rising';
        this.s.tweens.add({ targets: e, y: e.baseY - lift, duration: 450, ease: 'Sine.out', onComplete: () => ((e.state = 'up'), (e.until = this.s.time.now + 1300)) });
      }
    } else if (e.state === 'up' && time > e.until) {
      e.state = 'lowering';
      this.s.tweens.add({ targets: e, y: e.baseY, duration: 450, ease: 'Sine.in', onComplete: () => ((e.state = 'hidden'), (e.until = this.s.time.now + 1500)) });
    }
    e.visibleHeight = e.baseY - e.y;
    e.body.updateFromGameObject?.();
  }
}
