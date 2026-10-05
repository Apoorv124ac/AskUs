import Phaser from 'phaser';
import { CHARACTERS, byGender } from '../data/characters.js';
import { save } from '../systems/save.js';
import { applyCharacter } from '../systems/character.js';
import { sfx } from '../systems/audio.js';
import { txt, panel, go, popIn, burst, COLORS, viewCam } from '../ui/pixel.js';

// Step 1: BOY or GIRL. Step 2: pick one of four looks. Choice is saved; Menu (H) can reopen it.
export default class CharacterScene extends Phaser.Scene {
  constructor() {
    super('Character');
  }

  init(data) {
    this.backTo = data?.from || null;
  }

  create() {
    viewCam(this);
    this._leaving = false;
    this.cameras.main.setBackgroundColor(0x2c3a7c).fadeIn(300, 15, 15, 27);
    this.add.tileSprite(0, 192, 256, 16, 'tile-ground').setOrigin(0);
    this.add.tileSprite(0, 208, 256, 16, 'tile-dirt').setOrigin(0);
    this.layer = [];
    this.step = 1;
    this.gender = save.gender || 'M';
    this.sel = 0;

    const kb = this.input.keyboard;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-A', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-D', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-ESC', () => this.back());
    kb.on('keydown-BACKSPACE', () => this.back());
    this.showGender();
  }

  clear() {
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
  }
  add_(o) {
    this.layer.push(o);
    return o;
  }

  // ---- step 1 ----
  showGender() {
    this.clear();
    this.step = 1;
    this.sel = this.gender === 'F' ? 1 : 0;
    this.add_(txt(this, 128, 22, 'CHOOSE YOUR HERO', { display: true, origin: 0.5, color: COLORS.gold }));
    this.add_(txt(this, 128, 40, 'WHO IS PLAYING TODAY?', { origin: 0.5, bold: true }));
    this.cards = ['M', 'F'].map((g, i) => {
      const x = 68 + i * 120;
      const frame = this.add_(this.add.rectangle(x, 118, 92, 112, 0xfcfcfc)).setDepth(2);
      this.add_(this.add.rectangle(x, 118, 88, 108, 0x1c2250)).setDepth(3);
      const c = byGender(g)[0];
      const spr = this.add_(this.add.sprite(x, 112, `char-${c.id}`, 0)).setDepth(5).setScale(2.5);
      spr.play(`idle-${c.id}`);
      const label = this.add_(txt(this, x, 166, g === 'M' ? 'BOY' : 'GIRL', { display: true, origin: 0.5 }));
      popIn(this, spr, { delay: 150 + i * 120 });
      const zone = this.add_(this.add.zone(x, 118, 92, 112)).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.sel = i;
        this.confirm();
      });
      zone.on('pointerover', () => this.hilite(i));
      return { frame, spr, label, g };
    });
    this.add_(txt(this, 128, 205, '< >  CHOOSE   ENTER  OK', { origin: 0.5, color: COLORS.dim, shadow: false }));
    this.hilite(this.sel);
  }

  hilite(i) {
    this.sel = i;
    this.cards.forEach((c, k) => {
      c.frame.setFillStyle(k === i ? 0xf8d878 : 0xfcfcfc);
      c.label.setColor(k === i ? COLORS.gold : COLORS.white);
      this.tweens.add({ targets: c.spr, scale: k === i ? 2.9 : 2.5, duration: 140, ease: 'Back.out' });
    });
  }

  // ---- step 2 ----
  showLooks() {
    this.clear();
    this.step = 2;
    this.list = byGender(this.gender);
    const cur = this.list.findIndex((c) => c.id === save.character);
    this.sel = cur >= 0 ? cur : 0;
    this.add_(txt(this, 128, 20, 'PICK YOUR LOOK', { display: true, origin: 0.5, color: COLORS.gold }));
    this.cards = this.list.map((c, i) => {
      const x = 38 + i * 60;
      const frame = this.add_(this.add.rectangle(x, 100, 54, 80, 0xfcfcfc)).setDepth(2);
      this.add_(this.add.rectangle(x, 100, 50, 76, 0x1c2250)).setDepth(3);
      const spr = this.add_(this.add.sprite(x, 104, `char-${c.id}`, 0)).setDepth(5).setScale(1.5);
      spr.play(`idle-${c.id}`);
      popIn(this, spr, { delay: 100 + i * 90 });
      const zone = this.add_(this.add.zone(x, 100, 54, 80)).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => (this.sel === i ? this.confirm() : this.hiliteLook(i)));
      return { frame, spr, c };
    });
    this.nameT = this.add_(txt(this, 128, 154, '', { display: true, origin: 0.5 }));
    this.tagT = this.add_(txt(this, 128, 170, '', { origin: 0.5, color: COLORS.green, bold: true }));
    this.add_(txt(this, 128, 189, 'ENTER: PLAY AS THIS HERO', { origin: 0.5, color: COLORS.gold, bold: true }));
    this.add_(txt(this, 128, 205, '< >  CHOOSE   ESC  BACK', { origin: 0.5, color: COLORS.dim, shadow: false }));
    this.hiliteLook(this.sel);
  }

  hiliteLook(i) {
    this.sel = i;
    this.cards.forEach((k, n) => {
      k.frame.setFillStyle(n === i ? 0xf8d878 : 0xfcfcfc);
      this.tweens.add({ targets: k.spr, scale: n === i ? 1.7 : 1.5, duration: 140, ease: 'Back.out' });
      k.spr.play(`${n === i ? 'walk' : 'idle'}-${k.c.id}`);
    });
    const c = this.list[i];
    this.nameT.setText(c.name);
    this.tagT.setText(c.tag);
    this.tweens.add({ targets: [this.nameT, this.tagT], scale: { from: 0.85, to: 1 }, duration: 180, ease: 'Back.out' });
  }

  move(d) {
    const n = this.cards.length;
    const i = Phaser.Math.Clamp(this.sel + d, 0, n - 1);
    if (i !== this.sel) sfx('tick');
    this.step === 1 ? this.hilite(i) : this.hiliteLook(i);
  }

  confirm() {
    if (this._leaving) return;
    if (this.step === 1) {
      this.gender = this.cards[this.sel].g;
      this.showLooks();
      return;
    }
    const c = this.list[this.sel];
    applyCharacter(this, c.id, true);
    sfx('select');
    const k = this.cards[this.sel];
    burst(this, k.spr.x, k.spr.y - 10, { n: 14, spread: 36 });
    this.tweens.add({ targets: k.spr, y: k.spr.y - 12, yoyo: true, duration: 160, ease: 'Quad.out' });
    this.time.delayedCall(350, () => go(this, this.backTo || 'Entrance'));
  }

  back() {
    if (this._leaving) return;
    if (this.step === 2) return this.showGender();
    if (this.backTo) go(this, this.backTo);
  }
}
