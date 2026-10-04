import Phaser from 'phaser';
import { GAME, PALETTE as C, COFFEE, DEBUG } from '../config.js';
import { text, drawBox } from '../systems/UI.js';

const hex = (s) => parseInt(s.slice(1), 16);

/** Heads-up display running above the level: coins, career title + XP bar, coffee meter. */
export class HUDScene extends Phaser.Scene {
  constructor() { super('HUD'); }

  create() {
    const sv = this.sv = this.game.services;
    this.add.rectangle(0, 0, GAME.width, 26, hex(C.black), 0.6).setOrigin(0);

    this.add.image(12, 11, 'coin', 0);
    this.coinText = text(this, 22, 11, 'x000', { origin: [0, 0.5] });

    this.titleText = text(this, 128, 8, '', { size: 8, color: C.yellow });
    this.xpBar = this.add.graphics();

    this.add.image(204, 11, 'coffee');
    this.coffeeBar = this.add.graphics();
    this.coffeeText = text(this, 214, 11, 'COFFEE', { size: 8, color: C.orange, origin: [0, 0.5] }).setVisible(false);

    // per-world extras: counters (facts / degrees / bosses / certs) and the World 4 skill bars
    this.infoText = text(this, 6, 34, '', { size: 8, color: C.lime, origin: [0, 0.5], backing: true, shadow: false }).setVisible(false);
    this.skillG = this.add.graphics();
    this.skillLabels = [0, 1, 2, 3].map((i) => text(this, 6 + i * 62, 200, '', { size: 8, color: C.white, origin: [0, 0.5], shadow: true }));

    this.toastBox = this.add.graphics().setVisible(false);
    this.toast = text(this, 128, 70, '', { size: 8, color: C.yellow }).setVisible(false);
    this.onLevelUp = (tier) => this.showToast(tier);
    sv.state.on('levelup', this.onLevelUp);
    this.events.once('shutdown', () => sv.state.off('levelup', this.onLevelUp));

    if (new URLSearchParams(location.search).has('debug') || DEBUG.overlay) {
      this.debug = text(this, 4, 30, '', { size: 8, color: C.lime, origin: [0, 0], shadow: true });
    }
    this.refresh();
  }

  showToast(tier) {
    const calm = this.sv.save.settings.reducedMotion;
    const title = this.sv.state.tierTitle;
    this.toastBox.clear(); drawBox(this.toastBox, 64, 52, 128, 36).setVisible(true).setAlpha(1);
    this.toast.setText(`LEVEL UP!\n${title}`).setVisible(true).setAlpha(1);
    this.tweens.add({ targets: [this.toast, this.toastBox], alpha: 0, delay: calm ? 1800 : 1400, duration: 400,
      onComplete: () => { this.toast.setVisible(false); this.toastBox.setVisible(false); } });
    void tier;
  }

  refresh() {
    const { state } = this.sv;
    this.coinText.setText('x' + String(state.coins).padStart(3, '0'));
    this.titleText.setText(state.tierTitle);
    const g = this.xpBar; g.clear();
    const bx = 96, by = 15, bw = 64, bh = 5;
    g.fillStyle(hex(C.black)).fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    g.fillStyle(hex(C.grey)).fillRect(bx, by, bw, bh);
    g.fillStyle(hex(state.tierProgress >= 1 ? C.yellow : C.lime)).fillRect(bx, by, Math.round(bw * state.tierProgress), bh);
    const c = this.coffeeBar; c.clear();
    const active = state.coffeeActive;
    this.coffeeText.setVisible(false);
    const cx = 214, cy = 8, cw = 36, ch = 6;
    c.fillStyle(hex(C.black)).fillRect(cx - 1, cy - 1, cw + 2, ch + 2);
    c.fillStyle(hex(C.grey)).fillRect(cx, cy, cw, ch);
    if (active) c.fillStyle(hex(C.orange)).fillRect(cx, cy, Math.round(cw * (state.coffeeMs / COFFEE.durationMs)), ch);
  }

  /** World-specific extras supplied by the active level (see LevelScene.hudInfo). */
  drawExtras() {
    const lvl = this.scene.isActive('Level') || this.scene.isPaused('Level') ? this.scene.get('Level') : null;
    const info = lvl?.hudInfo?.() ?? {};
    this.infoText.setVisible(!!info.text); if (info.text) this.infoText.setText(info.text);
    const g = this.skillG; g.clear();
    this.skillLabels.forEach((t, i) => {
      const k = info.skills?.[i];
      t.setVisible(!!k);
      if (!k) return;
      const x = 6 + i * 62;
      t.setText(k.name.replace('CATEGORY ', 'CAT ').slice(0, 7));
      g.fillStyle(hex(C.black), 0.7).fillRect(x - 3, 192, 61, 28);
      g.fillStyle(hex(C.black)).fillRect(x - 1, 207, 54, 8);
      g.fillStyle(hex(C.grey)).fillRect(x, 208, 52, 6);
      g.fillStyle(hex(k.color)).fillRect(x, 208, Math.round(52 * k.frac), 6);
    });
  }

  update() {
    this.refresh();
    this.drawExtras();
    if (this.debug) {
      const lvl = this.scene.get('Level');
      const p = lvl?.player;
      if (p) {
        const c = p.ctrl;
        this.debug.setText(`vx ${p.body.velocity.x.toFixed(0)} vy ${p.body.velocity.y.toFixed(0)}\nground ${p.onGround ? 1 : 0} coy ${c.coyote.toFixed(2)} buf ${c.buffer.toFixed(2)}\nfps ${this.game.loop.actualFps.toFixed(0)}`);
      }
    }
  }
}
