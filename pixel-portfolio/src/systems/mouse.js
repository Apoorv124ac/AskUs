// Day 10: mouse play + the boss-fight "pointer power".
//   scroll wheel  : down = walk forward, up = walk back
//   left click    : jump   (press again in the air for the double jump)
//   right click   : double jump (jump, then the extra jump follows by itself)
//   middle click  : triple jump (needs coffee; without coffee it is a double jump)
// In the Dragon's Lair, left click THROWS a pointer arrow at the cursor instead; right click jumps and
// middle click double-jumps there. Keyboard controls always keep working.
import Phaser from 'phaser';
import { burst } from '../ui/pixel.js';
import { sfx } from './audio.js';

const SCROLL_MS = 240;
const COMBO_GAP = 230;
export const PTR_COLORS = ['#f83800', '#fca044', '#f8d878', '#58d854', '#58b0f8', '#6844fc', '#f878f8', '#fcfcfc'];
const PTR_ART = [
  'X...........', 'XX..........', 'X#X.........', 'X##X........', 'X###X.......', 'X####X......',
  'X#####X.....', 'X######X....', 'X#######X...', 'X########X..', 'X#####XXXXX.', 'X##X##X.....',
  'X#X.X##X....', 'XX..X##X....', 'X....X##X...', '.....XXXX...',
];

// 8 pointer arrows of different colours in one texture (12x16 each)
export function createPointerTexture(scene) {
  const tex = scene.textures.createCanvas('ptr', 12 * PTR_COLORS.length, 16);
  const ctx = tex.getContext();
  PTR_COLORS.forEach((color, n) => {
    PTR_ART.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = ch === 'X' ? '#0f0f1b' : color;
        ctx.fillRect(n * 12 + x, y, 1, 1);
      })
    );
    tex.add(n, 0, n * 12, 0, 12, 16);
  });
  tex.refresh();
}

export class MouseControls {
  constructor(scene) {
    this.s = scene;
    this.scrollDir = 0;
    this.scrollUntil = 0;
    this.fresh = false;
    this.combo = 0;
    this.comboAt = 0;
    this.hinted = false;
    const inp = scene.input;
    inp.mouse?.disableContextMenu();
    inp.on('wheel', (_p, _o, _dx, dy) => {
      if (!dy) return;
      this.scrollDir = dy > 0 ? 1 : -1;
      this.scrollUntil = scene.time.now + SCROLL_MS;
    });
    inp.on('pointerdown', (p) => this.down(p));
    scene.events.once('shutdown', () => inp.off('wheel').off('pointerdown'));
  }

  // true while the boss arena is live: left click throws arrows instead of jumping
  get arena() {
    return !!this.s.pointerPower?.active;
  }

  down(p) {
    const s = this.s;
    if (s.talking || s.entering || !p.event || p.event.type === 'touchstart') return;
    if (p.button === 0 && this.arena) return s.pointerPower.throw(p);
    const extra = this.arena ? [null, 1, 0][p.button] : [0, 1, 2][p.button === 2 ? 1 : p.button === 1 ? 2 : 0];
    if (extra === null || extra === undefined) return;
    this.fresh = true;
    this.combo = extra;
    this.comboAt = s.time.now + COMBO_GAP;
    if (extra === 2 && s.coffeeMs <= 0 && !s.star && !this.hinted) {
      this.hinted = true;
      s.popText(s.player.x, s.player.y - 26, 'COFFEE = 3RD JUMP');
    }
  }

  // buttons currently counting as "jump held" (keeps the jump high while you hold the button)
  held() {
    const p = this.s.input.activePointer;
    return p.rightButtonDown() || p.middleButtonDown() || (!this.arena && p.leftButtonDown());
  }

  // -1 / 0 / 1 from the scroll wheel
  dir(time) {
    return time < this.scrollUntil ? this.scrollDir : 0;
  }

  takeFresh() {
    const f = this.fresh;
    this.fresh = false;
    return f;
  }

  // after a right/middle click, the extra mid-air jumps are fired automatically
  comboDue(time, grounded) {
    if (this.combo <= 0 || time < this.comboAt) return false;
    if (grounded) {
      this.combo = 0;
      return false;
    }
    this.combo--;
    this.comboAt = time + COMBO_GAP;
    return true;
  }
}

// Boss-fight power: left click throws coloured pointer arrows at the dragon.
// 6 charges, one comes back every 0.9 s. Every 4 hits = one dragon life.
export class PointerPower {
  constructor(scene, dragon) {
    this.s = scene;
    this.dragon = dragon;
    this.max = 6;
    this.ammo = 6;
    this.nextRegen = 0;
    this.nextThrow = 0;
    this.n = 0;
    this.group = scene.physics.add.group({ allowGravity: false });
    // Phaser may hand the two overlapping objects over in either order: pick the arrow
    const hit = (x, y) => {
      const a = x.texture?.key === 'ptr' ? x : y;
      if (a.active) dragon.onArrow(a);
    };
    scene.physics.add.overlap(this.group, dragon.head, hit);
    scene.physics.add.overlap(this.group, dragon.body, hit);
    scene.physics.add.collider(this.group, scene.solids, (a) => this.pop(a));
    scene.input.setDefaultCursor('crosshair');
    scene.events.once('shutdown', () => scene.input.setDefaultCursor(''));
    scene.time.delayedCall(2400, () => scene.game.events.emit('banner', 'POINTER POWER!\nLEFT-CLICK TO THROW ARROWS'));
  }

  get active() {
    return !this.dragon.done && this.dragon.state !== 'dead' && this.dragon.state !== 'sleep';
  }

  throw(pointer) {
    const { s } = this;
    const now = s.time.now;
    if (!this.active || now < this.nextThrow || this.ammo <= 0) return;
    this.nextThrow = now + 160;
    this.ammo--;
    sfx('throw');
    const p = s.player;
    const w = s.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const ox = p.x;
    const oy = p.y - 6;
    const ang = Math.atan2(w.y - oy, w.x - ox);
    const a = this.group.create(ox, oy, 'ptr', this.n++ % PTR_COLORS.length).setDepth(8);
    a.body.setSize(8, 8).setOffset(2, 4);
    a.setRotation(ang + (3 * Math.PI) / 4);
    a.setVelocity(Math.cos(ang) * 330, Math.sin(ang) * 330);
    a.born = now;
    burst(s, ox, oy, { n: 3, spread: 8, colors: [parseInt(PTR_COLORS[(this.n - 1) % PTR_COLORS.length].slice(1), 16)] });
    this.sync();
  }

  pop(a) {
    if (!a.active) return;
    burst(this.s, a.x, a.y, { n: 4, spread: 10, colors: [0xfcfcfc] });
    a.destroy();
  }

  sync() {
    this.s.registry.set('ptrAmmo', this.ammo);
  }

  update(time) {
    if (this.ammo < this.max && time > this.nextRegen) {
      this.ammo++;
      this.nextRegen = time + 900;
      this.sync();
    }
    this.group.children.each((a) => a.active && time - a.born > 2600 && a.destroy());
  }

  clear() {
    this.group.clear(true, true);
  }
}
