import Phaser from 'phaser';
import dialogue from '../data/dialogue.json';
import { save, persist } from '../systems/save.js';
import { txt, panel, richText, go, skyline, groundStrip, popIn, COLORS } from '../ui/pixel.js';

// First-person prologue: the hero introduces the story before World 1.
export default class StoryScene extends Phaser.Scene {
  constructor() {
    super('Story');
  }

  create() {
    this._leaving = false;
    this.i = 0;
    this.cameras.main.setBackgroundColor(0x101830).fadeIn(400, 15, 15, 27);
    this.drift = skyline(this);
    this.children.list.forEach((c) => c.setTint && c.setTint(0x5a6aa8));
    groundStrip(this);
    // twinkling stars
    for (let i = 0; i < 24; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(4, 252), Phaser.Math.Between(4, 90), 1, 1, 0xfcfcfc).setDepth(1);
      this.tweens.add({ targets: s, alpha: 0.2, yoyo: true, repeat: -1, duration: Phaser.Math.Between(500, 1500), delay: i * 70 });
    }

    this.hero = this.add.sprite(128, 176, 'hero', 0).setDepth(5);
    this.hero.anims.play('idle');
    popIn(this, this.hero, { delay: 300 });
    txt(this, 128, 14, 'PROLOGUE', { display: true, origin: 0.5, color: COLORS.gold });
    txt(this, 250, 214, 'ENTER: NEXT   ESC: SKIP', { origin: [1, 0], color: COLORS.grey, depth: 10 });

    this.show();
    this.input.keyboard.on('keydown-ENTER', () => this.next());
    this.input.keyboard.on('keydown-SPACE', () => this.next());
    this.input.on('pointerdown', () => this.next());
    this.input.keyboard.on('keydown-ESC', () => this.end());
  }

  show() {
    if (this.box) this.box.destroy();
    const lines = dialogue.story;
    const text = lines[this.i].replace(/\{name\}/g, save.name || 'FRIEND');
    const rt = richText(this, 16, 40, text, { width: 224, depth: 0, lineH: 11 });
    const H = rt.height + 28;
    const box = this.add.container(0, -60).setDepth(12);
    box.add([panel(this, 8, 26, 240, H, { depth: 0 }), rt.container]);
    box.add(txt(this, 242, 26 + H - 10, `${this.i + 1}/${lines.length}  ENTER >`, { origin: [1, 0], color: COLORS.grey, depth: 0 }));
    this.box = box;
    this.tweens.add({ targets: box, y: 0, duration: 320, ease: 'Back.out' });
    this.time.delayedCall(180, () => rt.reveal());
    this.hero.anims.play(this.i === lines.length - 1 ? 'wave' : 'idle');
  }

  next() {
    if (this._leaving) return;
    if (++this.i >= dialogue.story.length) return this.end();
    this.show();
  }

  end() {
    save.storySeen = true;
    persist();
    go(this, 'Menu');
  }

  update(_, d) {
    this.drift(d);
  }
}
