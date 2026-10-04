import { PALETTE as C, UI } from '../config.js';
import { drawBox, text, fmt } from './UI.js';

const FONT = '"Press Start 2P", monospace';
const LINE_H = 13;          // 8px font + 5px line spacing
const MAX_LINES = 3;        // lines that fit inside the box

/**
 * Pixel-bordered dialogue box with a typewriter effect. Reusable by every NPC and pop-up.
 *   box.say([{ who, text }, ...], onDone)   // call box.update(dt) from the scene's update()
 * Enter / Space / touch A (or a tap) first finishes the line, then advances.
 * Long text is measured with the real font and split into pages of at most 3 lines, so it can
 * never spill out of the box (see `paginate`).
 */
export class DialogueBox {
  constructor(scene, sv, { y = 8, vars = {} } = {}) {
    this.scene = scene; this.sv = sv; this.vars = vars;
    const x = 8, w = 240, h = 64;
    this.rect = { x, y, w, h };
    this.wrapWidth = w - 28;
    const style = { fontFamily: FONT, fontSize: '8px', color: C.white, lineSpacing: 5, wordWrap: { width: this.wrapWidth } };

    this.container = scene.add.container(0, 0).setDepth(100).setScrollFactor(0).setVisible(false);
    const g = scene.add.graphics(); drawBox(g, x, y, w, h);
    this.name = text(scene, x + 8, y + 8, '', { size: 8, color: C.yellow, origin: [0, 0.5], shadow: false });
    this.body = scene.add.text(x + 8, y + 17, '', style);
    this.arrow = text(scene, x + w - 11, y + h - 10, 'v', { size: 8, color: C.yellow, shadow: false });
    this.container.add([g, this.name, this.body, this.arrow]);
    this.measure = scene.add.text(-999, -999, '', style).setVisible(false);   // off-screen ruler for pagination

    this.queue = []; this.full = ''; this.shown = 0; this.acc = 0; this.done = null; this.active = false; this.tapped = false;
    this.tap = () => { this.tapped = true; };
    scene.input.on('pointerdown', this.tap);
    scene.events.once('shutdown', () => scene.input.off('pointerdown', this.tap));
  }

  /** Split one string into pages of <= MAX_LINES wrapped lines. Returns an array of strings. */
  paginate(str) {
    const lines = this.measure.getWrappedText(str);
    const pages = [];
    for (let i = 0; i < lines.length; i += MAX_LINES) pages.push(lines.slice(i, i + MAX_LINES).join('\n'));
    return pages.length ? pages : [''];
  }

  say(lines, onDone) {
    this.queue = [];
    for (const l of lines) for (const page of this.paginate(fmt(l.text, this.vars))) this.queue.push({ who: fmt(l.who, this.vars), text: page });
    this.done = onDone; this.active = true; this.container.setVisible(true);
    this.#next();
  }

  #next() {
    const line = this.queue.shift();
    if (!line) { this.active = false; this.container.setVisible(false); this.done?.(); return; }
    this.name.setText(line.who.slice(0, 26));
    this.full = line.text; this.shown = 0; this.acc = 0;
    const instant = UI.typeCharsPerSec <= 0 || this.sv.save.settings.reducedMotion;
    if (instant) this.shown = this.full.length;
    this.body.setText(instant ? this.full : '');
    this.arrow.setVisible(false);
  }

  get typing() { return this.shown < this.full.length; }
  get calm() { return this.sv.save.settings.reducedMotion; }

  update(dt) {
    if (!this.active) return;
    const press = this.sv.input.confirmPressed() || this.tapped;
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
}
