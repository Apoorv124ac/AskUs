import Phaser from 'phaser';
import { CLASSIC_RESUME_URL } from '../config.js';
import { WORLDS } from '../data/worlds.js';
import { save, persist } from '../systems/save.js';
import { txt, panel, go, skyline } from '../ui/pixel.js';

const NODE_X = [28, 68, 108, 148, 188, 228];
const NODE_Y = [98, 72, 98, 72, 98, 72];

// World map: jump to any unlocked world with < > (or A/D), Enter to play.
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this._leaving = false;
    // the HUD overlay belongs to gameplay only
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    this.cameras.main.setBackgroundColor(0x3cbcfc).fadeIn(300, 15, 15, 27);
    this.drift = skyline(this);

    this.sel = Phaser.Math.Clamp(save.lastWorld || 0, 0, WORLDS.length - 1);

    // top bar
    this.add.rectangle(0, 0, 256, 16, 0x0f0f1b, 0.7).setOrigin(0).setDepth(8);
    txt(this, 6, 4, `HELLO, ${save.name || 'GUEST'}!`, { color: '#f8d878' });
    this.coinText = txt(this, 250, 4, '', { origin: [1, 0] });

    // dotted path between nodes
    const path = this.add.graphics().setDepth(4);
    for (let i = 0; i < NODE_X.length - 1; i++) {
      const steps = 9;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        path.fillStyle(0xfcfcfc).fillRect(
          Math.round(NODE_X[i] + (NODE_X[i + 1] - NODE_X[i]) * t),
          Math.round(NODE_Y[i] + (NODE_Y[i + 1] - NODE_Y[i]) * t),
          2,
          2
        );
      }
    }

    // nodes
    this.nodes = WORLDS.map((w, i) => {
      const x = NODE_X[i];
      const y = NODE_Y[i];
      const ring = this.add.rectangle(x, y, 28, 28, 0xfcfcfc).setDepth(5).setVisible(false);
      const ink = this.add.rectangle(x, y, 24, 24, 0x0f0f1b).setDepth(6).setInteractive({ useHandCursor: true });
      const fill = this.add.rectangle(x, y, 20, 20, w.color).setDepth(7);
      const num = txt(this, x, y + 1, String(w.id), { origin: 0.5, depth: 9 });
      const badge = txt(this, x + 9, y - 14, '', { origin: 0.5, depth: 9, size: 8 });
      ink.on('pointerdown', () => (this.sel === i ? this.play() : this.select(i)));
      return { ring, ink, fill, num, badge, w };
    });

    // hero marker
    this.hero = this.add.sprite(NODE_X[this.sel], NODE_Y[this.sel] - 30, 'hero', 0).setDepth(9);
    this.hero.anims.play('idle');
    this.bob = this.tweens.add({ targets: this.hero, y: '+=3', yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });

    // prev / next arrows
    this.prevBtn = txt(this, 3, 106, '<', { size: 16, depth: 9 }).setInteractive({ useHandCursor: true });
    this.nextBtn = txt(this, 238, 106, '>', { size: 16, depth: 9 }).setInteractive({ useHandCursor: true });
    this.prevBtn.on('pointerdown', () => this.select(this.sel - 1));
    this.nextBtn.on('pointerdown', () => this.select(this.sel + 1));

    // info panel
    panel(this, 6, 126, 244, 94);
    this.title = txt(this, 14, 133, '', { color: '#f8d878' });
    this.topic = txt(this, 14, 145, '', { color: '#58d854' });
    this.desc = txt(this, 14, 159, '', { wrap: 228, color: '#fcfcfc' });
    this.status = txt(this, 14, 184, '', { color: '#bcbcbc' });
    txt(this, 14, 197, '< >  SELECT      ENTER  PLAY', { color: '#7c7c7c', shadow: false });
    this.recruiterBtn = txt(this, 14, 208, '', { color: '#fcfcfc', shadow: false }).setInteractive({ useHandCursor: true });
    this.resumeBtn = txt(this, 246, 208, 'C: RESUME', { origin: [1, 0], shadow: false }).setInteractive({ useHandCursor: true });
    this.recruiterBtn.on('pointerdown', () => this.toggleRecruiter());
    this.resumeBtn.on('pointerdown', () => this.openResume());

    const kb = this.input.keyboard;
    kb.on('keydown-LEFT', () => this.select(this.sel - 1));
    kb.on('keydown-A', () => this.select(this.sel - 1));
    kb.on('keydown-RIGHT', () => this.select(this.sel + 1));
    kb.on('keydown-D', () => this.select(this.sel + 1));
    kb.on('keydown-ENTER', () => this.play());
    kb.on('keydown-SPACE', () => this.play());
    kb.on('keydown-R', () => this.toggleRecruiter());
    kb.on('keydown-C', () => this.openResume());

    this.refresh(true);
  }

  unlocked(i) {
    return save.recruiter || i === 0 || save.completed[i - 1];
  }

  stateOf(i) {
    if (save.completed[i]) return 'done';
    if (!this.unlocked(i)) return 'locked';
    return WORLDS[i].ready ? 'open' : 'soon';
  }

  select(i) {
    const n = Phaser.Math.Clamp(i, 0, WORLDS.length - 1);
    if (n === this.sel) return;
    this.sel = n;
    save.lastWorld = n;
    persist();
    this.refresh();
  }

  play() {
    const st = this.stateOf(this.sel);
    const w = WORLDS[this.sel];
    if (st === 'locked') return this.flash(`LOCKED. FINISH WORLD ${this.sel} FIRST.`);
    if (!w.ready) return this.flash(`COMING SOON (BUILD DAY ${w.day}).`);
    this.registry.remove('checkpoint');
    go(this, 'Game', { room: w.room });
  }

  flash(msg) {
    this.status.setText(msg).setColor('#f83800');
    this.cameras.main.shake(100, 0.003);
    this.time.delayedCall(1400, () => this.refresh());
  }

  toggleRecruiter() {
    save.recruiter = !save.recruiter;
    persist();
    this.refresh();
  }

  openResume() {
    if (CLASSIC_RESUME_URL) window.open(CLASSIC_RESUME_URL, '_blank', 'noopener');
  }

  refresh(instant = false) {
    const reg = this.registry;
    this.coinText.setText(`COINS ${String(reg.get('coins') || 0).padStart(2, '0')}`);

    this.nodes.forEach((n, i) => {
      const st = this.stateOf(i);
      n.fill.setFillStyle(st === 'locked' ? 0x7c7c7c : n.w.color);
      n.num.setText(st === 'locked' ? '?' : String(n.w.id));
      n.badge.setText(st === 'done' ? 'OK' : '').setColor('#58d854');
      n.ring.setVisible(i === this.sel);
      this.tweens.add({ targets: [n.ink, n.fill, n.num], scale: i === this.sel ? 1.15 : 1, duration: 120 });
    });

    const x = NODE_X[this.sel];
    const y = NODE_Y[this.sel] - 30;
    this.bob.stop();
    if (instant) this.hero.setPosition(x, y);
    this.tweens.add({
      targets: this.hero,
      x,
      y,
      duration: instant ? 0 : 220,
      ease: 'Sine.out',
      onComplete: () => {
        this.bob = this.tweens.add({ targets: this.hero, y: '+=3', yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });
      },
    });
    this.hero.setFlipX(false);

    const w = WORLDS[this.sel];
    const st = this.stateOf(this.sel);
    this.title.setText(`WORLD ${w.id}: ${w.name}`);
    this.topic.setText(w.topic);
    this.desc.setText(w.desc);
    const label = {
      done: ['COMPLETED!', '#58d854'],
      open: ['READY. PRESS ENTER!', '#f8d878'],
      soon: [`COMING SOON (DAY ${w.day})`, '#fca044'],
      locked: [`LOCKED - FINISH WORLD ${w.id - 1}`, '#f83800'],
    }[st];
    this.status.setText(label[0]).setColor(label[1]);
    this.prevBtn.setAlpha(this.sel > 0 ? 1 : 0.25);
    this.nextBtn.setAlpha(this.sel < WORLDS.length - 1 ? 1 : 0.25);
    this.recruiterBtn.setText(`R: RECRUITER ${save.recruiter ? 'ON' : 'OFF'}`);
    this.recruiterBtn.setColor(save.recruiter ? '#58d854' : '#fcfcfc');
    this.resumeBtn.setText(CLASSIC_RESUME_URL ? 'C: CLASSIC RESUME' : 'RESUME: SOON');
    this.resumeBtn.setAlpha(CLASSIC_RESUME_URL ? 1 : 0.4);
  }

  update(_, delta) {
    this.drift(delta);
  }
}
