import Phaser from 'phaser';
import { CLASSIC_RESUME_URL } from '../config.js';
import { save, persist } from '../systems/save.js';
import { sfx, toggleMute, isMuted } from '../systems/audio.js';
import { txt, panel, go, skyline, groundStrip, popIn, burst, COLORS, viewCam } from '../ui/pixel.js';
import { createPocketTextures } from './art.js';
import { STAGES } from './content.js';
import { button } from './ui.js';
import { startStage } from './flow.js';

const openResume = () => CLASSIC_RESUME_URL && window.open(CLASSIC_RESUME_URL, '_blank', 'noopener');
const unlocked = (i) => save.recruiter || i === 0 || save.pocket.done[i - 1];

// ------------------------------------------------------------------ title
export class PocketTitle extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    createPocketTextures(this);
    viewCam(this);
    this._leaving = false;
    this.cameras.main.setBackgroundColor(0x3cbcfc).fadeIn(300, 15, 15, 27);
    this.drift = skyline(this);
    groundStrip(this);
    // a living ground line: plants, a fern and torches
    [[20, 'pk-tree', 'pk-tree-sway', 40], [226, 'pk-plant', 'pk-plant-sway', 20], [56, 'pk-fern', 'pk-fern-sway', 12], [200, 'pk-fern', 'pk-fern-sway', 12], [238, 'pk-torch', 'pk-torch-burn', 28], [8, 'pk-torch', 'pk-torch-burn', 28]].forEach(([x, k, a], i) => {
      const sp = this.add.sprite(x, 193, k, 0).setOrigin(0.5, 1).setDepth(3.5);
      sp.anims.play(a);
      sp.anims.setProgress(i * 0.3);
    });

    const word = (s, y, color, delay0) => {
      const w = 16;
      const x0 = 128 - (s.length * w) / 2 + w / 2;
      [...s].forEach((ch, i) => {
        const t = txt(this, x0 + i * w, y, ch, { display: true, size: 16, origin: 0.5, color });
        t.setScale(0);
        this.tweens.add({ targets: t, scale: 1, delay: delay0 + i * 70, duration: 320, ease: 'Back.out' });
        this.tweens.add({ targets: t, y: y - 3, yoyo: true, repeat: -1, duration: 700, delay: 1200 + i * 90, ease: 'Sine.inOut' });
      });
    };
    word('OFFICE', 30, '#fcfcfc', 150);
    word('QUEST', 52, '#f8d878', 600);
    const sub = txt(this, 128, 72, 'POCKET EDITION', { display: true, size: 8, origin: 0.5, color: '#0f0f1b', shadow: false }).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, delay: 1200, duration: 300 });
    const by = txt(this, 128, 84, 'APOORV CHAURASIA · A PORTFOLIO YOU CAN PLAY', { origin: 0.5, color: '#fcfcfc' }).setAlpha(0);
    this.tweens.add({ targets: by, alpha: 1, delay: 1400, duration: 300 });

    this.hero = this.add.sprite(128, 176, 'hero', 0).setDepth(5);
    this.hero.anims.play('idle');
    popIn(this, this.hero, { delay: 100 });
    this.time.addEvent({ delay: 3200, loop: true, callback: () => this.hero.anims.play('wave').chain('idle') });

    const started = save.pocket.done.some(Boolean);
    this.play = button(this, 68, 100, 120, 24, started ? 'CONTINUE' : 'PLAY', () => this.start(), { fill: 0xc83010, size: 8 });
    button(this, 22, 130, 100, 18, 'HOW TO PLAY', () => go(this, 'Story', { help: true, back: 'Title' }), { size: 8 });
    button(this, 134, 130, 100, 18, 'RESUME (PDF)', () => openResume(), { size: 8 });
    const snd = txt(this, 250, 214, isMuted() ? 'SOUND OFF' : 'SOUND ON', { origin: [1, 0], color: COLORS.dim, shadow: false }).setInteractive({ useHandCursor: true });
    snd.on('pointerdown', () => {
      toggleMute();
      snd.setText(isMuted() ? 'SOUND OFF' : 'SOUND ON');
    });
    txt(this, 6, 214, 'ENTER: PLAY   H: HOW TO PLAY', { color: COLORS.dim, shadow: false });

    const kb = this.input.keyboard;
    kb.once('keydown-ENTER', () => this.start());
    kb.once('keydown-SPACE', () => this.start());
    kb.on('keydown-H', () => go(this, 'Story', { help: true, back: 'Title' }));
  }

  start() {
    if (this._leaving) return;
    sfx('select');
    burst(this, 128, 112, { n: 12, spread: 50 });
    go(this, save.character ? 'Login' : 'Character');
  }

  update(_, d) {
    this.drift(d);
  }
}

