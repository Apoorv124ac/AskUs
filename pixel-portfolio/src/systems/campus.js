// World 2 "Training Campus": one classroom per degree. Each has a small task;
// finishing it opens the gate and awards the degree scroll.
import { LEVELS } from '../levels.js';
import { save, persist } from './save.js';
import resume from '../data/resume.json';
import { burst } from '../ui/pixel.js';

const KIND = { s: 'swatch', b: 'bug', i: 'bulb', 1: 'node', 2: 'node', 3: 'node', 4: 'node' };
const WORLD2 = LEVELS.world2;
const EDU = [...resume.education].reverse(); // chronological: BSc, MA, IIT Delhi, IIT Guwahati
const GATE_ROWS = [4, 5, 6, 7, 8, 9, 10, 11];

// every task item of one classroom, across both rooms (main hall + secret lab)
export function stationEntries(k) {
  const out = [];
  for (const key of ['world2', 'lab']) {
    const L = LEVELS[key];
    for (let r = 0; r < L.h; r++)
      for (let c = 0; c < L.w; c++) {
        const ch = L.grid[r][c];
        if (!KIND[ch]) continue;
        const st = L.forceStation ?? WORLD2.stations.findIndex((s) => c >= s.from && c <= s.to);
        if (st === k) out.push({ room: key, col: c, row: r, ch, id: `${key}:${c},${r}` });
      }
  }
  return out;
}

export class CampusTasks {
  constructor(scene) {
    this.s = scene;
    this.L = scene.level;
    this.p = scene.player;
    this.stations = WORLD2.stations;
    this.announced = new Set();
    this.nodeNext = 1;
    this.cleared = new Set();
    this.nodeCooldown = 0;
    this.lastHud = null;
    this.gateTiles = new Map();

    const phys = scene.physics;
    this.swatches = phys.add.staticGroup();
    this.bulbs = phys.add.staticGroup();
    this.nodes = phys.add.staticGroup();
    this.gates = phys.add.staticGroup();
    this.bugs = phys.add.group({ allowGravity: true });

    this.spawn();
    phys.add.collider(this.p, this.gates);
    phys.add.collider(this.bugs, scene.solids);
    phys.add.overlap(this.p, this.swatches, (_, it) => this.collect(it, 'swatch'));
    phys.add.overlap(this.p, this.bulbs, (_, it) => this.collect(it, 'bulb'));
    phys.add.overlap(this.p, this.nodes, (_, it) => this.touchNode(it));
    phys.add.overlap(this.p, this.bugs, (_, bug) => this.touchBug(bug));
    scene.registry.set('degrees', save.degrees.filter(Boolean).length);
  }

  stationAt(col) {
    return this.stations.findIndex((s) => col >= s.from && col <= s.to);
  }

