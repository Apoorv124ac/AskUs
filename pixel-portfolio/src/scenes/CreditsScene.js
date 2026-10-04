import Phaser from 'phaser';
import { save } from '../systems/save.js';
import { countFacts } from '../levels.js';
import { countSkills, TOTAL as SKILLS } from '../systems/arcade.js';
import { countCerts } from '../systems/trophies.js';
import resume from '../data/resume.json';
import { txt, go, skyline, groundStrip, viewCam, COLORS } from '../ui/pixel.js';

// Rolling credits with your final scores. Enter/Esc skips.
export default class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  create() {
    viewCam(this);
    this._leaving = false;
    this.cameras.main.setBackgroundColor(0x101830).fadeIn(500, 15, 15, 27);
    this.drift = skyline(this);
    this.children.list.forEach((c) => c.setTint && c.setTint(0x4a5aa8));
    groundStrip(this);
    for (let i = 0; i < 30; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(4, 252), Phaser.Math.Between(4, 150), 1, 1, 0xfcfcfc).setDepth(1);
      this.tweens.add({ targets: s, alpha: 0.2, yoyo: true, repeat: -1, duration: Phaser.Math.Between(500, 1500) });
    }
    const hero = this.add.sprite(60, 176, 'hero', 0).setDepth(5);
    hero.anims.play('walk');
    this.tweens.add({ targets: hero, x: 200, duration: 14000, yoyo: true, repeat: -1, onYoyo: () => hero.setFlipX(true), onRepeat: () => hero.setFlipX(false) });

    const reg = this.registry;
    const col = reg.get('collected') || new Set();
    const name = save.name || 'FRIEND';
    const c = resume.contact;
    const lines = [
      ['OFFICE QUEST', 'h1'],
      ['A PORTFOLIO YOU CAN PLAY', 'sub'],
      ['', ''],
      ['YOUR STATS, ' + name, 'h2'],
      [`COINS ${reg.get('coins') || 0}`, ''],
      [`FACTS ${countFacts(col)}/10`, ''],
      [`DEGREES ${save.degrees.filter(Boolean).length}/4`, ''],
      [`FLOORS ${save.floors.filter(Boolean).length}/5`, ''],
      [`SKILLS ${countSkills(col)}/${SKILLS}`, ''],
      [`CERTIFICATES ${countCerts(col)}/5`, ''],
      ['', ''],
      ['STORY, ART AND DESIGN', 'h2'],
      [resume.profile.name.toUpperCase(), ''],
      ['', ''],
      ['CAST', 'h2'],
      ['RITA, RAJU, MEERA, PROF. DAS', ''],
      ['ANITA, SAM, THE CEO, RAVI, MRS. KAPOOR', ''],
      ['', ''],
      ['BUILT WITH', 'h2'],
      ['PHASER 3 AND VITE', ''],
      ['FONTS: SILKSCREEN, PRESS START 2P', ''],
      ['ALL PIXEL ART DRAWN IN CODE', ''],
      ['CODE AND ENGINEERING WITH CLAUDE', ''],
      ['', ''],
      ['LET\'S TALK', 'h2'],
      [c.email.toUpperCase(), ''],
      [c.phone, ''],
      ['LINKEDIN: APOORV CHAURASIA', ''],
      ['', ''],
      ['THANK YOU FOR PLAYING!', 'h1'],
      ['PRESS ENTER FOR THE MAP', 'sub'],
    ];
    const box = this.add.container(128, 224).setDepth(10);
    let y = 0;
    lines.forEach(([t, kind]) => {
      if (t) {
        const o = txt(this, 0, y, t, {
          origin: 0.5,
          display: kind === 'h1',
          size: 8,
          bold: kind === 'h2',
          color: kind === 'h1' ? COLORS.gold : kind === 'h2' ? '#58d8d8' : kind === 'sub' ? COLORS.grey : COLORS.white,
          depth: 10,
        });
        box.add(o);
      }
      y += kind === 'h1' ? 20 : kind === 'h2' ? 16 : 12;
    });
    this.tweens.add({
      targets: box,
      y: 224 - y - 20,
      duration: y * 150,
      ease: 'Linear',
      onComplete: () => this.end(),
    });
    this.input.keyboard.on('keydown-ENTER', () => this.end());
    this.input.keyboard.on('keydown-ESC', () => this.end());
    this.input.on('pointerdown', () => this.end());
  }

  end() {
    save.lastWorld = 5;
    go(this, 'Menu');
  }

  update(_, d) {
    this.drift(d);
  }
}
