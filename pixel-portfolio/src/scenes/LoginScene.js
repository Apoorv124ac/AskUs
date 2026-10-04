import Phaser from 'phaser';
import { OWNER_NAME } from '../config.js';
import { save, persist, isValidEmail, nameFromEmail } from '../systems/save.js';
import { sendEmail } from '../systems/email.js';
import { txt, panel, go } from '../ui/pixel.js';

const GREEN = '#58d854';

// Login at the desk. A hidden <input> does the typing, so paste, phone
// keyboards and international layouts all work; Phaser just draws the text.
export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('Login');
  }

  create() {
    this._leaving = false;
    this.done = false;
    this.createdAt = this.time.now;
    this.cameras.main.setBackgroundColor(0x2c3a7c).fadeIn(300, 15, 15, 27);
    this.input.keyboard.enabled = false; // the DOM input handles the keys here

    // room: carpet + desk behind the seated hero
    this.add.tileSprite(0, 192, 256, 16, 'tile-ground').setOrigin(0);
    this.add.tileSprite(0, 208, 256, 16, 'tile-dirt').setOrigin(0);
    this.add.rectangle(0, 136, 256, 56, 0x3c4c8c).setOrigin(0).setDepth(0);
    this.add.rectangle(24, 183, 96, 4, 0xfca044).setOrigin(0).setDepth(1);
    this.add.rectangle(24, 187, 96, 5, 0x8c5c00).setOrigin(0).setDepth(1);

    this.hero = this.add.sprite(40, 176, 'hero', 0).setDepth(5);
    this.hero.anims.play('type');
    this.hero.anims.pause();

    // terminal
    panel(this, 8, 10, 240, 120, { fill: 0x0f0f1b, frame: 0x58d854 });
    txt(this, 18, 20, 'OFFICE QUEST OS v1.0', { color: GREEN, shadow: false });
    txt(this, 18, 31, '-----------------------------', { color: '#006c00', shadow: false });
    this.msg = txt(this, 18, 44, '', { color: GREEN, shadow: false, wrap: 220 });
    this.line = txt(this, 18, 70, '', { color: '#fcfcfc', shadow: false });
    this.err = txt(this, 18, 86, '', { color: '#f83800', shadow: false });
    txt(this, 18, 104, 'ONLY USED SO APOORV KNOWS\nWHO PLAYED. NO SPAM.'.replace('APOORV', OWNER_NAME), {
      color: '#7c7c7c',
      shadow: false,
    });
    this.hint = txt(this, 240, 118, 'ENTER', { origin: [1, 0], color: '#f8d878', shadow: false });
    this.tweens.add({ targets: this.hint, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });

    const returning = !!save.email;
    this.msg.setText(returning ? `WELCOME BACK, ${save.name}.\nPRESS ENTER TO LOG IN.` : 'LOGIN REQUIRED.\nENTER YOUR EMAIL:');

    // hidden input
    const el = document.createElement('input');
    el.type = 'text';
    el.inputMode = 'email';
    el.autocomplete = 'off';
    el.autocapitalize = 'off';
    el.spellcheck = false;
    el.maxLength = 60;
    el.setAttribute('aria-label', 'Email address');
    Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', opacity: '0', border: '0', padding: '0' });
    document.body.appendChild(el);
    el.value = save.email || '';
    el.focus();
    this.el = el;
    el.addEventListener('input', () => {
      this.err.setText('');
      this.hero.anims.resume();
      this.time.delayedCall(350, () => this.hero.anims.pause());
    });
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.repeat) return;
      e.preventDefault();
      if (this.time.now - this.createdAt > 500) this.submit();
    });
    this.input.on('pointerdown', () => el.focus());
    this.events.once('shutdown', () => el.remove());
    this.events.once('destroy', () => el.remove());
  }

  submit() {
    if (this.done) return;
    const email = this.el.value.trim();
    if (!isValidEmail(email)) {
      this.err.setText('INVALID EMAIL. TRY AGAIN.');
      this.cameras.main.shake(120, 0.004);
      return;
    }
    this.done = true;
    this.el.disabled = true;
    save.email = email;
    save.name = nameFromEmail(email);
    persist();
    if (save.emailSent !== email) {
      sendEmail({ email, name: save.name }).then((ok) => {
        if (ok) {
          save.emailSent = email;
          persist();
        }
      });
    }

    this.msg.setText('');
    this.err.setText('');
    this.hint.setVisible(false);
    this.line.setText('');
    txt(this, 128, 52, 'ACCESS GRANTED', { size: 16, origin: 0.5, color: '#f8d878' });
    txt(this, 128, 82, `WELCOME, ${save.name}!`, { origin: 0.5, color: GREEN, shadow: false });
    this.hero.anims.stop();
    this.hero.setPosition(40, 176).anims.play('celebrate');
    this.cameras.main.flash(180, 88, 216, 84);
    this.time.delayedCall(1700, () => go(this, 'Menu'));
  }

  update(time) {
    if (this.done) return;
    const v = this.el.value;
    const tail = v.length > 26 ? v.slice(-26) : v;
    this.line.setText(`> ${tail}${Math.floor(time / 450) % 2 ? '_' : ' '}`);
  }
}
