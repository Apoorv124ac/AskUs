import Phaser from 'phaser';
import { txt, panel, go, skyline, groundStrip, popIn, viewCam } from '../ui/pixel.js';

// Cutscene: Apoorv's guest arrives at the office and badges in.
export default class EntranceScene extends Phaser.Scene {
  constructor() {
    super('Entrance');
  }

  create() {
    viewCam(this);
    this._leaving = false;
    this.cameras.main.setBackgroundColor(0x3cbcfc).fadeIn(300, 15, 15, 27);
    this.drift = skyline(this, { near: false });
    groundStrip(this);

    // office building
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x0f0f1b).fillRect(119, 35, 138, 158);
    g.fillStyle(0x3858c8).fillRect(120, 36, 136, 157);
    g.fillStyle(0x6888fc).fillRect(120, 36, 136, 3);
    for (let y = 60; y < 140; y += 18) {
      for (let x = 128; x < 250; x += 20) {
        g.fillStyle(0x0f0f1b).fillRect(x - 1, y - 1, 14, 12);
        g.fillStyle(Math.random() > 0.35 ? 0xf8d878 : 0xa4c4fc).fillRect(x, y, 12, 10);
      }
    }
    panel(this, 156, 42, 80, 13, { fill: 0x0f0f1b, depth: 3 });
    txt(this, 196, 48, "APOORV'S OFFICE", { origin: 0.5, color: '#f8d878', bold: true });

    // glass doors + badge reader
    const door = this.add.graphics().setDepth(3);
    door.fillStyle(0x0f0f1b).fillRect(171, 146, 42, 47);
    door.fillStyle(0x1c2250).fillRect(173, 148, 38, 45);
    this.doorL = this.add.rectangle(173, 148, 19, 45, 0x58b0f8).setOrigin(0).setDepth(4);
    this.doorR = this.add.rectangle(192, 148, 19, 45, 0x58b0f8).setOrigin(0).setDepth(4);
    this.add.rectangle(191, 148, 1, 45, 0x0f0f1b).setOrigin(0).setDepth(5);
    this.add.rectangle(160, 160, 8, 14, 0x0f0f1b).setOrigin(0).setDepth(4);
    this.led = this.add.rectangle(162, 163, 4, 3, 0xf83800).setOrigin(0).setDepth(5);

    const t1 = txt(this, 8, 8, 'MONDAY  9:00 AM', { color: '#fcfcfc', bold: true });
    const t2 = txt(this, 8, 19, 'YOU ARE VISITING APOORV', { color: '#f8d878' });
    popIn(this, t1, { delay: 200 });
    popIn(this, t2, { delay: 400 });
    txt(this, 248, 214, 'ENTER: SKIP', { origin: [1, 0], color: '#bcbcbc' });

    const skip = () => go(this, 'Login');
    this.input.keyboard.once('keydown-ENTER', skip);
    this.input.keyboard.once('keydown-SPACE', skip);
    this.input.once('pointerdown', skip);

    // the walk-in
    const hero = this.add.sprite(-20, 176, 'hero', 0).setDepth(6);
    hero.anims.play('walk');
    this.tweens.add({
      targets: hero,
      x: 148,
      duration: 3200,
      onComplete: () => {
        hero.anims.play('idle');
        const beep = txt(this, 150, 138, 'BEEP!', { origin: 0.5, color: '#58d854', bold: true });
        popIn(this, beep, { duration: 220 });
        this.led.setFillStyle(0x58d854);
        this.tweens.add({ targets: beep, y: 124, alpha: 0, delay: 500, duration: 700 });
        this.time.delayedCall(650, () => {
          this.tweens.add({ targets: this.doorL, x: 160 + 13, scaleX: 0.15, duration: 400 });
          this.tweens.add({ targets: this.doorR, x: 211, scaleX: 0.15, duration: 400 });
          this.time.delayedCall(500, () => {
            hero.anims.play('walk');
            this.tweens.add({
              targets: hero,
              x: 192,
              alpha: 0,
              duration: 800,
              onComplete: () => go(this, 'Login'),
            });
          });
        });
      },
    });
  }

  update(_, delta) {
    this.drift(delta);
  }
}
