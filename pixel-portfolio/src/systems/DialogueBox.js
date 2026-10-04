import { PALETTE as C, UI } from '../config.js';
import { drawBox, text, fmt } from './UI.js';

/**
 * Pixel-bordered dialogue box with a typewriter effect. Reusable by every NPC.
 *   box.say([{ who, text }, ...], onDone)   // call box.update(dt) from the scene's update()
 * Enter / Space / touch A (or a tap) first finishes the line, then advances.
 */
export class DialogueBox {
  constructor(scene, sv, { y = 8, vars = {} } = {}) {
    this.scene = scene; this.sv = sv; this.vars = vars;
    const x = 8, w = 240, h = 52;
    this.container = scene.add.container(0, 0).setDepth(100).setVisible(false);
    const g = scene.add.graphics(); drawBox(g, x, y, w, h);
    this.name = text(scene, x + 8, y + 7, '', { size: 8, color: C.yellow, origin: [0, 0.5], shadow: false });
    this.body = scene.add.text(x + 8, y + 17, '', { fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: C.white, lineSpacing: 5, wordWrap: { width: w - 28 } });
    this.arrow = text(scene, x + w - 10, y + h - 9, 'v', { size: 8, color: C.yellow, shadow: false });
    this.container.add([g, this.name, this.body, this.arrow]);
    this.queue = []; this.full = ''; this.shown = 0; this.acc = 0; this.done = null; this.active = false; this.tapped = false;
    this.tap = () => { this.tapped = true; };
    scene.input.on('pointerdown', this.tap);
    scene.events.once('shutdown', () => scene.input.off('pointerdown', this.tap));
  }

  say(lines, onDone) {
    this.queue = lines.slice(); this.done = onDone; this.active = true; this.container.setVisible(true);
    this.#next();
  }

  #next() {
    const line = this.queue.shift();
    if (!line) { this.active = false; this.container.setVisible(false); this.done?.(); return; }
    this.name.setText(fmt(line.who, this.vars));
    this.full = fmt(line.text, this.vars); this.shown = 0; this.acc = 0;
    this.body.setText(UI.typeCharsPerSec <= 0 || this.sv.save.settings.reducedMotion ? (this.shown = this.full.length, this.full) : '');
  }

  get typing() { return this.shown < this.full.length; }

  update(dt) {
    if (!this.active) return;
    const input = this.sv.input;
    const press = input.confirmPressed() || this.tapped;
    this.tapped = false;
    if (this.typing) {
      this.acc += dt * UI.typeCharsPerSec;
      const n = Math.floor(this.acc);
      if (n > 0) { this.acc -= n; this.shown = Math.min(this.full.length, this.shown + n); this.body.setText(this.full.slice(0, this.shown)); if (this.shown % 2 === 0) this.sv.audio.sfx('blip'); }
      if (press) { this.shown = this.full.length; this.body.setText(this.full); }
    } else {
      this.arrow.setVisible(this.calm || Math.floor(this.scene.time.now / 350) % 2 === 0);
      if (press) { this.sv.audio.sfx('menu'); this.#next(); }
    }
  }
  get calm() { return this.sv.save.settings.reducedMotion; }
}
