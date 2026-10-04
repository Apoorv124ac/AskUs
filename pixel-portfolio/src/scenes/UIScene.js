import Phaser from 'phaser';
import { PROGRESSION } from '../config.js';
import { NPC_ORDER, NPC_COLS } from '../npcFrames.js';
import { txt, panel, richText, burst, bump, COLORS } from '../ui/pixel.js';

// HUD overlay: compact top bar, fact/dialogue cards, pop-in banners, pause.
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    const reg = this.registry;
    this.shown = { coins: null, facts: null };

    // --- top bar (14px, so the game gets the screen) ---
    this.add.rectangle(0, 0, 256, 14, 0x0f0f1b, 0.72).setOrigin(0).setDepth(1);
    this.coinIcon = this.add.sprite(9, 7, 'coin', 0).setScale(0.5).setDepth(2);
    this.coinText = txt(this, 16, 7, '', { color: COLORS.gold, bold: true, depth: 2, origin: [0, 0.5] });
    this.xpBar = this.add.graphics().setDepth(2);
    this.factText = txt(this, 96, 7, '', { color: COLORS.green, bold: true, depth: 2, origin: [0, 0.5] });
    this.titleText = txt(this, 251, 7, '', { origin: [1, 0.5], bold: true, depth: 2 });
    this.coffeeIcon = this.add.image(190, 20, 'coffee').setScale(0.5).setVisible(false).setDepth(2);
    this.coffeeBar = this.add.graphics().setDepth(2);

    this.banner = this.add.container(128, 100).setDepth(30).setVisible(false);
    this.cardBox = null;

    this.pauseBox = this.add.container(0, 0).setDepth(40).setVisible(false);
    this.pauseBox.add([
      this.add.rectangle(0, 0, 256, 224, 0x0f0f1b, 0.6).setOrigin(0),
      panel(this, 66, 78, 124, 62, { depth: 0 }),
      txt(this, 128, 90, 'PAUSED', { display: true, origin: 0.5, color: COLORS.gold, depth: 41 }),
      txt(this, 128, 108, 'P / ESC   RESUME', { origin: 0.5, depth: 41 }),
      txt(this, 128, 120, 'Q   WORLD MAP', { origin: 0.5, depth: 41 }),
    ]);

    const g = this.game.events;
    this.handlers = {
      banner: (m) => this.showBanner(m),
      chapter: (c) => this.showChapter(c),
      fact: (f) => this.showFact(f),
      dialogue: (d) => this.showDialogue(d),
      'dialogue-end': () => this.hideCard(),
    };
    Object.entries(this.handlers).forEach(([k, fn]) => g.on(k, fn));
    this.onChange = () => this.refresh();
    reg.events.on('changedata', this.onChange);
    this.events.once('shutdown', () => {
      reg.events.off('changedata', this.onChange);
      Object.entries(this.handlers).forEach(([k, fn]) => g.off(k, fn));
    });

    const kb = this.input.keyboard;
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-Q', () => {
      if (!this.scene.isPaused('Game')) return;
      this.pauseBox.setVisible(false);
      this.scene.stop('Game');
      this.scene.stop('UI');
      this.scene.start('Menu');
    });
    this.refresh();
  }

  togglePause() {
    const paused = this.scene.isPaused('Game');
    if (paused) this.scene.resume('Game');
    else this.scene.pause('Game');
    this.pauseBox.setVisible(!paused);
  }

  // ---------------------------------------------------------------- banners
  // "HEADLINE\nsub line": headline pops in big, sub lines underneath.
  showBanner(msg) {
    const [head, ...rest] = String(msg).split('\n');
    this.banner.removeAll(true);
    this.tweens.killTweensOf(this.banner);
    const h = txt(this, 0, 0, head, { display: true, origin: 0.5, color: COLORS.gold, depth: 31 });
    if (h.width * 2 <= 236) h.setScale(2);
    const items = [h];
    if (rest.length) items.push(txt(this, 0, h.displayHeight / 2 + 8, rest.join('\n'), { origin: [0.5, 0], align: 'center', depth: 31 }));
    this.banner.add(items);
    this.banner.setVisible(true).setAlpha(1).setPosition(128, 100).setScale(0);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 300, ease: 'Back.out' });
    burst(this, 128, 100, { n: 8, spread: 40, depth: 29 });
    this.tweens.add({
      targets: this.banner,
      y: 88,
      alpha: 0,
      delay: 1500,
      duration: 350,
      onComplete: () => this.banner.setVisible(false),
    });
  }

  // small "CHAPTER 1 / THE LOBBY" title that slides in at the start of a world
  showChapter({ title, sub }) {
    // wait for any open card to close first, so the two never overlap
    if (this.cardBox) {
      this.pendingChapter = { title, sub };
      return;
    }
    const c = this.add.container(128, 46).setDepth(30);
    const a = txt(this, 0, -8, title, { origin: 0.5, color: COLORS.gold, bold: true, depth: 31 });
    const b = txt(this, 0, 4, sub, { display: true, origin: 0.5, depth: 31 });
    const line = this.add.rectangle(0, 14, 0, 1, 0xf8d878).setDepth(31);
    c.add([a, b, line]);
    c.setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 320, ease: 'Back.out' });
    this.tweens.add({ targets: line, width: Math.max(a.width, b.width) + 16, duration: 500, delay: 200 });
    this.tweens.add({ targets: c, alpha: 0, y: 38, delay: 2300, duration: 400, onComplete: () => c.destroy() });
  }

  // ------------------------------------------------------------------ cards
  // spec: { left: fn(container, cx, cy), label, text, color, hint, auto, slide }
  buildCard({ left, label, labelColor = COLORS.gold, text, hint = '', auto = 0, slide = true }) {
    if (this.cardTimer) this.cardTimer.remove();
    if (this.cardBox) this.cardBox.destroy();
    const X = 6;
    const Y = 18;
    const W = 244;
    const TX = 50;
    const rt = richText(this, TX, Y + 14, text, { width: W - (TX - X) - 8, depth: 0 });
    const H = Math.max(46, 14 + rt.height + (hint ? 13 : 6) + 4);
    const box = this.add.container(0, 0).setDepth(25);
    box.add(panel(this, X, Y, W, H, { depth: 0 }));
    box.add(this.add.rectangle(X + 44, Y + 4, 1, H - 8, 0x4a5aac).setOrigin(0));
    const lab = txt(this, TX, Y + 5, label, { color: labelColor, bold: true, depth: 0 });
    box.add([lab, rt.container]);
    if (hint) {
      const hnt = txt(this, X + W - 6, Y + H - 11, hint, { origin: [1, 0], color: COLORS.grey, depth: 0 });
      this.tweens.add({ targets: hnt, alpha: 0.35, yoyo: true, repeat: -1, duration: 500 });
      box.add(hnt);
    }
    left(box, X + 22, Y + H / 2);
    this.cardBox = box;
    if (slide) {
      box.y = -70;
      this.tweens.add({ targets: box, y: 0, duration: 340, ease: 'Back.out' });
    }
    this.time.delayedCall(slide ? 140 : 0, () => rt.reveal());
    if (auto) this.cardTimer = this.time.delayedCall(auto, () => this.hideCard());
  }

  hideCard() {
    if (this.cardTimer) this.cardTimer.remove();
    this.cardTimer = null;
    const box = this.cardBox;
    if (!box) return;
    this.cardBox = null;
    this.tweens.add({ targets: box, y: -70, alpha: 0, duration: 220, ease: 'Cubic.in', onComplete: () => box.destroy() });
    if (this.pendingChapter) {
      const c = this.pendingChapter;
      this.pendingChapter = null;
      this.time.delayedCall(300, () => this.showChapter(c));
    }
  }

  showFact({ label, tag, text, title, icon = 'fact' }) {
    this.buildCard({
      label: `${title} · ${label}`,
      text,
      auto: 7500,
      left: (box, cx, cy) => {
        const coin = this.add.sprite(cx, cy - 9, icon, 0).setScale(1);
        if (icon === 'fact') coin.anims.play('fact-spin');
        const t = txt(this, cx, cy + 8, tag, { display: true, origin: 0.5, color: COLORS.gold, depth: 0 });
        box.add([coin, t]);
        [coin, t].forEach((o, i) => {
          o.setScale(0);
          this.tweens.add({ targets: o, scale: 1, delay: 200 + i * 90, duration: 300, ease: 'Back.out' });
        });
      },
    });
  }

  showDialogue({ id, title, text, page, color }) {
    const same = this.cardBox && this.cardId === id;
    this.cardId = id;
    const row = Math.max(0, NPC_ORDER.indexOf(id));
    const label = id === 'hero' ? title : title;
    this.buildCard({
      label,
      labelColor: color || COLORS.gold,
      text,
      hint: `${page}  ENTER >`,
      slide: !same,
      left: (box, cx, cy) => {
        const spr =
          id === 'hero'
            ? this.add.sprite(cx, cy, 'hero', 0)
            : this.add.sprite(cx, cy, 'npcs', row * NPC_COLS + 2);
        box.add(spr);
        if (!same) {
          spr.setScale(0);
          this.tweens.add({ targets: spr, scale: 1, delay: 150, duration: 300, ease: 'Back.out' });
        }
      },
    });
  }

  // -------------------------------------------------------------- HUD state
  refresh() {
    const reg = this.registry;
    const coins = reg.get('coins') || 0;
    this.coinText.setText(String(coins).padStart(2, '0'));
    if (this.shown.coins !== null && coins > this.shown.coins) {
      bump(this, this.coinText, 1.5);
      bump(this, this.coinIcon, 0.8);
      this.coinIcon.setScale(0.5);
    }
    this.shown.coins = coins;

    const lvl = reg.get('level') || 0;
    this.titleText.setText(`LV${lvl + 1} ${PROGRESSION.titles[lvl]}`);

    const xp = reg.get('xp') || 0;
    const { thresholds } = PROGRESSION;
    const lo = thresholds[lvl];
    const hi = thresholds[lvl + 1] ?? lo + 1;
    const frac = lvl >= thresholds.length - 1 ? 1 : Phaser.Math.Clamp((xp - lo) / (hi - lo), 0, 1);
    this.xpBar.clear();
    this.xpBar.fillStyle(0x4a5aac).fillRect(36, 5, 44, 5);
    this.xpBar.fillStyle(0x58d854).fillRect(37, 6, Math.floor(42 * frac), 3);

    const total = reg.get('factsTotal') || 0;
    const facts = reg.get('facts') || 0;
    this.factText.setText(total ? `FACTS ${facts}/${total}` : reg.get('hudInfo') || '');
    if (this.shown.facts !== null && facts > this.shown.facts) bump(this, this.factText, 1.4);
    this.shown.facts = facts;

    const cf = reg.get('coffee') || 0;
    this.coffeeIcon.setVisible(cf > 0);
    this.coffeeBar.clear();
    if (cf > 0) {
      this.coffeeBar.fillStyle(0x0f0f1b).fillRect(197, 18, 54, 5);
      this.coffeeBar.fillStyle(0xfca044).fillRect(198, 19, Math.floor(52 * cf), 3);
    }
  }
}
