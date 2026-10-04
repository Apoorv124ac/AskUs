import Phaser from 'phaser';
import { GAME, PALETTE as C } from '../config.js';
import dialogue from '../data/dialogue.json';
import resume from '../data/resume.json';
import worldData from '../data/worlds.json';
import { text, drawBox, fadeTo, fmt, disc } from '../systems/UI.js';

const WORLDS = worldData.worlds;
const NODES = [[30, 148], [68, 112], [110, 146], [150, 106], [192, 142], [226, 100]];
const WALK = [1, 0, 2, 0];
const hex = (s) => parseInt(s.slice(1), 16);

/** World map: pick a world (locked/unlocked), toggle Recruiter Mode, jump to Contact, open the classic resume. */
export class WorldMapScene extends Phaser.Scene {
  constructor() { super('WorldMap'); }

  create(data) {
    const sv = this.sv = this.game.services;
    const W = dialogue.worldmap;
    this.vars = { name: resume.meta.name.toUpperCase() };
    this.leaving = false; this.animT = 0;
    if (this.scene.isActive('HUD')) this.scene.stop('HUD');
    this.cameras.main.fadeIn(300, 15, 15, 27);

    // selection: the world just cleared -> the next one, otherwise the last played / first open one
    const cleared = data?.cleared;
    this.sel = cleared ? Math.min(cleared + 1, WORLDS.length) - 1 : Math.min(sv.state.lastWorld, WORLDS.length) - 1;
    if (!sv.state.isUnlocked(this.sel + 1)) this.sel = 0;

    this.add.image(0, 0, 'map_bg').setOrigin(0);
    this.g = this.add.graphics().setDepth(2);
    this.nums = NODES.map(([x, y], i) => text(this, x, y, String(i + 1), { size: 8, color: C.black, shadow: false }).setDepth(3));
    NODES.forEach(([x, y], i) => {
      this.add.zone(x, y, 30, 30).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.#tap(i)).setDepth(4);
    });

    const [hx, hy] = NODES[this.sel];
    this.hero = this.add.sprite(hx, hy - 8, `hero_t${sv.state.tier}`, 0).setOrigin(0.5, 1).setDepth(5);
    this.hx = hx; this.hy = hy - 8;

    // top bar
    this.add.rectangle(0, 0, GAME.width, 22, 0x0f0f1b, 0.7).setOrigin(0).setDepth(6);
    text(this, 8, 11, W.title, { size: 8, color: C.yellow, origin: [0, 0.5] }).setDepth(7);
    this.topRight = text(this, 248, 11, '', { size: 8, origin: [1, 0.5] }).setDepth(7);

    // recruiter controls (tap or keys R / H / V)
    this.btnRec = text(this, 128, 34, '', { size: 8, backing: true, shadow: false }).setDepth(7).setInteractive({ useHandCursor: true });
    this.btnRec.on('pointerdown', () => this.#toggleRecruiter());
    this.btnContact = text(this, 6, 52, '[H] ' + W.contact, { size: 8, color: C.lime, backing: true, shadow: false, origin: [0, 0.5] }).setDepth(7).setInteractive({ useHandCursor: true });
    this.btnContact.on('pointerdown', () => this.#goContact());
    this.btnResume = text(this, 250, 52, '[V] ' + W.resume, { size: 8, color: C.cyan, backing: true, shadow: false, origin: [1, 0.5] }).setDepth(7).setInteractive({ useHandCursor: true });
    this.btnResume.on('pointerdown', () => this.#openResume());

    // info panel
    const box = this.add.graphics().setDepth(8); drawBox(box, 8, 160, 240, 58);
    this.pName = text(this, 18, 173, '', { size: 8, color: C.yellow, origin: [0, 0.5], shadow: false }).setDepth(9);
    this.pDesc = text(this, 18, 185, '', { size: 8, origin: [0, 0.5], shadow: false }).setDepth(9);
    this.pStat = text(this, 18, 197, '', { size: 8, origin: [0, 0.5], shadow: false }).setDepth(9);
    this.pStand = text(this, 240, 197, 'PLACEHOLDER LEVEL', { size: 8, color: C.lgrey, origin: [1, 0.5], shadow: false }).setDepth(9);
    text(this, 18, 209, W.hint, { size: 8, color: C.lgrey, origin: [0, 0.5], shadow: false }).setDepth(9);

    if (cleared) this.#banner(fmt(W.cleared_banner, { n: cleared }));
    this.refresh();
  }

  #banner(str) {
    const t = text(this, 128, 34, str, { size: 8, color: C.yellow, backing: true }).setDepth(20);
    this.sv.audio.sfx('levelup');
    this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 500, onComplete: () => t.destroy() });
  }

  #tap(i) { if (this.sel === i) this.#start(); else this.#select(i); }

