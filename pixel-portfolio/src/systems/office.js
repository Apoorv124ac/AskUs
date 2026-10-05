// World 3 "Office Floors": one floor per role. Floor 1 collects client badges; floors 2-5 have a
// boss tied to a real achievement. Every stomp reveals one resume bullet. Beating the floor opens
// the gate to the elevator.
import { save, persist } from './save.js';
import resume from '../data/resume.json';
import { burst } from '../ui/pixel.js';
import { sfx } from './audio.js';

const EXP = [...resume.experience].reverse(); // chronological: freelance, Bhoomi, Deloitte, JLL, WSP
const SHORT = ['FREELANCE', 'BHOOMI', 'DELOITTE DIGITAL', 'JLL', 'WSP'];
const CLIENTS = EXP[0].company.split(', ');
const GATE_ROWS = [3, 4, 5, 6, 7, 8, 9, 10, 11];

export class OfficeTasks {
  constructor(scene) {
    this.s = scene;
    this.L = scene.level;
    this.p = scene.player;
    this.spec = this.L.office;
    this.k = this.spec.floor;
    this.done = save.floors[this.k];
    this.hits = 0;
    this.riding = false;
    this.lastHud = null;
    const phys = scene.physics;
    this.gates = phys.add.staticGroup();
    this.badges = phys.add.staticGroup();
    this.bossGroup = phys.add.group({ allowGravity: true });
    this.gateTiles = [];

    this.buildElevator();
    if (!this.done) {
      this.gateTiles = GATE_ROWS.map((r) => this.gates.create(this.spec.gateCol * 16 + 8, r * 16 + 8, 'tile-gate').setDepth(3));
      if (this.spec.kind === 'clients') this.spawnBadges();
      else this.spawnBoss();
    }
    phys.add.collider(this.p, this.gates);
    phys.add.collider(this.bossGroup, scene.solids);
    phys.add.overlap(this.p, this.badges, (_, it) => this.collectBadge(it));
    phys.add.overlap(this.p, this.bossGroup, (_, boss) => this.touchBoss(boss));
    if (this.elevator) phys.add.overlap(this.p, this.elevator, () => this.ride());

    scene.time.delayedCall(450, () =>
      scene.game.events.emit('chapter', {
        title: `FLOOR ${this.k + 1}/5 · ${SHORT[this.k]}`,
        sub: EXP[this.k].dates.toUpperCase(),
      })
    );
  }

  buildElevator() {
    let col = null;
    this.L.grid[11].forEach((ch, c) => ch === 'E' && (col = c));
    if (col === null) return;
    this.elevator = this.s.physics.add.staticSprite(col * 16 + 8, 12 * 16 - 16, 'elevator', this.done ? 0 : 1).setDepth(2);
    this.elevator.body.setSize(10, 28);
  }