// the main game's flow goes Character -> Entrance -> Login; the Pocket Edition skips the cutscene
export class PocketPass extends Phaser.Scene {
  constructor() {
    super('Entrance');
  }
  create() {
    this.scene.start('Login');
  }
}

// ------------------------------------------------------------------ how to play + the five stages
export class PocketIntro extends Phaser.Scene {
  constructor() {
    super('Story');
  }

  init(d) {
    this.help = !!d?.help;
    this.back = d?.back || 'Menu';
    this.page = 0;
  }

  create() {
    viewCam(this);
    this._leaving = false;
    this.cameras.main.setBackgroundColor(0x1c2250).fadeIn(250, 15, 15, 27);
    this.layer = [];
    this.show();
    const kb = this.input.keyboard;
    kb.on('keydown-ENTER', () => this.next());
    kb.on('keydown-SPACE', () => this.next());
    kb.on('keydown-ESC', () => this.exit());
  }

  clear() {
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
  }
  add_(o) {
    this.layer.push(o);
    return o;
  }

  show() {
    this.clear();
    const T = (x, y, s, o) => this.add_(txt(this, x, y, s, o));
    if (this.page === 0) {
      T(128, 10, 'HOW TO PLAY', { display: true, origin: 0.5, color: COLORS.gold });
      this.add_(panel(this, 6, 24, 244, 150, { depth: 2 }));
      const rows = [
        ['MOVE', '◀ ▶ BUTTONS', 'ARROW KEYS'],
        ['JUMP', 'JUMP BUTTON', 'UP ARROW'],
        ['DOUBLE JUMP', 'JUMP AGAIN', 'UP AGAIN'],
        ['RUN', 'HOLD RUN', 'HOLD SHIFT'],
        ['LONG JUMP', 'RUN + JUMP', 'SHIFT + UP'],
        ['PIPES', '▼ ON A PIPE', 'DOWN ON PIPE'],
        ['SWIM / FLY', 'JUMP, ▼  OR ▲ ▼', 'UP, DOWN KEYS'],
        ['SHOOT', 'THROW BUTTON', 'X OR Z'],
      ];
      T(14, 30, '', {});
      T(92, 30, 'PHONE', { color: COLORS.green, bold: true });
      T(172, 30, 'KEYBOARD', { color: COLORS.blue, bold: true });
      rows.forEach(([a, b, c], i) => {
        const y = 43 + i * 15;
        this.add_(this.add.rectangle(10, y - 2, 236, 1, 0x4a5aac).setOrigin(0).setDepth(3));
        T(12, y + 2, a, { color: COLORS.gold, bold: true, depth: 4 });
        T(92, y + 2, b, { depth: 4 });
        T(172, y + 2, c, { depth: 4 });
      });
      T(128, 180, 'LOST? PAUSE (II / P), THEN CHECKPOINT.', { origin: 0.5, color: COLORS.grey, shadow: false });
    } else {
      T(128, 10, 'FIVE SHORT STAGES', { display: true, origin: 0.5, color: COLORS.gold });
      this.add_(panel(this, 6, 24, 244, 150, { depth: 2 }));
      STAGES.forEach((s, i) => {
        const y = 30 + i * 28;
        this.add_(this.add.rectangle(14, y, 22, 22, s.color).setOrigin(0).setDepth(4).setStrokeStyle(1, 0xfcfcfc));
        T(25, y + 11, String(s.id), { display: true, origin: 0.5, depth: 5 });
        T(44, y + 2, s.name, { color: COLORS.white, bold: true, depth: 4 });
        T(44, y + 13, s.blurb, { color: COLORS.grey, depth: 4, shadow: false });
      });
      T(128, 180, 'CLEAR A STAGE TO UNLOCK ONE OF APOORV\'S PROJECTS.', { origin: 0.5, color: COLORS.gold, bold: true });
    }
    const last = this.page === 1;
    this.add_(button(this, 8, 198, 62, 20, this.page ? 'BACK' : this.help ? 'CLOSE' : 'SKIP', () => (this.page ? this.flip(-1) : this.exit()), { size: 8 }));
    this.add_(button(this, 150, 198, 98, 20, last ? (this.help ? 'DONE' : 'LET\'S GO!') : 'NEXT >', () => this.next(), { fill: 0xc83010, size: 8 }));
    T(128, 206, `${this.page + 1}/2`, { origin: 0.5, color: COLORS.dim, shadow: false });
  }