  #select(i) {
    if (i === this.sel || i < 0 || i >= WORLDS.length) return;
    this.sel = i; this.sv.audio.sfx('menu'); this.refresh();
  }

  #toggleRecruiter() {
    const s = this.sv;
    s.state.setRecruiter(!s.state.recruiter);
    s.audio.sfx(s.state.recruiter ? 'grant' : 'menu');
    this.refresh();
  }

  #goContact() {
    if (!this.sv.state.recruiter) return;
    this.sel = WORLDS.length - 1; this.#start();
  }

  #openResume() {
    if (!this.sv.state.recruiter) return;
    const url = resume.meta.classicResumeUrl;
    if (url) window.open(url, '_blank', 'noopener');
    else this.#banner(dialogue.worldmap.noResume.slice(0, 26));
  }

  #start() {
    if (this.leaving) return;
    const { state, audio, save } = this.sv;
    const w = WORLDS[this.sel];
    if (!state.isUnlocked(w.id)) {
      audio.sfx('deny');
      if (!save.settings.reducedMotion) this.cameras.main.shake(120, 0.004);
      return;
    }
    this.leaving = true;
    state.lastWorld = w.id; state.persist();
    audio.sfx('confirm'); audio.startMusic();
    fadeTo(this, 'Level', { map: w.map, spawn: 'start', world: w.id });
  }

  refresh() {
    const { state } = this.sv, W = dialogue.worldmap, w = WORLDS[this.sel];
    this.pName.setText(w.name);
    this.pDesc.setText(fmt(w.desc, this.vars));
    const unlocked = state.isUnlocked(w.id), done = state.worlds.has(w.id);
    this.pStat.setText(done ? W.cleared : unlocked ? W.ready : fmt(W.locked, { prev: w.id - 1 })).setColor(done ? C.lime : unlocked ? C.yellow : C.red);
    this.pStand.setVisible(!!w.standIn && unlocked);
    this.btnRec.setText(state.recruiter ? W.recruiterOn : W.recruiterOff).setColor(state.recruiter ? C.lime : C.white);
    this.btnContact.setVisible(state.recruiter); this.btnResume.setVisible(state.recruiter);
    this.topRight.setText(`x${String(state.coins).padStart(3, '0')} ${state.tierTitle}`);
    this.nums.forEach((n, i) => n.setVisible(state.isUnlocked(i + 1)));
  }

  update(time, delta) {
    const { input, state, save } = this.sv;
    const calm = save.settings.reducedMotion, dt = Math.min(delta / 1000, 1 / 30);

    if (input.justPressed('left')) this.#select(this.sel - 1);
    if (input.justPressed('right')) this.#select(this.sel + 1);
    for (let i = 1; i <= WORLDS.length; i++) if (input.justPressed('n' + i)) this.#select(i - 1);
    if (input.confirmPressed()) this.#start();
    if (input.justPressed('recruiter')) this.#toggleRecruiter();
    if (input.justPressed('contact')) this.#goContact();
    if (input.justPressed('resume')) this.#openResume();
    if (input.justPressed('pause') && !this.leaving) { this.leaving = true; fadeTo(this, 'Title'); }

    // hero walks to the selected node
    const [tx, ty] = NODES[this.sel], target = { x: tx, y: ty - 8 };
    const dx = target.x - this.hx, dy = target.y - this.hy, dist = Math.hypot(dx, dy);
    if (calm || dist < 1) { this.hx = target.x; this.hy = target.y; }
    else { const step = Math.min(dist, 150 * dt); this.hx += (dx / dist) * step; this.hy += (dy / dist) * step; }
    const moving = dist > 1 && !calm;
    if (moving) { this.animT += dt * 9; this.hero.setFrame(WALK[Math.floor(this.animT) % 4]); this.hero.setFlipX(dx < 0); }
    else this.hero.setFrame(0);
    this.hero.setPosition(Math.round(this.hx), Math.round(this.hy));

    // draw path + nodes
    const g = this.g; g.clear();
    for (let i = 0; i < NODES.length - 1; i++) {
      const [x1, y1] = NODES[i], [x2, y2] = NODES[i + 1], open = state.isUnlocked(i + 2);
      const len = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(len / 6);
      g.fillStyle(hex(open ? C.cream : C.grey));
      for (let k = 1; k < n; k++) g.fillRect(Math.round(x1 + ((x2 - x1) * k) / n) - 1, Math.round(y1 + ((y2 - y1) * k) / n) - 1, 3, 3);
    }
    NODES.forEach(([x, y], i) => {
      const id = i + 1, unlocked = state.isUnlocked(id), done = state.worlds.has(id), isSel = i === this.sel;
      const bob = isSel && !calm ? Math.round(Math.sin(time / 180)) : 0;
      g.fillStyle(hex(C.black)); disc(g, x, y + 2, 11);
      g.fillStyle(hex(isSel ? C.white : C.black)); disc(g, x, y + bob, 11);
      g.fillStyle(hex(done ? C.green : unlocked ? C.yellow : C.grey)); disc(g, x, y + bob, 9);
      this.nums[i].setPosition(x, y + bob + 1);
      if (done) { g.fillStyle(hex(C.white)); g.fillRect(x - 4, y + bob - 1, 2, 2); g.fillRect(x - 2, y + bob + 1, 2, 2); g.fillRect(x, y + bob - 1, 2, 2); g.fillRect(x + 2, y + bob - 3, 2, 2); this.nums[i].setVisible(false); }
      else if (!unlocked) { // padlock
        g.fillStyle(hex(C.black)); g.fillRect(x - 3, y - 1, 7, 6); g.fillRect(x - 2, y - 5, 1, 4); g.fillRect(x + 2, y - 5, 1, 4); g.fillRect(x - 1, y - 6, 3, 1);
        g.fillStyle(hex(C.yellow)); g.fillRect(x, y + 1, 1, 2);
      }
    });
  }
}
