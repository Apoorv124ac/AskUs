import Phaser from 'phaser';
import { txt, panel, go, popIn, burst, COLORS, viewCam } from '../ui/pixel.js';
import { sfx } from '../systems/audio.js';
import { PROJECTS, STAGES } from './content.js';
import { pageTexture, PAGE_W, PAGE_H, PROJECT_IMAGES } from './pages.js';
import { button } from './ui.js';
import { startStage } from './flow.js';

// The on-screen "PDF viewer": one project at a time, page by page. Unlocked after each stage.
export default class ProjectScene extends Phaser.Scene {
  constructor() {
    super('Project');
  }

  init(d) {
    this.stage = d.stage;
    this.review = !!d.review;
    this.pi = d.stage - 1;
    this.n = PROJECTS[this.pi].pages.length;
    this.page = 0;
  }

  create() {
    viewCam(this);
    this._leaving = false;
    const pj = PROJECTS[this.pi];
    this.cameras.main.setBackgroundColor(0x0f1c20).fadeIn(300, 15, 15, 27);
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    // soft grid backdrop
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x15292f).fillRect(0, 0, 256, 224);
    bg.fillStyle(0x1b343b);
    for (let x = 0; x < 256; x += 16) bg.fillRect(x, 0, 1, 224);
    for (let y = 0; y < 224; y += 16) bg.fillRect(0, y, 256, 1);

    const head = txt(this, 128, 9, this.review ? `PROJECT ${this.stage}/5` : `PROJECT ${this.stage}/5 UNLOCKED!`, { origin: 0.5, color: COLORS.gold, bold: true, depth: 5 });
    popIn(this, head, { delay: 150 });
    const title = txt(this, 128, 22, pj.title, { display: true, origin: 0.5, depth: 5 });
    popIn(this, title, { delay: 300 });
    if (!this.review) {
      burst(this, 128, 20, { n: 14, spread: 70 });
      sfx('level');
    }

    // the "page"
    panel(this, 30, 34, 196, 140, { fill: 0x0f0f1b, frame: 0xfcfcfc, depth: 3 });
    this.img = this.add.image(128, 104, this.texFor(0)).setDepth(4);
    this.fit();
    this.dots = this.add.graphics().setDepth(5);
    this.cap = txt(this, 128, 184, '', { origin: 0.5, color: COLORS.white, bold: true, depth: 5 });
    this.sub = txt(this, 128, 194, pj.client, { origin: 0.5, color: COLORS.dim, depth: 5, shadow: false });

    // big arrows (tap targets are wide)
    this.prev = txt(this, 14, 104, '<', { display: true, size: 16, origin: 0.5, depth: 5 });
    this.next = txt(this, 242, 104, '>', { display: true, size: 16, origin: 0.5, depth: 5 });
    [[2, 34, 26, 140, -1], [228, 34, 26, 140, 1]].forEach(([x, y, w, h, d]) => {
      this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.turn(d));
    });
    this.tweens.add({ targets: [this.prev, this.next], alpha: 0.5, yoyo: true, repeat: -1, duration: 600 });

    button(this, 8, 202, 62, 18, this.review ? 'BACK' : 'MENU', () => this.leave('menu'), { size: 8 });
    this.cont = button(this, 150, 202, 98, 18, '', () => this.onContinue(), { fill: 0xc83010, size: 8 });
    this.show(0, 0);

    const kb = this.input.keyboard;
    kb.on('keydown-LEFT', () => this.turn(-1));
    kb.on('keydown-A', () => this.turn(-1));
    kb.on('keydown-RIGHT', () => this.turn(1));
    kb.on('keydown-D', () => this.turn(1));
    kb.on('keydown-ENTER', () => this.onContinue());
    kb.on('keydown-SPACE', () => this.onContinue());
    kb.on('keydown-ESC', () => this.leave('menu'));
    // swipe
    this.input.on('pointerdown', (p) => (this.sx = p.x));
    this.input.on('pointerup', (p) => {
      const dx = p.x - this.sx;
      if (Math.abs(dx) > 70) this.turn(dx < 0 ? 1 : -1);
    });
  }

  texFor(i) {
    const imgs = PROJECT_IMAGES[this.pi];
    if (imgs && this.textures.exists(`pk-real-${this.pi}-${i}`)) return `pk-real-${this.pi}-${i}`;
    return pageTexture(this, this.pi, i);
  }

  fit() {
    const k = Math.min(188 / PAGE_W, 132 / PAGE_H);
    this.img.setScale(k);
  }

  show(i, dir) {
    const pj = PROJECTS[this.pi];
    this.page = i;
    this.img.setTexture(this.texFor(i));
    this.fit();
    if (dir) {
      this.img.setX(128 + dir * 36).setAlpha(0.2);
      this.tweens.add({ targets: this.img, x: 128, alpha: 1, duration: 200, ease: 'Cubic.out' });
    }
    this.cap.setText(`${i + 1}/${this.n}  ${pj.pages[i]}`);
    this.dots.clear();
    for (let k = 0; k < this.n; k++) this.dots.fillStyle(k === i ? 0xf8d878 : 0x4a5aac).fillRect(128 - (this.n * 8) / 2 + k * 8, 177, 5, 3);
    this.prev.setAlpha(i > 0 ? 1 : 0.2);
    this.next.setAlpha(i < this.n - 1 ? 1 : 0.2);
    const last = i === this.n - 1;
    this.cont.setLabel(last ? (this.review ? 'DONE' : this.stage < 5 ? 'NEXT STAGE >' : 'FINISH >') : 'NEXT PAGE >');
  }

  turn(d) {
    const n = Phaser.Math.Clamp(this.page + d, 0, this.n - 1);
    if (n === this.page) return;
    sfx('tick');
    this.show(n, d);
  }

  onContinue() {
    if (this.page < this.n - 1) return this.turn(1);
    this.leave(this.review ? 'menu' : 'next');
  }

  leave(where) {
    if (this._leaving) return;
    this._leaving = true;
    this.cameras.main.fadeOut(250, 15, 15, 27);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (where === 'menu') this.scene.start('Menu');
      else if (this.stage < 5) startStage(this, this.stage + 1);
      else this.scene.start('Credits');
    });
  }
}