  spawn() {
    const { s, L } = this;
    for (let r = 0; r < L.h; r++)
      for (let c = 0; c < L.w; c++) {
        const ch = L.grid[r][c];
        const kind = KIND[ch];
        if (!kind) continue;
        const k = L.forceStation ?? this.stationAt(c);
        if (save.degrees[k]) continue; // already earned: classroom stays empty
        const id = `${L.room}:${c},${r}`;
        if (kind !== 'node' && s.collected.has(id)) continue;
        const x = c * 16 + 8;
        const y = r * 16 + 8;
        if (kind === 'swatch') {
          const it = this.swatches.create(x, y, 'swatch', c % 3).setDepth(4);
          it.itemId = id;
          it.station = k;
          s.tweens.add({ targets: it, y: y - 2, yoyo: true, repeat: -1, duration: 600, delay: c * 40 });
        } else if (kind === 'bulb') {
          const it = this.bulbs.create(x, y, 'bulb').setDepth(4);
          it.itemId = id;
          it.station = k;
          s.tweens.add({ targets: it, y: y - 3, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
        } else if (kind === 'node') {
          const it = this.nodes.create(x, y, 'nodes', Number(ch) - 1).setDepth(4);
          it.num = Number(ch);
          it.station = k;
        } else if (kind === 'bug') {
          const bug = this.bugs.create(x, y, 'bug', 0).setDepth(4);
          bug.body.setSize(12, 10).setOffset(2, 5);
          bug.itemId = id;
          bug.station = k;
          bug.dir = c % 2 ? 1 : -1;
          bug.anims.play('bug-walk');
        }
      }

    if (L.room === 'world2') {
      this.stations.forEach((st, k) => {
        if (save.degrees[k]) return;
        const tiles = GATE_ROWS.map((r) => this.gates.create(st.gateCol * 16 + 8, r * 16 + 8, 'tile-gate').setDepth(3));
        this.gateTiles.set(k, tiles);
      });
    }
  }

  // how many items of station k are done
  have(k) {
    if (save.degrees[k]) return stationEntries(k).length;
    const st = this.stations[k];
    if (st.kind === 'node') return this.nodeNext - 1;
    return stationEntries(k).filter((e) => this.s.collected.has(e.id)).length;
  }

  collect(it, what) {
    const { s } = this;
    s.collected.add(it.itemId);
    s.popText(it.x, it.y - 8, what === 'swatch' ? 'COLOUR!' : 'IDEA!');
    burst(s, it.x, it.y, { n: 8, colors: what === 'bulb' ? [0xf8d878, 0xfcfcfc] : [0xf83800, 0xf8d878, 0x0058f8] });
    const k = it.station;
    it.destroy();
    s.award();
    this.check(k);
  }

  touchNode(it) {
    const { s } = this;
    if (s.time.now < this.nodeCooldown || this.cleared.has(it.num) || save.degrees[it.station]) return;
    this.nodeCooldown = s.time.now + 500;
    if (it.num === this.nodeNext) {
      this.cleared.add(it.num);
      it.setTint(0x58d854);
      s.popText(it.x, it.y - 10, `${it.num}/4`);
      burst(s, it.x, it.y, { n: 8, colors: [0x58d854, 0xfcfcfc] });
      this.nodeNext++;
      s.award();
      if (this.nodeNext > 4) this.complete(it.station);
    } else {
      this.nodeNext = 1;
      this.cleared.clear();
      this.nodes.getChildren().forEach((n) => {
        n.clearTint();
        s.tweens.add({ targets: n, scale: { from: 1.4, to: 1 }, duration: 250, ease: 'Back.out' });
      });
      s.cameras.main.shake(100, 0.003);
      s.game.events.emit('banner', 'WRONG ORDER!\nSTART AGAIN FROM 1');
    }
  }

  touchBug(bug) {
    const { s, p } = this;
    if (bug.dead) return;
    const stomp = p.body.velocity.y > -30 && p.body.bottom <= bug.body.top + 12; // generous: easy to hit
    if (!stomp) return s.hurtPlayer(bug.x);
    bug.dead = true;
    bug.body.enable = false;
    s.collected.add(bug.itemId);
    p.setVelocityY(-220);
    s.popText(bug.x, bug.y - 10, 'TYPO FIXED!');
    burst(s, bug.x, bug.y, { n: 10, colors: [0xf83800, 0xfcfcfc, 0xf8d878] });
    s.tweens.add({ targets: bug, scaleY: 0.2, alpha: 0, y: bug.y + 5, duration: 260, onComplete: () => bug.destroy() });
    s.award();
    this.check(bug.station);
  }

  check(k) {
    if (this.have(k) >= stationEntries(k).length) this.complete(k);
    else this.lastHud = null;
  }

  complete(k) {
    const { s } = this;
    if (save.degrees[k]) return;
    save.degrees[k] = true;
    persist();
    s.registry.set('degrees', save.degrees.filter(Boolean).length);

    // open the gate
    (this.gateTiles.get(k) || []).forEach((t, i) => {
      s.tweens.add({
        targets: t,
        y: t.y - 40,
        alpha: 0,
        delay: i * 40,
        duration: 400,
        onComplete: () => t.destroy(),
      });
      this.gates.remove(t);
      t.body.enable = false;
    });
    s.cameras.main.shake(200, 0.005);
    s.award();
    s.award();

    const e = EDU[k];
    s.game.events.emit('fact', {
      icon: 'scroll',
      title: `DEGREE ${k + 1}/4`,
      label: e.short,
      tag: e.years.slice(-4),
      text: `*${e.school.toUpperCase()}*, ${e.years.replace('-', ' - ')}. ${e.story}`,
    });
    s.lockAnim('celebrate', 1500);
    s.time.delayedCall(600, () => s.game.events.emit('banner', save.degrees.every(Boolean) ? 'GRADUATED!\nALL 4 SCROLLS EARNED' : 'GATE OPEN!'));
    this.lastHud = null;
  }

  update() {
    const { s, p } = this;
    const col = Math.floor(p.x / 16);

    // bugs patrol and turn at walls
    this.bugs.getChildren().forEach((b) => {
      if (b.dead || !b.body) return;
      if (b.body.blocked.left) b.dir = 1;
      else if (b.body.blocked.right) b.dir = -1;
      b.body.setVelocityX(b.dir * 28);
      b.setFlipX(b.dir > 0);
    });

    // announce each classroom as you enter it
    const k = s.level.forceStation ?? this.stationAt(col);
    if (k >= 0 && !this.announced.has(k) && !save.degrees[k] && s.level.room === 'world2') {
      this.announced.add(k);
      const st = this.stations[k];
      s.game.events.emit('chapter', { title: `DEGREE ${k + 1}/4 · ${st.title}`, sub: st.objective });
    }

    // HUD line for the current classroom
    const sk = k >= 0 ? k : -1;
    let hud;
    if (sk < 0) hud = `DEGREES ${save.degrees.filter(Boolean).length}/4`;
    else if (save.degrees[sk]) hud = `T${sk + 1}/4 DONE`;
    else hud = `T${sk + 1}/4 ${this.stations[sk].name} ${this.have(sk)}/${stationEntries(sk).length}`;
    if (hud !== this.lastHud) {
      this.lastHud = hud;
      s.registry.set('hudInfo', hud);
    }
  }
}
