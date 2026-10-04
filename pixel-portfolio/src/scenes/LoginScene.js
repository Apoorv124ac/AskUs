import Phaser from 'phaser';
import { PALETTE as C, LOGIN } from '../config.js';
import dialogue from '../data/dialogue.json';
import resume from '../data/resume.json';
import { validateEmail, submitEmail } from '../systems/LoginSystem.js';
import { text, fadeTo, fmt } from '../systems/UI.js';

/**
 * Login at the hero's desk. The e-mail field is a real DOM <input> (overlaid on the monitor) so mobile
 * keyboards, autofill and screen readers work. Enter validates -> "ACCESS GRANTED" -> world map.
 */
export class LoginScene extends Phaser.Scene {
  constructor() { super('Login'); }

  create() {
    const sv = this.sv = this.game.services;
    const L = dialogue.login, calm = sv.save.settings.reducedMotion;
    this.granted = false;
    this.cameras.main.fadeIn(300, 15, 15, 27);

    this.add.image(0, 0, 'desk_bg').setOrigin(0);
    this.add.sprite(238, 200, `hero_t${sv.state.tier}`, 0).setOrigin(0.5, 1).setFlipX(true).setDepth(2);

    text(this, 114, 28, L.header, { size: 8, color: C.lime, shadow: false });
    this.label = text(this, 114, 50, 'E-MAIL TO LOG IN:', { size: 8, color: C.white, shadow: false });
    this.hint = text(this, 114, 94, L.hint, { size: 8, color: C.yellow, shadow: false });
    if (!calm) this.tweens.add({ targets: this.hint, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
    this.status = text(this, 114, 106, '', { size: 8, color: C.red, shadow: false });

    const vars = { name: resume.meta.name.toUpperCase() };
    const priv = LOGIN.endpoint ? L.privacyRemote : L.privacyLocal;
    text(this, 108, 207, fmt(priv, vars), { size: 8, color: C.white, backing: true, shadow: false, align: 'left' }).setDepth(5);

    // grant screen (hidden until success)
    this.grantA = text(this, 114, 52, 'ACCESS', { size: 16, color: C.lime, shadow: false }).setVisible(false);
    this.grantB = text(this, 114, 74, 'GRANTED', { size: 16, color: C.lime, shadow: false }).setVisible(false);
    this.grantC = text(this, 114, 100, L.loading, { size: 8, color: C.white, shadow: false }).setVisible(false);

    // ---- DOM overlay -------------------------------------------------------
    this.ui = document.getElementById('login-ui');
    this.input = document.getElementById('email');
    this.skipBtn = document.getElementById('login-skip');
    this.live = document.getElementById('login-live');
    this.input.value = sv.save.data.email ?? '';
    this.input.classList.remove('bad');
    this.ui.hidden = false; this.input.style.visibility = 'visible';

    this.onSubmit = (e) => { e.preventDefault(); this.submit(); };
    this.onType = () => { this.input.classList.remove('bad'); this.status.setText(''); };
    this.onSkip = () => this.skip();
    this.ui.addEventListener('submit', this.onSubmit);
    this.input.addEventListener('input', this.onType);
    this.skipBtn.addEventListener('click', this.onSkip);
    this.events.once('shutdown', () => {
      this.ui.removeEventListener('submit', this.onSubmit);
      this.input.removeEventListener('input', this.onType);
      this.skipBtn.removeEventListener('click', this.onSkip);
      this.ui.hidden = true; this.input.blur();
    });
    this.time.delayedCall(350, () => this.input.focus({ preventScroll: true }));
  }

  submit() {
    if (this.granted) return;
    const { audio, save } = this.sv;
    const r = validateEmail(this.input.value);
    if (!r.ok) {
      audio.sfx('deny');
      this.input.classList.add('bad');
      this.status.setText(dialogue.login.invalid);
      this.live.textContent = 'Access denied. Please check your e-mail address.';
      if (!save.settings.reducedMotion) this.cameras.main.shake(120, 0.004);
      return;
    }
    this.granted = true;
    save.setEmail(r.value);
    submitEmail(LOGIN.endpoint, r.value);               // fire-and-forget; no-op without an endpoint
    audio.sfx('grant');
    this.live.textContent = 'Access granted. Loading the world map.';
    this.input.style.visibility = 'hidden'; this.skipBtn.style.visibility = 'hidden';
    this.hint.setVisible(false); this.status.setVisible(false); this.label.setVisible(false);
    [this.grantA, this.grantB, this.grantC].forEach((t) => t.setVisible(true));
    if (!save.settings.reducedMotion) this.tweens.add({ targets: [this.grantA, this.grantB], alpha: 0.4, duration: 140, yoyo: true, repeat: 5 });
    this.time.delayedCall(save.settings.reducedMotion ? 900 : 1500, () => fadeTo(this, 'WorldMap'));
  }

  /** Continue without giving an e-mail. */
  skip() {
    if (this.granted) return;
    this.granted = true;
    if (!this.sv.save.data.email) this.sv.save.flags.guest = true;
    this.sv.save.save();
    this.sv.audio.sfx('confirm');
    fadeTo(this, 'WorldMap');
  }
}
