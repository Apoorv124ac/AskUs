import Phaser from 'phaser';
// World 6 "Rooftop": contact boards, the cheering cast and the "hire me" flagpole.
import { save, persist } from './save.js';
import { burst } from '../ui/pixel.js';

export class Rooftop {
  constructor(scene) {
    this.s = scene;
    this.raised = false;
    let col = 0;
    scene.level.grid[11].forEach((ch, c) => ch === 'P' && (col = c));
    const x = col * 16 + 8;
    this.pole = scene.physics.add.staticSprite(x, 192 - 32, 'flagpole').setDepth(2);
    this.pole.body.setSize(10, 64);
    this.flag = scene.add.image(x + 12, 192 - 12, 'hireflag').setDepth(2);
    scene.physics.add.overlap(scene.player, this.pole, () => this.raise());
    scene.registry.set('hudInfo', '');
  }

  raise() {
    const { s } = this;
    if (this.raised) return;
    this.raised = true;
    save.completed[6] = true;
    save.lastWorld = 6;
    persist();
    s.lockAnim('celebrate', 4000);
    s.tweens.add({ targets: this.flag, y: 192 - 56, duration: 1500, ease: 'Sine.out' });
    s.game.events.emit('banner', 'FLAG RAISED!\nTHANK YOU FOR PLAYING');

    // fireworks + the whole cast jumps for joy
    const colours = [[0xf83800, 0xf8d878], [0x58b0f8, 0xfcfcfc], [0x58d854, 0xf8d878], [0xff7070, 0xfcfcfc]];
    for (let i = 0; i < 9; i++) {
      s.time.delayedCall(250 + i * 380, () => {
        const px = s.player.x + Phaser.Math.Between(-90, 90);
        const py = Phaser.Math.Between(40, 100);
        burst(s, px, py, { n: 22, spread: 36, colors: colours[i % colours.length], depth: 25 });
        s.cameras.main.shake(60, 0.002);
      });
    }
    s.npcs.filter((n) => n.cheer).forEach((n, i) =>
      s.tweens.add({ targets: n.spr, y: n.spr.y - 8, yoyo: true, repeat: 5, duration: 220, delay: i * 90, ease: 'Sine.out' })
    );
    s.time.delayedCall(4200, () => {
      s.scene.stop('UI');
      s.cameras.main.fadeOut(400, 15, 15, 27);
      s.cameras.main.once('camerafadeoutcomplete', () => s.scene.start('Credits'));
    });
  }
}
