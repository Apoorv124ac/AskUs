import Phaser from 'phaser';
import { PROGRESSION } from '../config.js';
import { panel } from '../ui/pixel.js';

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
    this.factText = this.add.text(80, 14, '', style('#58d854'));
    this.coffeeIcon = this.add.image(184, 18, 'coffee').setScale(0.5).setVisible(false);
    this.coffeeBar = this.add.graphics();

    this.banner = this.add
      .text(128, 112, '', { ...style('#f8d878'), align: 'center', lineSpacing: 4 })
      .setOrigin(0.5)
      .setShadow(1, 1, '#0f0f1b', 0)
      .setAlpha(0)
      .setDepth(10);
    this.pauseText = this.add
      .text(128, 112, 'PAUSED\n\nP / ESC  RESUME\nQ  WORLD MAP', { ...style(), align: 'center' })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(11);

    // info card (facts + NPC dialogue), top of the screen so the hero stays visible
    this.card = this.add.container(0, 0).setDepth(12).setVisible(false);
    const cardPanel = panel(this, 6, 26, 244, 70, { depth: 12 });
    this.cardTitle = this.add.text(14, 33, '', style('#f8d878'));
    this.cardBody = this.add.text(14, 46, '', { ...style(), wordWrap: { width: 228 }, lineSpacing: 3 });
    this.cardHint = this.add.text(242, 86, '', style('#bcbcbc')).setOrigin(1, 0);
    this.cardPage = this.add.text(14, 86, '', style('#7c7c7c'));
    this.card.add([cardPanel, this.cardTitle, this.cardBody, this.cardHint, this.cardPage]);
    cardPanel.setDepth(0);
    this.cardTimer = null;
    this.onFact = ({ title, text }) => this.showCard(title, text, { auto: 7000 });
    this.onDialogue = ({ title, text, page }) => this.showCard(title, text, { page, hint: 'ENTER >' });
    this.onDialogueEnd = () => this.hideCard();
    this.game.events.on('fact', this.onFact);
    this.game.events.on('dialogue', this.onDialogue);
    this.game.events.on('dialogue-end', this.onDialogueEnd);

    this.onChange = () => this.refresh();
    reg.events.on('changedata', this.onChange);
    this.game.events.on('banner', this.showBanner, this);
    this.events.once('shutdown', () => {
      reg.events.off('changedata', this.onChange);
      this.game.events.off('banner', this.showBanner, this);
      this.game.events.off('fact', this.onFact);
      this.game.events.off('dialogue', this.onDialogue);
      this.game.events.off('dialogue-end', this.onDialogueEnd);
    });

    const kb = this.input.keyboard;
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-Q', () => {
      if (!this.scene.isPaused('Game')) return;
      this.pauseText.setVisible(false);
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
    this.pauseText.setVisible(!paused);
  }

  showCard(title, text, { auto = 0, page = '', hint = '' } = {}) {
    this.cardTitle.setText(title);
    this.cardBody.setText(text);
    this.cardPage.setText(page);
    this.cardHint.setText(hint);
    this.card.setVisible(true);
    if (this.cardTimer) this.cardTimer.remove();
    this.cardTimer = auto ? this.time.delayedCall(auto, () => this.hideCard()) : null;
  }

  hideCard() {
    this.card.setVisible(false);
    if (this.cardTimer) this.cardTimer.remove();
    this.cardTimer = null;
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

    const total = reg.get('factsTotal') || 0;
    this.factText.setText(total ? `FACTS ${reg.get('facts') || 0}/${total}` : '');

    const cf = reg.get('coffee') || 0;
    this.coffeeIcon.setVisible(cf > 0);
    this.coffeeBar.clear();
    if (cf > 0) {
      this.coffeeBar.fillStyle(0x0f0f1b).fillRect(192, 15, 50, 6);
      this.coffeeBar.fillStyle(0xfca044).fillRect(193, 16, Math.floor(48 * cf), 4);
    }
  }
}

