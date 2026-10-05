import Phaser from 'phaser';
import { save, persist, isValidEmail, cleanName } from '../systems/save.js';
import { sendEmail } from '../systems/email.js';
import { txt, panel, go, popIn, burst, COLORS, viewCam } from '../ui/pixel.js';

const GREEN = '#58d854';

// Login at the desk, in two steps: your NAME (used throughout the game), then
// your EMAIL. A hidden <input> does the typing, so paste, phone keyboards and
// international layouts all work; Phaser just draws the text.
export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('Login');
  }

  create() {
    viewCam(this);
    this._leaving = false;
    this.done = false;
    this.createdAt = this.time.now;
    this.cameras.main.setBackgroundColor(0x2c3a7c).fadeIn(300, 15, 15, 27);
    this.input.keyboard.enabled = false; // the DOM input handles the keys here

    // room: carpet + desk behind the seated hero
    this.add.tileSprite(0, 192, 256, 16, 'tile-ground').setOrigin(0);
    this.add.tileSprite(0, 208, 256, 16, 'tile-dirt').setOrigin(0);
    this.add.rectangle(0, 120, 256, 72, 0x3c4c8c).setOrigin(0).setDepth(0);
    this.add.rectangle(24, 183, 96, 4, 0xfca044).setOrigin(0).setDepth(1);
    this.add.rectangle(24, 187, 96, 5, 0x8c5c00).setOrigin(0).setDepth(1);

    this.hero = this.add.sprite(40, 176, 'hero', 0).setDepth(5);
    this.hero.anims.play('type');
    this.hero.anims.pause();

    // terminal
    this.term = this.add.container(0, 0).setDepth(6);
    this.term.add(panel(this, 14, 14, 228, 98, { fill: 0x0f0f1b, frame: 0x58d854, depth: 0 }));
    this.term.add(txt(this, 24, 22, 'OFFICE QUEST OS  v1.0', { color: GREEN, bold: true, shadow: false, depth: 0 }));
    this.term.add(this.add.rectangle(24, 33, 208, 1, 0x006c00).setOrigin(0));
    this.msg = txt(this, 24, 40, '', { color: GREEN, shadow: false, depth: 0, lineSpacing: 3 });
    this.line = txt(this, 24, 66, '', { color: '#fcfcfc', bold: true, shadow: false, depth: 0 });
    this.err = txt(this, 24, 80, '', { color: '#f83800', shadow: false, depth: 0 });
    this.note = txt(this, 24, 94, '', { color: COLORS.dim, shadow: false, depth: 0 });
    this.hint = txt(this, 232, 100, 'PRESS ENTER', { origin: [1, 0], color: COLORS.gold, shadow: false, depth: 0 });
    this.term.add([this.msg, this.line, this.err, this.note, this.hint]);
    this.tweens.add({ targets: this.hint, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
    popIn(this, this.term, { from: 0.92, duration: 280 });
    this.term.setPosition(0, 0);

    // hidden input
    const el = document.createElement('input');
    el.type = 'text';
    el.inputMode = 'text';
    el.autocomplete = 'off';
    el.autocapitalize = 'off';
    el.spellcheck = false;
    Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', opacity: '0', border: '0', padding: '0' });
    document.body.appendChild(el);
    this.el = el;
    el.addEventListener('input', () => {
      this.err.setText('');
      this.hero.anims.resume();
      this.time.delayedCall(350, () => this.hero.anims.pause());
    });
    el.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.time.now - this.createdAt > 500) this.submit();
      } else if (e.key === 'Escape' && this.step === 'welcome') {
        this.step = 'name';
        this.enterStep();
      }
    });
    this.input.on('pointerdown', () => el.focus());
    this.events.once('shutdown', () => el.remove());
    this.events.once('destroy', () => el.remove());

    this.step = save.email && save.name ? 'welcome' : 'name';
    this.enterStep();
  }

  // set up the terminal for the current step
  enterStep() {
    const el = this.el;
    this.err.setText('');
    this.pending = this.pending || {};
    if (this.step === 'welcome') {
      el.value = '';
      this.msg.setText(`WELCOME BACK, *${save.name}*.`.replace(/\*/g, '') + '\nPRESS ENTER TO LOG IN.');
      this.note.setText('NOT YOU? PRESS ESC.');
      this.hint.setText('ENTER');
    } else if (this.step === 'name') {
      el.value = '';
      el.maxLength = 16;
      this.msg.setText('NEW VISITOR DETECTED.\nWHAT SHOULD I CALL YOU?');
      this.note.setText('YOUR NAME IS USED THROUGHOUT THE GAME.');
      this.hint.setText('ENTER');
    } else {
      el.value = save.email || '';
      el.maxLength = 60;
      this.msg.setText(`NICE TO MEET YOU, ${this.pending.name}.\nLOG IN WITH YOUR EMAIL:`);
      this.note.setText('ONLY SO APOORV KNOWS WHO PLAYED. NO SPAM.');
      this.hint.setText('ENTER');
    }
    el.focus();
    this.tweens.add({ targets: this.msg, alpha: { from: 0, to: 1 }, duration: 250 });
  }

  submit() {
    if (this.done) return;
    if (this.step === 'welcome') return this.finish();

    const val = this.el.value.trim();
    if (this.step === 'name') {
      const name = cleanName(val);
      if (!name) return this.fail('PLEASE TYPE YOUR NAME.');
      this.pending = { name };
      this.step = 'email';
      return this.enterStep();
    }

    if (!isValidEmail(val)) return this.fail('INVALID EMAIL. TRY AGAIN.');
    save.name = this.pending.name;
    save.email = val;
    persist();
    if (save.emailSent !== val) {
      sendEmail({ email: val, name: save.name }).then((ok) => {
        if (ok) {
          save.emailSent = val;
          persist();
        }
      });
    }
    this.finish();
  }

  fail(msg) {
    this.err.setText(msg);
    this.cameras.main.shake(120, 0.004);
    this.tweens.add({ targets: this.err, scale: { from: 1.3, to: 1 }, duration: 200, ease: 'Back.out' });
  }

  finish() {
    this.done = true;
    this.el.disabled = true;
    this.msg.setText('');
    this.err.setText('');
    this.note.setText('');
    this.hint.setVisible(false);
    this.line.setText('');
    const a = txt(this, 128, 52, 'ACCESS GRANTED', { display: true, origin: 0.5, color: COLORS.gold, depth: 10 });
    const b = txt(this, 128, 74, `WELCOME, ${save.name}!`, { origin: 0.5, color: GREEN, bold: true, depth: 10 });
    popIn(this, a, { duration: 380 });
    popIn(this, b, { delay: 220, duration: 320 });
    burst(this, 128, 60, { n: 14, spread: 50, colors: [0x58d854, 0xf8d878, 0xfcfcfc] });
    this.hero.anims.stop();
    this.hero.setPosition(40, 176).anims.play('celebrate');
    this.cameras.main.flash(180, 88, 216, 84);
    this.time.delayedCall(1800, () => go(this, save.storySeen ? 'Menu' : 'Story'));
  }

  update(time) {
    if (this.done) return;
    const showing = this.step === 'welcome' ? '' : this.el.value;
    if (this.step === 'welcome') return this.line.setText('');
    const tail = showing.length > 34 ? showing.slice(-34) : showing;
    this.line.setText(`> ${tail}${Math.floor(time / 450) % 2 ? '_' : ' '}`);
  }
}
