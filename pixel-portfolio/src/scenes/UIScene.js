import Phaser from 'phaser';
import { PROGRESSION, ZOOM } from '../config.js';
import { NPC_ORDER, NPC_COLS } from '../npcFrames.js';
import { txt, panel, richText, burst, bump, viewCam, COLORS } from '../ui/pixel.js';

// HUD overlay: compact top bar, fact/dialogue cards, pop-in banners, pause.
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    viewCam(this);
    const reg = this.registry;
    this.add.image(0, 0, 'vignette').setOrigin(0).setScale(1 / ZOOM).setDepth(0).setAlpha(0.9);
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

    // boss health bar (floor bosses + the dragon)
    this.bossBox = this.add.container(0, 0).setDepth(3).setVisible(false);
    this.bossGfx = this.add.graphics();
    this.bossName = txt(this, 128, 21, '', { origin: 0.5, bold: true, color: '#ff7070', depth: 3 });
    this.bossBox.add([this.bossGfx, this.bossName]);
    // skill bars strip (World 4 only)
    this.barStrip = this.add.container(0, 0).setDepth(2).setVisible(false);
    this.barStrip.add(this.add.rectangle(0, 14, 256, 11, 0x0f0f1b, 0.55).setOrigin(0));
    this.barGfx = this.add.graphics();
    this.barLabels = [0, 1, 2].map((i) => txt(this, [6, 90, 176][i], 19.5, '', { origin: [0, 0.5], bold: true, shadow: false, depth: 2 }));
    this.barStrip.add([this.barGfx, ...this.barLabels]);
    this.banner = this.add.container(128, 100).setDepth(30).setVisible(false);
    this.dim = this.add.rectangle(0, 0, 256, 224, 0x0f0f1b, 0).setOrigin(0).setDepth(20);
    this.bubble = null;
    this.chapterBox = null;
    this.cardBox = null;

    this.pauseBox = this.add.container(0, 0).setDepth(40).setVisible(false);
    this.pauseBox.add([
      this.add.rectangle(0, 0, 256, 224, 0x0f0f1b, 0.6).setOrigin(0),
      panel(this, 50, 78, 156, 68, { depth: 0 }),
      txt(this, 128, 90, 'PAUSED', { display: true, origin: 0.5, color: COLORS.gold, depth: 41 }),
      txt(this, 128, 108, 'P / ESC   RESUME', { origin: 0.5, depth: 41 }),
      txt(this, 128, 120, 'R   BACK TO CHECKPOINT', { origin: 0.5, depth: 41 }),
      txt(this, 128, 132, 'Q   WORLD MAP', { origin: 0.5, depth: 41 }),
    ]);

    const g = this.game.events;
    this.handlers = {
      banner: (m) => this.showBanner(m),
      chapter: (c) => this.showChapter(c),
      fact: (f) => this.showFact(f),
      dialogue: (d) => this.showBubble(d),
      'dialogue-skip': () => this.bubbleRt && this.bubbleRt.finish(),
      'dialogue-end': () => this.hideBubble(),
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
    const c = this.add.container(128, 34).setDepth(30);
    this.chapterBox = c;
    const a = txt(this, 0, -8, title, { origin: 0.5, color: COLORS.gold, bold: true, depth: 31 });
    const b = txt(this, 0, 4, sub, { display: true, origin: 0.5, depth: 31 });
    const line = this.add.rectangle(0, 14, 0, 1, 0xf8d878).setDepth(31);
    c.add([a, b, line]);
    c.setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 320, ease: 'Back.out' });
    this.tweens.add({ targets: line, width: Math.max(a.width, b.width) + 16, duration: 500, delay: 200 });
    this.tweens.add({ targets: c, alpha: 0, y: 26, delay: 2300, duration: 400, onComplete: () => c.destroy() });
  }

  // ---------------------------------------------------------- NPC speech bubble
  // Pops out of the NPC's head, then types the line. ENTER finishes typing, then moves on.
  showBubble({ id, title, text, page, color, ax = 128, ay = 120 }) {
    const first = !this.bubble || this.bubbleId !== id;
    this.bubbleId = id;
    if (this.chapterBox && this.chapterBox.active) {
      this.tweens.killTweensOf(this.chapterBox);
      this.tweens.add({ targets: this.chapterBox, alpha: 0, duration: 150 });
    }
    if (this.bubble) this.bubble.destroy();
    this.tweens.killTweensOf(this.dim);
    this.tweens.add({ targets: this.dim, fillAlpha: 0.3, duration: 250 });

    const W = 214;
    const rt = richText(this, 0, 0, text, { width: W - 18, depth: 0 });
    const H = Math.max(34, rt.height + 26);
    const bx = Phaser.Math.Clamp(ax - W / 2, 6, 250 - W);
    const by = Phaser.Math.Clamp(ay - H - 12, 20, 130);
    const tx = Phaser.Math.Clamp(ax, bx + 12, bx + W - 12);
    const ty = by + H + 5; // pivot = the tail tip, so the bubble grows out of the NPC
    const col = parseInt((color || '#f8d878').slice(1), 16);

    const box = this.add.container(tx, ty).setDepth(25);
    box.add(panel(this, bx - tx, by - ty, W, H, { depth: 0 }));
    // tail: little pixel triangle pointing down at the NPC
    const tail = this.add.graphics();
    for (let r = 0; r < 4; r++) {
      tail.fillStyle(0x0f0f1b).fillRect(-(5 - r), -5 + r + 1, 11 - 2 * r, 1);
      tail.fillStyle(0x1c2250).fillRect(-(4 - r), -5 + r + 1, 9 - 2 * r, 1);
    }
    box.add(tail);
    // name chip
    const nm = txt(this, bx - tx + 12, by - ty - 2, title, { color, bold: true, shadow: false, depth: 0, origin: [0, 0.5] });
    const chipW = nm.width + 12;
    const chip = panel(this, bx - tx + 6, by - ty - 7, chipW, 11, { fill: 0x0f0f1b, frame: col, depth: 0 });
    box.add([chip, nm]);
    rt.container.setPosition(bx - tx + 9, by - ty + 9);
    box.add(rt.container);
    const pg = txt(this, bx - tx + 9, by - ty + H - 10, page, { color: COLORS.dim, shadow: false, depth: 0 });
    const hint = txt(this, bx - tx + W - 8, by - ty + H - 10, 'ENTER >', { origin: [1, 0], color: COLORS.gold, shadow: false, depth: 0 });
    hint.setAlpha(0);
    box.add([pg, hint]);

    this.bubble = box;
    this.bubbleRt = rt;
    box.setScale(first ? 0 : 0.92);
    this.tweens.add({ targets: box, scale: 1, duration: first ? 320 : 160, ease: 'Back.out', easeParams: [0.9] }); // gentle overshoot: never pops past the screen edge
    this.registry.set('typing', true);
    this.time.delayedCall(first ? 240 : 40, () => {
      if (this.bubbleRt !== rt) return; // replaced or closed in the meantime
      rt.type(() => {
        this.registry.set('typing', false);
        this.tweens.add({ targets: hint, alpha: 1, duration: 150 });
        this.tweens.add({ targets: hint, x: hint.x + 2, yoyo: true, repeat: -1, duration: 400, delay: 150 });
      });
    });
  }

  hideBubble() {
    this.registry.set('typing', false);
    this.tweens.add({ targets: this.dim, fillAlpha: 0, duration: 250 });
    const b = this.bubble;
    this.bubble = null;
    this.bubbleRt = null;
    this.bubbleId = null;
    if (!b) return;
    this.tweens.add({ targets: b, scale: 0, alpha: 0, duration: 200, ease: 'Back.in', onComplete: () => b.destroy() });
  }

  // ------------------------------------------------------------------ cards
  // spec: { left: fn(container, cx, cy), label, text, color, hint, auto, slide }
  buildCard({ left, label, labelColor = COLORS.gold, text, hint = '', auto = 0, slide = true }) {
    if (this.cardTimer) this.cardTimer.remove();
    if (this.cardBox) this.cardBox.destroy();
    const X = 6;
    const Y = this.registry.get('skillBars') ? 28 : 18; // leave room for the skill-bar strip
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

    const boss = reg.get('bossBar');
    this.bossBox.setVisible(!!boss);
    if (boss) {
      this.bossGfx.clear();
      const w = 110;
      const x0 = 128 - w / 2;
      const cw = Math.floor((w - (boss.max - 1) * 2) / boss.max);
      this.bossGfx.fillStyle(0x0f0f1b, 0.8).fillRect(x0 - 3, 25, w + 6, 8);
      for (let k = 0; k < boss.max; k++) {
        const cur = k === boss.hp - 1 && boss.chip;
        this.bossGfx.fillStyle(k < boss.hp ? 0xf83800 : 0x3a2030).fillRect(x0 + k * (cw + 2), 27, cw, 4);
        if (cur) this.bossGfx.fillStyle(0xf8d878).fillRect(x0 + k * (cw + 2) + Math.round(cw * (1 - boss.chip)), 27, Math.ceil(cw * boss.chip), 4);
      }
      if (boss.ammoMax) {
        const cols = [0xf83800, 0xfca044, 0xf8d878, 0x58d854, 0x58b0f8, 0x6844fc];
        for (let k = 0; k < boss.ammoMax; k++) this.bossGfx.fillStyle(k < boss.ammo ? cols[k % cols.length] : 0x2c3a7c).fillRect(x0 + k * 7, 35, 5, 3);
      }
      this.bossName.setText(boss.name);
      this.bossBox.setPosition(0, reg.get('skillBars') ? 10 : 0);
    }
    const bars = reg.get('skillBars');
    this.barStrip.setVisible(!!bars);
    if (bars) {
      this.barGfx.clear();
      bars.forEach(([have, total, tint, label], i) => {
        const x0 = [6, 90, 176][i];
        const lw = [38, 26, 30][i];
        const bw = [40, 44, 40][i];
        this.barLabels[i].setText(label).setColor('#' + tint.toString(16).padStart(6, '0'));
        const cw = Math.floor((bw - (total - 1)) / total);
        for (let k = 0; k < total; k++) {
          this.barGfx.fillStyle(k < have ? tint : 0x2c3a7c).fillRect(x0 + lw + k * (cw + 1), 17, cw, 5);
        }
      });
    }

    const cf = reg.get('coffee') || 0;
    this.coffeeIcon.setVisible(cf > 0);
    this.coffeeBar.clear();
    if (cf > 0) {
      this.coffeeBar.fillStyle(0x0f0f1b).fillRect(197, 18, 54, 5);
      this.coffeeBar.fillStyle(0xfca044).fillRect(198, 19, Math.floor(52 * cf), 3);
    }
  }
}
