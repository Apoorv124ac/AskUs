import Phaser from 'phaser';
import { PALETTE as C } from '../config.js';
import dialogue from '../data/dialogue.json';
import resume from '../data/resume.json';
import { DialogueBox } from '../systems/DialogueBox.js';
import { text, fadeTo } from '../systems/UI.js';

const WALK = [1, 0, 2, 0];

/** Cutscene: the hero walks into the lobby and talks to the receptionist. Esc skips. */
export class EntranceScene extends Phaser.Scene {
  constructor() { super('Entrance'); }

  create() {
    const sv = this.sv = this.game.services;
    const calm = sv.save.settings.reducedMotion;
    this.leaving = false; this.phase = 'walkin'; this.animT = 0;
    this.cameras.main.fadeIn(300, 15, 15, 27);

    this.add.image(0, 0, 'lobby_bg').setOrigin(0);
    text(this, 58, 124, 'WELCOME', { size: 8, color: C.white, backing: true });
    this.recep = this.add.image(184, 190, 'npc_receptionist').setOrigin(0.5, 1).setDepth(4);
    this.add.image(144, 172, 'reception_desk').setOrigin(0).setDepth(6);
    this.hero = this.add.sprite(-20, 198, `hero_t${sv.state.tier}`, 0).setOrigin(0.5, 1).setDepth(5);
    if (!calm) this.tweens.add({ targets: this.recep, y: 189, duration: 900, yoyo: true, repeat: -1 });

    this.box = new DialogueBox(this, sv, { y: 6, vars: { name: resume.meta.name.toUpperCase() } });
    text(this, 214, 214, dialogue.ui.skipIntro, { size: 8, color: C.white, backing: true });

    if (calm) { this.hero.x = 96; this.#talk(); }
    else this.tweens.add({ targets: this.hero, x: 96, duration: 1900, onComplete: () => this.#talk() });
  }

  #talk() { this.phase = 'talk'; this.hero.setFrame(0); this.time.delayedCall(300, () => this.box.say(dialogue.intro, () => this.#walkOut())); }

  #walkOut() {
    this.phase = 'walkout';
    if (this.sv.save.settings.reducedMotion) return this.finish();
    this.tweens.add({ targets: this.hero, x: 290, duration: 1500, onComplete: () => this.finish() });
  }

  finish() {
    if (this.leaving) return;
    this.leaving = true;
    this.sv.save.flags.introSeen = true; this.sv.save.save();
    fadeTo(this, 'Login');
  }

  update(_, delta) {
    const dt = Math.min(delta / 1000, 1 / 30);
    if (this.phase === 'walkin' || this.phase === 'walkout') {
      this.animT += dt * 8; this.hero.setFrame(WALK[Math.floor(this.animT) % 4]);
    }
    this.box.update(dt);
    if (!this.leaving && this.sv.input.justPressed('pause')) this.finish();
  }
}