  flip(d) {
    this.page = Phaser.Math.Clamp(this.page + d, 0, 1);
    sfx('tick');
    this.show();
  }

  next() {
    if (this.page === 0) return this.flip(1);
    this.exit();
  }

  exit() {
    if (this._leaving) return;
    save.storySeen = true;
    persist();
    go(this, this.back);
  }
}

// ------------------------------------------------------------------ stage select
export class PocketMenu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    viewCam(this);
    this._leaving = false;
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    this.cameras.main.setBackgroundColor(0x3cbcfc).fadeIn(300, 15, 15, 27);
    this.drift = skyline(this);
    this.sel = 0;
    const firstOpen = STAGES.findIndex((_, i) => !save.pocket.done[i]);
    this.sel = firstOpen < 0 ? 4 : firstOpen;
    if (!unlocked(this.sel)) this.sel = 0;

    this.add.rectangle(0, 0, 256, 16, 0x0f0f1b, 0.72).setOrigin(0).setDepth(8);
    txt(this, 6, 8, `HELLO, ${save.name || 'GUEST'}!`, { color: COLORS.gold, bold: true, origin: [0, 0.5], depth: 9 });
    const mk = (x, s, fn) => txt(this, x, 8, s, { origin: [1, 0.5], depth: 9, bold: true, color: COLORS.white }).setInteractive({ useHandCursor: true }).on('pointerdown', fn);
    mk(250, 'RESUME', () => openResume());
    mk(204, 'HELP', () => go(this, 'Story', { help: true, back: 'Menu' }));
    this.snd = mk(168, isMuted() ? 'SND OFF' : 'SND ON', () => {
      toggleMute();
      this.snd.setText(isMuted() ? 'SND OFF' : 'SND ON');
    });
    txt(this, 128, 26, 'CHOOSE A STAGE', { display: true, origin: 0.5, depth: 9 });

    this.cards = STAGES.map((s, i) => {
      const x = 6 + i * 50;
      const y = 40;
      const ring = this.add.rectangle(x - 2, y - 2, 48, 62, 0xf8d878).setOrigin(0).setDepth(5).setVisible(false);
      const body = this.add.rectangle(x, y, 44, 58, 0x1c2250).setOrigin(0).setDepth(6).setStrokeStyle(1, 0x0f0f1b);
      const top = this.add.rectangle(x, y, 44, 22, s.color).setOrigin(0).setDepth(7);
      const num = txt(this, x + 22, y + 11, String(s.id), { display: true, origin: 0.5, depth: 9 });
      const nm = txt(this, x + 22, y + 32, s.short, { origin: 0.5, depth: 9, bold: true, size: 6 });
      const st = txt(this, x + 22, y + 47, '', { origin: 0.5, depth: 9, bold: true, size: 6 });
      const hit = this.add.zone(x + 22, y + 29, 46, 60).setInteractive({ useHandCursor: true }).setDepth(12);
      hit.on('pointerdown', () => (this.sel === i ? this.play() : this.select(i)));
      popIn(this, num, { delay: 120 + i * 70 });
      return { ring, body, top, num, st, s, i };
    });

    panel(this, 6, 106, 244, 84, { depth: 5 });
    this.title = txt(this, 14, 113, '', { display: true, color: COLORS.gold, depth: 9 });
    this.topic = txt(this, 14, 126, '', { color: COLORS.green, bold: true, depth: 9 });
    this.blurb = txt(this, 14, 138, '', { depth: 9, wrap: 228 });
    this.status = txt(this, 14, 168, '', { bold: true, depth: 9 });
    this.playBtn = button(this, 8, 198, 118, 20, 'PLAY', () => this.play(), { fill: 0xc83010, size: 8 });
    this.projBtn = button(this, 132, 198, 116, 20, 'PROJECT', () => this.project(), { size: 8 });
    txt(this, 250, 168, 'R: RECRUITER', { origin: [1, 0], color: COLORS.dim, shadow: false, depth: 9 }).setInteractive().on('pointerdown', () => this.recruiter());

    const kb = this.input.keyboard;
    kb.on('keydown-LEFT', () => this.select(this.sel - 1));
    kb.on('keydown-A', () => this.select(this.sel - 1));
    kb.on('keydown-RIGHT', () => this.select(this.sel + 1));
    kb.on('keydown-D', () => this.select(this.sel + 1));
    kb.on('keydown-ENTER', () => this.play());
    kb.on('keydown-SPACE', () => this.play());
    kb.on('keydown-R', () => this.recruiter());
    kb.on('keydown-P', () => this.project());
    this.refresh();
  }

  recruiter() {
    save.recruiter = !save.recruiter;
    persist();
    this.refresh();
  }

  select(i) {
    const n = Phaser.Math.Clamp(i, 0, STAGES.length - 1);
    if (n === this.sel) return;
    sfx('tick');
    this.sel = n;
    this.refresh();
  }

  play() {
    if (this._leaving) return;
    if (!unlocked(this.sel)) return this.flash('FINISH THE STAGE BEFORE FIRST');
    sfx('select');
    this._leaving = true;
    this.cameras.main.fadeOut(250, 15, 15, 27);
    this.cameras.main.once('camerafadeoutcomplete', () => startStage(this, this.sel + 1));
  }

  project() {
    if (this._leaving || !save.pocket.done[this.sel]) return;
    go(this, 'Project', { stage: this.sel + 1, review: true });
  }

  flash(msg) {
    this.status.setText(msg).setColor('#f83800');
    this.cameras.main.shake(100, 0.003);
    this.time.delayedCall(1400, () => this.refresh());
  }

  refresh() {
    this.cards.forEach((c) => {
      const open = unlocked(c.i);
      const done = save.pocket.done[c.i];
      c.ring.setVisible(c.i === this.sel);
      c.top.setFillStyle(open ? c.s.color : 0x7c7c7c);
      c.num.setText(open ? String(c.s.id) : '?');
      c.st.setText(done ? 'DONE' : open ? 'OPEN' : 'LOCKED').setColor(done ? '#58d854' : open ? '#f8d878' : '#bcbcbc');
    });
    const s = STAGES[this.sel];
    this.title.setText(`STAGE ${s.id}`);
    this.topic.setText(`${s.name}  ·  ${s.topic}`);
    this.blurb.setText(`${s.blurb}\nCLEAR IT TO UNLOCK PROJECT ${s.id}.`);
    const open = unlocked(this.sel);
    const done = save.pocket.done[this.sel];
    this.status.setText(done ? 'CLEARED! PROJECT UNLOCKED.' : open ? 'READY.' : 'LOCKED. FINISH THE STAGE BEFORE.').setColor(done ? '#58d854' : open ? '#f8d878' : '#f83800');
    this.playBtn.setLabel(done ? 'PLAY AGAIN' : 'PLAY');
    this.playBtn.setEnabled(open);
    this.projBtn.setEnabled(!!done);
  }

  update(_, d) {
    this.drift(d);
  }
}
