import Phaser from 'phaser';
import { GAME, PALETTE as C } from '../config.js';
import dialogue from '../data/dialogue.json';
import resume from '../data/resume.json';
import { text, fadeTo } from '../systems/UI.js';
import { FX } from '../systems/FX.js';

/** Rolling credits after the HIRE ME flag. Enter / Esc skips. Calm mode shows a static page. */
export class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }

  create(data) {
    const sv = this.sv = this.game.services;
    const calm = sv.save.settings.reducedMotion;
    this.leaving = false;
    this.cameras.main.fadeIn(400, 15, 15, 27);
    this.add.image(0, 0, 'bg_sunset_far').setOrigin(0);
    this.add.rectangle(0, 0, GAME.width, GAME.height, 0x0f0f1b, 0.62).setOrigin(0);
    this.fx = new FX(this, sv.save.settings);

    const lines = [
      ['OFFICE QUEST', 16, C.yellow], ['', 8], [dialogue.credits.hired, 8, C.lime], [`COINS x${String(sv.state.coins).padStart(3, '0')}   XP ${sv.state.xp}`, 8, C.white], ['', 8],
      ...resume.credits.map((l) => [l, 8, C.white]), ['', 8], [dialogue.credits.thanks, 8, C.yellow],
    ];
    this.items = [];
    let y = calm ? 28 : GAME.height + 10;
    for (const [str, size, color = C.white] of lines) {
      if (str) this.items.push(text(this, 128, y, str, { size, color, shadow: true }));
      y += size === 16 ? 26 : 15;
    }
    this.endY = y;
    text(this, 128, 214, dialogue.credits.continue, { size: 8, color: C.white, backing: true }).setDepth(20);
    this.hero = this.add.sprite(128, 196, `hero_t${sv.state.tier}`, 0).setOrigin(0.5, 1).setDepth(5);
    if (!calm) {
      this.time.addEvent({ delay: 700, loop: true, callback: () => this.fx.burst(Phaser.Math.Between(30, 226), Phaser.Math.Between(30, 110), { count: 22, speed: 100, colors: [C.yellow, C.white, C.red, C.cyan, C.lime], life: 800, gravity: 60 }) });
    }
    sv.audio.sfx('levelup');
  }

  update(_, delta) {
    const { input, save } = this.sv;
    if (!save.settings.reducedMotion) {
      this.items.forEach((t) => { t.y -= (delta / 1000) * 22; });
      const last = this.items[this.items.length - 1];
      if (last && last.y < -10) this.leave();
    }
    if (input.confirmPressed() || input.justPressed('pause')) this.leave();
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    fadeTo(this, 'WorldMap', { cleared: 6 });
  }
}