  spawnBadges() {
    const cols = [];
    this.L.grid.forEach((row, r) => row.forEach((ch, c) => ch === 'k' && cols.push([c, r])));
    cols.sort((a, b) => a[0] - b[0]);
    cols.forEach(([c, r], n) => {
      const id = `${this.L.room}:${c},${r}`;
      if (this.s.collected.has(id)) return;
      const it = this.badges.create(c * 16 + 8, r * 16 + 8, 'badge').setDepth(4);
      it.itemId = id;
      it.n = n;
      this.s.tweens.add({ targets: it, y: it.y - 3, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
    });
  }

  collectBadge(it) {
    const { s } = this;
    s.collected.add(it.itemId);
    const name = CLIENTS[it.n] || 'CLIENT';
    s.popText(it.x, it.y - 8, `CLIENT ${it.n + 1}`);
    burst(s, it.x, it.y, { n: 10, colors: [0xf83800, 0xfcfcfc, 0xf8d878] });
    s.game.events.emit('fact', {
      icon: 'badge',
      title: `CLIENT ${it.n + 1}/${CLIENTS.length}`,
      label: 'FREELANCE',
      tag: '2013',
      text: `I DESIGNED FOR *${name.toUpperCase()}*.`,
    });
    it.destroy();
    s.award();
    this.lastHud = null;
    if (this.badges.countActive() === 0) this.complete();
  }

  spawnBoss() {
    const { s } = this;
    const b = this.spec.boss;
    const key = `boss${this.k - 1}`;
    const boss = this.bossGroup.create(b.col * 16 + 8, 12 * 16 - 16, key, 0).setDepth(4);
    boss.body.setSize(26, 26).setOffset(3, 6);
    boss.anims.play(`${key}-idle`);
    boss.hp = b.hp;
    boss.dir = -1;
    boss.invuln = false;
    boss.nextHop = s.time.now + 1800;
    this.boss = boss;
    this.s.registry.set('bossBar', { name: b.name, hp: b.hp, max: b.hp });
  }

  touchBoss(boss) {
    const { s, p } = this;
    if (boss.dead || boss.invuln) return;
    const stomp = p.body.velocity.y > -30 && p.body.bottom <= boss.body.top + 12;
    if (!stomp) return s.hurtPlayer(boss.x);
    boss.hp--;
    sfx('boss');
    this.hits++;
    s.registry.set('bossBar', { name: this.spec.boss.name, hp: boss.hp, max: this.spec.boss.hp });
    this.lastHud = null;
    boss.invuln = true;
    p.setVelocityY(-260);
    s.cameras.main.shake(140, 0.006);
    s.popText(boss.x, boss.y - 22, 'HIT!');
    burst(s, boss.x, boss.y - 8, { n: 12 });
    s.tweens.add({ targets: boss, alpha: 0.3, yoyo: true, repeat: 4, duration: 90, onComplete: () => boss.setAlpha(1) });
    s.award();

    const n = this.hits;
    const total = this.spec.boss.hp;
    s.game.events.emit('fact', {
      icon: 'badge',
      title: `FLOOR ${this.k + 1}/5 · HIT ${n}/${total}`,
      label: SHORT[this.k],
      tag: EXP[this.k].year,
      text: EXP[this.k].short[n - 1] || '',
    });
    if (boss.hp <= 0) return this.defeat(boss);
    s.time.delayedCall(1000, () => (boss.invuln = false));
  }

  defeat(boss) {
    const { s } = this;
    boss.dead = true;
    boss.body.enable = false;
    s.registry.set('bossBar', null);
    s.tweens.add({ targets: boss, scale: 0, angle: 360, alpha: 0, duration: 600, ease: 'Back.in', onComplete: () => boss.destroy() });
    burst(s, boss.x, boss.y, { n: 24, spread: 50, colors: [0xf83800, 0xf8d878, 0xfcfcfc, 0x58d854] });
    this.complete();
  }

  complete() {
    const { s } = this;
    if (save.floors[this.k]) return;
    save.floors[this.k] = true;
    this.done = true;
    persist();
    this.gateTiles.forEach((t, i) => {
      s.tweens.add({ targets: t, y: t.y - 40, alpha: 0, delay: i * 40, duration: 400, onComplete: () => t.destroy() });
      this.gates.remove(t);
      t.body.enable = false;
    });
    if (this.elevator) this.elevator.setFrame(0);
    s.award();
    s.award();
    s.lockAnim('celebrate', 1500);
    s.cameras.main.shake(200, 0.005);
    s.time.delayedCall(700, () => s.game.events.emit('banner', `SKILL UNLOCKED!\n${this.spec.skill}`));
    this.lastHud = null;
  }

  ride() {
    const { s, p } = this;
    if (!this.done || this.riding) return;
    this.riding = true;
    p.body.enable = false;
    p.setVelocity(0, 0);
    p.anims.play('idle', true);
    s.registry.set('coffeeMs', s.coffeeMs);
    s.tweens.add({ targets: p, x: this.elevator.x, alpha: 0, duration: 350 });
    s.time.delayedCall(350, () => {
      this.elevator.setFrame(1);
      s.cameras.main.shake(500, 0.003);
      s.game.events.emit('banner', `GOING UP!\nFLOOR ${this.k + 2}`);
    });
    s.time.delayedCall(1100, () => {
      s.cameras.main.fadeOut(300, 15, 15, 27);
      s.cameras.main.once('camerafadeoutcomplete', () => s.scene.start('Game', { room: `floor${this.k + 2}` }));
    });
  }

  update() {
    const { s } = this;
    const b = this.boss;
    if (b && !b.dead && b.body) {
      if (b.body.blocked.left) b.dir = 1;
      else if (b.body.blocked.right) b.dir = -1;
      const speed = 38 + this.hits * 14; // gets faster as it takes hits
      b.body.setVelocityX(b.dir * speed);
      b.setFlipX(b.dir > 0);
      if (b.body.blocked.down && s.time.now > b.nextHop) {
        b.body.setVelocityY(-170);
        b.nextHop = s.time.now + 1600 + Math.random() * 900;
      }
    }
    let hud;
    if (this.done) hud = `FL${this.k + 1}/5 DONE`;
    else if (this.spec.kind === 'clients') hud = `FL1/5 CLIENTS ${CLIENTS.length - this.badges.countActive()}/${CLIENTS.length}`;
    else hud = `FL${this.k + 1}/5 BOSS ${this.hits}/${this.spec.boss.hp}`;
    if (hud !== this.lastHud) {
      this.lastHud = hud;
      s.registry.set('hudInfo', hud);
    }
  }
}
