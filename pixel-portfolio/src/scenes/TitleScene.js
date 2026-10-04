import Phaser from 'phaser';
import { GAME, PALETTE as C } from '../config.js';
import dialogue from '../data/dialogue.json';
import { text } from '../systems/UI.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const sv = this.sv = this.game.services;
    const calm = sv.save.settings.reducedMotion;
    if (this.scene.isActive('HUD')) this.scene.stop('HUD');
    this.cameras.main.fadeIn(250, 15, 15, 27);

    this.far = this.add.tileSprite(0, 0, 256, 224, 'bg_far').setOrigin(0);
    this.mid = this.add.tileSprite(0, 0, 256, 224, 'bg_mid').setOrigin(0);
    this.near = this.add.tileSprite(0, 0, 256, 224, 'bg_near').setOrigin(0);
    for (let x = 0; x < 16; x++) { this.add.image(x * 16 + 8, 200, 'tiles', 0); this.add.image(x * 16 + 8, 216, 'tiles', 1); }

    const hero = this.add.sprite(128, 192, `hero_t${sv.state.tier}`, 0).setOrigin(0.5, 1);
    if (!calm) this.tweens.add({ targets: hero, y: 190, duration: 450, yoyo: true, repeat: -1 });

    text(this, 128, 38, 'OFFICE', { size: 24, color: C.yellow }).setShadow(3, 3, C.black, 0, false, true);
    text(this, 128, 68, 'QUEST', { size: 24, color: C.white }).setShadow(3, 3, C.red, 0, false, true);
    text(this, 128, 100, 'A PIXEL PORTFOLIO', { size: 8, color: C.cyan, backing: true });

    const { save } = sv;
    const profile = save.hasProfile || save.flags.introSeen;
    const goMap = () => this.go('WorldMap');
    this.items = [
      { label: profile ? dialogue.ui.continue : dialogue.ui.start, run: () => (profile ? goMap() : this.go('Entrance')) },
      { label: dialogue.ui.recruiter, run: () => { sv.state.setRecruiter(true); goMap(); } },
    ];
    if (save.flags.introSeen) this.items.push({ label: dialogue.ui.replayIntro, run: () => this.go('Entrance') });
    this.sel = 0;
    this.rows = this.items.map((it, i) => text(this, 128, 126 + i * 15, it.label, { size: 8, backing: true, shadow: false })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { if (this.sel === i) this.choose(); else { this.sel = i; this.render(); } }));
    text(this, 128, 208, 'M SOUND  C SCANLINES', { size: 8, color: C.white, backing: true });
    this.starting = false;
    this.render();
  }

  render() {
    this.rows.forEach((r, i) => r.setText((i === this.sel ? '> ' : '  ') + this.items[i].label + (i === this.sel ? ' <' : '  ')).setColor(i === this.sel ? C.yellow : C.white));
  }

  go(key) {
    if (this.starting) return;
    this.starting = true;
    this.sv.audio.sfx('confirm'); this.sv.audio.startMusic();
    this.cameras.main.fadeOut(250, 15, 15, 27);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }

  choose() { this.items[this.sel].run(); }

  update(_, delta) {
    const calm = this.sv.save.settings.reducedMotion;
    if (!calm) { this.far.tilePositionX += delta * 0.003; this.mid.tilePositionX += delta * 0.01; this.near.tilePositionX += delta * 0.025; }
    const { input, audio } = this.sv;
    if (this.starting) return;
    if (input.menuUp()) { this.sel = (this.sel + this.items.length - 1) % this.items.length; audio.sfx('menu'); this.render(); }
    if (input.justPressed('down')) { this.sel = (this.sel + 1) % this.items.length; audio.sfx('menu'); this.render(); }
    if (input.confirmPressed()) this.choose();
  }
}
