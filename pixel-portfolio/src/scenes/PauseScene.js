import Phaser from 'phaser';
import { GAME, PALETTE as C } from '../config.js';
import dialogue from '../data/dialogue.json';
import { text, drawBox } from '../systems/UI.js';

/** Pause menu: keyboard / touch navigable (Up/Down + Enter, Esc or P to resume). */
export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create() {
    const sv = this.sv = this.game.services;
    this.armed = false; this.sel = 0; this.confirmReset = false;
    this.add.rectangle(0, 0, GAME.width, GAME.height, 0x0f0f1b, 0.7).setOrigin(0);
    this.box = this.add.graphics();
    drawBox(this.box, 36, 30, 184, 164);
    text(this, 128, 46, dialogue.ui.paused, { size: 8, color: C.yellow });
    this.rows = [];
    for (let i = 0; i < 6; i++) this.rows.push(text(this, 52, 70 + i * 16, '', { origin: [0, 0.5] }));
    text(this, 128, 178, 'UP/DOWN + ENTER', { size: 8, color: C.lgrey });
    this.items = [
      { label: () => 'RESUME', run: () => this.resume() },
      { label: () => `SOUND: ${sv.audio.muted ? 'OFF' : 'ON'}`, run: () => sv.audio.toggleMute() },
      { label: () => `SCANLINES: ${sv.save.settings.crt ? 'ON' : 'OFF'}`, run: () => sv.display.toggleCrt() },
      { label: () => `CALM MOTION: ${sv.save.settings.reducedMotion ? 'ON' : 'OFF'}`, run: () => { sv.save.settings.reducedMotion = !sv.save.settings.reducedMotion; sv.save.save(); } },
      { label: () => (this.confirmReset ? 'SURE? PRESS AGAIN' : 'RESET PROGRESS'), run: () => { if (this.confirmReset) { sv.state.reset(); this.confirmReset = false; } else this.confirmReset = true; } },
      { label: () => 'QUIT TO TITLE', run: () => { this.scene.stop('Level'); this.scene.stop(); this.scene.start('Title'); } },
    ];
    this.render();
    // swallow the key press that opened this menu
    this.time.delayedCall(120, () => { this.armed = true; });
  }

  resume() { this.scene.stop(); this.scene.resume('Level'); }

  render() {
    this.items.forEach((it, i) => {
      this.rows[i].setText((i === this.sel ? '> ' : '  ') + it.label()).setColor(i === this.sel ? C.yellow : C.white);
    });
  }

  update() {
    if (!this.armed) return;
    const { input, audio } = this.sv;
    if (input.justPressed('pause')) { this.resume(); return; }
    if (input.justPressed('jump')) { this.sel = (this.sel + this.items.length - 1) % this.items.length; audio.sfx('menu'); this.confirmReset = false; }
    if (input.justPressed('down')) { this.sel = (this.sel + 1) % this.items.length; audio.sfx('menu'); this.confirmReset = false; }
    if (input.confirmPressed()) { audio.sfx('confirm'); this.items[this.sel].run(); }
    this.render();
  }
}
