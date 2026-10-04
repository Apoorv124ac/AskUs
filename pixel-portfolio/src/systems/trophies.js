// World 5 "Trophy Hall": hit each ? block from below to release a certificate.
import { LEVELS, items } from '../levels.js';
import resume from '../data/resume.json';
import { burst } from '../ui/pixel.js';

export const AWARDS = resume.awards;
export const CERT_ENTRIES = items(LEVELS.world5, 'Q');
export const countCerts = (collected) => CERT_ENTRIES.filter((e) => collected.has(e.id)).length;

export class TrophyHall {
  constructor(scene) {
    this.s = scene;
    this.blocks = scene.physics.add.staticGroup();
    const lights = scene.add.graphics().setDepth(1).setBlendMode(1); // ADD: soft spotlights
    CERT_ENTRIES.forEach((e) => {
      const used = scene.collected.has(e.id);
      const b = this.blocks.create(e.col * 16 + 8, e.row * 16 + 8, 'qblock', used ? 1 : 0).setDepth(3);
      b.entry = e;
      b.used = used;
      lights.fillStyle(0xfff0b0, used ? 0.05 : 0.11).fillTriangle(b.x, b.y + 6, b.x - 22, 192, b.x + 22, 192);
    });
    scene.physics.add.collider(scene.player, this.blocks, (_, b) => this.hit(b));
    this.publish();
  }

  publish() {
    this.s.registry.set('hudInfo', `CERTS ${countCerts(this.s.collected)}/${CERT_ENTRIES.length}`);
  }

  hit(b) {
    const { s } = this;
    if (b.used || !s.player.body.touching.up) return;
    b.used = true;
    b.setFrame(1);
    s.collected.add(b.entry.id);
    s.tweens.add({ targets: b, y: b.y - 4, yoyo: true, duration: 90 });
    s.cameras.main.shake(90, 0.003);

    const n = b.entry.n;
    const a = AWARDS[n];
    const sc = s.add.image(b.x, b.y - 10, 'scroll').setDepth(6).setScale(0.4);
    s.tweens.add({ targets: sc, y: b.y - 30, scale: 1.6, duration: 380, ease: 'Back.out' });
    s.tweens.add({ targets: sc, alpha: 0, y: b.y - 40, delay: 900, duration: 400, onComplete: () => sc.destroy() });
    burst(s, b.x, b.y - 20, { n: 14, spread: 30, colors: [0xf8d878, 0xfcfcfc, 0xfca044] });
    s.game.events.emit('fact', {
      icon: 'scroll',
      title: `CERTIFICATE ${n + 1}/${CERT_ENTRIES.length}`,
      label: a.issuer,
      tag: a.tag,
      text: a.text,
    });
    s.award();
    s.award();
    s.lockAnim('celebrate', 700);
    this.publish();
    if (countCerts(s.collected) === CERT_ENTRIES.length) s.time.delayedCall(1000, () => s.game.events.emit('banner', 'ALL 5 CERTIFICATES!\nTHE HALL IS COMPLETE'));
  }
}
