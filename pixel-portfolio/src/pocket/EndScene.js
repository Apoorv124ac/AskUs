import Phaser from 'phaser';
import { CLASSIC_RESUME_URL } from '../config.js';
import { save, persist } from '../systems/save.js';
import { sendFeedback } from '../systems/email.js';
import { sfx, music } from '../systems/audio.js';
import { txt, panel, go, popIn, burst, skyline, groundStrip, COLORS, viewCam } from '../ui/pixel.js';
import resume from '../data/resume.json';
import { button } from './ui.js';

// Credits, then a feedback form (saved to the Google Sheet), then a thank-you with the contact buttons.
export default class EndScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  create() {
    viewCam(this);
    this._leaving = false;
    this.phase = 'credits';
    this.rating = 0;
    this.layer = [];
    this.cameras.main.setBackgroundColor(0x3c4c8c).fadeIn(400, 15, 15, 27);
    this.drift = skyline(this, { near: false });
    groundStrip(this);
    music('theme');
    const hero = this.add.sprite(60, 176, 'hero', 0).setDepth(5);
    hero.anims.play('walk');
    this.tweens.add({ targets: hero, x: 200, duration: 12000, yoyo: true, repeat: -1, onYoyo: () => hero.setFlipX(true), onRepeat: () => hero.setFlipX(false) });
    this.credits();
    const kb = this.input.keyboard;
    kb.on('keydown-ENTER', () => this.phase === 'credits' && this.feedback());
    kb.on('keydown-SPACE', () => this.phase === 'credits' && this.feedback());
    this.events.once('shutdown', () => this.ta && this.ta.remove());
  }

  put(o) {
    this.layer.push(o);
    return o;
  }
  wipe() {
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
  }

  // ---------------------------------------------------------------- 1. credits
  credits() {
    const name = save.name || 'FRIEND';
    const stats = [save.pocket.done.filter(Boolean).length, save.pocket.edu.filter(Boolean).length];
    const lines = [
      ['OFFICE QUEST', 'h1'], ['POCKET EDITION', 'sub'], ['', ''],
      [`THANKS FOR PLAYING, ${name}!`, 'h2'],
      [`STAGES CLEARED ${stats[0]}/5`, ''], [`STUDIES EARNED ${stats[1]}/4`, ''], ['', ''],
      ['CONCEPT, STORY AND DESIGN', 'h2'], ['APOORV CHAURASIA', ''], ['SPECIALIST - GRAPHICS DESIGN', ''], ['', ''],
      ['GAME DESIGN SKILLS ON SHOW', 'h2'], ['STORY, LEVELS, PUZZLES AND UX', ''], ['PIXEL ART DIRECTION', ''], ['BUILT WITH AI (CLAUDE), PHASER 3 AND VITE', ''], ['', ''],
      ['ALL PIXEL ART DRAWN IN CODE', ''], ['FONTS: SILKSCREEN, PRESS START 2P', ''], ['', ''],
      ['LET\'S TALK', 'h2'], [resume.contact.email.toUpperCase(), ''], ['LINKEDIN: APOORV CHAURASIA', ''], ['', ''],
      ['ONE LAST THING...', 'h2'],
    ];
    const box = this.add.container(128, 224).setDepth(10);
    this.put(box);
    let y = 0;
    lines.forEach(([t, kind]) => {
      if (t) {
        const o = txt(this, 0, y, t, { origin: 0.5, display: kind === 'h1', size: kind === 'h1' ? 16 : 8, color: kind === 'h1' ? '#f8d878' : kind === 'h2' ? '#58d854' : kind === 'sub' ? '#fcfcfc' : '#fcfcfc', bold: kind === 'h2', depth: 0 });
        box.add(o);
      }
      y += kind === 'h1' ? 26 : 12;
    });
    this.tweens.add({ targets: box, y: -y - 8, duration: 15000, ease: 'Linear', onComplete: () => this.phase === 'credits' && this.feedback() });
    this.put(txt(this, 250, 214, 'ENTER OR TAP: SKIP', { origin: [1, 0], color: COLORS.grey, depth: 11 }));
    this.input.once('pointerdown', () => this.phase === 'credits' && this.feedback());
  }

  // ---------------------------------------------------------------- 2. feedback form
  feedback() {
    if (this.phase !== 'credits') return;
    this.phase = 'feedback';
    this.tweens.killAll();
    this.wipe();
    this.put(panel(this, 10, 12, 236, 176, { fill: 0x0f0f1b, frame: 0x58d854, depth: 12 }));
    this.put(txt(this, 128, 22, 'HOW WAS THE GAME?', { display: true, origin: 0.5, color: COLORS.gold, depth: 13 }));
    this.put(txt(this, 128, 36, 'TAP A STAR, THEN SAY A FEW WORDS', { origin: 0.5, color: COLORS.grey, depth: 13, shadow: false }));
    this.stars = [0, 1, 2, 3, 4].map((i) => {
      const s = this.add.sprite(52 + i * 38, 56, 'pk-star', 0).setDepth(14).setScale(1.9).setAlpha(0.35);
      s.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.rate(i + 1));
      this.put(s);
      return s;
    });
    this.rateLabel = this.put(txt(this, 128, 74, 'NO RATING YET', { origin: 0.5, color: COLORS.dim, bold: true, depth: 13 }));
    // a real <textarea> so phones can type
    const ta = document.createElement('textarea');
    ta.maxLength = 300;
    ta.placeholder = 'WHAT DID YOU LIKE? WHAT COULD BE BETTER? (OPTIONAL)';
    ta.setAttribute('aria-label', 'Feedback');
    Object.assign(ta.style, { position: 'fixed', zIndex: '10', boxSizing: 'border-box', padding: '6px 8px', margin: '0', outline: 'none', borderRadius: '0', resize: 'none', background: '#1c2250', color: '#fcfcfc', border: '2px solid #58d854', caretColor: '#58d854', font: 'bold 16px Silkscreen, monospace' });
    document.body.appendChild(ta);
    this.ta = ta;
    this.place = () => {
      const r = this.game.canvas.getBoundingClientRect();
      const k = r.width / 256;
      ta.style.left = `${r.left + 22 * k}px`;
      ta.style.top = `${r.top + 84 * k}px`;
      ta.style.width = `${212 * k}px`;
      ta.style.height = `${Math.max(64, 68 * k)}px`;
    };
    this.place();
    this.put(button(this, 14, 196, 70, 20, 'SKIP', () => this.thanks(false), { size: 8 }));
    this.send = this.put(button(this, 138, 196, 108, 20, 'SEND FEEDBACK', () => this.submit(), { fill: 0xc83010, size: 8 }));
    this.msg = this.put(txt(this, 128, 176, '', { origin: 0.5, color: '#f83800', depth: 13, bold: true }));
  }

  rate(n) {
    this.rating = n;
    sfx('coin');
    this.stars.forEach((s, i) => {
      s.setAlpha(i < n ? 1 : 0.35);
      if (i < n) this.tweens.add({ targets: s, scale: { from: 2.4, to: 1.9 }, duration: 180, delay: i * 40, ease: 'Back.out' });
    });
    this.rateLabel.setText(['', 'NEEDS WORK', 'OKAY', 'GOOD', 'GREAT', 'LOVED IT!'][n]).setColor('#58d854');
    this.msg.setText('');
  }

  submit() {
    if (!this.rating) {
      this.msg.setText('PLEASE TAP A STAR FIRST');
      this.cameras.main.shake(100, 0.003);
      return;
    }
    const comment = this.ta.value.trim().replace(/\s+/g, ' ');
    sendFeedback({ email: save.email, name: save.name, rating: this.rating, comment });
    save.pocket.feedback = true;
    persist();
    this.thanks(true);
  }

  // ---------------------------------------------------------------- 3. thank you
  thanks(sent) {
    this.phase = 'thanks';
    if (this.ta) {
      this.ta.remove();
      this.ta = null;
    }
    this.wipe();
    sfx('win');
    this.put(panel(this, 20, 22, 216, 160, { fill: 0x0f0f1b, frame: 0xf8d878, depth: 12 }));
    const t = this.put(txt(this, 128, 40, sent ? 'THANK YOU!' : 'SEE YOU SOON!', { display: true, origin: 0.5, color: COLORS.gold, depth: 13 }));
    popIn(this, t);
    burst(this, 128, 40, { n: 16, spread: 60, depth: 20 });
    this.put(txt(this, 128, 62, sent ? 'YOUR FEEDBACK REACHED APOORV.' : 'COME BACK ANYTIME.', { origin: 0.5, color: COLORS.white, depth: 13, bold: true }));
    this.put(txt(this, 128, 76, 'WANT TO WORK TOGETHER?', { origin: 0.5, color: COLORS.green, depth: 13 }));
    this.put(button(this, 40, 92, 176, 20, 'RESUME (PDF)', () => CLASSIC_RESUME_URL && window.open(CLASSIC_RESUME_URL, '_blank', 'noopener'), { fill: 0xc83010, size: 8, depth: 14 }));
    this.put(button(this, 40, 116, 176, 20, 'LINKEDIN', () => window.open(resume.contact.linkedin, '_blank', 'noopener'), { size: 8, depth: 14 }));
    this.put(button(this, 40, 140, 176, 20, 'BACK TO STAGES', () => go(this, 'Menu'), { size: 8, depth: 14 }));
  }

  update(_, d) {
    this.drift(d);
    if (this.ta && this.place) this.place();
  }
}
