/**
 * Unified input: keyboard + on-screen touch buttons feed the same "actions".
 * Scenes ask for actions (isDown / justPressed), never for raw keys.
 * Edge flags (justPressed/justReleased) are cleared once per frame via endFrame().
 */
const KEYMAP = {
  left:     ['ArrowLeft', 'KeyA'],
  right:    ['ArrowRight', 'KeyD'],
  jump:     ['ArrowUp', 'KeyW'],
  down:     ['ArrowDown', 'KeyS'],
  run:      ['ShiftLeft', 'ShiftRight'],
  interact: ['Enter', 'NumpadEnter', 'Space'],
  confirm:  [],                       // virtual only: the touch A button (menus)
  pause:    ['Escape', 'KeyP'],
  mute:     ['KeyM'],
  crt:      ['KeyC'],
};
const BLOCK_DEFAULT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter']);

export class InputSystem {
  constructor() {
    this.keys = new Set();
    this.virtual = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.hooks = {};          // global hotkeys: { mute: fn, crt: fn }
    this.onFirstGesture = null;

    window.addEventListener('keydown', (e) => this.#onKey(e, true));
    window.addEventListener('keyup', (e) => this.#onKey(e, false));
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => document.hidden && this.releaseAll());
  }

  #onKey(e, down) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return; // typing in the login field
    if (down && BLOCK_DEFAULT.has(e.code)) e.preventDefault();
    if (down && this.onFirstGesture) this.onFirstGesture();
    if (down === this.keys.has(e.code)) return;      // ignore key-repeat
    const before = this.#snapshot();
    if (down) this.keys.add(e.code); else this.keys.delete(e.code);
    this.#diff(before);
    if (down) for (const [action, codes] of Object.entries(KEYMAP)) {
      if (codes.includes(e.code) && this.hooks[action]) this.hooks[action]();
    }
  }

  #snapshot() { return Object.keys(KEYMAP).filter((a) => this.isDown(a)); }
  #diff(before) {
    const now = this.#snapshot();
    for (const a of now) if (!before.includes(a)) this.pressed.add(a);
    for (const a of before) if (!now.includes(a)) this.released.add(a);
  }

  /** Touch buttons call this. */
  setVirtual(action, down) {
    if (down === this.virtual.has(action)) return;
    const before = this.#snapshot();
    if (down) { this.virtual.add(action); if (this.onFirstGesture) this.onFirstGesture(); } else this.virtual.delete(action);
    this.#diff(before);
    if (down && this.hooks[action]) this.hooks[action]();
  }

  isDown(action) {
    return KEYMAP[action].some((k) => this.keys.has(k)) || this.virtual.has(action);
  }
  justPressed(action) { return this.pressed.has(action); }
  justReleased(action) { return this.released.has(action); }
  /** Menus accept Enter/Space or the touch A button. */
  confirmPressed() { return this.justPressed('interact') || this.justPressed('confirm'); }
  /** Direction on the horizontal axis: -1, 0, 1. */
  get dir() { return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0); }

  releaseAll() {
    const before = this.#snapshot();
    this.keys.clear(); this.virtual.clear();
    this.#diff(before);
  }
  endFrame() { this.pressed.clear(); this.released.clear(); }
}
