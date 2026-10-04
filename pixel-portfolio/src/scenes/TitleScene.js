import Phaser from 'phaser';
import { OWNER_NAME } from '../config.js';
import { txt, go, skyline, groundStrip, blink } from '../ui/pixel.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this._leaving = false;
    this.cameras.main.setBackgroundColor(0x3cbcfc).fadeIn(300, 15, 15, 27);
    this.drift = skyline(this);
    groundStrip(this);

    const o = txt(this, 128, 38, 'OFFICE', { size: 24, origin: 0.5 });
    const q = txt(this, 128, 70, 'QUEST', { size: 24, origin: 0.5, color: '#f8d878' });
    this.tweens.add({ targets: [o, q], y: '+=3', yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    txt(this, 128, 100, `${OWNER_NAME}'S PIXEL PORTFOLIO`, { origin: 0.5 });

    // spinning coins flanking the hero
    [[84, 160], [172, 160], [100, 140], [156, 140]].forEach(([x, y], i) => {
      const c = this.add.sprite(x, y, 'coin', 0).setDepth(4);
      c.anims.play('coin-spin');
      c.anims.setProgress(i / 4);
    });

    this.hero = this.add.sprite(128, 176, 'hero', 0).setDepth(5);
    this.hero.anims.play('idle');
    this.time.addEvent({
      delay: 3200,
      loop: true,
      callback: () => this.hero.anims.play('wave').chain('idle'),
    });

    blink(this, txt(this, 128, 124, 'PRESS ENTER', { origin: 0.5, color: '#f8d878' }));
    txt(this, 128, 212, 'OR TAP THE SCREEN', { origin: 0.5, size: 8, color: '#bcbcbc' }).setDepth(10);

    const start = () => go(this, 'Entrance');
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.keyboard.once('keydown-SPACE', start);
    this.input.once('pointerdown', start);
  }

  update(_, delta) {
    this.drift(delta);
  }
}
