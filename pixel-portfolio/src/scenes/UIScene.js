import Phaser from 'phaser';
import { PROGRESSION } from '../config.js';

const FONT = '"Press Start 2P"';
const style = (color = '#fcfcfc') => ({ fontFamily: FONT, fontSize: '8px', color });

// HUD overlay: coins, XP bar, career title, coffee meter, banners, pause.
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    const reg = this.registry;
    this.add.rectangle(0, 0, 256, 24, 0x0f0f1b, 0.55).setOrigin(0);
    this.coinText = this.add.text(6, 4, '', style('#f8d878'));
    this.titleText = this.add.text(250, 4, '', style()).setOrigin(1, 0);

    this.xpBar = this.add.graphics();
    this.coffeeIcon = this.add.image(142, 18, 'coffee').setScale(0.5).setVisible(false);
    this.coffeeBar = this.add.graphics();

    this.banner = this.add
      .text(128, 80, '', { ...style('#f8d878'), align: 'center', lineSpacing: 4 })
      .setOrigin(0.5)
      .setShadow(1, 1, '#0f0f1b', 0)
      .setAlpha(0)
      .setDepth(10);
    this.pauseText = this.add
      .text(128, 112, 'PAUSED\n\nP / ESC TO RESUME', { ...style(), align: 'center' })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(11);

    this.onChange = () => this.refresh();
    reg.events.on('changedata', this.onChange);
    this.game.events.on('banner', this.showBanner, this);
    this.events.once('shutdown', () => {
      reg.events.off('changedata', this.onChange);
      this.game.events.off('banner', this.showBanner, this);
    });

    const kb = this.input.keyboard;
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown-ESC', () => this.togglePause());
    this.refresh();
  }

  togglePause() {
    const paused = this.scene.isPaused('Game');
    if (paused) this.scene.resume('Game');
    else this.scene.pause('Game');
    this.pauseText.setVisible(!paused);
  }

  showBanner(msg) {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1400, duration: 400 });
  }

  refresh() {
    const reg = this.registry;
    const coins = String(reg.get('coins') || 0).padStart(2, '0');
    this.coinText.setText(`COINS ${coins}`);
    const lvl = reg.get('level') || 0;
    this.titleText.setText(`LV${lvl + 1} ${PROGRESSION.titles[lvl]}`);

    // XP bar toward the next career level
    const xp = reg.get('xp') || 0;
    const { thresholds } = PROGRESSION;
    const lo = thresholds[lvl];
    const hi = thresholds[lvl + 1] ?? lo + 1;
    const frac = lvl >= thresholds.length - 1 ? 1 : Phaser.Math.Clamp((xp - lo) / (hi - lo), 0, 1);
    this.xpBar.clear();
    this.xpBar.fillStyle(0x0f0f1b).fillRect(6, 15, 66, 6);
    this.xpBar.fillStyle(0x58d854).fillRect(7, 16, Math.floor(64 * frac), 4);

    const cf = reg.get('coffee') || 0;
    this.coffeeIcon.setVisible(cf > 0);
    this.coffeeBar.clear();
    if (cf > 0) {
      this.coffeeBar.fillStyle(0x0f0f1b).fillRect(150, 15, 50, 6);
      this.coffeeBar.fillStyle(0xfca044).fillRect(151, 16, Math.floor(48 * cf), 4);
    }
  }
}

