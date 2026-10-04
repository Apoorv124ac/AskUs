import Phaser from 'phaser';
import { txt, go, skyline, groundStrip, blink, popIn, burst, COLORS } from '../ui/pixel.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this._leaving = false;
    this.cameras.main.setBackgroundColor(0x3cbcfc).fadeIn(300, 15, 15, 27);
    this.drift = skyline(this);
    groundStrip(this);

    // logo: letters pop in one by one, then bob in a wave
    const word = (s, y, color, delay0) => {
      const w = 16; // Press Start 2P at 16px
      const x0 = 128 - (s.length * w) / 2 + w / 2;
      [...s].forEach((ch, i) => {
        const t = txt(this, x0 + i * w, y, ch, { display: true, size: 16, origin: 0.5, color });
        t.setScale(0);
        this.tweens.add({ targets: t, scale: 1, delay: delay0 + i * 70, duration: 320, ease: 'Back.out' });
        this.tweens.add({ targets: t, y: y - 3, yoyo: true, repeat: -1, duration: 700, delay: 1200 + i * 90, ease: 'Sine.inOut' });
      });
    };
    word('OFFICE', 48, '#fcfcfc', 200);
    word('QUEST', 70, '#f8d878', 700);

    const sub = txt(this, 128, 92, 'A PORTFOLIO YOU CAN PLAY', { origin: 0.5, color: '#0f0f1b', shadow: false, bold: true });
    sub.setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, delay: 1300, duration: 400 });
    const by = txt(this, 128, 103, 'BY APOORV CHAURASIA', { origin: 0.5, color: '#fcfcfc' }).setAlpha(0);
    this.tweens.add({ targets: by, alpha: 1, delay: 1500, duration: 400 });

    [[84, 160], [172, 160], [100, 142], [156, 142]].forEach(([x, y], i) => {
      const c = this.add.sprite(x, y, 'coin', 0).setDepth(4);
      c.anims.play('coin-spin');
      c.anims.setProgress(i / 4);
    });

    this.hero = this.add.sprite(128, 176, 'hero', 0).setDepth(5);
    this.hero.anims.play('idle');
    popIn(this, this.hero, { delay: 100 });
    this.time.addEvent({ delay: 3200, loop: true, callback: () => this.hero.anims.play('wave').chain('idle') });

    const prompt = txt(this, 128, 126, 'PRESS ENTER TO START', { origin: 0.5, color: COLORS.gold, bold: true });
    prompt.setAlpha(0);
    this.tweens.add({ targets: prompt, alpha: 1, delay: 1700, duration: 300, onComplete: () => blink(this, prompt) });
    txt(this, 128, 212, 'OR TAP THE SCREEN', { origin: 0.5, color: COLORS.grey });

    const start = () => {
      burst(this, 128, 126, { n: 12, spread: 50 });
      go(this, 'Entrance');
    };
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.keyboard.once('keydown-SPACE', start);
    this.input.once('pointerdown', start);
  }

  update(_, delta) {
    this.drift(delta);
  }
}
